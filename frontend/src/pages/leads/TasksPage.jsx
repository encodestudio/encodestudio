import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck2, Trash2 } from "lucide-react";
import { deleteTask, fetchTasks, updateTask } from "../../lib/leadsApi.js";
import { PageHeader } from "./PortalLayout.jsx";
import { usePortal } from "./PortalContext.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { Avatar, EmptyState } from "./ui.jsx";
import { formatDate } from "./format.js";

function groupTasks(tasks) {
  const now = new Date();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const groups = { Overdue: [], Today: [], Upcoming: [], "No due date": [] };
  for (const t of tasks) {
    if (!t.due_at) groups["No due date"].push(t);
    else if (new Date(t.due_at) < now) groups.Overdue.push(t);
    else if (new Date(t.due_at) <= endOfToday) groups.Today.push(t);
    else groups.Upcoming.push(t);
  }
  return groups;
}

function TaskRow({ task, onToggle, onDelete }) {
  const overdue = !task.completed_at && task.due_at && new Date(task.due_at) < new Date();
  return (
    <li className="group flex items-center gap-3 px-5 py-3">
      <input type="checkbox" checked={Boolean(task.completed_at)} onChange={() => onToggle(task)} className="h-4 w-4 shrink-0 accent-black" aria-label={`Complete ${task.title}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${task.completed_at ? "text-encode-grey line-through" : "font-medium text-black"}`}>{task.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-encode-grey">
          <Link to={`/leads/lead/${task.lead.id}`} className="font-semibold text-encode-blueDark hover:underline">
            {task.lead.name}
          </Link>
          {task.lead.company && <span>· {task.lead.company}</span>}
          <StatusBadge status={task.lead.status} />
        </p>
      </div>
      <span className={`hidden shrink-0 text-xs sm:block ${overdue ? "font-semibold text-red-600" : "text-encode-grey"}`}>
        {task.completed_at ? `Done ${formatDate(task.completed_at)}` : task.due_at ? formatDate(task.due_at, true) : ""}
      </span>
      {task.assigned_to && <Avatar name={task.assigned_to.name} size="xs" />}
      <button onClick={() => onDelete(task)} className="rounded p-1 text-encode-grey opacity-0 hover:text-red-600 focus:opacity-100 group-hover:opacity-100" aria-label="Delete follow-up">
        <Trash2 size={14} />
      </button>
    </li>
  );
}

export default function TasksPage() {
  const { notify, refreshTasks } = usePortal();
  const [scope, setScope] = useState("mine");
  const [state, setState] = useState("open");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    return fetchTasks({ scope, state })
      .then(setTasks)
      .catch((e) => notify(e.message, "error"))
      .finally(() => setLoading(false));
  }, [scope, state, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (task) => {
    try {
      await updateTask(task.id, { completed: !task.completed_at });
      if (!task.completed_at) notify("Follow-up completed");
      load();
      refreshTasks();
    } catch (err) {
      notify(err.message, "error");
    }
  };

  const remove = async (task) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await deleteTask(task.id);
      load();
      refreshTasks();
    } catch (err) {
      notify(err.message, "error");
    }
  };

  const groups = state === "open" ? groupTasks(tasks) : { Completed: tasks };
  const toggleClass = (active) => `rounded-full px-3.5 py-1.5 text-xs font-semibold ${active ? "bg-black text-white" : "text-black/60 hover:text-black"}`;

  return (
    <div>
      <PageHeader title="Follow-ups" subtitle="Scheduled calls, emails and next steps across your leads. Add them from a lead's page.">
        <div className="flex rounded-full border border-encode-border bg-white p-1">
          <button onClick={() => setScope("mine")} className={toggleClass(scope === "mine")}>
            Mine
          </button>
          <button onClick={() => setScope("all")} className={toggleClass(scope === "all")}>
            Everyone
          </button>
        </div>
        <div className="flex rounded-full border border-encode-border bg-white p-1">
          <button onClick={() => setState("open")} className={toggleClass(state === "open")}>
            Open
          </button>
          <button onClick={() => setState("done")} className={toggleClass(state === "done")}>
            Completed
          </button>
        </div>
      </PageHeader>

      {!loading && tasks.length === 0 ? (
        <div className="rounded-2xl border border-encode-border bg-white">
          <EmptyState icon={CalendarCheck2} title={state === "open" ? "You're all caught up" : "Nothing completed yet"}>
            {state === "open" ? "Schedule a follow-up from any lead's page and it will show up here." : null}
          </EmptyState>
        </div>
      ) : (
        <div className={`space-y-5 transition-opacity ${loading ? "opacity-50" : ""}`}>
          {Object.entries(groups)
            .filter(([, list]) => list.length)
            .map(([name, list]) => (
              <section key={name} className="overflow-hidden rounded-2xl border border-encode-border bg-white">
                <h2 className={`border-b border-encode-border px-5 py-3 text-sm font-bold ${name === "Overdue" ? "bg-red-50 text-red-700" : ""}`}>
                  {name} <span className="ml-1 font-normal text-encode-grey">{list.length}</span>
                </h2>
                <ul className="divide-y divide-encode-border">
                  {list.map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={toggle} onDelete={remove} />
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
