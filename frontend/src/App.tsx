import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { api } from './lib/api';

export function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('jalwatch_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    // Default demo session for immediate exploration
    return {
      id: 'user-official-01',
      name: 'Aarti Kadam (Gram Sevak)',
      email: 'sarpanch@shirsuphal.gp.gov.in',
      role: 'gp_official',
      gram_panchayat_id: 'gp-shirsuphal-pune',
      gram_panchayat_name: 'Shirsuphal Gram Panchayat',
      is_active: true,
    };
  });

  const [alertsCount, setAlertsCount] = useState(2);
  const [complaintsCount, setComplaintsCount] = useState(1);

  const handleLoginSuccess = (loggedInUser: User, token: string) => {
    localStorage.setItem('jalwatch_token', token);
    localStorage.setItem('jalwatch_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('jalwatch_token');
    localStorage.removeItem('jalwatch_user');
    setUser(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Official Portal */}
        <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />

        <Route
          element={
            <AppLayout
              user={user}
              onLogout={handleLogout}
              alertsCount={alertsCount}
              complaintsCount={complaintsCount}
            />
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

        {/* Citizen Villager Portal */}
        <Route path="/villager" element={<VillagerLayout />}>
          <Route index element={<VillagerHome />} />
          <Route path="report" element={<ReportProblem />} />
          <Route path="track" element={<TrackComplaint />} />
          <Route path="info" element={<WaterServiceInfo />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
