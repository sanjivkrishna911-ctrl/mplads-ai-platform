"""
Feature Engineering Module for MPLADS AI Platform
Smart India Hackathon 2026 - Problem Statement 26102
Expands baseline features with multi-vector governance risk metrics.
"""

import pandas as pd
import numpy as np
from typing import Tuple

def extract_mplads_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transforms raw MPLADS project data into ML-ready features.
    Builds upon baseline feature extraction with financial, progress, and agency metrics.
    """
    features = pd.DataFrame(index=df.index)

    # 1. Cost-to-Duration Ratio (Identifies overinflated quick-turnaround projects)
    duration = np.maximum(df['duration_days'].values, 1)
    features['cost_per_day'] = df['sanctioned_amount'].values / duration

    # 2. Proximity to Tender Limit (e.g., ₹5,00,000 statutory limit for e-tendering)
    # High score indicates artificial splitting to bypass public e-procurement
    features['tender_bypass_risk'] = np.where(
        (df['sanctioned_amount'] >= 475000) & (df['sanctioned_amount'] < 500000), 1.0, 0.0
    )

    # 3. Agency Project Count & Concentration Score (Monopoly of single contractor)
    agency_counts = df['implementing_agency'].value_counts()
    features['agency_project_count'] = df['implementing_agency'].map(agency_counts).values

    # Agency expenditure concentration in the district
    agency_district_exp = df.groupby(['district', 'implementing_agency'])['sanctioned_amount'].transform('sum')
    district_total_exp = df.groupby('district')['sanctioned_amount'].transform('sum')
    features['agency_district_share'] = (agency_district_exp / np.maximum(district_total_exp, 1)).fillna(0).values

    # 4. Financial Cost Overrun Percentage
    features['cost_overrun_pct'] = np.maximum(
        0.0,
        (df['expenditure_to_date'] - df['estimated_cost']) / np.maximum(df['estimated_cost'], 1) * 100.0
    ).values

    # 5. Timeline Delay (Days past scheduled completion)
    features['delay_days'] = np.maximum(0, df['delay_days'].values)

    # 6. Critical Spending vs. Physical Progress Mismatch
    # E.g., 90% funds released while physical completion is only 25%
    expenditure_ratio_pct = (df['expenditure_to_date'] / np.maximum(df['sanctioned_amount'], 1)) * 100.0
    features['spending_vs_progress_mismatch'] = np.maximum(
        0.0,
        expenditure_ratio_pct - df['physical_progress_pct']
    ).values

    # 7. Normalized Sanction Amount
    features['sanctioned_amount'] = df['sanctioned_amount'].values

    # Fill any potential NaN values
    return features.fillna(0.0)
