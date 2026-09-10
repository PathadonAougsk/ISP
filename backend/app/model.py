from __future__ import annotations

import datetime as dt
<<<<<<< HEAD
import enum
=======
>>>>>>> main
import uuid
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
<<<<<<< HEAD
    Enum as SAEnum,
=======
    DDL,
>>>>>>> main
    FetchedValue,
    ForeignKey,
    Identity,
    Index,
    Integer,
    String,
    Table,
    Text,
    event,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass

auth_users = Table(
    "users",
    Base.metadata,
    Column("id", UUID(as_uuid=True), primary_key=True),
    schema="auth",
)

<<<<<<< HEAD
class TicketStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class TaskStatus(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class AccountRole(str, enum.Enum):
    LAB_OWNER = "Lab Owner"  # can only be set from the Supabase dashboard
    LAB_ADMIN = "Lab Admin"
    LAB_USER = "Lab user"

def _enum_values(e: type[enum.Enum]) -> list[str]:
    # Store the lowercase values ("in_progress"), not the member names ("IN_PROGRESS")
    return [m.value for m in e]

ticket_status_type = SAEnum(TicketStatus, name="ticket_status", values_callable=_enum_values)
task_status_type = SAEnum(TaskStatus, name="task_status", values_callable=_enum_values)
account_role_type = SAEnum(AccountRole, name="account_role", values_callable=_enum_values)
=======
class Permission(Base):
    __tablename__ = "permission"

    id: Mapped[int] = mapped_column(Integer, Identity(always=False), primary_key=True)
    can_overwrite: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    can_edit_role: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )

    role: Mapped[Optional["Role"]] = relationship(back_populates="permission")

    def __repr__(self) -> str:
        return f"<Permission {self.id} overwrite={self.can_overwrite} edit_role={self.can_edit_role}>"


class Status(Base):
    __tablename__ = "status"

    id: Mapped[int] = mapped_column(Integer, Identity(always=False), primary_key=True)
    name: Mapped[str] = mapped_column(String(29), nullable=False, unique=True)

    tasks: Mapped[list["Task"]] = relationship(back_populates="status")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="status")
    announcements: Mapped[list["Announcement"]] = relationship(back_populates="status")

    def __repr__(self) -> str:
        return f"<Status {self.id} {self.name!r}>"
>>>>>>> main

class Category(Base):
    __tablename__ = "category"

    id: Mapped[int] = mapped_column(Integer, Identity(always=False), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

    tasks: Mapped[list["Task"]] = relationship(back_populates="category")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="category")

    def __repr__(self) -> str:
        return f"<Category {self.id} {self.name!r}>"

<<<<<<< HEAD
class Account(Base):
    __tablename__ = "account"
    __table_args__ = (CheckConstraint("quota >= 0", name="account_quota_check"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    username: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    role: Mapped[AccountRole] = mapped_column(
        account_role_type,
        nullable=False,
        server_default=AccountRole.LAB_USER.value,
    )
    quota: Mapped[Optional[int]] = mapped_column(Integer)
    active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )

=======
class Role(Base):
    __tablename__ = "role"

    id: Mapped[int] = mapped_column(Integer, Identity(always=False), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    permission_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("permission.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )

    permission: Mapped[Permission] = relationship(back_populates="role")
    accounts: Mapped[list["Account"]] = relationship(back_populates="role")

    def __repr__(self) -> str:
        return f"<Role {self.id} {self.name!r}>"

class Account(Base):

    __tablename__ = "account"
    __table_args__ = (CheckConstraint("quota >= 0", name="account_quota_check"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("auth.users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    username: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    role_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("role.id", ondelete="RESTRICT"), nullable=False
    )
    quota: Mapped[Optional[int]] = mapped_column(Integer)
    active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )

    role: Mapped[Role] = relationship(back_populates="accounts")

>>>>>>> main
    tasks_created: Mapped[list["Task"]] = relationship(
        back_populates="creator", foreign_keys="Task.created_by"
    )
    tasks_completed: Mapped[list["Task"]] = relationship(
        back_populates="completer", foreign_keys="Task.completed_by"
    )
    tasks_assigned: Mapped[list["Task"]] = relationship(
        secondary=lambda: task_assigned_to, back_populates="assignees"
    )

    tickets_created: Mapped[list["Ticket"]] = relationship(
        back_populates="creator", foreign_keys="Ticket.created_by"
    )
    tickets_completed: Mapped[list["Ticket"]] = relationship(
        back_populates="completer", foreign_keys="Ticket.completed_by"
    )
    tickets_assigned: Mapped[list["Ticket"]] = relationship(
        back_populates="assignee", foreign_keys="Ticket.assigned_id"
    )

    announcements: Mapped[list["Announcement"]] = relationship(back_populates="creator")
    audit_entries: Mapped[list["AuditLog"]] = relationship(back_populates="actor")

    def __repr__(self) -> str:
<<<<<<< HEAD
        return f"<Account {self.username!r} role={self.role.value} active={self.active}>"
=======
        return f"<Account {self.username!r} role_id={self.role_id} active={self.active}>"
>>>>>>> main

task_assigned_to = Table(
    "task_assigned_to",
    Base.metadata,
    Column(
        "task_id",
        Integer,
        ForeignKey("task.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    ),
    Column(
        "assigned_id",
        UUID(as_uuid=True),
        ForeignKey("account.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    ),
    Index("idx_tat_account", "assigned_id"),
)

class Task(Base):
    __tablename__ = "task"
    __table_args__ = (Index("idx_task_due", "due_date"),)

    id: Mapped[int] = mapped_column(Integer, Identity(always=False), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
<<<<<<< HEAD
    status: Mapped[TaskStatus] = mapped_column(
        task_status_type,
        nullable=False,
        server_default=TaskStatus.IN_PROGRESS.value,
=======
    status_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("status.id", ondelete="RESTRICT"), nullable=False
>>>>>>> main
    )
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("category.id", ondelete="RESTRICT"), nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("account.id", ondelete="RESTRICT"), nullable=False
    )
    completed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("account.id", ondelete="SET NULL")
    )
    created: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
<<<<<<< HEAD
=======

>>>>>>> main
    updated: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        server_onupdate=FetchedValue(),
    )
    completed_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime(timezone=True))
    due_date: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)

<<<<<<< HEAD
=======
    status: Mapped[Status] = relationship(back_populates="tasks")
>>>>>>> main
    category: Mapped[Category] = relationship(back_populates="tasks")
    creator: Mapped[Account] = relationship(
        back_populates="tasks_created", foreign_keys=[created_by]
    )
    completer: Mapped[Optional[Account]] = relationship(
        back_populates="tasks_completed", foreign_keys=[completed_by]
    )
    assignees: Mapped[list[Account]] = relationship(
        secondary=task_assigned_to, back_populates="tasks_assigned"
    )

    def __repr__(self) -> str:
<<<<<<< HEAD
        return f"<Task {self.id} {self.name!r} {self.status.value}>"
=======
        return f"<Task {self.id} {self.name!r}>"
>>>>>>> main

class Ticket(Base):
    __tablename__ = "ticket"
    __table_args__ = (Index("idx_ticket_due", "due_date"),)

    id: Mapped[int] = mapped_column(Integer, Identity(always=False), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
<<<<<<< HEAD
    status: Mapped[TicketStatus] = mapped_column(
        ticket_status_type,
        nullable=False,
        server_default=TicketStatus.PENDING.value,
=======
    status_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("status.id", ondelete="RESTRICT"), nullable=False
>>>>>>> main
    )
    category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("category.id", ondelete="RESTRICT"), nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("account.id", ondelete="RESTRICT"), nullable=False
    )
    completed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("account.id", ondelete="SET NULL")
    )
<<<<<<< HEAD
=======

>>>>>>> main
    assigned_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("account.id", ondelete="SET NULL")
    )
    created: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        server_onupdate=FetchedValue(),
    )
    completed_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime(timezone=True))
    due_date: Mapped[Optional[dt.datetime]] = mapped_column(DateTime(timezone=True))

<<<<<<< HEAD
=======
    status: Mapped[Status] = relationship(back_populates="tickets")
>>>>>>> main
    category: Mapped[Category] = relationship(back_populates="tickets")
    creator: Mapped[Account] = relationship(
        back_populates="tickets_created", foreign_keys=[created_by]
    )
    completer: Mapped[Optional[Account]] = relationship(
        back_populates="tickets_completed", foreign_keys=[completed_by]
    )
    assignee: Mapped[Optional[Account]] = relationship(
        back_populates="tickets_assigned", foreign_keys=[assigned_id]
    )

    def __repr__(self) -> str:
<<<<<<< HEAD
        return f"<Ticket {self.id} {self.name!r} {self.status.value}>"
=======
        return f"<Ticket {self.id} {self.name!r}>"
>>>>>>> main

class Announcement(Base):
    __tablename__ = "announcement"

    id: Mapped[int] = mapped_column(Integer, Identity(always=False), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
<<<<<<< HEAD
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("account.id", ondelete="RESTRICT"), nullable=False
    )
=======
    status_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("status.id", ondelete="RESTRICT"), nullable=False
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("account.id", ondelete="RESTRICT"), nullable=False
    )
>>>>>>> main
    created: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        server_onupdate=FetchedValue(),
    )

<<<<<<< HEAD
=======
    status: Mapped[Status] = relationship(back_populates="announcements")
>>>>>>> main
    creator: Mapped[Account] = relationship(back_populates="announcements")

    def __repr__(self) -> str:
        return f"<Announcement {self.id} {self.name!r}>"

class AuditLog(Base):
    __tablename__ = "audit_log"
    __table_args__ = (
        Index("idx_audit_row", "from_table", "row_id", "occurred_at"),
        Index("idx_audit_actor", "by_whom"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    from_table: Mapped[str] = mapped_column(String(64), nullable=False)
<<<<<<< HEAD
    row_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
=======
    row_id: Mapped[str] = mapped_column(String(36), nullable=False)
>>>>>>> main
    column_name: Mapped[str] = mapped_column(String(64), nullable=False)
    old_value: Mapped[Optional[str]] = mapped_column(Text)
    new_value: Mapped[Optional[str]] = mapped_column(Text)
    by_whom: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("account.id", ondelete="SET NULL")
    )
    occurred_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    actor: Mapped[Optional[Account]] = relationship(back_populates="audit_entries")

    def __repr__(self) -> str:
        return f"<AuditLog {self.id} {self.from_table}.{self.column_name} row={self.row_id}>"
<<<<<<< HEAD
=======

_TOUCH_UPDATED_FN = DDL(
    """
CREATE OR REPLACE FUNCTION public.touch_updated()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated := now();
  RETURN NEW;
END;
$$;
"""
)

event.listen(Base.metadata, "before_create", _TOUCH_UPDATED_FN)

for _table, _trigger in (
    (Task.__table__, "trg_task_updated"),
    (Ticket.__table__, "trg_ticket_updated"),
    (Announcement.__table__, "trg_ann_updated"),
):
    event.listen(
        _table,
        "after_create",
        DDL(
            "CREATE TRIGGER %s BEFORE UPDATE ON %s "
            "FOR EACH ROW EXECUTE FUNCTION public.touch_updated();"
            % (_trigger, _table.name)
        ),
    )


def create_public_schema(engine) -> None:
    """create_all() for everything except the Supabase-owned auth.users stub."""
    Base.metadata.create_all(
        engine,
        tables=[t for t in Base.metadata.sorted_tables if t.schema != "auth"],
    )


__all__ = [
    "Base",
    "Permission",
    "Status",
    "Category",
    "Role",
    "Account",
    "Task",
    "task_assigned_to",
    "Ticket",
    "Announcement",
    "AuditLog",
    "create_public_schema",
]
>>>>>>> main
