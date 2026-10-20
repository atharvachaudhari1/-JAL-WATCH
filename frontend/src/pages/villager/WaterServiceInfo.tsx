import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Droplet,
  PhoneCall,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { translations } from '../../lib/translations';

export const WaterServiceInfo: React.FC = () => {
  const navigate = useNavigate();
  const { lang, t } = useOutletContext<{ lang: 'mr' | 'en'; t: typeof translations['en'] }>();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
          <Calendar className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white">{t.scheduleTitle}</h1>
          <p className="text-[11px] text-slate-400">{t.gpName}</p>
        </div>
      </div>

      {/* Schedule Hours Card */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center space-x-2 text-xs font-bold text-cyan-300 uppercase tracking-wider">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>{lang === 'mr' ? 'दैनिक पाणी पुरवठा वेळ' : 'Daily Water Supply Windows'}</span>
        </div>

        <div className="space-y-2.5 text-xs">
          {/* Morning Window */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-200">{lang === 'mr' ? 'सकाळची वेळ' : 'Morning Window'}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">वार्ड १, २, ३ आणि ४</div>
            </div>
            <div className="font-mono text-cyan-300 font-extrabold text-sm bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800/50">
              06:00 - 09:00
            </div>
          </div>

          {/* Evening Window */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-200">{lang === 'mr' ? 'संध्याकाळची वेळ' : 'Evening Window'}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">वार्ड १, २, ३ आणि ४</div>
            </div>
            <div className="font-mono text-cyan-300 font-extrabold text-sm bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800/50">
              17:30 - 20:00
            </div>
          </div>
        </div>
      </div>

      {/* Water Quality & Health Notice */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>{t.advisoryTitle}</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {t.advisoryText}
        </p>
      </div>

      {/* Sensor Screening Notice */}
      <div className="bg-blue-950/30 border border-blue-900/60 p-4 rounded-2xl text-xs text-slate-300 space-y-1.5">
        <div className="font-bold text-cyan-300 flex items-center space-x-1.5">
          <AlertTriangle className="w-4 h-4 text-cyan-400" />
          <span>
            {lang === 'mr' ? 'जल गुणवत्ता सेन्सर कार्यपद्धती' : 'Water Quality Screening Transparency'}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          {lang === 'mr'
            ? 'नळ कनेक्शनवरील इलेक्ट्रॉनिक सेन्सर्स केवळ प्राथमिक तपासणी (Screening) करतात. कोणत्याही दूषित पाण्याच्या संशयाची अधिकृत प्रयोगशाळेमार्फत खात्री केली जाते.'
            : 'Low-cost probes provide screening indicators only and do not replace certified NABL laboratory testing.'}
        </p>
      </div>

      {/* Emergency Contacts */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
          <PhoneCall className="w-4 h-4 text-emerald-400" />
          <span>{t.emergencyContacts}</span>
        </div>
        <div className="text-xs text-slate-300 space-y-2">
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
            {t.sarpanchOffice}
          </div>
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
            {t.jalKarmi}
          </div>
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 font-semibold text-cyan-300">
            {t.tollFree}
          </div>
        </div>
      </div>

      {/* Quick CTA */}
      <button
        onClick={() => navigate('/villager/report')}
        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center space-x-2 transition shadow-lg shadow-blue-950"
      >
        <span>{t.reportProblem}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
