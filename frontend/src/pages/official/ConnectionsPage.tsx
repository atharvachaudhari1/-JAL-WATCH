import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Waves, Search, Filter, RefreshCw, AlertCircle, ArrowUpRight } from 'lucide-react';
import { api } from '../../lib/api';
import { ConnectionListItem } from '../../types';

export const ConnectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<ConnectionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [hasDeviceFilter, setHasDeviceFilter] = useState<string>('all');

  const fetchConnections = async () => {
    setIsLoading(true);
    try {
      const data = await api.connections.list({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        village: villageFilter || undefined,
        has_device:
          hasDeviceFilter === 'yes'
            ? true
            : hasDeviceFilter === 'no'
            ? false
            : undefined,
      });
      setConnections(data);
    } catch (err) {
      console.error('Failed to load connections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, [statusFilter, villageFilter, hasDeviceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchConnections();
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Waves className="w-5 h-5 text-cyan-400" />
            <span>Functional Household Tap Connections (FHTC Registry)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registered village tap connections, hardware pairings, live telemetry head & operational states
          </p>
        </div>
        <button
          onClick={fetchConnections}
          className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl border border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Connection ID (e.g. MH-PUN-SHIR-001) or Household..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">All Statuses</option>
              <option value="Normal">Normal</option>
              <option value="Attention">Attention</option>
              <option value="Critical">Critical</option>
              <option value="Offline">Offline</option>
              <option value="Unknown">Unknown</option>
            </select>

            {/* Village Filter */}
            <select
              value={villageFilter}
              onChange={(e) => setVillageFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">All Wards</option>
              <option value="Ward 1">Ward 1 (Gaothan)</option>
              <option value="Ward 2">Ward 2 (Vikas Nagar)</option>
              <option value="Ward 3">Ward 3 (Bhim Nagar)</option>
              <option value="Ward 4">Ward 4 (Malshiras Road)</option>
            </select>

            {/* Has Device Filter */}
            <select
              value={hasDeviceFilter}
              onChange={(e) => setHasDeviceFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Connections</option>
              <option value="yes">With IoT Meter</option>
              <option value="no">Unmonitored Tap</option>
            </select>

            <button
              type="submit"
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow transition"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Connections Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading tap registry...</div>
        ) : connections.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 space-y-1">
            <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="font-semibold text-slate-300">No tap connections match the selected filters.</p>
            <p>Try resetting filters or searching with another keyword.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">FHTC ID</th>
                  <th className="py-3 px-4">Village Ward & Household</th>
                  <th className="py-3 px-4">Paired Device</th>
                  <th className="py-3 px-4">Latest Flow</th>
                  <th className="py-3 px-4">Latest Pressure</th>
                  <th className="py-3 px-4">Last Sync</th>
                  <th className="py-3 px-4">Computed State</th>
                  <th className="py-3 px-4">Alerts</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {connections.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/connections/${c.id}`)}
                    className="hover:bg-slate-800/40 cursor-pointer transition group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">
                      {c.fhtc_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">{c.village_or_ward}</div>
                      <div className="text-[10px] text-slate-500">{c.household_reference}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.device_code ? (
                        <span className="font-mono text-[11px] text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {c.device_code}
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">No device</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {c.latest_flow !== null && c.latest_flow !== undefined ? (
                        <span className="text-slate-200">{c.latest_flow.toFixed(1)} L/min</span>
                      ) : (
                        <span className="text-slate-600">--</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {c.latest_pressure !== null && c.latest_pressure !== undefined ? (
                        <span className="text-slate-200">{c.latest_pressure.toFixed(2)} bar</span>
                      ) : (
                        <span className="text-slate-600">--</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {c.last_reading_time ? (
                        <span>{new Date(c.last_reading_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      ) : (
                        <span className="text-slate-600">Never</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(c.computed_status)}`}>
                        {c.computed_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.open_alerts_count > 0 ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                          {c.open_alerts_count} active
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[10px]">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-cyan-400 group-hover:text-cyan-300 font-semibold flex items-center justify-end space-x-1">
                        <span>Details</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
