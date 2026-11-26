import React, { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Play, Trash2, X } from 'lucide-react';
import { ASSET_IMAGES, getLevelLabel, parseEmbedVideoUrl } from '../lib/gamification';
import { t } from '../lib/i18n';
import { Language, Lesson, LessonCompletion } from '../types';
import { EmptyState } from './SharedUI';

interface LessonsViewProps {
  lang: Language;
  lessons: Lesson[];
  completions: LessonCompletion[];
  isTeacherPreview?: boolean;
  selectedLesson: Lesson | null;
  onSelectLesson: (lesson: Lesson | null) => void;
  onCompleteLesson: (lesson: Lesson) => Promise<void>;
  onDeleteLesson?: (lessonId: string) => Promise<void>;
}

export const LessonsView: React.FC<LessonsViewProps> = ({
  lang,
  lessons,
  completions,
  isTeacherPreview = false,
  selectedLesson,
  onSelectLesson,
  onCompleteLesson,
  onDeleteLesson,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'completed'>('all');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);

  const completedIds = useMemo(() => new Set(completions.map((c) => c.lessonId)), [completions]);
  const topics = useMemo(() => Array.from(new Set(lessons.map((l) => l.topic).filter(Boolean))), [lessons]);
  const levels = useMemo(() => Array.from(new Set(lessons.map((l) => l.level).filter(Boolean))), [lessons]);

  const filtered = useMemo(() => {
    return lessons.filter((lesson) => {
      const done = completedIds.has(lesson.id);
      if (statusFilter === 'new' && done) return false;
      if (statusFilter === 'completed' && !done) return false;
      if (topicFilter !== 'all' && lesson.topic !== topicFilter) return false;
      if (levelFilter !== 'all' && lesson.level !== levelFilter) return false;
      return true;
    });
  }, [lessons, completedIds, statusFilter, topicFilter, levelFilter]);

  const activePlayer = selectedLesson ? parseEmbedVideoUrl(selectedLesson.videoUrl) : null;
  const selectedDone = selectedLesson ? completedIds.has(selectedLesson.id) : false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t(lang, 'navLessons')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {lang === 'ar'
              ? 'شاهد الدروس التعليمية وأكملها لجمع النقاط وفتح الشارات.'
              : 'Watch English video lessons and complete them to earn points and badges.'}
          </p>
        </div>

        {/* Interactive filter controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto max-w-full">
          <div className="grid grid-cols-3 sm:inline-flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl w-full sm:w-auto max-w-full">
            {(['all', 'new', 'completed'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`min-h-[38px] px-2 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors text-center truncate ${
                  statusFilter === key
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                {key === 'all'
                  ? t(lang, 'filterAll')
                  : key === 'new'
                  ? t(lang, 'filterUncompleted')
                  : t(lang, 'filterCompleted')}
              </button>
            ))}
          </div>

          {topics.length > 0 && (
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-full flex-1 sm:flex-initial"
            >
              <option value="all">{t(lang, 'topicAll')}</option>
              {topics.map((tp) => (
                <option key={tp} value={tp}>
                  {tp}
                </option>
              ))}
            </select>
          )}

          {levels.length > 0 && (
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-full flex-1 sm:flex-initial"
            >
              <option value="all">{t(lang, 'levelAll')}</option>
              {levels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {getLevelLabel(lvl, lang)}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<BookOpen className="w-7 h-7" />} title={t(lang, 'noLessonsYet')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((lesson) => {
            const done = completedIds.has(lesson.id);
            return (
              <div
                key={lesson.id}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col justify-between hover:border-sky-300 dark:hover:border-sky-700 transition-colors"
              >
                <div>
                  <div className="relative aspect-[4/3] bg-sky-50 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={lesson.thumbnailUrl || ASSET_IMAGES.phonicsCover}
                      alt={lang === 'ar' ? lesson.titleAr : lesson.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2 tabular-nums">
                      <span>{getLevelLabel(lesson.level, lang)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{lesson.unit}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {lesson.durationMinutes} {t(lang, 'minutesUnit')}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
                      {lang === 'ar' ? lesson.titleAr : lesson.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                      {lang === 'ar' ? lesson.descriptionAr : lesson.description}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-2 flex items-center justify-between gap-3">
                  <div className="text-sm font-bold tabular-nums">
                    {done ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        {t(lang, 'completedLabel')}
                      </span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        +{lesson.points} {t(lang, 'pointsUnit')} · {t(lang, 'newLabel')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isTeacherPreview && onDeleteLesson && (
                      <button
                        type="button"
                        onClick={() => onDeleteLesson(lesson.id)}
                        className="min-h-[42px] px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-colors"
                        aria-label={t(lang, 'deleteLabel')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectLesson(lesson)}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Play className="w-4 h-4" />
                      <span>{t(lang, 'watchLesson')}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Video Player Modal */}
      {selectedLesson && activePlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {lang === 'ar' ? selectedLesson.titleAr : selectedLesson.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                  {getLevelLabel(selectedLesson.level, lang)} · {selectedLesson.unit} ·{' '}
                  {selectedLesson.topic} · +{selectedLesson.points} {t(lang, 'pointsUnit')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectLesson(null)}
                className="min-h-[44px] min-w-[44px] rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-950">
                {activePlayer.kind === 'iframe' ? (
                  <iframe
                    src={activePlayer.src}
                    title={selectedLesson.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video src={activePlayer.src} controls className="w-full h-full" />
                )}
              </div>

              {(selectedLesson.description || selectedLesson.descriptionAr) && (
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {lang === 'ar' ? selectedLesson.descriptionAr : selectedLesson.description}
                  </p>
                </div>
              )}

              {(selectedLesson.teacherNotes || selectedLesson.teacherNotesAr) && (
                <div className="rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/70 dark:border-sky-800/60 p-4">
                  <p className="text-xs font-bold text-sky-800 dark:text-sky-300 mb-1">
                    {t(lang, 'teacherNotesTitle')}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line">
                    {lang === 'ar' ? selectedLesson.teacherNotesAr : selectedLesson.teacherNotes}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                {!isTeacherPreview && (
                  <button
                    type="button"
                    disabled={selectedDone || submitting}
                    onClick={async () => {
                      setSubmitting(true);
                      try {
                        await onCompleteLesson(selectedLesson);
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    className={`min-h-[48px] px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-colors ${
                      selectedDone
                        ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 cursor-default'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>
                      {selectedDone
                        ? t(lang, 'alreadyCompleted')
                        : submitting
                        ? t(lang, 'loadingText')
                        : `${t(lang, 'completeAndClaim')} (+${selectedLesson.points})`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
