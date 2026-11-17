import logging
import uuid
from contextlib import suppress
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from supabase_auth.errors import AuthApiError, AuthError

from app.auth import AuthUser, get_current_auth_user
from app.database import getSession
from app.dependencies import password_check, supabase
from app.model import Account, AccountRole, AuditLog, auth_users

logger = logging.getLogger(__name__)

ADMIN_ROLES = frozenset({AccountRole.LAB_OWNER, AccountRole.LAB_ADMIN})


def is_admin(account: Account) -> bool:
    return account.role in ADMIN_ROLES


async def get_current_account(
    auth_user: Annotated[AuthUser, Depends(get_current_auth_user)],
    session: Annotated[AsyncSession, Depends(getSession)],
) -> Account:
    """The account row behind the logged in user, so we can read their role.

    This is also where a deactivated account is turned away. Every endpoint
    that needs to know who is calling depends on this, so gating it here keeps
    an inactive member out of the whole lab rather than one route at a time."""
    account = await session.get(Account, auth_user.id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    if not account.active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "This account is deactivated. Ask a Lab Owner or Lab Admin to "
                "turn it back on."
            ),
        )
    return account

async def require_admin(
    me: Annotated[Account, Depends(get_current_account)],
) -> Account:
    """Gate for the admin only endpoints. Returns the caller so handlers can use it."""
    if not is_admin(me):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a Lab Owner or Lab Admin can do this",
        )
    return me


async def get_account_or_404(session: AsyncSession, account_id: uuid.UUID) -> Account:
    account = await session.get(Account, account_id)
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account with id {account_id} not found",
        )
    return account


def audit_account(
    session: AsyncSession,
    account_id: uuid.UUID,
    column: str,
    old_value: object,
    new_value: object,
    by_whom: uuid.UUID,
) -> None:
    """One audit_log row per changed column, matching the task and ticket routers."""
    session.add(
        AuditLog(
            from_table="account",
            row_id=str(account_id),
            column_name=column,
            old_value=None if old_value is None else str(old_value),
            new_value=None if new_value is None else str(new_value),
            by_whom=by_whom,
        )
    )


# Which constraint failed -> what actually went wrong. Reporting every
# IntegrityError as a username clash hid a duplicate primary key behind a
# message about a username that was never taken, so name the real one.
ACCOUNT_CONFLICTS = {
    "account_username_key": "That username is already taken",
    "account_email_key": "That email address is already taken",
    "account_pkey": "An account already exists for that login",
    "account_quota_check": "Quota cannot be negative",
    "account_id_fkey": "There is no Supabase login behind that account id",
}


def account_conflict(exc: IntegrityError, fallback: str) -> HTTPException:
    """A 409 that says which constraint the insert or update actually tripped.
    asyncpg hands us the constraint name; anything we do not recognise keeps
    the caller's own wording."""
    constraint = getattr(exc.orig, "constraint_name", None)
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=ACCOUNT_CONFLICTS.get(constraint, fallback),
    )


STALE_LOGIN = (
    "{email} is still registered to a Supabase login with no account behind "
    "it. Delete that user in the Supabase dashboard, or use another address."
)


async def auth_login_for_email(session: AsyncSession, email: str) -> uuid.UUID | None:
    """The auth.users id holding an address, if one does.

    The account table only mirrors Supabase, so an address can be free here
    and still refused there - a login whose account row was deleted keeps its
    email forever. Reading auth.users lets us name that instead of handing the
    admin Supabase's own wording for it.

    Only a check, never the authority: if the database role cannot see the
    auth schema we give up quietly and let Supabase do the refusing."""
    try:
        return await session.scalar(
            select(auth_users.c.id).where(func.lower(auth_users.c.email) == email)
        )
    except SQLAlchemyError:
        # The failed statement poisons the transaction, so clear it before the
        # caller goes on to write anything.
        logger.exception("Could not read auth.users while checking %s", email)
        await session.rollback()
        return None


async def assert_login_available(
    session: AsyncSession, username: str, email: str
) -> None:
    """Checked before the auth user exists, so the usual clash never leaves a
    Supabase login behind that we then have to delete again."""
    clash = await session.scalar(
        select(Account).where(
            or_(Account.username == username, Account.email == email)
        )
    )
    if clash is None:
        if await auth_login_for_email(session, email) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=STALE_LOGIN.format(email=email),
            )
        return

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=(
            "That username is already taken"
            if clash.username == username
            else f"{email} already belongs to {clash.username}"
        ),
    )


async def create_auth_user(email: str, password: str, username: str) -> uuid.UUID:
    """The Supabase half of creating a member. `email_confirm` marks the
    address confirmed on the spot: nothing is emailed, the admin hands the
    password over themselves.

    The supabase client is blocking, so it goes to the threadpool rather than
    stalling the event loop."""
    try:
        response = await run_in_threadpool(
            supabase.auth.admin.create_user,
            {
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"username": username},
            },
        )
    except AuthApiError as exc:
        # Weak passwords and addresses already in auth.users land here. The
        # message is Supabase's own ("Password should be at least ..."), and it
        # is the only hint the admin gets, so pass it through.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Supabase rejected that login: {exc.message}",
        ) from exc

    if response is None or response.user is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Supabase did not return the new user",
        )

    return uuid.UUID(response.user.id)


async def delete_auth_user(user_id: uuid.UUID) -> bool:
    """False if the login is still there, so a caller that can say so does.
    The create path is already failing its request and ignores this: there the
    log is all we can offer."""
    try:
        await run_in_threadpool(supabase.auth.admin.delete_user, str(user_id))
    except Exception:
        logger.exception("Could not delete auth user %s", user_id)
        return False
    return True


WRONG_PASSWORD = HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="That is not your current password",
)


async def verify_password(email: str, password: str) -> None:
    def attempt() -> None:
        try:
            response = password_check.auth.sign_in_with_password(
                {"email": email, "password": password}
            )
        except AuthApiError as exc:
            # 400 is "Invalid login credentials"; a rate limit or an outage is not a wrong password, so dont say it was.
            if exc.status in (400, 401, 403):
                raise WRONG_PASSWORD from exc
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Supabase could not check that password: {exc.message}",
            ) from exc

        session = response.session
        if session is None:
            return
        # `local` and not the default `global`, which would sign them out of their own browser too.
        with suppress(Exception):
            password_check.auth.admin.sign_out(session.access_token, "local")

    await run_in_threadpool(attempt)


async def update_auth_user(user_id: uuid.UUID, attributes: dict) -> None:
    """The Supabase half of changing an email or a password - the account table only ever mirrors the address."""
    try:
        response = await run_in_threadpool(
            supabase.auth.admin.update_user_by_id, str(user_id), attributes
        )
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Supabase rejected that change: {exc.message}",
        ) from exc

    if response is None or response.user is None:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Supabase did not confirm the change",
        )


async def assert_email_available(
    session: AsyncSession, email: str, account_id: uuid.UUID
) -> None:
    """Checked before the login is touched, so a clash cannot leave Supabase and the account row disagreeing."""
    clash = await session.scalar(
        select(Account).where(Account.email == email, Account.id != account_id)
    )
    if clash is None:
        # Their own id coming back means Supabase already holds the address and
        # only the mirror is behind, which is the one case worth going ahead on.
        holder = await auth_login_for_email(session, email)
        if holder is not None and holder != account_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=STALE_LOGIN.format(email=email),
            )
        return

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=f"{email} already belongs to {clash.username}",
    )


# Lab Owner outranks Lab Admin outranks Lab User.
ROLE_RANK = {
    AccountRole.LAB_USER: 0,
    AccountRole.LAB_ADMIN: 1,
    AccountRole.LAB_OWNER: 2,
}


def outranks(actor: Account, target: Account) -> bool:
    return ROLE_RANK[actor.role] > ROLE_RANK[target.role]


async def resolve_login_target(
    session: AsyncSession, me: Account, account_id: uuid.UUID
) -> Account:
    """Your own login, or one belonging to somebody you outrank - strictly, so no admin can reset a peer or a Lab Owner."""
    if account_id == me.id:
        return me

    target = await get_account_or_404(session, account_id)

    if not is_admin(me) or not outranks(me, target):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Only someone above {target.role.value} can reset that login. "
                "Your own is always yours to change."
            ),
        )

    return target
