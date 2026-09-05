"""
Realistic MPLADS Dataset Generator & Anomaly Injection Pipeline
Smart India Hackathon 2026 - Problem Statement 26102
Generates 250 diverse projects with real-world fraud and inefficiency patterns.
"""

import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any

from database import init_db, insert_project, insert_alert
from features import extract_mplads_features
from ml_engine import MpladsMLEngine
from risk_scorer import calculate_project_risk

# District-State Mapping with realistic geographic coordinates
DISTRICTS = [
    {"district": "Pune", "state": "Maharashtra", "lat": 18.5204, "lon": 73.8567},
    {"district": "Nagpur", "state": "Maharashtra", "lat": 21.1458, "lon": 79.0882},
    {"district": "Thane", "state": "Maharashtra", "lat": 19.2183, "lon": 72.9781},
    {"district": "Nashik", "state": "Maharashtra", "lat": 19.9975, "lon": 73.7898},
    {"district": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8467, "lon": 80.9462},
    {"district": "Varanasi", "state": "Uttar Pradesh", "lat": 25.3176, "lon": 82.9739},
    {"district": "Kanpur Nagar", "state": "Uttar Pradesh", "lat": 26.4499, "lon": 80.3319},
    {"district": "Gorakhpur", "state": "Uttar Pradesh", "lat": 26.7606, "lon": 83.3732},
    {"district": "Bengaluru Urban", "state": "Karnataka", "lat": 12.9716, "lon": 77.5946},
    {"district": "Mysuru", "state": "Karnataka", "lat": 12.2958, "lon": 76.6394}
]

SECTORS = [
    "Roads & Bridges",
    "Drinking Water",
    "Education & Schools",
    "Public Health",
    "Sanitation & Drainage",
    "Community Centers"
]

AGENCIES = [
    "PWD Division 1",
    "District Rural Development Agency (DRDA)",
    "Zilla Parishad Engineering Cell",
    "Apex Civil Infrastructure Ltd",
    "Pragati Nirman Syndicate",
    "Vikas Urban Builders",
    "Bharat Municipal Infra Works"
]

TITLES_TEMPLATES = {
    "Roads & Bridges": [
        "Construction of CC Road from {landmark} to {destination}",
        "Bituminous Black-topping of Approach Road near {landmark}",
        "Widening and Paving of Village Link Road at {destination}",
        "Construction of Box Culvert and Drainage on Road to {destination}"
    ],
    "Drinking Water": [
        "Installation of High-Capacity Solar Dual Pump Borewell at {landmark}",
        "Laying of Drinking Water Distribution Pipeline in Sector {num}",
        "Construction of Overhead Water Reservoir (50,000L) near {landmark}",
        "Installation of Community RO Drinking Water Plant at {destination}"
    ],
    "Education & Schools": [
        "Construction of 2 Additional Classrooms at Govt High School {destination}",
        "Development of Science Laboratory & Smart Room at {destination}",
        "Construction of Compound Wall & Boys Toilet Block at Primary School {landmark}",
        "Renovation of Library and Solar Electrification at Govt College {destination}"
    ],
    "Public Health": [
        "Construction of Sub-Health Center Building at {destination}",
        "Procurement of Basic Diagnostic Equipment & Cold Chain for PHC {landmark}",
        "Upgradation of Maternity Ward & Solar Backup at Community Health Center {destination}",
        "Civil Repairs and Sanitation Facility for Veterinary Dispensary {landmark}"
    ],
    "Sanitation & Drainage": [
        "Construction of Underground Covered Stormwater Drainage along {landmark}",
        "Installation of Community Modern Sanitation Complex at {destination}",
        "Construction of Solid-Liquid Waste Management Facility at Village {destination}",
        "Desilting and Stone Pitching of Inflow Drain Channel at {landmark}"
    ],
    "Community Centers": [
        "Construction of Multi-purpose Community Hall (Samaj Mandir) at {destination}",
        "Development of Open Gymnasium and Youth Sports Complex near {landmark}",
        "Construction of Senior Citizen Recreation Center at Ward {num}",
        "Renovation of Gram Panchayat Bhavan and Public Library at {destination}"
    ]
}

LANDMARKS = ["Hanuman Temple", "Bus Stand", "Gram Panchayat Office", "Primary School", "Main Market Chowk", "Railway Crossing"]
DESTINATIONS = ["Shivaji Nagar", "Rampur Village", "Gandhi Nagar", "Kisan Chowk", "Nehru Ward", "Adarsh Basti", "Kalyan Vihar"]

def generate_mplads_data(n_projects: int = 250) -> pd.DataFrame:
    random.seed(42)
    np.random.seed(42)

    records = []
    base_date = datetime(2024, 1, 1)

    for i in range(1, n_projects + 1):
        proj_id = f"MPLAD-2026-{1000 + i}"
        dist_meta = random.choice(DISTRICTS)
        district = dist_meta['district']
        state = dist_meta['state']
        sector = random.choice(SECTORS)
        agency = random.choice(AGENCIES)

        # Monopolistic contractor bias in some districts to trigger cartelization detection
        if district in ["Lucknow", "Pune"] and random.random() < 0.45:
            agency = "Apex Civil Infrastructure Ltd"
        elif district in ["Varanasi", "Gorakhpur"] and random.random() < 0.45:
            agency = "Pragati Nirman Syndicate"

        tmpl = random.choice(TITLES_TEMPLATES[sector])
        title = tmpl.format(
            landmark=random.choice(LANDMARKS),
            destination=random.choice(DESTINATIONS),
            num=random.randint(1, 15)
        )

        # Generate realistic timeline
        sanction_offset_days = random.randint(30, 700)
        sanction_date = base_date + timedelta(days=sanction_offset_days)
        duration_days = random.randint(60, 240)
        scheduled_completion = sanction_date + timedelta(days=duration_days)
        
        # Today's reference date
        current_date = datetime(2026, 3, 1)

        # Default healthy parameters
        sanctioned_amount = float(random.randint(800000, 4500000))
        estimated_cost = sanctioned_amount * random.uniform(0.92, 1.02)
        expenditure_to_date = sanctioned_amount * random.uniform(0.40, 0.90)
        physical_progress_pct = min(100.0, (expenditure_to_date / sanctioned_amount * 100.0) + random.uniform(-5.0, 8.0))
        physical_progress_pct = max(10.0, physical_progress_pct)
        delay_days = max(0, (current_date - scheduled_completion).days if current_date > scheduled_completion else 0)

        # -------------------------------------------------------------
        # INJECT CALIBRATED ANOMALY SCENARIOS
        # -------------------------------------------------------------
        scenario_dice = random.random()

        # Scenario 1: Tender Splitting (Right under ₹5 Lakhs threshold) ~10%
        if scenario_dice < 0.10:
            sanctioned_amount = float(random.randint(478000, 498500))
            estimated_cost = sanctioned_amount * 0.98
            expenditure_to_date = sanctioned_amount * random.uniform(0.70, 0.95)
            duration_days = random.randint(7, 18)  # Suspiciously quick duration
            scheduled_completion = sanction_date + timedelta(days=duration_days)
            physical_progress_pct = random.uniform(40.0, 75.0)
            delay_days = max(0, (current_date - scheduled_completion).days)

        # Scenario 2: Spending vs Physical Progress Mismatch (Disbursed funds, low ground work) ~12%
        elif scenario_dice < 0.22:
            sanctioned_amount = float(random.randint(1500000, 4800000))
            estimated_cost = sanctioned_amount * 1.05
            expenditure_to_date = sanctioned_amount * random.uniform(0.85, 0.98) # Almost 90-95% spent
            physical_progress_pct = random.uniform(15.0, 32.0) # But only 20% work actually built!
            delay_days = random.randint(120, 280)

        # Scenario 3: Massive Cost Overrun & Chronic Delay ~10%
        elif scenario_dice < 0.32:
            estimated_cost = float(random.randint(1000000, 3000000))
            sanctioned_amount = estimated_cost * 1.10
            # Expenditure has skyrocketed 40% to 70% above estimate
            expenditure_to_date = estimated_cost * random.uniform(1.40, 1.70)
            physical_progress_pct = random.uniform(60.0, 85.0)
            delay_days = random.randint(180, 420)

        # Geographic coordinates with small local jitter (+/- 0.05 deg ~ 5km)
        lat = dist_meta['lat'] + random.uniform(-0.04, 0.04)
        lon = dist_meta['lon'] + random.uniform(-0.04, 0.04)

        status = "Completed" if physical_progress_pct >= 98.0 else ("Delayed" if delay_days > 45 else "In Progress")

        records.append({
            'project_id': proj_id,
            'title': title,
            'state': state,
            'district': district,
            'sector': sector,
            'implementing_agency': agency,
            'sanction_date': sanction_date.strftime("%Y-%m-%d"),
            'scheduled_completion_date': scheduled_completion.strftime("%Y-%m-%d"),
            'actual_or_current_date': current_date.strftime("%Y-%m-%d"),
            'sanctioned_amount': round(sanctioned_amount, 2),
            'estimated_cost': round(estimated_cost, 2),
            'expenditure_to_date': round(expenditure_to_date, 2),
            'physical_progress_pct': round(physical_progress_pct, 1),
            'duration_days': duration_days,
            'delay_days': delay_days,
            'status': status,
            'latitude': round(lat, 5),
            'longitude': round(lon, 5)
        })

    df = pd.DataFrame(records)

    # -------------------------------------------------------------
    # INJECT EXPLICIT DUPLICATE WORKS (~5 pairs)
    # -------------------------------------------------------------
    duplicate_indices = [(12, 13), (45, 46), (88, 89), (142, 143), (205, 206)]
    for idx_a, idx_b in duplicate_indices:
        if idx_b < len(df):
            # Make title nearly identical and set coordinates < 500m apart
            df.loc[idx_b, 'district'] = df.loc[idx_a, 'district']
            df.loc[idx_b, 'state'] = df.loc[idx_a, 'state']
            df.loc[idx_b, 'sector'] = df.loc[idx_a, 'sector']
            df.loc[idx_b, 'latitude'] = df.loc[idx_a, 'latitude'] + 0.002
            df.loc[idx_b, 'longitude'] = df.loc[idx_a, 'longitude'] + 0.001
            # Slightly rephrase title to simulate duplicate work sanctioned twice
            base_t = df.loc[idx_a, 'title']
            df.loc[idx_b, 'title'] = base_t.replace("Construction of", "Development and Construction of")

    return df


def generate_milestones(project: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generates 3 to 5 realistic payment milestones for a project."""
    total_exp = project['expenditure_to_date']
    total_prog = project['physical_progress_pct']
    sanct_dt = datetime.strptime(project['sanction_date'], "%Y-%m-%d")

    num_milestones = random.randint(3, 5)
    splits = sorted([random.random() for _ in range(num_milestones - 1)])
    splits = [0.0] + splits + [1.0]

    milestones = []
    descriptions = [
        "Initial Mobilization Advance & Site Layout Approval",
        "Foundation, Earthwork & Sub-structure Inspection Clearance",
        "Intermediate Structural Work & Material Supply Certification",
        "Super-structure Completion & Quality Control Audit",
        "Final Finishing, Testing & Pre-handover Inspection"
    ]

    for m in range(num_milestones):
        m_amt = total_exp * (splits[m + 1] - splits[m])
        m_prog = total_prog * splits[m + 1]
        m_date = sanct_dt + timedelta(days=int(project['duration_days'] * splits[m + 1]))

        milestones.append({
            "milestone_id": f"MS-{project['project_id']}-{m + 1}",
            "date": m_date.strftime("%Y-%m-%d"),
            "amount": round(m_amt, 2),
            "description": descriptions[m % len(descriptions)],
            "physical_progress_claimed": round(m_prog, 1)
        })

    return milestones


def build_and_populate_database():
    print("[1/5] Initializing SQLite database schema...")
    init_db()

    print("[2/5] Generating 250 realistic MPLADS projects with fraud scenarios...")
    df = generate_mplads_data(250)

    print("[3/5] Extracting multi-vector governance features...")
    feature_matrix = extract_mplads_features(df)

    print("[4/5] Training Isolation Forest & detecting duplicate works...")
    ml_engine = MpladsMLEngine(contamination=0.12, random_state=42)
    iso_preds, iso_scores = ml_engine.fit_isolation_forest(feature_matrix)
    duplicates = ml_engine.detect_duplicate_works(df)

    # Index duplicates by project_id
    dup_map = {}
    for d in duplicates:
        dup_map[d['proj_a']] = d
        dup_map[d['proj_b']] = d

    print("[5/5] Computing explainable risk scores and populating database...")
    for idx, row in df.iterrows():
        p_dict = row.to_dict()
        p_id = p_dict['project_id']
        dup_info = dup_map.get(p_id)

        # Risk Calculation & XAI
        risk_analysis = calculate_project_risk(
            project_row=p_dict,
            iso_pred=int(iso_preds[idx]),
            iso_score=float(iso_scores[idx]),
            duplicate_info=dup_info
        )

        p_dict['cost_overrun_pct'] = round(float(feature_matrix.loc[idx, 'cost_overrun_pct']), 1)
        p_dict['delay_days'] = int(p_dict['delay_days'])
        p_dict['spending_vs_progress_mismatch_pct'] = round(float(feature_matrix.loc[idx, 'spending_vs_progress_mismatch']), 1)
        p_dict['composite_risk_score'] = risk_analysis.composite_risk_score
        p_dict['risk_level'] = risk_analysis.risk_level.value
        p_dict['xai_explanation'] = risk_analysis.xai_explanation
        p_dict['recommended_action'] = risk_analysis.recommended_action
        p_dict['factors'] = [f.model_dump() for f in risk_analysis.factors]
        p_dict['isolation_forest_outlier'] = risk_analysis.isolation_forest_outlier
        p_dict['duplicate_risk_detected'] = risk_analysis.duplicate_risk_detected
        p_dict['duplicate_with_project_id'] = risk_analysis.duplicate_with_project_id

        # Count active anomalies
        anomaly_count = sum(1 for f in risk_analysis.factors if f.is_anomaly)
        p_dict['anomaly_flags_count'] = anomaly_count

        # Agency summary stats
        p_dict['contractor_total_district_allocation'] = float(df[df['district'] == p_dict['district']]['sanctioned_amount'].sum())
        p_dict['contractor_active_projects_count'] = int(len(df[(df['district'] == p_dict['district']) & (df['implementing_agency'] == p_dict['implementing_agency'])]))

        # Generate milestones
        milestones = generate_milestones(p_dict)

        # Insert project and milestones into DB
        insert_project(p_dict, milestones)

        # If Critical or High Risk, automatically generate an Alert
        if risk_analysis.risk_level.value in ["CRITICAL", "HIGH"]:
            primary_factor = max(risk_analysis.factors, key=lambda f: f.score_contribution)
            insert_alert({
                "alert_id": f"ALT-{p_id}",
                "project_id": p_id,
                "project_title": p_dict['title'],
                "district": p_dict['district'],
                "state": p_dict['state'],
                "risk_level": risk_analysis.risk_level.value,
                "risk_score": risk_analysis.composite_risk_score,
                "anomaly_type": primary_factor.factor_name,
                "headline": f"{risk_analysis.risk_level.value} Risk: {primary_factor.factor_name}",
                "detail": risk_analysis.xai_explanation,
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "status": "PENDING"
            })

    print(f"\n[OK] Successfully populated database with {len(df)} MPLADS projects!")
    print(f"[OK] Duplicate suspects detected: {len(duplicates)}")


if __name__ == "__main__":
    build_and_populate_database()
