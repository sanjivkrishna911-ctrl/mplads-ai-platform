"""
Pydantic Schemas for MPLADS AI Anomaly Detection Platform
Smart India Hackathon 2026 - Problem Statement 26102
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertStatus(str, Enum):
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    ESCALATED = "ESCALATED"
    RESOLVED = "RESOLVED"


class PaymentMilestone(BaseModel):
    milestone_id: str
    date: str
    amount: float
    description: str
    physical_progress_claimed: float  # Percentage (0-100)


class RiskFactorDetail(BaseModel):
    factor_name: str
    score_contribution: float       # Points added to 0-100 score
    max_possible: float
    evidence: str                   # Human-readable evidence e.g. "Cost overrun of 42%"
    is_anomaly: bool


class RiskAnalysis(BaseModel):
    composite_risk_score: float     # 0 to 100
    risk_level: RiskLevel
    factors: List[RiskFactorDetail]
    xai_explanation: str            # Natural language narrative for District Collector
    recommended_action: str         # Prescriptive next step for audit
    isolation_forest_outlier: bool
    duplicate_risk_detected: bool
    duplicate_with_project_id: Optional[str] = None


class ProjectBase(BaseModel):
    project_id: str
    title: str
    state: str
    district: str
    sector: str
    implementing_agency: str
    sanction_date: str
    scheduled_completion_date: str
    actual_or_current_date: str
    sanctioned_amount: float        # in INR
    estimated_cost: float           # in INR
    expenditure_to_date: float      # in INR
    physical_progress_pct: float    # 0 to 100
    status: str                     # In Progress, Completed, Delayed, Stalled
    latitude: float
    longitude: float


class ProjectSummary(ProjectBase):
    cost_overrun_pct: float
    delay_days: int
    spending_vs_progress_mismatch_pct: float
    composite_risk_score: float
    risk_level: RiskLevel
    anomaly_flags_count: int


class ProjectDetail(ProjectBase):
    cost_overrun_pct: float
    delay_days: int
    spending_vs_progress_mismatch_pct: float
    risk_analysis: RiskAnalysis
    payment_history: List[PaymentMilestone]
    contractor_total_district_allocation: float
    contractor_active_projects_count: int
    audit_notes: Optional[str] = None
    last_reviewed_by: Optional[str] = None
    review_status: AlertStatus = AlertStatus.PENDING


class RiskSummary(BaseModel):
    total_projects: int
    total_sanctioned_amount: float
    total_expenditure_amount: float
    overall_expenditure_ratio_pct: float
    risk_counts: Dict[str, int]     # {"LOW": 140, "MEDIUM": 65, "HIGH": 30, "CRITICAL": 15}
    total_anomalies_flagged: int
    total_severe_delays: int
    total_cost_overruns: int
    total_progress_mismatches: int
    total_tender_bypasses: int
    total_duplicate_suspects: int


class DistrictRiskMetric(BaseModel):
    district: str
    state: str
    total_projects: int
    total_sanctioned: float
    total_expenditure: float
    avg_risk_score: float
    high_risk_projects_count: int
    critical_risk_projects_count: int
    dominant_risk_type: str


class StateRiskMetric(BaseModel):
    state: str
    total_districts: int
    total_projects: int
    total_sanctioned: float
    total_expenditure: float
    avg_risk_score: float
    critical_projects_count: int


class AlertItem(BaseModel):
    alert_id: str
    project_id: str
    project_title: str
    district: str
    state: str
    risk_level: RiskLevel
    risk_score: float
    anomaly_type: str
    headline: str
    detail: str
    created_at: str
    status: AlertStatus
    officer_remarks: Optional[str] = None


class AlertStatusUpdate(BaseModel):
    status: AlertStatus
    officer_remarks: str
    reviewer_name: str


class AnomalyCategoryGroup(BaseModel):
    category_id: str
    category_name: str
    description: str
    severity: str
    affected_projects_count: int
    total_value_at_risk: float
    sample_projects: List[ProjectSummary]


class AnalyticsOverview(BaseModel):
    sector_risk: List[Dict[str, Any]]
    timeline_drift: List[Dict[str, Any]]
    spending_vs_progress_scatter: List[Dict[str, Any]]
    agency_concentration: List[Dict[str, Any]]


class LoginRequest(BaseModel):
    username: str
    password: str


class UserProfile(BaseModel):
    username: str
    full_name: str
    role: str
    state: Optional[str] = None
    district: Optional[str] = None
    department: str
    token: str

