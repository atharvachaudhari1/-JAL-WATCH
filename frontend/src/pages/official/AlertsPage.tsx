import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  X,
} from 'lucide-react';
import { api } from '../../lib/api';
import { AlertItem } from '../../types';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  // Modals
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [actionType, setActionType] = useState<'assign' | 'resolve' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const [alertData, staffData] = await Promise.all([
        api.alerts.list({
          status: statusFilter || undefined,
          severity: severityFilter || undefined,
        }),
        api.settings.getStaff(),
      ]);
      setAlerts(alertData);
      setStaff(staffData);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, severityFilter]);

  const handleAcknowledge = async (id: string) => {
    try {
      await api.alerts.acknowledge(id, 'Acknowledged by official in triage');
      fetchAlerts();
    } catch (err) {
      alert('Failed to acknowledge alert');
    }
  };

  const handleAssign = async () => {
    if (!selectedAlert || !assigneeId) return;
    setIsSubmitting(true);
    try {
      await api.alerts.assign(selectedAlert.id, assigneeId);
      setActionType(null);
      setSelectedAlert(null);
      fetchAlerts();
    } catch (err) {
      alert('Failed to assign alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedAlert || !resolutionNote) return;
    setIsSubmitting(true);
    try {
      await api.alerts.resolve(selectedAlert.id, resolutionNote);
      setActionType(null);
      setSelectedAlert(null);
      setResolutionNote('');
      fetchAlerts();
    } catch (err) {
      alert('Failed to resolve alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'ATTENTION':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <span>Rule-Based Anomaly & Telemetry Alerts</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated alerts triggered by supply-window no-flow rules, low pressure thresholds, and sensor validation
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl border border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="ATTENTION">Attention</option>
            <option value="INFO">Info</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Showing <span className="text-cyan-400 font-bold">{alerts.length}</span> alert records
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading alerts triage...</div>
        ) : alerts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-xs text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            No alerts match the selected status or severity filter.
          </div>
        ) : (
          alerts.map((al) => (
            <div
              key={al.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl shadow-sm transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getSeverityBadge(al.severity)}`}>
                    {al.severity}
                  </span>
                  <span className="font-mono text-xs font-bold text-cyan-400">{al.fhtc_id}</span>
                  <span className="text-xs text-slate-400">• {al.village_or_ward}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-500">Triggered:</span>
                  <span className="text-slate-300 font-mono">
                    {new Date(al.triggered_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="capitalize font-semibold text-cyan-300">{al.status}</span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">{al.title}</h3>
                <p className="text-xs text-slate-300 mt-1">{al.reason}</p>
              </div>

              {/* Evidence details */}
              {al.evidence && Object.keys(al.evidence).length > 0 && (
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex flex-wrap gap-4 font-mono">
                  {Object.entries(al.evidence).map(([k, v]) => (
                    <span key={k}>
                      <span className="text-slate-500">{k}:</span>{' '}
                      <span className="text-cyan-300">{String(v)}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Resolution Note if resolved */}
              {al.resolution_note && (
                <div className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-900 p-2 rounded-xl">
                  <strong>Resolution:</strong> {al.resolution_note}
                </div>
              )}

              {/* Actions Toolbar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div className="text-xs text-slate-400">
                  {al.assignee_name ? (
                    <span>Assigned to: <strong className="text-slate-200">{al.assignee_name}</strong></span>
                  ) : (
                    <span className="text-slate-500 italic">Unassigned</span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {al.status === 'open' && (
                    <button
                      onClick={() => handleAcknowledge(al.id)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                    >
                      Acknowledge
                    </button>
                  )}

                  {al.status !== 'resolved' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedAlert(al);
                          setActionType('assign');
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition flex items-center space-x-1"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>Assign</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedAlert(al);
                          setActionType('resolve');
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition flex items-center space-x-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Resolve</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Modal (Assign or Resolve) */}
      {actionType && selectedAlert && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {actionType === 'assign' ? 'Assign Alert to Field Worker' : 'Resolve Alert'}
              </h3>
              <button
                onClick={() => {
                  setActionType(null);
                  setSelectedAlert(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="font-semibold text-cyan-300">{selectedAlert.title}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{selectedAlert.fhtc_id} • {selectedAlert.village_or_ward}</div>
            </div>

            {actionType === 'assign' ? (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">Select Field Staff / Plumber</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200"
                >
                  <option value="">-- Choose Staff --</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">Resolution Details / Action Taken</label>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Cleared blocked branch sluice valve; verified continuous 3.6 L/min flow restored."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500"
                />
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  setActionType(null);
                  setSelectedAlert(null);
                }}
                className="px-3 py-1.5 rounded-xl text-xs bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={actionType === 'assign' ? handleAssign : handleResolve}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
