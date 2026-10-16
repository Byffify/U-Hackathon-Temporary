from types import SimpleNamespace

import pytest

from app.gemini_provider import GoogleGeminiProvider, ProviderFailure


@pytest.mark.parametrize(
    "code,expected,unknown",
    [
        (429, "PROVIDER_RATE_LIMITED", False),
        (403, "PROVIDER_ACCESS_DENIED", False),
        (404, "PROVIDER_MODEL_UNAVAILABLE", False),
        (503, "PROVIDER_UNAVAILABLE", True),
    ],
)
def test_provider_errors_are_actionable_without_exposing_sdk_details(code, expected, unknown):
    class Rejected(Exception):
        pass

    def rejected(**kwargs):
        error = Rejected("secret-bearing SDK details")
        error.code = code
        raise error

    provider = GoogleGeminiProvider.__new__(GoogleGeminiProvider)
    provider.model = "test-model"
    provider.client = SimpleNamespace(
        models=SimpleNamespace(
            count_tokens=lambda **kwargs: SimpleNamespace(total_tokens=10),
            generate_content=rejected,
        )
    )
    with pytest.raises(ProviderFailure) as caught:
        provider.run("chat", {"content": "Hello"}, 1000)
    assert caught.value.code == expected
    assert caught.value.outcome_unknown == unknown
    assert "secret" not in str(caught.value)
