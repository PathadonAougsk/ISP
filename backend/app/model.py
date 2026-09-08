from __future__ import annotations

import datetime
import uuid as uuid_pkg

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    ForeignKey,
    Index,
    Integer,
    Table,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import CHAR, JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


task_category = Table(
    "task_category",
    Base.metadata,
    Column("task_id", ForeignKey("task.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", ForeignKey("category.id", ondelete="CASCADE"), primary_key=True),
)

ticket_category = Table(
    "ticket_category",
    Base.metadata,
    Column("ticket_id", ForeignKey("ticket.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", ForeignKey("category.id", ondelete="CASCADE"), primary_key=True),
)

announcement_category = Table(
    "announcement_category",
    Base.metadata,
    Column("announcement_id", ForeignKey("announcement.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", ForeignKey("category.id", ondelete="CASCADE"), primary_key=True),
)


class Permission(Base):
    __tablename__ = "permission"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    can_edit: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    can_complete: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    can_grant_role: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    can_revoke_role: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    role: Mapped[Role | None] = relationship(back_populates="permission", uselist=False)


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

    id: Mapped[uuid_pkg.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, comment="same uuid as auth.users.id"
    )
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("role.id"), nullable=False)
    quota: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="temp account limit")
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    role: Mapped[Role] = relationship(back_populates="accounts")

    created_tasks: Mapped[list[Task]] = relationship(
        back_populates="creator", foreign_keys="Task.created_by"
    )
    assigned_tasks: Mapped[list[Task]] = relationship(
        back_populates="assignee", foreign_keys="Task.assigned_id"
    )
    created_tickets: Mapped[list[Ticket]] = relationship(
        back_populates="creator", foreign_keys="Ticket.created_by"
    )
    assigned_tickets: Mapped[list[Ticket]] = relationship(
        back_populates="assignee", foreign_keys="Ticket.assigned_id"
    )
    created_announcements: Mapped[list[Announcement]] = relationship(
        back_populates="creator", foreign_keys="Announcement.created_by"
    )
    audit_entries: Mapped[list[AuditLog]] = relationship(back_populates="actor_account")


class Status(Base):
    __tablename__ = "status"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    priority_rank: Mapped[int] = mapped_column(Integer, nullable=False)

    tasks: Mapped[list[Task]] = relationship(back_populates="status")
    tickets: Mapped[list[Ticket]] = relationship(back_populates="status")
    announcements: Mapped[list[Announcement]] = relationship(back_populates="status")


class Urgency(Base):
    __tablename__ = "urgency"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    priority_rank: Mapped[int] = mapped_column(Integer, nullable=False)

    tasks: Mapped[list[Task]] = relationship(back_populates="urgency")
    tickets: Mapped[list[Ticket]] = relationship(back_populates="urgency")
    announcements: Mapped[list[Announcement]] = relationship(back_populates="urgency")


class Category(Base):
    __tablename__ = "category"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)

    tasks: Mapped[list[Task]] = relationship(
        secondary=task_category, back_populates="categories"
    )
    tickets: Mapped[list[Ticket]] = relationship(
        secondary=ticket_category, back_populates="categories"
    )
    announcements: Mapped[list[Announcement]] = relationship(
        secondary=announcement_category, back_populates="categories"
    )


class Task(Base):
    __tablename__ = "task"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_id: Mapped[int] = mapped_column(ForeignKey("status.id"), nullable=False)
    urgency_id: Mapped[int] = mapped_column(ForeignKey("urgency.id"), nullable=False)
    created_by: Mapped[uuid_pkg.UUID] = mapped_column(ForeignKey("account.id"), nullable=False)
    assigned_id: Mapped[uuid_pkg.UUID | None] = mapped_column(ForeignKey("account.id"), nullable=True)
    created: Mapped[datetime.datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated: Mapped[datetime.datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    status: Mapped[Status] = relationship(back_populates="tasks")
    urgency: Mapped[Urgency] = relationship(back_populates="tasks")
    creator: Mapped[Account] = relationship(back_populates="created_tasks", foreign_keys=[created_by])
    assignee: Mapped[Account | None] = relationship(
        back_populates="assigned_tasks", foreign_keys=[assigned_id]
    )
    categories: Mapped[list[Category]] = relationship(
        secondary=task_category, back_populates="tasks"
    )


class Ticket(Base):
    __tablename__ = "ticket"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_id: Mapped[int] = mapped_column(ForeignKey("status.id"), nullable=False)
    urgency_id: Mapped[int] = mapped_column(ForeignKey("urgency.id"), nullable=False)
    created_by: Mapped[uuid_pkg.UUID] = mapped_column(ForeignKey("account.id"), nullable=False)
    assigned_id: Mapped[uuid_pkg.UUID | None] = mapped_column(ForeignKey("account.id"), nullable=True)
    created: Mapped[datetime.datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated: Mapped[datetime.datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    status: Mapped[Status] = relationship(back_populates="tickets")
    urgency: Mapped[Urgency] = relationship(back_populates="tickets")
    creator: Mapped[Account] = relationship(back_populates="created_tickets", foreign_keys=[created_by])
    assignee: Mapped[Account | None] = relationship(
        back_populates="assigned_tickets", foreign_keys=[assigned_id]
    )
    categories: Mapped[list[Category]] = relationship(
        secondary=ticket_category, back_populates="tickets"
    )


class Announcement(Base):
    __tablename__ = "announcement"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_id: Mapped[int] = mapped_column(ForeignKey("status.id"), nullable=False)
    urgency_id: Mapped[int] = mapped_column(ForeignKey("urgency.id"), nullable=False)
    created_by: Mapped[uuid_pkg.UUID] = mapped_column(ForeignKey("account.id"), nullable=False)
    created: Mapped[datetime.datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated: Mapped[datetime.datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    status: Mapped[Status] = relationship(back_populates="announcements")
    urgency: Mapped[Urgency] = relationship(back_populates="announcements")
    creator: Mapped[Account] = relationship(
        back_populates="created_announcements", foreign_keys=[created_by]
    )
    categories: Mapped[list[Category]] = relationship(
        secondary=announcement_category, back_populates="announcements"
    )


class AuditLog(Base):
    __tablename__ = "audit_log"
    __table_args__ = (
        CheckConstraint("op IN ('I', 'U', 'D')", name="ck_audit_log_op"),
        Index("ix_audit_log_table_name_row_id", "table_name", "row_id"),
        Index("ix_audit_log_actor_at", "actor", "at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    table_name: Mapped[str] = mapped_column(
        Text, nullable=False, comment="which table the row lives in"
    )
    row_id: Mapped[str] = mapped_column(
        Text, nullable=False, comment="no FK: holds both int and uuid ids"
    )
    op: Mapped[str] = mapped_column(CHAR(1), nullable=False, comment="I, U or D")
    changed: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True, comment="full row for I/D, changed keys only for U"
    )
    actor: Mapped[uuid_pkg.UUID | None] = mapped_column(
        ForeignKey("account.id"), nullable=True, comment="auth.uid(); null for service-role writes"
    )
    at: Mapped[datetime.datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    actor_account: Mapped[Account | None] = relationship(back_populates="audit_entries")
