import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Waves,
  ArrowLeft,
  Activity,
  AlertTriangle,
  MessageSquareWarning,
  Clock,
  Battery,
  Cpu,
  Calendar,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '../../lib/api';
import { ConnectionDetailResponse, ReadingPoint } from '../../types';

export const ConnectionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ConnectionDetailResponse | null>(null);
  const [readings, setReadings] = useState<ReadingPoint[]>([]);
  const [selectedHours, setSelectedHours] = useState(24);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const [connRes, readRes] = await Promise.all([
          api.connections.getDetail(id),
          api.connections.getReadings(id, selectedHours),
        ]);
        setDetail(connRes);
        setReadings(readRes);
      } catch (err) {
        console.error('Error fetching connection detail:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [id, selectedHours]);

  if (isLoading || !detail) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Loading connection metrics and time-series telemetry...
      </div>
    );
  }

  // Format chart data
  const chartData = readings.map((r) => ({
    time: new Date(r.observed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    flow: r.flow_rate !== null && r.flow_rate !== undefined ? r.flow_rate : null,
    pressure: r.pressure !== null && r.pressure !== undefined ? r.pressure : null,
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Normal':
        return 'text-emerald-400 bg-emerald-950 border-emerald-800';
      case 'Attention':
        return 'text-amber-400 bg-amber-950 border-amber-800';
      case 'Critical':
        return 'text-rose-400 bg-rose-950 border-rose-800';
      case 'Offline':
        return 'text-slate-400 bg-slate-900 border-slate-700';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/connections')}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold font-mono text-cyan-400 tracking-tight">
                {detail.fhtc_id}
              </h1>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getStatusColor(detail.computed_status)}`}>
                {detail.computed_status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {detail.village_or_ward} • {detail.household_reference}
            </p>
          </div>
        </div>

        {/* Diagnostic Rationale Pill */}
        <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-300 max-w-md">
          <span className="font-semibold text-cyan-300">Status Reason: </span>
          <span>{detail.status_reason}</span>
        </div>
      </div>

      {/* Distinction Banner per Specification */}
      <div className="bg-blue-950/30 border border-blue-900/50 p-3 rounded-xl text-xs text-slate-300 flex items-start space-x-2">
        <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-cyan-300">Telemetry Distinction Standard: </span>
          <span className="text-slate-400">
            JalWatch rigorously distinguishes between <strong>Zero Flow</strong> (sensor measured 0.0 L/min during pressure), <strong>Missing Data</strong> (no transmission within window), and <strong>Sensor Fault</strong> (voltage/signal out of bounds).
          </span>
        </div>
      </div>

      {/* Latest Telemetry Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Flow Rate */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-slate-400 text-xs mb-1">Terminal Flow Rate</div>
          <div className="text-2xl font-mono font-bold text-white">
            {detail.latest_flow !== null && detail.latest_flow !== undefined ? (
              <>{detail.latest_flow.toFixed(1)} <span className="text-sm font-normal text-slate-400">L/min</span></>
            ) : (
              <span className="text-slate-600">No Data</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Target: &ge; 2.0 L/min</div>
        </div>

        {/* Terminal Pressure */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-slate-400 text-xs mb-1">Terminal Pressure Head</div>
          <div className="text-2xl font-mono font-bold text-white">
            {detail.latest_pressure !== null && detail.latest_pressure !== undefined ? (
              <>{detail.latest_pressure.toFixed(2)} <span className="text-sm font-normal text-slate-400">bar</span></>
            ) : (
              <span className="text-slate-600">No Data</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Acceptable: 0.70 - 3.00 bar</div>
        </div>

        {/* Data Freshness */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-slate-400 text-xs mb-1">Data Freshness</div>
          <div className="text-2xl font-mono font-bold text-cyan-400">
            {detail.data_freshness_minutes !== null && detail.data_freshness_minutes !== undefined ? (
              <>{detail.data_freshness_minutes} <span className="text-sm font-normal text-slate-400">min ago</span></>
            ) : (
              <span className="text-slate-600">--</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Last seen: {detail.last_reading_time ? new Date(detail.last_reading_time).toLocaleTimeString() : 'N/A'}
          </div>
        </div>

        {/* Paired Device Health */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-slate-400 text-xs mb-1">IoT Node Health</div>
          <div className="text-sm font-bold text-white flex items-center space-x-1.5 mt-1">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>{detail.device_code || 'Unmonitored'}</span>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-2">
            <span className="flex items-center space-x-1">
              <Battery className="w-3.5 h-3.5 text-emerald-400" />
              <span>{detail.battery_level ? `${detail.battery_level}%` : 'N/A'}</span>
            </span>
            <span>•</span>
            <span className="capitalize">{detail.device_health || 'Unknown'}</span>
          </div>
        </div>
      </div>

      {/* Recharts Flow & Pressure Graph */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Telemetry Trends (Flow Rate & Water Pressure)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuously logged time-series readings against configured supply windows
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {[12, 24, 48].map((h) => (
              <button
                key={h}
                onClick={() => setSelectedHours(h)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                  selectedHours === h
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-slate-500">
            No readings recorded within the selected period.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="flowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pressGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis yAxisId="left" stroke="#06b6d4" fontSize={11} unit=" L/m" />
                <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={11} unit=" bar" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="flow"
                  name="Flow Rate (L/min)"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#flowGrad)"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="pressure"
                  name="Pressure (bar)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#pressGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Bottom Grid: Alerts & Complaints linked to this connection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Linked Alerts */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Connection Alerts ({detail.open_alerts.length})</span>
            </h3>
          </div>

          {detail.open_alerts.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 text-center">
              No active alerts for this connection.
            </div>
          ) : (
            <div className="space-y-2">
              {detail.open_alerts.map((al) => (
                <div key={al.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between font-semibold text-slate-200">
                    <span>{al.title}</span>
                    <span className="text-[10px] text-rose-400">{al.severity}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{al.reason}</p>
                  <div className="text-[10px] text-slate-500 pt-1">
                    Triggered: {new Date(al.triggered_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Linked Complaints */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <MessageSquareWarning className="w-4 h-4 text-amber-400" />
              <span>Grievances for this Tap ({detail.recent_complaints.length})</span>
            </h3>
          </div>

          {detail.recent_complaints.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 text-center">
              No recent grievances registered for this connection.
            </div>
          ) : (
            <div className="space-y-2">
              {detail.recent_complaints.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-mono font-bold text-amber-400">{c.public_reference}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{c.status}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">{c.description}</p>
                  <div className="text-[10px] text-slate-500 pt-1">
                    Filed: {new Date(c.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
