"""
SQLite Database Layer for MPLADS AI Platform
Smart India Hackathon 2026 - Problem Statement 26102
"""

import sqlite3
import json
import os
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "mplads.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS projects (
        project_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        state TEXT NOT NULL,
        district TEXT NOT NULL,
        sector TEXT NOT NULL,
        implementing_agency TEXT NOT NULL,
        sanction_date TEXT NOT NULL,
        scheduled_completion_date TEXT NOT NULL,
        actual_or_current_date TEXT NOT NULL,
        sanctioned_amount REAL NOT NULL,
        estimated_cost REAL NOT NULL,
        expenditure_to_date REAL NOT NULL,
        physical_progress_pct REAL NOT NULL,
        status TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        cost_overrun_pct REAL NOT NULL,
        delay_days INTEGER NOT NULL,
        spending_vs_progress_mismatch_pct REAL NOT NULL,
        composite_risk_score REAL NOT NULL,
        risk_level TEXT NOT NULL,
        anomaly_flags_count INTEGER NOT NULL,
        xai_explanation TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        factors_json TEXT NOT NULL,
        isolation_forest_outlier INTEGER NOT NULL,
        duplicate_risk_detected INTEGER NOT NULL,
        duplicate_with_project_id TEXT,
        contractor_total_district_allocation REAL NOT NULL,
        contractor_active_projects_count INTEGER NOT NULL,
        audit_notes TEXT,
        last_reviewed_by TEXT,
        review_status TEXT DEFAULT 'PENDING'
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS payment_milestones (
        milestone_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT NOT NULL,
        physical_progress_claimed REAL NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects (project_id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        alert_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        project_title TEXT NOT NULL,
        district TEXT NOT NULL,
        state TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        risk_score REAL NOT NULL,
        anomaly_type TEXT NOT NULL,
        headline TEXT NOT NULL,
        detail TEXT NOT NULL,
        created_at TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        officer_remarks TEXT,
        FOREIGN KEY (project_id) REFERENCES projects (project_id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        log_id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        action TEXT NOT NULL,
        officer_name TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        remarks TEXT NOT NULL
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL, -- 'ADMIN', 'STATE_OFFICER', 'DISTRICT_OFFICER'
        state TEXT,
        district TEXT,
        department TEXT NOT NULL
    );
    """)

    # Seed default government demo users
    seed_users = [
        ("admin", "admin123", "Shri R. K. Verma, IAS", "ADMIN", None, None, "Ministry of Statistics & Programme Implementation (MoSPI)"),
        ("state_mh", "state123", "Dr. Sunita Deshmukh, IAS", "STATE_OFFICER", "Maharashtra", None, "State Planning Department, Maharashtra"),
        ("dc_pune", "pune123", "Dr. Rajesh Patil, IAS", "DISTRICT_OFFICER", "Maharashtra", "Pune", "Office of the District Magistrate & Collector, Pune"),
        ("dc_kanpur", "kanpur123", "Shri Alok Kumar, IAS", "DISTRICT_OFFICER", "Uttar Pradesh", "Kanpur Nagar", "District Magistrate & Collectorate, Kanpur Nagar")
    ]
    for u in seed_users:
        cursor.execute("""
        INSERT OR IGNORE INTO users (username, password_hash, full_name, role, state, district, department)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, u)

    conn.commit()
    conn.close()


def insert_project(p: Dict[str, Any], milestones: List[Dict[str, Any]]):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT OR REPLACE INTO projects (
        project_id, title, state, district, sector, implementing_agency,
        sanction_date, scheduled_completion_date, actual_or_current_date,
        sanctioned_amount, estimated_cost, expenditure_to_date, physical_progress_pct,
        status, latitude, longitude, cost_overrun_pct, delay_days,
        spending_vs_progress_mismatch_pct, composite_risk_score, risk_level,
        anomaly_flags_count, xai_explanation, recommended_action, factors_json,
        isolation_forest_outlier, duplicate_risk_detected, duplicate_with_project_id,
        contractor_total_district_allocation, contractor_active_projects_count,
        audit_notes, last_reviewed_by, review_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        p['project_id'], p['title'], p['state'], p['district'], p['sector'], p['implementing_agency'],
        p['sanction_date'], p['scheduled_completion_date'], p['actual_or_current_date'],
        p['sanctioned_amount'], p['estimated_cost'], p['expenditure_to_date'], p['physical_progress_pct'],
        p['status'], p['latitude'], p['longitude'], p['cost_overrun_pct'], p['delay_days'],
        p['spending_vs_progress_mismatch_pct'], p['composite_risk_score'], p['risk_level'],
        p['anomaly_flags_count'], p['xai_explanation'], p['recommended_action'],
        json.dumps(p['factors']), 1 if p.get('isolation_forest_outlier') else 0,
        1 if p.get('duplicate_risk_detected') else 0, p.get('duplicate_with_project_id'),
        p.get('contractor_total_district_allocation', 0.0), p.get('contractor_active_projects_count', 1),
        p.get('audit_notes'), p.get('last_reviewed_by'), p.get('review_status', 'PENDING')
    ))

    cursor.execute("DELETE FROM payment_milestones WHERE project_id = ?", (p['project_id'],))
    for m in milestones:
        cursor.execute("""
        INSERT INTO payment_milestones (milestone_id, project_id, date, amount, description, physical_progress_claimed)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (m['milestone_id'], p['project_id'], m['date'], m['amount'], m['description'], m['physical_progress_claimed']))

    conn.commit()
    conn.close()


def insert_alert(alert: Dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO alerts (
        alert_id, project_id, project_title, district, state,
        risk_level, risk_score, anomaly_type, headline, detail,
        created_at, status, officer_remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        alert['alert_id'], alert['project_id'], alert['project_title'], alert['district'], alert['state'],
        alert['risk_level'], alert['risk_score'], alert['anomaly_type'], alert['headline'], alert['detail'],
        alert['created_at'], alert.get('status', 'PENDING'), alert.get('officer_remarks')
    ))
    conn.commit()
    conn.close()


def query_projects(
    search: Optional[str] = None,
    risk_level: Optional[str] = None,
    district: Optional[str] = None,
    sector: Optional[str] = None,
    state: Optional[str] = None,
    sort_by: str = "composite_risk_score",
    ascending: bool = False,
    limit: int = 250
) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()

    conditions = []
    params = []

    if search:
        conditions.append("(project_id LIKE ? OR title LIKE ? OR implementing_agency LIKE ?)")
        term = f"%{search}%"
        params.extend([term, term, term])
    if risk_level and risk_level != "ALL":
        conditions.append("risk_level = ?")
        params.append(risk_level)
    if district and district != "ALL":
        conditions.append("district = ?")
        params.append(district)
    if sector and sector != "ALL":
        conditions.append("sector = ?")
        params.append(sector)
    if state and state != "ALL":
        conditions.append("state = ?")
        params.append(state)

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    direction = "ASC" if ascending else "DESC"

    # Sanitize sort_by column
    allowed_sort_cols = {
        "composite_risk_score", "sanctioned_amount", "expenditure_to_date",
        "physical_progress_pct", "cost_overrun_pct", "delay_days",
        "spending_vs_progress_mismatch_pct", "sanction_date"
    }
    order_col = sort_by if sort_by in allowed_sort_cols else "composite_risk_score"

    query = f"""
    SELECT * FROM projects
    {where_clause}
    ORDER BY {order_col} {direction}
    LIMIT ?
    """
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        d = dict(r)
        d['isolation_forest_outlier'] = bool(d['isolation_forest_outlier'])
        d['duplicate_risk_detected'] = bool(d['duplicate_risk_detected'])
        result.append(d)
    return result


def query_project_detail(project_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM projects WHERE project_id = ?", (project_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    p = dict(row)
    p['factors'] = json.loads(p['factors_json'])
    p['isolation_forest_outlier'] = bool(p['isolation_forest_outlier'])
    p['duplicate_risk_detected'] = bool(p['duplicate_risk_detected'])

    # Build nested risk_analysis object expected by frontend inspect modal
    p['risk_analysis'] = {
        'composite_risk_score': p['composite_risk_score'],
        'risk_level': p['risk_level'],
        'factors': p['factors'],
        'xai_explanation': p['xai_explanation'],
        'recommended_action': p['recommended_action'],
        'isolation_forest_outlier': p['isolation_forest_outlier'],
        'duplicate_risk_detected': p['duplicate_risk_detected'],
        'duplicate_with_project_id': p.get('duplicate_with_project_id'),
    }

    cursor.execute("SELECT * FROM payment_milestones WHERE project_id = ? ORDER BY date ASC", (project_id,))
    milestone_rows = cursor.fetchall()
    p['payment_history'] = [dict(m) for m in milestone_rows]

    conn.close()
    return p


def update_alert(alert_id: str, status: str, remarks: str, reviewer: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT project_id FROM alerts WHERE alert_id = ?", (alert_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
    project_id = row['project_id']

    cursor.execute("""
    UPDATE alerts SET status = ?, officer_remarks = ? WHERE alert_id = ?
    """, (status, remarks, alert_id))

    cursor.execute("""
    UPDATE projects SET review_status = ?, audit_notes = ?, last_reviewed_by = ? WHERE project_id = ?
    """, (status, remarks, reviewer, project_id))

    cursor.execute("""
    INSERT INTO audit_logs (project_id, action, officer_name, timestamp, remarks)
    VALUES (?, ?, ?, datetime('now'), ?)
    """, (project_id, f"ALERT_{status}", reviewer, remarks))

    conn.commit()
    conn.close()
    return True


def query_alerts(status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()

    if status_filter and status_filter != "ALL":
        cursor.execute("SELECT * FROM alerts WHERE status = ? ORDER BY risk_score DESC", (status_filter,))
    else:
        cursor.execute("SELECT * FROM alerts ORDER BY risk_score DESC")

    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_summary_metrics() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT 
        COUNT(*) as total_projects,
        SUM(sanctioned_amount) as total_sanctioned,
        SUM(expenditure_to_date) as total_expenditure,
        SUM(CASE WHEN risk_level = 'LOW' THEN 1 ELSE 0 END) as low_count,
        SUM(CASE WHEN risk_level = 'MEDIUM' THEN 1 ELSE 0 END) as med_count,
        SUM(CASE WHEN risk_level = 'HIGH' THEN 1 ELSE 0 END) as high_count,
        SUM(CASE WHEN risk_level = 'CRITICAL' THEN 1 ELSE 0 END) as crit_count,
        SUM(CASE WHEN delay_days > 90 THEN 1 ELSE 0 END) as severe_delays,
        SUM(CASE WHEN cost_overrun_pct > 15.0 THEN 1 ELSE 0 END) as cost_overruns,
        SUM(CASE WHEN spending_vs_progress_mismatch_pct > 25.0 THEN 1 ELSE 0 END) as progress_mismatches,
        SUM(CASE WHEN sanctioned_amount >= 475000 AND sanctioned_amount < 500000 THEN 1 ELSE 0 END) as tender_bypasses,
        SUM(CASE WHEN duplicate_risk_detected = 1 THEN 1 ELSE 0 END) as duplicate_suspects,
        SUM(CASE WHEN anomaly_flags_count > 0 THEN 1 ELSE 0 END) as total_anomalies
    FROM projects
    """)
    row = cursor.fetchone()
    conn.close()

    total_sanct = float(row['total_sanctioned'] or 0.0)
    total_exp = float(row['total_expenditure'] or 0.0)
    ratio = (total_exp / total_sanct * 100.0) if total_sanct > 0 else 0.0

    return {
        "total_projects": row['total_projects'] or 0,
        "total_sanctioned_amount": total_sanct,
        "total_expenditure_amount": total_exp,
        "overall_expenditure_ratio_pct": round(ratio, 2),
        "risk_counts": {
            "LOW": row['low_count'] or 0,
            "MEDIUM": row['med_count'] or 0,
            "HIGH": row['high_count'] or 0,
            "CRITICAL": row['crit_count'] or 0
        },
        "total_anomalies_flagged": row['total_anomalies'] or 0,
        "total_severe_delays": row['severe_delays'] or 0,
        "total_cost_overruns": row['cost_overruns'] or 0,
        "total_progress_mismatches": row['progress_mismatches'] or 0,
        "total_tender_bypasses": row['tender_bypasses'] or 0,
        "total_duplicate_suspects": row['duplicate_suspects'] or 0
    }


def get_district_risk_aggregation() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT 
        district,
        state,
        COUNT(*) as total_projects,
        SUM(sanctioned_amount) as total_sanctioned,
        SUM(expenditure_to_date) as total_expenditure,
        AVG(composite_risk_score) as avg_risk_score,
        SUM(CASE WHEN risk_level = 'HIGH' THEN 1 ELSE 0 END) as high_risk_projects_count,
        SUM(CASE WHEN risk_level = 'CRITICAL' THEN 1 ELSE 0 END) as critical_risk_projects_count
    FROM projects
    GROUP BY district, state
    ORDER BY avg_risk_score DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        d = dict(r)
        d['avg_risk_score'] = round(d['avg_risk_score'], 1)
        # Determine dominant risk type
        if d['critical_risk_projects_count'] >= 3:
            d['dominant_risk_type'] = "Progress Discrepancy & Tender Splitting"
        elif d['avg_risk_score'] > 45:
            d['dominant_risk_type'] = "Cost Overruns & Delays"
        else:
            d['dominant_risk_type'] = "Nominal Execution"
        result.append(d)
    return result


def get_state_risk_aggregation() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT 
        state,
        COUNT(DISTINCT district) as total_districts,
        COUNT(*) as total_projects,
        SUM(sanctioned_amount) as total_sanctioned,
        SUM(expenditure_to_date) as total_expenditure,
        AVG(composite_risk_score) as avg_risk_score,
        SUM(CASE WHEN risk_level = 'CRITICAL' THEN 1 ELSE 0 END) as critical_projects_count
    FROM projects
    GROUP BY state
    ORDER BY avg_risk_score DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        d = dict(r)
        d['avg_risk_score'] = round(d['avg_risk_score'], 1)
        result.append(d)
    return result


def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def log_system_audit(action: str, officer_name: str, remarks: str, project_id: str = "SYSTEM"):
    from datetime import datetime
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO audit_logs (project_id, action, officer_name, timestamp, remarks)
    VALUES (?, ?, ?, ?, ?)
    """, (project_id, action, officer_name, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), remarks))
    conn.commit()
    conn.close()


def query_audit_logs(limit: int = 100) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY log_id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
