import React, { useState } from 'react';
import { AlertCircle, Bell, CheckCircle2, Phone, Sparkles, X } from 'lucide-react';
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

  const isTransparentCutout =
    transparentStage &&
    (src.startsWith('data:image/svg') || src.startsWith('data:image/png'));

  const fitClass = transparentStage
    ? isTransparentCutout
      ? 'object-contain bg-transparent'
      : 'object-cover'
    : '';

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} ${fitClass}`}
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

export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.82 14.01c-.25.7-1.44 1.34-2 1.42-.51.08-1.15.11-1.85-.11-.43-.14-.98-.32-1.69-.63-2.97-1.28-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07 0-1.46.77-2.18 1.04-2.48.27-.3.6-.37.8-.37.2 0 .4 0 .58.01.19.01.44-.07.69.53.25.6.85 2.08.93 2.23.08.15.13.33.03.53-.1.2-.15.33-.3.5-.15.18-.32.39-.45.53-.15.15-.31.32-.13.62.17.3.78 1.29 1.67 2.09 1.15 1.02 2.12 1.34 2.42 1.49.3.15.48.13.66-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.68-.15.28.1 1.75.83 2.05.98.3.15.5.23.58.35.07.12.07.7-.18 1.4z" />
  </svg>
);

export const ContactSupportSection: React.FC<{
  lang: Language;
  compact?: boolean;
}> = ({ lang, compact = false }) => {
  const phoneDisplay = '01099897764';
  const whatsappDisplay = '01062007749';

  return (
    <section
      className={`rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 ${
        compact ? 'p-5 sm:p-6 shadow-sm' : 'p-5 sm:p-6'
      }`}
    >
      <div className="mb-3.5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          {lang === 'ar' ? 'تواصل معنا' : 'Contact Us'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {lang === 'ar'
            ? 'للاستفسارات والاشتراك والدعم عبر الهاتف أو واتساب'
            : 'Reach us directly by phone call or WhatsApp'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href={`tel:${phoneDisplay}`}
          className="min-h-[60px] rounded-2xl bg-sky-50/80 hover:bg-sky-100/80 dark:bg-sky-950/35 dark:hover:bg-sky-950/55 border border-sky-200/80 dark:border-sky-800/70 px-4 py-3 flex items-center gap-3 transition-colors group"
        >
          <span className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <Phone className="w-5 h-5" />
          </span>
          <span className="min-w-0 flex flex-col">
            <span className="text-xs font-semibold text-sky-800 dark:text-sky-300">
              {lang === 'ar' ? 'اتصال هاتفي' : 'Phone Call'}
            </span>
            <span
              dir="ltr"
              className="text-sm font-bold text-slate-900 dark:text-white tabular-nums tracking-wide"
            >
              {phoneDisplay}
            </span>
          </span>
        </a>

        <a
          href="https://wa.me/201062007749"
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[60px] rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 dark:bg-emerald-950/35 dark:hover:bg-emerald-950/55 border border-emerald-200/80 dark:border-emerald-800/70 px-4 py-3 flex items-center gap-3 transition-colors group"
        >
          <span className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
            <WhatsAppIcon className="w-5 h-5" />
          </span>
          <span className="min-w-0 flex flex-col">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              {lang === 'ar' ? 'واتساب' : 'WhatsApp'}
            </span>
            <span
              dir="ltr"
              className="text-sm font-bold text-slate-900 dark:text-white tabular-nums tracking-wide"
            >
              {whatsappDisplay}
            </span>
          </span>
        </a>
      </div>
    </section>
  );
};

