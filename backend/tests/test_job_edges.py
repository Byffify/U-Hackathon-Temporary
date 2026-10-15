import pytest
from test_gemini import conversation, plan
from test_gemini import gem as _gem

gem = _gem


def test_new_message_invalidates_unconfirmed_plan(gem):
    cid = conversation(gem)
    current = plan(gem, cid)
    estimated = gem.client.post(f"/api/v1/gemini/conversations/{cid}/estimates").json()["data"]
    response = gem.client.post(
        f"/api/v1/gemini/conversations/{cid}/messages",
        json={"content": "Change the requested feature", "estimate_id": estimated["id"]},
        headers={"Idempotency-Key": "new-message"},
    )
    assert response.status_code == 202
    response = gem.client.post(
        f"/api/v1/gemini/plans/{current['id']}/confirm",
        json={"revision": current["revision"]},
        headers={"Idempotency-Key": "stale"},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PLAN_STALE"


def test_no_quota_topup_or_reset_and_shortage_blocks_generation(gem):
    cid = conversation(gem)
    current = plan(gem, cid)
    from app.gemini import Quota

    with gem.app.state.sessions() as db:
        quota = db.get(Quota, gem.user.id)
        quota.allocation = 100
        db.commit()
    response = gem.client.post(
        f"/api/v1/gemini/plans/{current['id']}/confirm",
        json={"revision": current["revision"]},
        headers={"Idempotency-Key": "too-large"},
    )
    assert response.status_code == 429
    quota = gem.client.get("/api/v1/gemini/quota").json()["data"]
    assert quota["reserved"] == 0
    assert quota["used"] == 70


def test_unknown_provider_outcome_is_not_retried_or_called_free(gem):
    from app.gemini_provider import ProviderFailure
    from app.worker import run_once

    cid = conversation(gem)
    current = plan(gem, cid)
    response = gem.client.post(
        f"/api/v1/gemini/plans/{current['id']}/confirm",
        json={"revision": current["revision"]},
        headers={"Idempotency-Key": "uncertain"},
    )
    job = response.json()["data"]
    gem.app.state.gemini_provider.failure = ProviderFailure("transport", outcome_unknown=True)
    assert run_once(gem.app)
    assert not run_once(gem.app)
    actual = gem.client.get(f"/api/v1/jobs/{job['id']}").json()["data"]
    assert actual["error"] == "PROVIDER_OUTCOME_UNKNOWN"
    assert gem.client.get("/api/v1/gemini/quota").json()["data"]["reserved"] == 2000


@pytest.mark.parametrize("identifier", ["x", "-1", "0", "9" * 79])
def test_invalid_chain_identifiers_are_validation_errors(identifier):
    from app.chain import uint
    from app.errors import ApiError

    with pytest.raises(ApiError) as caught:
        uint(identifier)
    assert caught.value.status == 422
