
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  ArrowUpDown,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import LicenseManagement from "./components/LicenseManagement";
import EmployeeManagement from "./components/EmployeeManagement";
import SubscriptionManagement from "./components/SubscriptionManagement";
import SpendAnalytics from "./components/SpendAnalytics";
import SettingsManagement, {
  loadWorkspaceSettings,
} from "./components/SettingsManagement";
import type { WorkspaceSettings } from "./components/SettingsManagement";

import "./App.css";
import "./phase7.css";
import "./phase8.css";
import "./phase9.css";

// ==========================================
// TYPES
// ==========================================

type Page =
  | "Overview"
  | "Application Portfolio"
  | "License Management"
  | "Employees"
  | "Subscriptions"
  | "Spend Analytics"
  | "Settings";

type Status = "Active" | "Under Review" | "Inactive";
type Period = "6 Months" | "12 Months" | "24 Months";
type SortKey = "name" | "cost" | "utilization" | "renewal";
type MetricKey = "spend" | "apps" | "utilization" | "renewals";
type WidgetKey =
  | "spending"
  | "utilization"
  | "applications"
  | "renewals"
  | "departments"
  | "optimization";

interface SaaSApp {
  id: string;
  name: string;
  category: string;
  department: string;
  owner: string;
  purchased: number;
  assigned: number;
  monthlyCost: number;
  renewalDate: string;
  status: Status;
  color: string;
}

interface AppForm {
  name: string;
  category: string;
  department: string;
  owner: string;
  purchased: string;
  assigned: string;
  monthlyCost: string;
  renewalDate: string;
  status: Status;
}

interface DashboardPreferences {
  period: Period;
  hidden: WidgetKey[];
}

// ==========================================
// CONSTANTS
// ==========================================

const APPS_KEY = "saasflow-phase4-applications";
const PREFS_KEY = "saasflow-phase4-preferences";
const ASSIGNMENTS_KEY = "saasflow-phase5-assignments";
const SETTINGS_KEY = "saasflow-phase9-settings";
const DEMO_DATE = "2026-11-17";

const NAV: { page: Page; icon: LucideIcon }[] = [
  { page: "Overview", icon: LayoutDashboard },
  { page: "Application Portfolio", icon: Package },
  { page: "License Management", icon: ShieldCheck },
  { page: "Employees", icon: Users },
  { page: "Subscriptions", icon: CreditCard },
  { page: "Spend Analytics", icon: TrendingUp },
  { page: "Settings", icon: Settings },
];

const WIDGETS: { key: WidgetKey; label: string }[] = [
  { key: "spending", label: "SaaS Spending Overview" },
  { key: "utilization", label: "License Utilization" },
  { key: "applications", label: "Application Portfolio" },
  { key: "renewals", label: "Upcoming Renewals" },
  { key: "departments", label: "Spend by Department" },
  { key: "optimization", label: "Optimization Insights" },
];

const SAMPLE_APPS: SaaSApp[] = [
  {
    id: "APP-001",
    name: "Microsoft 365",
    category: "Productivity",
    department: "Operations",
    owner: "IT Operations",
    purchased: 250,
    assigned: 218,
    monthlyCost: 6250,
    renewalDate: "2026-11-29",
    status: "Active",
    color: "#e96843",
  },
  {
    id: "APP-002",
    name: "Figma",
    category: "Design",
    department: "Design",
    owner: "Design Team",
    purchased: 85,
    assigned: 72,
    monthlyCost: 3400,
    renewalDate: "2026-11-23",
    status: "Active",
    color: "#8b5cf6",
  },
  {
    id: "APP-003",
    name: "Slack",
    category: "Collaboration",
    department: "Operations",
    owner: "IT Operations",
    purchased: 220,
    assigned: 196,
    monthlyCost: 2640,
    renewalDate: "2027-01-15",
    status: "Active",
    color: "#953e85",
  },
  {
    id: "APP-004",
    name: "Notion",
    category: "Productivity",
    department: "Product",
    owner: "Product Team",
    purchased: 110,
    assigned: 84,
    monthlyCost: 1100,
    renewalDate: "2027-02-12",
    status: "Active",
    color: "#252e42",
  },
  {
    id: "APP-005",
    name: "Zoom",
    category: "Communication",
    department: "Sales",
    owner: "Sales Operations",
    purchased: 150,
    assigned: 124,
    monthlyCost: 2250,
    renewalDate: "2026-12-05",
    status: "Under Review",
    color: "#3886f2",
  },
  {
    id: "APP-006",
    name: "Jira Software",
    category: "Development",
    department: "Engineering",
    owner: "Engineering",
    purchased: 160,
    assigned: 131,
    monthlyCost: 1920,
    renewalDate: "2027-03-10",
    status: "Active",
    color: "#326dca",
  },
];

const MONTHS = [
  "Jan 25", "Feb 25", "Mar 25", "Apr 25", "May 25", "Jun 25",
  "Jul 25", "Aug 25", "Sep 25", "Oct 25", "Nov 25", "Dec 25",
  "Jan 26", "Feb 26", "Mar 26", "Apr 26", "May 26", "Jun 26",
  "Jul 26", "Aug 26", "Sep 26", "Oct 26", "Nov 26", "Dec 26",
];

const TREND = [
  0.72, 0.76, 0.75, 0.79, 0.77, 0.81,
  0.84, 0.82, 0.86, 0.88, 0.87, 0.89,
  0.85, 0.88, 0.91, 0.89, 0.93, 0.94,
  0.92, 0.96, 0.95, 0.98, 1, 1.02,
];

const COLORS = [
  "#7365f5",
  "#3886f2",
  "#16a875",
  "#953e85",
  "#e96843",
];

const DEFAULT_PREFS: DashboardPreferences = {
  period: "6 Months",
  hidden: [],
};

// ==========================================
// HELPERS
// ==========================================

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function compactMoney(value: number): string {
  return `$${Math.round(value / 1000)}k`;
}

function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function utilization(app: SaaSApp): number {
  return app.purchased > 0
    ? (app.assigned / app.purchased) * 100
    : 0;
}

function savings(app: SaaSApp): number {
  return app.status === "Inactive" || app.purchased === 0
    ? 0
    : ((app.purchased - app.assigned) / app.purchased) *
        app.monthlyCost;
}

function daysUntil(date: string): number {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) -
      Date.parse(`${DEMO_DATE}T00:00:00Z`)) /
      86400000,
  );
}

function dateText(date: string): string {
  const timestamp = Date.parse(`${date}T12:00:00Z`);
  if (!Number.isFinite(timestamp)) return date;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function getApps(): SaaSApp[] {
  try {
    const raw = localStorage.getItem(APPS_KEY);
    if (!raw) return SAMPLE_APPS;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SAMPLE_APPS;

    const valid = parsed.every((value: unknown) => {
      if (!value || typeof value !== "object") return false;
      const app = value as Partial<SaaSApp>;

      return (
        typeof app.id === "string" &&
        typeof app.name === "string" &&
        typeof app.category === "string" &&
        typeof app.department === "string" &&
        typeof app.owner === "string" &&
        typeof app.purchased === "number" &&
        Number.isInteger(app.purchased) &&
        app.purchased > 0 &&
        typeof app.assigned === "number" &&
        Number.isInteger(app.assigned) &&
        app.assigned >= 0 &&
        app.assigned <= app.purchased &&
        typeof app.monthlyCost === "number" &&
        Number.isFinite(app.monthlyCost) &&
        app.monthlyCost >= 0 &&
        typeof app.renewalDate === "string" &&
        typeof app.color === "string" &&
        (
          app.status === "Active" ||
          app.status === "Under Review" ||
          app.status === "Inactive"
        )
      );
    });

    return valid ? (parsed as SaaSApp[]) : SAMPLE_APPS;
  } catch {
    return SAMPLE_APPS;
  }
}

function getPreferences(): DashboardPreferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_PREFS;

    const item = parsed as Partial<DashboardPreferences>;
    const known = WIDGETS.map((widget) => widget.key);

    return {
      period:
        item.period === "12 Months" ||
        item.period === "24 Months"
          ? item.period
          : "6 Months",
      hidden: Array.isArray(item.hidden)
        ? item.hidden.filter(
            (key): key is WidgetKey =>
              typeof key === "string" &&
              known.includes(key as WidgetKey),
          )
        : [],
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function trackedAssignmentsFor(appId: string): number {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(ASSIGNMENTS_KEY) ?? "[]",
    );
    if (!Array.isArray(value)) return 0;

    return value.filter(
      (item: unknown) =>
        typeof item === "object" &&
        item !== null &&
        "appId" in item &&
        item.appId === appId,
    ).length;
  } catch {
    return 0;
  }
}

function newAppForm(app?: SaaSApp): AppForm {
  return {
    name: app?.name ?? "",
    category: app?.category ?? "Productivity",
    department: app?.department ?? "Operations",
    owner: app?.owner ?? "",
    purchased: String(app?.purchased ?? 10),
    assigned: String(app?.assigned ?? 0),
    monthlyCost: String(app?.monthlyCost ?? 0),
    renewalDate: app?.renewalDate ?? "2027-01-01",
    status: app?.status ?? "Active",
  };
}

function exportApplications(data: SaaSApp[]): void {
  const records = [
    [
      "Application",
      "Category",
      "Department",
      "Owner",
      "Purchased",
      "Assigned",
      "Monthly Cost",
      "Status",
      "Renewal Date",
    ],
    ...data.map((app) => [
      app.name,
      app.category,
      app.department,
      app.owner,
      String(app.purchased),
      String(app.assigned),
      String(app.monthlyCost),
      app.status,
      app.renewalDate,
    ]),
  ];

  const csv = records
    .map((record) =>
      record
        .map((cell) => {
          const safe = /^[=+\-@\t\r]/.test(cell)
            ? `'${cell}`
            : cell;
          return `"${safe.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");

  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8",
    }),
  );

  const link = document.createElement("a");
  link.href = url;
  link.download = "saasflow-applications.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ==========================================
// SHARED COMPONENTS
// ==========================================

function AppAvatar({ app }: { app: SaaSApp }) {
  return (
    <span
      className="app-avatar"
      style={{ backgroundColor: app.color }}
    >
      {app.name.charAt(0).toUpperCase()}
    </span>
  );
}

function StatusPill({ status }: { status: Status }) {
  const statusClass =
    status === "Active"
      ? "status-active"
      : status === "Under Review"
        ? "status-review"
        : "status-inactive";

  return (
    <span className={`status-pill ${statusClass}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}

function PortfolioTable({
  apps,
  onSelect,
}: {
  apps: SaaSApp[];
  onSelect: (app: SaaSApp) => void;
}) {
  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>APPLICATION</th>
            <th>CATEGORY</th>
            <th>LICENSES</th>
            <th>MONTHLY COST</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {apps.map((app) => (
            <tr key={app.id}>
              <td>
                <button
                  type="button"
                  className="phase4-app-link"
                  onClick={() => onSelect(app)}
                >
                  <AppAvatar app={app} />
                  <span>
                    <strong>{app.name}</strong>
                    <small>{app.owner}</small>
                  </span>
                  <ChevronRight size={14} />
                </button>
              </td>
              <td>{app.category}</td>
              <td>
                <div className="licenses-cell">
                  <span>
                    {app.assigned}/{app.purchased}
                  </span>
                  <div className="mini-progress">
                    <span
                      style={{
                        width: `${utilization(app)}%`,
                      }}
                    />
                  </div>
                </div>
              </td>
              <td className="cost-value">{money(app.monthlyCost)}</td>
              <td><StatusPill status={app.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {apps.length === 0 && (
        <div className="empty-state">
          <Search size={24} />
          <strong>No applications found</strong>
          <p>Try changing your filters.</p>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN APP
// ==========================================

export default function App() {
  const [apps, setApps] = useState<SaaSApp[]>(getApps);
  const [prefs, setPrefs] =
    useState<DashboardPreferences>(getPreferences);
  const [workspaceSettings, setWorkspaceSettings] =
    useState<WorkspaceSettings>(loadWorkspaceSettings);

  const [page, setPage] = useState<Page>(
    () => loadWorkspaceSettings().defaultPage,
  );

  const [mobileMenu, setMobileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [department, setDepartment] = useState("All Departments");
  const [category, setCategory] = useState("All Categories");
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [portfolioSearch, setPortfolioSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDescending, setSortDescending] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const [selectedAppId, setSelectedAppId] =
    useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] =
    useState<MetricKey | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [appFormOpen, setAppFormOpen] = useState(false);
  const [editingAppId, setEditingAppId] =
    useState<string | null>(null);
  const [appForm, setAppForm] =
    useState<AppForm>(() => newAppForm());
  const [formError, setFormError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [notice, setNotice] = useState("");

  // ========================================
  // STORAGE
  // ========================================

  useEffect(() => {
    try {
      localStorage.setItem(APPS_KEY, JSON.stringify(apps));
    } catch {
      // App remains usable without storage.
    }
  }, [apps]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // Preferences remain in memory.
    }
  }, [prefs]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(workspaceSettings),
      );
    } catch {
      // Settings remain in memory.
    }
  }, [workspaceSettings]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMobileMenu(false);
      setShowNotifications(false);
      setSelectedAppId(null);
      setSelectedMetric(null);
      setCustomizeOpen(false);
      setAppFormOpen(false);
      setDeleteConfirm(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  // ========================================
  // DASHBOARD METRICS
  // ========================================

  const selectedApp =
    apps.find((app) => app.id === selectedAppId) ?? null;

  const departments = [
    "All Departments",
    ...Array.from(new Set(apps.map((app) => app.department))),
  ];

  const categories = [
    "All Categories",
    ...Array.from(new Set(apps.map((app) => app.category))),
  ];

  const scopedApps = apps.filter(
    (app) =>
      (department === "All Departments" ||
        app.department === department) &&
      (category === "All Categories" ||
        app.category === category),
  );

  const dashboardRows = scopedApps.filter((app) =>
    [
      app.name,
      app.category,
      app.department,
      app.owner,
    ]
      .join(" ")
      .toLowerCase()
      .includes(dashboardSearch.trim().toLowerCase()),
  );

  const activeApps = scopedApps.filter(
    (app) => app.status !== "Inactive",
  );

  const allActiveApps = apps.filter(
    (app) => app.status !== "Inactive",
  );

  const monthlySpend = activeApps.reduce(
    (sum, app) => sum + app.monthlyCost,
    0,
  );

  const workspaceMonthlySpend = allActiveApps.reduce(
    (sum, app) => sum + app.monthlyCost,
    0,
  );

  const totalPurchased = activeApps.reduce(
    (sum, app) => sum + app.purchased,
    0,
  );

  const totalAssigned = activeApps.reduce(
    (sum, app) => sum + app.assigned,
    0,
  );

  const availableSeats = totalPurchased - totalAssigned;

  const utilizationRate = totalPurchased
    ? (totalAssigned / totalPurchased) * 100
    : 0;

  const potentialSavings = activeApps.reduce(
    (sum, app) => sum + savings(app),
    0,
  );

  const reminderWindow =
    workspaceSettings.renewalReminderDays;

  const renewals = activeApps
    .filter((app) => {
      const days = daysUntil(app.renewalDate);
      return days >= 0 &&
        days <= reminderWindow &&
        app.monthlyCost > 0;
    })
    .sort((a, b) =>
      a.renewalDate.localeCompare(b.renewalDate),
    );

  const allUpcomingRenewals = allActiveApps
    .filter((app) => {
      const days = daysUntil(app.renewalDate);
      return days >= 0 &&
        days <= reminderWindow &&
        app.monthlyCost > 0;
    })
    .sort((a, b) =>
      a.renewalDate.localeCompare(b.renewalDate),
    );

  const budgetExceeded =
    workspaceSettings.monthlyBudget > 0 &&
    workspaceMonthlySpend >
      workspaceSettings.monthlyBudget;

  const showRenewalAlert =
    workspaceSettings.renewalNotifications &&
    allUpcomingRenewals.length > 0;

  const showBudgetAlert =
    workspaceSettings.budgetNotifications &&
    budgetExceeded;

  const notificationCount =
    (showRenewalAlert ? allUpcomingRenewals.length : 0) +
    (showBudgetAlert ? 1 : 0);

  const monthsToShow =
    prefs.period === "6 Months"
      ? 6
      : prefs.period === "12 Months"
        ? 12
        : 24;

  const spendingTrend = MONTHS.map((month, index) => ({
    month,
    spend: Math.round(monthlySpend * TREND[index]),
    budget: Math.round(monthlySpend * TREND[index] * 1.1),
  })).slice(-monthsToShow);

  const departmentSpend = Array.from(
    new Set(activeApps.map((app) => app.department)),
  ).map((name) => ({
    name,
    value: activeApps
      .filter((app) => app.department === name)
      .reduce((sum, app) => sum + app.monthlyCost, 0),
  }));

  const kpis: {
    key: MetricKey;
    title: string;
    value: string;
    hint: string;
    icon: LucideIcon;
    color: string;
  }[] = [
    {
      key: "spend",
      title: "Monthly SaaS Spend",
      value: money(monthlySpend),
      hint: "Active subscriptions",
      icon: Wallet,
      color: "purple",
    },
    {
      key: "apps",
      title: "Managed Applications",
      value: String(scopedApps.length),
      hint: "In selected scope",
      icon: Package,
      color: "blue",
    },
    {
      key: "utilization",
      title: "License Utilization",
      value: percent(utilizationRate),
      hint: `${availableSeats} available seats`,
      icon: ShieldCheck,
      color: "green",
    },
    {
      key: "renewals",
      title: "Upcoming Renewals",
      value: String(renewals.length),
      hint: `Within ${reminderWindow} demo days`,
      icon: CalendarDays,
      color: "orange",
    },
  ];

  const metricInfo = kpis.find(
    (item) => item.key === selectedMetric,
  );

  // ========================================
  // PORTFOLIO FILTERING
  // ========================================

  const portfolioRows = useMemo(() => {
    const query = portfolioSearch.trim().toLowerCase();

    return apps
      .filter(
        (app) =>
          (statusFilter === "All Statuses" ||
            app.status === statusFilter) &&
          [
            app.name,
            app.category,
            app.department,
            app.owner,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query),
      )
      .sort((a, b) => {
        let result = 0;

        if (sortBy === "cost") {
          result = a.monthlyCost - b.monthlyCost;
        } else if (sortBy === "utilization") {
          result = utilization(a) - utilization(b);
        } else if (sortBy === "renewal") {
          result = a.renewalDate.localeCompare(b.renewalDate);
        } else {
          result = a.name.localeCompare(b.name);
        }

        return sortDescending ? -result : result;
      });
  }, [
    apps,
    portfolioSearch,
    statusFilter,
    sortBy,
    sortDescending,
  ]);

  const pageSize = 5;
  const totalPages = Math.max(
    1,
    Math.ceil(portfolioRows.length / pageSize),
  );

  const currentPage = Math.min(tablePage, totalPages);

  const paginatedApps = portfolioRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // ========================================
  // NAVIGATION AND ACTIONS
  // ========================================

  function navigate(target: Page) {
    setPage(target);
    setMobileMenu(false);
    setShowNotifications(false);
    setSelectedAppId(null);
    setSelectedMetric(null);
    setCustomizeOpen(false);
    window.scrollTo(0, 0);
  }

  function saveWorkspaceSettings(next: WorkspaceSettings) {
    setWorkspaceSettings(next);
    setNotice("Workspace preferences saved successfully.");
  }

  function updateAssignedLicenses(appId: string, assigned: number) {
    setApps((previous) =>
      previous.map((app) =>
        app.id === appId
          ? {
              ...app,
              assigned: Math.max(
                0,
                Math.min(app.purchased, assigned),
              ),
            }
          : app,
      ),
    );
  }

  function updateApplicationBilling(
    appId: string,
    monthlyCost: number,
    renewalDate: string,
  ) {
    setApps((previous) =>
      previous.map((app) =>
        app.id === appId
          ? { ...app, monthlyCost, renewalDate }
          : app,
      ),
    );
  }

  function widgetVisible(key: WidgetKey): boolean {
    return !prefs.hidden.includes(key);
  }

  function toggleWidget(key: WidgetKey) {
    setPrefs((previous) => ({
      ...previous,
      hidden: previous.hidden.includes(key)
        ? previous.hidden.filter((item) => item !== key)
        : [...previous.hidden, key],
    }));
  }

  function resetDashboard() {
    setPrefs(DEFAULT_PREFS);
    setDepartment("All Departments");
    setCategory("All Categories");
    setDashboardSearch("");
  }

  function openSpendApplication(appId: string) {
    if (!apps.some((app) => app.id === appId)) return;
    setPage("Application Portfolio");
    setSelectedAppId(appId);
  }

  // ========================================
  // APPLICATION CRUD
  // ========================================

  function openAddApplication() {
    setEditingAppId(null);
    setAppForm(newAppForm());
    setFormError("");
    setSelectedAppId(null);
    setAppFormOpen(true);
  }

  function openEditApplication(app: SaaSApp) {
    setEditingAppId(app.id);
    setAppForm(newAppForm(app));
    setFormError("");
    setSelectedAppId(null);
    setAppFormOpen(true);
  }

  function setAppField<K extends keyof AppForm>(
    key: K,
    value: AppForm[K],
  ) {
    setAppForm((previous) => ({ ...previous, [key]: value }));
    setFormError("");
  }

  function saveApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const purchased = Number(appForm.purchased);
    const assigned = Number(appForm.assigned);
    const cost = Number(appForm.monthlyCost);

    if (
      !appForm.name.trim() ||
      !appForm.category.trim() ||
      !appForm.department.trim() ||
      !appForm.owner.trim()
    ) {
      setFormError("Complete all application fields.");
      return;
    }

    if (
      appForm.purchased.trim() === "" ||
      !Number.isInteger(purchased) ||
      purchased < 1
    ) {
      setFormError("Purchased licenses must be a positive whole number.");
      return;
    }

    if (
      appForm.assigned.trim() === "" ||
      !Number.isInteger(assigned) ||
      assigned < 0 ||
      assigned > purchased
    ) {
      setFormError(
        "Assigned licenses must be between 0 and purchased seats.",
      );
      return;
    }

    if (
      appForm.monthlyCost.trim() === "" ||
      !Number.isFinite(cost) ||
      cost < 0
    ) {
      setFormError("Enter a valid monthly cost.");
      return;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(appForm.renewalDate) ||
      Number.isNaN(Date.parse(appForm.renewalDate))
    ) {
      setFormError("Enter a valid renewal date.");
      return;
    }

    if (
      apps.some(
        (app) =>
          app.name.toLowerCase() ===
            appForm.name.trim().toLowerCase() &&
          app.id !== editingAppId,
      )
    ) {
      setFormError("An application with this name already exists.");
      return;
    }

    if (
      editingAppId &&
      assigned < trackedAssignmentsFor(editingAppId)
    ) {
      setFormError(
        "Assigned seats cannot be lower than tracked employee licenses.",
      );
      return;
    }

    const previous = apps.find((app) => app.id === editingAppId);

    const record: SaaSApp = {
      id: editingAppId ?? `APP-${crypto.randomUUID()}`,
      name: appForm.name.trim(),
      category: appForm.category.trim(),
      department: appForm.department.trim(),
      owner: appForm.owner.trim(),
      purchased,
      assigned,
      monthlyCost: cost,
      renewalDate: appForm.renewalDate,
      status: appForm.status,
      color:
        previous?.color ?? COLORS[apps.length % COLORS.length],
    };

    setApps((current) =>
      editingAppId
        ? current.map((app) =>
            app.id === editingAppId ? record : app,
          )
        : [record, ...current],
    );

    setAppFormOpen(false);
    setEditingAppId(null);
    setNotice(
      previous
        ? "Application updated successfully."
        : "Application added successfully.",
    );
  }

  function changeAppStatus(app: SaaSApp) {
    const status: Status =
      app.status === "Inactive" ? "Active" : "Inactive";

    setApps((previous) =>
      previous.map((item) =>
        item.id === app.id ? { ...item, status } : item,
      ),
    );

    setSelectedAppId(null);
    setNotice(`${app.name} marked ${status.toLowerCase()}.`);
  }

  function deleteApplication() {
    if (!selectedApp) return;

    setApps((previous) =>
      previous.filter((app) => app.id !== selectedApp.id),
    );

    setNotice(`${selectedApp.name} deleted.`);
    setSelectedAppId(null);
    setDeleteConfirm(false);
  }

  function restoreSamples() {
    if (
      !window.confirm(
        "Restore original application data? This replaces saved applications.",
      )
    ) {
      return;
    }

    setApps(SAMPLE_APPS);
    setTablePage(1);
    setNotice("Sample applications restored.");
  }

  // ========================================
  // OVERVIEW PAGE
  // ========================================

  function renderOverview() {
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              WORKSPACE OVERVIEW
            </div>
            <h1>Executive Dashboard</h1>
            <p>
              Monitor SaaS spending, license utilization, and
              subscription renewals in one workspace.
            </p>
          </div>

          <div className="page-actions">
            <button
              className="button button-secondary"
              onClick={() => setCustomizeOpen(true)}
            >
              <SlidersHorizontal size={16} />
              Customize
            </button>
            <button
              className="button button-primary"
              onClick={() => exportApplications(scopedApps)}
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {workspaceSettings.showDashboardTips && (
          <div className="p9-dashboard-tip">
            <Sparkles size={17} />
            <span>
              Tip: Open Spend Analytics to compare software costs,
              or visit Settings to customize renewal and budget alerts.
            </span>
            <button
              type="button"
              onClick={() => navigate("Settings")}
            >
              Settings <ArrowRight size={14} />
            </button>
          </div>
        )}

        {showBudgetAlert && (
          <div className="p9-budget-warning">
            <Wallet size={18} />
            <span>
              Monthly SaaS spending ({money(workspaceMonthlySpend)})
              exceeds your configured budget of{" "}
              {money(workspaceSettings.monthlyBudget)}.
            </span>
            <button
              type="button"
              onClick={() => navigate("Settings")}
            >
              Review Budget
            </button>
          </div>
        )}

        <section className="phase3-filters">
          <div className="phase3-filter-heading">
            <SlidersHorizontal size={17} />
            <strong>Dashboard Filters</strong>
          </div>

          <div className="phase3-filter-controls">
            <label className="phase3-filter-field">
              <span>Department</span>
              <select
                value={department}
                onChange={(event) =>
                  setDepartment(event.target.value)
                }
              >
                {departments.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="phase3-filter-field">
              <span>Category</span>
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value)
                }
              >
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="phase3-filter-field">
              <span>Trend Period</span>
              <select
                value={prefs.period}
                onChange={(event) =>
                  setPrefs((previous) => ({
                    ...previous,
                    period: event.target.value as Period,
                  }))
                }
              >
                <option>6 Months</option>
                <option>12 Months</option>
                <option>24 Months</option>
              </select>
            </label>

            <button
              className="phase3-reset"
              onClick={() => {
                setDepartment("All Departments");
                setCategory("All Categories");
                setDashboardSearch("");
              }}
            >
              <RotateCcw size={15} />
              Clear Filters
            </button>
          </div>

          <p className="phase4-note">
            Showing {scopedApps.length} of {apps.length} applications.
            Inactive applications are excluded from spend.
          </p>
        </section>

        <section className="metrics-grid">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;

            return (
              <button
                key={kpi.key}
                className="metric-card phase3-metric"
                onClick={() => setSelectedMetric(kpi.key)}
              >
                <div className="metric-header">
                  <span className={`metric-icon metric-${kpi.color}`}>
                    <Icon size={20} />
                  </span>
                  <ArrowRight className="phase3-card-arrow" size={17} />
                </div>
                <p className="metric-label">{kpi.title}</p>
                <h3 className="metric-value">{kpi.value}</h3>
                <div className="metric-bottom">
                  <span className="metric-description">{kpi.hint}</span>
                </div>
              </button>
            );
          })}
        </section>

        <section className="analytics-grid phase3-widget-grid">
          {widgetVisible("spending") && (
            <article className="panel spend-panel">
              <div className="panel-heading">
                <div>
                  <h2>SaaS Spending Overview</h2>
                  <p>Illustrative spending and budget trends</p>
                </div>
                <span className="chart-period-label">{prefs.period}</span>
              </div>

              <div className="chart-legend">
                <span>
                  <i className="legend-dot legend-spend" />
                  Actual Spend
                </span>
                <span>
                  <i className="legend-dot legend-budget" />
                  Budget
                </span>
              </div>

              <div className="spend-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={spendingTrend}
                    margin={{ top: 10, right: 8, left: -16, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="phase9SpendGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#7365f5"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="100%"
                          stopColor="#7365f5"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      stroke="#edf0f6"
                      strokeDasharray="4 4"
                    />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      minTickGap={20}
                      tick={{ fill: "#94a0b3", fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={compactMoney}
                      tick={{ fill: "#94a0b3", fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value) => money(Number(value ?? 0))}
                    />
                    <Area
                      dataKey="spend"
                      name="Actual Spend"
                      type="monotone"
                      stroke="#7365f5"
                      strokeWidth={3}
                      fill="url(#phase9SpendGradient)"
                      dot={false}
                    />
                    <Area
                      dataKey="budget"
                      name="Budget"
                      type="monotone"
                      stroke="#adb7c8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="transparent"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <button
                type="button"
                className="text-button"
                onClick={() => navigate("Spend Analytics")}
              >
                Open Spend Analytics <ArrowRight size={15} />
              </button>
            </article>
          )}

          {widgetVisible("utilization") && (
            <article className="panel utilization-panel">
              <div className="panel-heading">
                <div>
                  <h2>License Utilization</h2>
                  <p>Purchased vs. assigned seats</p>
                </div>
                <button
                  className="phase3-icon-action"
                  aria-label="Manage licenses"
                  onClick={() => navigate("License Management")}
                >
                  <ArrowRight size={17} />
                </button>
              </div>

              <div
                className="utilization-donut"
                role="img"
                aria-label={`${percent(utilizationRate)} utilized`}
                style={
                  {
                    "--utilization": `${utilizationRate}%`,
                  } as CSSProperties
                }
              >
                <div className="donut-inner">
                  <strong>{percent(utilizationRate)}</strong>
                  <span>Utilized</span>
                </div>
              </div>

              <div className="utilization-summary">
                <div>
                  <span className="summary-dot assigned" />
                  <span>Assigned</span>
                  <strong>{totalAssigned}</strong>
                </div>
                <div>
                  <span className="summary-dot available" />
                  <span>Available</span>
                  <strong>{availableSeats}</strong>
                </div>
              </div>

              <div className="utilization-note">
                <CheckCircle2 size={16} />
                {totalPurchased} purchased seats
              </div>
            </article>
          )}
        </section>

        <section className="lower-grid phase3-widget-grid">
          {widgetVisible("applications") && (
            <article className="panel application-panel">
              <div className="panel-heading">
                <div>
                  <h2>Application Portfolio</h2>
                  <p>Managed software in your workspace</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => navigate("Application Portfolio")}
                >
                  View Portfolio <ArrowRight size={15} />
                </button>
              </div>

              <PortfolioTable
                apps={dashboardRows.slice(0, 5)}
                onSelect={(app) => setSelectedAppId(app.id)}
              />

              <div className="panel-footer">
                <span>{dashboardRows.length} matching applications</span>
                <button
                  className="text-button"
                  onClick={() => navigate("Application Portfolio")}
                >
                  Manage Applications <ArrowRight size={15} />
                </button>
              </div>
            </article>
          )}

          {widgetVisible("renewals") && (
            <article className="panel renewals-panel">
              <div className="panel-heading">
                <div>
                  <h2>Upcoming Renewals</h2>
                  <p>Due within {reminderWindow} demo days</p>
                </div>
                <span className="renewal-count">{renewals.length}</span>
              </div>

              <div className="renewals-list">
                {renewals.map((app) => (
                  <div className="renewal-item" key={app.id}>
                    <AppAvatar app={app} />
                    <div className="renewal-details">
                      <strong>{app.name}</strong>
                      <span>{app.category}</span>
                      <small>
                        <CalendarDays size={12} />
                        {dateText(app.renewalDate)}
                      </small>
                    </div>
                    <div className="renewal-meta">
                      <strong>{money(app.monthlyCost)}</strong>
                      <span
                        className={
                          daysUntil(app.renewalDate) <= 7
                            ? "renewal-urgent"
                            : "renewal-soon"
                        }
                      >
                        {daysUntil(app.renewalDate)} days
                      </span>
                    </div>
                  </div>
                ))}

                {renewals.length === 0 && (
                  <div className="phase3-empty-widget">
                    No upcoming renewals.
                  </div>
                )}
              </div>

              <button
                className="renewals-footer-button"
                onClick={() => navigate("Subscriptions")}
              >
                Manage Subscriptions <ArrowRight size={16} />
              </button>
            </article>
          )}
        </section>

        <section className="bottom-grid phase3-widget-grid">
          {widgetVisible("departments") && (
            <article className="panel department-panel">
              <div className="panel-heading">
                <div>
                  <h2>Spend by Department</h2>
                  <p>Current monthly spending</p>
                </div>
              </div>

              {departmentSpend.length > 0 ? (
                <div className="department-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={departmentSpend}
                      margin={{ top: 0, right: 12, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid
                        horizontal={false}
                        stroke="#edf0f6"
                        strokeDasharray="4 4"
                      />
                      <XAxis
                        type="number"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={compactMoney}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={95}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        formatter={(value) => money(Number(value ?? 0))}
                      />
                      <Bar
                        dataKey="value"
                        name="Monthly Spend"
                        fill="#7365f5"
                        radius={[0, 5, 5, 0]}
                        barSize={16}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="phase3-empty-widget">No spending data.</div>
              )}
            </article>
          )}

          {widgetVisible("optimization") && (
            <article className="insight-panel phase3-insight">
              <div className="insight-icon">
                <Sparkles size={22} />
              </div>
              <div className="insight-label">LICENSE OPTIMIZATION</div>
              <h2>{money(potentialSavings)}/mo</h2>
              <p>
                Estimated avoidable cost from{" "}
                <strong>{availableSeats} unassigned seats</strong>,
                based on average license pricing.
              </p>
              <div className="phase3-insight-stats">
                <span>Annual equivalent</span>
                <strong>{money(potentialSavings * 12)}</strong>
              </div>
              <button
                className="insight-button"
                onClick={() => navigate("Spend Analytics")}
              >
                View Spend Analytics <ArrowRight size={16} />
              </button>
              <div className="insight-decoration" aria-hidden="true" />
            </article>
          )}
        </section>

        {prefs.hidden.length === WIDGETS.length && (
          <div className="phase3-all-hidden">
            <EyeOff size={22} />
            <strong>All widgets are hidden</strong>
            <p>Customize your dashboard to restore them.</p>
            <button
              className="button button-primary"
              onClick={() => setCustomizeOpen(true)}
            >
              Customize Dashboard
            </button>
          </div>
        )}
      </>
    );
  }

  // ========================================
  // APPLICATION PORTFOLIO
  // ========================================

  function renderPortfolio() {
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              APPLICATION INVENTORY
            </div>
            <h1>Application Portfolio</h1>
            <p>
              Manage applications, owners, software costs,
              license capacity, and renewals.
            </p>
          </div>
          <div className="page-actions">
            <button
              className="button button-secondary"
              onClick={restoreSamples}
            >
              <RotateCcw size={16} />
              Reset Demo Data
            </button>
            <button
              className="button button-secondary"
              onClick={() => exportApplications(portfolioRows)}
            >
              <Download size={16} />
              Export CSV
            </button>
            <button
              className="button button-primary"
              onClick={openAddApplication}
            >
              <Plus size={16} />
              Add Application
            </button>
          </div>
        </div>

        <div className="phase4-summary">
          <div>
            <span>Total Applications</span>
            <strong>{apps.length}</strong>
          </div>
          <div>
            <span>Active Applications</span>
            <strong>
              {apps.filter((app) => app.status === "Active").length}
            </strong>
          </div>
          <div>
            <span>Monthly Active Spend</span>
            <strong>{money(workspaceMonthlySpend)}</strong>
          </div>
          <div>
            <span>Total Purchased Seats</span>
            <strong>
              {apps.reduce((sum, app) => sum + app.purchased, 0)}
            </strong>
          </div>
        </div>

        <article className="panel phase4-portfolio">
          <div className="panel-heading">
            <div>
              <h2>All Applications</h2>
              <p>Search, sort, and manage your SaaS portfolio</p>
            </div>
          </div>

          <div className="phase4-toolbar">
            <label className="phase4-search">
              <Search size={17} />
              <input
                value={portfolioSearch}
                placeholder="Search applications..."
                onChange={(event) => {
                  setPortfolioSearch(event.target.value);
                  setTablePage(1);
                }}
              />
            </label>

            <label>
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setTablePage(1);
                }}
              >
                <option>All Statuses</option>
                <option>Active</option>
                <option>Under Review</option>
                <option>Inactive</option>
              </select>
            </label>

            <label>
              <span>Sort by</span>
              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value as SortKey);
                  setTablePage(1);
                }}
              >
                <option value="name">Application Name</option>
                <option value="cost">Monthly Cost</option>
                <option value="utilization">Utilization</option>
                <option value="renewal">Renewal Date</option>
              </select>
            </label>

            <button
              className="phase4-sort"
              onClick={() => {
                setSortDescending((previous) => !previous);
                setTablePage(1);
              }}
            >
              <ArrowUpDown size={16} />
              {sortDescending ? "Descending" : "Ascending"}
            </button>
          </div>

          <PortfolioTable
            apps={paginatedApps}
            onSelect={(app) => setSelectedAppId(app.id)}
          />

          <div className="phase4-pagination">
            <span>
              Showing{" "}
              {portfolioRows.length
                ? (currentPage - 1) * pageSize + 1
                : 0}
              –{Math.min(currentPage * pageSize, portfolioRows.length)}{" "}
              of {portfolioRows.length}
            </span>
            <div>
              <button
                aria-label="Previous page"
                disabled={currentPage === 1}
                onClick={() =>
                  setTablePage((previous) => Math.max(1, previous - 1))
                }
              >
                <ChevronLeft size={17} />
              </button>
              <strong>{currentPage} / {totalPages}</strong>
              <button
                aria-label="Next page"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setTablePage((previous) =>
                    Math.min(totalPages, previous + 1),
                  )
                }
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </article>
      </>
    );
  }

  // ========================================
  // MAIN LAYOUT
  // ========================================

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark">
              <Activity size={22} strokeWidth={2.6} />
            </div>
            <div className="brand-text">
              <strong>SaaSFlow</strong>
              <span>Enterprise Platform</span>
            </div>
          </div>
          <button
            className="sidebar-close"
            aria-label="Close menu"
            onClick={() => setMobileMenu(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="workspace-selector">
          <div className="workspace-icon">
            {workspaceSettings.workspaceName.charAt(0).toUpperCase()}
          </div>
          <div>
            <strong>{workspaceSettings.workspaceName}</strong>
            <span>Enterprise Workspace</span>
          </div>
          <ChevronDown size={15} />
        </div>

        <div className="nav-section-title">WORKSPACE</div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {NAV.map(({ page: item, icon: Icon }) => (
            <button
              key={item}
              className={`nav-item ${
                page === item ? "nav-item-active" : ""
              }`}
              onClick={() => navigate(item)}
              aria-current={page === item ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{item}</span>
              {page === item && (
                <span className="nav-active-indicator" />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-support">
          <div className="support-icon">
            <CircleHelp size={19} />
          </div>
          <strong>Need assistance?</strong>
          <p>
            Manage applications, licenses, employees,
            subscriptions, spending, and workspace settings.
          </p>
          <button onClick={() => navigate("Settings")}>
            Workspace Settings <ArrowRight size={14} />
          </button>
        </div>

        <div className="sidebar-profile">
          <div className="profile-avatar">
            {initials(workspaceSettings.adminName)}
          </div>
          <div className="profile-details">
            <strong>{workspaceSettings.adminName}</strong>
            <span>Workspace Admin</span>
          </div>
          <MoreHorizontal size={18} />
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-button"
              aria-label="Open navigation"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={22} />
            </button>
            <div className="breadcrumbs">
              <span>Workspace</span>
              <ChevronRight size={15} />
              <strong>{page}</strong>
            </div>
          </div>

          <div className="topbar-right">
            {page === "Overview" && (
              <label className="topbar-search">
                <Search size={17} />
                <input
                  value={dashboardSearch}
                  placeholder="Search applications..."
                  aria-label="Search dashboard applications"
                  onChange={(event) =>
                    setDashboardSearch(event.target.value)
                  }
                />
                <kbd>/</kbd>
              </label>
            )}

            <div className="topbar-divider" />

            <div className="notifications-container">
              <button
                className="topbar-icon-button"
                aria-label="Notifications"
                aria-expanded={showNotifications}
                onClick={() =>
                  setShowNotifications((previous) => !previous)
                }
              >
                <Bell size={20} />
                {notificationCount > 0 && (
                  <span className="notification-indicator" />
                )}
              </button>

              {showNotifications && (
                <div className="notifications-popover">
                  <div className="notifications-heading">
                    <strong>Notifications</strong>
                    <span>{notificationCount} alerts</span>
                  </div>

                  {showBudgetAlert && (
                    <div className="p9-notification-item">
                      <strong>Monthly budget exceeded</strong>
                      <p>
                        Spending: {money(workspaceMonthlySpend)}.
                        Budget: {money(workspaceSettings.monthlyBudget)}.
                      </p>
                      <button onClick={() => navigate("Settings")}>
                        Review Budget
                      </button>
                    </div>
                  )}

                  {showRenewalAlert && (
                    <div className="p9-notification-item">
                      <strong>Upcoming renewals</strong>
                      <p>
                        {allUpcomingRenewals.length} application(s)
                        renew within {reminderWindow} demo days.
                      </p>
                      <button
                        onClick={() => navigate("Subscriptions")}
                      >
                        View Subscriptions
                      </button>
                    </div>
                  )}

                  {notificationCount === 0 && (
                    <p>No active notifications.</p>
                  )}
                </div>
              )}
            </div>

            <button
              className="header-profile"
              onClick={() => navigate("Settings")}
            >
              <span className="header-avatar">
                {initials(workspaceSettings.adminName)}
              </span>
              <span className="header-profile-text">
                <strong>{workspaceSettings.adminName}</strong>
                <small>Administrator</small>
              </span>
              <ChevronDown size={15} />
            </button>
          </div>
        </header>

        <main className="content">
          {notice && (
            <div className="phase4-notice" role="status">
              <CheckCircle2 size={17} />
              <span>{notice}</span>
              <button
                aria-label="Dismiss"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {page === "Overview" ? (
            renderOverview()
          ) : page === "Application Portfolio" ? (
            renderPortfolio()
          ) : page === "License Management" ? (
            <LicenseManagement
              apps={apps}
              onChangeAssigned={updateAssignedLicenses}
            />
          ) : page === "Employees" ? (
            <EmployeeManagement
              apps={apps}
              onChangeAssigned={updateAssignedLicenses}
            />
          ) : page === "Subscriptions" ? (
            <SubscriptionManagement
              apps={apps}
              onUpdateBilling={updateApplicationBilling}
            />
          ) : page === "Spend Analytics" ? (
            <SpendAnalytics
              apps={apps}
              onOpenApplication={openSpendApplication}
              onOpenSubscriptions={() => navigate("Subscriptions")}
              onOpenLicenses={() => navigate("License Management")}
            />
          ) : (
            <SettingsManagement
              settings={workspaceSettings}
              onSave={saveWorkspaceSettings}
              monthlySpend={workspaceMonthlySpend}
              activeApplications={allActiveApps.length}
            />
          )}
        </main>

        <footer className="app-footer">
          <span>
            © 2026 SaaSFlow · Frontend demonstration
          </span>
          <span>Changes saved locally in your browser</span>
        </footer>
      </div>

      {/* KPI DETAIL DRAWER */}
      {selectedMetric && metricInfo && (
        <div className="phase3-overlay">
          <button
            type="button"
            className="phase3-backdrop"
            aria-label="Close metric details"
            onClick={() => setSelectedMetric(null)}
          />
          <aside
            className="phase3-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`${metricInfo.title} details`}
          >
            <div className="phase3-drawer-header">
              <div>
                <span className="phase3-drawer-eyebrow">
                  METRIC BREAKDOWN
                </span>
                <h2>{metricInfo.title}</h2>
              </div>
              <button
                className="phase3-close"
                aria-label="Close"
                onClick={() => setSelectedMetric(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="phase3-drawer-content">
              <div className="phase3-drawer-total">
                <span>Selected Scope</span>
                <strong>{metricInfo.value}</strong>
                <small>{department} · {category}</small>
              </div>

              {selectedMetric === "utilization" && (
                <>
                  <div className="phase3-breakdown-pair">
                    <span>Purchased Seats</span>
                    <strong>{totalPurchased}</strong>
                  </div>
                  <div className="phase3-breakdown-pair">
                    <span>Assigned Seats</span>
                    <strong>{totalAssigned}</strong>
                  </div>
                  <div className="phase3-breakdown-pair">
                    <span>Available Seats</span>
                    <strong>{availableSeats}</strong>
                  </div>
                  <div className="phase3-breakdown-pair">
                    <span>Potential Monthly Savings</span>
                    <strong>{money(potentialSavings)}</strong>
                  </div>
                </>
              )}

              <p className="phase3-explanation">
                {selectedMetric === "renewals"
                  ? `Applications renewing within ${reminderWindow} days of the demo reference date.`
                  : selectedMetric === "spend"
                    ? "Monthly costs for applications in the selected scope."
                    : selectedMetric === "apps"
                      ? "Applications matching the selected dashboard filters."
                      : "Assigned seats divided by purchased seats."}
              </p>

              <h3 className="phase3-drawer-section-title">
                Application Breakdown
              </h3>

              {(selectedMetric === "renewals"
                ? renewals
                : selectedMetric === "apps"
                  ? scopedApps
                  : activeApps
              ).map((app) => (
                <div className="phase3-breakdown-app" key={app.id}>
                  <AppAvatar app={app} />
                  <div className="phase3-breakdown-app-name">
                    <strong>{app.name}</strong>
                    <span>{app.department}</span>
                  </div>
                  <div className="phase3-breakdown-app-value">
                    <strong>
                      {selectedMetric === "utilization"
                        ? `${app.assigned}/${app.purchased}`
                        : selectedMetric === "apps"
                          ? app.status
                          : money(app.monthlyCost)}
                    </strong>
                  </div>
                </div>
              ))}

              <div className="phase3-drawer-disclaimer">
                Frontend demonstration data. Historical trends
                and potential savings are illustrative.
              </div>
            </div>

            <div className="phase3-drawer-footer">
              <button
                className="button button-secondary"
                onClick={() => setSelectedMetric(null)}
              >
                Close
              </button>
              <button
                className="button button-primary"
                onClick={() =>
                  exportApplications(
                    selectedMetric === "renewals"
                      ? renewals
                      : selectedMetric === "apps"
                        ? scopedApps
                        : activeApps,
                  )
                }
              >
                <Download size={16} />
                Export Breakdown
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* DASHBOARD CUSTOMIZATION */}
      {customizeOpen && (
        <div className="phase3-overlay">
          <button
            className="phase3-backdrop"
            aria-label="Close customization"
            onClick={() => setCustomizeOpen(false)}
          />

          <aside
            className="phase3-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Customize dashboard"
          >
            <div className="phase3-drawer-header">
              <div>
                <span className="phase3-drawer-eyebrow">
                  YOUR WORKSPACE
                </span>
                <h2>Customize Dashboard</h2>
              </div>
              <button
                className="phase3-close"
                aria-label="Close"
                onClick={() => setCustomizeOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="phase3-drawer-content">
              <p className="phase3-explanation">
                Choose which dashboard widgets are visible.
                Your preferences are saved in this browser.
              </p>

              <div className="phase3-customize-summary">
                <Eye size={18} />
                {WIDGETS.length - prefs.hidden.length} of{" "}
                {WIDGETS.length} widgets visible
              </div>

              {WIDGETS.map((widget) => (
                <label
                  className="phase3-widget-option"
                  key={widget.key}
                >
                  <span className="phase3-widget-option-icon">
                    {widgetVisible(widget.key) ? (
                      <Eye size={18} />
                    ) : (
                      <EyeOff size={18} />
                    )}
                  </span>
                  <span className="phase3-widget-option-copy">
                    <strong>{widget.label}</strong>
                  </span>
                  <input
                    type="checkbox"
                    checked={widgetVisible(widget.key)}
                    onChange={() => toggleWidget(widget.key)}
                  />
                </label>
              ))}

              <button
                className="phase3-reset-all"
                onClick={resetDashboard}
              >
                <RotateCcw size={16} />
                Reset Dashboard
              </button>
            </div>

            <div className="phase3-drawer-footer">
              <button
                className="button button-secondary"
                onClick={resetDashboard}
              >
                Reset
              </button>
              <button
                className="button button-primary"
                onClick={() => setCustomizeOpen(false)}
              >
                <Check size={16} />
                Done
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* APPLICATION DETAIL DRAWER */}
      {selectedApp && (
        <div className="phase3-overlay">
          <button
            type="button"
            className="phase3-backdrop"
            aria-label="Close application details"
            onClick={() => {
              setSelectedAppId(null);
              setDeleteConfirm(false);
            }}
          />
          <aside
            className="phase3-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedApp.name} details`}
          >
            <div className="phase3-drawer-header">
              <div>
                <span className="phase3-drawer-eyebrow">
                  APPLICATION DETAILS
                </span>
                <h2>{selectedApp.name}</h2>
              </div>
              <button
                className="phase3-close"
                aria-label="Close"
                onClick={() => setSelectedAppId(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="phase3-drawer-content">
              <div className="phase4-detail-heading">
                <AppAvatar app={selectedApp} />
                <div>
                  <strong>{selectedApp.name}</strong>
                  <StatusPill status={selectedApp.status} />
                </div>
              </div>

              {(
                [
                  ["Category", selectedApp.category],
                  ["Department", selectedApp.department],
                  ["Owner", selectedApp.owner],
                  ["Monthly Cost", money(selectedApp.monthlyCost)],
                  ["Purchased Licenses", String(selectedApp.purchased)],
                  ["Assigned Licenses", String(selectedApp.assigned)],
                  ["Utilization", percent(utilization(selectedApp))],
                  ["Renewal Date", dateText(selectedApp.renewalDate)],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div className="phase3-breakdown-pair" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}

              <div className="phase4-progress">
                <span
                  style={{
                    width: `${utilization(selectedApp)}%`,
                  }}
                />
              </div>

              <div className="phase4-detail-insight">
                <Sparkles size={17} />
                <span>
                  {selectedApp.purchased - selectedApp.assigned}{" "}
                  available seats. Estimated savings:{" "}
                  {money(savings(selectedApp))}/month.
                </span>
              </div>

              <div className="phase4-detail-actions">
                <button
                  className="button button-secondary"
                  onClick={() => changeAppStatus(selectedApp)}
                >
                  {selectedApp.status === "Inactive"
                    ? "Reactivate"
                    : "Archive Application"}
                </button>
                <button
                  className="button button-secondary"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>

              {deleteConfirm && (
                <div className="phase4-danger">
                  <strong>Delete {selectedApp.name}?</strong>
                  <p>
                    This removes the application from your portfolio.
                    Related subscriptions may no longer appear in the
                    subscription inventory.
                  </p>
                  <div>
                    <button
                      className="button button-secondary"
                      onClick={() => setDeleteConfirm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="button phase4-danger-button"
                      onClick={deleteApplication}
                    >
                      Delete Permanently
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="phase3-drawer-footer">
              <button
                className="button button-secondary"
                onClick={() => setSelectedAppId(null)}
              >
                Close
              </button>
              <button
                className="button button-primary"
                onClick={() => openEditApplication(selectedApp)}
              >
                <Pencil size={16} />
                Edit Application
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ADD / EDIT APPLICATION */}
      {appFormOpen && (
        <div className="phase3-overlay">
          <button
            type="button"
            className="phase3-backdrop"
            aria-label="Close application form"
            onClick={() => setAppFormOpen(false)}
          />
          <aside
            className="phase3-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={
              editingAppId ? "Edit application" : "Add application"
            }
          >
            <div className="phase3-drawer-header">
              <div>
                <span className="phase3-drawer-eyebrow">
                  APPLICATION PORTFOLIO
                </span>
                <h2>
                  {editingAppId ? "Edit Application" : "Add Application"}
                </h2>
              </div>
              <button
                className="phase3-close"
                aria-label="Close"
                onClick={() => setAppFormOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="phase4-form"
              onSubmit={saveApplication}
              noValidate
            >
              <div className="phase3-drawer-content">
                <p className="phase3-explanation">
                  Application details are shared across your dashboard,
                  licenses, subscriptions, and spending analytics.
                </p>

                {formError && (
                  <div className="phase4-error" role="alert">
                    {formError}
                  </div>
                )}

                <label>
                  Application Name
                  <input
                    value={appForm.name}
                    maxLength={80}
                    placeholder="e.g. Salesforce"
                    onChange={(event) =>
                      setAppField("name", event.target.value)
                    }
                  />
                </label>

                <div className="phase4-form-grid">
                  <label>
                    Category
                    <input
                      value={appForm.category}
                      onChange={(event) =>
                        setAppField("category", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Department
                    <input
                      value={appForm.department}
                      onChange={(event) =>
                        setAppField("department", event.target.value)
                      }
                    />
                  </label>
                </div>

                <label>
                  Application Owner
                  <input
                    value={appForm.owner}
                    onChange={(event) =>
                      setAppField("owner", event.target.value)
                    }
                  />
                </label>

                <div className="phase4-form-grid">
                  <label>
                    Purchased Licenses
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={appForm.purchased}
                      onChange={(event) =>
                        setAppField("purchased", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Assigned Licenses
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={appForm.assigned}
                      onChange={(event) =>
                        setAppField("assigned", event.target.value)
                      }
                    />
                  </label>
                </div>

                <div className="phase4-form-grid">
                  <label>
                    Monthly Cost (USD)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={appForm.monthlyCost}
                      onChange={(event) =>
                        setAppField("monthlyCost", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Renewal Date
                    <input
                      type="date"
                      value={appForm.renewalDate}
                      onChange={(event) =>
                        setAppField("renewalDate", event.target.value)
                      }
                    />
                  </label>
                </div>

                <label>
                  Status
                  <select
                    value={appForm.status}
                    onChange={(event) =>
                      setAppField(
                        "status",
                        event.target.value as Status,
                      )
                    }
                  >
                    <option>Active</option>
                    <option>Under Review</option>
                    <option>Inactive</option>
                  </select>
                </label>
              </div>

              <div className="phase3-drawer-footer">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setAppFormOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="button button-primary">
                  <Check size={16} />
                  {editingAppId ? "Save Changes" : "Add Application"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
