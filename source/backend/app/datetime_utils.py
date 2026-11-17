import datetime as dt

# Thailand has been a fixed UTC+7 since 1920 and has never used DST, so a plain
# offset is correct here and needs no tzdata inside the container. The frontend
# hardcodes the same zone in src/lib/format.ts.
BANGKOK_TZ = dt.timezone(dt.timedelta(hours=7))


# to_utc(datetime(2026, 10, 11, 0, 0)) -> 2026-10-10 17:00:00+00:00
# A value without a timezone is read as Bangkok wall clock, never as whatever
# timezone the server happens to run in.
def to_utc(value: dt.datetime | None) -> dt.datetime | None:
    if value is None:
        return None

    if value.tzinfo is None:
        value = value.replace(tzinfo=BANGKOK_TZ)

    return value.astimezone(dt.timezone.utc)


# to_due_date("2026-10-11") -> 2026-10-11 16:59:59.999999+00:00
#
# A due date means "due by the end of that day in Bangkok", but the clients only
# send the day ("2026-10-11"), which Pydantic parses into a naive midnight.
# Anchoring to the Bangkok calendar day keeps this idempotent: sending a stored
# due date straight back produces the same value, so a save that does not touch
# the due date cannot move the deadline or log a change.
def to_due_date(value: dt.datetime | None) -> dt.datetime | None:
    if value is None:
        return None

    day = to_utc(value).astimezone(BANGKOK_TZ)
    end_of_day = day.replace(hour=23, minute=59, second=59, microsecond=999999)

    return end_of_day.astimezone(dt.timezone.utc)
