import io
import zipfile

from app.config import Settings
from app.validation import validate_output


def test_missing_sandbox_is_reported_not_run_without_executing_code():
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("untrusted.py", "raise RuntimeError('must never run on API server')")
    result = validate_output(buffer.getvalue(), Settings())
    assert result["build"] == "not-run"
    assert result["archive"] == "passed"
