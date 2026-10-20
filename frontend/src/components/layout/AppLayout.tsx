import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { User } from '../../types';

interface AppLayoutProps {
  user: User | null;
  onLogout: () => void;
  alertsCount?: number;
  complaintsCount?: number;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  user,
  onLogout,
  alertsCount,
  complaintsCount,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar user={user} onLogout={onLogout} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar alertsCount={alertsCount} complaintsCount={complaintsCount} />
        <main className="flex-1 overflow-y-auto bg-slate-900/40 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
