import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import LoginForm from "./LoginForm.jsx";
import PortalLayout from "./PortalLayout.jsx";
import AnalyticsPage from "./AnalyticsPage.jsx";
import LeadsListPage from "./LeadsListPage.jsx";
import PipelinePage from "./PipelinePage.jsx";
import LeadPage from "./LeadPage.jsx";
import TasksPage from "./TasksPage.jsx";
import TeamPage from "./TeamPage.jsx";
import Seo from "../../components/Seo.jsx";
import { isLoggedIn, fetchMe, clearTokens } from "../../lib/leadsApi.js";

/** Old notification emails link to /leads?lead=<id>; send them to the lead page. */
function DashboardOrLegacyLead() {
  const { search } = useLocation();
  const leadId = new URLSearchParams(search).get("lead");
  return leadId ? <Navigate to={`/leads/lead/${leadId}`} replace /> : <AnalyticsPage />;
}

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

  const seo = <Seo title="Lead Manager" path="/leads" noindex />;

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
      <PortalLayout user={user} onLoggedOut={() => setUser(null)}>
        <Routes>
          <Route index element={<DashboardOrLegacyLead />} />
          <Route path="list" element={<LeadsListPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="lead/:id" element={<LeadPage />} />
          <Route path="*" element={<Navigate to="/leads" replace />} />
        </Routes>
      </PortalLayout>
    </>
  );
}
