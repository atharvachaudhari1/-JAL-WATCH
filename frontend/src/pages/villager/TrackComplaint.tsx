import React, { useState, useEffect } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Send,
  Droplet,
  ShieldCheck,
  User,
} from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { PublicComplaintTracking } from '../../types';
import { translations } from '../../lib/translations';

export const TrackComplaint: React.FC = () => {
  const location = useLocation();
  const { lang, t } = useOutletContext<{ lang: 'mr' | 'en'; t: typeof translations['en'] }>();

  // Extract ref from URL params if available e.g. /villager/track?ref=JW-2026-000101
  const queryParams = new URLSearchParams(location.search);
  const initialRef = queryParams.get('ref') || '';

  const [reference, setReference] = useState(initialRef);
  const [phone, setPhone] = useState('');
  const [complaint, setComplaint] = useState<PublicComplaintTracking | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Follow-up message
  const [followUpMsg, setFollowUpMsg] = useState('');
  const [isSendingFollowUp, setIsSendingFollowUp] = useState(false);
  const [followUpSuccess, setFollowUpSuccess] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!reference.trim()) return;

    setIsLoading(true);
    setError(null);
    setFollowUpSuccess(false);

    try {
      const data = await api.publicComplaints.track(reference.trim(), phone.trim() || undefined);
      setComplaint(data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(lang === 'mr' ? 'तक्रार सापडली नाही. संदर्भ क्रमांक तपासा.' : 'Complaint not found. Please verify the ticket reference.');
      }
      setComplaint(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialRef) {
      handleSearch();
    }
  }, [initialRef]);

  const handleSendFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !followUpMsg.trim()) return;

    setIsSendingFollowUp(true);
    try {
      await api.publicComplaints.followUp(complaint.public_reference, followUpMsg.trim());
      setFollowUpMsg('');
      setFollowUpSuccess(true);
      // Re-fetch tracking
      handleSearch();
    } catch (err: any) {
      alert('Failed to send follow-up message');
    } finally {
      setIsSendingFollowUp(false);
    }
  };

  const getStatusStepIndex = (status: string) => {
    switch (status) {
      case 'submitted':
        return 0;
      case 'acknowledged':
        return 1;
      case 'assigned':
        return 2;
      case 'in_progress':
        return 3;
      case 'resolved':
        return 4;
      default:
        return 0;
    }
  };

  const steps = [
    { key: 'submitted', label: lang === 'mr' ? 'नोंदणी झाली' : 'Submitted' },
    { key: 'acknowledged', label: lang === 'mr' ? 'तपासणी सुरू' : 'Under Review' },
    { key: 'assigned', label: lang === 'mr' ? 'कर्मचारी नियुक्त' : 'Assigned' },
    { key: 'in_progress', label: lang === 'mr' ? 'दुरुस्ती चालू' : 'In Progress' },
    { key: 'resolved', label: lang === 'mr' ? 'निवारण पूर्ण' : 'Resolved' },
  ];

  const currentStep = complaint ? getStatusStepIndex(complaint.status) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center space-x-2">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
          <Search className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white">{t.trackTitle}</h1>
          <p className="text-[11px] text-slate-400">
            {lang === 'mr' ? 'आपल्या तक्रारीची अधिकृत स्थिती तपासा' : 'Check verified resolution updates'}
          </p>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
        <form onSubmit={handleSearch} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              {t.enterRefLabel} *
            </label>
            <input
              type="text"
              required
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={t.enterRefPlaceholder}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              {t.verifyPhoneLabel}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.verifyPhonePlaceholder}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-amber-950 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span>{lang === 'mr' ? 'तपासत आहे...' : 'Checking...'}</span>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>{t.checkStatusBtn}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Tracking Result View */}
      {complaint && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Header Ticket Card */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">तक्रार संदर्भ क्र. / Ticket Reference</span>
                <span className="font-mono text-base font-black text-amber-400 tracking-wider">
                  {complaint.public_reference}
                </span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                {complaint.status_label}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-2 border-t border-slate-800">
              <div>
                <span className="text-slate-500 block text-[10px]">{t.categoryDisplay}</span>
                <strong>{complaint.category_label}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">{t.filedOn}</span>
                <strong>{new Date(complaint.created_at).toLocaleDateString()}</strong>
              </div>
            </div>
          </div>

          {/* Stepper Progression */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              {lang === 'mr' ? 'निवारण स्थिती प्रगती' : 'Resolution Progress'}
            </h3>

            <div className="space-y-2">
              {steps.map((st, idx) => {
                const isPassed = idx <= currentStep;
                const isCurrent = idx === currentStep;
                return (
                  <div key={st.key} className="flex items-center space-x-3 text-xs">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        isPassed
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className={isCurrent ? 'font-bold text-cyan-400' : isPassed ? 'text-slate-200' : 'text-slate-500'}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Official Update Message */}
          <div className="bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-900 p-4 rounded-2xl space-y-1.5">
            <div className="text-[11px] font-bold text-cyan-300 flex items-center space-x-1.5">
              <Droplet className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.officialMessage}</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {complaint.public_status_message || 'Under standard review by Gram Panchayat staff.'}
            </p>
          </div>

          {/* Public Updates Timeline */}
          {complaint.events.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-slate-200">{t.timelineTitle}</h3>
              <div className="space-y-2 text-xs">
                {complaint.events.map((ev) => (
                  <div key={ev.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex justify-between text-slate-400 text-[10px]">
                      <span>{ev.actor_name}</span>
                      <span>{new Date(ev.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-200 text-xs">{ev.public_message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Citizen Follow-up Card */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.followUpTitle}</span>
            </h3>

            {followUpSuccess && (
              <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900 p-2 rounded-xl">
                {t.followUpSent}
              </div>
            )}

            <form onSubmit={handleSendFollowUp} className="space-y-2">
              <textarea
                rows={2}
                required
                value={followUpMsg}
                onChange={(e) => setFollowUpMsg(e.target.value)}
                placeholder={t.followUpPlaceholder}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="submit"
                disabled={isSendingFollowUp}
                className="w-full bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold py-2 rounded-xl text-xs transition border border-cyan-800/40 flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingFollowUp ? 'Sending...' : t.sendFollowUp}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
