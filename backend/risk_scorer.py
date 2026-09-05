"""
Transparent Risk Scoring & Explainable AI (XAI) Engine
Smart India Hackathon 2026 - Problem Statement 26102

Scoring Methodology (0 - 100 Composite Index):
1. Spending-Physical Progress Mismatch : 25 Points max
2. Cost Overrun Deviation              : 20 Points max
3. Timeline Delay Past Deadline        : 15 Points max
4. Statutory Tender Bypass Splitting   : 15 Points max
5. Agency Allocation Concentration     : 15 Points max
6. Multivariate Isolation Forest Score : 10 Points max
Bonus Flag: Confirmed Duplicate Work   : +15 Points (capped at 100)
"""

from typing import Dict, Any, List, Tuple
from schemas import RiskLevel, RiskFactorDetail, RiskAnalysis

def calculate_project_risk(
    project_row: Dict[str, Any],
    iso_pred: int,
    iso_score: float,
    duplicate_info: Dict[str, Any] = None
) -> RiskAnalysis:
    """
    Computes a transparent, explainable 0-100 risk score and generates
    prescriptive recommendations for district authorities.
    """
    factors: List[RiskFactorDetail] = []
    total_score = 0.0
    reasons: List[str] = []

    # -------------------------------------------------------------
    # 1. Spending vs. Physical Progress Mismatch (Max: 25 pts)
    # -------------------------------------------------------------
    sanctioned = max(float(project_row['sanctioned_amount']), 1.0)
    expenditure = float(project_row['expenditure_to_date'])
    progress = float(project_row['physical_progress_pct'])
    exp_pct = (expenditure / sanctioned) * 100.0
    mismatch = max(0.0, exp_pct - progress)

    mismatch_score = 0.0
    is_mismatch_anomaly = False
    if mismatch >= 40.0:
        mismatch_score = 25.0
        is_mismatch_anomaly = True
        reasons.append(f"Severe spending-progress mismatch: {mismatch:.1f}% ({exp_pct:.1f}% funds released vs {progress:.1f}% physical completion)")
    elif mismatch >= 25.0:
        mismatch_score = 18.0
        is_mismatch_anomaly = True
        reasons.append(f"High spending-progress mismatch: {mismatch:.1f}%")
    elif mismatch >= 15.0:
        mismatch_score = 10.0
        reasons.append(f"Moderate spending-progress mismatch: {mismatch:.1f}%")
    elif mismatch >= 8.0:
        mismatch_score = 5.0

    factors.append(RiskFactorDetail(
        factor_name="Spending vs Physical Progress Mismatch",
        score_contribution=mismatch_score,
        max_possible=25.0,
        evidence=f"{mismatch:.1f}% gap between funds disbursed and verified physical work",
        is_anomaly=is_mismatch_anomaly
    ))
    total_score += mismatch_score

    # -------------------------------------------------------------
    # 2. Cost Overrun (Max: 20 pts)
    # -------------------------------------------------------------
    est_cost = max(float(project_row['estimated_cost']), 1.0)
    overrun_pct = max(0.0, ((expenditure - est_cost) / est_cost) * 100.0)

    overrun_score = 0.0
    is_overrun_anomaly = False
    if overrun_pct >= 35.0:
        overrun_score = 20.0
        is_overrun_anomaly = True
        reasons.append(f"Critical cost overrun: {overrun_pct:.1f}% over estimated expenditure")
    elif overrun_pct >= 20.0:
        overrun_score = 14.0
        is_overrun_anomaly = True
        reasons.append(f"High cost overrun: {overrun_pct:.1f}%")
    elif overrun_pct >= 10.0:
        overrun_score = 8.0
        reasons.append(f"Moderate cost overrun: {overrun_pct:.1f}%")
    elif overrun_pct >= 5.0:
        overrun_score = 4.0

    factors.append(RiskFactorDetail(
        factor_name="Cost Overrun Deviation",
        score_contribution=overrun_score,
        max_possible=20.0,
        evidence=f"Expenditure exceeds original budget estimate by {overrun_pct:.1f}%",
        is_anomaly=is_overrun_anomaly
    ))
    total_score += overrun_score

    # -------------------------------------------------------------
    # 3. Timeline Delay Past Completion Date (Max: 15 pts)
    # -------------------------------------------------------------
    delay_days = int(project_row['delay_days'])
    delay_score = 0.0
    is_delay_anomaly = False

    if delay_days >= 180:
        delay_score = 15.0
        is_delay_anomaly = True
        reasons.append(f"Severe project delay: {delay_days} days past scheduled completion")
    elif delay_days >= 90:
        delay_score = 10.0
        is_delay_anomaly = True
        reasons.append(f"High project delay: {delay_days} days")
    elif delay_days >= 30:
        delay_score = 5.0
        reasons.append(f"Project delayed by {delay_days} days")

    factors.append(RiskFactorDetail(
        factor_name="Timeline Delay",
        score_contribution=delay_score,
        max_possible=15.0,
        evidence=f"{delay_days} days past scheduled deadline" if delay_days > 0 else "Project on schedule",
        is_anomaly=is_delay_anomaly
    ))
    total_score += delay_score

    # -------------------------------------------------------------
    # 4. Tender Splitting / Statutory Limit Bypass (Max: 15 pts)
    # -------------------------------------------------------------
    tender_score = 0.0
    is_tender_anomaly = False
    amount = float(project_row['sanctioned_amount'])

    # Central & State guidelines mandate e-tendering above ₹5,00,000
    if 475000 <= amount < 500000:
        tender_score = 15.0
        is_tender_anomaly = True
        reasons.append(f"Suspicious work splitting (₹{amount:,.0f} sanctioned, just below ₹5 Lakh e-tender threshold)")
    elif 450000 <= amount < 475000:
        tender_score = 8.0
        is_tender_anomaly = True
        reasons.append(f"Borderline tender value (₹{amount:,.0f})")

    factors.append(RiskFactorDetail(
        factor_name="Tender Bypass (Statutory Splitting)",
        score_contribution=tender_score,
        max_possible=15.0,
        evidence=f"Sanction amount ₹{amount:,.0f} falls within the artificial fragmentation threshold zone" if is_tender_anomaly else "Standard procurement zone",
        is_anomaly=is_tender_anomaly
    ))
    total_score += tender_score

    # -------------------------------------------------------------
    # 5. Agency Concentration / Monopoly Risk (Max: 15 pts)
    # -------------------------------------------------------------
    agency_share = float(project_row.get('agency_district_share', 0.0)) * 100.0
    agency_score = 0.0
    is_agency_anomaly = False

    if agency_share >= 40.0:
        agency_score = 15.0
        is_agency_anomaly = True
        reasons.append(f"Single contractor monopoly: controls {agency_share:.1f}% of district MPLADS funds")
    elif agency_share >= 25.0:
        agency_score = 9.0
        is_agency_anomaly = True
        reasons.append(f"High contractor concentration: {agency_share:.1f}% of district budget")
    elif agency_share >= 15.0:
        agency_score = 5.0

    factors.append(RiskFactorDetail(
        factor_name="Contractor Cartelization / Concentration",
        score_contribution=agency_score,
        max_possible=15.0,
        evidence=f"Agency '{project_row['implementing_agency']}' commands {agency_share:.1f}% of sector funds in district",
        is_anomaly=is_agency_anomaly
    ))
    total_score += agency_score

    # -------------------------------------------------------------
    # 6. Multivariate Isolation Forest ML Score (Max: 10 pts)
    # -------------------------------------------------------------
    ml_score = round(iso_score * 10.0, 1)
    is_iso_anomaly = (iso_pred == -1)
    if is_iso_anomaly:
        reasons.append("Unsupervised Isolation Forest detected non-linear multivariate anomaly")

    factors.append(RiskFactorDetail(
        factor_name="Unsupervised ML Outlier (Isolation Forest)",
        score_contribution=ml_score,
        max_possible=10.0,
        evidence=f"ML outlier confidence score {iso_score:.2f} (flagged: {is_iso_anomaly})",
        is_anomaly=is_iso_anomaly
    ))
    total_score += ml_score

    # -------------------------------------------------------------
    # 7. Duplicate Work Detection Surcharge (+15 pts)
    # -------------------------------------------------------------
    duplicate_detected = False
    dup_project_id = None
    if duplicate_info:
        duplicate_detected = True
        dup_project_id = duplicate_info.get("proj_b") if duplicate_info.get("proj_a") == project_row['project_id'] else duplicate_info.get("proj_a")
        total_score += 15.0
        reasons.append(f"Duplicate/overlapping work suspect with {dup_project_id} (text similarity: {duplicate_info['similarity_score']*100:.0f}%, distance: {duplicate_info['distance_km']} km)")
        factors.append(RiskFactorDetail(
            factor_name="Duplicate Work Suspect",
            score_contribution=15.0,
            max_possible=15.0,
            evidence=f"Matches project {dup_project_id} in {project_row['district']}",
            is_anomaly=True
        ))

    # Cap total score at 100
    composite_risk_score = min(100.0, round(total_score, 1))

    # Assign Risk Level
    if composite_risk_score >= 81.0:
        risk_level = RiskLevel.CRITICAL
    elif composite_risk_score >= 61.0:
        risk_level = RiskLevel.HIGH
    elif composite_risk_score >= 31.0:
        risk_level = RiskLevel.MEDIUM
    else:
        risk_level = RiskLevel.LOW

    # Generate Explainable Narrative
    if reasons:
        explanation = f"Project exhibits {len(reasons)} governance risk indicators: " + "; ".join(reasons) + "."
    else:
        explanation = "Project metrics fall within normal operational tolerance limits with balanced expenditure and verified progress."

    # Prescriptive Actionable Recommendation
    if risk_level == RiskLevel.CRITICAL:
        if is_mismatch_anomaly and is_tender_anomaly:
            rec = "IMMEDIATE AUDIT: Order on-site third-party physical inspection, freeze subsequent fund releases, and examine quotation records for artificial tender splitting."
        elif duplicate_detected:
            rec = "DUPLICATE VERIFICATION: Coordinate with District Planning Officer to confirm GPS coordinates and verify whether physical asset was constructed under multiple sanctions."
        else:
            rec = "EXECUTIVE ACTION: Issue notice to implementing agency for immediate justification of severe budget overrun and milestone discrepancy."
    elif risk_level == RiskLevel.HIGH:
        rec = "FIELD REVIEW: Schedule spot verification by Sub-Divisional Magistrate (SDM) / Executive Engineer to audit completion certificate and muster rolls."
    elif risk_level == RiskLevel.MEDIUM:
        rec = "ROUTINE MONITORING: Request updated geo-tagged progress photographs and updated expenditure utilization certificate from the agency."
    else:
        rec = "NORMAL CLEARANCE: Continue scheduled disbursement per approved milestone schedule."

    return RiskAnalysis(
        composite_risk_score=composite_risk_score,
        risk_level=risk_level,
        factors=factors,
        xai_explanation=explanation,
        recommended_action=rec,
        isolation_forest_outlier=is_iso_anomaly,
        duplicate_risk_detected=duplicate_detected,
        duplicate_with_project_id=dup_project_id
    )
