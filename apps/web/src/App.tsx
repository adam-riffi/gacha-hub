import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LibraryPage } from "./pages/LibraryPage";
import { ActivitiesPage } from "./pages/ActivitiesPage";
import { EndgamePage } from "./pages/EndgamePage";
import { OwnershipPage } from "./pages/OwnershipPage";
import { CharactersPage } from "./pages/CharactersPage";
import { PlannerPage } from "./pages/PlannerPage";
import { ProfilePage } from "./pages/ProfilePage";
import { EquipmentPage } from "./pages/EquipmentPage";
import { GearSetsPage } from "./pages/GearSetsPage";
import { MaterialsPage } from "./pages/MaterialsPage";
import { PullsPage } from "./pages/PullsPage";
import { CharacterPage } from "./pages/CharacterPage";
import { CalendarPage } from "./pages/CalendarPage";
import { AdminPage } from "./pages/AdminPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TasksPage } from "./pages/TasksPage";

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
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/games/:id" element={<ActivitiesPage />} />
        <Route path="/games/:id/overview" element={<Navigate to="../profile" relative="path" replace />} />
        <Route path="/games/:id/endgame" element={<EndgamePage />} />
        <Route path="/games/:id/ownership" element={<OwnershipPage />} />
        <Route path="/games/:id/characters" element={<CharactersPage />} />
        <Route path="/games/:id/planner" element={<PlannerPage />} />
        <Route path="/games/:id/profile" element={<ProfilePage />} />
        <Route path="/games/:id/equipment" element={<EquipmentPage />} />
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
    </Layout>
  );
}
