import React, { useEffect, useState } from 'react';
import {
  MessageSquareWarning,
  UserPlus,
  Send,
  CheckCircle2,
  Lock,
  Globe,
  Clock,
  RefreshCw,
  Search,
  Filter,
  X,
  FileText,
  User,
} from 'lucide-react';
import { api } from '../../lib/api';
import { OfficialComplaintListItem, OfficialComplaintDetail } from '../../types';

export const ComplaintsPage: React.FC = () => {
  const [complaints, setComplaints] = useState<OfficialComplaintListItem[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Selected complaint detail drawer
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OfficialComplaintDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Workflow update inputs
  const [assigneeId, setAssigneeId] = useState('');
  const [assignNote, setAssignNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [publicMessage, setPublicMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      const [compData, staffData] = await Promise.all([
        api.complaints.list({
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
        }),
        api.settings.getStaff(),
      ]);
      setComplaints(compData);
      setStaff(staffData);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, categoryFilter]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setIsLoadingDetail(true);
    try {
      const data = await api.complaints.getDetail(id);
      setDetail(data);
      setNewStatus(data.status);
      setPublicMessage(data.public_status_message || '');
      setInternalNote(data.internal_notes || '');
      setAssigneeId(data.assigned_to || '');
    } catch (err) {
      console.error('Failed to load complaint detail:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleAssign = async () => {
    if (!detail || !assigneeId) return;
    setIsUpdating(true);
    try {
      await api.complaints.assign(detail.id, assigneeId, assignNote);
      await openDetail(detail.id);
      fetchComplaints();
      setAssignNote('');
    } catch (err) {
      alert('Failed to assign complaint');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!detail) return;
    setIsUpdating(true);
    try {
      await api.complaints.updateStatus(
        detail.id,
        newStatus,
        publicMessage || undefined,
        internalNote || undefined
      );
      await openDetail(detail.id);
      fetchComplaints();
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'assigned':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'in_progress':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'resolved':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <MessageSquareWarning className="w-5 h-5 text-amber-400" />
            <span>Citizen Grievance Redressal & Triage</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track and resolve villager water supply issues with clear separation between public updates and internal staff notes
          </p>
        </div>
        <button
          onClick={fetchComplaints}
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
            <option value="submitted">Submitted (New)</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300"
          >
            <option value="">All Categories</option>
            <option value="no_water">No Water Supply</option>
            <option value="low_pressure">Low Water Pressure</option>
            <option value="intermittent">Intermittent Supply</option>
            <option value="quality">Water Quality Issue</option>
            <option value="leakage">Visible Leakage</option>
            <option value="damaged_pipe">Damaged Pipe / Tap</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Total Grievances: <span className="text-cyan-400 font-bold">{complaints.length}</span>
        </div>
      </div>

      {/* Main Grid: List + Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Complaints Table (Left) */}
        <div className={`${selectedId ? 'lg:col-span-6' : 'lg:col-span-12'} transition-all duration-200 space-y-3`}>
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading complaints list...</div>
          ) : complaints.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center text-xs text-slate-400">
              No citizen grievances found matching current filters.
            </div>
          ) : (
            <div className="space-y-2.5">
              {complaints.map((c) => (
                <div
                  key={c.id}
                  onClick={() => openDetail(c.id)}
                  className={`bg-slate-900 border p-4 rounded-2xl cursor-pointer transition shadow-sm ${
                    selectedId === c.id
                      ? 'border-cyan-500 bg-slate-900/90 ring-1 ring-cyan-500/30'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-amber-400">{c.public_reference}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(c.status)}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-xs font-semibold text-slate-200">{c.category_label}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.description}</p>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{c.fhtc_id ? `${c.fhtc_id} • ${c.village_or_ward}` : 'Unlinked Connection'}</span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Complaint Detail Drawer (Right) */}
        {selectedId && (
          <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5 sticky top-24 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono font-bold text-amber-400">{detail?.public_reference}</span>
                <h2 className="text-base font-bold text-white">{detail?.category_label}</h2>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingDetail || !detail ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading grievance details...</div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300">
                  <div>
                    <span className="text-slate-500 block">Connection ID:</span>
                    <strong className="font-mono text-cyan-300">{detail.fhtc_id || 'Unlinked'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Ward / Household:</span>
                    <strong>{detail.village_or_ward || 'Shirsuphal'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Resident Name:</span>
                    <strong>{detail.private_contact_name || 'Anonymous Citizen'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Contact Phone:</span>
                    <strong>{detail.private_contact_phone || 'None provided'}</strong>
                  </div>
                </div>

                {/* Citizen description */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Citizen Complaint Statement
                  </label>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {detail.description}
                  </div>
                </div>

                {/* Optional Photo Attachment */}
                {detail.photo_url && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Uploaded Site Photo
                    </label>
                    <a href={detail.photo_url} target="_blank" rel="noreferrer">
                      <img
                        src={detail.photo_url}
                        alt="Complaint Attachment"
                        className="w-full h-40 object-cover rounded-xl border border-slate-800 hover:opacity-90 transition"
                      />
                    </a>
                  </div>
                )}

                {/* Workflow Action 1: Assign to Technician */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center space-x-1.5 font-bold text-slate-200">
                    <UserPlus className="w-4 h-4 text-cyan-400" />
                    <span>Assign Field Technician</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-200"
                    >
                      <option value="">-- Choose Field Worker --</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssign}
                      disabled={isUpdating || !assigneeId}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-3 rounded-xl transition disabled:opacity-50"
                    >
                      {isUpdating ? 'Assigning...' : 'Assign Staff'}
                    </button>
                  </div>
                </div>

                {/* Workflow Action 2: Update Status & Messages */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Status & Response Messages</span>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-cyan-300 font-bold"
                    >
                      <option value="submitted">Submitted</option>
                      <option value="acknowledged">Acknowledged</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="duplicate">Duplicate</option>
                    </select>
                  </div>

                  {/* Public Message */}
                  <div>
                    <label className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-400 mb-1">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Public Status Message (Visible to Citizen in Villager Portal)</span>
                    </label>
                    <input
                      type="text"
                      value={publicMessage}
                      onChange={(e) => setPublicMessage(e.target.value)}
                      placeholder="e.g. Technician arrived on site to repair leaking joint."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-200 placeholder-slate-500"
                    />
                  </div>

                  {/* Internal Staff Notes */}
                  <div>
                    <label className="flex items-center space-x-1 text-[11px] font-semibold text-amber-400 mb-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Internal GP Notes (Confidential --- Hidden from Resident)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      placeholder="e.g. Check valve #4 on Ward 2 manifold line."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-slate-200 placeholder-slate-500"
                    />
                  </div>

                  <button
                    onClick={handleStatusUpdate}
                    disabled={isUpdating}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl transition shadow disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving Update...' : 'Commit Status & Send Public Update'}
                  </button>
                </div>

                {/* Status Timeline */}
                <div>
                  <h4 className="text-xs font-bold text-white mb-2 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Audit Event Timeline</span>
                  </h4>
                  <div className="space-y-2">
                    {detail.events.map((ev) => (
                      <div key={ev.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                        <div className="flex justify-between text-slate-400 font-medium">
                          <span>{ev.actor_name}</span>
                          <span>{new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {ev.public_message && (
                          <div className="text-emerald-300">
                            <strong>Public:</strong> {ev.public_message}
                          </div>
                        )}
                        {ev.internal_note && (
                          <div className="text-amber-300">
                            <strong>Internal:</strong> {ev.internal_note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
