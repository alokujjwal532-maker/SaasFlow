
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  FilterX,
  Search,
  Sparkles,
  
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface SpendAnalyticsApp {
  id: string;
  name: string;
  category: string;
  department: string;
  owner: string;
  purchased: number;
  assigned: number;
  monthlyCost: number;
  renewalDate: string;
  status: "Active" | "Under Review" | "Inactive";
  color: string;
}

interface SpendAnalyticsProps {
  apps: SpendAnalyticsApp[];
  onOpenApplication: (appId: string) => void;
  onOpenSubscriptions: () => void;
  onOpenLicenses: () => void;
}

type Period = "6" | "12" | "24";
type StatusFilter = "All" | "Active" | "Paused" | "Cancelled";
type SortBy = "cost" | "name" | "savings" | "utilization";

interface StoredSubscription {
  id: string;
  appId: string;
  plan: string;
  billingCycle: "Monthly" | "Annual";
  amount: number;
  status: "Active" | "Paused" | "Cancelled";
  renewalDate: string;
}

interface SpendRow {
  app: SpendAnalyticsApp;
  monthlySpend: number;
  annualSpend: number;
  available: number;
  utilization: number;
  savings: number;
  subscriptionCount: number;
}

const SUBSCRIPTIONS_KEY = "saasflow-phase7-subscriptions";

const COLORS = [
  "#7566ee",
  "#3989ed",
  "#1ba97c",
  "#f0a34a",
  "#aa7ce8",
  "#e67c82",
  "#64748b",
];

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function moneyCompact(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}m`;
  if (value >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${value.toFixed(0)}`;
}

function readSubscriptions(): StoredSubscription[] {
  try {
    const raw = localStorage.getItem(SUBSCRIPTIONS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item: unknown): item is StoredSubscription => {
        if (!item || typeof item !== "object") return false;
        const s = item as Partial<StoredSubscription>;
        return (
          typeof s.id === "string" &&
          typeof s.appId === "string" &&
          typeof s.plan === "string" &&
          (s.billingCycle === "Monthly" ||
            s.billingCycle === "Annual") &&
          typeof s.amount === "number" &&
          Number.isFinite(s.amount) &&
          s.amount >= 0 &&
          (s.status === "Active" ||
            s.status === "Paused" ||
            s.status === "Cancelled") &&
          typeof s.renewalDate === "string"
        );
      },
    );
  } catch {
    return [];
  }
}

function monthlyEquivalent(sub: StoredSubscription): number {
  return sub.billingCycle === "Annual"
    ? sub.amount / 12
    : sub.amount;
}

function exportCSV(rows: SpendRow[]): void {
  const data = [
    [
      "Application",
      "Department",
      "Category",
      "Monthly Spend",
      "Annualized Spend",
      "Purchased Seats",
      "Assigned Seats",
      "Available Seats",
      "Utilization",
      "Potential Monthly Savings",
    ],
    ...rows.map((row) => [
      row.app.name,
      row.app.department,
      row.app.category,
      row.monthlySpend.toFixed(2),
      row.annualSpend.toFixed(2),
      String(row.app.purchased),
      String(row.app.assigned),
      String(row.available),
      percent(row.utilization),
      row.savings.toFixed(2),
    ]),
  ];

  const csv = data
    .map((record) =>
      record
        .map((value) => {
          const safe = /^[=+\-@\t\r]/.test(value)
            ? `'${value}`
            : value;
          return `"${safe.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "saasflow-spend-analytics.csv";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function periodLabels(count: number): string[] {
  const labels: string[] = [];

  for (let index = count - 1; index >= 0; index--) {
    const date = new Date(Date.UTC(2026, 11 - index, 1));
    labels.push(
      date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
    );
  }

  return labels;
}

export default function SpendAnalytics({
  apps,
  onOpenApplication,
  onOpenSubscriptions,
  onOpenLicenses,
}: SpendAnalyticsProps) {
  const [department, setDepartment] = useState("All");
  const [category, setCategory] = useState("All");
  const [application, setApplication] = useState("All");
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<StatusFilter>("All");
  const [period, setPeriod] = useState<Period>("6");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("cost");
  const [notice, setNotice] = useState("");

  // This page is mounted when selected from the sidebar.
  // Therefore we read the latest Phase 7 localStorage records
  // whenever the user navigates to Spend Analytics.
  const subscriptions = useMemo(() => readSubscriptions(), []);

  const departments = useMemo(
    () => [
      "All",
      ...Array.from(new Set(apps.map((app) => app.department))),
    ],
    [apps],
  );

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(new Set(apps.map((app) => app.category))),
    ],
    [apps],
  );

  const rows = useMemo(() => {
    return apps
      .filter(
        (app) =>
          (department === "All" || app.department === department) &&
          (category === "All" || app.category === category) &&
          (application === "All" || app.id === application) &&
          [
            app.name,
            app.owner,
            app.department,
            app.category,
          ]
            .join(" ")
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
      )
      .filter((app) => app.status !== "Inactive")
      .map((app): SpendRow | null => {
        const related = subscriptions.filter(
          (sub) => sub.appId === app.id,
        );

        // For All, use the shared app cost, which Phase 7
        // updates after subscription changes.
        // For a selected status, use only matching plans.
        let monthlySpend = app.monthlyCost;

        if (subscriptionStatus !== "All") {
          if (related.length === 0) return null;

          const matching = related.filter(
            (sub) => sub.status === subscriptionStatus,
          );

          if (matching.length === 0) return null;

          monthlySpend = matching.reduce(
            (sum, sub) =>
              sum + monthlyEquivalent(sub),
            0,
          );
        }

        const available = Math.max(
          0,
          app.purchased - app.assigned,
        );

        const utilization =
          app.purchased > 0
            ? (app.assigned / app.purchased) * 100
            : 0;

        const savings =
          app.purchased > 0
            ? (monthlySpend / app.purchased) * available
            : 0;

        return {
          app,
          monthlySpend,
          annualSpend: monthlySpend * 12,
          available,
          utilization,
          savings,
          subscriptionCount: related.length,
        };
      })
      .filter((row): row is SpendRow => row !== null)
      .sort((a, b) => {
        if (sortBy === "name") {
          return a.app.name.localeCompare(b.app.name);
        }
        if (sortBy === "savings") return b.savings - a.savings;
        if (sortBy === "utilization") {
          return a.utilization - b.utilization;
        }
        return b.monthlySpend - a.monthlySpend;
      });
  }, [
    apps,
    department,
    category,
    application,
    search,
    subscriptionStatus,
    subscriptions,
    sortBy,
  ]);

  const monthlySpend = rows.reduce(
    (sum, row) => sum + row.monthlySpend,
    0,
  );

  const annualSpend = monthlySpend * 12;

  const totalSavings = rows.reduce(
    (sum, row) => sum + row.savings,
    0,
  );

  const totalPurchased = rows.reduce(
    (sum, row) => sum + row.app.purchased,
    0,
  );

  const totalAssigned = rows.reduce(
    (sum, row) => sum + row.app.assigned,
    0,
  );

  const overallUtilization =
    totalPurchased > 0
      ? (totalAssigned / totalPurchased) * 100
      : 0;

  const averageApplicationCost =
    rows.length > 0 ? monthlySpend / rows.length : 0;

  const departmentData = Array.from(
    new Set(rows.map((row) => row.app.department)),
  )
    .map((name) => ({
      name,
      spend: rows
        .filter((row) => row.app.department === name)
        .reduce((sum, row) => sum + row.monthlySpend, 0),
    }))
    .sort((a, b) => b.spend - a.spend);

  const categoryData = Array.from(
    new Set(rows.map((row) => row.app.category)),
  )
    .map((name) => ({
      name,
      spend: rows
        .filter((row) => row.app.category === name)
        .reduce((sum, row) => sum + row.monthlySpend, 0),
    }))
    .filter((item) => item.spend > 0)
    .sort((a, b) => b.spend - a.spend);

  const monthCount = Number(period);

  // Historical values are illustrative because this frontend
  // does not yet contain actual invoice/payment history.
  const trendData = periodLabels(monthCount).map((month, index) => {
    const progress = monthCount <= 1
      ? 1
      : index / (monthCount - 1);

    const variation =
      Math.sin(index * 1.4) * 0.018 +
      Math.cos(index * 0.7) * 0.012;

    const multiplier =
      0.81 + progress * 0.19 + variation;

    return {
      month,
      spend: Math.round(monthlySpend * multiplier),
      budget: Math.round(monthlySpend * multiplier * 1.12),
    };
  });

  const lowUtilization = [...rows]
    .filter((row) => row.utilization < 70 && row.available > 0)
    .sort((a, b) => b.savings - a.savings);

  function resetFilters() {
    setDepartment("All");
    setCategory("All");
    setApplication("All");
    setSubscriptionStatus("All");
    setPeriod("6");
    setSearch("");
    setSortBy("cost");
  }

  function downloadReport() {
    exportCSV(rows);
    setNotice(
      `Exported ${rows.length} application spending records.`,
    );
  }

  return (
    <div className="p8-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            FINANCIAL INTELLIGENCE
          </div>

          <h1>Spend Analytics</h1>
          <p>
            Analyze software spending, compare departments,
            and uncover license optimization opportunities.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={resetFilters}
          >
            <FilterX size={16} />
            Reset Filters
          </button>

          <button
            type="button"
            className="button button-primary"
            onClick={downloadReport}
          >
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {notice && (
        <div className="p8-notice" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* GLOBAL ANALYTICS FILTERS */}
      <section className="p8-panel p8-filter-panel">
        <div className="p8-section-heading">
          <div>
            <h2>Analytics Filters</h2>
            <p>Refine the data across all charts and tables</p>
          </div>
        </div>

        <div className="p8-filters">
          <label>
            <span>Department</span>
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            >
              {departments.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All Departments" : item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All Categories" : item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Application</span>
            <select
              value={application}
              onChange={(event) => setApplication(event.target.value)}
            >
              <option value="All">All Applications</option>
              {apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Subscription Status</span>
            <select
              value={subscriptionStatus}
              onChange={(event) =>
                setSubscriptionStatus(
                  event.target.value as StatusFilter,
                )
              }
            >
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </label>

          <label>
            <span>Reporting Period</span>
            <select
              value={period}
              onChange={(event) =>
                setPeriod(event.target.value as Period)
              }
            >
              <option value="6">Last 6 Months</option>
              <option value="12">Last 12 Months</option>
              <option value="24">Last 24 Months</option>
            </select>
          </label>
        </div>

        <p className="p8-filter-help">
          Showing {rows.length} applications. Costs are monthly equivalents.
          The historical trend is simulated from current costs;
          it is not actual historical billing data.
        </p>
      </section>

      {/* KPI CARDS */}
      <section className="p8-kpis">
        <article className="p8-kpi">
          <span className="p8-kpi-icon purple">
            <Wallet size={20} />
          </span>
          <span>Monthly SaaS Spend</span>
          <strong>{money(monthlySpend)}</strong>
          <small>Filtered monthly equivalent</small>
        </article>

        <article className="p8-kpi">
          <span className="p8-kpi-icon blue">
            <CalendarDays size={20} />
          </span>
          <span>Annualized Spend</span>
          <strong>{money(annualSpend)}</strong>
          <small>Monthly spend × 12</small>
        </article>

        <article className="p8-kpi">
          <span className="p8-kpi-icon orange">
            <BarChart3 size={20} />
          </span>
          <span>Average Application Cost</span>
          <strong>{money(averageApplicationCost)}</strong>
          <small>Per application / month</small>
        </article>

        <article className="p8-kpi">
          <span className="p8-kpi-icon green">
            <Sparkles size={20} />
          </span>
          <span>Potential Monthly Savings</span>
          <strong>{money(totalSavings)}</strong>
          <small>Illustrative unused-seat value</small>
        </article>
      </section>

      {/* SPEND TREND */}
      <section className="p8-panel p8-trend-panel">
        <div className="p8-section-heading">
          <div>
            <h2>Spending Trend</h2>
            <p>
              Illustrative monthly spending and budget trajectory
            </p>
          </div>
          <span className="p8-count">{monthCount} months</span>
        </div>

        <div className="p8-chart">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trendData}
              margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="p8SpendFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#7566ee"
                    stopOpacity={0.23}
                  />
                  <stop
                    offset="100%"
                    stopColor="#7566ee"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="#edf0f6"
                strokeDasharray="4 4"
                vertical={false}
              />

              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                minTickGap={22}
                tick={{ fontSize: 10, fill: "#9aa6b9" }}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={moneyCompact}
                tick={{ fontSize: 10, fill: "#9aa6b9" }}
              />

              <Tooltip
                formatter={(value) => money(Number(value ?? 0))}
              />

              <Area
                type="monotone"
                dataKey="spend"
                name="Estimated Spend"
                stroke="#7566ee"
                strokeWidth={3}
                fill="url(#p8SpendFill)"
              />

              <Area
                type="monotone"
                dataKey="budget"
                name="Illustrative Budget"
                stroke="#a4acc2"
                strokeWidth={2}
                strokeDasharray="6 5"
                fill="transparent"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* DEPARTMENT AND CATEGORY CHARTS */}
      <div className="p8-chart-grid">
        <section className="p8-panel">
          <div className="p8-section-heading">
            <div>
              <h2>Spend by Department</h2>
              <p>Monthly spending across teams</p>
            </div>
          </div>

          {departmentData.length > 0 ? (
            <div className="p8-comparison-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentData}
                  layout="vertical"
                  margin={{ top: 0, right: 12, left: 4, bottom: 0 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="4 4"
                    stroke="#edf0f6"
                  />
                  <XAxis
                    type="number"
                    tickFormatter={moneyCompact}
                    tick={{ fontSize: 10, fill: "#9aa6b9" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 11, fill: "#65748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => money(Number(value ?? 0))}
                  />
                  <Bar
                    dataKey="spend"
                    name="Monthly Spend"
                    fill="#7566ee"
                    radius={[0, 6, 6, 0]}
                    barSize={19}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="p8-empty">No department spending data.</div>
          )}
        </section>

        <section className="p8-panel">
          <div className="p8-section-heading">
            <div>
              <h2>Spend by Category</h2>
              <p>Distribution of SaaS spending</p>
            </div>
          </div>

          {categoryData.length > 0 ? (
            <div className="p8-category-layout">
              <div className="p8-pie-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="spend"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={88}
                      paddingAngle={3}
                    >
                      {categoryData.map((item, index) => (
                        <Cell
                          key={item.name}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => money(Number(value ?? 0))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="p8-category-legend">
                {categoryData.map((item, index) => (
                  <div key={item.name}>
                    <span
                      className="p8-legend-dot"
                      style={{
                        backgroundColor:
                          COLORS[index % COLORS.length],
                      }}
                    />
                    <span>{item.name}</span>
                    <strong>{money(item.spend)}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p8-empty">No category spending data.</div>
          )}
        </section>
      </div>

      {/* APPLICATION COST RANKING */}
      <section className="p8-panel p8-applications-panel">
        <div className="p8-section-heading">
          <div>
            <h2>Application Cost Analysis</h2>
            <p>
              Compare application spending, utilization, and
              savings opportunities
            </p>
          </div>

          <label className="p8-sort">
            <span>Sort</span>
            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as SortBy)
              }
            >
              <option value="cost">Highest Cost</option>
              <option value="name">Application Name</option>
              <option value="savings">Potential Savings</option>
              <option value="utilization">Lowest Utilization</option>
            </select>
          </label>
        </div>

        <div className="p8-table-search">
          <Search size={17} />
          <input
            aria-label="Search spending applications"
            placeholder="Search applications, owners, or departments..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="p8-table-scroll">
          <table className="p8-table">
            <thead>
              <tr>
                <th>APPLICATION</th>
                <th>DEPARTMENT</th>
                <th>MONTHLY SPEND</th>
                <th>ANNUALIZED</th>
                <th>UTILIZATION</th>
                <th>SAVINGS OPPORTUNITY</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.app.id}>
                  <td>
                    <div className="p8-app-cell">
                      <span
                        className="p8-app-avatar"
                        style={{ backgroundColor: row.app.color }}
                      >
                        {row.app.name.charAt(0).toUpperCase()}
                      </span>
                      <span>
                        <strong>{row.app.name}</strong>
                        <small>{row.app.category}</small>
                      </span>
                    </div>
                  </td>

                  <td>{row.app.department}</td>

                  <td>
                    <strong>{money(row.monthlySpend)}</strong>
                  </td>

                  <td>{money(row.annualSpend)}</td>

                  <td>
                    <div className="p8-usage">
                      <span>{percent(row.utilization)}</span>
                      <div>
                        <span
                          style={{
                            width: `${Math.min(
                              100,
                              row.utilization,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  <td>
                    <span className="p8-savings-value">
                      {money(row.savings)}/mo
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="p8-action"
                      onClick={() =>
                        onOpenApplication(row.app.id)
                      }
                    >
                      Details <ArrowRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length === 0 && (
            <div className="p8-empty">
              No applications match your filters.
            </div>
          )}
        </div>
      </section>

      {/* OPTIMIZATION */}
      <div className="p8-bottom-grid">
        <section className="p8-panel">
          <div className="p8-section-heading">
            <div>
              <h2>License Optimization</h2>
              <p>Applications below 70% utilization</p>
            </div>
            <span className="p8-count">{lowUtilization.length}</span>
          </div>

          {lowUtilization.length > 0 ? (
            <div className="p8-optimization-list">
              {lowUtilization.slice(0, 5).map((row) => (
                <div key={row.app.id} className="p8-optimization-row">
                  <span
                    className="p8-app-avatar"
                    style={{ backgroundColor: row.app.color }}
                  >
                    {row.app.name.charAt(0)}
                  </span>
                  <div>
                    <strong>{row.app.name}</strong>
                    <small>
                      {row.available} available seats ·{" "}
                      {percent(row.utilization)} utilized
                    </small>
                  </div>
                  <strong>{money(row.savings)}/mo</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="p8-empty">
              No applications are below 70% utilization
              in the selected scope.
            </div>
          )}

          <button
            type="button"
            className="p8-footer-link"
            onClick={onOpenLicenses}
          >
            Open License Management <ArrowRight size={16} />
          </button>
        </section>

        <section className="p8-insight">
          <Sparkles size={25} />
          <span>SPEND OPTIMIZATION</span>

          <h2>{money(totalSavings)}/month</h2>

          <p>
            Estimated value of unused license capacity.
            This represents a potential opportunity,
            not guaranteed contract savings.
          </p>

          <div className="p8-insight-stat">
            <span>Annual equivalent</span>
            <strong>{money(totalSavings * 12)}</strong>
          </div>

          <div className="p8-insight-stat">
            <span>Overall license utilization</span>
            <strong>{percent(overallUtilization)}</strong>
          </div>

          <button
            type="button"
            onClick={onOpenSubscriptions}
          >
            Review Subscriptions <ArrowRight size={16} />
          </button>
        </section>
      </div>
    </div>
  );
}
