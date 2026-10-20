import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Waves,
  AlertTriangle,
  MessageSquareWarning,
  CheckCircle2,
  Activity,
  ArrowUpRight,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  Cpu,
  Zap,
  Gauge,
  Radio,
} from 'lucide-react';
import { api } from '../../lib/api';
import { DashboardSummary, ConnectionListItem, AlertItem, OfficialComplaintListItem } from '../../types';

// ── HH001 Live Hardware Status Card ──────────────────────────────────────────
interface HH001Status {
  household_id: string;
  flow_rate: number;
  status: string;
  adc: number;
  supply_expected: boolean;
  pressure_bar?: number;
  fhtc_id?: string;
  computed_status?: string;
  timestamp?: string;
}

const HH001LiveCard: React.FC<{ onSendReading: () => void; data: HH001Status | null; sending: boolean }> = ({ onSendReading, data, sending }) => {
  const isFunc = data?.status === 'FUNCTIONAL';
  return (
    <div className="bg-slate-900 border border-cyan-800/60 rounded-2xl p-5 shadow-lg relative overflow-hidden">
      {/* Glow accent */}
      <div className="absolute -top-6 -right-6 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isFunc ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          <span className="text-xs font-bold text-cyan-300 tracking-widest uppercase">HH001 • Live Hardware</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
          isFunc
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
        }`}>
          {data?.status ?? 'AWAITING'}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {/* Flow Rate */}
        <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 col-span-2">
          <div className="flex items-center space-x-1.5 text-slate-400 mb-1">
            <Waves className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-medium">Flow Rate</span>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {data?.flow_rate?.toFixed(2) ?? '--'}
            <span className="text-xs font-normal text-slate-400 ml-1">L/min</span>
          </div>
        </div>

        {/* Pressure */}
        <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center space-x-1 text-slate-400 mb-1">
            <Gauge className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-medium">Pressure</span>
          </div>
          <div className="text-lg font-bold text-blue-300 font-mono">
            {data?.pressure_bar?.toFixed(1) ?? '--'}
            <span className="text-[10px] font-normal text-slate-400 ml-1">bar</span>
          </div>
        </div>

        {/* ADC */}
        <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center space-x-1 text-slate-400 mb-1">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] font-medium">ADC</span>
          </div>
          <div className="text-lg font-bold text-purple-300 font-mono">
            {data?.adc ?? '--'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <span className="flex items-center space-x-1">
            <Radio className="w-3 h-3 text-cyan-400" />
            <span>Supply: <span className={data?.supply_expected ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>{data?.supply_expected ? 'Active' : 'Off'}</span></span>
          </span>
          <span className="flex items-center space-x-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="font-mono text-[10px] text-slate-500">{data?.fhtc_id ?? 'MH-PUN-SHIR-001'}</span>
          </span>
        </div>
        <button
          onClick={onSendReading}
          disabled={sending}
          className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${sending ? 'animate-spin' : ''}`} />
          <span>{sending ? 'Sending...' : 'Push Reading'}</span>
        </button>
      </div>

      {data?.timestamp && (
        <div className="mt-2 text-[10px] text-slate-600 text-right">
          Last sync: {new Date(data.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

export const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [connections, setConnections] = useState<ConnectionListItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [complaints, setComplaints] = useState<OfficialComplaintListItem[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ── HH001 hardware device state ──────────────────────────────────────────
  const [hh001, setHh001] = useState<HH001Status | null>({
    household_id: 'HH001',
    flow_rate: 6.00,
    status: 'FUNCTIONAL',
    adc: 4095,
    supply_expected: true,
    pressure_bar: 5.0,
    fhtc_id: 'MH-PUN-SHIR-001',
    computed_status: 'FUNCTIONAL',
  });
  const [hh001Sending, setHh001Sending] = useState(false);

  const pushHH001Reading = async () => {
    setHh001Sending(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
      const res = await fetch(`${API_BASE}/ingest/hardware`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_id: 'HH001',
          flow_rate: 6.00,
          status: 'FUNCTIONAL',
          adc: 4095,
          supply_expected: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setHh001({
          household_id: data.household_id,
          flow_rate: data.flow_rate,
          status: data.device_status,
          adc: data.adc_raw ?? 4095,
          supply_expected: data.supply_expected,
          pressure_bar: data.pressure_bar,
          fhtc_id: data.fhtc_id,
          computed_status: data.computed_status,
          timestamp: data.timestamp,
        });
      }
    } catch (e) {
      console.error('HH001 push failed:', e);
    } finally {
      setHh001Sending(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sumRes, connRes, alertRes, compRes, actRes] = await Promise.all([
        api.dashboard.getSummary(),
        api.connections.list({ limit: 8 }),
        api.alerts.list({ status: 'open' }),
        api.complaints.list({ status: 'submitted' }),
        api.dashboard.getActivity(6),
      ]);
      setSummary(sumRes);
      setConnections(connRes);
      setAlerts(alertRes.slice(0, 5));
      setComplaints(compRes.slice(0, 5));
      setActivity(actRes);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Normal':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Attention':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'Critical':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Offline':
        return 'bg-slate-700/30 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getFreshnessBadge = (freshness?: string) => {
    switch (freshness) {
      case 'FRESH':
        return { text: 'Optimal (Fresh Telemetry)', color: 'text-emerald-400 bg-emerald-950 border-emerald-800' };
      case 'SOME_STALE':
        return { text: 'Telemetry Delay Detected', color: 'text-amber-400 bg-amber-950 border-amber-800' };
      default:
        return { text: 'Gateway Offline', color: 'text-rose-400 bg-rose-950 border-rose-800' };
    }
  };

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
          <p className="text-sm">Loading Gram Panchayat telemetry & service records...</p>
        </div>
      </div>
    );
  }

  const freshnessInfo = getFreshnessBadge(summary?.data_freshness_status);

  return (
    <div className="space-y-6">
      {/* Title & Freshness Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              {summary?.gram_panchayat_name || 'Shirsuphal Gram Panchayat'}
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold border bg-cyan-950 text-cyan-300 border-cyan-800">
              {summary?.district}, {summary?.state}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-Time FHTC Water Supply Monitoring & Citizen Feedback Engine
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className={`text-xs px-3 py-1.5 rounded-xl border flex items-center space-x-2 ${freshnessInfo.color}`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
            <span className="font-medium">{freshnessInfo.text}</span>
          </div>
          <button
            onClick={loadData}
            title="Refresh Live Data"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* HH001 Live Hardware Device Card */}
      <HH001LiveCard
        data={hh001}
        onSendReading={pushHH001Reading}
        sending={hh001Sending}
      />

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total FHTCs */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Registered FHTCs</span>
            <Waves className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{summary?.total_connections ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary?.active_devices ?? 0} active IoT meters paired
          </div>
        </div>

        {/* Connections with Recent Data */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Telemetry</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {summary?.connections_with_recent_data ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Readings within last 6 hours
          </div>
        </div>

        {/* Active Alerts */}
        <div
          onClick={() => navigate('/alerts')}
          className="bg-slate-900 border border-slate-800 p-4 rounded-2xl cursor-pointer hover:border-rose-500/40 transition group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{summary?.active_alerts ?? 0}</div>
          <div className="text-[11px] text-rose-300/80 mt-1">
            {summary?.critical_alerts ?? 0} critical priority
          </div>
        </div>

        {/* Open Grievances */}
        <div
          onClick={() => navigate('/complaints')}
          className="bg-slate-900 border border-slate-800 p-4 rounded-2xl cursor-pointer hover:border-amber-500/40 transition group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Open Complaints</span>
            <MessageSquareWarning className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{summary?.open_complaints ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting resolution</div>
        </div>

        {/* Resolved (30d) */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Resolved (30d)</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400">
            {summary?.resolved_complaints_period ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Citizen feedback verified</div>
        </div>
      </div>

      {/* Main Grid: Connections Health Table & Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Connection Health Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Tap Connection Health</h2>
              <p className="text-xs text-slate-400">Telemetry status based on recent flow rate, pressure, and scheduled supply</p>
            </div>
            <button
              onClick={() => navigate('/connections')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Connection ID</th>
                  <th className="py-2.5 px-3">Ward / Household</th>
                  <th className="py-2.5 px-3">Flow</th>
                  <th className="py-2.5 px-3">Pressure</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {connections.map((conn) => (
                  <tr
                    key={conn.id}
                    onClick={() => navigate(`/connections/${conn.id}`)}
                    className="hover:bg-slate-800/40 cursor-pointer transition"
                  >
                    <td className="py-3 px-3 font-mono font-semibold text-cyan-300">
                      {conn.fhtc_id}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <div>{conn.village_or_ward}</div>
                      <div className="text-[10px] text-slate-500">{conn.household_reference}</div>
                    </td>
                    <td className="py-3 px-3">
                      {conn.latest_flow !== null && conn.latest_flow !== undefined ? (
                        <span className="font-mono text-slate-200">{conn.latest_flow.toFixed(1)} L/min</span>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {conn.latest_pressure !== null && conn.latest_pressure !== undefined ? (
                        <span className="font-mono text-slate-200">{conn.latest_pressure.toFixed(2)} bar</span>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(conn.computed_status)}`}>
                        {conn.computed_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-cyan-400 hover:text-cyan-300 text-xs font-medium">Inspect →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Active Alerts & Recent Complaints */}
        <div className="space-y-6">
          {/* Active Alerts Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-white">Active Rule Alerts</h3>
              </div>
              <button
                onClick={() => navigate('/alerts')}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                All Alerts ({alerts.length})
              </button>
            </div>

            {alerts.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                No active rule alerts currently flagged.
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((al) => (
                  <div
                    key={al.id}
                    onClick={() => navigate(`/alerts`)}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-200 truncate pr-2">{al.title}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {al.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{al.reason}</p>
                    <div className="mt-1.5 text-[10px] text-slate-500 flex items-center justify-between">
                      <span>{al.fhtc_id} • {al.village_or_ward}</span>
                      <span>{new Date(al.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Grievances Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageSquareWarning className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Citizen Grievances</h3>
              </div>
              <button
                onClick={() => navigate('/complaints')}
                className="text-[11px] text-cyan-400 hover:underline"
              >
                Triage ({complaints.length})
              </button>
            </div>

            {complaints.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
                No new unassigned grievances pending.
              </div>
            ) : (
              <div className="space-y-2">
                {complaints.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/complaints`)}
                    className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-bold text-amber-400">{c.public_reference}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{c.category_label}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 line-clamp-2">{c.description}</p>
                    <div className="mt-1.5 text-[10px] text-slate-500">
                      <span>{c.village_or_ward || 'Shirsuphal'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Panchayat Audit Activity</span>
            </h3>
            <div className="space-y-2 text-xs">
              {activity.map((act) => (
                <div key={act.id} className="p-2 rounded-lg bg-slate-950 border border-slate-800/60">
                  <div className="font-semibold text-slate-300">{act.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{act.description}</div>
                  <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                    <span>{act.actor}</span>
                    <span>{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
