"""
FastAPI Server for MPLADS AI Platform
Smart India Hackathon 2026 - Problem Statement 26102
Serves REST APIs and the Modern Responsive Web Dashboard.
"""

import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List, Dict, Any
import uuid

from database import (
    query_projects, query_project_detail, update_alert, query_alerts,
    get_summary_metrics, get_district_risk_aggregation, get_state_risk_aggregation,
    get_user_by_username, log_system_audit, query_audit_logs
)
from schemas import (
    RiskSummary, DistrictRiskMetric, StateRiskMetric, AlertItem, AlertStatusUpdate,
    AnomalyCategoryGroup, AnalyticsOverview, LoginRequest, UserProfile
)

# In-memory active sessions: token -> user dict
ACTIVE_SESSIONS: Dict[str, Dict[str, Any]] = {}

app = FastAPI(
    title="MPLADS AI Decision-Support & Anomaly Detection Platform",
    description="Smart India Hackathon 2026 (Problem Statement 26102) - Government Decision Support System for MPLADS monitoring.",
    version="2.0.0"
)

# Enable CORS for maximum client compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "static")

# ------------------------------------------------------------------
# AUTHENTICATION & SESSION ENDPOINTS
# ------------------------------------------------------------------

@app.post("/api/auth/login", response_model=UserProfile)
def login(creds: LoginRequest):
    """Authenticate government official and issue secure session token."""
    user = get_user_by_username(creds.username)
    if not user or user["password_hash"] != creds.password:
        raise HTTPException(status_code=401, detail="Invalid government credentials or unauthorized access attempt.")
    
    # Generate secure session token
    token = f"gov-sec-{uuid.uuid4().hex}"
    user_profile = {
        "username": user["username"],
        "full_name": user["full_name"],
        "role": user["role"],
        "state": user["state"],
        "district": user["district"],
        "department": user["department"],
        "token": token
    }
    ACTIVE_SESSIONS[token] = user_profile
    
    # Log authentication in official audit logs
    log_system_audit(
        action="OFFICIAL_LOGIN",
        officer_name=user["full_name"],
        remarks=f"Authorized login successful as {user['role']} ({user['department']})"
    )
    
    return user_profile


@app.get("/api/auth/me")
def get_current_user(authorization: Optional[str] = None):
    """Check current authenticated session status."""
    token = authorization.replace("Bearer ", "") if authorization else None
    if token and token in ACTIVE_SESSIONS:
        return ACTIVE_SESSIONS[token]
    # Default mock admin session if no token provided during demo testing
    return None


@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = None):
    """Terminate session and log sign-off."""
    token = authorization.replace("Bearer ", "") if authorization else None
    if token and token in ACTIVE_SESSIONS:
        user = ACTIVE_SESSIONS.pop(token)
        log_system_audit(
            action="OFFICIAL_LOGOUT",
            officer_name=user["full_name"],
            remarks="Official logged out of platform"
        )
    return {"message": "Session terminated successfully"}


# ------------------------------------------------------------------
# REST API ENDPOINTS
# ------------------------------------------------------------------

@app.get("/api/risk-summary")
def get_risk_summary():
    """Summary of overall fund utilization, projects count, and risk breakdown."""
    return get_summary_metrics()



@app.get("/api/projects")
def get_projects(
    search: Optional[str] = Query(None, description="Search by project ID, title, or agency"),
    risk_level: Optional[str] = Query(None, description="Filter: LOW, MEDIUM, HIGH, CRITICAL"),
    district: Optional[str] = Query(None, description="Filter by district name"),
    sector: Optional[str] = Query(None, description="Filter by sector"),
    state: Optional[str] = Query(None, description="Filter by state"),
    sort_by: str = Query("composite_risk_score", description="Column to sort by"),
    ascending: bool = Query(False, description="Ascending sort flag"),
    limit: int = Query(250, ge=1, le=500)
):
    """Retrieve filterable, sortable list of MPLADS projects."""
    return query_projects(
        search=search,
        risk_level=risk_level,
        district=district,
        sector=sector,
        state=state,
        sort_by=sort_by,
        ascending=ascending,
        limit=limit
    )


@app.get("/api/projects/{project_id}")
def get_project_by_id(project_id: str):
    """Detailed view of a project, payment history, milestones, and XAI factor breakdown."""
    project = query_project_detail(project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")
    return project


@app.get("/api/high-risk-projects")
def get_high_risk_projects(limit: int = Query(10, ge=1, le=50)):
    """Retrieve top highest-risk projects requiring immediate official attention."""
    return query_projects(
        risk_level="CRITICAL",
        sort_by="composite_risk_score",
        ascending=False,
        limit=limit
    )


@app.get("/api/district-risk")
def get_district_risk():
    """District-level aggregation of risk indices and flagged projects."""
    return get_district_risk_aggregation()


@app.get("/api/state-risk")
def get_state_risk():
    """State-level comparison metrics."""
    return get_state_risk_aggregation()


@app.get("/api/alerts")
def get_alerts(status: Optional[str] = Query(None, description="Filter by alert status: PENDING, UNDER_REVIEW, ESCALATED, RESOLVED")):
    """List all active and historical alerts."""
    return query_alerts(status_filter=status)


@app.patch("/api/alerts/{alert_id}/review")
def review_alert(alert_id: str, update: AlertStatusUpdate):
    """Government officer alert triage action (Reviewed, Escalated, Resolved)."""
    success = update_alert(
        alert_id=alert_id,
        status=update.status.value,
        remarks=update.officer_remarks,
        reviewer=update.reviewer_name
    )
    if not success:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found.")
    return {"status": "success", "message": f"Alert {alert_id} updated to {update.status.value}"}


@app.get("/api/anomalies")
def get_anomalies_breakdown():
    """Returns grouped projects categorized by primary anomaly vector."""
    all_crit_high = query_projects(limit=250)
    
    tender_split = [p for p in all_crit_high if 475000 <= p['sanctioned_amount'] < 500000]
    progress_mismatch = [p for p in all_crit_high if p['spending_vs_progress_mismatch_pct'] > 20.0]
    cost_overrun = [p for p in all_crit_high if p['cost_overrun_pct'] > 15.0]
    severe_delay = [p for p in all_crit_high if p['delay_days'] > 90]
    duplicate_works = [p for p in all_crit_high if p['duplicate_risk_detected']]

    return [
        {
            "category_id": "PROGRESS_MISMATCH",
            "category_name": "Spending vs Physical Progress Mismatch",
            "description": "High fund disbursement (>80%) with low verified ground execution (<35%).",
            "severity": "CRITICAL",
            "count": len(progress_mismatch),
            "sample_projects": progress_mismatch[:5]
        },
        {
            "category_id": "TENDER_BYPASS",
            "category_name": "Threshold Splitting (₹5 Lakh Bypass)",
            "description": "Works intentionally priced between ₹4.75L and ₹4.98L to circumvent mandatory public e-tendering.",
            "severity": "HIGH",
            "count": len(tender_split),
            "sample_projects": tender_split[:5]
        },
        {
            "category_id": "COST_OVERRUN",
            "category_name": "Unsanctioned Cost Overruns",
            "description": "Projects where actual expenditure significantly exceeds estimated budget.",
            "severity": "HIGH",
            "count": len(cost_overrun),
            "sample_projects": cost_overrun[:5]
        },
        {
            "category_id": "SEVERE_DELAY",
            "category_name": "Chronic Timeline Delay",
            "description": "Projects stalled or overdue by more than 90 days past contractual completion date.",
            "severity": "MEDIUM",
            "count": len(severe_delay),
            "sample_projects": severe_delay[:5]
        },
        {
            "category_id": "DUPLICATE_WORK",
            "category_name": "Suspected Duplicate/Overlapping Works",
            "description": "Nearly identical work titles sanctioned within 2km geographic proximity in the same district.",
            "severity": "CRITICAL",
            "count": len(duplicate_works),
            "sample_projects": duplicate_works[:5]
        }
    ]


@app.get("/api/analytics")
def get_analytics_data():
    """Analytical distributions for charts and dashboards."""
    projects = query_projects(limit=250)
    
    # Sector risk aggregation
    sector_map = {}
    for p in projects:
        sec = p['sector']
        if sec not in sector_map:
            sector_map[sec] = {"sector": sec, "total_sanctioned": 0, "total_spent": 0, "count": 0, "high_risk_count": 0}
        sector_map[sec]["total_sanctioned"] += p["sanctioned_amount"]
        sector_map[sec]["total_spent"] += p["expenditure_to_date"]
        sector_map[sec]["count"] += 1
        if p["risk_level"] in ["HIGH", "CRITICAL"]:
            sector_map[sec]["high_risk_count"] += 1

    # Spending vs progress scatter points
    scatter = [
        {
            "project_id": p["project_id"],
            "title": p["title"][:30] + "...",
            "expenditure_pct": round(p["expenditure_to_date"] / max(p["sanctioned_amount"], 1) * 100, 1),
            "physical_progress_pct": p["physical_progress_pct"],
            "risk_score": p["composite_risk_score"],
            "risk_level": p["risk_level"]
        }
        for p in projects
    ]

    return {
        "sector_risk": list(sector_map.values()),
        "spending_vs_progress_scatter": scatter
    }


@app.get("/api/audit-logs")
def get_audit_logs(limit: int = Query(100, ge=1, le=500)):
    """Retrieve system audit trail for governance accountability."""
    return query_audit_logs(limit=limit)


# ------------------------------------------------------------------
# STATIC FRONTEND SERVING
# ------------------------------------------------------------------

# Serve static assets (JS, CSS, images)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def serve_index():
    """Serves the government intelligence dashboard UI."""
    index_file = os.path.join(STATIC_DIR, "index.html")
    if not os.path.exists(index_file):
        return {"message": "Frontend static file index.html is being prepared."}
    return FileResponse(index_file)
