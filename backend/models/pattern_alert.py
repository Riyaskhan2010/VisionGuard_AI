from database import db
from datetime import datetime


class PatternAlert(db.Model):
    __tablename__ = "pattern_alerts"

    id = db.Column(db.Integer, primary_key=True)
    defect_type = db.Column(db.String(100), nullable=False)
    affected_products = db.Column(db.Text, nullable=False)   # JSON list of product ids
    occurrence_count = db.Column(db.Integer, default=0)
    suggested_causes = db.Column(db.Text, nullable=True)     # JSON list
    is_resolved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        import json
        return {
            "id": self.id,
            "defect_type": self.defect_type,
            "affected_products": json.loads(self.affected_products or "[]"),
            "occurrence_count": self.occurrence_count,
            "suggested_causes": json.loads(self.suggested_causes or "[]"),
            "is_resolved": self.is_resolved,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
