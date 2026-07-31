from database import db
from datetime import datetime


class Inspection(db.Model):
    __tablename__ = "inspections"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    worker_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    # Image paths
    original_image = db.Column(db.String(300), nullable=False)
    detected_image = db.Column(db.String(300), nullable=True)

    # AI Results
    defect = db.Column(db.String(100), nullable=True)
    # Possible: crack | scratch | dent | missing_component | surface_damage | burn_mark | none
    confidence = db.Column(db.Float, nullable=True)
    severity = db.Column(db.String(50), nullable=True)        # Critical | Medium | Low | None
    recommendation = db.Column(db.String(300), nullable=True)
    bounding_box = db.Column(db.Text, nullable=True)          # JSON string of box list
    detection_time_ms = db.Column(db.Float, nullable=True)    # milliseconds

    # Quality Health Score
    quality_score = db.Column(db.Float, nullable=True)        # 0-100
    quality_label = db.Column(db.String(50), nullable=True)   # Excellent | Good | Needs Attention | Poor

    # Admin decision
    status = db.Column(db.String(50), default="Pending")      # Pending | Approved | Rejected
    reject_reason = db.Column(db.String(200), nullable=True)

    # Human Validation tracking
    ai_prediction = db.Column(db.String(100), nullable=True)
    admin_correction = db.Column(db.String(100), nullable=True)
    is_correction = db.Column(db.Boolean, default=False)

    # Recurring / Pattern flags
    is_recurring = db.Column(db.Boolean, default=False)
    recurrence_count = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product": self.product.to_dict() if self.product else None,
            "worker_id": self.worker_id,
            "worker": self.worker.to_dict() if self.worker else None,
            "original_image": self.original_image,
            "detected_image": self.detected_image,
            "defect": self.defect,
            "confidence": self.confidence,
            "severity": self.severity,
            "recommendation": self.recommendation,
            "bounding_box": self.bounding_box,
            "detection_time_ms": self.detection_time_ms,
            "quality_score": self.quality_score,
            "quality_label": self.quality_label,
            "status": self.status,
            "reject_reason": self.reject_reason,
            "ai_prediction": self.ai_prediction,
            "admin_correction": self.admin_correction,
            "is_correction": self.is_correction,
            "is_recurring": self.is_recurring,
            "recurrence_count": self.recurrence_count,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
