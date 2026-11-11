"""The two unauthenticated health endpoints."""


def test_health(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == ["Ok"]


def test_db_check_reaches_supabase(client):
    response = client.get("/db")

    assert response.status_code == 200
    assert response.json() == ["Ok"]
