from flask import Blueprint, request, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models import User, Inspection, Alert, Product
from models.pattern_alert import PatternAlert
from models.recommendation_config import RecommendationConfig
from services.analytics_service import (
    get_dashboard_summary, get_severity_distribution, get_defect_distribution,
    get_daily_trend, get_weekly_trend, get_monthly_trend, get_status_trend,
    get_human_validation_stats, get_correction_history,
    get_recurring_defects, get_inspection_timeline,
    get_worker_performance, detect_manufacturing_patterns,
)
from services.notification_service import create_notification
from services.report_service import generate_inspection_pdf
from utils.helpers import success_response, error_response
import io

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

REJECT_REASONS = [
    "Image Blur", "Wrong Product", "Wrong Angle",
    "Lighting Issue", "Manual Inspection Required",
    "AI Misclassification", "Other",
]


def _require_admin():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != "Admin":
        return None, error_response("Admin access required.", 403)
    return user, None


# ── Dashboard ─────────────────────────────────────────────────────────────────
@admin_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    _, err = _require_admin()
    if err:
        return err
    return success_response(data=get_dashboard_summary())


# ── Analytics ─────────────────────────────────────────────────────────────────
@admin_bp.route("/analytics", methods=["GET"])
@jwt_required()
def analytics():
    _, err = _require_admin()
    if err:
        return err
    days = int(request.args.get("days", 14))
    return success_response(data={
        "severity_distribution": get_severity_distribution(),
        "defect_distribution": get_defect_distribution(),
        "daily_trend": get_daily_trend(),
        "weekly_trend": get_weekly_trend(),
        "monthly_trend": get_monthly_trend(),
        "status_trend": get_status_trend(days),
        "human_validation": get_human_validation_stats(),
        "correction_history": get_correction_history(20),
        "recurring_defects": get_recurring_defects(),
        "worker_performance": get_worker_performance(),
    })


# ── Inspections list ──────────────────────────────────────────────────────────
@admin_bp.route("/inspections", methods=["GET"])
@jwt_required()
def list_inspections():
    _, err = _require_admin()
    if err:
        return err
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    status_filter = request.args.get("status")
    product_filter = request.args.get("product_id")
    worker_filter = request.args.get("worker_id")

    query = Inspection.query
    if status_filter:
        query = query.filter_by(status=status_filter)
    if product_filter:
        query = query.filter_by(product_id=int(product_filter))
    if worker_filter:
        query = query.filter_by(worker_id=int(worker_filter))

    paginated = query.order_by(Inspection.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return success_response(data={
        "inspections": [i.to_dict() for i in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
        "current_page": page,
    })


# ── Approve ───────────────────────────────────────────────────────────────────
@admin_bp.route("/approve/<int:inspection_id>", methods=["POST"])
@jwt_required()
def approve(inspection_id):
    _, err = _require_admin()
    if err:
        return err

    inspection = Inspection.query.get(inspection_id)
    if not inspection:
        return error_response("Inspection not found.", 404)
    if inspection.status != "Pending":
        return error_response(f"Inspection is already {inspection.status}.", 400)

    data = request.get_json(silent=True) or {}
    admin_decision = data.get("admin_decision")

    inspection.status = "Approved"
    if admin_decision and admin_decision != inspection.ai_prediction:
        inspection.admin_correction = admin_decision
        inspection.is_correction = True
    else:
        inspection.admin_correction = inspection.ai_prediction

    # Notify worker
    product_name = inspection.product.product_name if inspection.product else ""
    create_notification(
        user_id=inspection.worker_id,
        inspection_id=inspection.id,
        ntype="approved",
        product_name=product_name,
    )
    db.session.commit()
    return success_response(data=inspection.to_dict(), message="Inspection approved.")


# ── Reject ────────────────────────────────────────────────────────────────────
@admin_bp.route("/reject/<int:inspection_id>", methods=["POST"])
@jwt_required()
def reject(inspection_id):
    _, err = _require_admin()
    if err:
        return err

    inspection = Inspection.query.get(inspection_id)
    if not inspection:
        return error_response("Inspection not found.", 404)
    if inspection.status != "Pending":
        return error_response(f"Inspection is already {inspection.status}.", 400)

    data = request.get_json(silent=True) or {}
    reject_reason = data.get("reject_reason", "").strip()

    if not reject_reason:
        return error_response("Reject reason is required.", 400)
    if reject_reason not in REJECT_REASONS:
        return error_response(
            f"Invalid reject reason. Choose from: {', '.join(REJECT_REASONS)}", 400
        )

    inspection.status = "Rejected"
    inspection.reject_reason = reject_reason
    inspection.admin_correction = "rejected"
    inspection.is_correction = True

    # Notify worker
    product_name = inspection.product.product_name if inspection.product else ""
    create_notification(
        user_id=inspection.worker_id,
        inspection_id=inspection.id,
        ntype="rejected",
        product_name=product_name,
        reject_reason=reject_reason,
    )
    db.session.commit()
    return success_response(data=inspection.to_dict(), message="Inspection rejected.")


# ── Worker Management ─────────────────────────────────────────────────────────
@admin_bp.route("/workers", methods=["GET"])
@jwt_required()
def list_workers():
    _, err = _require_admin()
    if err:
        return err
    workers = User.query.filter_by(role="Worker").order_by(User.created_at.desc()).all()
    result = []
    for w in workers:
        total = Inspection.query.filter_by(worker_id=w.id).count()
        approved = Inspection.query.filter_by(worker_id=w.id, status="Approved").count()
        result.append({
            **w.to_dict(),
            "total_inspections": total,
            "approved_inspections": approved,
            "approval_rate": round(approved / total * 100, 1) if total else 0.0,
        })
    return success_response(data=result)


@admin_bp.route("/workers", methods=["POST"])
@jwt_required()
def create_worker():
    _, err = _require_admin()
    if err:
        return err
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()
    department = data.get("department", "").strip()

    if not name or not email or not password:
        return error_response("name, email, and password are required.", 400)
    if User.query.filter_by(email=email).first():
        return error_response("Email already exists.", 409)

    worker = User(name=name, email=email, role="Worker", department=department or None)
    worker.set_password(password)
    db.session.add(worker)
    db.session.commit()
    return success_response(data=worker.to_dict(), message="Worker created.", status_code=201)


@admin_bp.route("/workers/<int:worker_id>", methods=["PUT"])
@jwt_required()
def update_worker(worker_id):
    _, err = _require_admin()
    if err:
        return err
    worker = User.query.get(worker_id)
    if not worker or worker.role != "Worker":
        return error_response("Worker not found.", 404)

    data = request.get_json(silent=True) or {}
    if "name" in data:
        worker.name = data["name"].strip()
    if "department" in data:
        worker.department = data["department"].strip() or None
    if "is_active" in data:
        worker.is_active = bool(data["is_active"])
    if "password" in data and data["password"]:
        worker.set_password(data["password"])

    db.session.commit()
    return success_response(data=worker.to_dict(), message="Worker updated.")


@admin_bp.route("/workers/<int:worker_id>", methods=["DELETE"])
@jwt_required()
def deactivate_worker(worker_id):
    _, err = _require_admin()
    if err:
        return err
    worker = User.query.get(worker_id)
    if not worker or worker.role != "Worker":
        return error_response("Worker not found.", 404)
    worker.is_active = False
    db.session.commit()
    return success_response(message="Worker deactivated.")


# ── Worker Performance ────────────────────────────────────────────────────────
@admin_bp.route("/worker-performance", methods=["GET"])
@jwt_required()
def worker_performance():
    _, err = _require_admin()
    if err:
        return err
    return success_response(data=get_worker_performance())


# ── Recommendation config ─────────────────────────────────────────────────────
@admin_bp.route("/recommendations", methods=["GET"])
@jwt_required()
def get_recommendations():
    _, err = _require_admin()
    if err:
        return err
    configs = RecommendationConfig.query.all()
    return success_response(data=[c.to_dict() for c in configs])


@admin_bp.route("/recommendations/<int:config_id>", methods=["PUT"])
@jwt_required()
def update_recommendation(config_id):
    _, err = _require_admin()
    if err:
        return err
    cfg = RecommendationConfig.query.get(config_id)
    if not cfg:
        return error_response("Config not found.", 404)
    data = request.get_json(silent=True) or {}
    if "recommendation" in data:
        cfg.recommendation = data["recommendation"].strip()
    if "severity" in data:
        cfg.severity = data["severity"].strip()
    db.session.commit()
    return success_response(data=cfg.to_dict(), message="Recommendation updated.")


# ── Pattern Alerts ────────────────────────────────────────────────────────────
@admin_bp.route("/pattern-alerts", methods=["GET"])
@jwt_required()
def pattern_alerts():
    _, err = _require_admin()
    if err:
        return err
    # Run detection then return
    alerts = detect_manufacturing_patterns()
    return success_response(data=alerts)


@admin_bp.route("/pattern-alerts/<int:alert_id>/resolve", methods=["POST"])
@jwt_required()
def resolve_pattern_alert(alert_id):
    _, err = _require_admin()
    if err:
        return err
    pa = PatternAlert.query.get(alert_id)
    if not pa:
        return error_response("Pattern alert not found.", 404)
    pa.is_resolved = True
    db.session.commit()
    return success_response(message="Pattern alert resolved.")


# ── Alerts ────────────────────────────────────────────────────────────────────
@admin_bp.route("/alerts", methods=["GET"])
@jwt_required()
def get_alerts():
    _, err = _require_admin()
    if err:
        return err
    alerts = Alert.query.order_by(Alert.created_at.desc()).limit(50).all()
    return success_response(data=[a.to_dict() for a in alerts])


@admin_bp.route("/alerts/mark-read", methods=["POST"])
@jwt_required()
def mark_alerts_read():
    _, err = _require_admin()
    if err:
        return err
    Alert.query.update({"is_read": True})
    db.session.commit()
    return success_response(message="All alerts marked as read.")


# ── Reports / PDF ─────────────────────────────────────────────────────────────
@admin_bp.route("/report/<int:inspection_id>", methods=["GET"])
@jwt_required()
def download_report(inspection_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    inspection = Inspection.query.get(inspection_id)
    if not inspection:
        return error_response("Inspection not found.", 404)

    # Workers can only download their own reports
    if user.role == "Worker" and inspection.worker_id != user_id:
        return error_response("Forbidden.", 403)

    from flask import current_app
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    pdf_bytes = generate_inspection_pdf(inspection, upload_folder)

    # Detect content type
    if pdf_bytes[:4] == b"%PDF":
        mimetype = "application/pdf"
        ext = "pdf"
    else:
        mimetype = "text/plain"
        ext = "txt"

    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype=mimetype,
        as_attachment=True,
        download_name=f"VisionGuard_Report_{inspection_id}.{ext}",
    )


# ── Timeline ──────────────────────────────────────────────────────────────────
@admin_bp.route("/timeline/<int:product_id>", methods=["GET"])
@jwt_required()
def timeline(product_id):
    _, err = _require_admin()
    if err:
        return err
    return success_response(data=get_inspection_timeline(product_id))


# ── Reject reasons ────────────────────────────────────────────────────────────
@admin_bp.route("/reject-reasons", methods=["GET"])
@jwt_required()
def reject_reasons():
    return success_response(data=REJECT_REASONS)


# ── AI Accuracy ───────────────────────────────────────────────────────────────
@admin_bp.route("/ai-accuracy", methods=["GET"])
@jwt_required()
def ai_accuracy():
    _, err = _require_admin()
    if err:
        return err
    return success_response(data={
        **get_human_validation_stats(),
        "correction_history": get_correction_history(30),
    })
