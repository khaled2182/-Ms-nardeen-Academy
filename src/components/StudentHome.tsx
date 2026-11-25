import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookCheck,
  Bell,
  ClipboardList,
  Play,
  Star,
  Trophy,
} from 'lucide-react';
import { ASSET_IMAGES, getEffectiveWeeklyPoints, getLevelLabel } from '../lib/gamification';
import { t } from '../lib/i18n';
import {
  AcademyNote,
  AcademyTask,
  AppTab,
  Language,
  Lesson,
  LessonCompletion,
  StudentProfile,
  TaskSubmission,
} from '../types';
import { AvatarImage, EmptyState, NotificationPermissionCard } from './SharedUI';

interface StudentHomeProps {
  lang: Language;
  student: StudentProfile;
  rank: number;
  totalStudents: number;
  lessons: Lesson[];
  completions: LessonCompletion[];
  notes: AcademyNote[];
  readNoteIds: Set<string>;
  tasks: AcademyTask[];
  submissions: TaskSubmission[];
  notificationsEnabled: boolean;
  onEnableNotifications: () => Promise<void>;
  onNavigate: (tab: AppTab) => void;
  onOpenLesson: (lesson: Lesson) => void;
  onOpenTask: (task: AcademyTask) => void;
}

export const StudentHome: React.FC<StudentHomeProps> = ({
  lang,
  student,
  rank,
  totalStudents,
  lessons,
  completions,
  notes,
  readNoteIds,
  tasks,
  submissions,
  notificationsEnabled,
  onEnableNotifications,
  onNavigate,
  onOpenLesson,
  onOpenTask,
}) => {
  const completedIds = new Set(completions.map((c) => c.lessonId));
  const submittedTaskIds = new Set(submissions.map((s) => s.taskId));
  const latestLessons = lessons.slice(0, 4);
  const latestNotes = notes.slice(0, 4);
  const openTasks = tasks.filter((tsk) => !submittedTaskIds.has(tsk.id)).slice(0, 4);
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6">
      <NotificationPermissionCard
        lang={lang}
        enabled={notificationsEnabled}
        onEnable={onEnableNotifications}
      />

      {/* Welcome Hero Card */}
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200/70 dark:border-sky-800/60 p-1.5 shrink-0 flex items-center justify-center">
              <AvatarImage
                src={student.photoURL}
                alt={student.displayName}
                className="w-full h-full rounded-2xl object-contain"
                transparentStage
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-sky-600 dark:text-sky-400 mb-1">
                {t(lang, 'greetingMorning')}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-1.5">
                {student.displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-violet-600 dark:text-violet-400">
                  {getLevelLabel(student.level, lang)}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {t(lang, 'rankPrefix')} #{rank || '-'} {lang === 'ar' ? 'من' : 'of'} {totalStudents}
                </span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {student.badges.length} {lang === 'ar' ? 'شارات' : 'badges'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('lessons')}
              className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>{t(lang, 'navLessons')}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('leaderboard')}
              className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <Trophy className="w-4 h-4" />
              <span>{t(lang, 'navLeaderboard')}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('rewards')}
              className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <Award className="w-4 h-4" />
              <span>{t(lang, 'navRewards')}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('notes')}
              className="min-h-[46px] px-4 py-2.5 rounded-2xl bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/40 dark:hover:bg-violet-900/60 text-violet-900 dark:text-violet-200 text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span>{t(lang, 'navNotes')}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4-column KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t(lang, 'totalPoints')}
            </span>
            <Star className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {student.totalPoints}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            +{getEffectiveWeeklyPoints(student)} {t(lang, 'weeklyPoints')}
          </p>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t(lang, 'currentRank')}
            </span>
            <Trophy className="w-5 h-5 text-violet-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            #{rank || '-'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {lang === 'ar' ? `بين ${totalStudents} طالب` : `Among ${totalStudents} learners`}
          </p>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t(lang, 'completedLessons')}
            </span>
            <BookCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {student.completedLessonsCount}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {lang === 'ar' ? `من أصل ${lessons.length} درس` : `of ${lessons.length} lessons`}
          </p>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t(lang, 'earnedBadges')}
            </span>
            <Award className="w-5 h-5 text-sky-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {student.badges.length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {getLevelLabel(student.level, lang)}
          </p>
        </div>
      </section>

      {/* Main Content Split: Latest Videos + Tasks & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Latest Video Lessons */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t(lang, 'latestVideos')}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('lessons')}
              className="text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              <span>{t(lang, 'viewAll')}</span>
              <ArrowIcon className="w-4 h-4" />
            </button>
          </div>

          {latestLessons.length === 0 ? (
            <EmptyState title={t(lang, 'noLessonsYet')} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {latestLessons.map((lesson) => {
                const isDone = completedIds.has(lesson.id);
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => onOpenLesson(lesson)}
                    className="text-start group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden hover:border-sky-300 dark:hover:border-sky-700 transition-all"
                  >
                    <div className="relative aspect-[4/3] bg-sky-50 dark:bg-slate-800 overflow-hidden">
                      <img
                        src={lesson.thumbnailUrl || ASSET_IMAGES.phonicsCover}
                        alt={lang === 'ar' ? lesson.titleAr : lesson.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base line-clamp-1 mb-1">
                        {lang === 'ar' ? lesson.titleAr : lesson.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        <span>{lesson.topic}</span>
                        <span aria-hidden="true">·</span>
                        <span>+{lesson.points} {t(lang, 'pointsUnit')}</span>
                        <span aria-hidden="true">·</span>
                        <span className={isDone ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-sky-600 dark:text-sky-400 font-semibold'}>
                          {isDone ? t(lang, 'completedLabel') : t(lang, 'newLabel')}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Available Challenges + Latest Notes */}
        <section className="lg:col-span-5 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t(lang, 'availableTasks')}
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('tasks')}
                className="text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>{t(lang, 'viewAll')}</span>
                <ArrowIcon className="w-4 h-4" />
              </button>
            </div>

            {openTasks.length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="w-6 h-6" />}
                title={t(lang, 'noTasksYet')}
              />
            ) : (
              <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {openTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onOpenTask(task)}
                    className="w-full text-start p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-3 first:rounded-t-3xl last:rounded-b-3xl"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {lang === 'ar' ? task.titleAr : task.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                        {task.type === 'quiz'
                          ? lang === 'ar'
                            ? 'اختبار تفاعلي'
                            : 'Interactive Quiz'
                          : lang === 'ar'
                          ? 'واجب منزلي'
                          : 'Homework'}{' '}
                        · +{task.points} {t(lang, 'pointsUnit')}
                      </p>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-xs font-semibold shrink-0">
                      {task.type === 'quiz' ? t(lang, 'startQuiz') : t(lang, 'submitHomework')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t(lang, 'latestNotes')}
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('notes')}
                className="text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>{t(lang, 'viewAll')}</span>
                <ArrowIcon className="w-4 h-4" />
              </button>
            </div>

            {latestNotes.length === 0 ? (
              <EmptyState icon={<Bell className="w-6 h-6" />} title={t(lang, 'noNotesYet')} />
            ) : (
              <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {latestNotes.map((note) => {
                  const isUnread = !readNoteIds.has(note.id);
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => onNavigate('notes')}
                      className="w-full text-start p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors first:rounded-t-3xl last:rounded-b-3xl"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {lang === 'ar' ? note.titleAr : note.title}
                        </p>
                        {isUnread && (
                          <span className="text-xs font-bold text-sky-600 dark:text-sky-400 shrink-0">
                            {t(lang, 'unreadLabel')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {lang === 'ar' ? note.contentAr : note.content}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
