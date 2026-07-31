"""
Enhanced Analytics Service
- Dashboard summary
- Severity / defect distribution
- Daily / weekly / monthly trends
- Worker performance
- AI accuracy
- Pattern detection
- Recurring defects
- Inspection timeline
"""
import json
from datetime import datetime, timedelta
from sqlalchemy import func
from database import db
from models import Inspection, Alert, Product, User, PatternAlert


# ── KPI Summary ───────────────────────────────────────────────────────────────
def get_dashboard_summary():
    total = Inspection.query.count()
    pending = Inspection.query.filter_by(status="Pending").count()
    approved = Inspection.query.filter_by(status="Approved").count()
    rejected = Inspection.query.filter_by(status="Rejected").count()
    critical = Inspection.query.filter_by(severity="Critical").count()
    recurring = Inspection.query.filter_by(is_recurring=True).count()
    unread_alerts = Alert.query.filter_by(is_read=False).count()

    # AI accuracy
    total_reviewed = Inspection.query.filter(Inspection.ai_prediction.isnot(None)).count()
    corrections = Inspection.query.filter_by(is_correction=True).count()
    ai_accuracy = round(((total_reviewed - corrections) / total_reviewed * 100), 1) if total_reviewed > 0 else 0.0

    # Avg quality score
    avg_score = db.session.query(func.avg(Inspection.quality_score)).scalar()

    return {
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "critical": critical,
        "recurring": recurring,
        "unread_alerts": unread_alerts,
        "ai_accuracy": ai_accuracy,
        "avg_quality_score": round(avg_score, 1) if avg_score else 0.0,
    }


# ── Distributions ─────────────────────────────────────────────────────────────
def get_severity_distribution():
    rows = (db.session.query(Inspection.severity, func.count(Inspection.id))
            .group_by(Inspection.severity).all())
    return [{"severity": r[0] or "Unknown", "count": r[1]} for r in rows]


def get_defect_distribution():
    rows = (db.session.query(Inspection.defect, func.count(Inspection.id))
            .group_by(Inspection.defect).all())
    return [{"defect": r[0] or "none", "count": r[1]} for r in rows]


# ── Trends ────────────────────────────────────────────────────────────────────
def _trend_query(days: int):
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = (db.session.query(
                func.date(Inspection.created_at).label("day"),
                func.count(Inspection.id).label("count"),
            )
            .filter(Inspection.created_at >= cutoff)
            .group_by(func.date(Inspection.created_at))
            .order_by(func.date(Inspection.created_at))
            .all())
    return [{"date": str(r.day), "count": r.count} for r in rows]


def get_daily_trend():
    return _trend_query(14)


def get_weekly_trend():
    """Group by ISO week for the last 12 weeks."""
    cutoff = datetime.utcnow() - timedelta(weeks=12)
    rows = (db.session.query(
                func.strftime("%Y-W%W", Inspection.created_at).label("week"),
                func.count(Inspection.id).label("count"),
            )
            .filter(Inspection.created_at >= cutoff)
            .group_by(func.strftime("%Y-W%W", Inspection.created_at))
            .order_by(func.strftime("%Y-W%W", Inspection.created_at))
            .all())
    return [{"week": r.week, "count": r.count} for r in rows]


def get_monthly_trend():
    """Group by month for the last 12 months."""
    cutoff = datetime.utcnow() - timedelta(days=365)
    rows = (db.session.query(
                func.strftime("%Y-%m", Inspection.created_at).label("month"),
                func.count(Inspection.id).label("count"),
            )
            .filter(Inspection.created_at >= cutoff)
            .group_by(func.strftime("%Y-%m", Inspection.created_at))
            .order_by(func.strftime("%Y-%m", Inspection.created_at))
            .all())
    return [{"month": r.month, "count": r.count} for r in rows]


def get_status_trend(days: int = 14):
    cutoff = datetime.utcnow() - timedelta(days=days)
    rows = (db.session.query(
                func.date(Inspection.created_at).label("day"),
                Inspection.status,
                func.count(Inspection.id).label("count"),
            )
            .filter(Inspection.created_at >= cutoff,
                    Inspection.status.in_(["Approved", "Rejected"]))
            .group_by(func.date(Inspection.created_at), Inspection.status)
            .order_by(func.date(Inspection.created_at))
            .all())
    pivot: dict = {}
    for r in rows:
        d = str(r.day)
        if d not in pivot:
            pivot[d] = {"date": d, "Approved": 0, "Rejected": 0}
        pivot[d][r.status] = r.count
    return list(pivot.values())


# ── Worker Performance ────────────────────────────────────────────────────────
def get_worker_performance():
    workers = User.query.filter_by(role="Worker", is_active=True).all()
    result = []
    for w in workers:
        total = Inspection.query.filter_by(worker_id=w.id).count()
        approved = Inspection.query.filter_by(worker_id=w.id, status="Approved").count()
        rejected = Inspection.query.filter_by(worker_id=w.id, status="Rejected").count()
        pending = Inspection.query.filter_by(worker_id=w.id, status="Pending").count()

        approval_rate = round((approved / total * 100), 1) if total > 0 else 0.0
        avg_score = (db.session.query(func.avg(Inspection.quality_score))
                     .filter_by(worker_id=w.id).scalar())

        # Today's inspections
        today = datetime.utcnow().date()
        today_count = (Inspection.query
                       .filter_by(worker_id=w.id)
                       .filter(func.date(Inspection.created_at) == today)
                       .count())

        result.append({
            "worker_id": w.id,
            "worker_name": w.name,
            "department": w.department,
            "total": total,
            "approved": approved,
            "rejected": rejected,
            "pending": pending,
            "approval_rate": approval_rate,
            "avg_quality_score": round(avg_score, 1) if avg_score else 0.0,
            "today_count": today_count,
        })
    result.sort(key=lambda x: x["approval_rate"], reverse=True)
    return result


# ── AI Accuracy ───────────────────────────────────────────────────────────────
def get_human_validation_stats():
    total = Inspection.query.filter(Inspection.ai_prediction.isnot(None)).count()
    corrections = Inspection.query.filter_by(is_correction=True).count()
    accurate = total - corrections
    accuracy_pct = round((accurate / total * 100), 1) if total > 0 else 0.0
    return {
        "total_reviewed": total,
        "ai_accurate": accurate,
        "manual_corrections": corrections,
        "accuracy_percentage": accuracy_pct,
    }


def get_correction_history(limit: int = 30):
    rows = (Inspection.query
            .filter_by(is_correction=True)
            .order_by(Inspection.updated_at.desc())
            .limit(limit)
            .all())
    return [
        {
            "inspection_id": r.id,
            "product": r.product.product_name if r.product else "—",
            "ai_prediction": r.ai_prediction,
            "admin_correction": r.admin_correction,
            "date": r.updated_at.isoformat() if r.updated_at else r.created_at.isoformat(),
        }
        for r in rows
    ]


# ── Recurring Defects ─────────────────────────────────────────────────────────
def get_recurring_defects():
    rows = (db.session.query(
                Inspection.product_id,
                Inspection.defect,
                func.count(Inspection.id).label("count"),
            )
            .filter(Inspection.defect != "none", Inspection.defect.isnot(None))
            .group_by(Inspection.product_id, Inspection.defect)
            .having(func.count(Inspection.id) > 1)
            .all())
    result = []
    for r in rows:
        product = Product.query.get(r.product_id)
        result.append({
            "product_id": r.product_id,
            "product_name": product.product_name if product else "Unknown",
            "defect": r.defect,
            "count": r.count,
        })
    return result


# ── Manufacturing Pattern Detection ──────────────────────────────────────────
PATTERN_THRESHOLD = 3   # how many products need same defect to trigger alert

SUGGESTED_CAUSES = {
    "crack":             ["Machine alignment issue", "Tool wear", "Excessive pressure"],
    "scratch":           ["Conveyor surface damage", "Fixture issue", "Handling process"],
    "dent":              ["Impact during transport", "Fixture misalignment", "Tool pressure"],
    "missing_component": ["Assembly line error", "Supply shortage", "QC gate failure"],
    "surface_damage":    ["Chemical contamination", "Abrasive contact", "Process temperature"],
    "burn_mark":         ["Overheating in process", "Electrical fault", "Friction buildup"],
}

DEFAULT_CAUSES = ["Process variability", "Equipment maintenance required", "Operator training needed"]


def detect_manufacturing_patterns():
    """
    If >= PATTERN_THRESHOLD distinct products show the same defect,
    create/update a PatternAlert. Returns list of active pattern alerts.
    """
    rows = (db.session.query(
                Inspection.defect,
                func.count(func.distinct(Inspection.product_id)).label("product_count"),
            )
            .filter(Inspection.defect != "none", Inspection.defect.isnot(None))
            .group_by(Inspection.defect)
            .having(func.count(func.distinct(Inspection.product_id)) >= PATTERN_THRESHOLD)
            .all())

    for row in rows:
        defect = row.defect
        product_count = row.product_count

        # Get affected product IDs
        product_ids = [r[0] for r in
                       db.session.query(Inspection.product_id)
                       .filter_by(defect=defect)
                       .distinct().all()]

        existing = PatternAlert.query.filter_by(defect_type=defect, is_resolved=False).first()
        causes = SUGGESTED_CAUSES.get(defect, DEFAULT_CAUSES)

        if existing:
            existing.occurrence_count = product_count
            existing.affected_products = json.dumps(product_ids)
            existing.suggested_causes = json.dumps(causes)
        else:
            pa = PatternAlert(
                defect_type=defect,
                affected_products=json.dumps(product_ids),
                occurrence_count=product_count,
                suggested_causes=json.dumps(causes),
            )
            db.session.add(pa)

            # Also create a smart alert
            product_names = []
            for pid in product_ids[:3]:
                p = Product.query.get(pid)
                if p:
                    product_names.append(p.product_name)

            msg = (
                f"Manufacturing pattern detected: '{defect}' found across "
                f"{product_count} products ({', '.join(product_names)}"
                f"{'...' if len(product_ids) > 3 else ''}). "
                f"Suggested causes: {', '.join(causes[:2])}."
            )
            alert = Alert(
                alert_type="manufacturing_pattern",
                message=msg,
            )
            db.session.add(alert)

    db.session.commit()
    return [p.to_dict() for p in PatternAlert.query.filter_by(is_resolved=False).all()]


def get_inspection_timeline(product_id: int):
    inspections = (Inspection.query
                   .filter_by(product_id=product_id)
                   .order_by(Inspection.created_at.asc())
                   .all())
    return [i.to_dict() for i in inspections]


# ── Flag recurring + alerts ───────────────────────────────────────────────────
def check_and_flag_recurring(inspection):
    if not inspection.defect or inspection.defect == "none":
        return

    prior_count = (Inspection.query
                   .filter(
                       Inspection.product_id == inspection.product_id,
                       Inspection.defect == inspection.defect,
                       Inspection.id != inspection.id,
                   ).count())

    if prior_count > 0:
        inspection.is_recurring = True
        inspection.recurrence_count = prior_count + 1
        db.session.flush()

        product = Product.query.get(inspection.product_id)
        pname = product.product_name if product else str(inspection.product_id)
        alert = Alert(
            alert_type="recurring",
            product_id=inspection.product_id,
            inspection_id=inspection.id,
            message=(f"Recurring defect: '{inspection.defect}' on '{pname}' "
                     f"detected {prior_count + 1}× total."),
        )
        db.session.add(alert)

    if inspection.severity == "Critical":
        product = Product.query.get(inspection.product_id)
        pname = product.product_name if product else str(inspection.product_id)
        db.session.add(Alert(
            alert_type="critical",
            product_id=inspection.product_id,
            inspection_id=inspection.id,
            message=f"Critical defect '{inspection.defect}' on '{pname}'.",
        ))

    # High reject rate
    total_p = Inspection.query.filter_by(product_id=inspection.product_id).count()
    rejected_p = Inspection.query.filter_by(product_id=inspection.product_id, status="Rejected").count()
    if total_p >= 3 and rejected_p / total_p > 0.5:
        product = Product.query.get(inspection.product_id)
        pname = product.product_name if product else str(inspection.product_id)
        db.session.add(Alert(
            alert_type="high_reject",
            product_id=inspection.product_id,
            inspection_id=inspection.id,
            message=f"High reject rate (>50%) for product '{pname}'.",
        ))
