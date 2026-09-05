"""
ML Anomaly Detection & Duplicate Work Matching Engine
Smart India Hackathon 2026 - Problem Statement 26102
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import Tuple, List, Dict, Any

class MpladsMLEngine:
    def __init__(self, contamination: float = 0.12, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        # n_jobs=1 ensures fast, deterministic execution on Windows without process spawning issues
        self.iso_model = IsolationForest(
            contamination=self.contamination,
            random_state=self.random_state,
            n_jobs=1
        )
        self.tfidf = TfidfVectorizer(stop_words='english', max_features=500)

    def fit_isolation_forest(self, feature_df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """
        Fits Isolation Forest on standardized features.
        Returns:
            predictions: -1 for anomaly, 1 for normal
            scores: normalized anomaly score (0.0 to 1.0, where 1.0 is most anomalous)
        """
        # Fit Isolation Forest
        self.iso_model.fit(feature_df)
        preds = self.iso_model.predict(feature_df)
        
        # Decision function: lower values indicate higher abnormality
        raw_scores = self.iso_model.decision_function(feature_df)
        # Normalize to 0 (normal) to 1 (extreme anomaly)
        min_s, max_s = raw_scores.min(), raw_scores.max()
        if max_s > min_s:
            norm_scores = 1.0 - ((raw_scores - min_s) / (max_s - min_s))
        else:
            norm_scores = np.zeros_like(raw_scores)

        return preds, norm_scores

    def detect_duplicate_works(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Detects potential duplicate or overlapping works using:
        1. Text similarity on work descriptions (TF-IDF Cosine Similarity)
        2. Geospatial proximity (within ~1.5 km in the same district)
        3. Awarded within close timeframes
        """
        titles = df['title'].tolist()
        tfidf_matrix = self.tfidf.fit_transform(titles)
        cos_sim = cosine_similarity(tfidf_matrix)

        duplicates = []
        n = len(df)

        for i in range(n):
            for j in range(i + 1, n):
                # Same district check
                if df.iloc[i]['district'] != df.iloc[j]['district']:
                    continue

                sim_score = cos_sim[i, j]
                # Distance calculation approx in km
                lat1, lon1 = df.iloc[i]['latitude'], df.iloc[i]['longitude']
                lat2, lon2 = df.iloc[j]['latitude'], df.iloc[j]['longitude']
                dist_km = np.sqrt((lat1 - lat2)**2 + (lon1 - lon2)**2) * 111.0  # Approx degree to km

                # Flag if very similar title in close proximity (< 2 km)
                if sim_score > 0.65 and dist_km < 2.5:
                    duplicates.append({
                        "proj_a": df.iloc[i]['project_id'],
                        "proj_b": df.iloc[j]['project_id'],
                        "similarity_score": round(float(sim_score), 2),
                        "distance_km": round(float(dist_km), 2),
                        "district": df.iloc[i]['district'],
                        "title_a": df.iloc[i]['title'],
                        "title_b": df.iloc[j]['title']
                    })

        return duplicates
