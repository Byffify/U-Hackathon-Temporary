"""Private object storage and authenticated, envelope-encrypted source delivery."""

import base64
import hashlib
import io
import json
import re
import secrets
import stat
import unicodedata
import zipfile
from pathlib import Path, PurePosixPath

import httpx
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from PIL import Image, UnidentifiedImageError

from app.errors import ApiError


def secret(value):
    return value.get_secret_value() if hasattr(value, "get_secret_value") else value


def validate_archive(raw: bytes, settings) -> list[tuple[str, bytes]]:
    if not raw or len(raw) > settings.max_upload_bytes:
        raise ApiError(413, "UPLOAD_TOO_LARGE", "Source archive exceeds the upload limit.")
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as archive:
            entries = archive.infolist()
            if not entries or len(entries) > settings.max_archive_files:
                raise ValueError("archive entry limit")
            total, names, file_names, files = 0, set(), set(), []
            for entry in entries:
                name = entry.filename.replace("\\", "/")
                path = PurePosixPath(name)
                normalized = unicodedata.normalize("NFKC", str(path)).casefold().rstrip("/")
                if (
                    not name
                    or path.is_absolute()
                    or ".." in path.parts
                    or ":" in name
                    or "\x00" in name
                    or normalized in names
                    or stat.S_ISLNK(entry.external_attr >> 16)
                    or entry.flag_bits & 1
                ):
                    raise ValueError("unsafe path")
                names.add(normalized)
                if any(str(parent) in file_names for parent in PurePosixPath(normalized).parents):
                    raise ValueError("file shadows a directory")
                if not entry.is_dir():
                    if any(existing.startswith(normalized + "/") for existing in names):
                        raise ValueError("file shadows a directory")
                    file_names.add(normalized)
                total += entry.file_size
                if total > settings.max_archive_expanded_bytes or entry.file_size > max(
                    entry.compress_size * 200, 1024 * 1024
                ):
                    raise ValueError("expansion limit")
                if not entry.is_dir():
                    data = archive.read(entry)
                    if len(data) != entry.file_size:
                        raise ValueError("size mismatch")
                    files.append((str(path), data))
            if not files:
                raise ValueError("empty source")
            return files
    except (ValueError, zipfile.BadZipFile, RuntimeError, NotImplementedError, OSError):
        raise ApiError(
            422, "UNSAFE_ARCHIVE", "Upload a valid ZIP with safe paths and bounded size."
        ) from None


def clean_image(raw: bytes, settings) -> tuple[bytes, str]:
    if len(raw) > settings.max_image_bytes:
        raise ApiError(413, "UPLOAD_TOO_LARGE", "Image exceeds the upload limit.")
    try:
        with Image.open(io.BytesIO(raw)) as image:
            if image.format not in {"PNG", "JPEG", "WEBP"} or image.width * image.height > 16000000:
                raise ValueError("image limit")
            image.load()
            image.thumbnail((1600, 1600))
            output = io.BytesIO()
            image.convert("RGBA").save(output, format="PNG")
            return output.getvalue(), "image/png"
    except (ValueError, OSError, UnidentifiedImageError, Image.DecompressionBombError):
        raise ApiError(422, "INVALID_IMAGE", "Upload a valid PNG, JPEG or WebP image.") from None


class Storage:
    def __init__(self, settings):
        self.settings = settings

    def _master(self):
        configured = secret(self.settings.storage_master_key)
        if configured:
            try:
                key = base64.b64decode(configured, validate=True)
                if len(key) != 32:
                    raise ValueError()
                return key
            except ValueError:
                raise ApiError(
                    503, "KEY_CONFIGURATION_INVALID", "Storage encryption is unavailable."
                ) from None
        if self.settings.environment == "production":
            raise ApiError(
                503, "STORAGE_UNAVAILABLE", "Configure the protected source encryption key."
            )
        root = self._local_root()
        root.mkdir(parents=True, exist_ok=True)
        key_path = root / "master.key"
        try:
            with key_path.open("xb") as file:
                file.write(secrets.token_bytes(32))
            key_path.chmod(0o600)
        except FileExistsError:
            pass
        key = key_path.read_bytes()
        if len(key) != 32:
            raise ApiError(503, "KEY_CONFIGURATION_INVALID", "Local encryption key is invalid.")
        return key

    def _local_root(self) -> Path:
        mount = self.settings.railway_volume_mount_path
        return Path(mount) if mount else Path(self.settings.storage_root)

    def _path(self, key):
        if not re.fullmatch(r"[a-f0-9]{32}", key):
            raise ApiError(404, "FILE_NOT_FOUND", "File was not found.")
        return self._local_root() / "objects" / key

    def _remote(self):
        s = self.settings
        if not s.supabase_url or not secret(s.supabase_service_key):
            raise ApiError(503, "STORAGE_UNAVAILABLE", "Configure private object storage.")
        return (
            f"{s.supabase_url.rstrip('/')}/storage/v1/object/{s.supabase_bucket}",
            {
                "Authorization": f"Bearer {secret(s.supabase_service_key)}",
                "apikey": secret(s.supabase_service_key),
            },
        )

    def put_private(self, data: bytes) -> str:
        key = secrets.token_hex(16)
        if self.settings.storage_backend == "local":
            if (
                self.settings.environment == "production"
                and not self.settings.railway_volume_mount_path
            ):
                raise ApiError(
                    503, "STORAGE_UNAVAILABLE", "Configure persistent private object storage."
                )
            path = self._path(key)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        else:
            url, headers = self._remote()
            try:
                response = httpx.post(f"{url}/{key}", headers=headers, content=data, timeout=60)
                response.raise_for_status()
            except httpx.HTTPError:
                raise ApiError(
                    503, "STORAGE_UNAVAILABLE", "File storage failed. Try again.", retryable=True
                ) from None
        return key

    def read_private(self, key: str) -> bytes:
        self._path(key)  # validate opaque identifier even for remote objects
        if self.settings.storage_backend == "local":
            try:
                return self._path(key).read_bytes()
            except OSError:
                raise ApiError(
                    503, "STORAGE_UNAVAILABLE", "File is temporarily unavailable.", retryable=True
                ) from None
        url, headers = self._remote()
        return self._request_bytes("GET", f"{url}/{key}", headers=headers)

    def _request_bytes(self, method, url, **kwargs):
        try:
            with httpx.stream(method, url, timeout=60, **kwargs) as response:
                response.raise_for_status()
                result = bytearray()
                for chunk in response.iter_bytes():
                    result.extend(chunk)
                    if len(result) > self.settings.max_upload_bytes + 65536:
                        raise ApiError(
                            503, "STORAGE_INTEGRITY_ERROR", "Stored object exceeds expected limits."
                        )
                return bytes(result)
        except httpx.HTTPError:
            raise ApiError(
                503, "STORAGE_UNAVAILABLE", "Storage is temporarily unavailable.", retryable=True
            ) from None

    def _ipfs(self):
        if not self.settings.ipfs_api_url:
            raise ApiError(503, "IPFS_UNAVAILABLE", "Configure an IPFS pinning RPC service.")
        auth = secret(self.settings.ipfs_api_authorization)
        return self.settings.ipfs_api_url.rstrip("/"), ({"Authorization": auth} if auth else {})

    def put_source(self, raw: bytes, release_id: str):
        s = self.settings
        if s.environment == "production" and s.source_storage_backend != "ipfs":
            raise ApiError(
                503,
                "IPFS_UNAVAILABLE",
                "Production source archives require encrypted IPFS storage.",
            )
        key, nonce, wrap_nonce = (
            AESGCM.generate_key(256),
            secrets.token_bytes(12),
            secrets.token_bytes(12),
        )
        aad = release_id.encode()
        wrapped = wrap_nonce + AESGCM(self._master()).encrypt(wrap_nonce, key, aad)
        ciphertext = AESGCM(key).encrypt(nonce, raw, aad)
        if s.source_storage_backend == "ipfs":
            url, headers = self._ipfs()
            try:
                response = httpx.post(
                    f"{url}/api/v0/add",
                    params={"pin": "true"},
                    headers=headers,
                    files={"file": ("encrypted.bin", ciphertext, "application/octet-stream")},
                    timeout=60,
                )
                response.raise_for_status()
                cid = json.loads(response.text.strip().splitlines()[-1])["Hash"]
                if not re.fullmatch(r"[A-Za-z0-9]{10,128}", cid):
                    raise ValueError()
            except (httpx.HTTPError, ValueError, KeyError, IndexError):
                raise ApiError(
                    503, "IPFS_UNAVAILABLE", "Encrypted source upload failed.", retryable=True
                ) from None
            storage_key = "ipfs:" + cid
        else:
            storage_key = "local:" + self.put_private(ciphertext)
        return {
            "storage_key": storage_key,
            "wrapped_key": base64.b64encode(wrapped).decode(),
            "nonce": base64.b64encode(nonce).decode(),
            "sha256": hashlib.sha256(raw).hexdigest(),
        }

    def get_source(self, release):
        if release.storage_key.startswith("ipfs:"):
            url, headers = self._ipfs()
            ciphertext = self._request_bytes(
                "POST",
                f"{url}/api/v0/cat",
                headers=headers,
                params={"arg": release.storage_key[5:]},
            )
        else:
            ciphertext = self.read_private(release.storage_key.removeprefix("local:"))
        try:
            wrapped = base64.b64decode(release.wrapped_key, validate=True)
            aad = release.id.encode()
            key = AESGCM(self._master()).decrypt(wrapped[:12], wrapped[12:], aad)
            raw = AESGCM(key).decrypt(base64.b64decode(release.nonce), ciphertext, aad)
            if hashlib.sha256(raw).hexdigest() != release.sha256:
                raise ValueError()
            return raw
        except (InvalidTag, ValueError):
            raise ApiError(
                503, "STORAGE_INTEGRITY_ERROR", "Source integrity verification failed."
            ) from None
