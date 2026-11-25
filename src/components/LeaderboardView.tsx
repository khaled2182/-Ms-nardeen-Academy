import React, { useMemo, useState } from 'react';
import { Crown, Medal, Trophy } from 'lucide-react';
import {
  ASSET_IMAGES,
  getEffectiveMonthlyPoints,
  getEffectiveWeeklyPoints,
  getLevelLabel,
} from '../lib/gamification';
import { t } from '../lib/i18n';
import { Language, StudentProfile } from '../types';
import { AvatarImage, EmptyState } from './SharedUI';

interface LeaderboardViewProps {
  lang: Language;
  students: StudentProfile[];
  currentStudentId?: string;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  lang,
  students,
  currentStudentId,
}) => {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all'>('weekly');

  const ranked = useMemo(() => {
    const active = students.filter((s) => s.isActive);
    const getScore = (s: StudentProfile) => {
      if (period === 'weekly') return getEffectiveWeeklyPoints(s);
      if (period === 'monthly') return getEffectiveMonthlyPoints(s);
      return s.totalPoints;
    };

    return [...active]
      .sort((a, b) => {
        const diff = getScore(b) - getScore(a);
        if (diff !== 0) return diff;
        return b.lifetimePoints - a.lifetimePoints;
      })
      .map((s, idx) => ({
        student: s,
        score: getScore(s),
        rank: idx + 1,
      }));
  }, [students, period]);

  const top1 = ranked[0];
  const top2 = ranked[1];
  const top3 = ranked[2];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t(lang, 'leaderboardTitle')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t(lang, 'leaderboardSubtitle')}
          </p>
        </div>

        {/* Timeframe Segmented Switch */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl self-start">
          {(['weekly', 'monthly', 'all'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setPeriod(tab)}
              className={`min-h-[40px] px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                period === tab
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {tab === 'weekly'
                ? t(lang, 'tabWeekly')
                : tab === 'monthly'
                ? t(lang, 'tabMonthly')
                : t(lang, 'tabAllTime')}
            </button>
          ))}
        </div>
      </div>

      {ranked.length === 0 ? (
        <EmptyState icon={<Trophy className="w-7 h-7" />} title={t(lang, 'noStudentsYet')} />
      ) : (
        <>
          {/* #1 Champion Radiant Showcase + Top 3 Podium */}
          <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              {/* #2 Silver Podium */}
              <div className="order-2 md:order-1 flex flex-col items-center text-center">
                {top2 ? (
                  <div className="w-full rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 p-5 flex flex-col items-center">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-300 font-bold text-sm mb-3">
                      <Medal className="w-4 h-4 text-slate-400" />
                      <span>#2</span>
                    </div>
                    <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 p-2 mb-3 flex items-center justify-center">
                      <AvatarImage
                        src={top2.student.photoURL}
                        alt={top2.student.displayName}
                        className="w-full h-full object-contain"
                        transparentStage
                      />
                    </div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white truncate max-w-full">
                      {top2.student.displayName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {getLevelLabel(top2.student.level, lang)}
                    </p>
                    <p className="mt-2 text-xl font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                      {top2.score} {t(lang, 'pointsUnit')}
                    </p>
                  </div>
                ) : (
                  <div className="hidden md:block" />
                )}
              </div>

              {/* #1 Gold Champion - Prominent Transparent PNG Showcase with Radiant Frame */}
              <div className="order-1 md:order-2 flex flex-col items-center text-center">
                {top1 && (
                  <div className="w-full rounded-3xl champion-halo border border-amber-300/70 dark:border-amber-500/40 p-6 flex flex-col items-center relative overflow-hidden">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-sm mb-3">
                      <Crown className="w-5 h-5 text-amber-500" />
                      <span>
                        #1 · {t(lang, 'championBanner')}
                      </span>
                    </div>

                    {/* Transparent PNG Cutout Stage with Luminous Frame */}
                    <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full champion-glow-ring bg-white/55 dark:bg-slate-900/55 backdrop-blur-sm p-3 mb-4 flex items-center justify-center">
                      <AvatarImage
                        src={top1.student.photoURL}
                        alt={top1.student.displayName}
                        className="w-full h-full object-contain drop-shadow-md"
                        transparentStage
                      />
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                      <img
                        src={ASSET_IMAGES.trophyCrest}
                        alt="Trophy"
                        referrerPolicy="no-referrer"
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        {top1.student.displayName}
                      </h2>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {getLevelLabel(top1.student.level, lang)}
                    </p>

                    <p className="mt-2.5 text-2xl font-bold text-amber-600 dark:text-amber-300 tabular-nums">
                      {top1.score} {t(lang, 'pointsUnit')}
                    </p>
                  </div>
                )}
              </div>

              {/* #3 Bronze Podium */}
              <div className="order-3 flex flex-col items-center text-center">
                {top3 ? (
                  <div className="w-full rounded-3xl bg-amber-50/50 dark:bg-slate-800/60 border border-amber-200/70 dark:border-slate-700 p-5 flex flex-col items-center">
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-sm mb-3">
                      <Medal className="w-4 h-4 text-amber-600" />
                      <span>#3</span>
                    </div>
                    <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-900 border-2 border-amber-300/80 dark:border-amber-700/60 p-2 mb-3 flex items-center justify-center">
                      <AvatarImage
                        src={top3.student.photoURL}
                        alt={top3.student.displayName}
                        className="w-full h-full object-contain"
                        transparentStage
                      />
                    </div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white truncate max-w-full">
                      {top3.student.displayName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {getLevelLabel(top3.student.level, lang)}
                    </p>
                    <p className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {top3.score} {t(lang, 'pointsUnit')}
                    </p>
                  </div>
                ) : (
                  <div className="hidden md:block" />
                )}
              </div>
            </div>
          </section>

          {/* Complete Ranked List */}
          <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {ranked.map(({ student, score, rank }) => {
                const isSelf = student.uid === currentStudentId;
                return (
                  <div
                    key={student.uid}
                    className={`px-5 py-4 flex items-center justify-between gap-4 ${
                      isSelf ? 'bg-sky-50/70 dark:bg-sky-950/40' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span
                        className={`w-9 text-center font-bold text-base tabular-nums shrink-0 ${
                          rank === 1
                            ? 'text-amber-500'
                            : rank === 2
                            ? 'text-slate-500 dark:text-slate-300'
                            : rank === 3
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        #{rank}
                      </span>
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 shrink-0 flex items-center justify-center">
                        <AvatarImage
                          src={student.photoURL}
                          alt={student.displayName}
                          className="w-full h-full object-contain"
                          transparentStage
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                          {student.displayName}{' '}
                          {isSelf && (
                            <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                              ({lang === 'ar' ? 'أنت' : 'You'})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {getLevelLabel(student.level, lang)} · {student.completedLessonsCount}{' '}
                          {t(lang, 'completedLessons')}
                        </p>
                      </div>
                    </div>

                    <div className="text-end shrink-0">
                      <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                        {score} {t(lang, 'pointsUnit')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
