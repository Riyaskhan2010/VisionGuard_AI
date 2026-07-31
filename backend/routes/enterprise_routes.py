"""
Enterprise routes — recommendation engine, factory overview,
QR traceability, report center, predictive analytics, health KPIs.
"""
import io
import json
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from database import db
from models import User, Product, Inspection, Alert
from models.factory_zone import FactoryZone
from services.recommendation_service import get_recommendation
from services.analytics_service import (
    get_dashboard_summary, get_worker_performance,
    get_defect_distribution, get_recurring_defects,
)
from utils.helpers import success_response, error_response

enterprise_bp = Blueprint("enterprise", __name__, url_prefix="/api/enterprise")


def _get_current_user():
    uid = int(get_jwt_identity())
    return User.query.get(uid)


# ── AI Recommendation ─────────────────────────────────────────────────────────

@enterprise_bp.route("/recommendation/<int:inspection_id>", methods=["GET"])
@jwt_required()
def recommendation(inspection_id):
    inspection = Inspection.query.get(inspection_id)
    if not inspection:
        return error_response("Inspection not found.", 404)

    user = _get_current_user()
    if user.role == "Worker" and inspection.worker_id != user.id:
        return error_response("Forbidden.", 403)

    rec = get_recommendation(
        defect=inspection.defect or "none",
        confidence=inspection.confidence or 0.0,
        is_recurring=inspection.is_recurring,
        recurrence_count=inspection.recurrence_count or 0,
    )
    return success_response(data=rec)


# ── Factory Overview ──────────────────────────────────────────────────────────

@enterprise_bp.route("/factory-zones", methods=["GET"])
@jwt_required()
def factory_zones():
    zones = FactoryZone.query.filter_by(is_active=True).order_by(FactoryZone.sort_order).all()
    result = []
    for z in zones:
        # Get products in this zone (products whose department matches zone name)
        # We use product_id prefix or all products and distribute evenly for demo
        total_ins = Inspection.query.count()

        # Stats per zone — distribute based on zone sort_order for realistic demo
        zone_inspections = (
            Inspection.query
            .join(Product, Inspection.product_id == Product.id)
            .filter(Product.product_name.ilike(f"%{z.name.split()[0]}%"))
            .all()
        )

        if not zone_inspections:
            # fallback: split all inspections evenly across zones
            all_ids = [i.id for i in Inspection.query.order_by(Inspection.id).all()]
            chunk = max(1, len(all_ids) // max(1, FactoryZone.query.count()))
            start = z.sort_order * chunk
            zone_ids = all_ids[start: start + chunk]
            zone_inspections = Inspection.query.filter(Inspection.id.in_(zone_ids)).all() if zone_ids else []

        total = len(zone_inspections)
        pending = sum(1 for i in zone_inspections if i.status == "Pending")
        critical = sum(1 for i in zone_inspections if i.severity == "Critical")
        approved = sum(1 for i in zone_inspections if i.status == "Approved")

        scores = [i.quality_score for i in zone_inspections if i.quality_score is not None]
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

        # Zone health status
        if critical > 0 or (total > 0 and pending / max(total, 1) > 0.5):
            health = "Critical"
        elif pending > 0 or avg_score < 70:
            health = "Warning"
        else:
            health = "Healthy"

        result.append({
            **z.to_dict(),
            "total_inspections": total,
            "pending": pending,
            "critical_defects": critical,
            "approved": approved,
            "avg_quality_score": avg_score,
            "health_status": health,
        })

    return success_response(data=result)


@enterprise_bp.route("/factory-zones/<int:zone_id>/detail", methods=["GET"])
@jwt_required()
def zone_detail(zone_id):
    zone = FactoryZone.query.get(zone_id)
    if not zone:
        return error_response("Zone not found.", 404)

    recent = (
        Inspection.query
        .order_by(Inspection.created_at.desc())
        .limit(10)
        .all()
    )
    return success_response(data={
        "zone": zone.to_dict(),
        "recent_inspections": [i.to_dict() for i in recent],
    })


# ── QR Traceability ───────────────────────────────────────────────────────────

@enterprise_bp.route("/traceability/<string:product_id_str>", methods=["GET"])
@jwt_required()
def traceability(product_id_str):
    product = Product.query.filter_by(product_id=product_id_str).first()
    if not product:
        # Try by numeric DB id
        try:
            product = Product.query.get(int(product_id_str))
        except (ValueError, TypeError):
            pass
    if not product:
        return error_response("Product not found.", 404)

    inspections = (
        Inspection.query
        .filter_by(product_id=product.id)
        .order_by(Inspection.created_at.desc())
        .all()
    )

    defect_summary = {}
    for ins in inspections:
        d = ins.defect or "none"
        defect_summary[d] = defect_summary.get(d, 0) + 1

    total = len(inspections)
    approved = sum(1 for i in inspections if i.status == "Approved")
    rejected = sum(1 for i in inspections if i.status == "Rejected")
    scores = [i.quality_score for i in inspections if i.quality_score is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    return success_response(data={
        "product": product.to_dict(),
        "inspections": [i.to_dict() for i in inspections],
        "summary": {
            "total": total,
            "approved": approved,
            "rejected": rejected,
            "pending": total - approved - rejected,
            "avg_quality_score": avg_score,
            "defect_summary": defect_summary,
        },
    })


# ── Factory Health KPIs ───────────────────────────────────────────────────────

@enterprise_bp.route("/factory-health", methods=["GET"])
@jwt_required()
def factory_health():
    summary = get_dashboard_summary()
    total = summary["total"]
    approved = summary["approved"]
    rejected = summary["rejected"]
    pending = summary["pending"]

    # Today stats
    today = datetime.utcnow().date()
    today_total = (
        Inspection.query
        .filter(func.date(Inspection.created_at) == today)
        .count()
    )
    today_approved = (
        Inspection.query
        .filter(func.date(Inspection.created_at) == today, Inspection.status == "Approved")
        .count()
    )

    # Quality score avg
    avg_score = db.session.query(func.avg(Inspection.quality_score)).scalar() or 0
    avg_score = round(float(avg_score), 1)

    # Inspection completion rate (approved / total)
    completion_rate = round((approved / total * 100), 1) if total > 0 else 0.0

    # Worker productivity (avg inspections per active worker per day — last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_count = Inspection.query.filter(Inspection.created_at >= seven_days_ago).count()
    active_workers = User.query.filter_by(role="Worker", is_active=True).count()
    worker_productivity = round(recent_count / max(active_workers, 1) / 7, 1)

    # AI accuracy
    ai_accuracy = summary["ai_accuracy"]

    # Overall factory health score (composite)
    health_score = round(
        (completion_rate * 0.3)
        + (ai_accuracy * 0.3)
        + (avg_score * 0.4)
    , 1)

    # Rejection rate
    reject_rate = round((rejected / total * 100), 1) if total > 0 else 0.0

    return success_response(data={
        "overall_health_score": min(health_score, 100),
        "today_quality_score": avg_score,
        "ai_accuracy": ai_accuracy,
        "inspection_completion_rate": completion_rate,
        "worker_productivity": worker_productivity,
        "rejection_rate": reject_rate,
        "total_inspections": total,
        "today_inspections": today_total,
        "today_approved": today_approved,
        "active_workers": active_workers,
        "pending_reviews": pending,
        "avg_quality_score": avg_score,
    })


# ── Predictive Analytics ──────────────────────────────────────────────────────

@enterprise_bp.route("/predictive", methods=["GET"])
@jwt_required()
def predictive_analytics():
    # Last 7-day average to project next week
    seven_ago = datetime.utcnow() - timedelta(days=7)
    fourteen_ago = datetime.utcnow() - timedelta(days=14)

    last7 = Inspection.query.filter(Inspection.created_at >= seven_ago).count()
    prev7 = Inspection.query.filter(
        Inspection.created_at >= fourteen_ago,
        Inspection.created_at < seven_ago
    ).count()

    trend_pct = round(((last7 - prev7) / max(prev7, 1)) * 100, 1)

    # Predict next week
    expected_next_week = round(last7 * 1.05) if trend_pct >= 0 else round(last7 * 0.97)

    # Critical defect risk
    recent_critical = Inspection.query.filter(
        Inspection.created_at >= seven_ago,
        Inspection.severity == "Critical"
    ).count()
    failure_risk = "High" if recent_critical >= 3 else "Medium" if recent_critical >= 1 else "Low"
    failure_risk_pct = min(95, recent_critical * 20 + 10)

    # Quality trend
    avg_now = db.session.query(func.avg(Inspection.quality_score)).filter(
        Inspection.created_at >= seven_ago
    ).scalar() or 0
    avg_prev = db.session.query(func.avg(Inspection.quality_score)).filter(
        Inspection.created_at >= fourteen_ago,
        Inspection.created_at < seven_ago
    ).scalar() or 0
    quality_trend = "Improving" if avg_now >= avg_prev else "Declining"
    quality_trend_pct = round(((float(avg_now) - float(avg_prev)) / max(float(avg_prev), 1)) * 100, 1)

    # Monthly forecast
    daily_avg = last7 / 7
    monthly_forecast = round(daily_avg * 30)

    # Top recurring defect
    recurring = get_recurring_defects()
    top_recurring = recurring[0] if recurring else None

    # Most problematic product
    rows = (
        db.session.query(Inspection.product_id, func.count(Inspection.id).label("c"))
        .filter(Inspection.severity == "Critical")
        .group_by(Inspection.product_id)
        .order_by(func.count(Inspection.id).desc())
        .first()
    )
    most_problematic = None
    if rows:
        p = Product.query.get(rows[0])
        most_problematic = {"product_name": p.product_name if p else "Unknown", "critical_count": rows[1]}

    # Preventive maintenance schedule
    maintenance_schedule = [
        {"task": "Full line inspection", "due": "Next Monday", "priority": "High"},
        {"task": "Sensor calibration",   "due": "Next Wednesday", "priority": "Medium"},
        {"task": "Tool wear check",      "due": "Next Friday",   "priority": "Medium"},
        {"task": "AI model accuracy review", "due": "End of month", "priority": "Low"},
    ]

    return success_response(data={
        "expected_next_week": expected_next_week,
        "trend_pct": trend_pct,
        "failure_risk": failure_risk,
        "failure_risk_pct": failure_risk_pct,
        "quality_trend": quality_trend,
        "quality_trend_pct": quality_trend_pct,
        "monthly_forecast": monthly_forecast,
        "top_recurring_defect": top_recurring,
        "most_problematic_product": most_problematic,
        "maintenance_schedule": maintenance_schedule,
    })


# ── AI Assistant ──────────────────────────────────────────────────────────────

@enterprise_bp.route("/assistant", methods=["POST"])
@jwt_required()
def ai_assistant():
    data = request.get_json(silent=True) or {}
    query = data.get("query", "").strip().lower()

    if not query:
        return error_response("Query is required.", 400)

    today = datetime.utcnow().date()
    response_text = ""
    response_data = None

    # Parse intent
    if any(k in query for k in ["today", "inspections today", "how many today"]):
        count = Inspection.query.filter(func.date(Inspection.created_at) == today).count()
        response_text = f"Today's inspections: **{count}** total."
        response_data = {"count": count, "type": "today_count"}

    elif any(k in query for k in ["critical", "critical defect"]):
        rows = Inspection.query.filter_by(severity="Critical").order_by(Inspection.created_at.desc()).limit(5).all()
        response_text = f"Found **{len(rows)}** critical defect inspection(s). Showing latest 5."
        response_data = {"inspections": [i.to_dict() for i in rows], "type": "critical"}

    elif any(k in query for k in ["rejected", "reject"]):
        rows = Inspection.query.filter_by(status="Rejected").order_by(Inspection.created_at.desc()).limit(5).all()
        response_text = f"**{len(rows)}** recent rejected inspection(s)."
        response_data = {"inspections": [i.to_dict() for i in rows], "type": "rejected"}

    elif any(k in query for k in ["pending", "waiting", "review"]):
        count = Inspection.query.filter_by(status="Pending").count()
        response_text = f"**{count}** inspection(s) pending admin review."
        response_data = {"count": count, "type": "pending"}

    elif any(k in query for k in ["worker performance", "worker", "top worker", "best worker", "approval rate"]):
        perf = get_worker_performance()
        if perf:
            top = perf[0]
            response_text = (
                f"Top worker: **{top['worker_name']}** with "
                f"**{top['approval_rate']}%** approval rate "
                f"({top['total']} inspections)."
            )
            response_data = {"workers": perf[:5], "type": "worker_performance"}
        else:
            response_text = "No worker performance data available yet."

    elif any(k in query for k in ["summary", "dashboard", "overview", "total"]):
        s = get_dashboard_summary()
        response_text = (
            f"Platform summary — Total: **{s['total']}** | "
            f"Pending: **{s['pending']}** | "
            f"Approved: **{s['approved']}** | "
            f"Rejected: **{s['rejected']}** | "
            f"AI Accuracy: **{s['ai_accuracy']}%**"
        )
        response_data = {"summary": s, "type": "summary"}

    elif any(k in query for k in ["recurring", "repeat", "repeated"]):
        rec = get_recurring_defects()
        if rec:
            response_text = f"Found **{len(rec)}** recurring defect pattern(s). Most frequent: **{rec[0]['defect']}** on {rec[0]['product_name']} ({rec[0]['count']}×)."
            response_data = {"recurring": rec, "type": "recurring"}
        else:
            response_text = "No recurring defects detected at this time."

    elif any(k in query for k in ["history", "inspection history", "all inspections"]):
        rows = Inspection.query.order_by(Inspection.created_at.desc()).limit(5).all()
        response_text = f"Showing last **{len(rows)}** inspections."
        response_data = {"inspections": [i.to_dict() for i in rows], "type": "history"}

    elif any(k in query for k in ["defect", "defects", "distribution"]):
        dist = get_defect_distribution()
        lines = [f"{d['defect']}: {d['count']}" for d in dist]
        response_text = "Defect distribution — " + " | ".join(lines)
        response_data = {"distribution": dist, "type": "defect_distribution"}

    elif any(k in query for k in ["quality score", "quality", "score"]):
        avg = db.session.query(func.avg(Inspection.quality_score)).scalar() or 0
        response_text = f"Average quality score across all inspections: **{round(float(avg), 1)}/100**"
        response_data = {"avg_score": round(float(avg), 1), "type": "quality"}

    elif any(k in query for k in ["help", "what can", "commands", "options"]):
        response_text = (
            "I can answer: **today's inspections** · **critical defects** · "
            "**rejected products** · **pending reviews** · **worker performance** · "
            "**recurring defects** · **quality score** · **defect distribution** · "
            "**inspection history** · **platform summary**"
        )

    else:
        response_text = (
            "I didn't understand that query. Try: 'How many inspections today?', "
            "'Show critical defects', 'Worker performance', 'Platform summary'."
        )

    return success_response(data={
        "query": query,
        "response": response_text,
        "data": response_data,
        "timestamp": datetime.utcnow().isoformat(),
    })


# ── Report Center ─────────────────────────────────────────────────────────────

@enterprise_bp.route("/reports/summary", methods=["GET"])
@jwt_required()
def report_summary():
    period = request.args.get("period", "daily")  # daily | weekly | monthly

    now = datetime.utcnow()
    if period == "daily":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        label = f"Daily Report — {now.strftime('%Y-%m-%d')}"
    elif period == "weekly":
        start = now - timedelta(days=now.weekday())
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)
        label = f"Weekly Report — Week of {start.strftime('%Y-%m-%d')}"
    else:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        label = f"Monthly Report — {now.strftime('%B %Y')}"

    inspections = Inspection.query.filter(Inspection.created_at >= start).all()
    total = len(inspections)
    approved = sum(1 for i in inspections if i.status == "Approved")
    rejected = sum(1 for i in inspections if i.status == "Rejected")
    pending = total - approved - rejected
    critical = sum(1 for i in inspections if i.severity == "Critical")
    recurring = sum(1 for i in inspections if i.is_recurring)

    defect_dist = {}
    for ins in inspections:
        d = ins.defect or "none"
        defect_dist[d] = defect_dist.get(d, 0) + 1

    scores = [i.quality_score for i in inspections if i.quality_score is not None]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    return success_response(data={
        "label": label,
        "period": period,
        "start_date": start.isoformat(),
        "generated_at": now.isoformat(),
        "total": total,
        "approved": approved,
        "rejected": rejected,
        "pending": pending,
        "critical": critical,
        "recurring": recurring,
        "avg_quality_score": avg_score,
        "defect_distribution": defect_dist,
        "inspections": [i.to_dict() for i in inspections[:50]],
        "worker_performance": get_worker_performance(),
    })


@enterprise_bp.route("/reports/export-csv", methods=["GET"])
@jwt_required()
def export_csv():
    """Export inspections as CSV for Excel."""
    period = request.args.get("period", "all")
    now = datetime.utcnow()

    query = Inspection.query
    if period == "daily":
        query = query.filter(func.date(Inspection.created_at) == now.date())
    elif period == "weekly":
        query = query.filter(Inspection.created_at >= now - timedelta(days=7))
    elif period == "monthly":
        query = query.filter(Inspection.created_at >= now - timedelta(days=30))

    inspections = query.order_by(Inspection.created_at.desc()).all()

    lines = [
        "ID,Product ID,Product Name,Worker,Defect,Confidence,Severity,Quality Score,Status,Reject Reason,Date"
    ]
    for ins in inspections:
        conf = f"{round(ins.confidence * 100, 1)}%" if ins.confidence else "N/A"
        lines.append(",".join([
            str(ins.id),
            ins.product.product_id if ins.product else "",
            f'"{ins.product.product_name if ins.product else ""}"',
            f'"{ins.worker.name if ins.worker else ""}"',
            ins.defect or "none",
            conf,
            ins.severity or "None",
            str(ins.quality_score or ""),
            ins.status or "Pending",
            f'"{ins.reject_reason or ""}"',
            ins.created_at.strftime("%Y-%m-%d %H:%M") if ins.created_at else "",
        ]))

    csv_content = "\n".join(lines)
    buf = io.BytesIO(csv_content.encode("utf-8-sig"))  # BOM for Excel
    filename = f"VisionGuard_Inspections_{period}_{now.strftime('%Y%m%d')}.csv"

    return send_file(buf, mimetype="text/csv", as_attachment=True, download_name=filename)


# ── Global Search ─────────────────────────────────────────────────────────────

@enterprise_bp.route("/search", methods=["GET"])
@jwt_required()
def global_search():
    q = request.args.get("q", "").strip()
    if len(q) < 2:
        return success_response(data={"products": [], "inspections": [], "workers": []})

    products = Product.query.filter(
        (Product.product_id.ilike(f"%{q}%")) |
        (Product.product_name.ilike(f"%{q}%"))
    ).limit(5).all()

    inspections = Inspection.query.filter(
        Inspection.defect.ilike(f"%{q}%")
    ).order_by(Inspection.created_at.desc()).limit(5).all()

    workers = User.query.filter(
        User.role == "Worker",
        (User.name.ilike(f"%{q}%")) | (User.email.ilike(f"%{q}%"))
    ).limit(5).all()

    return success_response(data={
        "query": q,
        "products": [p.to_dict() for p in products],
        "inspections": [i.to_dict() for i in inspections],
        "workers": [w.to_dict() for w in workers],
    })
