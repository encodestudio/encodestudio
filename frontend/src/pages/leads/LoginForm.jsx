import { useState } from "react";
import Logo from "../../components/Logo.jsx";
import { login } from "../../lib/leadsApi.js";

export default function LoginForm({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(username, password);
      onSuccess(user);
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-encode-soft px-6">
      <div className="w-full max-w-sm rounded-3xl border border-encode-border bg-white p-8 shadow-xl shadow-black/5">
        <Logo className="h-8 w-auto" />
        <p className="label mt-6">Lead Manager</p>
        <h1 className="mt-2 text-2xl font-display font-bold">Sign in</h1>
        <p className="mt-1.5 text-sm text-encode-grey">Staff access only.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-black/80">Username</label>
            <input
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              placeholder="username"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-black/80">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-60">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
