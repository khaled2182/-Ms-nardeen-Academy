import React, { useState } from 'react';
import { CheckCircle2, ImagePlus, LogOut, Sparkles, UserCheck } from 'lucide-react';
import { compressTransparentImageFile, TRANSPARENT_AVATAR_PRESETS } from '../lib/gamification';
import { t } from '../lib/i18n';
import { Language } from '../types';
import { AvatarImage } from './SharedUI';

interface StudentOnboardingScreenProps {
  lang: Language;
  defaultName: string;
  defaultPhotoURL: string;
  onComplete: (displayName: string, photoURL: string) => Promise<void>;
  onSignOut: () => void;
}

export const StudentOnboardingScreen: React.FC<StudentOnboardingScreenProps> = ({
  lang,
  defaultName,
  defaultPhotoURL,
  onComplete,
  onSignOut,
}) => {
  const [displayName, setDisplayName] = useState(defaultName);
  const [photoURL, setPhotoURL] = useState(defaultPhotoURL || TRANSPARENT_AVATAR_PRESETS[0].url);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setProcessingPhoto(true);
    try {
      const compressed = await compressTransparentImageFile(file);
      setPhotoURL(compressed);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : lang === 'ar'
          ? 'تعذر قراءة الصورة المختارة'
          : 'Could not process the selected image'
      );
    } finally {
      setProcessingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError(lang === 'ar' ? 'يرجى كتابة اسم الطالب' : 'Please enter your name');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onComplete(displayName.trim(), photoURL);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex items-center justify-center p-5">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-7 sm:p-9 shadow-sm space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-sky-600 dark:text-sky-400 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>{t(lang, 'brandName')}</span>
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {lang === 'ar' ? 'أكمل تسجيل حسابك' : 'Complete Your Student Profile'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {lang === 'ar'
                ? 'أرفق صورتك الشخصية من معرض جهازك واكتب اسمك للبدء.'
                : 'Attach your personal photo from your gallery and confirm your name to start.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="min-h-[40px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t(lang, 'signOut')}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Gallery Photo Upload Stage */}
          <div className="rounded-3xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-800/60 p-5 flex flex-col items-center text-center gap-4">
            <div className="w-28 h-28 rounded-3xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 p-2 flex items-center justify-center shadow-sm overflow-hidden">
              <AvatarImage
                src={photoURL}
                alt={displayName || 'Student'}
                className="w-full h-full rounded-2xl object-cover"
              />
            </div>

            <div className="space-y-2 w-full">
              <label className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <ImagePlus className="w-5 h-5" />
                <span>
                  {processingPhoto
                    ? t(lang, 'loadingText')
                    : lang === 'ar'
                    ? 'إرفاق صورة شخصية من المعرض'
                    : 'Choose Photo from Gallery'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleGallerySelect}
                  className="hidden"
                />
              </label>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar'
                  ? 'أو اختر إحدى الشخصيات الجاهزة:'
                  : 'Or pick a character avatar:'}
              </p>

              <div className="flex items-center justify-center gap-2.5 pt-1">
                {TRANSPARENT_AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setPhotoURL(preset.url)}
                    className={`w-12 h-12 rounded-2xl p-1 border-2 transition-colors ${
                      photoURL === preset.url
                        ? 'border-sky-500 bg-white dark:bg-slate-800'
                        : 'border-transparent bg-white/70 dark:bg-slate-800/70'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.labelEn}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Student Name */}
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
              {lang === 'ar' ? 'اسم الطالب' : 'Student Full Name'}
            </label>
            <input
              type="text"
              maxLength={80}
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={lang === 'ar' ? 'اكتب اسمك هنا...' : 'Enter your name...'}
              className="w-full min-h-[48px] px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || processingPhoto || !displayName.trim()}
            className="w-full min-h-[52px] px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {submitting ? (
              <span>{t(lang, 'loadingText')}</span>
            ) : (
              <>
                <UserCheck className="w-5 h-5" />
                <span>
                  {lang === 'ar' ? 'إتمام التسجيل والدخول للأكاديمية' : 'Finish Registration & Start'}
                </span>
                <CheckCircle2 className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
