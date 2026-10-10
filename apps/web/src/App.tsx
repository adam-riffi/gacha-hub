import { lazy, Suspense, type ComponentType } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
// Every screen but Home loads on first visit, so the shell stays inside the JavaScript budget (DESIGN.md §13).
const page = <K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) => lazy(() => load().then((m) => ({ default: m[name] })));
const LibraryPage = page(() => import("./pages/LibraryPage"), "LibraryPage");
const ActivitiesPage = page(() => import("./pages/ActivitiesPage"), "ActivitiesPage");
const EndgamePage = page(() => import("./pages/EndgamePage"), "EndgamePage");
const OwnershipPage = page(() => import("./pages/OwnershipPage"), "OwnershipPage");
const CharactersPage = page(() => import("./pages/CharactersPage"), "CharactersPage");
const PlannerPage = page(() => import("./pages/PlannerPage"), "PlannerPage");
const ProfilePage = page(() => import("./pages/ProfilePage"), "ProfilePage");
const GearSetsPage = page(() => import("./pages/GearSetsPage"), "GearSetsPage");
const MaterialsPage = page(() => import("./pages/MaterialsPage"), "MaterialsPage");
const PullsPage = page(() => import("./pages/PullsPage"), "PullsPage");
const CharacterPage = page(() => import("./pages/CharacterPage"), "CharacterPage");
const CalendarPage = page(() => import("./pages/CalendarPage"), "CalendarPage");
const AdminPage = page(() => import("./pages/AdminPage"), "AdminPage");
const SettingsPage = page(() => import("./pages/SettingsPage"), "SettingsPage");
const TasksPage = page(() => import("./pages/TasksPage"), "TasksPage");
const UnitPage = page(() => import("./pages/UnitPage"), "UnitPage");

export function App() {
  const { me, loading } = useAuth();

  if (loading) {
    return <div className="center muted">Loading…</div>;
  }
  if (!me?.user) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Suspense fallback={<div className="mu">Loading…</div>}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/games/:id" element={<ActivitiesPage />} />
        <Route path="/games/:id/overview" element={<Navigate to="../profile" relative="path" replace />} />
        <Route path="/games/:id/endgame" element={<EndgamePage />} />
        <Route path="/games/:id/ownership" element={<OwnershipPage />} />
        <Route path="/games/:id/characters" element={<CharactersPage />} />
        <Route path="/games/:id/units/:catalogId" element={<UnitPage />} />
        <Route path="/games/:id/planner" element={<PlannerPage />} />
        <Route path="/games/:id/profile" element={<ProfilePage />} />
        <Route path="/games/:id/equipment" element={<Navigate to="../characters" relative="path" replace />} />
        <Route path="/games/:id/gear" element={<GearSetsPage />} />
        <Route path="/games/:id/materials" element={<MaterialsPage />} />
        <Route path="/games/:id/pulls" element={<PullsPage />} />
        <Route path="/characters/:id" element={<CharacterPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/timeline" element={<CalendarPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </Layout>
  );
}
