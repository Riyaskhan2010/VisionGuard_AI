from flask import Blueprint, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import User, Product
from database import db
from utils.helpers import success_response, error_response

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "")

    if not email or not password:
        return error_response("Email and password are required.", 400)

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return error_response("Invalid email or password.", 401)
    if not user.is_active:
        return error_response("Account is deactivated. Contact admin.", 403)
    if role and user.role != role:
        return error_response(f"This account is not registered as {role}.", 403)

    token = create_access_token(identity=str(user.id))
    return success_response(
        data={"token": token, "user": user.to_dict()},
        message="Login successful.",
    )


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return error_response("User not found.", 404)
    return success_response(data=user.to_dict())


@auth_bp.route("/users", methods=["GET"])
@jwt_required()
def list_users():
    user_id = int(get_jwt_identity())
    current = User.query.get(user_id)
    if not current or current.role != "Admin":
        return error_response("Forbidden.", 403)
    users = User.query.order_by(User.created_at.desc()).all()
    return success_response(data=[u.to_dict() for u in users])


@auth_bp.route("/products", methods=["GET"])
@jwt_required()
def list_products():
    products = Product.query.order_by(Product.product_name).all()
    return success_response(data=[p.to_dict() for p in products])


@auth_bp.route("/products", methods=["POST"])
@jwt_required()
def create_product():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != "Admin":
        return error_response("Forbidden.", 403)
    data = request.get_json(silent=True) or {}
    pid = data.get("product_id", "").strip()
    pname = data.get("product_name", "").strip()
    if not pid or not pname:
        return error_response("product_id and product_name are required.", 400)
    if Product.query.filter_by(product_id=pid).first():
        return error_response("Product ID already exists.", 409)
    p = Product(product_id=pid, product_name=pname)
    db.session.add(p)
    db.session.commit()
    return success_response(data=p.to_dict(), message="Product created.", status_code=201)
