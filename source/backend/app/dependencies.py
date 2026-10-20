import os

from dotenv import load_dotenv
from jwt import PyJWKClient
from supabase import create_client, Client

load_dotenv()

url: str | None = os.environ.get("SUPABASE_URL")
key: str | None = os.environ.get("SUPABASE_KEY")

if (not url or not key):
    raise ValueError("SUPABASE_URL or SUPABASE_KEY is missing from .env")

supabase: Client = create_client(url, key)

jwt_issuer: str = f"{url.rstrip('/')}/auth/v1"
jwks_client: PyJWKClient = PyJWKClient(
    f"{jwt_issuer}/.well-known/jwks.json", cache_jwk_set=True, lifespan=600
)
