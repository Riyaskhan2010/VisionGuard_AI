from database import db
from datetime import datetime


class RecommendationConfig(db.Model):
    """Admin-editable recommendation rules per defect type."""
    __tablename__ = "recommendation_configs"

    id = db.Column(db.Integer, primary_key=True)
    defect_type = db.Column(db.String(100), unique=True, nullable=False)
    severity = db.Column(db.String(50), nullable=False)
    recommendation = db.Column(db.String(300), nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "defect_type": self.defect_type,
            "severity": self.severity,
            "recommendation": self.recommendation,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
