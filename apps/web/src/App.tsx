import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LibraryPage } from "./pages/LibraryPage";
import { InstancePage } from "./pages/InstancePage";
import { OwnershipPage } from "./pages/OwnershipPage";
import { EquipmentPage } from "./pages/EquipmentPage";
import { MaterialsPage } from "./pages/MaterialsPage";
import { CharacterPage } from "./pages/CharacterPage";
import { TasksPage } from "./pages/TasksPage";
import { SettingsPage } from "./pages/SettingsPage";

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
        <Route path="/games/:id" element={<InstancePage />} />
        <Route path="/games/:id/ownership" element={<OwnershipPage />} />
        <Route path="/games/:id/equipment" element={<EquipmentPage />} />
        <Route path="/games/:id/materials" element={<MaterialsPage />} />
        <Route path="/characters/:id" element={<CharacterPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
