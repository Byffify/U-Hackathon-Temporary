def test_explore_serves_examples_without_publishing_them(client):
    listing = client.get("/api/v1/explore")
    assert listing.status_code == 200
    body = listing.json()
    assert [item["id"] for item in body["data"]] == ["flora", "orbit", "folio"]
    assert body["meta"]["total"] == 3
    assert all(item["is_example"] and not item["published"] for item in body["data"])

    filtered = client.get("/api/v1/explore", params={"q": "dashboard", "stack": "Next.js"})
    assert [item["id"] for item in filtered.json()["data"]] == ["orbit"]
    assert client.get("/api/v1/explore/flora").json()["data"]["price_wei"] == "500000000000000000"
    assert client.get("/api/v1/projects").json()["data"] == []
    assert client.get("/api/v1/projects/flora").status_code == 404
