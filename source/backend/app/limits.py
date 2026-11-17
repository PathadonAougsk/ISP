"""Column length limits, inclusive. Mirrors app/model.py and
migrations/001_length_limits.sql; the request models validate against these
so a too-long value is a 422 before it ever reaches Postgres."""

NAME_MAX = 255
DESCRIPTION_MAX = 1000
USERNAME_MAX = 30
CATEGORY_NAME_MAX = 30
