import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Droplet, Shield, User as UserIcon, LogOut, Smartphone, LayoutDashboard, Globe } from 'lucide-react';
import { User } from '../../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isVillagerPortal = location.pathname.startsWith('/villager');

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      {/* Top Demo Banner */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1 text-xs text-amber-300 font-medium flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>DEMO DATA & SIMULATION MODE ACTIVE --- SIH 2026 (Problem Statement 26255)</span>
        </div>
        <div className="hidden sm:flex items-center space-x-4 text-slate-300">
          <span>Ministry of Jal Shakti / JJM</span>
          <span>•</span>
          <span>Shirsuphal Gram Panchayat, Pune</span>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate(isVillagerPortal ? '/villager' : '/')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
              <Droplet className="w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">JalWatch</span>
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">FHTC IoT</span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Real-Time Tap Monitoring & Grievance Redressal</p>
            </div>
          </div>

          {/* Right Action Switcher & Profile */}
          <div className="flex items-center space-x-3">
            {/* Switch between GP Dashboard & Villager App */}
            {isVillagerPortal ? (
              <button
                onClick={() => navigate('/')}
                className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Official GP Dashboard</span>
                <span className="sm:hidden">Official</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/villager')}
                className="flex items-center space-x-1.5 text-xs bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 px-3 py-1.5 rounded-lg border border-cyan-500/30 transition"
              >
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Citizen Mobile View</span>
                <span className="sm:hidden">Villager</span>
              </button>
            )}

            {/* Official User Profile / Sign In */}
            {user ? (
              <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
                <div className="hidden md:block text-right">
                  <div className="text-xs font-semibold text-slate-200">{user.name}</div>
                  <div className="text-[10px] text-cyan-400 capitalize">{user.role.replace('_', ' ')} • {user.gram_panchayat_name || 'GP'}</div>
                </div>
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : !isVillagerPortal ? (
              <Link
                to="/login"
                className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-3.5 py-1.5 rounded-lg shadow-sm transition"
              >
                Official Sign In
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
