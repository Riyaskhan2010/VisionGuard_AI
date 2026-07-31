"""Notification service — create and fetch worker notifications."""
from database import db
from models.notification import Notification


TITLES = {
    "approved":    "✅ Inspection Approved",
    "rejected":    "❌ Inspection Rejected",
    "reinspection": "🔄 Re-inspection Required",
}

MESSAGES = {
    "approved":    "Your inspection #{id} for {product} has been approved.",
    "rejected":    "Your inspection #{id} for {product} was rejected. Reason: {reason}. Please re-inspect.",
    "reinspection": "Inspection #{id} for {product} requires re-inspection. Reason: {reason}.",
}


def create_notification(user_id: int, inspection_id: int, ntype: str,
                        product_name: str = "", reject_reason: str = ""):
    title = TITLES.get(ntype, "Notification")
    msg_template = MESSAGES.get(ntype, "Update on inspection #{id}.")
    message = msg_template.format(
        id=inspection_id,
        product=product_name,
        reason=reject_reason or "N/A",
    )
    n = Notification(
        user_id=user_id,
        inspection_id=inspection_id,
        type=ntype,
        title=title,
        message=message,
    )
    db.session.add(n)
    # Don't commit here — caller commits


def get_unread_count(user_id: int) -> int:
    return Notification.query.filter_by(user_id=user_id, is_read=False).count()


def mark_all_read(user_id: int):
    (Notification.query
     .filter_by(user_id=user_id, is_read=False)
     .update({"is_read": True}))
    db.session.commit()
