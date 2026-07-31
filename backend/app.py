import os
from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_cors import CORS

from config import Config
from database import db


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Extensions
    db.init_app(app)
    JWTManager(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    # Blueprints
    from routes.auth_routes import auth_bp
    from routes.inspection_routes import inspection_bp
    from routes.admin_routes import admin_bp
    from routes.notification_routes import notification_bp
    from routes.enterprise_routes import enterprise_bp
    from routes.analysis_routes import analysis_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(inspection_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(notification_bp)
    app.register_blueprint(enterprise_bp)
    app.register_blueprint(analysis_bp)

    # DB init
    with app.app_context():
        from models import User, Product, Inspection, Alert  # noqa
        from models.notification import Notification          # noqa
        from models.pattern_alert import PatternAlert         # noqa
        from models.recommendation_config import RecommendationConfig  # noqa
        from models.factory_zone import FactoryZone           # noqa
        db.create_all()
        _seed_initial_data()

    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "message": "Resource not found."}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"success": False, "message": "Method not allowed."}), 405

    @app.errorhandler(413)
    def file_too_large(e):
        return jsonify({"success": False, "message": "File too large. Max 16 MB."}), 413

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"success": False, "message": "Internal server error."}), 500

    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "VisionGuard AI Backend v2"})

    return app


def _seed_initial_data():
    from models import User, Product
    from models.recommendation_config import RecommendationConfig

    # Admin
    if not User.query.filter_by(email="mriyaskhan254@gmail.com").first():
        admin = User(name="Mohamed Riyas", email="mriyaskhan254@gmail.com",
                     role="Admin")
        admin.set_password("riyas@2010")
        db.session.add(admin)
    # Remove old default admin if exists
    old_admin = User.query.filter_by(email="admin@visionguard.com").first()
    if old_admin:
        db.session.delete(old_admin)

    # Worker 1
    if not User.query.filter_by(email="rx.santhosh888@gmail.com").first():
        worker = User(name="Santhosh", email="rx.santhosh888@gmail.com",
                      role="Worker", department="Assembly Line A")
        worker.set_password("santhosh@5831")
        db.session.add(worker)
    # Remove old default worker if exists
    old_worker = User.query.filter_by(email="worker@visionguard.com").first()
    if old_worker:
        db.session.delete(old_worker)

    # Extra workers for demo
    extra_workers = [
        ("Sarah Chen", "sarah@visionguard.com", "Welding Unit B"),
        ("Raj Patel", "raj@visionguard.com", "Final QC"),
    ]
    for name, email, dept in extra_workers:
        if not User.query.filter_by(email=email).first():
            w = User(name=name, email=email, role="Worker", department=dept)
            w.set_password("worker123")
            db.session.add(w)

    # Products
    products = [
        ("PRD-001", "Steel Bearing"),
        ("PRD-002", "Aluminium Shaft"),
        ("PRD-003", "Plastic Casing"),
        ("PRD-004", "Rubber Gasket"),
        ("PRD-005", "Gear Assembly"),
        ("PRD-006", "Drive Belt"),
        ("PRD-007", "Valve Body"),
    ]
    for pid, pname in products:
        if not Product.query.filter_by(product_id=pid).first():
            db.session.add(Product(product_id=pid, product_name=pname))

    # Recommendation configs
    default_configs = [
        ("crack",             "Critical", "Replace Product"),
        ("scratch",           "Medium",   "Polish Surface"),
        ("dent",              "Low",      "Rework Product"),
        ("missing_component", "Critical", "Reject Product — Missing Component"),
        ("surface_damage",    "Medium",   "Apply Surface Treatment"),
        ("burn_mark",         "Critical", "Reject and Investigate Cause"),
        ("none",              "None",     "No Action Required"),
    ]
    for defect, severity, recommendation in default_configs:
        if not RecommendationConfig.query.filter_by(defect_type=defect).first():
            db.session.add(RecommendationConfig(
                defect_type=defect,
                severity=severity,
                recommendation=recommendation,
            ))

    # Factory zones
    from models.factory_zone import FactoryZone
    default_zones = [
        ("Assembly Line A",  "Primary component assembly station",      "Settings2",  0),
        ("Welding Unit B",   "Metal welding and joining operations",     "Zap",        1),
        ("Painting Unit",    "Surface coating and finishing",            "Paintbrush", 2),
        ("Quality Control",  "Final QC inspection and testing",          "ShieldCheck",3),
        ("Packaging",        "Product packaging and labelling",          "Package",    4),
        ("Warehouse",        "Finished goods storage and dispatch",      "Warehouse",  5),
    ]
    for name, desc, icon, order in default_zones:
        if not FactoryZone.query.filter_by(name=name).first():
            db.session.add(FactoryZone(name=name, description=desc, icon=icon, sort_order=order))

    db.session.commit()


if __name__ == "__main__":
    application = create_app()
    application.run(host="0.0.0.0", port=5000, debug=True)

# For gunicorn: gunicorn "app:create_app()"
app = create_app()
