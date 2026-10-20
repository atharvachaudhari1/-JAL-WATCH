import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Camera,
  ChevronRight,
  Droplet,
  ArrowLeft,
  X,
} from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { translations } from '../../lib/translations';

export const ReportProblem: React.FC = () => {
  const navigate = useNavigate();
  const { lang, t } = useOutletContext<{ lang: 'mr' | 'en'; t: typeof translations['en'] }>();

  // Form states
  const [fhtcId, setFhtcId] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [category, setCategory] = useState('no_water');
  const [startedAt, setStartedAt] = useState('');
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [consent, setConsent] = useState(true);

  // Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<string | null>(null);

  const categories = [
    { id: 'no_water', label: lang === 'mr' ? 'पाणी येत नाही' : 'No Water Supply' },
    { id: 'low_pressure', label: lang === 'mr' ? 'कमी दाबाने पाणी' : 'Low Water Pressure' },
    { id: 'intermittent', label: lang === 'mr' ? 'अनियमित पुरवठा' : 'Intermittent Supply' },
    { id: 'quality', label: lang === 'mr' ? 'गढूळ / दूषित पाणी' : 'Water Quality Issue' },
    { id: 'leakage', label: lang === 'mr' ? 'पाईप गळती' : 'Visible Leakage' },
    { id: 'damaged_pipe', label: lang === 'mr' ? 'नळ / पाईप फुटला' : 'Damaged Tap / Pipe' },
    { id: 'other', label: lang === 'mr' ? 'इतर अडचण' : 'Other Problem' },
  ];

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert(lang === 'mr' ? 'फोटोचा आकार ५ एमबी पेक्षा जास्त असू नये' : 'Photo size must be less than 5MB');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setUploadedUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || description.trim().length < 5) {
      setError(lang === 'mr' ? 'कृपया समस्येचे थोडे सविस्तर वर्णन लिहा' : 'Please provide a clear description');
      return;
    }
    if (!consent) {
      setError(lang === 'mr' ? 'कृपया संमती चौकटीवर खूण करा' : 'Please accept the consent terms');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Upload photo if selected
      let photoPath: string | undefined = undefined;
      if (photoFile) {
        try {
          const uploadRes = await api.publicComplaints.uploadPhoto(photoFile);
          photoPath = uploadRes.photo_url;
        } catch (uploadErr) {
          console.warn('Photo upload skipped or failed, proceeding with complaint:', uploadErr);
        }
      }

      // 2. Submit complaint
      const connIdentifier = fhtcId.trim() || selectedWard || 'Shirsuphal Ward';
      const res = await api.publicComplaints.submit({
        connection_id_or_fhtc: connIdentifier,
        category,
        description: description.trim(),
        started_at_approx: startedAt.trim() || undefined,
        contact_name: contactName.trim() || undefined,
        contact_phone: contactPhone.trim() || undefined,
        consent_given: consent,
      });

      setCreatedTicket(res.public_reference);
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please check internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // SUCCESS SCREEN
  if (createdTicket) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl text-center space-y-5 animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-white">{t.successTitle}</h2>
          <p className="text-xs text-slate-400 mt-1">{t.yourRef}</p>
          <div className="font-mono text-2xl font-black text-cyan-400 bg-slate-950 py-3 px-4 rounded-xl border border-cyan-800/40 my-3 tracking-wider">
            {createdTicket}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed px-2">
            {t.saveAdvice}
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={() => navigate(`/villager/track?ref=${createdTicket}`)}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl text-xs transition shadow-lg shadow-cyan-900/30"
          >
            {t.trackNow}
          </button>
          <button
            onClick={() => {
              setCreatedTicket(null);
              setDescription('');
              removePhoto();
            }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs transition"
          >
            {t.submitAnother}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center space-x-2">
        <div className="p-2 rounded-xl bg-blue-500/10 text-cyan-400">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white">{t.reportProblem}</h1>
          <p className="text-[11px] text-slate-400">{t.subTitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Identify Connection */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
          <h2 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
            {t.fhtcPrompt}
          </h2>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              {t.fhtcLabel}
            </label>
            <input
              type="text"
              value={fhtcId}
              onChange={(e) => setFhtcId(e.target.value)}
              placeholder={t.fhtcPlaceholder}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500 uppercase"
            />
            <p className="text-[10px] text-slate-400 mt-1 leading-normal">
              {t.fhtcHelper}
            </p>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              {t.orSelectWard}
            </label>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">{t.selectWardPlaceholder}</option>
              <option value="Ward 1 (Gaothan)">Ward 1 (Gaothan)</option>
              <option value="Ward 2 (Vikas Nagar)">Ward 2 (Vikas Nagar)</option>
              <option value="Ward 3 (Bhim Nagar)">Ward 3 (Bhim Nagar)</option>
              <option value="Ward 4 (Malshiras Road)">Ward 4 (Malshiras Road)</option>
            </select>
          </div>
        </div>

        {/* Step 2: Category & Description */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
          <h2 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
            {t.step2Title}
          </h2>

          {/* Category Chips */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">
              {t.categoryLabel}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-2.5 rounded-xl text-xs font-semibold text-left transition border ${
                    category === cat.id
                      ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-900/30'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              {t.whenStartedLabel}
            </label>
            <input
              type="text"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
              placeholder={t.whenStartedPlaceholder}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              {t.descLabel} *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.descPlaceholder}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Optional Photo Attachment */}
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">
              {t.photoLabel}
            </label>
            {photoPreview ? (
              <div className="relative mt-2">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded-xl border border-slate-700"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 p-1 rounded-full bg-slate-900/80 text-rose-400 hover:text-rose-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl cursor-pointer bg-slate-950 transition">
                <Camera className="w-6 h-6 text-slate-500 mb-1" />
                <span className="text-[11px] text-slate-400">
                  {lang === 'mr' ? 'फोटो काढण्यासाठी किंवा निवडण्यासाठी टॅप करा' : 'Tap to take or upload photo'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Step 3: Contact Details & Consent */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
          <h2 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
            {t.contactSection}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                {t.nameLabel}
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder={t.namePlaceholder}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">
                {t.phoneLabel}
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder={t.phonePlaceholder}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <label className="flex items-start space-x-2.5 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-[11px] text-slate-400 leading-normal">
              {t.consent}
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold py-3.5 px-4 rounded-2xl text-sm transition shadow-lg shadow-cyan-900/30 flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <span>{t.submitting}</span>
          ) : (
            <>
              <span>{t.submitBtn}</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
