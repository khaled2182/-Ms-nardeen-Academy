import React, { useState } from 'react';
import { CheckCircle2, Clock, Gift, Star, XCircle } from 'lucide-react';
import { ASSET_IMAGES } from '../lib/gamification';
import { t } from '../lib/i18n';
import { Language, RedemptionRequest, RewardItem, StudentProfile } from '../types';
import { EmptyState } from './SharedUI';

interface RewardsStoreViewProps {
  lang: Language;
  student: StudentProfile;
  rewards: RewardItem[];
  redemptions: RedemptionRequest[];
  isTeacherPreview?: boolean;
  onRedeem: (reward: RewardItem) => Promise<void>;
}

export const RewardsStoreView: React.FC<RewardsStoreViewProps> = ({
  lang,
  student,
  rewards,
  redemptions,
  isTeacherPreview = false,
  onRedeem,
}) => {
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t(lang, 'rewardsTitle')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t(lang, 'rewardsSubtitle')}
          </p>
        </div>
        <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 px-4 py-2.5 flex items-center gap-2 self-start">
          <Star className="w-5 h-5 text-amber-500" />
          <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
            {student.totalPoints} {t(lang, 'pointsUnit')}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        {t(lang, 'requestSentNotice')}
      </p>

      {rewards.length === 0 ? (
        <EmptyState icon={<Gift className="w-7 h-7" />} title={t(lang, 'noRewardsYet')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rewards.map((reward) => {
            const canAfford = student.totalPoints >= reward.costPoints;
            const pendingExists = redemptions.some(
              (r) => r.rewardId === reward.id && r.status === 'pending'
            );

            return (
              <div
                key={reward.id}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[4/3] bg-violet-50 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={reward.imageUrl || ASSET_IMAGES.rewardGift}
                      alt={lang === 'ar' ? reward.titleAr : reward.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      {reward.category === 'physical'
                        ? t(lang, 'physicalGift')
                        : t(lang, 'virtualGift')}
                    </p>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                      {lang === 'ar' ? reward.titleAr : reward.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                      {lang === 'ar' ? reward.descriptionAr : reward.description}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-2 flex items-center justify-between gap-3">
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                    {reward.costPoints} {t(lang, 'pointsUnit')}
                  </span>

                  {!isTeacherPreview && (
                    <button
                      type="button"
                      disabled={!canAfford || pendingExists || submittingId === reward.id}
                      onClick={async () => {
                        setSubmittingId(reward.id);
                        try {
                          await onRedeem(reward);
                        } finally {
                          setSubmittingId(null);
                        }
                      }}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {submittingId === reward.id
                        ? t(lang, 'loadingText')
                        : pendingExists
                        ? t(lang, 'pendingLabel')
                        : canAfford
                        ? t(lang, 'redeemReward')
                        : t(lang, 'insufficientPoints')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Redemption History */}
      {redemptions.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t(lang, 'myRedemptions')}
          </h2>
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {redemptions.map((req) => (
              <div key={req.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    {lang === 'ar' ? req.rewardTitleAr : req.rewardTitle}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                    {req.costPoints} {t(lang, 'pointsUnit')}
                    {req.teacherNote ? ` · ${req.teacherNote}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold shrink-0">
                  {req.status === 'approved' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      {t(lang, 'approvedLabel')}
                    </span>
                  ) : req.status === 'rejected' ? (
                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <XCircle className="w-4 h-4" />
                      {t(lang, 'rejectedLabel')}
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {t(lang, 'pendingLabel')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
