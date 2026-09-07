from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    false,
    func,
    true,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


auth_users = Table(
    "users",
    Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True),
    schema="auth",
)


def app_tables():
    return [t for t in Base.metadata.sorted_tables if t.schema != "auth"]


class Permission(Base):
    __tablename__ = "permission"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    can_edit: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=false()
    )
    can_complete: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=false()
    )
    can_grant_role: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=false()
    )
    can_revoke_role: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=false()
    )

    role: Mapped[Role | None] = relationship(back_populates="permission")


class Role(Base):
    __tablename__ = "role"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    permission_id: Mapped[int] = mapped_column(
        ForeignKey("permission.id"), nullable=False, unique=True
    )

    permission: Mapped[Permission] = relationship(back_populates="role")
    accounts: Mapped[list[Account]] = relationship(back_populates="role")


class Account(Base):
    __tablename__ = "account"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("role.id"), nullable=False)
    quota: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="temp account limit"
    )
    active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=true()
    )

    role: Mapped[Role] = relationship(back_populates="accounts")

    tasks_created: Mapped[list[Task]] = relationship(
        back_populates="creator", foreign_keys="Task.created_by"
    )
    tasks_assigned: Mapped[list[Task]] = relationship(
        back_populates="assignee", foreign_keys="Task.assigned_id"
    )
    tickets_created: Mapped[list[Ticket]] = relationship(
        back_populates="creator", foreign_keys="Ticket.created_by"
    )
    tickets_assigned: Mapped[list[Ticket]] = relationship(
        back_populates="assignee", foreign_keys="Ticket.assigned_id"
    )
    announcements_created: Mapped[list[Announcement]] = relationship(
        back_populates="creator", foreign_keys="Announcement.created_by"
    )


class Status(Base):
    __tablename__ = "status"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    priority_rank: Mapped[int] = mapped_column(Integer, nullable=False)

    tasks: Mapped[list[Task]] = relationship(back_populates="status")
    tickets: Mapped[list[Ticket]] = relationship(back_populates="status")
    announcements: Mapped[list[Announcement]] = relationship(
        back_populates="status"
    )


class Task(Base):
    __tablename__ = "task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_id: Mapped[int] = mapped_column(ForeignKey("status.id"), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("account.id"), nullable=False
    )
    assigned_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("account.id"), nullable=True
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    status: Mapped[Status] = relationship(back_populates="tasks")
    creator: Mapped[Account] = relationship(
        back_populates="tasks_created", foreign_keys=[created_by]
    )
    assignee: Mapped[Account | None] = relationship(
        back_populates="tasks_assigned", foreign_keys=[assigned_id]
    )


class Ticket(Base):
    __tablename__ = "ticket"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_id: Mapped[int] = mapped_column(ForeignKey("status.id"), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("account.id"), nullable=False
    )
    assigned_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("account.id"), nullable=True
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    status: Mapped[Status] = relationship(back_populates="tickets")
    creator: Mapped[Account] = relationship(
        back_populates="tickets_created", foreign_keys=[created_by]
    )
    assignee: Mapped[Account | None] = relationship(
        back_populates="tickets_assigned", foreign_keys=[assigned_id]
    )


class Announcement(Base):
    __tablename__ = "announcement"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_id: Mapped[int] = mapped_column(ForeignKey("status.id"), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("account.id"), nullable=False
    )
    created: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    status: Mapped[Status] = relationship(back_populates="announcements")
    creator: Mapped[Account] = relationship(
        back_populates="announcements_created", foreign_keys=[created_by]
    )


class AuditLog(Base):
    __tablename__ = "audit_log"
    __table_args__ = (
        Index("ix_audit_target", "table_name", "row_id"),
        Index("ix_audit_actor", "actor", "at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    table_name: Mapped[str] = mapped_column(
        Text, nullable=False, comment="which table the row lives in"
    )
    row_id: Mapped[str] = mapped_column(
        Text, nullable=False, comment="no FK: holds both int and uuid ids"
    )
    op: Mapped[str] = mapped_column(String(1), nullable=False, comment="I, U or D")
    changed: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True, comment="full row for I/D, changed keys only for U"
    )
    actor: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("auth.users.id", ondelete="SET NULL"),
        nullable=True,
        comment="auth.uid(); null for service-role writes",
    )
    at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    actor_account: Mapped[Account | None] = relationship(
        primaryjoin="foreign(AuditLog.actor) == Account.id",
        viewonly=True,
    )
