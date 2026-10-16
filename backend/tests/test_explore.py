from app.explore import ExploreExample


def test_explore_serves_examples_without_publishing_them(client, app):
    with app.state.sessions() as db:
        for order, identifier, title, stack, price in (
            (1, "flora", "Flora storefront", "React", "500000000000000000"),
            (2, "orbit", "Orbit dashboard", "Next.js", "800000000000000000"),
            (3, "folio", "Studio portfolio", "Vue", "300000000000000000"),
        ):
            db.add(
                ExploreExample(
                    id=identifier,
                    title=title,
                    type="Preview",
                    stack=stack,
                    price_wei=price,
                    creator_name="Example creator",
                    description=f"{title} preview",
                    tone="aqua",
                    features=["Example feature"],
                    sort_order=order,
                )
            )
        db.commit()

    listing = client.get("/api/v1/explore")
    assert listing.status_code == 200
    body = listing.json()
    assert [item["id"] for item in body["data"]] == ["flora", "orbit", "folio"]
    assert body["meta"]["total"] == 3
    assert body["meta"]["stacks"] == ["Next.js", "React", "Vue"]
    assert all(item["is_example"] and not item["published"] for item in body["data"])

    filtered = client.get("/api/v1/explore", params={"q": "dashboard", "stack": "Next.js"})
    assert [item["id"] for item in filtered.json()["data"]] == ["orbit"]
    assert client.get("/api/v1/explore/flora").json()["data"]["price_wei"] == "500000000000000000"
    assert client.get("/api/v1/projects").json()["data"] == []
    assert client.get("/api/v1/projects/flora").status_code == 404
    project_catalog = client.get("/api/v1/projects", params={"include_examples": "true"})
    assert [item["id"] for item in project_catalog.json()["data"]] == [
        "flora",
        "orbit",
        "folio",
    ]
    assert client.get("/api/v1/projects/flora?include_examples=true").json()["data"]["is_example"]

    with app.state.sessions() as db:
        db.get(ExploreExample, "flora").title = "Updated preview"
        db.commit()
    assert client.get("/api/v1/explore/flora").json()["data"]["title"] == "Updated preview"
