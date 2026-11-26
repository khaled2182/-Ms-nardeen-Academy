import React, { useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Check,
  Globe,
  ImagePlus,
  LogOut,
  Moon,
  RotateCcw,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { ASSET_IMAGES, compressTransparentImageFile } from '../lib/gamification';
import { t } from '../lib/i18n';
import { AcademyNotification, Language, ThemeMode } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsViewProps {
  lang: Language;
  theme: ThemeMode;
  email: string;
  isTeacher?: boolean;
  isBootstrapAdmin?: boolean;
  appIconUrl?: string;
  notificationsEnabled: boolean;
  notifications: AcademyNotification[];
  readNotifIds: Set<string>;
  onChangeLang: (lang: Language) => Promise<void>;
  onChangeTheme: (theme: ThemeMode) => Promise<void>;
  onEnableNotifications: () => Promise<void>;
  onUpdateAppIcon?: (iconUrl: string) => Promise<void>;
  onDeleteNotification?: (notifId: string) => Promise<void>;
  onFactoryReset?: () => Promise<void>;
  onMarkNotificationRead: (notifId: string) => Promise<void>;
  onSignOut: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  lang,
  theme,
  email,
  isTeacher = false,
  isBootstrapAdmin = false,
  appIconUrl = '',
  notificationsEnabled,
  notifications,
  readNotifIds,
  onChangeLang,
  onChangeTheme,
  onEnableNotifications,
  onUpdateAppIcon,
  onDeleteNotification,
  onFactoryReset,
  onMarkNotificationRead,
  onSignOut,
}) => {
  const [enabling, setEnabling] = useState(false);
  const [iconBusy, setIconBusy] = useState(false);
  const [iconError, setIconError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

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
                  <div className="flex items-center gap-2 shrink-0">
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
                    {isTeacher && onDeleteNotification && (
                      <button
                        type="button"
                        onClick={() => onDeleteNotification(notif.id)}
                        className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-center shrink-0"
                        aria-label={t(lang, 'deleteLabel')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Factory Reset (Bootstrap Admin Only) */}
      {isBootstrapAdmin && onFactoryReset && (
        <section className="rounded-3xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 p-5 sm:p-6 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h2 className="text-base font-bold text-rose-900 dark:text-rose-200">
                {lang === 'ar'
                  ? 'إعادة ضبط المصنع (مسح جميع البيانات والحسابات)'
                  : 'Factory Reset (Wipe All Data & Accounts)'}
              </h2>
              <p className="text-xs text-rose-700/90 dark:text-rose-300/80 mt-1 leading-relaxed">
                {lang === 'ar'
                  ? 'يمسح جميع حسابات الطلاب، النقاط، السجلات، الدروس، الواجبات، الملاحظات، الهدايا، الإشعارات، وأيقونة التطبيق المخصصة ليعود التطبيق فارغًا تمامًا كأنه لم يُستخدم.'
                  : 'Permanently deletes all student profiles, points, transactions, lessons, tasks, notes, rewards, notifications, and custom branding so the app starts completely fresh.'}
              </p>
            </div>
          </div>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setResetConfirmed(false);
                setResetError(null);
                setShowResetModal(true);
              }}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>
                {lang === 'ar' ? 'مسح جميع البيانات والحسابات' : 'Wipe All Data & Accounts'}
              </span>
            </button>
          </div>
        </section>
      )}

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

      {/* Factory Reset Confirmation Modal */}
      {showResetModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {lang === 'ar' ? 'تأكيد مسح جميع البيانات' : 'Confirm Complete Data Wipe'}
                </h3>
              </div>
              <button
                type="button"
                disabled={resetBusy}
                onClick={() => setShowResetModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {lang === 'ar'
                ? 'سيتم حذف جميع بيانات قاعدة البيانات (الطلاب، الدروس، المهام، الملاحظات، النقاط، المكافآت، الإشعارات، والإعدادات) وتسجيل الخروج فورًا. لا يمكن التراجع عن هذا الإجراء.'
                : 'All database records (students, lessons, tasks, notes, points, rewards, notifications, and settings) will be permanently deleted and you will be signed out immediately. This action cannot be undone.'}
            </p>

            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={resetConfirmed}
                onChange={(e) => setResetConfirmed(e.target.checked)}
                disabled={resetBusy}
                className="mt-0.5 w-4 h-4 accent-rose-600 shrink-0"
              />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {lang === 'ar'
                  ? 'نعم، أفهم أن هذا الإجراء سيمسح جميع البيانات والحسابات من قاعدة البيانات نهائيًا.'
                  : 'Yes, I understand this will permanently wipe all data and accounts from the database.'}
              </span>
            </label>

            {resetError && (
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{resetError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={resetBusy}
                onClick={() => setShowResetModal(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={!resetConfirmed || resetBusy || !onFactoryReset}
                onClick={async () => {
                  if (!onFactoryReset) return;
                  setResetError(null);
                  setResetBusy(true);
                  try {
                    await onFactoryReset();
                    setShowResetModal(false);
                  } catch (err) {
                    setResetError(
                      err instanceof Error
                        ? err.message
                        : lang === 'ar'
                        ? 'فشلت عملية مسح البيانات'
                        : 'Failed to wipe data'
                    );
                  } finally {
                    setResetBusy(false);
                  }
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>
                  {resetBusy
                    ? lang === 'ar'
                      ? 'جارٍ المسح...'
                      : 'Wiping...'
                    : lang === 'ar'
                    ? 'تأكيد المسح النهائي'
                    : 'Confirm Wipe'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
