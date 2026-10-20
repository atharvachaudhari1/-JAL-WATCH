import React, { useEffect, useState } from 'react';
import {
  Landmark,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../lib/api';
import { IntegrationStatus } from '../../types';

export const IntegrationsPage: React.FC = () => {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    setIsLoading(true);
    try {
      const [stRes, logRes] = await Promise.all([
        api.integrations.getStatus(),
        api.integrations.getLogs(),
      ]);
      setStatus(stRes);
      setLogs(logRes);
    } catch (err) {
      console.error('Error fetching integration data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await api.integrations.triggerSync();
      setSyncMessage(res.message);
      fetchIntegrations();
    } catch (err: any) {
      setSyncMessage(err.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Landmark className="w-5 h-5 text-cyan-400" />
          <span>Government Integration Boundary (JJM IMIS & Sujal Gaon)</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          National and State water reporting interfaces. Per implementation standard, live API connections are disabled until verified government credentials are authorized.
        </p>
      </div>

      {syncMessage && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* IMIS Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-blue-500/10 text-cyan-400 border border-blue-500/20">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">National JJM IMIS Portal</h3>
                <p className="text-[11px] text-slate-400">Integrated Management Information System</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {status?.imis_status || 'UNCONFIGURED'}
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed">
            {status?.imis_message}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Sync Mode:</span>
              <span className="font-mono text-cyan-300">Official CSV Exchange (Fallback)</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Supported Export Formats:</span>
              <span className="text-slate-300">{status?.export_formats_supported.join(', ')}</span>
            </div>
          </div>

          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 rounded-xl border border-slate-700 transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Test IMIS API Handshake</span>
          </button>
        </div>

        {/* Sujal Gaon Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">State Sujal Gaon System</h3>
                <p className="text-[11px] text-slate-400">Maharashtra Water Supply Portal</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {status?.sujal_gaon_status || 'ONBOARDING'}
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed">
            {status?.sujal_gaon_message}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>LGD Village Code:</span>
              <span className="font-mono text-cyan-300">LGD-GP-187263</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>District Head:</span>
              <span className="text-slate-300">Zilla Parishad Pune</span>
            </div>
          </div>

          <button
            onClick={() => window.open(api.reports.getComplaintsCsvUrl(), '_blank')}
            className="w-full bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold py-2.5 rounded-xl transition flex items-center justify-center space-x-2"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Generate State Audit Bundle (CSV)</span>
          </button>
        </div>
      </div>

      {/* Sync Attempt Logs */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <Lock className="w-4 h-4 text-cyan-400" />
          <span>Integration Boundary Audit Trail</span>
        </h3>

        {logs.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 text-center">
            No integration sync attempts recorded.
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">
                    {l.system_name} • {l.record_type}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{l.last_error || 'Handshake logged'}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {l.status}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {new Date(l.last_attempt_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
