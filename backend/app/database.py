from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.model import Base
import os

cn: str | None = os.environ.get("SUPABASE_KEY")

if (not cn):
    raise ValueError("Connection string is missing from .env")

engine = create_engine(cn, echo=True)
Base.metadata.create_all(engine)

with Session(engine) as s:
    permission = Permission()  # all four bools fall back to server_default false
    s.add(permission)
    s.flush()
 
    role = Role(name="admin", permission=permission)
    account = Account(email="admin@example.com", role=role)
    status = Status(name="open", priority_rank=1)
    s.add_all([role, account, status])
    s.flush()
 
    announcement = Announcement(
        name="Hello", status=status, creator=account
    )
    s.add(announcement)
    s.flush()
 
    s.add_all(
        [
            Task(name="First task", status=status, creator=account),
            Ticket(name="First ticket", status=status, creator=account),
            Action(
                verb=ActionVerb.create,
                entity_type=EntityType.announcement,
                entity_id=announcement.id,
                actor=account,
            ),
        ]
    )
    s.commit()
 
    print("seeded account", account.id)