from database import db
from datetime import datetime


class FactoryZone(db.Model):
    __tablename__ = "factory_zones"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.String(300), nullable=True)
    icon = db.Column(db.String(50), default="Factory")
    sort_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "icon": self.icon,
            "sort_order": self.sort_order,
            "is_active": self.is_active,
        }
