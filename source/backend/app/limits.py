"""Column length limits, inclusive. Mirrors app/model.py and
migrations/001_length_limits.sql; the request models validate against these
so a too-long value is a 422 before it ever reaches Postgres."""

from typing import Annotated

from pydantic import StringConstraints

NAME_MAX = 255
DESCRIPTION_MAX = 1000
USERNAME_MAX = 30
CATEGORY_NAME_MAX = 30

# Strip first, then check length, so "   " is a 422 like "" is.
Name = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=NAME_MAX)
]
CategoryName = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True, min_length=1, max_length=CATEGORY_NAME_MAX
    ),
]
