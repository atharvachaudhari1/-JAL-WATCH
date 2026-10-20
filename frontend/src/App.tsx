import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { VillagerLayout } from './components/villager/VillagerLayout';

// Official Pages
import { Login } from './pages/official/Login';
import { DashboardOverview } from './pages/official/DashboardOverview';
import { ConnectionsPage } from './pages/official/ConnectionsPage';
import { ConnectionDetailPage } from './pages/official/ConnectionDetailPage';
import { AlertsPage } from './pages/official/AlertsPage';
import { ComplaintsPage } from './pages/official/ComplaintsPage';
import { ReportsPage } from './pages/official/ReportsPage';
import { SettingsPage } from './pages/official/SettingsPage';
import { IntegrationsPage } from './pages/official/IntegrationsPage';

// Villager Pages
import { VillagerHome } from './pages/villager/VillagerHome';
import { ReportProblem } from './pages/villager/ReportProblem';
import { TrackComplaint } from './pages/villager/TrackComplaint';
import { WaterServiceInfo } from './pages/villager/WaterServiceInfo';

import { User } from './types';

// ── Helper: read user + token from localStorage ──────────────────────────────
function getSavedUser(): User | null {
  const token = localStorage.getItem('jalwatch_token');
  const saved = localStorage.getItem('jalwatch_user');
  if (!token || !saved) return null;
  try {
    return JSON.parse(saved) as User;
  } catch {
    return null;
  }
}

// ── Protected route wrapper ───────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('jalwatch_token');
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

// ── Inner app (needs Router context) ─────────────────────────────────────────
function AppRoutes() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(getSavedUser);
  const [alertsCount] = useState(2);
  const [complaintsCount] = useState(1);

  // Keep user state in sync when localStorage changes (e.g. login in another tab)
  useEffect(() => {
    const onStorage = () => setUser(getSavedUser());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleLoginSuccess = (loggedInUser: User, token: string) => {
    localStorage.setItem('jalwatch_token', token);
    localStorage.setItem('jalwatch_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('jalwatch_token');
    localStorage.removeItem('jalwatch_user');
    setUser(null);
    navigate('/login', { replace: true });
  };

  return (
    <Routes>
      {/* Official Portal — Login */}
      <Route
        path="/login"
        element={
          user
            ? <Navigate to="/" replace />
            : <Login onLoginSuccess={handleLoginSuccess} />
        }
      />

      {/* Official Portal — Protected pages */}
      <Route
        element={
          <RequireAuth>
            <AppLayout
              user={user}
              onLogout={handleLogout}
              alertsCount={alertsCount}
              complaintsCount={complaintsCount}
            />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardOverview />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/connections/:id" element={<ConnectionDetailPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/complaints" element={<ComplaintsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/integrations" element={<IntegrationsPage />} />
      </Route>

      {/* Citizen Villager Portal — public, no auth needed */}
      <Route path="/villager" element={<VillagerLayout />}>
        <Route index element={<VillagerHome />} />
        <Route path="report" element={<ReportProblem />} />
        <Route path="track" element={<TrackComplaint />} />
        <Route path="info" element={<WaterServiceInfo />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
