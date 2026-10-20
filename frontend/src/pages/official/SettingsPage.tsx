import React, { useEffect, useState } from 'react';
import {
  Sliders,
  Save,
  Clock,
  Gauge,
  ShieldAlert,
  Users,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../lib/api';
import { ThresholdSettings } from '../../types';

export const SettingsPage: React.FC = () => {
  const [thresholds, setThresholds] = useState<ThresholdSettings | null>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states
  const [minFlow, setMinFlow] = useState(2.0);
  const [minPressure, setMinPressure] = useState(0.7);
  const [maxPressure, setMaxPressure] = useState(3.0);
  const [staleHours, setStaleHours] = useState(6);
  const [mStart, setMStart] = useState('06:00');
  const [mEnd, setMEnd] = useState('09:00');
  const [eStart, setEStart] = useState('17:30');
  const [eEnd, setEEnd] = useState('20:00');

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const [thRes, stRes] = await Promise.all([
        api.settings.getThresholds(),
        api.settings.getStaff(),
      ]);
      setThresholds(thRes);
      setStaff(stRes);

      setMinFlow(thRes.min_flow_lpm);
      setMinPressure(thRes.min_pressure_bar);
      setMaxPressure(thRes.max_pressure_bar);
      setStaleHours(thRes.stale_data_hours);
      setMStart(thRes.supply_window_start);
      setMEnd(thRes.supply_window_end);
      setEStart(thRes.evening_window_start);
      setEEnd(thRes.evening_window_end);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const updated = await api.settings.updateThresholds({
        min_flow_lpm: minFlow,
        min_pressure_bar: minPressure,
        max_pressure_bar: maxPressure,
        stale_data_hours: staleHours,
        supply_window_start: mStart,
        supply_window_end: mEnd,
        evening_window_start: eStart,
        evening_window_end: eEnd,
      });
      setThresholds(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      alert('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Loading Gram Panchayat configuration parameters...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-cyan-400" />
          <span>Local Thresholds & Supply Window Configuration</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure site-specific hydraulic thresholds and morning/evening supply schedules. All modifications are logged to the Panchayat Audit Trail.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Settings successfully updated and audited for Shirsuphal Gram Panchayat.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Supply Schedule Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Clock className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Scheduled Domestic Water Supply Windows</h2>
          </div>
          <p className="text-xs text-slate-400">
            The rule-based anomaly engine checks for zero-flow conditions only during these scheduled hours.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Morning window */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <span className="font-semibold text-slate-200">Morning Supply Window</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={mStart}
                    onChange={(e) => setMStart(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">End Time</label>
                  <input
                    type="time"
                    value={mEnd}
                    onChange={(e) => setMEnd(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Evening window */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <span className="font-semibold text-slate-200">Evening Supply Window</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={eStart}
                    onChange={(e) => setEStart(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">End Time</label>
                  <input
                    type="time"
                    value={eEnd}
                    onChange={(e) => setEEnd(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hydraulic Thresholds Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">Hydraulic Alert Thresholds</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Min Flow */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <label className="text-slate-300 font-semibold block">Minimum Flow (L/min)</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="20.0"
                value={minFlow}
                onChange={(e) => setMinFlow(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200"
              />
              <span className="text-[10px] text-slate-500">Triggers No-Flow Critical Alert</span>
            </div>

            {/* Min Pressure */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <label className="text-slate-300 font-semibold block">Minimum Pressure (bar)</label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="5.0"
                value={minPressure}
                onChange={(e) => setMinPressure(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200"
              />
              <span className="text-[10px] text-slate-500">Triggers Low Pressure Alert</span>
            </div>

            {/* Max Pressure */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <label className="text-slate-300 font-semibold block">Maximum Safe Pressure (bar)</label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="10.0"
                value={maxPressure}
                onChange={(e) => setMaxPressure(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200"
              />
              <span className="text-[10px] text-slate-500">Pipe surge / water hammer alert</span>
            </div>

            {/* Stale Hours */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <label className="text-slate-300 font-semibold block">Stale Data Limit (hours)</label>
              <input
                type="number"
                min="1"
                max="48"
                value={staleHours}
                onChange={(e) => setStaleHours(parseInt(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200"
              />
              <span className="text-[10px] text-slate-500">Marks meter telemetry as Offline</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-2 px-4 rounded-xl text-xs transition shadow-lg shadow-cyan-950 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Updating...' : 'Save Configuration Changes'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Staff directory card */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Users className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white">Gram Panchayat Operating Staff</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {staff.map((s) => (
            <div key={s.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="font-semibold text-slate-200">{s.name}</div>
              <div className="text-[11px] text-cyan-400 capitalize">{s.role.replace('_', ' ')}</div>
              <div className="text-[10px] text-slate-500">{s.email}</div>
              {s.phone && <div className="text-[10px] text-slate-400">{s.phone}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
