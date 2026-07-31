"""
AI Smart Recommendation Engine
Generates root cause analysis, corrective actions, maintenance priority,
estimated repair time, team suggestions, preventive maintenance, and safety warnings.
"""

DEFECT_PROFILES = {
    "crack": {
        "root_causes": [
            "Material fatigue from repeated stress cycles",
            "Improper heat treatment during manufacturing",
            "Excessive mechanical load beyond design limits",
            "Thermal expansion and contraction stress",
        ],
        "corrective_action": "Immediately remove product from production line. Conduct metallurgical analysis to determine crack propagation depth. Replace component if crack exceeds 0.5mm.",
        "maintenance_priority": "Critical",
        "estimated_repair_time": "2–4 hours",
        "maintenance_team": "Structural Engineering & Metallurgy Team",
        "preventive_maintenance": "Implement weekly visual inspection cycle. Install vibration sensors on high-load components. Review material stress specifications quarterly.",
        "safety_warning": "WARNING: Cracked structural components may fail catastrophically under load. Do NOT operate machinery with cracked load-bearing parts. Evacuate area and tag out equipment immediately.",
        "priority_color": "red",
        "priority_score": 95,
    },
    "scratch": {
        "root_causes": [
            "Contact with abrasive surfaces during handling",
            "Inadequate packaging or protective coating",
            "Conveyor belt surface damage",
            "Tool marks from machining operations",
        ],
        "corrective_action": "Polish affected surface using fine-grade abrasive (400-grit). Apply protective coating or lacquer. Re-inspect after treatment to verify surface integrity.",
        "maintenance_priority": "Medium",
        "estimated_repair_time": "30–60 minutes",
        "maintenance_team": "Surface Finishing & Quality Team",
        "preventive_maintenance": "Install rubber bumpers on conveyor contact points. Enforce anti-scratch packaging standards. Train handling staff on part protection protocols.",
        "safety_warning": None,
        "priority_color": "yellow",
        "priority_score": 55,
    },
    "dent": {
        "root_causes": [
            "Impact during transportation or handling",
            "Improper fixture clamping pressure",
            "Drop damage from workstation height",
            "Press tooling misalignment",
        ],
        "corrective_action": "Assess dent depth and area. For dents < 2mm depth: use pneumatic dent repair tools. For deeper dents: rework using panel beating or reject and replace.",
        "maintenance_priority": "Low",
        "estimated_repair_time": "1–2 hours",
        "maintenance_team": "Mechanical Rework & Assembly Team",
        "preventive_maintenance": "Install anti-vibration mounts on workstations. Review fixture clamping torque specifications. Add padded storage racks.",
        "safety_warning": None,
        "priority_color": "blue",
        "priority_score": 35,
    },
    "missing_component": {
        "root_causes": [
            "Assembly line skip error or sensor failure",
            "Component supply chain shortage",
            "Operator missed assembly step",
            "Bill of materials mismatch",
        ],
        "corrective_action": "Halt production line immediately. Audit last 50 units for same missing component. Trace back to assembly station and identify root cause. Re-assemble affected units.",
        "maintenance_priority": "Critical",
        "estimated_repair_time": "4–8 hours (production audit required)",
        "maintenance_team": "Assembly Engineering & Production Control Team",
        "preventive_maintenance": "Install poka-yoke sensors at assembly stations. Implement mandatory torque verification step. Add camera-based assembly verification at end-of-line.",
        "safety_warning": "WARNING: Products with missing components may be non-functional or unsafe. Do NOT ship or use until verified complete. Initiate full production audit.",
        "priority_color": "red",
        "priority_score": 98,
    },
    "surface_damage": {
        "root_causes": [
            "Chemical contamination or corrosive exposure",
            "Abrasive contact during transport",
            "Improper cleaning chemicals used",
            "UV or thermal degradation of surface coating",
        ],
        "corrective_action": "Clean surface with pH-neutral solvent. Assess depth of damage. Apply primer and protective topcoat. If base material is compromised, replace component.",
        "maintenance_priority": "Medium",
        "estimated_repair_time": "1–3 hours",
        "maintenance_team": "Surface Treatment & Coating Team",
        "preventive_maintenance": "Install climate-controlled storage. Review chemical handling procedures. Audit cleaning product compatibility with component materials.",
        "safety_warning": None,
        "priority_color": "orange",
        "priority_score": 60,
    },
    "burn_mark": {
        "root_causes": [
            "Electrical arcing or short circuit",
            "Overheating during welding or soldering",
            "Friction overheating from misaligned components",
            "Laser or plasma cutting misalignment",
        ],
        "corrective_action": "Isolate and quarantine component. Inspect surrounding components for heat damage. Check electrical connections for arc damage. Replace damaged components and investigate heat source.",
        "maintenance_priority": "Critical",
        "estimated_repair_time": "3–6 hours",
        "maintenance_team": "Electrical Safety & Thermal Engineering Team",
        "preventive_maintenance": "Install thermal sensors at critical heat-generating stations. Implement IR thermography scans weekly. Review electrical load ratings and fuse protection.",
        "safety_warning": "WARNING: Burn marks indicate potential electrical hazard or fire risk. Remove component immediately. Inspect surrounding equipment for fire damage. Contact EHS team before resuming production.",
        "priority_color": "red",
        "priority_score": 97,
    },
    "none": {
        "root_causes": ["No defect detected — product within specification"],
        "corrective_action": "No corrective action required. Product cleared for next production stage.",
        "maintenance_priority": "Low",
        "estimated_repair_time": "N/A",
        "maintenance_team": "Standard QC Team",
        "preventive_maintenance": "Continue standard inspection schedule. Maintain current process parameters.",
        "safety_warning": None,
        "priority_color": "green",
        "priority_score": 10,
    },
}

PRIORITY_ORDER = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}


def get_recommendation(defect: str, confidence: float = 0.0,
                       is_recurring: bool = False, recurrence_count: int = 0) -> dict:
    profile = DEFECT_PROFILES.get(defect, DEFECT_PROFILES["none"])

    # Escalate priority if recurring
    priority = profile["maintenance_priority"]
    safety_warning = profile["safety_warning"]

    if is_recurring and recurrence_count >= 3 and priority != "Critical":
        priority = "Critical"
        safety_warning = (
            f"ESCALATED: This defect has recurred {recurrence_count} times. "
            "Immediate process review required. Consider production halt pending root cause analysis."
        )
    elif is_recurring and recurrence_count >= 2 and priority == "Low":
        priority = "Medium"

    # Pick most likely root cause based on confidence
    root_causes = profile["root_causes"]
    primary_cause = root_causes[0] if confidence >= 0.7 else root_causes[min(1, len(root_causes) - 1)]

    return {
        "defect": defect,
        "confidence": confidence,
        "root_cause_primary": primary_cause,
        "root_causes_all": root_causes,
        "corrective_action": profile["corrective_action"],
        "maintenance_priority": priority,
        "priority_color": profile["priority_color"],
        "priority_score": profile["priority_score"],
        "estimated_repair_time": profile["estimated_repair_time"],
        "maintenance_team": profile["maintenance_team"],
        "preventive_maintenance": profile["preventive_maintenance"],
        "safety_warning": safety_warning,
        "is_recurring": is_recurring,
        "recurrence_count": recurrence_count,
    }
