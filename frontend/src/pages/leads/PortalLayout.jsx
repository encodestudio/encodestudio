import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { BarChart3, CheckSquare, Columns3, LogOut, Menu, Plus, Table2, Users, X } from "lucide-react";
import Logo from "../../components/Logo.jsx";
import { PortalContext } from "./PortalContext.jsx";
import NewLeadModal from "./NewLeadModal.jsx";
import { Avatar, Toast } from "./ui.jsx";
import { fetchTaskSummary, fetchUsers, logout } from "../../lib/leadsApi.js";

const NAV = [
  { to: "/leads", label: "Dashboard", icon: BarChart3, end: true },
  { to: "/leads/list", label: "Leads", icon: Table2 },
  { to: "/leads/pipeline", label: "Pipeline", icon: Columns3 },
  { to: "/leads/tasks", label: "Tasks", icon: CheckSquare, badge: "tasks" },
  { to: "/leads/team", label: "Team", icon: Users },
];

export default function PortalLayout({ user, onLoggedOut, children }) {
  const [users, setUsers] = useState([]);
  const [taskSummary, setTaskSummary] = useState(null);
  const [toast, setToast] = useState(null);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const refreshUsers = useCallback(() => fetchUsers().then(setUsers).catch(() => {}), []);
  const refreshTasks = useCallback(() => fetchTaskSummary().then(setTaskSummary).catch(() => {}), []);

  useEffect(() => {
    refreshUsers();
    refreshTasks();
  }, [refreshUsers, refreshTasks]);

  useEffect(() => setMobileNav(false), [location.pathname]);

  const notify = useCallback((message, tone = "default") => setToast({ message, tone, id: Date.now() }), []);

  const context = useMemo(
    () => ({
      user,
      users,
      activeUsers: users.filter((u) => u.is_active),
      refreshUsers,
      refreshTasks,
      notify,
      dataVersion,
      // Pages listen to this to refetch after a lead is created elsewhere.
      bumpData: () => setDataVersion((v) => v + 1),
    }),
    [user, users, refreshUsers, refreshTasks, notify, dataVersion],
  );

  const handleLogout = () => {
    logout();
    onLoggedOut();
  };

  const taskBadge = taskSummary?.overdue || taskSummary?.due_soon || 0;

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Logo className="h-7 w-auto" />
        <span className="rounded-full bg-encode-blueTint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-encode-blueDark">
          CRM
        </span>
      </div>
      <div className="px-3">
        <button onClick={() => setNewLeadOpen(true)} className="btn-primary w-full justify-center !py-2.5">
          <Plus size={16} /> New lead
        </button>
      </div>
      <ul className="mt-5 space-y-0.5 px-3">
        {NAV.map(({ to, label, icon: Icon, end, badge }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-black text-white" : "text-black/70 hover:bg-encode-soft hover:text-black"
                }`
              }
            >
              <Icon size={17} />
              <span className="flex-1">{label}</span>
              {badge === "tasks" && taskBadge > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    taskSummary.overdue ? "bg-red-600 text-white" : "bg-encode-blue text-black"
                  }`}
                  title={taskSummary.overdue ? `${taskSummary.overdue} overdue` : `${taskSummary.due_soon} due within 24h`}
                >
                  {taskBadge}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="mt-auto border-t border-encode-border p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-encode-grey">{user.is_superuser ? "Admin" : "Team member"}</p>
          </div>
          <button onClick={handleLogout} className="rounded-lg p-2 text-encode-grey hover:bg-encode-soft hover:text-black" title="Sign out" aria-label="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <PortalContext.Provider value={context}>
      <div className="min-h-screen bg-encode-soft">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-encode-border bg-white lg:block">{sidebar}</aside>

        {/* Mobile top bar + drawer */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-encode-border bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setMobileNav(true)} className="rounded-lg p-2 hover:bg-encode-soft" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <Logo className="h-6 w-auto" />
          <button onClick={() => setNewLeadOpen(true)} className="rounded-lg p-2 hover:bg-encode-soft" aria-label="New lead">
            <Plus size={20} />
          </button>
        </div>
        {mobileNav && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNav(false)} />
            <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
              <button onClick={() => setMobileNav(false)} className="absolute right-3 top-4 rounded-lg p-2 hover:bg-encode-soft" aria-label="Close menu">
                <X size={18} />
              </button>
              {sidebar}
            </aside>
          </div>
        )}

        <main className="lg:pl-60">
          <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>

      <AnimatePresence>
        {newLeadOpen && (
          <NewLeadModal
            onClose={() => setNewLeadOpen(false)}
            onCreated={(lead) => {
              setNewLeadOpen(false);
              setDataVersion((v) => v + 1);
              notify(`Lead "${lead.name}" created`);
              navigate(`/leads/lead/${lead.id}`);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && <Toast key={toast.id} message={toast.message} tone={toast.tone} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </PortalContext.Provider>
  );
}

/** Page title row used by every portal page. */
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-encode-grey">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
