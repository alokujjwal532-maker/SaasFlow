
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  CreditCard,
  Info,
  LayoutDashboard,
  Mail,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";

export type LandingPage =
  | "Overview"
  | "Application Portfolio"
  | "License Management"
  | "Employees"
  | "Subscriptions"
  | "Spend Analytics";

export type ReminderDays = 7 | 14 | 30 | 60;

export interface WorkspaceSettings {
  workspaceName: string;
  adminName: string;
  adminEmail: string;
  defaultPage: LandingPage;
  renewalReminderDays: ReminderDays;
  renewalNotifications: boolean;
  budgetNotifications: boolean;
  monthlyBudget: number;
  showDashboardTips: boolean;
}

export const DEFAULT_WORKSPACE_SETTINGS: WorkspaceSettings = {
  workspaceName: "Acme Corporation",
  adminName: "Admin User",
  adminEmail: "admin@acme.example",
  defaultPage: "Overview",
  renewalReminderDays: 30,
  renewalNotifications: true,
  budgetNotifications: true,
  monthlyBudget: 20000,
  showDashboardTips: true,
};

const STORAGE_KEY = "saasflow-phase9-settings";

const LANDING_PAGES: LandingPage[] = [
  "Overview",
  "Application Portfolio",
  "License Management",
  "Employees",
  "Subscriptions",
  "Spend Analytics",
];

const REMINDER_OPTIONS: ReminderDays[] = [7, 14, 30, 60];

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function loadWorkspaceSettings(): WorkspaceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return { ...DEFAULT_WORKSPACE_SETTINGS };

    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_WORKSPACE_SETTINGS };
    }

    const data = parsed as Partial<WorkspaceSettings>;

    return {
      workspaceName:
        typeof data.workspaceName === "string" &&
        data.workspaceName.trim()
          ? data.workspaceName
          : DEFAULT_WORKSPACE_SETTINGS.workspaceName,
      adminName:
        typeof data.adminName === "string" &&
        data.adminName.trim()
          ? data.adminName
          : DEFAULT_WORKSPACE_SETTINGS.adminName,
      adminEmail:
        typeof data.adminEmail === "string" &&
        validEmail(data.adminEmail)
          ? data.adminEmail
          : DEFAULT_WORKSPACE_SETTINGS.adminEmail,
      defaultPage: LANDING_PAGES.includes(
        data.defaultPage as LandingPage,
      )
        ? (data.defaultPage as LandingPage)
        : DEFAULT_WORKSPACE_SETTINGS.defaultPage,
      renewalReminderDays: REMINDER_OPTIONS.includes(
        data.renewalReminderDays as ReminderDays,
      )
        ? (data.renewalReminderDays as ReminderDays)
        : DEFAULT_WORKSPACE_SETTINGS.renewalReminderDays,
      renewalNotifications:
        typeof data.renewalNotifications === "boolean"
          ? data.renewalNotifications
          : DEFAULT_WORKSPACE_SETTINGS.renewalNotifications,
      budgetNotifications:
        typeof data.budgetNotifications === "boolean"
          ? data.budgetNotifications
          : DEFAULT_WORKSPACE_SETTINGS.budgetNotifications,
      monthlyBudget:
        typeof data.monthlyBudget === "number" &&
        Number.isFinite(data.monthlyBudget) &&
        data.monthlyBudget >= 0
          ? data.monthlyBudget
          : DEFAULT_WORKSPACE_SETTINGS.monthlyBudget,
      showDashboardTips:
        typeof data.showDashboardTips === "boolean"
          ? data.showDashboardTips
          : DEFAULT_WORKSPACE_SETTINGS.showDashboardTips,
    };
  } catch {
    return { ...DEFAULT_WORKSPACE_SETTINGS };
  }
}

interface SettingsManagementProps {
  settings: WorkspaceSettings;
  onSave: (settings: WorkspaceSettings) => void;
  monthlySpend: number;
  activeApplications: number;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function SettingsManagement({
  settings,
  onSave,
  monthlySpend,
  activeApplications,
}: SettingsManagementProps) {
  const [draft, setDraft] = useState<WorkspaceSettings>(settings);
  const [budgetInput, setBudgetInput] = useState(
    String(settings.monthlyBudget),
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => {
    setDraft(settings);
    setBudgetInput(String(settings.monthlyBudget));
  }, [settings]);

  const changed =
    JSON.stringify(draft) !== JSON.stringify(settings) ||
    budgetInput !== String(settings.monthlyBudget);

  function setField<K extends keyof WorkspaceSettings>(
    field: K,
    value: WorkspaceSettings[K],
  ) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setError("");
    setSuccess("");
  }

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const workspaceName = draft.workspaceName.trim();
    const adminName = draft.adminName.trim();
    const adminEmail = draft.adminEmail.trim().toLowerCase();
    const monthlyBudget = Number(budgetInput);

    if (!workspaceName || !adminName) {
      setError("Enter a workspace name and administrator name.");
      return;
    }

    if (!validEmail(adminEmail)) {
      setError("Enter a valid administrator email address.");
      return;
    }

    if (
      budgetInput.trim() === "" ||
      !Number.isFinite(monthlyBudget) ||
      monthlyBudget < 0
    ) {
      setError("Monthly budget must be a valid amount of zero or more.");
      return;
    }

    const next: WorkspaceSettings = {
      ...draft,
      workspaceName,
      adminName,
      adminEmail,
      monthlyBudget,
    };

    onSave(next);
    setDraft(next);
    setBudgetInput(String(monthlyBudget));
    setError("");
    setSuccess("Workspace preferences saved successfully.");
  }

  function resetSettings() {
    const defaults = { ...DEFAULT_WORKSPACE_SETTINGS };
    onSave(defaults);
    setDraft(defaults);
    setBudgetInput(String(defaults.monthlyBudget));
    setError("");
    setResetConfirm(false);
    setSuccess("Workspace settings restored to defaults.");
  }

  const isOverBudget =
    draft.monthlyBudget > 0 && monthlySpend > draft.monthlyBudget;

  const percentUsed =
    draft.monthlyBudget > 0
      ? (monthlySpend / draft.monthlyBudget) * 100
      : 0;

  return (
    <div className="p9-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            WORKSPACE ADMINISTRATION
          </div>
          <h1>Settings & Preferences</h1>
          <p>
            Configure your workspace, account details, alerts, and
            dashboard preferences.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setResetConfirm(true)}
          >
            <RotateCcw size={16} />
            Restore Defaults
          </button>
        </div>
      </div>

      {success && (
        <div className="p9-success" role="status">
          <CheckCircle2 size={18} />
          <span>{success}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setSuccess("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="p9-error" role="alert">
          <Info size={18} />
          {error}
        </div>
      )}

      <div className="p9-summary">
        <div className="p9-summary-item">
          <span className="p9-summary-icon purple">
            <ShieldCheck size={19} />
          </span>
          <div>
            <span>Workspace</span>
            <strong>{settings.workspaceName}</strong>
          </div>
        </div>

        <div className="p9-summary-item">
          <span className="p9-summary-icon blue">
            <UserRound size={19} />
          </span>
          <div>
            <span>Administrator</span>
            <strong>{settings.adminName}</strong>
          </div>
        </div>

        <div className="p9-summary-item">
          <span className="p9-summary-icon green">
            <CreditCard size={19} />
          </span>
          <div>
            <span>Managed Applications</span>
            <strong>{activeApplications}</strong>
          </div>
        </div>
      </div>

      <form onSubmit={saveSettings} noValidate>
        <div className="p9-grid">
          <div className="p9-main">
            <section className="p9-panel">
              <div className="p9-heading">
                <span className="p9-section-icon">
                  <ShieldCheck size={19} />
                </span>
                <div>
                  <h2>Workspace Information</h2>
                  <p>Customize the identity of your SaaSFlow workspace.</p>
                </div>
              </div>

              <label className="p9-field">
                <span>Workspace Name</span>
                <input
                  value={draft.workspaceName}
                  maxLength={80}
                  placeholder="Enter workspace name"
                  onChange={(event) =>
                    setField("workspaceName", event.target.value)
                  }
                />
                <small>
                  Appears in the sidebar and workspace header.
                </small>
              </label>

              <div className="p9-identity-preview">
                <span className="p9-workspace-mark">
                  {draft.workspaceName.trim().charAt(0).toUpperCase() ||
                    "W"}
                </span>
                <div>
                  <strong>
                    {draft.workspaceName || "Your Workspace"}
                  </strong>
                  <small>Enterprise Workspace</small>
                </div>
              </div>
            </section>

            <section className="p9-panel">
              <div className="p9-heading">
                <span className="p9-section-icon">
                  <UserRound size={19} />
                </span>
                <div>
                  <h2>Administrator Profile</h2>
                  <p>Update the name and email displayed in SaaSFlow.</p>
                </div>
              </div>

              <div className="p9-field-grid">
                <label className="p9-field">
                  <span>Full Name</span>
                  <input
                    value={draft.adminName}
                    maxLength={80}
                    placeholder="Your name"
                    onChange={(event) =>
                      setField("adminName", event.target.value)
                    }
                  />
                </label>

                <label className="p9-field">
                  <span>Email Address</span>
                  <div className="p9-input-icon">
                    <Mail size={16} />
                    <input
                      type="email"
                      value={draft.adminEmail}
                      placeholder="admin@example.com"
                      onChange={(event) =>
                        setField("adminEmail", event.target.value)
                      }
                    />
                  </div>
                </label>
              </div>

              <div className="p9-identity-preview">
                <span className="p9-user-mark">
                  {initials(draft.adminName) || "AD"}
                </span>
                <div>
                  <strong>{draft.adminName || "Administrator"}</strong>
                  <small>{draft.adminEmail || "Email not provided"}</small>
                </div>
              </div>
            </section>

            <section className="p9-panel">
              <div className="p9-heading">
                <span className="p9-section-icon">
                  <LayoutDashboard size={19} />
                </span>
                <div>
                  <h2>Dashboard Preferences</h2>
                  <p>Choose how your workspace opens and displays guidance.</p>
                </div>
              </div>

              <label className="p9-field">
                <span>Default Landing Page</span>
                <select
                  value={draft.defaultPage}
                  onChange={(event) =>
                    setField(
                      "defaultPage",
                      event.target.value as LandingPage,
                    )
                  }
                >
                  {LANDING_PAGES.map((page) => (
                    <option key={page} value={page}>
                      {page}
                    </option>
                  ))}
                </select>
                <small>
                  The selected page opens when you refresh SaaSFlow.
                </small>
              </label>

              <label className="p9-toggle">
                <div>
                  <strong>Show Dashboard Tips</strong>
                  <small>
                    Display helpful guidance on the Executive Dashboard.
                  </small>
                </div>
                <input
                  type="checkbox"
                  checked={draft.showDashboardTips}
                  onChange={(event) =>
                    setField("showDashboardTips", event.target.checked)
                  }
                />
              </label>
            </section>

            <section className="p9-panel">
              <div className="p9-heading">
                <span className="p9-section-icon">
                  <Bell size={19} />
                </span>
                <div>
                  <h2>Notification Preferences</h2>
                  <p>Control which alerts appear in the workspace.</p>
                </div>
              </div>

              <label className="p9-toggle">
                <div>
                  <strong>Renewal Notifications</strong>
                  <small>
                    Show reminders for applications approaching renewal.
                  </small>
                </div>
                <input
                  type="checkbox"
                  checked={draft.renewalNotifications}
                  onChange={(event) =>
                    setField(
                      "renewalNotifications",
                      event.target.checked,
                    )
                  }
                />
              </label>

              <label className="p9-field">
                <span>Renewal Reminder Window</span>
                <select
                  value={draft.renewalReminderDays}
                  disabled={!draft.renewalNotifications}
                  onChange={(event) =>
                    setField(
                      "renewalReminderDays",
                      Number(event.target.value) as ReminderDays,
                    )
                  }
                >
                  <option value={7}>7 days before renewal</option>
                  <option value={14}>14 days before renewal</option>
                  <option value={30}>30 days before renewal</option>
                  <option value={60}>60 days before renewal</option>
                </select>
              </label>

              <label className="p9-toggle">
                <div>
                  <strong>Budget Alerts</strong>
                  <small>
                    Show a warning when monthly spending exceeds your budget.
                  </small>
                </div>
                <input
                  type="checkbox"
                  checked={draft.budgetNotifications}
                  onChange={(event) =>
                    setField(
                      "budgetNotifications",
                      event.target.checked,
                    )
                  }
                />
              </label>
            </section>

            <section className="p9-panel">
              <div className="p9-heading">
                <span className="p9-section-icon">
                  <CreditCard size={19} />
                </span>
                <div>
                  <h2>Budget Management</h2>
                  <p>Set the monthly spending target for your workspace.</p>
                </div>
              </div>

              <label className="p9-field">
                <span>Monthly SaaS Budget (USD)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={budgetInput}
                  onChange={(event) => {
                    setBudgetInput(event.target.value);
                    setError("");
                    setSuccess("");
                  }}
                />
                <small>
                  A budget of $0 disables budget threshold comparisons.
                </small>
              </label>

              <div className="p9-budget-preview">
                <div className="p9-budget-top">
                  <div>
                    <span>Current Monthly Spend</span>
                    <strong>{money(monthlySpend)}</strong>
                  </div>
                  <div>
                    <span>Configured Budget</span>
                    <strong>
                      {money(Number(budgetInput) || 0)}
                    </strong>
                  </div>
                </div>

                <div className="p9-progress">
                  <span
                    style={{
                      width: `${
                        Number(budgetInput) > 0
                          ? Math.min(
                              100,
                              (monthlySpend / Number(budgetInput)) * 100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <p className={isOverBudget ? "p9-over-budget" : ""}>
                  {draft.monthlyBudget === 0
                    ? "No monthly budget target is currently configured."
                    : isOverBudget
                      ? `Current spending is above the saved budget (${percentUsed.toFixed(
                          1,
                        )}% used).`
                      : `${percentUsed.toFixed(
                          1,
                        )}% of the saved monthly budget is currently used.`}
                </p>
              </div>
            </section>
          </div>

          <aside className="p9-side">
            <section className="p9-panel p9-side-panel">
              <div className="p9-heading">
                <span className="p9-section-icon">
                  <SlidersHorizontal size={19} />
                </span>
                <div>
                  <h2>Settings Summary</h2>
                  <p>Current saved preferences</p>
                </div>
              </div>

              {[
                ["Default Page", settings.defaultPage],
                [
                  "Renewal Alerts",
                  settings.renewalNotifications
                    ? `${settings.renewalReminderDays} days`
                    : "Disabled",
                ],
                [
                  "Budget Alerts",
                  settings.budgetNotifications ? "Enabled" : "Disabled",
                ],
                ["Monthly Budget", money(settings.monthlyBudget)],
              ].map(([label, value]) => (
                <div key={label} className="p9-summary-row">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}

              <div className="p9-storage-info">
                <Info size={17} />
                <p>
                  Preferences are saved in this browser. They are not
                  synchronized to a cloud account.
                </p>
              </div>
            </section>

            <section className="p9-panel p9-side-panel">
              <div className="p9-heading">
                <span className="p9-section-icon">
                  <CheckCircle2 size={19} />
                </span>
                <div>
                  <h2>Workspace Status</h2>
                  <p>Frontend demonstration</p>
                </div>
              </div>

              <div className="p9-system-row">
                <Check size={16} />
                <span>Application Portfolio</span>
              </div>
              <div className="p9-system-row">
                <Check size={16} />
                <span>License Management</span>
              </div>
              <div className="p9-system-row">
                <Check size={16} />
                <span>Employee Management</span>
              </div>
              <div className="p9-system-row">
                <Check size={16} />
                <span>Subscription Management</span>
              </div>
              <div className="p9-system-row">
                <Check size={16} />
                <span>Spend Analytics</span>
              </div>
            </section>
          </aside>
        </div>

        <div className="p9-save-bar">
          <div>
            <strong>{changed ? "You have unsaved changes" : "Settings saved"}</strong>
            <span>
              {changed
                ? "Save to apply these preferences across SaaSFlow."
                : "Your saved preferences are active."}
            </span>
          </div>

          <button
            type="submit"
            className="button button-primary"
            disabled={!changed}
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </form>

      {resetConfirm && (
        <div className="p9-modal-overlay">
          <div
            className="p9-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Restore default settings"
          >
            <h2>Restore Default Settings?</h2>
            <p>
              Your workspace preferences will return to their original
              values. Applications, employees, licenses, and subscriptions
              will not be deleted.
            </p>
            <div>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setResetConfirm(false)}
              >
                Keep Settings
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={resetSettings}
              >
                Restore Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
