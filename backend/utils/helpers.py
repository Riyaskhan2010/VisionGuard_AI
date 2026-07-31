import os
import uuid
from flask import current_app


ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def save_upload(file_storage) -> str:
    """Save an uploaded FileStorage object; return the saved filename."""
    ext = file_storage.filename.rsplit(".", 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)
    file_storage.save(os.path.join(upload_folder, filename))
    return filename


def success_response(data=None, message="Success", status_code=200):
    resp = {"success": True, "message": message}
    if data is not None:
        resp["data"] = data
    from flask import jsonify
    return jsonify(resp), status_code


def error_response(message="An error occurred", status_code=400, errors=None):
    resp = {"success": False, "message": message}
    if errors:
        resp["errors"] = errors
    from flask import jsonify
    return jsonify(resp), status_code
