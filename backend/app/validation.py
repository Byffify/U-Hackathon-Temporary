"""Optional isolated build validation. No subprocess ever runs uploaded code on this server."""

from pathlib import PurePosixPath

from app.storage import validate_archive


def validate_output(raw, settings):
    files = validate_archive(raw, settings)
    if not settings.modal_app_name or not settings.sandbox_build_command:
        return {"archive": "passed", "build": "not-run", "reason": "Sandbox is not configured."}
    sandbox = None
    started = False
    try:
        import modal

        app = modal.App.lookup(settings.modal_app_name, create_if_missing=False)
        image = modal.Image.from_registry(settings.sandbox_image)
        sandbox = modal.Sandbox.create(
            app=app,
            image=image,
            timeout=settings.sandbox_timeout_seconds,
            cpu=1,
            memory=1024,
            block_network=True,
        )
        parents = {"/workspace"} | {
            str(PurePosixPath("/workspace") / PurePosixPath(path).parent) for path, _ in files
        }
        if sandbox.exec("mkdir", "-p", *sorted(parents)).wait() != 0:
            raise RuntimeError("Sandbox directory setup failed")
        for path, content in files:
            sandbox.filesystem.write_text(content.decode("utf-8"), "/workspace/" + path)
        started = True
        process = sandbox.exec(
            "sh",
            "-c",
            'cd /workspace && exec "$@"',
            "utopia-build",
            *settings.sandbox_build_command,
            timeout=settings.sandbox_timeout_seconds,
        )
        code = process.wait()
        return {
            "archive": "passed",
            "build": "passed" if code == 0 else "failed",
            "exit_code": code,
            "isolation": "modal",
            "network": "blocked",
        }
    except Exception:
        return {
            "archive": "passed",
            "build": "failed" if started else "not-run",
            "reason": "Sandbox execution unavailable.",
        }
    finally:
        if sandbox:
            try:
                sandbox.terminate()
            except Exception:
                pass
