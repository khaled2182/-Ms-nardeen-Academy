import React, { useState } from 'react';
import { AlertCircle, Bell, CheckCircle2, Sparkles, X } from 'lucide-react';
import { Language } from '../types';
import { t } from '../lib/i18n';

export const AvatarImage: React.FC<{
  src?: string;
  alt: string;
  className?: string;
  transparentStage?: boolean;
}> = ({ src, alt, className = 'w-12 h-12 rounded-2xl object-cover', transparentStage = false }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const initials = (alt || 'S').trim().slice(0, 2).toUpperCase();
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-sky-400 to-violet-400 text-white font-bold select-none ${className}`}
        aria-label={alt}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} ${transparentStage ? 'object-contain bg-transparent' : ''}`}
    />
  );
};

export const ToastBanner: React.FC<{
  toast: { type: 'success' | 'error'; message: string } | null;
  onDismiss: () => void;
}> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-20 lg:bottom-6 inset-x-4 sm:inset-x-auto sm:end-6 z-50 max-w-md rounded-2xl px-4 py-3.5 shadow-lg border flex items-center gap-3 transition-transform duration-200 ${
        isSuccess
          ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
          : 'bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
      )}
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 sm:p-10 text-center flex flex-col items-center justify-center">
    <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 flex items-center justify-center mb-4">
      {icon || <Sparkles className="w-7 h-7" />}
    </div>
    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">{title}</h3>
    {description && (
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-5">{description}</p>
    )}
    {action}
  </div>
);

export const NotificationPermissionCard: React.FC<{
  lang: Language;
  enabled: boolean;
  onEnable: () => Promise<void>;
}> = ({ lang, enabled, onEnable }) => {
  const [loading, setLoading] = useState(false);

  if (enabled) return null;
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied') {
    return null;
  }

  return (
    <div className="rounded-2xl bg-sky-50/90 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {t(lang, 'notificationsLabel')}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {lang === 'ar'
              ? 'احصل على تنبيهات فورية عند إضافة درس جديد أو منحك نقاطًا.'
              : 'Get instant alerts when Ms Nardeen adds a new video, note, or bonus points.'}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          try {
            await onEnable();
          } finally {
            setLoading(false);
          }
        }}
        className="min-h-[44px] px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-colors disabled:opacity-60"
      >
        {loading ? t(lang, 'loadingText') : t(lang, 'enableNotifications')}
      </button>
    </div>
  );
};
