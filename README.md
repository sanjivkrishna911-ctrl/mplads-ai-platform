#  MPLADS AI Monitor – Secure Governance Intelligence Platform

> **Smart India Hackathon 2026** • **Problem Statement 26102**  
> *AI-Assisted Anomaly Detection, Expenditure Verification & Governance Decision-Support System for MPLADS*

[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-2.0-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v3-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

##  Executive Summary & Core Philosophy

The **Members of Parliament Local Area Development Scheme (MPLADS)** enables Members of Parliament to recommend developmental works in their constituencies. Monitoring tens of thousands of simultaneous projects across hundreds of districts presents significant oversight challenges:

- **Spending vs. Progress Mismatches**: Milestone disbursements released without commensurate certified ground execution.
- **Tender Splitting**: Works artificially split into chunks of ₹4.75L–₹4.98L to circumvent mandatory statutory e-tendering (> ₹5 Lakh threshold).
- **Chronic Delays & Budget Overruns**: Unsanctioned timeline inflation and compounding cost deviations.
- **Contractor Monopoly**: Excessive allocation concentration awarded to specific implementing agencies.

###  Core Philosophy: Decision Support, Not Automated Accusation
This system does **NOT** autonomously declare fraud or penalize implementing agencies.  
Instead, it functions as a **secure decision-support telemetry platform**:
1. Flags statistical discrepancies and potential anomalies with mathematical transparency.
2. Assigns a standardized **Composite Risk Score (0–100)**.
3. Explains **WHY** a project is flagged using natural-language Explainable AI (XAI) factors.
4. Generates prescriptive legal and administrative recommendations for the District Collector (DM/DC).
5. Human officers retain final determination authority, with every action logged in an immutable audit trail.

---

##  Key Features

| Feature | Description |
|---|---|
| **Interactive India District Risk Map** | Pure SVG interactive map displaying state regions and district-level risk telemetry hotspots with hover tooltips and 1-click filtering. |
| **Lightweight Risk Visualizations** | Client-side Chart.js charts: 0–100 Risk Band Distribution (Donut) and Sector-wise Funds Released vs. Physical Progress (Bar). |
| **Project Evidence Dossier (Inspect View)** | Detailed audit dossier showing financial data, progress metrics, WHY FLAGGED breakdown, and prescriptive remediation advice. |
| **Multi-Tier Role-Based Access (RBAC)** | Central MoSPI Admin (National), State Planning Officers (State-level), and District Magistrates / Collectors (District-level). |
| **Executive Alert Triage Workflow** | Official review interface allowing officers to triage alerts (`UNDER_REVIEW`, `ESCALATED`, `RESOLVED`) with rationale notes. |
| **Immutable Governance Audit Trail** | Tamper-evident chain of custody logging officer identity, timestamp, action type, and remarks. |
| **Dual Theme System** | Clean government portal aesthetics supporting both **Dark Mode** and **Light Mode**. |

---

##  Transparent Scoring Methodology (0–100 Scale)

The Composite Risk Engine calculates defensible, explainable indicators mapped directly to statutory guidelines:

$$\text{Risk Score} = W_{\text{mismatch}} (25\%) + W_{\text{overrun}} (20\%) + W_{\text{delay}} (15\%) + W_{\text{tender}} (15\%) + W_{\text{agency}} (15\%) + W_{\text{ml}} (10\%)$$

```
┌────────────────────────────────────────────────────────┬───────────────┐
│ Evaluation Factor                                      │ Maximum Score │
├────────────────────────────────────────────────────────┼───────────────┤
│ 1. Spending vs. Physical Progress Mismatch (Gap >20%)  │ 25 Points     │
│ 2. Cost Overrun Deviation past Sanctioned Budget       │ 20 Points     │
│ 3. Timeline Delay past Contractual Deadline            │ 15 Points     │
│ 4. Statutory Tender Splitting Bypass (< ₹5 Lakh)       │ 15 Points     │
│ 5. Contractor District Allocation Concentration        │ 15 Points     │
│ 6. Multivariate Isolation Forest ML Outlier Score      │ 10 Points     │
└────────────────────────────────────────────────────────┴───────────────┘
```

---

##  Demo Credentials (RBAC)

The platform comes pre-seeded with authorized government accounts:

| Role | Username | Password | Jurisdiction | Department |
|---|---|---|---|---|
| **Central Admin** | `admin` | `admin123` | National (All India) | Ministry of Statistics & Programme Implementation (MoSPI) |
| **State Officer** | `state_mh` | `state123` | Maharashtra State | State Planning Department, Maharashtra |
| **District Officer** | `dc_pune` | `pune123` | Pune District | Office of District Magistrate & Collector, Pune |
| **District Officer** | `dc_kanpur` | `kanpur123` | Kanpur Nagar District | District Magistrate & Collectorate, Kanpur Nagar |

---

##  Quick Start & Installation

### Prerequisites
- Python 3.11 or higher
- Modern web browser (Chrome, Edge, Firefox, Safari)

### Option 1: One-Click Run (Windows)
Double-click `run_platform.bat` or run in PowerShell:
```powershell
.\run.ps1
```
This automatically initializes the SQLite database, validates dependencies, launches the FastAPI server, and opens `http://127.0.0.1:8000` in your default browser.

### Option 2: Manual Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/mplads-ai-platform.git
   cd mplads-ai-platform
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the server**:
   ```bash
   cd backend
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

4. **Access the platform**:
   Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in your browser.

---

##  Repository Structure

```
mplads-ai-platform/
├── backend/
│   ├── main.py              # FastAPI REST endpoints & authentication
│   ├── database.py          # SQLite persistence & query optimizations
│   ├── risk_scorer.py       # Deterministic XAI composite scoring engine
│   ├── ml_engine.py         # Scikit-Learn Isolation Forest outlier detector
│   ├── features.py          # Feature extraction & geospatial distance utils
│   ├── schemas.py           # Pydantic data contracts & validation schemas
│   ├── data_generator.py    # Realistic MPLADS public works synthetic generator
│   └── mplads.db            # Seeded SQLite database (WAL mode)
├── frontend/
│   └── static/
│       ├── index.html       # HTML5 single-page application shell
│       ├── app.js           # React 18 frontend (Charts, India Map, RBAC, Modals)
│       └── styles.css       # Clean government styling (Dark & Light mode)
├── requirements.txt         # Production Python dependencies
├── run_platform.bat         # Windows one-click batch launcher
├── run.ps1                  # PowerShell execution script
├── .gitignore               # Git exclusion rules
└── README.md                # Project documentation
```

---

##  REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate official credentials & issue session token |
| `POST` | `/api/auth/logout` | Terminate session and record sign-out event |
| `GET` | `/api/risk-summary` | Aggregated metrics, expenditure ratios & risk counts |
| `GET` | `/api/projects` | Filterable, sortable list of monitored public works |
| `GET` | `/api/projects/{id}` | Full project dossier with milestones & factor explanations |
| `GET` | `/api/district-risk` | District-level risk index ranking & anomaly patterns |
| `GET` | `/api/state-risk` | State-level aggregation metrics |
| `GET` | `/api/alerts` | Active governance alerts requiring review |
| `PATCH`| `/api/alerts/{id}/review` | Log official triage action & escalation notes |
| `GET` | `/api/audit-logs` | Immutable audit trail of governance actions |
| `GET` | `/api/anomalies` | Clustered risk vectors and sample flagged works |
| `GET` | `/api/analytics` | Analytical distributions for chart rendering |

---

##  Hackathon Context

- **Event**: Smart India Hackathon (SIH) 2026
- **Problem Statement**: PS 26102 — AI Anomaly Detection in MPLADS
- **Target Beneficiaries**: Ministry of Statistics and Programme Implementation (MoSPI), State Monitoring Cells, District Planning Committees, and Citizens.

---

##  License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
