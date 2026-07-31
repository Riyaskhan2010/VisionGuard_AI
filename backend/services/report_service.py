"""
PDF Report Generation Service using ReportLab.
Falls back to plain-text if ReportLab is not installed.
"""
import os
import io
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def _safe_str(val):
    if val is None:
        return "N/A"
    return str(val)


def generate_inspection_pdf(inspection, upload_folder: str) -> bytes:
    """
    Generate a PDF report for an inspection.
    Returns raw PDF bytes.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import mm, cm
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
            HRFlowable, Image as RLImage,
        )
        from reportlab.lib.enums import TA_CENTER, TA_LEFT

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4,
                                leftMargin=20*mm, rightMargin=20*mm,
                                topMargin=20*mm, bottomMargin=20*mm)

        styles = getSampleStyleSheet()
        story = []

        # ── Header ────────────────────────────────────────────────────────────
        title_style = ParagraphStyle(
            "Title", parent=styles["Title"],
            fontSize=20, textColor=colors.HexColor("#1e40af"),
            spaceAfter=4,
        )
        sub_style = ParagraphStyle(
            "Sub", parent=styles["Normal"],
            fontSize=10, textColor=colors.HexColor("#64748b"),
        )
        story.append(Paragraph("VisionGuard AI", title_style))
        story.append(Paragraph("Industrial Quality Intelligence Platform", sub_style))
        story.append(Spacer(1, 4*mm))
        story.append(HRFlowable(width="100%", thickness=2,
                                color=colors.HexColor("#1e40af")))
        story.append(Spacer(1, 6*mm))

        story.append(Paragraph("INSPECTION REPORT", ParagraphStyle(
            "RTitle", parent=styles["Heading1"],
            fontSize=14, textColor=colors.HexColor("#1e293b"),
        )))
        story.append(Spacer(1, 4*mm))

        # ── Images ────────────────────────────────────────────────────────────
        img_rows = []
        for attr, label in [("original_image", "Original Image"),
                             ("detected_image", "Detected Image")]:
            path = os.path.join(upload_folder, getattr(inspection, attr) or "")
            if os.path.exists(path):
                try:
                    img = RLImage(path, width=7*cm, height=5*cm)
                    img_rows.append([label, img])
                except Exception:
                    img_rows.append([label, "Image unavailable"])
            else:
                img_rows.append([label, "Image not found"])

        if img_rows:
            img_table = Table([[img_rows[0][0], img_rows[1][0]],
                                [img_rows[0][1], img_rows[1][1]]],
                               colWidths=[8*cm, 8*cm])
            img_table.setStyle(TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#64748b")),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 4),
            ]))
            story.append(img_table)
            story.append(Spacer(1, 6*mm))

        # ── Details table ─────────────────────────────────────────────────────
        severity_colors = {
            "Critical": "#ef4444",
            "Medium": "#eab308",
            "Low": "#3b82f6",
            "None": "#10b981",
        }
        status_colors = {
            "Approved": "#10b981",
            "Rejected": "#ef4444",
            "Pending": "#f59e0b",
        }

        sev_color = colors.HexColor(severity_colors.get(inspection.severity or "None", "#94a3b8"))
        sta_color = colors.HexColor(status_colors.get(inspection.status or "Pending", "#94a3b8"))

        product = inspection.product
        worker = inspection.worker

        data = [
            ["Field", "Value"],
            ["Report ID", f"RPT-{inspection.id:06d}"],
            ["Inspection ID", f"#{inspection.id}"],
            ["Generated At", datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")],
            ["", ""],
            ["Product ID", product.product_id if product else "N/A"],
            ["Product Name", product.product_name if product else "N/A"],
            ["Inspector", worker.name if worker else "N/A"],
            ["", ""],
            ["Defect Detected", (_safe_str(inspection.defect) or "none").replace("_", " ").title()],
            ["Confidence", f"{round(inspection.confidence * 100, 1)}%" if inspection.confidence else "N/A"],
            ["Detection Time", f"{inspection.detection_time_ms} ms" if inspection.detection_time_ms else "N/A"],
            ["Severity", _safe_str(inspection.severity)],
            ["Quality Score", f"{inspection.quality_score}/100 — {inspection.quality_label}"
             if inspection.quality_score is not None else "N/A"],
            ["", ""],
            ["Recommendation", _safe_str(inspection.recommendation)],
            ["", ""],
            ["Inspection Status", _safe_str(inspection.status)],
            ["Reject Reason", _safe_str(inspection.reject_reason)],
            ["Is Recurring", "Yes ⚠" if inspection.is_recurring else "No"],
            ["", ""],
            ["Inspection Date", inspection.created_at.strftime("%Y-%m-%d") if inspection.created_at else "N/A"],
            ["Inspection Time", inspection.created_at.strftime("%H:%M:%S UTC") if inspection.created_at else "N/A"],
        ]

        tbl = Table(data, colWidths=[6*cm, 11*cm])
        tbl_style = TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1),
             [colors.HexColor("#f8fafc"), colors.HexColor("#f1f5f9")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ])
        tbl.setStyle(tbl_style)
        story.append(tbl)

        story.append(Spacer(1, 8*mm))
        story.append(HRFlowable(width="100%", thickness=1,
                                color=colors.HexColor("#e2e8f0")))
        story.append(Spacer(1, 3*mm))
        story.append(Paragraph(
            "This report was generated automatically by VisionGuard AI. "
            "AI predictions are subject to human validation.",
            ParagraphStyle("Footer", parent=styles["Normal"],
                           fontSize=8, textColor=colors.HexColor("#94a3b8"),
                           alignment=TA_CENTER)
        ))

        doc.build(story)
        return buf.getvalue()

    except ImportError:
        logger.warning("ReportLab not installed — generating plain text report")
        return _generate_text_report(inspection)
    except Exception as exc:
        logger.error(f"PDF generation error: {exc}")
        return _generate_text_report(inspection)


def _generate_text_report(inspection) -> bytes:
    """Plain text fallback when ReportLab is unavailable."""
    product = inspection.product
    worker = inspection.worker
    lines = [
        "=" * 60,
        "  VISIONGUARD AI — INSPECTION REPORT",
        "=" * 60,
        f"Report ID       : RPT-{inspection.id:06d}",
        f"Generated At    : {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        "-" * 60,
        f"Product ID      : {product.product_id if product else 'N/A'}",
        f"Product Name    : {product.product_name if product else 'N/A'}",
        f"Inspector       : {worker.name if worker else 'N/A'}",
        "-" * 60,
        f"Defect          : {(inspection.defect or 'none').replace('_',' ').title()}",
        f"Confidence      : {round(inspection.confidence*100,1)}%" if inspection.confidence else "Confidence      : N/A",
        f"Severity        : {inspection.severity or 'N/A'}",
        f"Quality Score   : {inspection.quality_score}/100 — {inspection.quality_label}" if inspection.quality_score else "Quality Score   : N/A",
        f"Recommendation  : {inspection.recommendation or 'N/A'}",
        "-" * 60,
        f"Status          : {inspection.status or 'Pending'}",
        f"Reject Reason   : {inspection.reject_reason or 'N/A'}",
        f"Is Recurring    : {'Yes' if inspection.is_recurring else 'No'}",
        "-" * 60,
        f"Date            : {inspection.created_at.strftime('%Y-%m-%d') if inspection.created_at else 'N/A'}",
        f"Time            : {inspection.created_at.strftime('%H:%M:%S UTC') if inspection.created_at else 'N/A'}",
        "=" * 60,
        "Generated by VisionGuard AI — Industrial Quality Intelligence",
        "=" * 60,
    ]
    return "\n".join(lines).encode("utf-8")
