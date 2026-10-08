import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from supabase_auth.types import User as AuthUser

from app.database import getSession
from app.model import Account, AccountRole
from app.service import account_service

accountRouter = APIRouter(prefix="/account", dependencies=[Depends(account_service.get_current_auth_user)])

class CreateAccountRequest(BaseModel):
    username: str = Field(min_length=1, max_length=100)

class UpdateAccountRequest(BaseModel):
    # Every field is optional - only the ones actually sent get written.
    username: str | None = Field(default=None, min_length=1, max_length=100)
    quota: int | None = Field(default=None, ge=0)
    active: bool | None = None

class AssignRoleRequest(BaseModel):
    role: AccountRole


@accountRouter.get("/", tags=["Account"])
async def retrieve_accounts(session : Annotated[AsyncSession, Depends(getSession)]):
    accounts = await session.scalars(select(Account))
    return { "Accounts" : accounts.all()}

@accountRouter.post("/", tags=["Account"], status_code=status.HTTP_201_CREATED)
async def create_my_account(
    body: CreateAccountRequest,
    session: Annotated[AsyncSession, Depends(getSession)],
    auth_user: Annotated[AuthUser, Depends(account_service.get_current_auth_user)],
):
    """Claim the account row for the signed in user. This is how an invited
    member picks their username - the row does not exist until they do."""
    username = body.username.strip()
    if not username:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Username cannot be blank",
        )

    # Idempotent, so a half finished setup can be retried from the same link.
    existing = await session.get(Account, uuid.UUID(auth_user.id))
    if existing is not None:
        return {"Account": existing, "Message": "Account already set up"}

    if not auth_user.email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The signed in user has no email address",
        )

    # role and active come from the column defaults - Lab User, active.
    account = Account(
        id=uuid.UUID(auth_user.id), username=username, email=auth_user.email
    )
    session.add(account)

    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That username is already taken",
        ) from exc

    await session.refresh(account)
    return {"Account": account}

@accountRouter.get("/{account_id}", tags=["Account"])
async def retrieve_account(
    account_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.get_current_account)],
):
    # Your own account is always readable. everyone else's is admin only.
    if me.id != account_id and not account_service.is_admin(me):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to view this account",
        )

    account = await session.get(Account, account_id)
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account with id {account_id} not found",
        )

    return {"Account": account}

@accountRouter.put("/{account_id}", tags=["Account"])
async def update_account(
    account_id: uuid.UUID,
    body: UpdateAccountRequest,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.get_current_account)],
):
    """Rename yourself; quota and active are admin only."""
    caller_is_admin = account_service.is_admin(me)
    if me.id != account_id and not caller_is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to edit this account",
        )

    target = await account_service.get_account_or_404(session, account_id)
    sent = body.model_fields_set

    if not caller_is_admin and ({"quota", "active"} & sent):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a Lab Owner or Lab Admin can change quota or active",
        )

    changed: list[str] = []

    if me.role is not AccountRole.LAB_OWNER and target.role is AccountRole.LAB_ADMIN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Only Lab Owner could change details of other Admin"
        )

    if "username" in sent and body.username is not None:
        username = body.username.strip()
        if not username:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Username cannot be blank",
            )
        if username != target.username:
            account_service.audit_account(
                session, target.id, "username", target.username, username, me.id
            )
            target.username = username
            changed.append("username")

    if "quota" in sent and body.quota != target.quota:
        account_service.audit_account(
            session, target.id, "quota", target.quota, body.quota, me.id
        )
        target.quota = body.quota
        changed.append("quota")

    if "active" in sent and body.active is not None and body.active != target.active:
        # Blocking your own deactivation keeps an admin from locking themselves out.
        if target.id == me.id and not body.active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You cannot deactivate your own account",
            )


        if target.role is AccountRole.LAB_OWNER and not body.active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A Lab Owner cannot be deactivated",
            )
        account_service.audit_account(
            session, target.id, "active", target.active, body.active, me.id
        )
        target.active = body.active
        changed.append("active")

    if not changed:
        return {"Account": target, "Message": "Nothing to update"}

    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That username is already taken",
        ) from exc

    await session.refresh(target)
    return {"Account": target, "Message": f"Updated {', '.join(changed)}"}

@accountRouter.delete("/{account_id}", tags=["Account"])
async def delete_account(
    account_id: uuid.UUID,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.require_admin)],
):
    target = await account_service.get_account_or_404(session, account_id)

    if target.id == me.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You cannot delete your own account",
        )
    if target.role is AccountRole.LAB_OWNER:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A Lab Owner cannot be deleted here",
        )

    account_service.audit_account(
        session, target.id, "deleted", target.username, None, me.id
    )
    await session.delete(target)

    try:
        await session.commit()
    except IntegrityError as exc:
        # created_by on task, ticket and announcement is ON DELETE RESTRICT.
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"{target.username} still owns tasks, tickets or announcements. "
                "Deactivate the account instead."
            ),
        ) from exc

    return {"Message": f"Successfully deleted {target.username}"}

@accountRouter.post("/admin", tags=["Admin"])
async def admin_create_account(
    me: Annotated[Account, Depends(account_service.require_admin)],
):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Inviting an account is not implemented yet",
    )

@accountRouter.put("/{account_id}/role", tags=["Admin"])
async def assign_role(
    account_id: uuid.UUID,
    body: AssignRoleRequest,
    session: Annotated[AsyncSession, Depends(getSession)],
    me: Annotated[Account, Depends(account_service.require_admin)],
):
    target = await account_service.get_account_or_404(session, account_id)

    # Lab Owner is only ever set from the Supabase dashboard, both ways.
    if body.role is AccountRole.LAB_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lab Owner can only be granted from the Supabase dashboard",
        )
    if target.role is AccountRole.LAB_OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A Lab Owner's role can only be changed from the Supabase dashboard",
        )
    # Self demotion would drop the last admin, so make someone else do it.
    if target.id == me.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You cannot change your own role",
        )

    if target.role is body.role:
        return {"Account": target, "Message": f"{target.username} is already {body.role.value}"}

    account_service.audit_account(
        session, target.id, "role", target.role.value, body.role.value, me.id
    )
    target.role = body.role
    await session.commit()
    await session.refresh(target)

    return {"Account": target, "Message": f"{target.username} is now {body.role.value}"}
