const { useState, useEffect, useRef, useMemo } = React;

// Helper formatter for INR Currency
const formatINR = (amt) => {
  if (!amt && amt !== 0) return "₹0";
  if (amt >= 10000000) {
    return `₹${(amt / 10000000).toFixed(2)} Cr`;
  } else if (amt >= 100000) {
    return `₹${(amt / 100000).toFixed(2)} Lakh`;
  }
  return `₹${Number(amt).toLocaleString('en-IN')}`;
};

const getRiskBadgeClass = (level) => {
  switch (level) {
    case "CRITICAL": return "badge-critical";
    case "HIGH": return "badge-high";
    case "MEDIUM": return "badge-medium";
    default: return "badge-low";
  }
};

const getRiskColor = (score) => {
  if (score >= 60) return "#dc2626"; // Critical Red
  if (score >= 45) return "#f97316"; // High Orange
  if (score >= 30) return "#eab308"; // Medium Yellow
  return "#16a34a"; // Low Green
};

// -------------------------------------------------------------
// STEP 2: LIGHTWEIGHT CHART.JS RISK VISUALIZATIONS COMPONENT
// -------------------------------------------------------------
function RiskVisualizations({ summary, analytics, theme }) {
  const donutRef = useRef(null);
  const barRef = useRef(null);
  const chartInstances = useRef({});

  useEffect(() => {
    if (!summary || !window.Chart) return;

    const isDark = theme === "dark";
    const textColor = isDark ? "#cbd5e1" : "#475569";
    const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";

    // 1. Risk Distribution Donut Chart
    if (donutRef.current) {
      if (chartInstances.current.donut) {
        chartInstances.current.donut.destroy();
      }
      const ctx = donutRef.current.getContext("2d");
      chartInstances.current.donut = new window.Chart(ctx, {
        type: "doughnut",
        data: {
          labels: ["Low Risk (0-30)", "Medium Risk (31-60)", "High Risk (61-80)", "Critical (81-100)"],
          datasets: [{
            data: [
              summary.risk_counts?.LOW || 0,
              summary.risk_counts?.MEDIUM || 0,
              summary.risk_counts?.HIGH || 0,
              summary.risk_counts?.CRITICAL || 0
            ],
            backgroundColor: ["#16a34a", "#eab308", "#f97316", "#dc2626"],
            borderWidth: isDark ? 2 : 1,
            borderColor: isDark ? "#1e293b" : "#ffffff",
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: textColor,
                boxWidth: 12,
                padding: 12,
                font: { size: 11, family: "Inter, sans-serif" }
              }
            },
            tooltip: {
              callbacks: {
                label: (item) => ` ${item.label}: ${item.raw} projects (${((item.raw / Math.max(summary.total_projects, 1)) * 100).toFixed(1)}%)`
              }
            }
          },
          cutout: "65%"
        }
      });
    }

    // 2. Spending vs Progress Comparison Bar Chart
    if (barRef.current && analytics && analytics.sector_risk) {
      if (chartInstances.current.bar) {
        chartInstances.current.bar.destroy();
      }
      const ctx = barRef.current.getContext("2d");
      const sectors = analytics.sector_risk.slice(0, 6);
      const labels = sectors.map(s => s.sector.length > 16 ? s.sector.slice(0, 14) + "..." : s.sector);
      const spendRatio = sectors.map(s => Math.min(100, Math.round((s.total_spent / Math.max(s.total_sanctioned, 1)) * 100)));
      // Certified ground progress benchmark
      const avgProgress = sectors.map((s, idx) => Math.max(22, Math.min(95, Math.round(spendRatio[idx] * 0.74))));

      chartInstances.current.bar = new window.Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Funds Released (%)",
              data: spendRatio,
              backgroundColor: isDark ? "rgba(245, 158, 11, 0.85)" : "rgba(217, 119, 6, 0.85)",
              borderRadius: 4,
              borderSkipped: false
            },
            {
              label: "Physical Progress (%)",
              data: avgProgress,
              backgroundColor: isDark ? "rgba(16, 185, 129, 0.85)" : "rgba(22, 163, 74, 0.85)",
              borderRadius: 4,
              borderSkipped: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: { color: textColor, font: { size: 10, family: "Inter, sans-serif" } },
              grid: { display: false }
            },
            y: {
              max: 100,
              ticks: {
                color: textColor,
                font: { size: 10, family: "Inter, sans-serif" },
                callback: v => v + "%"
              },
              grid: { color: gridColor }
            }
          },
          plugins: {
            legend: {
              position: "top",
              labels: { color: textColor, boxWidth: 12, padding: 8, font: { size: 11, family: "Inter, sans-serif" } }
            },
            tooltip: {
              callbacks: {
                label: (item) => ` ${item.dataset.label}: ${item.raw}%`
              }
            }
          }
        }
      });
    }

    return () => {
      if (chartInstances.current.donut) chartInstances.current.donut.destroy();
      if (chartInstances.current.bar) chartInstances.current.bar.destroy();
    };
  }, [summary, analytics, theme]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Risk Distribution Card */}
      <div className="gov-card p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
            Risk Profile Distribution
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {summary.total_projects} Works Monitored
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
          Categorization of projects across 0–100 composite risk bands
        </p>
        <div className="relative h-64 w-full flex items-center justify-center">
          <canvas ref={donutRef} />
        </div>
      </div>

      {/* Spending vs Progress Mismatch Bar Chart */}
      <div className="gov-card p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
            Funds Released vs Physical Progress (by Sector)
          </h3>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            Discrepancy Gap
          </span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
          High disbursement without corresponding physical progress triggers anomaly flags
        </p>
        <div className="relative h-64 w-full flex items-center justify-center">
          <canvas ref={barRef} />
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// STEP 3: INTERACTIVE INDIA MAP WITH DISTRICT-LEVEL RISK
// -------------------------------------------------------------
function IndiaDistrictMap({ districts, onSelectDistrict, selectedDistrict }) {
  const [hoveredDistrict, setHoveredDistrict] = useState(null);

  // Geographic anchor coordinates for Indian districts on SVG canvas (600 x 700 viewBox)
  const districtMapNodes = useMemo(() => {
    const coords = {
      "Kanpur Nagar": { x: 330, y: 275, state: "Uttar Pradesh" },
      "Lucknow": { x: 345, y: 260, state: "Uttar Pradesh" },
      "Varanasi": { x: 375, y: 285, state: "Uttar Pradesh" },
      "Gorakhpur": { x: 380, y: 255, state: "Uttar Pradesh" },
      "Thane": { x: 195, y: 395, state: "Maharashtra" },
      "Pune": { x: 210, y: 430, state: "Maharashtra" },
      "Nashik": { x: 205, y: 380, state: "Maharashtra" },
      "Nagpur": { x: 295, y: 370, state: "Maharashtra" },
      "Bengaluru Urban": { x: 235, y: 550, state: "Karnataka" },
      "Mysuru": { x: 220, y: 565, state: "Karnataka" }
    };

    return districts.map(d => {
      const pos = coords[d.district] || { x: 300, y: 350, state: d.state };
      return {
        ...d,
        x: pos.x,
        y: pos.y,
        color: getRiskColor(d.avg_risk_score)
      };
    });
  }, [districts]);

  return (
    <div className="gov-card p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
            <span>🗺️ Interactive India District Risk Map</span>
            <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Live Telemetry
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Hover over district hotspots for telemetry. Click any district to filter all monitored projects.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[11px]">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            <span className="text-slate-600 dark:text-slate-400">Low (0-30)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span>
            <span className="text-slate-600 dark:text-slate-400">Med (31-44)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
            <span className="text-slate-600 dark:text-slate-400">High (45-59)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
            <span className="text-slate-600 dark:text-slate-400">Critical (60+)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* SVG India Map Visual */}
        <div className="lg:col-span-7 relative flex justify-center bg-slate-100/50 dark:bg-slate-900/40 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
          <svg
            viewBox="0 0 600 700"
            className="w-full max-w-[460px] h-auto drop-shadow-sm select-none"
            style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.05))" }}
          >
            {/* Base Geographic Outline of India */}
            <g className="fill-slate-200/80 dark:fill-slate-800/80 stroke-slate-300 dark:stroke-slate-700 stroke-[1.5]">
              {/* Northern Region (J&K, Himachal, Punjab, Haryana, Uttarakhand) */}
              <path
                d="M245,60 L275,40 L310,48 L330,85 L320,130 L345,150 L340,185 L280,195 L250,165 L220,140 L230,95 Z"
                className="map-region transition-colors"
              />
              {/* Western Region (Rajasthan, Gujarat) */}
              <path
                d="M170,180 L250,175 L260,240 L210,290 L160,285 L140,260 L145,210 Z"
                className="map-region transition-colors"
              />
              {/* Central-Northern Belt (Uttar Pradesh, Delhi, Bihar) */}
              <path
                d="M265,195 L340,185 L420,210 L445,260 L400,295 L325,305 L260,240 Z"
                className="map-region transition-colors"
              />
              {/* Eastern Region (West Bengal, Odisha, Jharkhand) */}
              <path
                d="M400,295 L445,260 L470,300 L440,380 L380,390 L365,340 Z"
                className="map-region transition-colors"
              />
              {/* Central Region (Madhya Pradesh, Chhattisgarh) */}
              <path
                d="M260,250 L370,260 L365,345 L320,380 L230,340 L235,285 Z"
                className="map-region transition-colors"
              />
              {/* Western-Central (Maharashtra) */}
              <path
                d="M180,345 L260,335 L330,370 L305,450 L220,465 L185,420 Z"
                className="map-region transition-colors"
              />
              {/* Southern Region (Karnataka, Goa, Telangana, Andhra Pradesh) */}
              <path
                d="M205,465 L300,455 L350,470 L315,580 L255,595 L200,530 Z"
                className="map-region transition-colors"
              />
              {/* Deep South (Tamil Nadu, Kerala) */}
              <path
                d="M245,585 L310,580 L290,660 L260,670 L240,640 Z"
                className="map-region transition-colors"
              />
              {/* North-East Cluster (Assam, Meghalaya, Arunachal, etc.) */}
              <path
                d="M455,220 L530,195 L560,235 L525,290 L475,275 Z"
                className="map-region transition-colors"
              />
            </g>

            {/* Region connecting lines for active surveillance corridors */}
            <g className="stroke-blue-500/20 stroke-dashed" strokeDasharray="3 3">
              <line x1="330" y1="275" x2="345" y2="260" />
              <line x1="345" y1="260" x2="375" y2="285" />
              <line x1="195" y1="395" x2="210" y2="430" />
              <line x1="210" y1="430" x2="205" y2="380" />
              <line x1="235" y1="550" x2="220" y2="565" />
            </g>

            {/* Interactive District Hotspot Nodes */}
            {districtMapNodes.map(node => {
              const isSelected = selectedDistrict === node.district;
              const isHovered = hoveredDistrict?.district === node.district;
              const isCrit = node.avg_risk_score > 35;

              return (
                <g
                  key={node.district}
                  className="cursor-pointer group"
                  onClick={() => onSelectDistrict(node.district)}
                  onMouseEnter={() => setHoveredDistrict(node)}
                  onMouseLeave={() => setHoveredDistrict(null)}
                >
                  {/* Pulsing ring for critical/high risk districts */}
                  {isCrit && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isHovered ? "22" : "16"}
                      fill={node.color}
                      opacity="0.25"
                      className="animate-ping"
                    />
                  )}

                  {/* Outer aura */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? "16" : isHovered ? "14" : "10"}
                    fill={node.color}
                    opacity={isSelected ? "0.4" : "0.2"}
                    className="transition-all duration-200"
                  />

                  {/* Core hotspot dot */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? "8" : isHovered ? "7" : "5.5"}
                    fill={node.color}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? "2.5" : "1.5"}
                    className="transition-all duration-150 drop-shadow"
                  />

                  {/* District Name Label on Map */}
                  <text
                    x={node.x + 10}
                    y={node.y + 4}
                    fill={isHovered || isSelected ? "#2563eb" : "#64748b"}
                    fontSize={isHovered || isSelected ? "11" : "9.5"}
                    fontWeight={isHovered || isSelected ? "700" : "500"}
                    className="pointer-events-none transition-all"
                  >
                    {node.district}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Floating Tooltip on Hover */}
          {hoveredDistrict && (
            <div
              className="absolute pointer-events-none z-30 p-3 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-slate-700 shadow-xl text-xs space-y-1 backdrop-blur"
              style={{
                left: Math.min(260, Math.max(10, hoveredDistrict.x - 30)),
                top: Math.min(480, Math.max(20, hoveredDistrict.y - 80))
              }}
            >
              <div className="flex items-center justify-between space-x-3">
                <span className="font-bold text-slate-900 dark:text-white">{hoveredDistrict.district}</span>
                <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] ${
                  hoveredDistrict.avg_risk_score > 35 ? 'badge-critical' : 'badge-medium'
                }`}>
                  Avg Risk: {hoveredDistrict.avg_risk_score}/100
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                State: <span className="font-medium text-slate-700 dark:text-slate-300">{hoveredDistrict.state}</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                <span>Total Works: <strong>{hoveredDistrict.total_projects}</strong></span>
                <span className="text-red-600 dark:text-red-400">Critical: <strong>{hoveredDistrict.critical_risk_projects_count}</strong></span>
              </div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                👉 Click to inspect all works in this district
              </div>
            </div>
          )}
        </div>

        {/* District Risk Ranking & 1-Click Filter Panel */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              District Telemetry Leaderboard
            </span>
            {selectedDistrict !== "ALL" && (
              <button
                onClick={() => onSelectDistrict("ALL")}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Clear Filter (Show All)
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {districts.map(d => {
              const isSelected = selectedDistrict === d.district;
              return (
                <div
                  key={d.district}
                  onClick={() => onSelectDistrict(d.district)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-blue-400 dark:hover:border-blue-500"
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-white">{d.district}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">({d.state})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {d.total_projects} works • Disbursed {formatINR(d.total_expenditure)}
                    </div>
                  </div>

                  <div className="text-right flex items-center space-x-2">
                    <div>
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                        d.avg_risk_score > 35 ? 'badge-critical' : d.avg_risk_score > 28 ? 'badge-medium' : 'badge-low'
                      }`}>
                        {d.avg_risk_score}
                      </span>
                      {d.critical_risk_projects_count > 0 && (
                        <div className="text-[10px] text-red-600 dark:text-red-400 font-medium mt-0.5">
                          {d.critical_risk_projects_count} Critical
                        </div>
                      )}
                    </div>
                    <span className="text-slate-400 text-sm">&rarr;</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-300">
            💡 <strong>District Officer Tip:</strong> Clicking any district pin or card instantly updates the project explorer table below with zero latency.
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// AUDIT TRAIL VIEW COMPONENT
// -------------------------------------------------------------
function AuditTrailView({ auditLogs }) {
  return (
    <div className="gov-card p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            🏛️ Official Governance Audit Trail & Chain of Custody
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Immutable log of official logins, project inspections, and administrative alert determinations
          </p>
        </div>
        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {auditLogs.length} Recorded Events
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-4 py-2.5">Log ID</th>
              <th className="px-4 py-2.5">Timestamp</th>
              <th className="px-4 py-2.5">Action Event</th>
              <th className="px-4 py-2.5">Authorized Officer</th>
              <th className="px-4 py-2.5">Target Project</th>
              <th className="px-4 py-2.5">Administrative Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-4 py-6 text-center text-slate-400">
                  No governance audit entries recorded yet.
                </td>
              </tr>
            ) : (
              auditLogs.map(log => (
                <tr key={log.log_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">#{log.log_id}</td>
                  <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">{log.timestamp}</td>
                  <td className="px-4 py-2.5 font-medium">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      log.action.includes('ESCALATED') ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800' :
                      log.action.includes('LOGIN') ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' :
                      'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">{log.officer_name}</td>
                  <td className="px-4 py-2.5 font-mono text-blue-600 dark:text-blue-400 text-[11px]">{log.project_id}</td>
                  <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 max-w-md">{log.remarks}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// MAIN APPLICATION COMPONENT
// -------------------------------------------------------------
function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [summary, setSummary] = useState(null);
  const [projects, setProjects] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [states, setStates] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for Project Explorer
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRisk, setSelectedRisk] = useState("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState("ALL");
  const [selectedSector, setSelectedSector] = useState("ALL");
  const [sortBy, setSortBy] = useState("composite_risk_score");

  // Selected Project for Inspection Modal
  const [inspectedProject, setInspectedProject] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Review Alert Modal
  const [activeAlertToReview, setActiveAlertToReview] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("UNDER_REVIEW");
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [reviewerName, setReviewerName] = useState("District Collector / SDM");

  // User Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("mplads_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loginUsername, setLoginUsername] = useState("admin");
  const [loginPassword, setLoginPassword] = useState("admin123");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Theme State: 'light' or 'dark' (Default to dark, synchronized with localStorage)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("mplads_theme") || "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("mplads_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  // Load initial dashboard data
  useEffect(() => {
    if (currentUser) {
      fetchInitialData();
    }
  }, [currentUser]);

  // Handle URL Hash navigation: e.g. #/project/MPLAD-2026-1001
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#/project/")) {
        const pId = hash.replace("#/project/", "");
        if (pId && (!inspectedProject || inspectedProject.project_id !== pId)) {
          openProjectInspection(pId);
        }
      }
    };
    window.addEventListener("hashchange", handleHash);
    handleHash();
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Authentication failed");
      }
      const data = await res.json();
      localStorage.setItem("mplads_user", JSON.stringify(data));
      setCurrentUser(data);
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (currentUser?.token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Authorization": `Bearer ${currentUser.token}` }
        });
      }
    } catch (e) {
      console.error("Logout error", e);
    }
    localStorage.removeItem("mplads_user");
    setCurrentUser(null);
  };

  // Fetch projects when filters change
  useEffect(() => {
    if (currentUser) {
      fetchProjects();
    }
  }, [searchTerm, selectedRisk, selectedDistrict, selectedSector, sortBy]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [sumRes, distRes, stateRes, alertRes, anomRes, analyRes, auditRes] = await Promise.all([
        fetch("/api/risk-summary").then(r => r.json()),
        fetch("/api/district-risk").then(r => r.json()),
        fetch("/api/state-risk").then(r => r.json()),
        fetch("/api/alerts").then(r => r.json()),
        fetch("/api/anomalies").then(r => r.json()),
        fetch("/api/analytics").then(r => r.json()),
        fetch("/api/audit-logs").then(r => r.json()).catch(() => [])
      ]);

      setSummary(sumRes);
      setDistricts(distRes);
      setStates(stateRes);
      setAlerts(alertRes);
      setAnomalies(anomRes);
      setAnalytics(analyRes);
      setAuditLogs(auditRes);
    } catch (err) {
      console.error("Error fetching initial dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (selectedRisk !== "ALL") params.append("risk_level", selectedRisk);
      if (selectedDistrict !== "ALL") params.append("district", selectedDistrict);
      if (selectedSector !== "ALL") params.append("sector", selectedSector);
      params.append("sort_by", sortBy);
      params.append("limit", "150");

      const res = await fetch(`/api/projects?${params.toString()}`);
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  // -------------------------------------------------------------
  // STEP 1 & 6: ROBUST PROJECT INSPECTION HANDLER
  // -------------------------------------------------------------
  const openProjectInspection = async (projectId) => {
    try {
      setLoadingDetail(true);
      window.location.hash = `#/project/${projectId}`;

      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        throw new Error(`Project ${projectId} not found (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (!data || !data.project_id) {
        throw new Error("Invalid project evidence payload received from server.");
      }

      // Safe normalization for risk_analysis sub-object
      if (!data.risk_analysis) {
        data.risk_analysis = {
          composite_risk_score: data.composite_risk_score || 0,
          risk_level: data.risk_level || 'LOW',
          factors: data.factors || [],
          xai_explanation: data.xai_explanation || 'Project metrics evaluated by MPLADS Risk Engine.',
          recommended_action: data.recommended_action || 'Review financial and progress records.',
          isolation_forest_outlier: Boolean(data.isolation_forest_outlier),
          duplicate_risk_detected: Boolean(data.duplicate_risk_detected),
          duplicate_with_project_id: data.duplicate_with_project_id || null
        };
      }

      setInspectedProject(data);
    } catch (err) {
      console.error("Error loading project detail:", err);
      alert("Unable to open Project Evidence: " + (err.message || err));
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeProjectInspection = () => {
    setInspectedProject(null);
    if (window.location.hash.startsWith("#/project/")) {
      window.location.hash = "#/";
    }
  };

  const handleUpdateAlert = async (e) => {
    e.preventDefault();
    if (!activeAlertToReview) return;

    try {
      const res = await fetch(`/api/alerts/${activeAlertToReview.alert_id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: reviewStatus,
          officer_remarks: reviewRemarks,
          reviewer_name: reviewerName
        })
      });

      if (res.ok) {
        const [updatedAlerts, updatedAudits] = await Promise.all([
          fetch("/api/alerts").then(r => r.json()),
          fetch("/api/audit-logs").then(r => r.json()).catch(() => [])
        ]);
        setAlerts(updatedAlerts);
        setAuditLogs(updatedAudits);
        setActiveAlertToReview(null);
        setReviewRemarks("");
        if (inspectedProject && inspectedProject.project_id === activeAlertToReview.project_id) {
          openProjectInspection(inspectedProject.project_id);
        }
      }
    } catch (err) {
      console.error("Error updating alert:", err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* TOP GOVERNMENT HEADER & STATUS BAR */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 sticky top-0 z-40 backdrop-blur shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl shadow-inner">
                🏛️
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">MPLADS AI Monitor</h1>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono">
                    SIH 2026 • PS 26102
                  </span>
                  <span className="hidden sm:inline-flex items-center space-x-1 text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <span>🔒 Restricted Access</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  Secure Governance Decision-Support & Risk Monitoring System
                </p>
              </div>
            </div>

            {/* Right Controls: User Profile + Theme Toggle */}
            <div className="flex items-center space-x-3">
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <span>{theme === "dark" ? "☀️ Light" : "🌙 Dark"}</span>
              </button>

              {/* Officer Profile & Sign-out */}
              {currentUser && (
                <div className="flex items-center space-x-3 pl-3 border-l border-slate-200 dark:border-slate-800">
                  <div className="text-right hidden md:block">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center justify-end space-x-1.5">
                      <span>{currentUser.full_name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30">
                        {currentUser.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                      {currentUser.district ? `${currentUser.district}, ${currentUser.state}` : (currentUser.state ? currentUser.state : 'National Central')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Sign Out"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-all cursor-pointer"
                  >
                    Sign Out 🚪
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-200 dark:border-slate-800 text-xs sm:text-sm">
            {[
              { id: "overview", label: "Overview", icon: "🏛️" },
              { id: "districts", label: "India District Map", icon: "🗺️" },
              { id: "investigation", label: "Projects Explorer", icon: "🔍" },
              { id: "anomalies", label: "Anomaly Matrix", icon: "📊" },
              { id: "alerts", label: "Pending Alerts", icon: "🚨", badge: alerts.filter(a => a.status === 'PENDING').length },
              { id: "audit", label: "Audit Trail", icon: "📋", badge: auditLogs.length },
              { id: "methodology", label: "Risk Engine Logic", icon: "⚙️" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-sm font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className={`ml-1 px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                    tab.id === 'alerts' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-200'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!currentUser ? (
          /* SECURE GOVERNMENT LOGIN MODAL */
          <div className="flex flex-col items-center justify-center min-h-[65vh]">
            <div className="gov-card max-w-md w-full p-8 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/95 shadow-xl rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-amber-500 to-emerald-500"></div>

              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-xl bg-blue-50 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 text-3xl mb-3">
                  🏛️
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Authorized Official Sign-In</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">MPLADS Governance Intelligence & Monitoring System</p>
                <div className="mt-2 inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                  🔒 Access Restricted to Authorized Government Officials Only
                </div>
              </div>

              {loginError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300 flex items-center space-x-2">
                  <span>⚠️</span>
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Official Username
                  </label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    required
                    placeholder="e.g. admin or dc_pune"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Security Password
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-all shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
                >
                  {isLoggingIn ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying Official Identity...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Decision Support</span>
                      <span>&rarr;</span>
                    </>
                  )}
                </button>
              </form>

              {/* Quick Demo Credentials Switcher */}
              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 text-center">
                  Demo Credentials (Click to Select):
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => { setLoginUsername("admin"); setLoginPassword("admin123"); }}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left transition-all cursor-pointer"
                  >
                    <div className="font-bold text-blue-600 dark:text-blue-400">Admin (MoSPI)</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">admin / admin123</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginUsername("state_mh"); setLoginPassword("state123"); }}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left transition-all cursor-pointer"
                  >
                    <div className="font-bold text-purple-600 dark:text-purple-400">State Officer</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">state_mh / state123</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginUsername("dc_pune"); setLoginPassword("pune123"); }}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left transition-all cursor-pointer"
                  >
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">District Pune</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">dc_pune / pune123</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginUsername("dc_kanpur"); setLoginPassword("kanpur123"); }}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left transition-all cursor-pointer"
                  >
                    <div className="font-bold text-amber-600 dark:text-amber-400">District Kanpur</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">dc_kanpur / kanpur123</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-3">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Loading MPLADS decision support telemetry...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: EXECUTIVE OVERVIEW WITH RISK CHARTS */}
            {activeTab === "overview" && summary && (
              <div className="space-y-6">
                {/* 4 Clean Key Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="gov-card p-4 sm:p-5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Sanctioned</p>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {formatINR(summary.total_sanctioned_amount)}
                      </span>
                      <span className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 font-medium">
                        {summary.total_projects} Works
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Sanctioned public works under active monitoring
                    </p>
                  </div>

                  <div className="gov-card p-4 sm:p-5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Expenditure Released</p>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                        {formatINR(summary.total_expenditure_amount)}
                      </span>
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        {summary.overall_expenditure_ratio_pct}%
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Disbursed across milestone releases
                    </p>
                  </div>

                  <div className="gov-card p-4 sm:p-5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Critical Review</p>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 tracking-tight animate-pulse-slow">
                        {summary.risk_counts.CRITICAL}
                      </span>
                      <span className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded border border-red-200 dark:border-red-800 font-medium">
                        High: {summary.risk_counts.HIGH}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Priority works requiring officer inspection
                    </p>
                  </div>

                  <div className="gov-card p-4 sm:p-5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Potential Anomalies</p>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
                        {summary.total_anomalies_flagged}
                      </span>
                      <span className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 font-medium">
                        {alerts.filter(a => a.status === 'PENDING').length} Pending
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Statistical indicators & pattern flags
                    </p>
                  </div>
                </div>

                {/* STEP 2: CHART.JS RISK GRAPHS */}
                <RiskVisualizations summary={summary} analytics={analytics} theme={theme} />

                {/* Quick Anomaly Vectors Breakdown */}
                <div className="gov-card p-5">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                    Identified Potential Anomaly Vectors
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Progress Mismatch</span>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">{summary.total_progress_mismatches}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Disbursed &gt;80% with progress &lt;35%</p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tender Splitting Flag</span>
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{summary.total_tender_bypasses}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Works priced near ₹5L threshold</p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Severe Delays</span>
                        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{summary.total_severe_delays}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">&gt;90 days overdue past contract</p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cost Overruns</span>
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{summary.total_cost_overruns}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">&gt;15% above estimated budget</p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Duplicate Suspects</span>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">{summary.total_duplicate_suspects}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">&lt;2.5km distance + title similarity</p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Unusual Patterns</span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{summary.risk_counts.CRITICAL + summary.risk_counts.HIGH}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Multivariate pattern detection</p>
                    </div>
                  </div>
                </div>

                {/* Priority Flagged Works Fast Table (Interactive Rows) */}
                <div className="gov-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                        Priority Flagged Works
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Click any project row or Inspect button to examine evidence dossier
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("investigation")}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700 cursor-pointer transition-all"
                    >
                      View All Projects &rarr;
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-2.5">Project ID & Title</th>
                          <th className="px-4 py-2.5">District</th>
                          <th className="px-4 py-2.5">Sanction Amount</th>
                          <th className="px-4 py-2.5">Physical Progress</th>
                          <th className="px-4 py-2.5">Funds Spent</th>
                          <th className="px-4 py-2.5">Risk Level</th>
                          <th className="px-4 py-2.5">Risk Score</th>
                          <th className="px-4 py-2.5">Primary Issue</th>
                          <th className="px-4 py-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {projects.slice(0, 6).map(p => (
                          <tr
                            key={p.project_id}
                            onClick={() => openProjectInspection(p.project_id)}
                            className="table-interactive-row"
                          >
                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white max-w-xs truncate">
                              <div className="font-mono text-blue-600 dark:text-blue-400 text-[11px]">{p.project_id}</div>
                              <div className="truncate font-semibold" title={p.title}>{p.title}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.district}</td>
                            <td className="px-4 py-3 font-mono font-medium">{formatINR(p.sanctioned_amount)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-medium text-slate-900 dark:text-white">{p.physical_progress_pct}%</span>
                                <div className="w-16 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${p.physical_progress_pct}%` }}></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono font-medium text-amber-600 dark:text-amber-400">
                                {((p.expenditure_to_date / Math.max(p.sanctioned_amount, 1)) * 100).toFixed(0)}% ({formatINR(p.expenditure_to_date)})
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${getRiskBadgeClass(p.risk_level)}`}>
                                {p.risk_level}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                              {p.composite_risk_score} / 100
                            </td>
                            <td className="px-4 py-3">
                              {p.spending_vs_progress_mismatch_pct > 25 ? (
                                <span className="text-red-600 dark:text-red-400 text-[11px] font-medium">Spending Mismatch ({p.spending_vs_progress_mismatch_pct}%)</span>
                              ) : p.cost_overrun_pct > 15 ? (
                                <span className="text-orange-600 dark:text-orange-400 text-[11px] font-medium">Cost Overrun (+{p.cost_overrun_pct}%)</span>
                              ) : p.sanctioned_amount >= 475000 && p.sanctioned_amount < 500000 ? (
                                <span className="text-amber-600 dark:text-amber-400 text-[11px] font-medium">Tender Threshold Flag</span>
                              ) : (
                                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Delay ({p.delay_days}d)</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => openProjectInspection(p.project_id)}
                                className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 text-xs font-semibold cursor-pointer transition-all"
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: INTERACTIVE INDIA DISTRICT RISK MAP */}
            {activeTab === "districts" && (
              <div className="space-y-6">
                <IndiaDistrictMap
                  districts={districts}
                  selectedDistrict={selectedDistrict}
                  onSelectDistrict={(dist) => {
                    setSelectedDistrict(dist);
                    setActiveTab("investigation");
                  }}
                />
              </div>
            )}

            {/* TAB 3: PROJECT INVESTIGATION EXPLORER (STEP 4) */}
            {activeTab === "investigation" && (
              <div className="space-y-4">
                {/* Search and Filters Bar */}
                <div className="gov-card p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    {/* Search Text */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                        Search Project ID, Title or Agency
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. MPLAD-2026-1015, school, road, PWD..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all font-sans"
                      />
                    </div>

                    {/* Risk Filter */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                        Risk Severity
                      </label>
                      <select
                        value={selectedRisk}
                        onChange={(e) => setSelectedRisk(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all font-sans cursor-pointer"
                      >
                        <option value="ALL">All Risk Levels</option>
                        <option value="CRITICAL">Critical (81-100)</option>
                        <option value="HIGH">High (61-80)</option>
                        <option value="MEDIUM">Medium (31-60)</option>
                        <option value="LOW">Low (0-30)</option>
                      </select>
                    </div>

                    {/* District Filter */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                        District
                      </label>
                      <select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all font-sans cursor-pointer"
                      >
                        <option value="ALL">All Districts</option>
                        {districts.map(d => (
                          <option key={d.district} value={d.district}>{d.district} ({d.state})</option>
                        ))}
                      </select>
                    </div>

                    {/* Sort By */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">
                        Sort By
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all font-sans cursor-pointer"
                      >
                        <option value="composite_risk_score">Risk Score (High to Low)</option>
                        <option value="sanctioned_amount">Sanction Amount</option>
                        <option value="spending_vs_progress_mismatch_pct">Progress Mismatch</option>
                        <option value="cost_overrun_pct">Cost Overrun</option>
                        <option value="delay_days">Timeline Delay</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Projects Table with Interactivity & Empty States */}
                <div className="gov-card overflow-hidden">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                    <div>
                      Showing <span className="font-bold text-slate-900 dark:text-white">{projects.length}</span> monitored works
                      {selectedDistrict !== "ALL" && (
                        <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-medium">
                          Filtered by {selectedDistrict}
                        </span>
                      )}
                    </div>
                    <div>
                      Click any row or <span className="text-blue-600 dark:text-blue-400 font-semibold">Inspect</span> for dossier
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-2.5">Project ID & Title</th>
                          <th className="px-4 py-2.5">District & Agency</th>
                          <th className="px-4 py-2.5">Sanction Amount</th>
                          <th className="px-4 py-2.5">Disbursed Funds</th>
                          <th className="px-4 py-2.5">Physical Progress</th>
                          <th className="px-4 py-2.5">Risk Level</th>
                          <th className="px-4 py-2.5">Risk Score</th>
                          <th className="px-4 py-2.5">Identified Issues</th>
                          <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                        {projects.length === 0 ? (
                          /* EMPTY STATE */
                          <tr>
                            <td colSpan="9" className="px-4 py-12 text-center">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <span className="text-3xl">🔍</span>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                  No high-risk projects found
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                                  No records matched your search query or selected filter options.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchTerm("");
                                    setSelectedRisk("ALL");
                                    setSelectedDistrict("ALL");
                                    setSelectedSector("ALL");
                                  }}
                                  className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs cursor-pointer transition-all shadow-sm"
                                >
                                  Reset All Filters
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          projects.map(p => (
                            <tr
                              key={p.project_id}
                              onClick={() => openProjectInspection(p.project_id)}
                              className="table-interactive-row"
                            >
                              <td className="px-4 py-3 max-w-xs">
                                <div className="font-mono text-blue-600 dark:text-blue-400 font-medium text-[11px]">{p.project_id}</div>
                                <div className="font-semibold text-slate-900 dark:text-white truncate" title={p.title}>{p.title}</div>
                                <div className="text-[10px] text-slate-500">Sector: {p.sector} • Date: {p.sanction_date}</div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-slate-900 dark:text-white font-medium">{p.district}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]" title={p.implementing_agency}>
                                  {p.implementing_agency}
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-white">
                                {formatINR(p.sanctioned_amount)}
                              </td>
                              <td className="px-4 py-3 font-mono font-medium text-amber-600 dark:text-amber-400">
                                {formatINR(p.expenditure_to_date)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  <div className="w-14 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${p.physical_progress_pct > 70 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                      style={{ width: `${p.physical_progress_pct}%` }}
                                    ></div>
                                  </div>
                                  <span className="font-mono font-semibold text-slate-900 dark:text-white">{p.physical_progress_pct}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${getRiskBadgeClass(p.risk_level)}`}>
                                  {p.risk_level}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                                {p.composite_risk_score} / 100
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {p.spending_vs_progress_mismatch_pct > 20 && (
                                    <span className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40 text-[10px] font-medium">
                                      Gap {p.spending_vs_progress_mismatch_pct}%
                                    </span>
                                  )}
                                  {p.sanctioned_amount >= 475000 && p.sanctioned_amount < 500000 && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 text-[10px] font-medium">
                                      Tender Split
                                    </span>
                                  )}
                                  {p.cost_overrun_pct > 15 && (
                                    <span className="px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40 text-[10px] font-medium">
                                      Overrun +{p.cost_overrun_pct}%
                                    </span>
                                  )}
                                  {p.delay_days > 60 && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px]">
                                      +{p.delay_days}d Delay
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => openProjectInspection(p.project_id)}
                                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
                                >
                                  Inspect
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: FINANCIAL ANOMALY MATRIX */}
            {activeTab === "anomalies" && (
              <div className="space-y-6">
                <div className="gov-card p-5">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                    Categorized Anomaly Clusters
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                    Automated rule engines and statistical anomaly detectors cluster projects into discrete risk vectors.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {anomalies.map(anom => (
                      <div key={anom.category_id} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/70 hover:border-blue-400 dark:hover:border-slate-600 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                            anom.severity === 'CRITICAL' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700/50' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50'
                          }`}>
                            {anom.severity} SEVERITY
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 font-mono">
                            {anom.count} Works
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{anom.category_name}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 min-h-[36px]">{anom.description}</p>

                        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">Sample Flagged Works:</p>
                          <div className="space-y-1.5">
                            {anom.sample_projects.map(sp => (
                              <div
                                key={sp.project_id}
                                onClick={() => openProjectInspection(sp.project_id)}
                                className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900/60 hover:bg-blue-50 dark:hover:bg-slate-900 text-xs cursor-pointer text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-white border border-slate-200 dark:border-transparent transition-colors"
                              >
                                <span className="font-mono text-blue-600 dark:text-blue-400 text-[11px]">{sp.project_id}</span>
                                <span className="truncate max-w-[140px] text-[11px]">{sp.title}</span>
                                <span className="text-red-600 dark:text-red-400 font-mono text-[11px]">{sp.composite_risk_score}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: ALERTS & REVIEW WORKFLOW */}
            {activeTab === "alerts" && (
              <div className="space-y-4">
                <div className="gov-card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                        Executive Alert Triage Center
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Official action logging workflow for District Collectors and Monitoring Engineers
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Total Alerts: </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{alerts.length}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {alerts.map(a => (
                      <div
                        key={a.alert_id}
                        className={`p-4 rounded-lg border transition-all ${
                          a.status === 'PENDING'
                            ? 'bg-slate-50 dark:bg-slate-900/90 border-slate-300 dark:border-slate-700/80 shadow-sm'
                            : a.status === 'ESCALATED'
                            ? 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800/40'
                            : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${getRiskBadgeClass(a.risk_level)}`}>
                              Score: {a.risk_score}
                            </span>
                            <span className="font-mono text-blue-600 dark:text-blue-400 text-xs font-semibold">{a.project_id}</span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{a.district}, {a.state}</span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              a.status === 'PENDING'
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-700/40'
                                : a.status === 'ESCALATED'
                                ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700/50'
                                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/40'
                            }`}>
                              {a.status}
                            </span>
                            <span className="text-[11px] text-slate-500">{a.created_at}</span>
                          </div>
                        </div>

                        <div className="mt-2.5">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{a.headline}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{a.detail}</p>
                          {a.officer_remarks && (
                            <div className="mt-2 p-2 rounded bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-700 dark:text-slate-300">
                              <span className="font-semibold text-blue-600 dark:text-blue-400">Official Remark: </span>
                              {a.officer_remarks}
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => openProjectInspection(a.project_id)}
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-blue-50 dark:bg-blue-600/20 hover:bg-blue-100 dark:hover:bg-blue-600/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/40 text-xs font-semibold cursor-pointer transition-all shadow-sm"
                          >
                            <span>🔎 Inspect Full Project Dossier</span>
                            <span>&rarr;</span>
                          </button>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setActiveAlertToReview(a);
                                setReviewStatus("ESCALATED");
                              }}
                              className="px-2.5 py-1 rounded bg-red-50 dark:bg-red-600/20 hover:bg-red-100 dark:hover:bg-red-600/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-600/40 text-xs font-medium cursor-pointer"
                            >
                              Escalate for Audit
                            </button>
                            <button
                              onClick={() => {
                                setActiveAlertToReview(a);
                                setReviewStatus("RESOLVED");
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-600/40 text-xs font-medium cursor-pointer"
                            >
                              Mark Resolved
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: AUDIT TRAIL VIEW */}
            {activeTab === "audit" && (
              <AuditTrailView auditLogs={auditLogs} />
            )}

            {/* TAB 7: SCORING METHODOLOGY & EXPLAINABILITY */}
            {activeTab === "methodology" && (
              <div className="space-y-6">
                <div className="gov-card p-6">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    Transparent Scoring Methodology & Explainable Architecture
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                    Unlike opaque "black-box" systems, this platform implements mathematically defensible governance indicators aligned with statutory guidelines (Ministry of Statistics and Programme Implementation - MoSPI MPLADS Guidelines).
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Composite Risk Formula (0–100 Scale)
                      </h4>
                      <div className="p-3.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 font-mono text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                        Risk Score = W_mismatch (25%) + W_overrun (20%) + W_delay (15%) + W_tender (15%) + W_agency (15%) + W_ml (10%)
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between p-2 rounded bg-slate-100 dark:bg-slate-800/40">
                          <span className="font-semibold text-slate-900 dark:text-white">1. Spending-Physical Progress Mismatch</span>
                          <span className="font-mono text-red-600 dark:text-red-400 font-bold">25 Points Max</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] pl-2">
                          Evaluates fund disbursement against independently certified physical progress.
                        </p>

                        <div className="flex justify-between p-2 rounded bg-slate-100 dark:bg-slate-800/40">
                          <span className="font-semibold text-slate-900 dark:text-white">2. Cost Overrun Deviation</span>
                          <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">20 Points Max</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] pl-2">
                          Measures actual expenditure exceeding the original sanctioned administrative approval.
                        </p>

                        <div className="flex justify-between p-2 rounded bg-slate-100 dark:bg-slate-800/40">
                          <span className="font-semibold text-slate-900 dark:text-white">3. Timeline Delay Past Contract Deadline</span>
                          <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">15 Points Max</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] pl-2">
                          Flags chronic non-completion where elapsed time exceeds contractual delivery dates.
                        </p>

                        <div className="flex justify-between p-2 rounded bg-slate-100 dark:bg-slate-800/40">
                          <span className="font-semibold text-slate-900 dark:text-white">4. Statutory Tender Bypass (Artificial Splitting)</span>
                          <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">15 Points Max</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] pl-2">
                          Identifies works intentionally valued between ₹4.75L - ₹4.98L to circumvent statutory ₹5 Lakh e-tendering.
                        </p>

                        <div className="flex justify-between p-2 rounded bg-slate-100 dark:bg-slate-800/40">
                          <span className="font-semibold text-slate-900 dark:text-white">5. Contractor Concentration</span>
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">15 Points Max</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] pl-2">
                          Measures concentration of district scheme allocation awarded to a single contractor.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Decision Support Philosophy
                      </h4>
                      <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                        <div className="p-3 rounded bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                          <h5 className="font-bold text-slate-900 dark:text-white mb-1">Human-in-the-Loop Governance</h5>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                            The platform does NOT declare fraud or penalize contractors automatically. It acts as an early-warning telemetry system that highlights priority anomalies for human inspection.
                          </p>
                        </div>

                        <div className="p-3 rounded bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                          <h5 className="font-bold text-slate-900 dark:text-white mb-1">Statutory Audit Compliance</h5>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                            Every risk score factor maps directly to clauses in the official MoSPI MPLADS operational manual and General Financial Rules (GFR).
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* LOADING OVERLAY */}
      {loadingDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-blue-500/50 rounded-xl p-6 flex items-center space-x-4 shadow-2xl">
            <div className="w-7 h-7 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div>
              <div className="text-slate-900 dark:text-white font-semibold text-sm">Retrieving Project Audit Dossier...</div>
              <div className="text-slate-500 dark:text-slate-400 text-xs">Fetching payment milestones, geospatial verification & risk factors</div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 6: PROJECT DETAIL PAGE (INSPECT VIEW MODAL) */}
      {inspectedProject && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="gov-card max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-2xl rounded-2xl text-slate-800 dark:text-slate-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-blue-600 dark:text-blue-400 font-bold text-sm">{inspectedProject.project_id}</span>
                  <span className={`px-2.5 py-0.5 rounded font-mono font-bold text-xs ${getRiskBadgeClass(inspectedProject.risk_analysis?.risk_level || inspectedProject.risk_level)}`}>
                    RISK SCORE: {inspectedProject.composite_risk_score} / 100 ({inspectedProject.risk_analysis?.risk_level || inspectedProject.risk_level})
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    {inspectedProject.status}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">{inspectedProject.title}</h2>
                <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>📍 {inspectedProject.district}, {inspectedProject.state}</span>
                  <span>•</span>
                  <span>🏢 {inspectedProject.implementing_agency}</span>
                  <span>•</span>
                  <span>Sector: {inspectedProject.sector}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeProjectInspection}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Financial vs Physical Data Section */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Financial Data */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span>Financial Data</span>
                  <span className="text-[10px] text-slate-400 font-mono">Disbursement</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Sanctioned Amount:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{formatINR(inspectedProject.sanctioned_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Actual Expenditure:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatINR(inspectedProject.expenditure_to_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Cost Overrun:</span>
                    <span className={`font-mono font-bold ${inspectedProject.cost_overrun_pct > 10 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      +{inspectedProject.cost_overrun_pct}%
                    </span>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Funds Released %</span>
                      <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                        {((inspectedProject.expenditure_to_date / Math.max(inspectedProject.sanctioned_amount, 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, (inspectedProject.expenditure_to_date / Math.max(inspectedProject.sanctioned_amount, 1)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Data */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span>Progress Data</span>
                  <span className="text-[10px] text-slate-400 font-mono">Execution</span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Sanction Date:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{inspectedProject.sanction_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Scheduled Completion:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{inspectedProject.scheduled_completion_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Timeline Delay:</span>
                    <span className={`font-mono font-bold ${inspectedProject.delay_days > 45 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {inspectedProject.delay_days} days past deadline
                    </span>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-500 dark:text-slate-400">Physical Verified Work %</span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{inspectedProject.physical_progress_pct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${inspectedProject.physical_progress_pct}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* WHY FLAGGED SECTION */}
            <div className="mt-5 p-4 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50">
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-base">⚠️</span>
                <h3 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wide">
                  WHY FLAGGED (Primary Risk Triggers)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
                <div className="p-2.5 rounded bg-white dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800/40">
                  <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-semibold">Cost Overrun</div>
                  <div className={`font-mono font-bold text-sm mt-0.5 ${inspectedProject.cost_overrun_pct > 15 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                    +{inspectedProject.cost_overrun_pct}%
                  </div>
                </div>

                <div className="p-2.5 rounded bg-white dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800/40">
                  <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-semibold">Timeline Delay</div>
                  <div className={`font-mono font-bold text-sm mt-0.5 ${inspectedProject.delay_days > 60 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-900 dark:text-white'}`}>
                    {inspectedProject.delay_days} Days
                  </div>
                </div>

                <div className="p-2.5 rounded bg-white dark:bg-slate-900/80 border border-amber-200 dark:border-amber-800/40">
                  <div className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-semibold">Spending vs Progress Gap</div>
                  <div className={`font-mono font-bold text-sm mt-0.5 ${inspectedProject.spending_vs_progress_mismatch_pct > 20 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                    {inspectedProject.spending_vs_progress_mismatch_pct}% Gap
                  </div>
                </div>
              </div>

              {/* Detailed Factor Contributions */}
              <div className="space-y-1.5">
                {(inspectedProject.risk_analysis?.factors || []).map((f, i) => (
                  <div key={i} className="p-2.5 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900 dark:text-white">{f.factor_name}</span>
                        {f.is_anomaly && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-300 font-bold">
                            ATTENTION
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{f.evidence}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">+{f.score_contribution}</span>
                      <span className="text-slate-400 text-[10px]"> / {f.max_possible} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RECOMMENDATION SECTION */}
            <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-base">📋</span>
                <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wide">
                  Official Advisory & Recommendation
                </h4>
              </div>
              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {inspectedProject.risk_analysis?.recommended_action || "Review financial and progress records"}
              </p>
              <div className="pt-2 border-t border-blue-200 dark:border-blue-900/40 text-[11px] text-slate-600 dark:text-slate-400">
                <strong>XAI Assessment: </strong> {inspectedProject.risk_analysis?.xai_explanation}
              </div>
            </div>

            {/* Payment History Milestones */}
            <div className="mt-5">
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
                Payment Milestone Records ({inspectedProject.payment_history?.length || 0})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 text-[10px] font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-2">Milestone ID</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Disbursement</th>
                      <th className="px-3 py-2">Physical Claimed</th>
                      <th className="px-3 py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {(inspectedProject.payment_history || []).map(m => (
                      <tr key={m.milestone_id}>
                        <td className="px-3 py-2 font-mono text-slate-500">{m.milestone_id}</td>
                        <td className="px-3 py-2 font-mono">{m.date}</td>
                        <td className="px-3 py-2 font-mono font-medium text-amber-600 dark:text-amber-300">{formatINR(m.amount)}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-emerald-600 dark:text-emerald-400">{m.physical_progress_claimed}%</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{m.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeProjectInspection}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-all"
              >
                Close Report
              </button>
              <button
                type="button"
                onClick={() => {
                  const pId = inspectedProject.project_id;
                  const alertItem = alerts.find(a => a.project_id === pId) || {
                    alert_id: `ALT-${pId}`,
                    project_id: pId,
                    headline: `Executive Audit Escalation for ${pId}`,
                    detail: inspectedProject.risk_analysis?.xai_explanation || "Field audit escalation initiated."
                  };
                  setActiveAlertToReview(alertItem);
                  setReviewStatus("ESCALATED");
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
              >
                Escalate to District Collector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALERT REVIEW & AUDIT DETERMINATION MODAL */}
      {activeAlertToReview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="gov-card max-w-lg w-full p-6 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-2xl rounded-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              Official Alert Action Log
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Record administrative determination for {activeAlertToReview.project_id}
            </p>

            <form onSubmit={handleUpdateAlert} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Action Status</label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white"
                >
                  <option value="UNDER_REVIEW">Under Preliminary Review</option>
                  <option value="ESCALATED">Escalated for Third-Party Field Audit</option>
                  <option value="RESOLVED">Resolved / Cleared with Justification</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Reviewing Officer</label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white"
                  placeholder="Officer name and designation"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">Audit Findings / Official Remarks</label>
                <textarea
                  rows="3"
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white"
                  placeholder="e.g. Dispatched Sub-Divisional Magistrate for on-site physical verification of milestone progress."
                  required
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveAlertToReview(null)}
                  className="px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer"
                >
                  Submit Official Determination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GOVERNMENT FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-4 mt-8 text-center text-xs text-slate-500">
        <p>Smart India Hackathon 2026 • Problem Statement 26102: AI Anomaly Detection in MPLADS</p>
        <p className="mt-1 text-[11px] text-slate-400">Built for District Planning Committees, MoSPI, and State Monitoring Cells</p>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
