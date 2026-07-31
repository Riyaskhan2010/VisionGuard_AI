from database import db
from datetime import datetime


class Alert(db.Model):
    __tablename__ = "alerts"

    id = db.Column(db.Integer, primary_key=True)
    alert_type = db.Column(db.String(50), nullable=False)   # recurring | critical | high_reject
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True)
    inspection_id = db.Column(db.Integer, db.ForeignKey("inspections.id"), nullable=True)
    message = db.Column(db.String(500), nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    product = db.relationship("Product", backref="alerts", lazy=True)
    inspection = db.relationship("Inspection", backref="alerts", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "alert_type": self.alert_type,
            "product_id": self.product_id,
            "product": self.product.to_dict() if self.product else None,
            "inspection_id": self.inspection_id,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat(),
        }
