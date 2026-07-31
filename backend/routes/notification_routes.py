from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import db
from models.notification import Notification
from utils.helpers import success_response, error_response

notification_bp = Blueprint("notification", __name__, url_prefix="/api/notifications")


@notification_bp.route("/", methods=["GET"])
@jwt_required()
def get_notifications():
    user_id = int(get_jwt_identity())
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))

    paginated = (Notification.query
                 .filter_by(user_id=user_id)
                 .order_by(Notification.created_at.desc())
                 .paginate(page=page, per_page=per_page, error_out=False))

    unread = Notification.query.filter_by(user_id=user_id, is_read=False).count()

    return success_response(data={
        "notifications": [n.to_dict() for n in paginated.items],
        "total": paginated.total,
        "unread": unread,
        "pages": paginated.pages,
        "current_page": page,
    })


@notification_bp.route("/unread-count", methods=["GET"])
@jwt_required()
def unread_count():
    user_id = int(get_jwt_identity())
    count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return success_response(data={"unread": count})


@notification_bp.route("/mark-read", methods=["POST"])
@jwt_required()
def mark_all_read():
    user_id = int(get_jwt_identity())
    Notification.query.filter_by(user_id=user_id, is_read=False).update({"is_read": True})
    db.session.commit()
    return success_response(message="All notifications marked as read.")


@notification_bp.route("/<int:notif_id>/read", methods=["POST"])
@jwt_required()
def mark_one_read(notif_id):
    user_id = int(get_jwt_identity())
    n = Notification.query.filter_by(id=notif_id, user_id=user_id).first()
    if not n:
        return error_response("Notification not found.", 404)
    n.is_read = True
    db.session.commit()
    return success_response(data=n.to_dict())
