import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplet, Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { User } from '../../types';

interface LoginProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await api.auth.login(email, password);
      onLoginSuccess(res.user, res.access_token);
      navigate('/');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Login failed. Please verify your credentials or server connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAccount = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      {/* Background ambient water glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/25">
            <Droplet className="w-8 h-8 text-white fill-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Gram Panchayat JalWatch Portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Ministry of Jal Shakti • National Jal Jeevan Mission (SIH 2026 PS 26255)
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start space-x-2">
                <span className="font-bold">•</span>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Official Government Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarpanch@shirsuphal.gp.gov.in"
                  className="block w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center space-x-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 transition shadow-lg shadow-cyan-600/20 disabled:opacity-50"
            >
              {isLoading ? (
                <span>Authenticating with GP Server...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Auto-Fill */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center space-x-1.5">
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>One-Click Demo Accounts (Seeded)</span>
            </div>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => fillDemoAccount('sarpanch@shirsuphal.gp.gov.in', 'Official@123')}
                className="w-full text-left text-xs bg-slate-950 hover:bg-slate-800/80 p-2 rounded-lg border border-slate-800 text-slate-300 flex items-center justify-between group transition"
              >
                <div>
                  <span className="font-semibold text-cyan-300">Aarti Kadam</span>
                  <span className="text-slate-500 ml-1.5">(Gram Sevak / Official)</span>
                </div>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 group-hover:text-white">Auto-fill</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('admin@jalwatch.gov.in', 'Admin@123')}
                className="w-full text-left text-xs bg-slate-950 hover:bg-slate-800/80 p-2 rounded-lg border border-slate-800 text-slate-300 flex items-center justify-between group transition"
              >
                <div>
                  <span className="font-semibold text-purple-300">Sunil Deshmukh</span>
                  <span className="text-slate-500 ml-1.5">(System Admin)</span>
                </div>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 group-hover:text-white">Auto-fill</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('field.ramesh@shirsuphal.gp.gov.in', 'Field@123')}
                className="w-full text-left text-xs bg-slate-950 hover:bg-slate-800/80 p-2 rounded-lg border border-slate-800 text-slate-300 flex items-center justify-between group transition"
              >
                <div>
                  <span className="font-semibold text-emerald-300">Ramesh Jadhav</span>
                  <span className="text-slate-500 ml-1.5">(Jal Karmi / Plumber)</span>
                </div>
                <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 group-hover:text-white">Auto-fill</span>
              </button>
            </div>
          </div>
        </div>

        {/* Link to villager portal */}
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/villager')}
            className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
          >
            Looking to report a water issue as a citizen? Open Villager Portal →
          </button>
        </div>
      </div>
    </div>
  );
};
