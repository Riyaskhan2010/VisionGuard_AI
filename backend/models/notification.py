from database import db
from datetime import datetime


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    inspection_id = db.Column(db.Integer, db.ForeignKey("inspections.id"), nullable=True)
    type = db.Column(db.String(50), nullable=False)   # approved | rejected | reinspection
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.String(500), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="notifications", lazy=True)
    inspection = db.relationship("Inspection", backref="notifications", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "inspection_id": self.inspection_id,
            "type": self.type,
            "title": self.title,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat(),
        }
