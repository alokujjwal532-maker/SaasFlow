
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

// ==========================================
// TYPES
// ==========================================

export interface EmployeeApp {
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

interface EmployeeManagementProps {
  apps: EmployeeApp[];
  onChangeAssigned: (
    appId: string,
    assigned: number,
  ) => void;
}

// ==========================================
// LOCAL STORAGE
// ==========================================

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

function loadEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(EMPLOYEE_KEY);

    if (!raw) {
      return SAMPLE_EMPLOYEES;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return SAMPLE_EMPLOYEES;
    }

    return parsed.filter(
      (value: unknown): value is Employee => {
        if (
          !value ||
          typeof value !== "object"
        ) {
          return false;
        }

        const employee = value as Partial<Employee>;

        return (
          typeof employee.id === "string" &&
          typeof employee.name === "string" &&
          typeof employee.email === "string" &&
          typeof employee.department === "string"
        );
      },
    );
  } catch {
    return SAMPLE_EMPLOYEES;
  }
}

function loadAssignments(): Assignment[] {
  try {
    const raw = localStorage.getItem(ASSIGNMENT_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (value: unknown): value is Assignment => {
        if (
          !value ||
          typeof value !== "object"
        ) {
          return false;
        }

        const assignment = value as Partial<Assignment>;

        return (
          typeof assignment.id === "string" &&
          typeof assignment.appId === "string" &&
          typeof assignment.employeeId === "string" &&
          typeof assignment.assignedAt === "string"
        );
      },
    );
  } catch {
    return [];
  }
}

// ==========================================
// HELPERS
// ==========================================

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function exportEmployees(
  employees: Employee[],
  assignments: Assignment[],
): void {
  const rows = [
    [
      "Employee Name",
      "Email",
      "Department",
      "Tracked License Assignments",
    ],
    ...employees.map((employee) => [
      employee.name,
      employee.email,
      employee.department,
      String(
        assignments.filter(
          (assignment) =>
            assignment.employeeId === employee.id,
        ).length,
      ),
    ]),
  ];

  const csv = rows
    .map((row) =>
      row
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
  anchor.download = "saasflow-employees.csv";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function EmployeeManagement({
  apps,
  onChangeAssigned,
}: EmployeeManagementProps) {
  // Employee and assignment state
  const [employees, setEmployees] =
    useState<Employee[]>(loadEmployees);

  const [assignments, setAssignments] =
    useState<Assignment[]>(loadAssignments);

  // Table filters
  const [search, setSearch] = useState("");
  const [department, setDepartment] =
    useState("All Departments");

  const [currentPage, setCurrentPage] = useState(1);

  // Employee profile
  const [selectedEmployeeId, setSelectedEmployeeId] =
    useState<string | null>(null);

  // License assignment
  const [selectedAppId, setSelectedAppId] =
    useState("");

  // Add/edit employee
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeDepartment, setEmployeeDepartment] =
    useState("");

  // Feedback
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // ========================================
  // SAVE DATA
  // ========================================

  useEffect(() => {
    try {
      localStorage.setItem(
        EMPLOYEE_KEY,
        JSON.stringify(employees),
      );
    } catch {
      // Keep data in memory if storage is unavailable.
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem(
        ASSIGNMENT_KEY,
        JSON.stringify(assignments),
      );
    } catch {
      // Keep data in memory if storage is unavailable.
    }
  }, [assignments]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedEmployeeId(null);
        setSelectedAppId("");
        setFormOpen(false);
        setError("");
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () =>
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
  }, []);

  // ========================================
  // CALCULATIONS
  // ========================================

  const departments = useMemo(
    () => [
      "All Departments",
      ...Array.from(
        new Set(
          employees.map(
            (employee) => employee.department,
          ),
        ),
      ),
    ],
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesDepartment =
        department === "All Departments" ||
        employee.department === department;

      const query = search.trim().toLowerCase();

      const employeeText = [
        employee.name,
        employee.email,
        employee.department,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesDepartment &&
        employeeText.includes(query)
      );
    });
  }, [employees, department, search]);

  const pageSize = 5;

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredEmployees.length / pageSize,
    ),
  );

  const activePage = Math.min(
    currentPage,
    totalPages,
  );

  const displayedEmployees = filteredEmployees.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );

  const selectedEmployee =
    employees.find(
      (employee) =>
        employee.id === selectedEmployeeId,
    ) ?? null;

  const employeeAssignments = assignments.filter(
    (assignment) =>
      assignment.employeeId === selectedEmployeeId,
  );

  // Only applications with available seats
  // that the employee does not already have.
  const availableApplications = apps.filter(
    (app) => {
      const hasAvailableLicense =
        app.purchased > app.assigned;

      const isActive =
        app.status !== "Inactive";

      const alreadyAssigned =
        employeeAssignments.some(
          (assignment) =>
            assignment.appId === app.id,
        );

      return (
        hasAvailableLicense &&
        isActive &&
        !alreadyAssigned
      );
    },
  );

  const selectedApplication =
    availableApplications.find(
      (app) => app.id === selectedAppId,
    ) ?? null;

  const totalEmployees = employees.length;

  const employeesWithAccess = new Set(
    assignments
      .filter((assignment) =>
        apps.some(
          (app) => app.id === assignment.appId,
        ),
      )
      .map(
        (assignment) => assignment.employeeId,
      ),
  ).size;

  const totalTrackedAssignments =
    assignments.filter((assignment) =>
      apps.some(
        (app) => app.id === assignment.appId,
      ),
    ).length;

  const totalDepartments = new Set(
    employees.map(
      (employee) => employee.department,
    ),
  ).size;

  // ========================================
  // EMPLOYEE ACTIONS
  // ========================================

  function openEmployeeProfile(
    employeeId: string,
  ) {
    setSelectedEmployeeId(employeeId);

    // Always reset the application selection.
    setSelectedAppId("");

    setError("");
    setNotice("");
  }

  function closeEmployeeProfile() {
    setSelectedEmployeeId(null);
    setSelectedAppId("");
    setError("");
  }

  function openAddEmployee() {
    setEditingId(null);

    setName("");
    setEmail("");
    setEmployeeDepartment("");

    setSelectedEmployeeId(null);
    setSelectedAppId("");

    setError("");
    setFormOpen(true);
  }

  function openEditEmployee(
    employee: Employee,
  ) {
    setEditingId(employee.id);

    setName(employee.name);
    setEmail(employee.email);
    setEmployeeDepartment(
      employee.department,
    );

    setSelectedEmployeeId(null);
    setSelectedAppId("");

    setError("");
    setFormOpen(true);
  }

  function saveEmployee(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanEmail =
      email.trim().toLowerCase();

    const cleanDepartment =
      employeeDepartment.trim();

    if (
      !cleanName ||
      !cleanEmail ||
      !cleanDepartment
    ) {
      setError(
        "Please complete all employee fields.",
      );
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanEmail,
      )
    ) {
      setError(
        "Enter a valid email address.",
      );
      return;
    }

    const duplicateEmployee =
      employees.some(
        (employee) =>
          employee.email.toLowerCase() ===
            cleanEmail &&
          employee.id !== editingId,
      );

    if (duplicateEmployee) {
      setError(
        "An employee with this email already exists.",
      );
      return;
    }

    const employeeRecord: Employee = {
      id: editingId ?? makeId("EMP"),
      name: cleanName,
      email: cleanEmail,
      department: cleanDepartment,
    };

    setEmployees((previous) =>
      editingId
        ? previous.map((employee) =>
            employee.id === editingId
              ? employeeRecord
              : employee,
          )
        : [...previous, employeeRecord],
    );

    setNotice(
      editingId
        ? "Employee updated successfully."
        : "Employee added successfully.",
    );

    setFormOpen(false);
    setEditingId(null);
  }

  // ========================================
  // LICENSE ASSIGNMENT
  // ========================================

  function assignLicense() {
    setError("");

    if (!selectedEmployee) {
      setError(
        "Please select an employee.",
      );
      return;
    }

    if (!selectedAppId) {
      setError(
        "Please select an application.",
      );
      return;
    }

    const application =
      apps.find(
        (app) => app.id === selectedAppId,
      );

    if (!application) {
      setError(
        "The selected application was not found.",
      );
      return;
    }

    if (application.status === "Inactive") {
      setError(
        "Inactive applications cannot be assigned.",
      );
      return;
    }

    if (
      application.assigned >=
      application.purchased
    ) {
      setError(
        "No available licenses for this application.",
      );
      return;
    }

    const alreadyAssigned =
      assignments.some(
        (assignment) =>
          assignment.appId === application.id &&
          assignment.employeeId ===
            selectedEmployee.id,
      );

    if (alreadyAssigned) {
      setError(
        "This employee already has a license for this application.",
      );
      return;
    }

    const newAssignment: Assignment = {
      id: makeId("ASN"),
      appId: application.id,
      employeeId: selectedEmployee.id,
      assignedAt: new Date()
        .toISOString()
        .slice(0, 10),
    };

    // Save individual employee assignment.
    setAssignments((previous) => [
      ...previous,
      newAssignment,
    ]);

    // Update shared application count.
    onChangeAssigned(
      application.id,
      application.assigned + 1,
    );

    setNotice(
      `${application.name} successfully assigned to ${selectedEmployee.name}.`,
    );

    // Reset only the selected application.
    setSelectedAppId("");
  }

  function removeLicense(
    assignment: Assignment,
  ) {
    const application = apps.find(
      (app) =>
        app.id === assignment.appId,
    );

    if (!application) {
      setError(
        "The application no longer exists.",
      );
      return;
    }

    if (application.assigned <= 0) {
      setError(
        "This application has no assigned seats to remove.",
      );
      return;
    }

    // Remove tracked assignment.
    setAssignments((previous) =>
      previous.filter(
        (item) =>
          item.id !== assignment.id,
      ),
    );

    // Decrease application assigned count.
    onChangeAssigned(
      application.id,
      application.assigned - 1,
    );

    setNotice(
      `${application.name} license removed successfully.`,
    );

    setError("");
  }

  function deleteEmployee(
    employee: Employee,
  ) {
    const confirmed = window.confirm(
      `Delete ${employee.name}? Their individually tracked licenses will also be removed.`,
    );

    if (!confirmed) {
      return;
    }

    const employeeLicenses =
      assignments.filter(
        (assignment) =>
          assignment.employeeId ===
          employee.id,
      );

    const appAssignmentCounts =
      new Map<string, number>();

    employeeLicenses.forEach(
      (assignment) => {
        appAssignmentCounts.set(
          assignment.appId,
          (appAssignmentCounts.get(
            assignment.appId,
          ) ?? 0) + 1,
        );
      },
    );

    // Decrease the assigned-license count
    // for every application associated
    // with this employee.
    appAssignmentCounts.forEach(
      (count, appId) => {
        const application =
          apps.find(
            (app) => app.id === appId,
          );

        if (application) {
          onChangeAssigned(
            appId,
            Math.max(
              0,
              application.assigned - count,
            ),
          );
        }
      },
    );

    setAssignments((previous) =>
      previous.filter(
        (assignment) =>
          assignment.employeeId !==
          employee.id,
      ),
    );

    setEmployees((previous) =>
      previous.filter(
        (item) =>
          item.id !== employee.id,
      ),
    );

    closeEmployeeProfile();

    setNotice(
      `${employee.name} deleted successfully.`,
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="p6-page">
      {/* HEADER */}
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            WORKFORCE DIRECTORY
          </div>

          <h1>Employee Management</h1>

          <p>
            Manage your employee directory and
            application access in one workspace.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() =>
              exportEmployees(
                filteredEmployees,
                assignments,
              )
            }
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            type="button"
            className="button button-primary"
            onClick={openAddEmployee}
          >
            <UserPlus size={16} />
            Add Employee
          </button>
        </div>
      </div>

      {/* SUCCESS NOTIFICATION */}
      {notice && (
        <div
          className="p5-notice"
          role="status"
        >
          <CheckCircle2 size={18} />

          <span>{notice}</span>

          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI CARDS */}
      <section className="p6-kpis">
        <article className="p6-kpi">
          <Users size={20} />

          <span>Total Employees</span>

          <strong>
            {totalEmployees}
          </strong>

          <small>
            In the workspace directory
          </small>
        </article>

        <article className="p6-kpi">
          <ShieldCheck size={20} />

          <span>
            Employees with Tracked Access
          </span>

          <strong>
            {employeesWithAccess}
          </strong>

          <small>
            Assigned in Phase 5 or 6
          </small>
        </article>

        <article className="p6-kpi">
          <CheckCircle2 size={20} />

          <span>
            Tracked License Assignments
          </span>

          <strong>
            {totalTrackedAssignments}
          </strong>

          <small>
            Individual access records
          </small>
        </article>

        <article className="p6-kpi">
          <Users size={20} />

          <span>Departments</span>

          <strong>
            {totalDepartments}
          </strong>

          <small>
            Represented in directory
          </small>
        </article>
      </section>

      {/* EMPLOYEE DIRECTORY */}
      <section className="panel p6-directory">
        <div className="panel-heading">
          <div>
            <h2>Employee Directory</h2>

            <p>
              Search and manage employee profiles
              and software access.
            </p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="p6-toolbar">
          <label className="p6-search">
            <Search size={17} />

            <input
              type="search"
              value={search}
              placeholder="Search name, email, or department..."
              aria-label="Search employees"
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
            />
          </label>

          <label className="p6-filter">
            <span>Department</span>

            <select
              value={department}
              onChange={(event) => {
                setDepartment(
                  event.target.value,
                );
                setCurrentPage(1);
              }}
            >
              {departments.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        {/* EMPLOYEE TABLE */}
        <div className="table-container">
          <table className="data-table p6-table">
            <thead>
              <tr>
                <th>EMPLOYEE</th>
                <th>DEPARTMENT</th>
                <th>TRACKED APPLICATIONS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {displayedEmployees.map(
                (employee) => {
                  const licenseCount =
                    assignments.filter(
                      (assignment) =>
                        assignment.employeeId ===
                          employee.id &&
                        apps.some(
                          (app) =>
                            app.id ===
                            assignment.appId,
                        ),
                    ).length;

                  return (
                    <tr key={employee.id}>
                      <td>
                        <button
                          type="button"
                          className="p6-person-link"
                          onClick={() =>
                            openEmployeeProfile(
                              employee.id,
                            )
                          }
                        >
                          <span className="p6-avatar">
                            {getInitials(
                              employee.name,
                            )}
                          </span>

                          <span>
                            <strong>
                              {employee.name}
                            </strong>

                            <small>
                              {employee.email}
                            </small>
                          </span>
                        </button>
                      </td>

                      <td>
                        {employee.department}
                      </td>

                      <td>
                        <span className="p6-count">
                          {licenseCount} apps
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="p6-table-action"
                          onClick={() =>
                            openEmployeeProfile(
                              employee.id,
                            )
                          }
                        >
                          View Profile
                          <ArrowRight size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>

          {displayedEmployees.length === 0 && (
            <div className="p5-empty">
              <Search size={25} />

              <strong>
                No employees found
              </strong>

              <p>
                Try changing your search or
                department filter.
              </p>
            </div>
          )}
        </div>

        {/* PAGINATION */}
        <div className="p5-pagination">
          <span>
            Showing{" "}
            {filteredEmployees.length === 0
              ? 0
              : (activePage - 1) *
                  pageSize +
                1}
            –
            {Math.min(
              activePage * pageSize,
              filteredEmployees.length,
            )}{" "}
            of {filteredEmployees.length} employees
          </span>

          <div>
            <button
              type="button"
              disabled={activePage === 1}
              aria-label="Previous page"
              onClick={() =>
                setCurrentPage((previous) =>
                  Math.max(
                    1,
                    previous - 1,
                  ),
                )
              }
            >
              <ChevronLeft size={17} />
            </button>

            <span>
              {activePage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={
                activePage === totalPages
              }
              aria-label="Next page"
              onClick={() =>
                setCurrentPage((previous) =>
                  Math.min(
                    totalPages,
                    previous + 1,
                  ),
                )
              }
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {/* ====================================
          EMPLOYEE PROFILE DRAWER
      ==================================== */}
      {selectedEmployee && (
        <div className="phase3-overlay">
          <button
            type="button"
            className="phase3-backdrop"
            aria-label="Close employee profile"
            onClick={closeEmployeeProfile}
          />

          <aside
            className="phase3-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedEmployee.name} profile`}
          >
            {/* DRAWER HEADER */}
            <div className="phase3-drawer-header">
              <div>
                <span className="phase3-drawer-eyebrow">
                  EMPLOYEE PROFILE
                </span>

                <h2>
                  {selectedEmployee.name}
                </h2>
              </div>

              <button
                type="button"
                className="phase3-close"
                onClick={closeEmployeeProfile}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* DRAWER CONTENT */}
            <div className="phase3-drawer-content">
              <div className="p6-profile-heading">
                <span className="p6-avatar large">
                  {getInitials(
                    selectedEmployee.name,
                  )}
                </span>

                <div>
                  <strong>
                    {selectedEmployee.name}
                  </strong>

                  <span>
                    {selectedEmployee.department}
                  </span>
                </div>
              </div>

              <div className="p6-profile-field">
                <Mail size={16} />

                <span>
                  {selectedEmployee.email}
                </span>
              </div>

              {/* EXISTING ASSIGNMENTS */}
              <h3 className="phase3-drawer-section-title">
                Assigned Applications (
                {employeeAssignments.length})
              </h3>

              {employeeAssignments.map(
                (assignment) => {
                  const application =
                    apps.find(
                      (app) =>
                        app.id ===
                        assignment.appId,
                    );

                  if (!application) {
                    return null;
                  }

                  return (
                    <div
                      className="p6-access-row"
                      key={assignment.id}
                    >
                      <span
                        className="p6-app-icon"
                        style={{
                          backgroundColor:
                            application.color,
                        }}
                      >
                        {application.name.charAt(
                          0,
                        )}
                      </span>

                      <div>
                        <strong>
                          {application.name}
                        </strong>

                        <small>
                          Assigned{" "}
                          {assignment.assignedAt}
                        </small>
                      </div>

                      <button
                        type="button"
                        aria-label={`Remove ${application.name} license`}
                        title="Remove license"
                        onClick={() =>
                          removeLicense(
                            assignment,
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                },
              )}

              {employeeAssignments.length === 0 && (
                <div className="p5-empty small">
                  <ShieldCheck size={22} />

                  <strong>
                    No tracked applications
                  </strong>

                  <p>
                    Assign an available application
                    license below.
                  </p>
                </div>
              )}

              {/* ====================================
                  ASSIGN APPLICATION ACCESS
              ==================================== */}
              <h3 className="phase3-drawer-section-title">
                Assign Application Access
              </h3>

              <p className="p6-help">
                Choose an application with available
                licenses to provide access to{" "}
                {selectedEmployee.name}.
              </p>

              {error && (
                <div
                  className="phase4-error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <div className="p6-assign-controls">
                <label
                  htmlFor="employee-app-select"
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#526179",
                  }}
                >
                  Application
                </label>

                <select
                  id="employee-app-select"
                  value={selectedAppId}
                  disabled={
                    availableApplications.length ===
                    0
                  }
                  onChange={(event) => {
                    setSelectedAppId(
                      event.target.value,
                    );

                    setError("");
                  }}
                >
                  <option value="">
                    Select available application
                  </option>

                  {availableApplications.map(
                    (application) => (
                      <option
                        key={application.id}
                        value={application.id}
                      >
                        {application.name} (
                        {application.purchased -
                          application.assigned}{" "}
                        available)
                      </option>
                    ),
                  )}
                </select>

                {/* SELECTED APPLICATION PREVIEW */}
                {selectedApplication && (
                  <div
                    style={{
                      padding: "14px",
                      borderRadius: "9px",
                      background: "#f6f5ff",
                      border: "1px solid #e7e2ff",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span
                      className="p6-app-icon"
                      style={{
                        backgroundColor:
                          selectedApplication.color,
                      }}
                    >
                      {selectedApplication.name.charAt(
                        0,
                      )}
                    </span>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "5px",
                      }}
                    >
                      <strong
                        style={{
                          fontSize: "12px",
                          color: "#334155",
                        }}
                      >
                        {selectedApplication.name}
                      </strong>

                      <small
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                        }}
                      >
                        {
                          selectedApplication.assigned
                        }{" "}
                        of{" "}
                        {
                          selectedApplication.purchased
                        }{" "}
                        licenses assigned
                      </small>
                    </div>
                  </div>
                )}

                {/* ASSIGN BUTTON */}
                <button
                  type="button"
                  className="button button-primary"
                  disabled={!selectedApplication}
                  onClick={assignLicense}
                  style={{
                    minHeight: "42px",
                    cursor: selectedApplication
                      ? "pointer"
                      : "not-allowed",
                  }}
                >
                  <Plus size={16} />
                  Assign License
                </button>

                {!selectedApplication &&
                  availableApplications.length > 0 && (
                    <p
                      style={{
                        fontSize: "11px",
                        color: "#94a3b8",
                        margin: "0",
                      }}
                    >
                      Select an application above
                      to enable the Assign License
                      button.
                    </p>
                  )}

                {availableApplications.length ===
                  0 && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#b45309",
                    }}
                  >
                    No applications are currently
                    available for assignment to
                    this employee.
                  </p>
                )}
              </div>

              <p className="p6-help">
                Existing Phase 4 license totals are
                preserved. This profile only shows
                individually tracked employee
                assignments.
              </p>

              {/* EMPLOYEE ACTIONS */}
              <div className="p6-profile-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() =>
                    openEditEmployee(
                      selectedEmployee,
                    )
                  }
                >
                  <Pencil size={16} />
                  Edit Employee
                </button>

                <button
                  type="button"
                  className="button p6-delete-button"
                  onClick={() =>
                    deleteEmployee(
                      selectedEmployee,
                    )
                  }
                >
                  <Trash2 size={16} />
                  Delete Employee
                </button>
              </div>
            </div>

            {/* DRAWER FOOTER */}
            <div className="phase3-drawer-footer">
              <button
                type="button"
                className="button button-secondary"
                onClick={closeEmployeeProfile}
              >
                Close
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ====================================
          ADD / EDIT EMPLOYEE DRAWER
      ==================================== */}
      {formOpen && (
        <div className="phase3-overlay">
          <button
            type="button"
            className="phase3-backdrop"
            aria-label="Close employee form"
            onClick={() =>
              setFormOpen(false)
            }
          />

          <aside
            className="phase3-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={
              editingId
                ? "Edit employee"
                : "Add employee"
            }
          >
            <div className="phase3-drawer-header">
              <div>
                <span className="phase3-drawer-eyebrow">
                  EMPLOYEE DIRECTORY
                </span>

                <h2>
                  {editingId
                    ? "Edit Employee"
                    : "Add Employee"}
                </h2>
              </div>

              <button
                type="button"
                className="phase3-close"
                onClick={() =>
                  setFormOpen(false)
                }
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="phase4-form"
              onSubmit={saveEmployee}
              noValidate
            >
              <div className="phase3-drawer-content">
                <p className="phase3-explanation">
                  Employee details will be
                  available in License Management
                  and saved locally in this
                  browser.
                </p>

                {error && (
                  <div
                    className="phase4-error"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                <label>
                  Full Name

                  <input
                    type="text"
                    value={name}
                    maxLength={80}
                    placeholder="e.g. Alex Morgan"
                    onChange={(event) =>
                      setName(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Email Address

                  <input
                    type="email"
                    value={email}
                    maxLength={120}
                    placeholder="alex@example.com"
                    onChange={(event) =>
                      setEmail(
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  Department

                  <input
                    type="text"
                    value={
                      employeeDepartment
                    }
                    maxLength={60}
                    placeholder="e.g. Engineering"
                    onChange={(event) =>
                      setEmployeeDepartment(
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>

              <div className="phase3-drawer-footer">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() =>
                    setFormOpen(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="button button-primary"
                >
                  <Check size={16} />
                  {editingId
                    ? "Save Changes"
                    : "Add Employee"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
