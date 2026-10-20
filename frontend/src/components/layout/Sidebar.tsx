import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Waves,
  AlertTriangle,
  MessageSquareWarning,
  FileSpreadsheet,
  Sliders,
  Landmark,
  Radio,
} from 'lucide-react';

interface SidebarProps {
  alertsCount?: number;
  complaintsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ alertsCount = 0, complaintsCount = 0 }) => {
  const navItems = [
    { to: '/', label: 'Overview', icon: LayoutDashboard },
    { to: '/connections', label: 'Tap Connections (FHTCs)', icon: Waves },
    { to: '/alerts', label: 'Active Alerts', icon: AlertTriangle, badge: alertsCount },
    { to: '/complaints', label: 'Grievance Triage', icon: MessageSquareWarning, badge: complaintsCount },
    { to: '/reports', label: 'Reports & CSV Exports', icon: FileSpreadsheet },
    { to: '/settings', label: 'Thresholds & Schedule', icon: Sliders },
    { to: '/integrations', label: 'IMIS / Sujal Gaon', icon: Landmark },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0 min-h-[calc(100vh-5rem)] p-4 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Panchayat Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-900/50 to-blue-900/30 text-cyan-300 border border-cyan-800/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </div>

      {/* Hardware Telemetry Pulse Card */}
      <div className="mt-6 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="flex items-center justify-between text-slate-300 font-medium">
          <div className="flex items-center space-x-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Telemetry Bus</span>
          </div>
          <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/40">ONLINE</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Listening on <code className="text-cyan-400">/api/v1/ingest/readings</code>. ESP32 edge clients synchronized.
        </p>
      </div>
    </aside>
  );
};
