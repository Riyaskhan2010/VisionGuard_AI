"""
Enhanced Detection Service — YOLOv8 + OpenCV fallback
Supports: crack, scratch, dent, missing_component, surface_damage, burn_mark
Includes: quality health score, detection time, bounding boxes
"""
import os
import json
import uuid
import time
import logging
import numpy as np
from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)

# ── Defect config ─────────────────────────────────────────────────────────────
DEFECT_CONFIG = {
    "crack":             {"severity": "Critical", "recommendation": "Replace Product",       "color": (220, 38, 38)},
    "scratch":           {"severity": "Medium",   "recommendation": "Polish Surface",         "color": (234, 179, 8)},
    "dent":              {"severity": "Low",       "recommendation": "Rework Product",         "color": (59, 130, 246)},
    "missing_component": {"severity": "Critical", "recommendation": "Reject Product",         "color": (168, 85, 247)},
    "surface_damage":    {"severity": "Medium",   "recommendation": "Surface Treatment",      "color": (249, 115, 22)},
    "burn_mark":         {"severity": "Critical", "recommendation": "Reject and Investigate", "color": (239, 68, 68)},
    "none":              {"severity": "None",      "recommendation": "No Action Required",     "color": (16, 185, 129)},
}

SEVERITY_SCORE = {"Critical": 0, "Medium": 60, "Low": 80, "None": 100}

# ── YOLO model cache ──────────────────────────────────────────────────────────
_yolo_model = None
_yolo_available = False


def _load_yolo():
    global _yolo_model, _yolo_available
    if _yolo_model is not None:
        return _yolo_available
    try:
        from ultralytics import YOLO
        model_path = os.path.join(os.path.dirname(__file__), "..", "models", "best.pt")
        if os.path.exists(model_path):
            _yolo_model = YOLO(model_path)
            logger.info("Loaded custom YOLO model: best.pt")
        else:
            _yolo_model = YOLO("yolov8n.pt")
            logger.info("Loaded default yolov8n model")
        _yolo_available = True
    except Exception as exc:
        logger.warning(f"YOLO unavailable: {exc} — using OpenCV fallback")
        _yolo_available = False
    return _yolo_available


# ── OpenCV fallback ───────────────────────────────────────────────────────────
def _opencv_fallback(image_path: str):
    """Rule-based defect simulation via contour/edge analysis."""
    import cv2

    img = cv2.imread(image_path)
    if img is None:
        return "none", 0.95, []

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return "none", 0.92, []

    best = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(best)

    if area < 150:
        return "none", 0.90, []

    x, y, w, h = cv2.boundingRect(best)
    aspect = w / max(h, 1)

    # Classify by shape
    mean_intensity = float(np.mean(gray[y:y+h, x:x+w]))

    if mean_intensity < 60:
        defect, conf = "burn_mark", round(0.70 + np.random.uniform(0, 0.12), 4)
    elif aspect > 5.0:
        defect, conf = "crack", round(0.72 + np.random.uniform(0, 0.14), 4)
    elif aspect > 2.5:
        defect, conf = "scratch", round(0.68 + np.random.uniform(0, 0.15), 4)
    elif area < 400:
        defect, conf = "missing_component", round(0.65 + np.random.uniform(0, 0.12), 4)
    elif area > 5000:
        defect, conf = "surface_damage", round(0.66 + np.random.uniform(0, 0.13), 4)
    else:
        defect, conf = "dent", round(0.64 + np.random.uniform(0, 0.14), 4)

    boxes = [{"x1": x, "y1": y, "x2": x+w, "y2": y+h, "label": defect, "confidence": conf}]
    return defect, conf, boxes


# ── Draw detections ───────────────────────────────────────────────────────────
def _draw_detections(image_path: str, boxes: list, save_path: str):
    try:
        img = Image.open(image_path).convert("RGB")
        draw = ImageDraw.Draw(img)
        iw, ih = img.size

        for box in boxes:
            label = box.get("label", "defect")
            color = DEFECT_CONFIG.get(label, {}).get("color", (255, 165, 0))
            x1, y1, x2, y2 = int(box["x1"]), int(box["y1"]), int(box["x2"]), int(box["y2"])

            # Clamp to image bounds
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(iw, x2), min(ih, y2)

            # Draw thick rectangle
            for t in range(3):
                draw.rectangle([x1-t, y1-t, x2+t, y2+t], outline=color)

            # Label pill
            conf_pct = int(box.get("confidence", 0) * 100)
            text = f" {label.replace('_', ' ').upper()}  {conf_pct}% "
            try:
                bbox_t = draw.textbbox((x1, max(0, y1 - 22)), text)
                draw.rectangle(bbox_t, fill=color)
                draw.text((x1, max(0, y1 - 22)), text, fill="white")
            except Exception:
                draw.rectangle([x1, max(0, y1-18), x1+120, y1], fill=color)
                draw.text((x1+2, max(0, y1-16)), text[:20], fill="white")

        img.save(save_path, quality=95)
    except Exception as exc:
        logger.error(f"Draw detections error: {exc}")
        import shutil
        shutil.copy2(image_path, save_path)


# ── Quality Health Score ──────────────────────────────────────────────────────
def calculate_quality_score(defect: str, confidence: float, history_defects: list) -> tuple:
    """
    Returns (score: float, label: str)
    Score 0-100 based on defect severity, confidence, and history.
    """
    cfg = DEFECT_CONFIG.get(defect, DEFECT_CONFIG["none"])
    base = SEVERITY_SCORE.get(cfg["severity"], 100)

    # Confidence penalty — high confidence bad detection = worse score
    if defect != "none":
        conf_penalty = confidence * 20
    else:
        conf_penalty = 0

    # History penalty — each prior defect reduces score slightly
    history_penalty = min(len(history_defects) * 3, 20)

    score = max(0.0, min(100.0, base - conf_penalty - history_penalty))
    score = round(score, 1)

    if score >= 90:
        label = "Excellent"
    elif score >= 75:
        label = "Good"
    elif score >= 50:
        label = "Needs Attention"
    else:
        label = "Poor"

    return score, label


# ── Main detection entry point ────────────────────────────────────────────────
def run_detection(image_path: str, upload_folder: str, history_defects: list = None):
    """
    Run full defect detection pipeline.
    Returns dict with all detection results + quality score.
    """
    if history_defects is None:
        history_defects = []

    detected_filename = f"det_{uuid.uuid4().hex[:10]}_{os.path.basename(image_path)}"
    detected_path = os.path.join(upload_folder, detected_filename)

    defect = "none"
    confidence = 0.0
    boxes = []

    t_start = time.time()
    yolo_ok = _load_yolo()

    if yolo_ok and _yolo_model is not None:
        try:
            results = _yolo_model.predict(source=image_path, conf=0.30, verbose=False)
            result = results[0]

            if result.boxes and len(result.boxes) > 0:
                best_idx = int(result.boxes.conf.argmax())
                best_box = result.boxes[best_idx]
                cls_id = int(best_box.cls[0])
                raw_label = result.names.get(cls_id, "").lower()

                label_map = {
                    "crack": "crack",
                    "scratch": "scratch",
                    "dent": "dent",
                    "missing": "missing_component",
                    "surface": "surface_damage",
                    "burn": "burn_mark",
                }
                for key, mapped in label_map.items():
                    if key in raw_label:
                        defect = mapped
                        break
                else:
                    defect, confidence, boxes = _opencv_fallback(image_path)

                if defect != "none" and not boxes:
                    confidence = float(best_box.conf[0])
                    xyxy = best_box.xyxy[0].tolist()
                    boxes = [{
                        "x1": int(xyxy[0]), "y1": int(xyxy[1]),
                        "x2": int(xyxy[2]), "y2": int(xyxy[3]),
                        "label": defect, "confidence": confidence,
                    }]
            else:
                defect = "none"
                confidence = 0.95
        except Exception as exc:
            logger.error(f"YOLO inference error: {exc}")
            defect, confidence, boxes = _opencv_fallback(image_path)
    else:
        defect, confidence, boxes = _opencv_fallback(image_path)

    detection_time_ms = round((time.time() - t_start) * 1000, 1)

    # Ensure confidence is set for none-defect cases
    if not confidence:
        confidence = 0.0

    # Draw
    if boxes:
        _draw_detections(image_path, boxes, detected_path)
    else:
        import shutil
        shutil.copy2(image_path, detected_path)

    cfg = DEFECT_CONFIG.get(defect, DEFECT_CONFIG["none"])
    quality_score, quality_label = calculate_quality_score(defect, confidence, history_defects)

    return {
        "defect": defect,
        "confidence": round(confidence, 4),
        "severity": cfg["severity"],
        "recommendation": cfg["recommendation"],
        "bounding_box": json.dumps(boxes),
        "detected_image": detected_filename,
        "detection_time_ms": detection_time_ms,
        "quality_score": quality_score,
        "quality_label": quality_label,
    }


def get_defect_config():
    """Return full defect config for API."""
    return {k: {"severity": v["severity"], "recommendation": v["recommendation"]}
            for k, v in DEFECT_CONFIG.items()}


def get_recommendation(defect: str, db_config: dict = None) -> str:
    """Get recommendation — uses DB config override if available."""
    if db_config and defect in db_config:
        return db_config[defect]
    return DEFECT_CONFIG.get(defect, DEFECT_CONFIG["none"])["recommendation"]
