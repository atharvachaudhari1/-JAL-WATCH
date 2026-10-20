import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Droplet, Globe, WifiOff, PhoneCall, ArrowLeft, Home, FileText, Search, Info } from 'lucide-react';
import { Language, translations } from '../../lib/translations';

export const VillagerLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [lang, setLang] = useState<Language>('mr');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const t = translations[lang];
  const isRoot = location.pathname === '/villager' || location.pathname === '/villager/';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-md mx-auto shadow-2xl border-x border-slate-900">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center space-x-2">
          <WifiOff className="w-4 h-4 animate-bounce" />
          <span>आपण ऑफलाइन आहात / You are currently offline</span>
        </div>
      )}

      {/* Top Mobile Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          {!isRoot ? (
            <button
              onClick={() => navigate('/villager')}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
              <Droplet className="w-5 h-5 text-white fill-white" />
            </div>
          )}
          <div>
            <div className="font-bold text-sm tracking-tight text-white flex items-center space-x-1.5">
              <span>जलवॉच</span>
              <span className="text-[10px] text-cyan-400 font-mono font-normal">JalWatch</span>
            </div>
            <div className="text-[10px] text-slate-400">शिरसुफळ ग्रामपंचायत</div>
          </div>
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLang(lang === 'mr' ? 'en' : 'mr')}
          className="flex items-center space-x-1 text-xs bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 px-2.5 py-1.5 rounded-xl transition font-medium"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'mr' ? 'English' : 'मराठी'}</span>
        </button>
      </header>

      {/* Content View */}
      <main className="flex-1 p-4 pb-20 overflow-y-auto">
        <Outlet context={{ lang, t }} />
      </main>

      {/* Bottom Mobile Tab Bar */}
      <nav className="fixed bottom-0 max-w-md w-full bg-slate-900/95 backdrop-blur-md border-t border-slate-800 py-2 px-6 flex justify-around items-center z-30">
        <button
          onClick={() => navigate('/villager')}
          className={`flex flex-col items-center space-y-1 text-[11px] ${
            isRoot ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>{lang === 'mr' ? 'मुख्य पृष्ठ' : 'Home'}</span>
        </button>

        <button
          onClick={() => navigate('/villager/report')}
          className={`flex flex-col items-center space-y-1 text-[11px] ${
            location.pathname.includes('/report') ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span>{lang === 'mr' ? 'तक्रार नोंदवा' : 'Report'}</span>
        </button>

        <button
          onClick={() => navigate('/villager/track')}
          className={`flex flex-col items-center space-y-1 text-[11px] ${
            location.pathname.includes('/track') ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-5 h-5" />
          <span>{lang === 'mr' ? 'स्थिती तपासा' : 'Track'}</span>
        </button>

        <button
          onClick={() => navigate('/villager/info')}
          className={`flex flex-col items-center space-y-1 text-[11px] ${
            location.pathname.includes('/info') ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Info className="w-5 h-5" />
          <span>{lang === 'mr' ? 'वेळापत्रक' : 'Schedule'}</span>
        </button>
      </nav>
    </div>
  );
};
