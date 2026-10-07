import { useEffect, useState } from "react";
import LoginForm from "./LoginForm.jsx";
import Dashboard from "./Dashboard.jsx";
import Seo from "../../components/Seo.jsx";
import { isLoggedIn, fetchMe, clearTokens } from "../../lib/leadsApi.js";

export default function LeadsPortal() {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      setChecking(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setChecking(false));
  }, []);

  const seo = <Seo title="Lead Portal" path="/leads" noindex />;

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-encode-soft text-sm text-encode-grey">
        {seo}
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {seo}
        <LoginForm onSuccess={setUser} />
      </>
    );
  }

  return (
    <>
      {seo}
      <Dashboard user={user} onLoggedOut={() => setUser(null)} />
    </>
  );
}
