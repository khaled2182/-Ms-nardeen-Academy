import React, { useState } from 'react';
import { Award, BookCheck, Gift, History, Save, Star, Trophy, Upload } from 'lucide-react';
import {
  BADGES_CATALOG,
  compressTransparentImageFile,
  getLevelLabel,
  TRANSPARENT_AVATAR_PRESETS,
} from '../lib/gamification';
import { t } from '../lib/i18n';
import {
  Language,
  LessonCompletion,
  PointTransaction,
  RedemptionRequest,
  StudentProfile,
} from '../types';
import { AvatarImage } from './SharedUI';

interface ProfileViewProps {
  lang: Language;
  student: StudentProfile;
  rank: number;
  completions: LessonCompletion[];
  transactions: PointTransaction[];
  redemptions: RedemptionRequest[];
  isTeacherPreview?: boolean;
  onUpdateProfile: (displayName: string, photoURL: string) => Promise<void>;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  lang,
  student,
  rank,
  completions,
  transactions,
  redemptions,
  isTeacherPreview = false,
  onUpdateProfile,
}) => {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(student.displayName);
  const [photoInput, setPhotoInput] = useState(student.photoURL);
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const earnedBadges = BADGES_CATALOG.filter((b) => student.badges.includes(b.id));
  const approvedGifts = redemptions.filter((r) => r.status === 'approved');

  const handlePngUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    try {
      const compressed = await compressTransparentImageFile(file);
      setPhotoInput(compressed);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to process image');
    }
  };

  return (
    <div className="space-y-6">
      {/* Identity Header Card */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200/70 dark:border-sky-800/60 p-2 shrink-0 flex items-center justify-center">
              <AvatarImage
                src={editing ? photoInput : student.photoURL}
                alt={student.displayName}
                className="w-full h-full object-contain"
                transparentStage
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {student.displayName}
              </h1>
              <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mt-1">
                {getLevelLabel(student.level, lang)}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                  <Star className="w-4 h-4" />
                  {student.totalPoints} {t(lang, 'pointsUnit')}
                </span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1 font-bold">
                  <Trophy className="w-4 h-4 text-violet-500" />
                  {t(lang, 'rankPrefix')} #{rank || '-'}
                </span>
              </div>
            </div>
          </div>

          {!isTeacherPreview && (
            <button
              type="button"
              onClick={() => {
                setNameInput(student.displayName);
                setPhotoInput(student.photoURL);
                setEditing(!editing);
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-semibold text-slate-900 dark:text-white self-start transition-colors"
            >
              {editing ? t(lang, 'cancel') : t(lang, 'editLabel')}
            </button>
          )}
        </div>

        {editing && (
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  {lang === 'ar' ? 'الاسم المعروض' : 'Display Name'}
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full min-h-[44px] px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  {t(lang, 'uploadTransparentPng')}
                </label>
                <label className="min-h-[44px] px-4 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-sm font-semibold flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'اختر صورة من المعرض' : 'Choose Photo from Gallery'}</span>
                  <input type="file" accept="image/*" onChange={handlePngUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                {lang === 'ar' ? 'أو اختر شخصية شفافة جاهزة:' : 'Or choose a transparent character avatar:'}
              </p>
              <div className="flex flex-wrap gap-3">
                {TRANSPARENT_AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setPhotoInput(preset.url)}
                    className={`w-16 h-16 rounded-2xl p-1.5 border-2 transition-colors ${
                      photoInput === preset.url
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                    }`}
                  >
                    <img src={preset.url} alt={preset.labelEn} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            </div>

            {uploadError && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{uploadError}</p>
            )}

            <button
              type="button"
              disabled={saving || !nameInput.trim()}
              onClick={async () => {
                setSaving(true);
                try {
                  await onUpdateProfile(nameInput, photoInput);
                  setEditing(false);
                } finally {
                  setSaving(false);
                }
              }}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? t(lang, 'loadingText') : t(lang, 'saveChanges')}</span>
            </button>
          </div>
        )}
      </section>

      {/* Achievement Badges */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-violet-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t(lang, 'earnedBadges')} ({earnedBadges.length}/{BADGES_CATALOG.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BADGES_CATALOG.map((badge) => {
            const unlocked = student.badges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`rounded-2xl p-4 border transition-opacity ${
                  unlocked
                    ? 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50'
                    : 'border-dashed border-slate-200 dark:border-slate-800 opacity-50'
                }`}
              >
                <p className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                  {lang === 'ar' ? badge.titleAr : badge.titleEn}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'ar' ? badge.descAr : badge.descEn}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completed Lessons */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookCheck className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t(lang, 'completedLessonsList')} ({completions.length})
            </h2>
          </div>

          {completions.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'لم تكمل أي درس بعد.' : 'No completed lessons yet.'}
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {completions.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {c.lessonTitle}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                    +{c.pointsAwarded} {t(lang, 'pointsUnit')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Redeemed Gifts */}
        <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t(lang, 'redeemedGiftsList')} ({approvedGifts.length})
            </h2>
          </div>

          {approvedGifts.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'لم تستبدل أي هدية بعد.' : 'No redeemed rewards yet.'}
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {approvedGifts.map((gift) => (
                <div key={gift.id} className="py-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {lang === 'ar' ? gift.rewardTitleAr : gift.rewardTitle}
                  </span>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
                    -{gift.costPoints} {t(lang, 'pointsUnit')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Points History Ledger */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-sky-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t(lang, 'pointsHistory')}
          </h2>
        </div>

        {transactions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {lang === 'ar' ? 'لا توجد حركات نقاط مسجلة بعد.' : 'No point transactions recorded yet.'}
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {transactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {lang === 'ar' ? tx.reasonAr : tx.reason}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {tx.monthKey} · {tx.sourceType}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold tabular-nums shrink-0 ${
                    tx.amount >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} {t(lang, 'pointsUnit')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
