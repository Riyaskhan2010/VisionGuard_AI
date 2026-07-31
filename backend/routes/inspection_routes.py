import os
from flask import Blueprint, request, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models import User, Inspection, Product
from services.detection_service import run_detection
from services.analytics_service import check_and_flag_recurring
from utils.helpers import allowed_file, save_upload, success_response, error_response

inspection_bp = Blueprint("inspection", __name__, url_prefix="/api")


# ── Serve uploaded images ─────────────────────────────────────────────────────
@inspection_bp.route("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)


# ── Upload ────────────────────────────────────────────────────────────────────
@inspection_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload():
    if "image" not in request.files:
        return error_response("No image file provided.", 400)
    file = request.files["image"]
    if not file or file.filename == "":
        return error_response("Empty file.", 400)
    if not allowed_file(file.filename):
        return error_response("Unsupported file type. Use PNG, JPG, JPEG, WEBP, BMP.", 400)
    filename = save_upload(file)
    return success_response(data={"filename": filename}, message="Image uploaded.")


# ── Detect ────────────────────────────────────────────────────────────────────
@inspection_bp.route("/detect", methods=["POST"])
@jwt_required()
def detect():
    worker_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    filename = data.get("filename", "").strip()
    product_db_id = data.get("product_id")

    if not filename:
        return error_response("filename is required.", 400)
    if not product_db_id:
        return error_response("product_id is required.", 400)

    product = Product.query.get(product_db_id)
    if not product:
        return error_response("Product not found.", 404)

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    image_path = os.path.join(upload_folder, filename)
    if not os.path.exists(image_path):
        return error_response("Uploaded image not found. Please re-upload.", 404)

    # Gather history defects for quality scoring
    history_defects = [
        i.defect for i in
        Inspection.query.filter_by(product_id=product.id)
        .filter(Inspection.defect != "none")
        .order_by(Inspection.created_at.desc())
        .limit(10)
        .all()
    ]

    # Run AI detection
    result = run_detection(image_path, upload_folder, history_defects)

    # Load recommendation overrides from DB
    from models.recommendation_config import RecommendationConfig
    override = RecommendationConfig.query.filter_by(defect_type=result["defect"]).first()
    if override:
        result["recommendation"] = override.recommendation
        result["severity"] = override.severity

    inspection = Inspection(
        product_id=product.id,
        worker_id=worker_id,
        original_image=filename,
        detected_image=result["detected_image"],
        defect=result["defect"],
        confidence=result["confidence"],
        severity=result["severity"],
        recommendation=result["recommendation"],
        bounding_box=result["bounding_box"],
        detection_time_ms=result["detection_time_ms"],
        quality_score=result["quality_score"],
        quality_label=result["quality_label"],
        ai_prediction=result["defect"],
        status="Pending",
    )
    db.session.add(inspection)
    db.session.flush()

    check_and_flag_recurring(inspection)
    db.session.commit()

    return success_response(data=inspection.to_dict(), message="Detection complete.", status_code=201)


# ── History ───────────────────────────────────────────────────────────────────
@inspection_bp.route("/history", methods=["GET"])
@jwt_required()
def history():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return error_response("User not found.", 404)

    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    status_filter = request.args.get("status")
    product_filter = request.args.get("product_id")

    query = Inspection.query
    if user.role == "Worker":
        query = query.filter_by(worker_id=user_id)
    if status_filter:
        query = query.filter_by(status=status_filter)
    if product_filter:
        query = query.filter_by(product_id=product_filter)

    paginated = query.order_by(Inspection.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return success_response(data={
        "inspections": [i.to_dict() for i in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
        "current_page": page,
    })


# ── Single inspection ─────────────────────────────────────────────────────────
@inspection_bp.route("/inspection/<int:inspection_id>", methods=["GET"])
@jwt_required()
def get_inspection(inspection_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    inspection = Inspection.query.get(inspection_id)
    if not inspection:
        return error_response("Inspection not found.", 404)
    if user.role == "Worker" and inspection.worker_id != user_id:
        return error_response("Forbidden.", 403)
    return success_response(data=inspection.to_dict())


# ── Worker summary (today stats) ──────────────────────────────────────────────
@inspection_bp.route("/worker/summary", methods=["GET"])
@jwt_required()
def worker_summary():
    user_id = int(get_jwt_identity())
    from datetime import datetime
    from sqlalchemy import func

    today = datetime.utcnow().date()
    today_total = (Inspection.query
                   .filter_by(worker_id=user_id)
                   .filter(func.date(Inspection.created_at) == today)
                   .count())
    today_approved = (Inspection.query
                      .filter_by(worker_id=user_id, status="Approved")
                      .filter(func.date(Inspection.created_at) == today)
                      .count())
    today_rejected = (Inspection.query
                      .filter_by(worker_id=user_id, status="Rejected")
                      .filter(func.date(Inspection.created_at) == today)
                      .count())
    today_pending = (Inspection.query
                     .filter_by(worker_id=user_id, status="Pending")
                     .filter(func.date(Inspection.created_at) == today)
                     .count())

    all_total = Inspection.query.filter_by(worker_id=user_id).count()
    all_approved = Inspection.query.filter_by(worker_id=user_id, status="Approved").count()
    all_rejected = Inspection.query.filter_by(worker_id=user_id, status="Rejected").count()

    avg_score = (db.session.query(func.avg(Inspection.quality_score))
                 .filter_by(worker_id=user_id).scalar())

    return success_response(data={
        "today": {
            "total": today_total,
            "approved": today_approved,
            "rejected": today_rejected,
            "pending": today_pending,
        },
        "all_time": {
            "total": all_total,
            "approved": all_approved,
            "rejected": all_rejected,
        },
        "avg_quality_score": round(avg_score, 1) if avg_score else 0.0,
    })
