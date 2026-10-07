import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { createUser, updateUser } from "../../lib/leadsApi.js";
import { PageHeader } from "./PortalLayout.jsx";
import { usePortal } from "./PortalContext.jsx";
import { Avatar, Field, Modal } from "./ui.jsx";
import { timeAgo } from "./format.js";

function UserForm({ initial, creating, onSubmit, onClose, canSetAdmin }) {
  const [form, setForm] = useState({
    username: "",
    first_name: initial?.first_name || "",
    last_name: initial?.last_name || "",
    email: initial?.email || "",
    password: "",
    is_superuser: initial?.is_superuser || false,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = { ...form };
      if (!creating) delete body.username;
      if (!body.password) delete body.password;
      if (!canSetAdmin) delete body.is_superuser;
      await onSubmit(body);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={creating ? "Add team member" : `Edit ${initial.name}`} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {creating && (
          <Field label="Username *" className="sm:col-span-2">
            <input required autoFocus value={form.username} onChange={set("username")} className="input" autoComplete="off" />
          </Field>
        )}
        <Field label="First name">
          <input value={form.first_name} onChange={set("first_name")} className="input" />
        </Field>
        <Field label="Last name">
          <input value={form.last_name} onChange={set("last_name")} className="input" />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <input type="email" value={form.email} onChange={set("email")} className="input" />
        </Field>
        <Field label={creating ? "Password * (min. 8 characters)" : "New password (leave blank to keep)"} className="sm:col-span-2">
          <input type="password" required={creating} minLength={8} value={form.password} onChange={set("password")} className="input" autoComplete="new-password" />
        </Field>
        {canSetAdmin && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.is_superuser} onChange={set("is_superuser")} className="h-4 w-4 accent-black" />
            Admin — can manage the team
          </label>
        )}
        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 sm:col-span-2">{error}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="btn-secondary !px-5 !py-2.5">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary !px-5 !py-2.5 disabled:opacity-50">
            {saving ? "Saving..." : creating ? "Add member" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function TeamPage() {
  const { user, users, refreshUsers, notify } = usePortal();
  const [editing, setEditing] = useState(null); // user object, or "new"
  const isAdmin = user.is_superuser;

  const toggleActive = async (member) => {
    if (member.is_active && !window.confirm(`Deactivate ${member.name}? They won't be able to sign in. Their leads stay assigned.`)) return;
    try {
      await updateUser(member.id, { is_active: !member.is_active });
      notify(member.is_active ? `${member.name} deactivated` : `${member.name} reactivated`);
      refreshUsers();
    } catch (err) {
      notify(err.message, "error");
    }
  };

  return (
    <div>
      <PageHeader title="Team" subtitle="People who can sign in to the lead manager.">
        {isAdmin && (
          <button onClick={() => setEditing("new")} className="btn-primary !px-4 !py-2 text-xs">
            <UserPlus size={14} /> Add member
          </button>
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {users.map((m) => (
          <div key={m.id} className={`rounded-2xl border border-encode-border bg-white p-5 ${m.is_active ? "" : "opacity-60"}`}>
            <div className="flex items-start gap-3">
              <Avatar name={m.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-semibold">
                  {m.name}
                  {m.is_superuser && <ShieldCheck size={14} className="text-encode-blueDark" aria-label="Admin" />}
                  {m.id === user.id && <span className="text-xs font-normal text-encode-grey">(you)</span>}
                </p>
                <p className="truncate text-xs text-encode-grey">
                  @{m.username}
                  {m.email && ` · ${m.email}`}
                </p>
              </div>
              {!m.is_active && <span className="rounded-full bg-encode-soft px-2 py-0.5 text-[10px] font-semibold text-encode-grey">Inactive</span>}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-encode-soft py-2">
                <p className="text-lg font-bold">{m.open_leads}</p>
                <p className="text-[10px] uppercase tracking-wide text-encode-grey">Open leads</p>
              </div>
              <div className="rounded-xl bg-encode-soft py-2">
                <p className="text-lg font-bold">{m.open_tasks}</p>
                <p className="text-[10px] uppercase tracking-wide text-encode-grey">Follow-ups</p>
              </div>
              <div className="rounded-xl bg-encode-soft py-2">
                <p className="truncate px-1 pt-1 text-xs font-semibold">{m.last_login ? timeAgo(m.last_login) : "Never"}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-encode-grey">Last login</p>
              </div>
            </div>
            {(isAdmin || m.id === user.id) && (
              <div className="mt-4 flex gap-2">
                <button onClick={() => setEditing(m)} className="btn-secondary flex-1 justify-center !px-3 !py-2 text-xs">
                  <KeyRound size={13} /> {m.id === user.id ? "Profile & password" : "Edit"}
                </button>
                {isAdmin && m.id !== user.id && (
                  <button onClick={() => toggleActive(m)} className="rounded-full border border-encode-border px-3 py-2 text-xs font-semibold hover:border-black">
                    {m.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!isAdmin && <p className="mt-6 text-sm text-encode-grey">Only admins can add or deactivate team members.</p>}

      <AnimatePresence>
        {editing && (
          <UserForm
            creating={editing === "new"}
            initial={editing === "new" ? null : editing}
            canSetAdmin={isAdmin && (editing === "new" || editing.id !== user.id)}
            onClose={() => setEditing(null)}
            onSubmit={async (body) => {
              if (editing === "new") await createUser(body);
              else await updateUser(editing.id, body);
              notify(editing === "new" ? "Team member added" : "Saved");
              setEditing(null);
              refreshUsers();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
