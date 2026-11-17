
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

export interface LicenseApp {
  id: string;
  name: string;
  category: string;
  department: string;
  owner: string;
  purchased: number;
  assigned: number;
  monthlyCost: number;
  status: "Active" | "Under Review" | "Inactive";
  color: string;
}

export interface LicenseManagementProps {
  apps: LicenseApp[];
  onChangeAssigned: (appId: string, assigned: number) => void;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
}

interface Assignment {
  id: string;
  appId: string;
  employeeId: string;
  assignedAt: string;
}

type UtilizationFilter = "All" | "Low" | "Healthy" | "Full";
type AppStatusFilter = "All" | "Active" | "Under Review" | "Inactive";

const EMPLOYEE_KEY = "saasflow-phase5-employees";
const ASSIGNMENT_KEY = "saasflow-phase5-assignments";

const SAMPLE_EMPLOYEES: Employee[] = [
  {
    id: "EMP-001",
    name: "Olivia Martinez",
    email: "olivia@example.com",
    department: "Design",
  },
  {
    id: "EMP-002",
    name: "James Wilson",
    email: "james@example.com",
    department: "Engineering",
  },
  {
    id: "EMP-003",
    name: "Sophia Lee",
    email: "sophia@example.com",
    department: "Product",
  },
  {
    id: "EMP-004",
    name: "Noah Anderson",
    email: "noah@example.com",
    department: "Operations",
  },
  {
    id: "EMP-005",
    name: "Emma Thompson",
    email: "emma@example.com",
    department: "Sales",
  },
  {
    id: "EMP-006",
    name: "Ava Patel",
    email: "ava@example.com",
    department: "Marketing",
  },
];

function readEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(EMPLOYEE_KEY);
    if (!raw) return SAMPLE_EMPLOYEES;

    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return SAMPLE_EMPLOYEES;

    const valid = value.every((item: unknown) => {
      if (!item || typeof item !== "object") return false;

      const employee = item as Partial<Employee>;
      return (
        typeof employee.id === "string" &&
        typeof employee.name === "string" &&
        typeof employee.email === "string" &&
        typeof employee.department === "string"
      );
    });

    return valid ? (value as Employee[]) : SAMPLE_EMPLOYEES;
  } catch {
    return SAMPLE_EMPLOYEES;
  }
}

function readAssignments(): Assignment[] {
  try {
    const raw = localStorage.getItem(ASSIGNMENT_KEY);
    if (!raw) return [];

    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];

    return value.filter((item: unknown): item is Assignment => {
      if (!item || typeof item !== "object") return false;

      const assignment = item as Partial<Assignment>;

      return (
        typeof assignment.id === "string" &&
        typeof assignment.appId === "string" &&
        typeof assignment.employeeId === "string" &&
        typeof assignment.assignedAt === "string"
      );
    });
  } catch {
    return [];
  }
}

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

function getUtilization(app: LicenseApp): number {
  return app.purchased > 0
    ? Math.min(100, (app.assigned / app.purchased) * 100)
    : 0;
}

function getAvailable(app: LicenseApp): number {
  return Math.max(0, app.purchased - app.assigned);
}

function getMonthlyOpportunity(app: LicenseApp): number {
  if (app.status === "Inactive" || app.purchased <= 0) {
    return 0;
  }

  return (app.monthlyCost / app.purchased) * getAvailable(app);
}

function getUtilizationStatus(
  app: LicenseApp,
): "Low" | "Healthy" | "Full" {
  const usage = getUtilization(app);

  if (usage >= 100) return "Full";
  if (usage < 70) return "Low";
  return "Healthy";
}

function exportLicenseCSV(apps: LicenseApp[]): void {
  const rows = [
    [
      "Application",
      "Department",
      "Purchased",
      "Assigned",
      "Available",
      "Utilization",
      "Monthly Cost",
      "Estimated Monthly Opportunity",
      "Status",
    ],
    ...apps.map((app) => [
      app.name,
      app.department,
      String(app.purchased),
      String(app.assigned),
      String(getAvailable(app)),
      percent(getUtilization(app)),
      String(app.monthlyCost),
      getMonthlyOpportunity(app).toFixed(2),
      app.status,
    ]),
  ];

  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const safe = /^[=+\-@\t\r]/.test(cell)
            ? `'${cell}`
            : cell;
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
  anchor.download = "saasflow-license-inventory.csv";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ApplicationIcon({ app }: { app: LicenseApp }) {
  return (
    <span
      className="p5-app-icon"
      style={{ backgroundColor: app.color }}
      aria-hidden="true"
    >
      {app.name.charAt(0).toUpperCase()}
    </span>
  );
}

function EmployeeAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <span className="p5-employee-avatar" aria-hidden="true">
      {initials}
    </span>
  );
}

export default function LicenseManagement({
  apps,
  onChangeAssigned,
}: LicenseManagementProps) {
  const [employees, setEmployees] = useState<Employee[]>(readEmployees);
  const [assignments, setAssignments] =
    useState<Assignment[]>(readAssignments);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<AppStatusFilter>("All");
  const [utilizationFilter, setUtilizationFilter] =
    useState<UtilizationFilter>("All");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [page, setPage] = useState(1);

  const [selectedAppId, setSelectedAppId] = useState<string | null>(
    null,
  );
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [employeeOpen, setEmployeeOpen] = useState(false);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [assignmentAppId, setAssignmentAppId] = useState("");

  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeeDepartment, setEmployeeDepartment] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(employees));
    } catch {
      // Changes remain in memory if storage is unavailable.
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem(
        ASSIGNMENT_KEY,
        JSON.stringify(assignments),
      );
    } catch {
      // Changes remain in memory if storage is unavailable.
    }
  }, [assignments]);

  // Remove assignment records for deleted applications.
  useEffect(() => {
    const appIds = new Set(apps.map((app) => app.id));

    setAssignments((current) => {
      const next = current.filter(
        (assignment) => appIds.has(assignment.appId),
      );
      return next.length === current.length ? current : next;
    });
  }, [apps]);

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedAppId(null);
        setAssignmentOpen(false);
        setEmployeeOpen(false);
        setError("");
      }
    }

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  const departments = useMemo(
    () => [
      "All",
      ...Array.from(new Set(apps.map((app) => app.department))),
    ],
    [apps],
  );

  const activeApps = apps.filter(
    (app) => app.status !== "Inactive",
  );

  const totalPurchased = activeApps.reduce(
    (sum, app) => sum + app.purchased,
    0,
  );

  const totalAssigned = activeApps.reduce(
    (sum, app) => sum + app.assigned,
    0,
  );

  const totalAvailable = totalPurchased - totalAssigned;

  const overallUtilization =
    totalPurchased > 0
      ? (totalAssigned / totalPurchased) * 100
      : 0;

  const potentialSavings = activeApps.reduce(
    (sum, app) => sum + getMonthlyOpportunity(app),
    0,
  );

  const lowUtilizationApps = activeApps.filter(
    (app) => getUtilizationStatus(app) === "Low",
  );

  const filteredApps = useMemo(() => {
    const query = search.trim().toLowerCase();

    return apps.filter((app) => {
      const matchesSearch = [
        app.name,
        app.category,
        app.department,
        app.owner,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

      const matchesStatus =
        statusFilter === "All" || app.status === statusFilter;

      const matchesDepartment =
        departmentFilter === "All" ||
        app.department === departmentFilter;

      const matchesUtilization =
        utilizationFilter === "All" ||
        getUtilizationStatus(app) === utilizationFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDepartment &&
        matchesUtilization
      );
    });
  }, [
    apps,
    search,
    statusFilter,
    departmentFilter,
    utilizationFilter,
  ]);

  const pageSize = 5;
  const pageCount = Math.max(
    1,
    Math.ceil(filteredApps.length / pageSize),
  );
  const currentPage = Math.min(page, pageCount);
  const visibleApps = filteredApps.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const selectedApp =
    apps.find((app) => app.id === selectedAppId) ?? null;

  const assignmentApp =
    apps.find((app) => app.id === assignmentAppId) ?? null;

  const selectedAssignments = assignments.filter(
    (assignment) => assignment.appId === selectedAppId,
  );

  const trackedCount = selectedApp
    ? selectedAssignments.length
    : 0;

  const previousAssignments = selectedApp
    ? Math.max(0, selectedApp.assigned - trackedCount)
    : 0;

  const availableEmployees = employees.filter(
    (employee) =>
      !assignments.some(
        (assignment) =>
          assignment.appId === assignmentAppId &&
          assignment.employeeId === employee.id,
      ),
  );

  function clearFilters() {
    setSearch("");
    setStatusFilter("All");
    setDepartmentFilter("All");
    setUtilizationFilter("All");
    setPage(1);
  }

  function openAssignment(appId = "") {
    setAssignmentAppId(appId);
    setSelectedEmployeeId("");
    setError("");
    setSelectedAppId(null);
    setAssignmentOpen(true);
  }

  function assignLicense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const app = apps.find(
      (item) => item.id === assignmentAppId,
    );

    const employee = employees.find(
      (item) => item.id === selectedEmployeeId,
    );

    if (!app || !employee) {
      setError("Select an application and an employee.");
      return;
    }

    if (app.status === "Inactive") {
      setError("Inactive applications cannot receive new assignments.");
      return;
    }

    if (getAvailable(app) <= 0) {
      setError("No available seats. Increase license capacity first.");
      return;
    }

    const existing = assignments.some(
      (assignment) =>
        assignment.appId === app.id &&
        assignment.employeeId === employee.id,
    );

    if (existing) {
      setError("This employee already has a tracked license.");
      return;
    }

    const newAssignment: Assignment = {
      id: `ASN-${crypto.randomUUID()}`,
      appId: app.id,
      employeeId: employee.id,
      assignedAt: new Date().toISOString().slice(0, 10),
    };

    setAssignments((current) => [...current, newAssignment]);

    // Updates the shared Phase 4 application record.
    onChangeAssigned(app.id, app.assigned + 1);

    setNotice(
      `${app.name} assigned to ${employee.name}. Dashboard updated.`,
    );
    setAssignmentOpen(false);
    setSelectedEmployeeId("");
  }

  function revokeLicense(assignment: Assignment) {
    const app = apps.find(
      (item) => item.id === assignment.appId,
    );

    const employee = employees.find(
      (item) => item.id === assignment.employeeId,
    );

    if (!app) {
      setError("This application no longer exists.");
      return;
    }

    if (app.assigned <= 0) {
      setError(
        "No assigned seats remain. Review the application totals first.",
      );
      return;
    }

    setAssignments((current) =>
      current.filter((item) => item.id !== assignment.id),
    );

    onChangeAssigned(app.id, app.assigned - 1);

    setNotice(
      `License removed from ${employee?.name ?? "employee"}.`,
    );
  }

  function addEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const name = employeeName.trim();
    const email = employeeEmail.trim().toLowerCase();
    const department = employeeDepartment.trim();

    if (!name || !email || !department) {
      setError("Please complete all employee fields.");
      return;
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!emailValid) {
      setError("Enter a valid employee email address.");
      return;
    }

    if (
      employees.some(
        (employee) => employee.email.toLowerCase() === email,
      )
    ) {
      setError("An employee with this email already exists.");
      return;
    }

    const employee: Employee = {
      id: `EMP-${crypto.randomUUID()}`,
      name,
      email,
      department,
    };

    setEmployees((current) => [...current, employee]);

    setEmployeeName("");
    setEmployeeEmail("");
    setEmployeeDepartment("");
    setEmployeeOpen(false);

    setNotice(`${name} added to the employee directory.`);
  }

  function getEmployee(employeeId: string): Employee | undefined {
    return employees.find(
      (employee) => employee.id === employeeId,
    );
  }

  return (
    <div className="p5-page">
      {/* PAGE HEADER */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            ACCESS & UTILIZATION
          </div>
          <h1>License Management</h1>
          <p>
            Monitor software seats, assign licenses to employees,
            and identify opportunities to optimize spending.
          </p>
        </div>

        <div className="page-actions">
          <button
            className="button button-secondary"
            onClick={() => exportLicenseCSV(filteredApps)}
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            className="button button-secondary"
            onClick={() => {
              setError("");
              setEmployeeOpen(true);
            }}
          >
            <UserPlus size={16} />
            Add Employee
          </button>

          <button
            className="button button-primary"
            onClick={() => openAssignment()}
          >
            <Plus size={16} />
            Assign License
          </button>
        </div>
      </div>

      {notice && (
        <div className="p5-notice" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="p5-kpis">
        <div className="p5-kpi">
          <span className="p5-kpi-icon purple">
            <ShieldCheck size={20} />
          </span>
          <span>Purchased Licenses</span>
          <strong>{totalPurchased.toLocaleString()}</strong>
          <small>Across active applications</small>
        </div>

        <div className="p5-kpi">
          <span className="p5-kpi-icon blue">
            <Users size={20} />
          </span>
          <span>Assigned Licenses</span>
          <strong>{totalAssigned.toLocaleString()}</strong>
          <small>{percent(overallUtilization)} utilized</small>
        </div>

        <div className="p5-kpi">
          <span className="p5-kpi-icon orange">
            <CheckCircle2 size={20} />
          </span>
          <span>Available Licenses</span>
          <strong>{totalAvailable.toLocaleString()}</strong>
          <small>Unassigned seats</small>
        </div>

        <div className="p5-kpi">
          <span className="p5-kpi-icon green">
            <Sparkles size={20} />
          </span>
          <span>Potential Savings</span>
          <strong>{money(potentialSavings)}</strong>
          <small>Illustrative monthly opportunity</small>
        </div>
      </div>

      {/* OPTIMIZATION SUMMARY */}
      <div className="p5-insights">
        <div className="p5-utilization-panel">
          <div className="p5-section-heading">
            <div>
              <h2>Overall License Utilization</h2>
              <p>Assigned seats compared to purchased capacity</p>
            </div>
            <strong>{percent(overallUtilization)}</strong>
          </div>

          <div className="p5-main-progress">
            <span
              style={{
                width: `${Math.min(100, overallUtilization)}%`,
              }}
            />
          </div>

          <div className="p5-progress-labels">
            <span>{totalAssigned} assigned</span>
            <span>{totalAvailable} available</span>
          </div>

          <div className="p5-info-note">
            <AlertCircle size={16} />
            <span>
              Existing Phase 4 assignments are preserved in aggregate.
              New employee assignments can be managed individually.
            </span>
          </div>
        </div>

        <div className="p5-opportunity-panel">
          <Sparkles size={22} />
          <div>
            <span>OPTIMIZATION INSIGHT</span>
            <h2>
              {lowUtilizationApps.length} applications below
              70% utilization
            </h2>
            <p>
              Review unused seats before reducing subscriptions.
              Estimated annual equivalent:{" "}
              <strong>{money(potentialSavings * 12)}</strong>.
            </p>
          </div>
          <button
            onClick={() => {
              setUtilizationFilter("Low");
              setStatusFilter("Active");
              setDepartmentFilter("All");
              setPage(1);
            }}
          >
            Review applications
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* LICENSE INVENTORY */}
      <section className="p5-inventory">
        <div className="p5-section-heading">
          <div>
            <h2>License Inventory</h2>
            <p>
              Review application capacity, assignment levels,
              and utilization.
            </p>
          </div>
        </div>

        <div className="p5-toolbar">
          <label className="p5-search">
            <Search size={17} />
            <input
              value={search}
              placeholder="Search applications..."
              aria-label="Search license inventory"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <label className="p5-select-field">
            <span>Department</span>
            <select
              value={departmentFilter}
              onChange={(event) => {
                setDepartmentFilter(event.target.value);
                setPage(1);
              }}
            >
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department === "All"
                    ? "All Departments"
                    : department}
                </option>
              ))}
            </select>
          </label>

          <label className="p5-select-field">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(
                  event.target.value as AppStatusFilter,
                );
                setPage(1);
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Under Review">Under Review</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>

          <label className="p5-select-field">
            <span>Utilization</span>
            <select
              value={utilizationFilter}
              onChange={(event) => {
                setUtilizationFilter(
                  event.target.value as UtilizationFilter,
                );
                setPage(1);
              }}
            >
              <option value="All">All Utilization</option>
              <option value="Low">Below 70%</option>
              <option value="Healthy">70% to below 100%</option>
              <option value="Full">100% Full</option>
            </select>
          </label>

          <button className="p5-clear" onClick={clearFilters}>
            <Filter size={15} />
            Clear
          </button>
        </div>

        <div className="p5-table-scroll">
          <table className="p5-table">
            <thead>
              <tr>
                <th>APPLICATION</th>
                <th>PURCHASED</th>
                <th>ASSIGNED</th>
                <th>AVAILABLE</th>
                <th>UTILIZATION</th>
                <th>MONTHLY COST</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {visibleApps.map((app) => (
                <tr key={app.id}>
                  <td>
                    <div className="p5-app-cell">
                      <ApplicationIcon app={app} />
                      <div>
                        <strong>{app.name}</strong>
                        <small>{app.department}</small>
                      </div>
                    </div>
                  </td>

                  <td>{app.purchased}</td>
                  <td>{app.assigned}</td>
                  <td>{getAvailable(app)}</td>

                  <td>
                    <div className="p5-table-usage">
                      <span>{percent(getUtilization(app))}</span>
                      <div className="p5-mini-progress">
                        <span
                          style={{
                            width: `${getUtilization(app)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>

                  <td>
                    <strong>{money(app.monthlyCost)}</strong>
                  </td>

                  <td>
                    <div className="p5-row-actions">
                      <button
                        onClick={() => setSelectedAppId(app.id)}
                      >
                        Manage
                      </button>
                      <button
                        disabled={
                          app.status === "Inactive" ||
                          getAvailable(app) === 0
                        }
                        onClick={() => openAssignment(app.id)}
                      >
                        <Plus size={14} />
                        Assign
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredApps.length === 0 && (
            <div className="p5-empty">
              <Search size={24} />
              <strong>No applications found</strong>
              <p>Try changing your filters.</p>
              <button className="p5-clear" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          )}
        </div>

        <div className="p5-pagination">
          <span>
            Showing{" "}
            {filteredApps.length === 0
              ? 0
              : (currentPage - 1) * pageSize + 1}
            –{Math.min(
              currentPage * pageSize,
              filteredApps.length,
            )}{" "}
            of {filteredApps.length} applications
          </span>

          <div>
            <button
              disabled={currentPage === 1}
              aria-label="Previous page"
              onClick={() =>
                setPage((current) => Math.max(1, current - 1))
              }
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              {currentPage} / {pageCount}
            </span>
            <button
              disabled={currentPage === pageCount}
              aria-label="Next page"
              onClick={() =>
                setPage((current) =>
                  Math.min(pageCount, current + 1),
                )
              }
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* INDIVIDUAL LICENSE ASSIGNMENTS */}
      <section className="p5-assignments">
        <div className="p5-section-heading">
          <div>
            <h2>Employee License Assignments</h2>
            <p>
              Individually tracked licenses added in Phase 5.
            </p>
          </div>
          <span className="p5-count">
            {assignments.length} tracked
          </span>
        </div>

        {assignments.filter((assignment) =>
          apps.some((app) => app.id === assignment.appId),
        ).length === 0 ? (
          <div className="p5-empty">
            <Users size={26} />
            <strong>No individual assignments yet</strong>
            <p>
              Your existing assigned-license totals are safe.
              Start by assigning a license to an employee.
            </p>
            <button
              className="button button-primary"
              onClick={() => openAssignment()}
            >
              <Plus size={16} />
              Assign First License
            </button>
          </div>
        ) : (
          <div className="p5-assignment-list">
            {assignments
              .filter((assignment) =>
                apps.some((app) => app.id === assignment.appId),
              )
              .map((assignment) => {
                const app = apps.find(
                  (item) => item.id === assignment.appId,
                );
                const employee = getEmployee(assignment.employeeId);

                if (!app || !employee) return null;

                return (
                  <div
                    className="p5-assignment-row"
                    key={assignment.id}
                  >
                    <EmployeeAvatar name={employee.name} />
                    <div className="p5-assignment-person">
                      <strong>{employee.name}</strong>
                      <small>{employee.email}</small>
                    </div>

                    <div className="p5-assignment-software">
                      <ApplicationIcon app={app} />
                      <span>{app.name}</span>
                    </div>

                    <span className="p5-assignment-date">
                      {assignment.assignedAt}
                    </span>

                    <button
                      className="p5-revoke"
                      onClick={() => revokeLicense(assignment)}
                    >
                      <Trash2 size={15} />
                      Remove
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* APPLICATION LICENSE DETAIL DRAWER */}
      {selectedApp && (
        <div className="p5-overlay">
          <button
            className="p5-backdrop"
            aria-label="Close application details"
            onClick={() => setSelectedAppId(null)}
          />

          <aside
            className="p5-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedApp.name} licenses`}
          >
            <div className="p5-drawer-header">
              <div>
                <span>LICENSE DETAILS</span>
                <h2>{selectedApp.name}</h2>
              </div>
              <button
                aria-label="Close drawer"
                onClick={() => setSelectedAppId(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p5-drawer-body">
              <div className="p5-detail-summary">
                <ApplicationIcon app={selectedApp} />
                <div>
                  <strong>{selectedApp.name}</strong>
                  <small>
                    {selectedApp.department} · {selectedApp.status}
                  </small>
                </div>
              </div>

              <div className="p5-detail-total">
                <span>License Utilization</span>
                <strong>{percent(getUtilization(selectedApp))}</strong>
                <div className="p5-main-progress">
                  <span
                    style={{
                      width: `${getUtilization(selectedApp)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p5-detail-grid">
                <div>
                  <span>Purchased</span>
                  <strong>{selectedApp.purchased}</strong>
                </div>
                <div>
                  <span>Assigned</span>
                  <strong>{selectedApp.assigned}</strong>
                </div>
                <div>
                  <span>Available</span>
                  <strong>{getAvailable(selectedApp)}</strong>
                </div>
                <div>
                  <span>Monthly Cost</span>
                  <strong>{money(selectedApp.monthlyCost)}</strong>
                </div>
              </div>

              <div className="p5-detail-insight">
                <Sparkles size={19} />
                <div>
                  <strong>Optimization opportunity</strong>
                  <p>
                    Up to {money(getMonthlyOpportunity(selectedApp))}
                    /month in illustrative unused-seat cost.
                  </p>
                </div>
              </div>

              <h3>Tracked employee assignments</h3>

              {selectedAssignments.length === 0 ? (
                <div className="p5-empty small">
                  No individually tracked assignments for
                  this application.
                </div>
              ) : (
                selectedAssignments.map((assignment) => {
                  const employee = getEmployee(
                    assignment.employeeId,
                  );
                  if (!employee) return null;

                  return (
                    <div
                      className="p5-detail-assignment"
                      key={assignment.id}
                    >
                      <EmployeeAvatar name={employee.name} />
                      <div>
                        <strong>{employee.name}</strong>
                        <small>{employee.department}</small>
                      </div>
                      <button
                        onClick={() => revokeLicense(assignment)}
                        aria-label={`Remove ${employee.name}'s license`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })
              )}

              <div className="p5-legacy-note">
                <AlertCircle size={16} />
                <span>
                  {previousAssignments} seats are recorded in
                  existing aggregate totals rather than as
                  individual employee records.
                </span>
              </div>
            </div>

            <div className="p5-drawer-footer">
              <button
                className="button button-secondary"
                onClick={() => setSelectedAppId(null)}
              >
                Close
              </button>
              <button
                className="button button-primary"
                disabled={
                  selectedApp.status === "Inactive" ||
                  getAvailable(selectedApp) === 0
                }
                onClick={() => openAssignment(selectedApp.id)}
              >
                <Plus size={16} />
                Assign License
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ASSIGN LICENSE DIALOG */}
      {assignmentOpen && (
        <div className="p5-overlay">
          <button
            className="p5-backdrop"
            aria-label="Close assignment form"
            onClick={() => setAssignmentOpen(false)}
          />

          <aside
            className="p5-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Assign application license"
          >
            <div className="p5-drawer-header">
              <div>
                <span>LICENSE ALLOCATION</span>
                <h2>Assign License</h2>
              </div>
              <button
                aria-label="Close assignment form"
                onClick={() => setAssignmentOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form className="p5-form" onSubmit={assignLicense}>
              <div className="p5-drawer-body">
                <p className="p5-form-intro">
                  Assign one available application license
                  to an employee.
                </p>

                {error && (
                  <div className="p5-error" role="alert">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <label>
                  Application
                  <select
                    required
                    value={assignmentAppId}
                    onChange={(event) => {
                      setAssignmentAppId(event.target.value);
                      setSelectedEmployeeId("");
                      setError("");
                    }}
                  >
                    <option value="">Select application</option>
                    {apps
                      .filter(
                        (app) =>
                          app.status !== "Inactive" &&
                          getAvailable(app) > 0,
                      )
                      .map((app) => (
                        <option key={app.id} value={app.id}>
                          {app.name} — {getAvailable(app)} available
                        </option>
                      ))}
                  </select>
                </label>

                {assignmentApp && (
                  <div className="p5-capacity-preview">
                    <ApplicationIcon app={assignmentApp} />
                    <div>
                      <strong>{assignmentApp.name}</strong>
                      <small>
                        {assignmentApp.assigned} assigned of{" "}
                        {assignmentApp.purchased} purchased
                      </small>
                    </div>
                    <span>
                      {getAvailable(assignmentApp)} free
                    </span>
                  </div>
                )}

                <label>
                  Employee
                  <select
                    required
                    disabled={!assignmentAppId}
                    value={selectedEmployeeId}
                    onChange={(event) => {
                      setSelectedEmployeeId(event.target.value);
                      setError("");
                    }}
                  >
                    <option value="">Select employee</option>
                    {availableEmployees.map((employee) => (
                      <option
                        key={employee.id}
                        value={employee.id}
                      >
                        {employee.name} — {employee.department}
                      </option>
                    ))}
                  </select>
                </label>

                {assignmentAppId &&
                  availableEmployees.length === 0 && (
                    <p className="p5-warning">
                      Every employee in your directory already
                      has a tracked assignment to this application.
                    </p>
                  )}

                <div className="p5-assign-info">
                  <CheckCircle2 size={17} />
                  <span>
                    Assigning one seat updates the application
                    total and all connected dashboard metrics.
                  </span>
                </div>

                <button
                  type="button"
                  className="p5-link-button"
                  onClick={() => {
                    setAssignmentOpen(false);
                    setError("");
                    setEmployeeOpen(true);
                  }}
                >
                  <UserPlus size={16} />
                  Add a new employee
                  <ArrowRight size={15} />
                </button>
              </div>

              <div className="p5-drawer-footer">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setAssignmentOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={
                    !assignmentAppId ||
                    !selectedEmployeeId ||
                    availableEmployees.length === 0
                  }
                >
                  <Check size={16} />
                  Confirm Assignment
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {/* ADD EMPLOYEE DIALOG */}
      {employeeOpen && (
        <div className="p5-overlay">
          <button
            className="p5-backdrop"
            aria-label="Close employee form"
            onClick={() => setEmployeeOpen(false)}
          />

          <aside
            className="p5-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Add employee"
          >
            <div className="p5-drawer-header">
              <div>
                <span>EMPLOYEE DIRECTORY</span>
                <h2>Add Employee</h2>
              </div>
              <button
                aria-label="Close employee form"
                onClick={() => setEmployeeOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form className="p5-form" onSubmit={addEmployee}>
              <div className="p5-drawer-body">
                <p className="p5-form-intro">
                  Create a sample employee record to use
                  in license assignments.
                </p>

                {error && (
                  <div className="p5-error" role="alert">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <label>
                  Full Name
                  <input
                    required
                    maxLength={80}
                    placeholder="e.g. Alex Morgan"
                    value={employeeName}
                    onChange={(event) =>
                      setEmployeeName(event.target.value)
                    }
                  />
                </label>

                <label>
                  Email Address
                  <input
                    required
                    type="email"
                    maxLength={120}
                    placeholder="alex@example.com"
                    value={employeeEmail}
                    onChange={(event) =>
                      setEmployeeEmail(event.target.value)
                    }
                  />
                </label>

                <label>
                  Department
                  <input
                    required
                    maxLength={60}
                    placeholder="e.g. Engineering"
                    value={employeeDepartment}
                    onChange={(event) =>
                      setEmployeeDepartment(event.target.value)
                    }
                  />
                </label>

                <div className="p5-assign-info">
                  <CheckCircle2 size={17} />
                  <span>
                    Employee records are saved locally
                    in this browser.
                  </span>
                </div>
              </div>

              <div className="p5-drawer-footer">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setEmployeeOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                >
                  <UserPlus size={16} />
                  Add Employee
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
