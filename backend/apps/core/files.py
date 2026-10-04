"""
Private uploaded files (ID documents, photos), shared by clients and employees.

- check_file(): validates extension, size AND the first bytes of the file.
- private_file_response(): sends a stored file through the API (there is no
  public URL for uploads: Django never serves MEDIA_ROOT).
"""
import mimetypes
import uuid
from pathlib import Path

from django.http import FileResponse, Http404
from rest_framework import serializers

MB = 1024 * 1024

IMAGE_TYPES = {".jpg", ".jpeg", ".png", ".webp"}
DOCUMENT_TYPES = IMAGE_TYPES | {".pdf"}

# Check the real content (first bytes), not only the extension.
SIGNATURES = {
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".webp": [b"RIFF"],
    ".pdf": [b"%PDF"],
}


def check_file(file, allowed, max_mb):
    ext = Path(file.name).suffix.lower()
    if ext not in allowed:
        raise serializers.ValidationError("file_type")
    if file.size > max_mb * MB:
        raise serializers.ValidationError("file_too_big")
    head = file.read(16)
    file.seek(0)
    if not any(head.startswith(sig) for sig in SIGNATURES[ext]):
        raise serializers.ValidationError("file_type")
    return file


def random_file_name(folder, kind, filename):
    """<folder>/<kind>-<random>.<ext>: unguessable, never the user's file name."""
    return f"{folder}/{kind}-{uuid.uuid4().hex}{Path(filename).suffix.lower()}"


def document_type(field):
    """'pdf', 'image' or None, for the frontend to choose how to show it."""
    if not field:
        return None
    return "pdf" if field.name.lower().endswith(".pdf") else "image"


def private_file_response(field):
    if not field:
        raise Http404
    content_type = mimetypes.guess_type(field.name)[0] or "application/octet-stream"
    response = FileResponse(field.open("rb"), content_type=content_type)
    response["Cache-Control"] = "private, no-store"
    return response
