import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  BarChart3,
  Calendar,
  AlertTriangle,
  MessageSquareWarning,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { api } from '../../lib/api';

export const ReportsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const data = await api.reports.getMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleDownloadAlertsCsv = () => {
    window.open(`${api.reports.getAlertsCsvUrl()}?days=${days}`, '_blank');
  };

  const handleDownloadComplaintsCsv = () => {
    window.open(`${api.reports.getComplaintsCsvUrl()}?days=${days}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            <span>Panchayat Reports & JJM Compliance CSV Exports</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate auditable summary statistics and download verified CSV registers for JJM state compliance submission
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl border border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* CSV Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Alerts Export Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Rule Alerts Register (CSV)</h3>
                <p className="text-xs text-slate-400">All triggered water anomalies, reasons & resolution timestamps</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Includes Alert ID, Connection FHTC, Village Ward, Anomaly Type, Severity, Trigger Timestamps, and Assigned Official.
          </p>
          <button
            onClick={handleDownloadAlertsCsv}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-lg shadow-rose-950"
          >
            <Download className="w-4 h-4" />
            <span>Download Alerts CSV ({days} Days)</span>
          </button>
        </div>

        {/* Complaints Export Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <MessageSquareWarning className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Grievance Redressal Register (CSV)</h3>
                <p className="text-xs text-slate-400">Public ticket references, descriptions, timelines & field actions</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Includes Ticket Reference, Category, Citizen Description, Status Progression, Assigned Staff, and Final Resolution.
          </p>
          <button
            onClick={handleDownloadComplaintsCsv}
            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-lg shadow-amber-950"
          >
            <Download className="w-4 h-4" />
            <span>Download Complaints CSV ({days} Days)</span>
          </button>
        </div>
      </div>

      {/* Aggregate Visual Summaries */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Alerts Breakdown by Type */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-cyan-400" />
              <span>Historical Alerts by Rule Type</span>
            </h3>
            <div className="space-y-2 text-xs">
              {Object.entries(metrics.alerts_by_type || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="font-mono text-slate-300">{type}</span>
                  <span className="font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800">{count as number}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Complaints Breakdown by Category */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <MessageSquareWarning className="w-4 h-4 text-amber-400" />
              <span>Citizen Grievance Categories</span>
            </h3>
            <div className="space-y-2 text-xs">
              {Object.entries(metrics.complaints_by_category || {}).map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-300">{cat}</span>
                  <span className="font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-950 border border-amber-800">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
