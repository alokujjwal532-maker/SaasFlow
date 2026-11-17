
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

export interface SubscriptionApp {
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

export interface SubscriptionManagementProps {
  apps: SubscriptionApp[];
  onUpdateBilling: (
    appId: string,
    monthlyCost: number,
    renewalDate: string,
  ) => void;
}

type BillingCycle = "Monthly" | "Annual";
type SubscriptionStatus = "Active" | "Paused" | "Cancelled";
type FilterStatus = "All" | SubscriptionStatus;

interface Subscription {
  id: string;
  appId: string;
  plan: string;
  billingCycle: BillingCycle;
  amount: number;
  seats: number;
  startDate: string;
  renewalDate: string;
  status: SubscriptionStatus;
  autoRenew: boolean;
}

interface Draft {
  appId: string;
  plan: string;
  billingCycle: BillingCycle;
  amount: string;
  seats: string;
  startDate: string;
  renewalDate: string;
  status: SubscriptionStatus;
  autoRenew: boolean;
}

const STORAGE_KEY = "saasflow-phase7-subscriptions";
const REFERENCE_DATE = "2026-11-17";

const INITIAL_PLANS: Record<string, string> = {
  "Microsoft 365": "Business Premium",
  Figma: "Professional",
  Slack: "Business+",
  Notion: "Plus",
  Zoom: "Business",
  "Jira Software": "Standard",
};

function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateText(value: string): string {
  if (!value) return "—";
  return new Date(`${value}T12:00:00Z`).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    },
  );
}

function daysUntil(date: string): number {
  const a = Date.parse(`${date}T00:00:00Z`);
  const b = Date.parse(`${REFERENCE_DATE}T00:00:00Z`);
  return Math.round((a - b) / 86400000);
}

function monthlyEquivalent(sub: Subscription): number {
  return sub.billingCycle === "Annual"
    ? sub.amount / 12
    : sub.amount;
}

function subscriptionIsValid(value: unknown): value is Subscription {
  if (!value || typeof value !== "object") return false;
  const sub = value as Partial<Subscription>;
  return (
    typeof sub.id === "string" &&
    typeof sub.appId === "string" &&
    typeof sub.plan === "string" &&
    (sub.billingCycle === "Monthly" ||
      sub.billingCycle === "Annual") &&
    typeof sub.amount === "number" &&
    Number.isFinite(sub.amount) &&
    sub.amount >= 0 &&
    typeof sub.seats === "number" &&
    Number.isInteger(sub.seats) &&
    sub.seats >= 1 &&
    typeof sub.startDate === "string" &&
    typeof sub.renewalDate === "string" &&
    (sub.status === "Active" ||
      sub.status === "Paused" ||
      sub.status === "Cancelled") &&
    typeof sub.autoRenew === "boolean"
  );
}

function createSampleSubscriptions(apps: SubscriptionApp[]): Subscription[] {
  return apps.map((app) => ({
    id: `SUB-${app.id}`,
    appId: app.id,
    plan: INITIAL_PLANS[app.name] ?? "Standard",
    billingCycle: "Monthly" as BillingCycle,
    amount: app.monthlyCost,
    seats: app.purchased,
    startDate: "2026-01-01",
    renewalDate: app.renewalDate,
    status:
      app.status === "Inactive"
        ? ("Paused" as SubscriptionStatus)
        : ("Active" as SubscriptionStatus),
    autoRenew: true,
  }));
}

function loadSubscriptions(apps: SubscriptionApp[]): Subscription[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSampleSubscriptions(apps);
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return createSampleSubscriptions(apps);
    return data.filter(subscriptionIsValid);
  } catch {
    return createSampleSubscriptions(apps);
  }
}

function emptyDraft(apps: SubscriptionApp[]): Draft {
  return {
    appId: apps[0]?.id ?? "",
    plan: "Standard",
    billingCycle: "Monthly",
    amount: "",
    seats: "1",
    startDate: REFERENCE_DATE,
    renewalDate: "2027-11-17",
    status: "Active",
    autoRenew: true,
  };
}

function draftFromSubscription(sub: Subscription): Draft {
  return {
    appId: sub.appId,
    plan: sub.plan,
    billingCycle: sub.billingCycle,
    amount: String(sub.amount),
    seats: String(sub.seats),
    startDate: sub.startDate,
    renewalDate: sub.renewalDate,
    status: sub.status,
    autoRenew: sub.autoRenew,
  };
}

function exportSubscriptions(
  data: Subscription[],
  apps: SubscriptionApp[],
): void {
  const rows = [
    [
      "Application",
      "Plan",
      "Billing Cycle",
      "Billed Amount",
      "Monthly Equivalent",
      "Seats",
      "Renewal",
      "Auto Renew",
      "Status",
    ],
    ...data.map((sub) => [
      apps.find((app) => app.id === sub.appId)?.name ??
        "Deleted Application",
      sub.plan,
      sub.billingCycle,
      sub.amount.toFixed(2),
      monthlyEquivalent(sub).toFixed(2),
      String(sub.seats),
      sub.renewalDate,
      sub.autoRenew ? "Yes" : "No",
      sub.status,
    ]),
  ];

  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const safe = /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell;
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
  link.download = "saasflow-subscriptions.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function SubscriptionManagement({
  apps,
  onUpdateBilling,
}: SubscriptionManagementProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(
    () => loadSubscriptions(apps),
  );
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("All");
  const [filterCycle, setFilterCycle] = useState("All");
  const [filterAppId, setFilterAppId] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Draft>(() => emptyDraft(apps));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
    } catch {
      // Continue using in-memory data if browser storage is blocked.
    }
  }, [subscriptions]);

  useEffect(() => {
    function onEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setSelectedId(null);
      setFormOpen(false);
      setDeleteConfirm(false);
      setError("");
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  const linkedSubscriptions = useMemo(
    () =>
      subscriptions.filter((sub) =>
        apps.some((app) => app.id === sub.appId),
      ),
    [subscriptions, apps],
  );

  const active = linkedSubscriptions.filter(
    (sub) => sub.status === "Active",
  );

  const monthlySpend = active.reduce(
    (sum, sub) => sum + monthlyEquivalent(sub),
    0,
  );

  const annualSpend = monthlySpend * 12;

  const renewals = active.filter((sub) => {
    const days = daysUntil(sub.renewalDate);
    return days >= 0 && days <= 30;
  });

  const annualSubscriptions = active.filter(
    (sub) => sub.billingCycle === "Annual",
  ).length;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return linkedSubscriptions
      .filter((sub) => {
        const app = apps.find((item) => item.id === sub.appId);
        const text = [
          app?.name ?? "",
          app?.department ?? "",
          sub.plan,
        ]
          .join(" ")
          .toLowerCase();

        return (
          text.includes(query) &&
          (filterStatus === "All" || sub.status === filterStatus) &&
          (filterCycle === "All" ||
            sub.billingCycle === filterCycle) &&
          (filterAppId === "All" || sub.appId === filterAppId)
        );
      })
      .sort((a, b) => a.renewalDate.localeCompare(b.renewalDate));
  }, [
    linkedSubscriptions,
    apps,
    search,
    filterStatus,
    filterCycle,
    filterAppId,
  ]);

  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activePage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (activePage - 1) * pageSize,
    activePage * pageSize,
  );

  const selected = linkedSubscriptions.find(
    (sub) => sub.id === selectedId,
  ) ?? null;

  const selectedApp = selected
    ? apps.find((app) => app.id === selected.appId)
    : undefined;

  const upcoming = [...renewals].sort(
    (a, b) => a.renewalDate.localeCompare(b.renewalDate),
  );

  function clearFilters() {
    setSearch("");
    setFilterStatus("All");
    setFilterCycle("All");
    setFilterAppId("All");
    setPage(1);
  }

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
    setError("");
  }

  function syncBilling(next: Subscription[], appIds: string[]) {
    for (const appId of new Set(appIds)) {
      const app = apps.find((item) => item.id === appId);
      if (!app) continue;

      const appSubscriptions = next.filter(
        (sub) => sub.appId === appId && sub.status === "Active",
      );

      const cost = appSubscriptions.reduce(
        (sum, sub) => sum + monthlyEquivalent(sub),
        0,
      );

      const nextRenewal = [...appSubscriptions].sort(
        (a, b) => a.renewalDate.localeCompare(b.renewalDate),
      )[0]?.renewalDate ?? app.renewalDate;

      onUpdateBilling(
        appId,
        Math.round(cost * 100) / 100,
        nextRenewal,
      );
    }
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyDraft(apps));
    setError("");
    setSelectedId(null);
    setFormOpen(true);
  }

  function openEdit(sub: Subscription) {
    setEditingId(sub.id);
    setForm(draftFromSubscription(sub));
    setError("");
    setSelectedId(null);
    setFormOpen(true);
  }

  function saveSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(form.amount);
    const seats = Number(form.seats);

    if (!apps.some((app) => app.id === form.appId)) {
      setError("Choose a valid application.");
      return;
    }
    if (!form.plan.trim()) {
      setError("Enter the subscription plan.");
      return;
    }
    if (
      form.amount.trim() === "" ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      setError("Enter a valid billing amount.");
      return;
    }
    if (
      form.seats.trim() === "" ||
      !Number.isInteger(seats) ||
      seats < 1
    ) {
      setError("Seats must be a positive whole number.");
      return;
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(form.startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(form.renewalDate) ||
      Number.isNaN(Date.parse(form.startDate)) ||
      Number.isNaN(Date.parse(form.renewalDate))
    ) {
      setError("Enter valid start and renewal dates.");
      return;
    }
    if (form.renewalDate < form.startDate) {
      setError("Renewal date cannot be before the start date.");
      return;
    }

    const previous = subscriptions.find((sub) => sub.id === editingId);

    const record: Subscription = {
      id: editingId ?? `SUB-${crypto.randomUUID()}`,
      appId: form.appId,
      plan: form.plan.trim(),
      billingCycle: form.billingCycle,
      amount,
      seats,
      startDate: form.startDate,
      renewalDate: form.renewalDate,
      status: form.status,
      autoRenew: form.autoRenew,
    };

    const next = editingId
      ? subscriptions.map((sub) =>
          sub.id === editingId ? record : sub,
        )
      : [...subscriptions, record];

    setSubscriptions(next);
    syncBilling(
      next,
      [record.appId, ...(previous ? [previous.appId] : [])],
    );

    setFormOpen(false);
    setEditingId(null);
    setNotice(
      previous
        ? "Subscription updated successfully."
        : "Subscription created successfully.",
    );
  }

  function changeStatus(
    sub: Subscription,
    status: SubscriptionStatus,
  ) {
    const next = subscriptions.map((item) =>
      item.id === sub.id ? { ...item, status } : item,
    );
    setSubscriptions(next);
    syncBilling(next, [sub.appId]);
    setSelectedId(null);
    setNotice(`Subscription marked ${status.toLowerCase()}.`);
  }

  function deleteSubscription() {
    if (!selected) return;
    const next = subscriptions.filter(
      (sub) => sub.id !== selected.id,
    );
    setSubscriptions(next);
    syncBilling(next, [selected.appId]);
    setSelectedId(null);
    setDeleteConfirm(false);
    setNotice("Subscription deleted successfully.");
  }

  function resetSamples() {
    if (
      !window.confirm(
        "Restore sample subscriptions? This replaces your saved subscriptions.",
      )
    ) {
      return;
    }

    const next = createSampleSubscriptions(apps);
    setSubscriptions(next);
    syncBilling(next, apps.map((app) => app.id));
    setNotice("Sample subscriptions restored.");
    setPage(1);
  }

  return (
    <div className="p7-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            CONTRACTS & BILLING
          </div>
          <h1>Subscription Management</h1>
          <p>
            Manage SaaS plans, billing cycles, renewals, and
            subscription spending.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => exportSubscriptions(filtered, apps)}
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={resetSamples}
          >
            <RotateCcw size={16} /> Reset Samples
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={openAdd}
            disabled={apps.length === 0}
          >
            <Plus size={16} /> Add Subscription
          </button>
        </div>
      </div>

      {notice && (
        <div className="p7-notice" role="status">
          <CheckCircle2 size={18} />
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="p7-kpis">
        <article className="p7-kpi">
          <span className="p7-kpi-icon purple">
            <CreditCard size={20} />
          </span>
          <span>Active Subscriptions</span>
          <strong>{active.length}</strong>
          <small>{linkedSubscriptions.length} total records</small>
        </article>
        <article className="p7-kpi">
          <span className="p7-kpi-icon blue">
            <Wallet size={20} />
          </span>
          <span>Monthly Spend</span>
          <strong>{currency(monthlySpend)}</strong>
          <small>Monthly-equivalent billing</small>
        </article>
        <article className="p7-kpi">
          <span className="p7-kpi-icon green">
            <CalendarDays size={20} />
          </span>
          <span>Annualized Spend</span>
          <strong>{currency(annualSpend)}</strong>
          <small>{annualSubscriptions} annual-billed plans</small>
        </article>
        <article className="p7-kpi">
          <span className="p7-kpi-icon orange">
            <AlertCircle size={20} />
          </span>
          <span>Renewals in 30 Days</span>
          <strong>{renewals.length}</strong>
          <small>Based on demo reference date</small>
        </article>
      </div>

      <div className="p7-top-grid">
        <section className="p7-panel">
          <div className="p7-section-heading">
            <div>
              <h2>Billing Overview</h2>
              <p>Active subscription spending by billing cycle</p>
            </div>
          </div>
          <div className="p7-billing-total">
            <span>Total annualized commitment</span>
            <strong>{currency(annualSpend)}</strong>
          </div>

          {(["Monthly", "Annual"] as BillingCycle[]).map((cycle) => {
            const amount = active
              .filter((sub) => sub.billingCycle === cycle)
              .reduce((sum, sub) => sum + monthlyEquivalent(sub), 0);
            return (
              <div className="p7-cycle" key={cycle}>
                <div>
                  <strong>{cycle} Billing</strong>
                  <span>{currency(amount)}/month equivalent</span>
                </div>
                <div className="p7-progress">
                  <span
                    style={{
                      width: `${
                        monthlySpend > 0
                          ? (amount / monthlySpend) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            );
          })}

          <p className="p7-note">
            Annual plans are divided by 12 for comparison.
            These are estimated recurring costs, not payment transactions.
          </p>
        </section>

        <section className="p7-panel">
          <div className="p7-section-heading">
            <div>
              <h2>Upcoming Renewals</h2>
              <p>Subscriptions requiring attention</p>
            </div>
            <span className="p7-count">{upcoming.length}</span>
          </div>

          {upcoming.slice(0, 4).map((sub) => {
            const app = apps.find((item) => item.id === sub.appId);
            if (!app) return null;
            return (
              <button
                className="p7-renewal-row"
                type="button"
                key={sub.id}
                onClick={() => setSelectedId(sub.id)}
              >
                <span
                  className="p7-app-avatar"
                  style={{ backgroundColor: app.color }}
                >
                  {app.name.charAt(0)}
                </span>
                <span className="p7-renewal-name">
                  <strong>{app.name}</strong>
                  <small>{dateText(sub.renewalDate)}</small>
                </span>
                <span className="p7-days">
                  {daysUntil(sub.renewalDate)} days
                </span>
                <ArrowRight size={15} />
              </button>
            );
          })}

          {upcoming.length === 0 && (
            <div className="p7-empty compact">
              No subscriptions renew in the next 30 demo days.
            </div>
          )}
        </section>
      </div>

      <section className="p7-panel p7-inventory">
        <div className="p7-section-heading">
          <div>
            <h2>All Subscriptions</h2>
            <p>Review contracts, billing cycles, costs, and renewals.</p>
          </div>
          <span className="p7-count">{filtered.length} results</span>
        </div>

        <div className="p7-toolbar">
          <label className="p7-search">
            <Search size={17} />
            <input
              value={search}
              placeholder="Search application or plan..."
              aria-label="Search subscriptions"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>

          <label className="p7-filter">
            <span>Application</span>
            <select
              value={filterAppId}
              onChange={(event) => {
                setFilterAppId(event.target.value);
                setPage(1);
              }}
            >
              <option value="All">All Applications</option>
              {apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name}
                </option>
              ))}
            </select>
          </label>

          <label className="p7-filter">
            <span>Billing Cycle</span>
            <select
              value={filterCycle}
              onChange={(event) => {
                setFilterCycle(event.target.value);
                setPage(1);
              }}
            >
              <option value="All">All Cycles</option>
              <option value="Monthly">Monthly</option>
              <option value="Annual">Annual</option>
            </select>
          </label>

          <label className="p7-filter">
            <span>Status</span>
            <select
              value={filterStatus}
              onChange={(event) => {
                setFilterStatus(event.target.value as FilterStatus);
                setPage(1);
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </label>

          <button className="p7-clear" type="button" onClick={clearFilters}>
            <RotateCcw size={15} /> Clear
          </button>
        </div>

        <div className="p7-table-scroll">
          <table className="p7-table">
            <thead>
              <tr>
                <th>APPLICATION / PLAN</th>
                <th>BILLING</th>
                <th>AMOUNT</th>
                <th>MONTHLY EQUIVALENT</th>
                <th>RENEWAL</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((sub) => {
                const app = apps.find((item) => item.id === sub.appId);
                if (!app) return null;
                return (
                  <tr key={sub.id}>
                    <td>
                      <div className="p7-app-cell">
                        <span
                          className="p7-app-avatar"
                          style={{ backgroundColor: app.color }}
                        >
                          {app.name.charAt(0)}
                        </span>
                        <span>
                          <strong>{app.name}</strong>
                          <small>{sub.plan}</small>
                        </span>
                      </div>
                    </td>
                    <td>{sub.billingCycle}</td>
                    <td>
                      <strong>{currency(sub.amount)}</strong>
                    </td>
                    <td>{currency(monthlyEquivalent(sub))}</td>
                    <td>
                      <span className="p7-date">
                        {dateText(sub.renewalDate)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`p7-status ${sub.status.toLowerCase()}`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="p7-action"
                        onClick={() => {
                          setDeleteConfirm(false);
                          setSelectedId(sub.id);
                        }}
                      >
                        Manage <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="p7-empty">
              <Search size={24} />
              <strong>No subscriptions found</strong>
              <p>Try clearing your filters or add a subscription.</p>
            </div>
          )}
        </div>

        <div className="p7-pagination">
          <span>
            Showing{" "}
            {filtered.length
              ? (activePage - 1) * pageSize + 1
              : 0}
            –{Math.min(activePage * pageSize, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div>
            <button
              type="button"
              aria-label="Previous page"
              disabled={activePage === 1}
              onClick={() => setPage((previous) => Math.max(1, previous - 1))}
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              {activePage} / {pageCount}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={activePage === pageCount}
              onClick={() =>
                setPage((previous) => Math.min(pageCount, previous + 1))
              }
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {selected && selectedApp && (
        <div className="p7-overlay">
          <button
            type="button"
            className="p7-backdrop"
            aria-label="Close subscription details"
            onClick={() => setSelectedId(null)}
          />
          <aside
            className="p7-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedApp.name} subscription`}
          >
            <div className="p7-drawer-header">
              <div>
                <small>SUBSCRIPTION DETAILS</small>
                <h2>{selectedApp.name}</h2>
              </div>
              <button
                type="button"
                aria-label="Close drawer"
                onClick={() => setSelectedId(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p7-drawer-body">
              <div className="p7-detail-hero">
                <span
                  className="p7-app-avatar"
                  style={{ backgroundColor: selectedApp.color }}
                >
                  {selectedApp.name.charAt(0)}
                </span>
                <div>
                  <strong>{selected.plan}</strong>
                  <span>{selectedApp.department}</span>
                </div>
                <span
                  className={`p7-status ${selected.status.toLowerCase()}`}
                >
                  {selected.status}
                </span>
              </div>

              <div className="p7-detail-cost">
                <span>Monthly-equivalent cost</span>
                <strong>{currency(monthlyEquivalent(selected))}</strong>
                <small>
                  Billed {currency(selected.amount)}{" "}
                  {selected.billingCycle.toLowerCase()}
                </small>
              </div>

              {[
                ["Billing Cycle", selected.billingCycle],
                ["Purchased Seats", String(selected.seats)],
                ["Start Date", dateText(selected.startDate)],
                ["Renewal Date", dateText(selected.renewalDate)],
                ["Auto Renewal", selected.autoRenew ? "Enabled" : "Disabled"],
                ["Status", selected.status],
              ].map(([label, value]) => (
                <div className="p7-detail-field" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}

              <div className="p7-detail-alert">
                <CalendarDays size={18} />
                <p>
                  {daysUntil(selected.renewalDate) >= 0
                    ? `Renewal is ${daysUntil(
                        selected.renewalDate,
                      )} days from the demo reference date.`
                    : "The stored renewal date is in the past relative to the demo reference date."}
                </p>
              </div>

              <h3>Subscription Actions</h3>

              <div className="p7-detail-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => openEdit(selected)}
                >
                  <Pencil size={16} /> Edit Subscription
                </button>

                {selected.status === "Active" ? (
                  <>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => changeStatus(selected, "Paused")}
                    >
                      Pause
                    </button>
                    <button
                      type="button"
                      className="button p7-danger-button"
                      onClick={() => changeStatus(selected, "Cancelled")}
                    >
                      Cancel Subscription
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => changeStatus(selected, "Active")}
                  >
                    <Check size={16} /> Reactivate
                  </button>
                )}

                <button
                  type="button"
                  className="button p7-danger-button"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 size={16} /> Delete Record
                </button>
              </div>

              {deleteConfirm && (
                <div className="p7-confirm">
                  <strong>Delete this subscription?</strong>
                  <p>This permanently removes its saved subscription record.</p>
                  <div>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => setDeleteConfirm(false)}
                    >
                      Keep Record
                    </button>
                    <button
                      type="button"
                      className="button p7-danger-button"
                      onClick={deleteSubscription}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p7-drawer-footer">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setSelectedId(null)}
              >
                Close
              </button>
            </div>
          </aside>
        </div>
      )}

      {formOpen && (
        <div className="p7-overlay">
          <button
            type="button"
            className="p7-backdrop"
            aria-label="Close subscription form"
            onClick={() => setFormOpen(false)}
          />
          <aside
            className="p7-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={
              editingId ? "Edit subscription" : "Add subscription"
            }
          >
            <div className="p7-drawer-header">
              <div>
                <small>CONTRACT MANAGEMENT</small>
                <h2>
                  {editingId ? "Edit Subscription" : "Add Subscription"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close form"
                onClick={() => setFormOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form className="p7-form" onSubmit={saveSubscription}>
              <div className="p7-drawer-body">
                <p className="p7-form-intro">
                  Link a subscription to an application in your portfolio.
                  Active subscription costs update dashboard spending.
                </p>

                {error && (
                  <div className="p7-error" role="alert">
                    <AlertCircle size={17} /> {error}
                  </div>
                )}

                <label>
                  Application
                  <select
                    value={form.appId}
                    onChange={(event) =>
                      setField("appId", event.target.value)
                    }
                    required
                  >
                    <option value="">Select application</option>
                    {apps.map((app) => (
                      <option value={app.id} key={app.id}>
                        {app.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Subscription Plan
                  <input
                    value={form.plan}
                    placeholder="e.g. Enterprise Plus"
                    maxLength={100}
                    onChange={(event) =>
                      setField("plan", event.target.value)
                    }
                    required
                  />
                </label>

                <div className="p7-form-grid">
                  <label>
                    Billing Cycle
                    <select
                      value={form.billingCycle}
                      onChange={(event) =>
                        setField(
                          "billingCycle",
                          event.target.value as BillingCycle,
                        )
                      }
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Annual">Annual</option>
                    </select>
                  </label>
                  <label>
                    {form.billingCycle === "Annual"
                      ? "Annual Amount (USD)"
                      : "Monthly Amount (USD)"}
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      placeholder="0.00"
                      onChange={(event) =>
                        setField("amount", event.target.value)
                      }
                      required
                    />
                  </label>
                </div>

                <label>
                  Purchased Seats
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.seats}
                    onChange={(event) =>
                      setField("seats", event.target.value)
                    }
                    required
                  />
                </label>

                <div className="p7-form-grid">
                  <label>
                    Start Date
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(event) =>
                        setField("startDate", event.target.value)
                      }
                      required
                    />
                  </label>
                  <label>
                    Renewal Date
                    <input
                      type="date"
                      value={form.renewalDate}
                      onChange={(event) =>
                        setField("renewalDate", event.target.value)
                      }
                      required
                    />
                  </label>
                </div>

                <label>
                  Status
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setField(
                        "status",
                        event.target.value as SubscriptionStatus,
                      )
                    }
                  >
                    <option value="Active">Active</option>
                    <option value="Paused">Paused</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </label>

                <label className="p7-checkbox">
                  <input
                    type="checkbox"
                    checked={form.autoRenew}
                    onChange={(event) =>
                      setField("autoRenew", event.target.checked)
                    }
                  />
                  Enable automatic renewal tracking
                </label>

                <div className="p7-form-preview">
                  <Wallet size={18} />
                  <div>
                    <span>Estimated monthly equivalent</span>
                    <strong>
                      {currency(
                        (Number(form.amount) || 0) /
                          (form.billingCycle === "Annual" ? 12 : 1),
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p7-drawer-footer">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setFormOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                >
                  <Check size={16} />
                  {editingId ? "Save Changes" : "Add Subscription"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
