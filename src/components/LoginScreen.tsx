import React, { useState } from 'react';
import { Award, BookOpen, Globe, ImagePlus, Moon, PlayCircle, Sun, Trophy, X } from 'lucide-react';
import { ASSET_IMAGES, compressTransparentImageFile } from '../lib/gamification';
import { t } from '../lib/i18n';
import { Language, ThemeMode } from '../types';

interface LoginScreenProps {
  lang: Language;
  theme: ThemeMode;
  loading: boolean;
  error: string | null;
  appIconUrl?: string;
  pendingPhotoURL: string;
  onSelectPendingPhoto: (dataUrl: string) => void;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  onSignIn: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  lang,
  theme,
  loading,
  error,
  appIconUrl,
  pendingPhotoURL,
  onSelectPendingPhoto,
  onToggleLang,
  onToggleTheme,
  onSignIn,
}) => {
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handlePickFromGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      const compressed = await compressTransparentImageFile(file);
      onSelectPendingPhoto(compressed);
    } catch (err) {
      setPhotoError(
        err instanceof Error
          ? err.message
          : lang === 'ar'
          ? 'تعذر قراءة الصورة المختارة'
          : 'Failed to load selected image'
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Clean 3-zone Top Bar */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <img
            src={appIconUrl || ASSET_IMAGES.appIcon}
            alt={t(lang, 'brandName')}
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-xl object-cover border border-sky-200/80 dark:border-sky-800 shadow-sm shrink-0"
          />
          <span className="text-lg sm:text-xl font-bold tracking-tight text-sky-700 dark:text-sky-300 truncate">
            {t(lang, 'brandName')}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleLang}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
            aria-label={t(lang, 'themeLabel')}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-violet-600" />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-xl">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-7 sm:p-10 flex flex-col justify-between shadow-sm">
            <div>
              <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-3">
                {lang === 'ar' ? 'أكاديمية تعلم اللغة الإنجليزية للأطفال' : 'Interactive English Learning for Young Stars'}
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-tight mb-4">
                {t(lang, 'welcomeHeroTitle')}
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                {t(lang, 'welcomeHeroSubtitle')}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 p-3.5">
                  <PlayCircle className="w-5 h-5 text-sky-600 dark:text-sky-400 mb-2" />
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'دروس مصورة' : 'Video Lessons'}
                  </p>
                </div>
                <div className="rounded-2xl bg-violet-50/80 dark:bg-violet-950/40 p-3.5">
                  <Trophy className="w-5 h-5 text-violet-600 dark:text-violet-400 mb-2" />
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'منصة المتصدرين' : 'Live Leaderboard'}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5">
                  <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2" />
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'متجر مكافآت' : 'Rewards Store'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Student Gallery Photo Picker during sign-up */}
              <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {pendingPhotoURL ? (
                    <img
                      src={pendingPhotoURL}
                      alt="Selected student avatar"
                      className="w-12 h-12 rounded-2xl object-cover border border-sky-300 dark:border-sky-700 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <ImagePlus className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {lang === 'ar' ? 'صورتك الشخصية للتسجيل (من المعرض)' : 'Profile Photo for Sign-Up (Gallery)'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {pendingPhotoURL
                        ? lang === 'ar'
                          ? 'تم إرفاق صورتك بنجاح'
                          : 'Your gallery photo is ready'
                        : lang === 'ar'
                        ? 'اختياري: أرفق صورتك من معرض جهازك'
                        : 'Optional: pick a photo from your gallery'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <label className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-sky-400 text-xs font-semibold text-sky-700 dark:text-sky-300 cursor-pointer flex items-center gap-1.5 whitespace-nowrap">
                    <span>
                      {photoBusy
                        ? t(lang, 'loadingText')
                        : pendingPhotoURL
                        ? lang === 'ar'
                          ? 'تغيير'
                          : 'Change'
                        : lang === 'ar'
                        ? 'اختر صورة'
                        : 'Pick Photo'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePickFromGallery}
                      className="hidden"
                    />
                  </label>
                  {pendingPhotoURL && (
                    <button
                      type="button"
                      onClick={() => onSelectPendingPhoto('')}
                      className="min-h-[40px] min-w-[40px] rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 flex items-center justify-center"
                      aria-label={t(lang, 'deleteLabel')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {(error || photoError) && (
                <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-4 py-3 text-sm text-rose-700 dark:text-rose-200 whitespace-pre-line select-text break-words">
                  {photoError || error}
                </div>
              )}

              <button
                type="button"
                onClick={onSignIn}
                disabled={loading || photoBusy}
                className="w-full min-h-[52px] px-6 py-3.5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white font-bold text-base shadow-sm flex items-center justify-center gap-3 transition-all disabled:opacity-60"
              >
                <BookOpen className="w-5 h-5" />
                <span>{loading ? t(lang, 'signingIn') : t(lang, 'signInWithGoogle')}</span>
              </button>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                {lang === 'ar'
                  ? 'دخول آمن لحسابات الطلاب والمعلمة عبر Google'
                  : 'Secure Google Sign-In with automatic Teacher & Student role access'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
