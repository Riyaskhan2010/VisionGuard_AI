from database import db
from datetime import datetime


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.String(50), unique=True, nullable=False)
    product_name = db.Column(db.String(150), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    inspections = db.relationship("Inspection", backref="product", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product_name,
            "created_at": self.created_at.isoformat(),
        }
