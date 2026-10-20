import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  FileText,
  Search,
  Calendar,
  PhoneCall,
  ShieldCheck,
  Droplet,
  ChevronRight,
  Info,
} from 'lucide-react';
import { translations } from '../../lib/translations';

export const VillagerHome: React.FC = () => {
  const navigate = useNavigate();
  const { lang, t } = useOutletContext<{ lang: 'mr' | 'en'; t: typeof translations['en'] }>();

  return (
    <div className="space-y-5">
      {/* Hero Welcome Card */}
      <div className="bg-gradient-to-br from-blue-900/60 to-slate-900 border border-blue-800/40 p-5 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase tracking-wider border border-cyan-500/30">
            <span>जल जीवन मिशन • हर घर जल</span>
          </div>
          <h1 className="text-xl font-extrabold text-white leading-tight">
            {t.appTitle}
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            {t.tagline}
          </p>
        </div>
        <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* 3 Main Action Cards */}
      <div className="space-y-3">
        {/* 1. Report Problem Button */}
        <button
          onClick={() => navigate('/villager/report')}
          className="w-full text-left bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 p-4 rounded-2xl text-white shadow-lg shadow-blue-900/30 flex items-center justify-between group transition active:scale-[0.98]"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight">{t.reportProblem}</div>
              <div className="text-xs text-blue-100 mt-0.5">
                {lang === 'mr' ? 'कमी दाब, गळती किंवा पाणी न येणे' : 'No water, low pressure or leakage'}
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition" />
        </button>

        {/* 2. Track Complaint Button */}
        <button
          onClick={() => navigate('/villager/track')}
          className="w-full text-left bg-slate-900 hover:bg-slate-800/80 border border-slate-800 p-4 rounded-2xl text-white flex items-center justify-between group transition active:scale-[0.98]"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Search className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-100">{t.trackComplaint}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {lang === 'mr' ? 'तक्रार संदर्भ क्रमांकाने स्थिती पहा' : 'Check status with reference number'}
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition" />
        </button>

        {/* 3. Water Service Information Button */}
        <button
          onClick={() => navigate('/villager/info')}
          className="w-full text-left bg-slate-900 hover:bg-slate-800/80 border border-slate-800 p-4 rounded-2xl text-white flex items-center justify-between group transition active:scale-[0.98]"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="font-bold text-sm text-slate-100">{t.waterServiceInfo}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {lang === 'mr' ? 'सकाळ व संध्याकाळ पुरवठा वेळा' : 'Morning and evening timings'}
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition" />
        </button>
      </div>

      {/* Emergency Helpline Banner */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-300">
          <PhoneCall className="w-4 h-4 text-emerald-400" />
          <span>{lang === 'mr' ? 'तातडीचा पाणी पुरवठा संपर्क' : 'Village Water Works Contacts'}</span>
        </div>
        <div className="text-xs text-slate-400 space-y-1">
          <div>{t.sarpanchOffice}</div>
          <div>{t.jalKarmi}</div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="text-center text-[11px] text-slate-500 flex items-center justify-center space-x-1.5 pt-2">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
        <span>
          {lang === 'mr'
            ? 'आपली माहिती केवळ पाणी समस्या निवारणासाठी वापरली जाते.'
            : 'Your data is secured for water redressal services only.'}
        </span>
      </div>
    </div>
  );
};
