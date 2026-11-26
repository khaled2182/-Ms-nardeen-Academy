import React, { useState } from 'react';
import { Bell, Check, Globe, ImagePlus, LogOut, Moon, RotateCcw, Sun } from 'lucide-react';
import { ASSET_IMAGES, compressTransparentImageFile } from '../lib/gamification';
import { t } from '../lib/i18n';
import { AcademyNotification, Language, ThemeMode } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsViewProps {
  lang: Language;
  theme: ThemeMode;
  email: string;
  isTeacher?: boolean;
  appIconUrl?: string;
  notificationsEnabled: boolean;
  notifications: AcademyNotification[];
  readNotifIds: Set<string>;
  onChangeLang: (lang: Language) => Promise<void>;
  onChangeTheme: (theme: ThemeMode) => Promise<void>;
  onEnableNotifications: () => Promise<void>;
  onUpdateAppIcon?: (iconUrl: string) => Promise<void>;
  onMarkNotificationRead: (notifId: string) => Promise<void>;
  onSignOut: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  lang,
  theme,
  email,
  isTeacher = false,
  appIconUrl = '',
  notificationsEnabled,
  notifications,
  readNotifIds,
  onChangeLang,
  onChangeTheme,
  onEnableNotifications,
  onUpdateAppIcon,
  onMarkNotificationRead,
  onSignOut,
}) => {
  const [enabling, setEnabling] = useState(false);
  const [iconBusy, setIconBusy] = useState(false);
  const [iconError, setIconError] = useState<string | null>(null);

  const resolvedAppIcon = appIconUrl || ASSET_IMAGES.appIcon;

  const handlePickAppIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateAppIcon) return;
    setIconError(null);
    setIconBusy(true);
    try {
      const compressed = await compressTransparentImageFile(file);
      await onUpdateAppIcon(compressed);
    } catch (err) {
      setIconError(
        err instanceof Error
          ? err.message
          : lang === 'ar'
          ? 'تعذر تحميل صورة الأيقونة'
          : 'Failed to update app icon'
      );
    } finally {
      setIconBusy(false);
      e.target.value = '';
    }
  };

  const browserBlocked =
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied';

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t(lang, 'settingsTitle')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{email}</p>
      </div>

      {/* Preferences */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
        {/* Language */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-sky-500" />
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                {t(lang, 'languageLabel')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? 'العربية (RTL) أو الإنجليزية (LTR)' : 'Arabic (RTL) or English (LTR)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onChangeLang('ar')}
              className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                lang === 'ar'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              العربية
            </button>
            <button
              type="button"
              onClick={() => onChangeLang('en')}
              className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                lang === 'en'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Theme */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? (
              <Moon className="w-5 h-5 text-violet-400" />
            ) : (
              <Sun className="w-5 h-5 text-amber-500" />
            )}
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                {t(lang, 'themeLabel')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {theme === 'dark' ? t(lang, 'darkMode') : t(lang, 'lightMode')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onChangeTheme('light')}
              className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                theme === 'light'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {t(lang, 'lightMode')}
            </button>
            <button
              type="button"
              onClick={() => onChangeTheme('dark')}
              className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {t(lang, 'darkMode')}
            </button>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white">
                {t(lang, 'notificationsLabel')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {browserBlocked
                  ? t(lang, 'notificationsBlockedStatus')
                  : notificationsEnabled
                  ? t(lang, 'notificationsEnabledStatus')
                  : lang === 'ar'
                  ? 'اضغط لتفعيل تنبيهات الهاتف والمتصفح'
                  : 'Tap to allow real-time device push alerts'}
              </p>
            </div>
          </div>

          {!notificationsEnabled && !browserBlocked && (
            <button
              type="button"
              disabled={enabling}
              onClick={async () => {
                setEnabling(true);
                try {
                  await onEnableNotifications();
                } finally {
                  setEnabling(false);
                }
              }}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold self-start sm:self-auto transition-colors"
            >
              {enabling ? t(lang, 'loadingText') : t(lang, 'enableNotifications')}
            </button>
          )}
        </div>

        {/* Web App Icon & Install */}
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src={resolvedAppIcon}
                alt={t(lang, 'brandName')}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-2xl object-cover border border-sky-200 dark:border-sky-800 shadow-sm shrink-0"
              />
              <div>
                <p className="font-bold text-sm text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'أيقونة وتثبيت تطبيق الويب' : 'Web App Icon & Install'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'ar'
                    ? 'أضف التطبيق إلى الشاشة الرئيسية بهاتفك أو حاسوبك بهذه الأيقونة'
                    : 'Install Ms nardeen Academy to your device home screen with this icon'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <PWAInstallButton lang={lang} />
            </div>
          </div>

          {isTeacher && onUpdateAppIcon && (
            <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ImagePlus className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {lang === 'ar'
                    ? 'تخصيص صورة أيقونة تطبيق الويب (للمعلمة):'
                    : 'Customize Web App Icon image (Teacher):'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-sky-400 text-xs font-semibold text-sky-700 dark:text-sky-300 cursor-pointer flex items-center gap-1.5 whitespace-nowrap">
                  <span>
                    {iconBusy
                      ? t(lang, 'loadingText')
                      : lang === 'ar'
                      ? 'رفع صورة من المعرض'
                      : 'Upload from Gallery'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePickAppIcon}
                    disabled={iconBusy}
                    className="hidden"
                  />
                </label>
                {appIconUrl && (
                  <button
                    type="button"
                    disabled={iconBusy}
                    onClick={async () => {
                      setIconBusy(true);
                      try {
                        await onUpdateAppIcon('');
                      } finally {
                        setIconBusy(false);
                      }
                    }}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'الافتراضية' : 'Reset'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {iconError && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{iconError}</p>
          )}
        </div>
      </section>

      {/* Notifications Inbox */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          {t(lang, 'notificationsInbox')}
        </h2>

        {notifications.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {lang === 'ar' ? 'لا توجد إشعارات حتى الآن.' : 'No notifications yet.'}
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((notif) => {
              const unread = !readNotifIds.has(notif.id);
              return (
                <div key={notif.id} className="py-3.5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                      {lang === 'ar' ? notif.titleAr : notif.title}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      {lang === 'ar' ? notif.bodyAr : notif.body}
                    </p>
                  </div>
                  {unread && (
                    <button
                      type="button"
                      onClick={() => onMarkNotificationRead(notif.id)}
                      className="min-h-[36px] px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center gap-1 shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{t(lang, 'markAsRead')}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div>
        <button
          type="button"
          onClick={onSignOut}
          className="min-h-[46px] px-5 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm font-bold flex items-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{t(lang, 'signOut')}</span>
        </button>
      </div>
    </div>
  );
};
