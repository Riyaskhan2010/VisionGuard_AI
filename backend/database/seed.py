"""
Seed script — run once to create default admin + worker accounts and sample products.
Usage: python database/seed.py  (from backend/ directory)
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from database import db
from models import User, Product


def seed():
    app = create_app()
    with app.app_context():
        db.create_all()

        # Admin
        if not User.query.filter_by(email="admin@visionguard.com").first():
            admin = User(name="Admin User", email="admin@visionguard.com", role="Admin")
            admin.set_password("admin123")
            db.session.add(admin)

        # Worker
        if not User.query.filter_by(email="worker@visionguard.com").first():
            worker = User(name="John Worker", email="worker@visionguard.com", role="Worker")
            worker.set_password("worker123")
            db.session.add(worker)

        # Sample products
        products = [
            ("PRD-001", "Steel Bearing"),
            ("PRD-002", "Aluminium Shaft"),
            ("PRD-003", "Plastic Casing"),
            ("PRD-004", "Rubber Gasket"),
            ("PRD-005", "Gear Assembly"),
        ]
        for pid, pname in products:
            if not Product.query.filter_by(product_id=pid).first():
                db.session.add(Product(product_id=pid, product_name=pname))

        db.session.commit()
        print("✅  Database seeded successfully.")
        print("   Admin  → admin@visionguard.com  / admin123")
        print("   Worker → worker@visionguard.com / worker123")


if __name__ == "__main__":
    seed()
