import React, { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, ExternalLink, HelpCircle, X } from 'lucide-react';
import { getLevelLabel } from '../lib/gamification';
import { t } from '../lib/i18n';
import { AcademyTask, Language, TaskSubmission } from '../types';
import { EmptyState } from './SharedUI';

interface TasksViewProps {
  lang: Language;
  tasks: AcademyTask[];
  submissions: TaskSubmission[];
  isTeacherPreview?: boolean;
  selectedTask: AcademyTask | null;
  onSelectTask: (task: AcademyTask | null) => void;
  onSubmitQuiz: (task: AcademyTask, selectedAnswers: number[]) => Promise<void>;
  onSubmitHomework: (task: AcademyTask, answerText: string) => Promise<void>;
}

export const TasksView: React.FC<TasksViewProps> = ({
  lang,
  tasks,
  submissions,
  isTeacherPreview = false,
  selectedTask,
  onSelectTask,
  onSubmitQuiz,
  onSubmitHomework,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'quiz' | 'homework'>('all');
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [homeworkAnswer, setHomeworkAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const subByTask = useMemo(() => {
    const map = new Map<string, TaskSubmission>();
    submissions.forEach((s) => map.set(s.taskId, s));
    return map;
  }, [submissions]);

  const filtered = useMemo(() => {
    return tasks.filter((tsk) => (filterType === 'all' ? true : tsk.type === filterType));
  }, [tasks, filterType]);

  const openTaskModal = (task: AcademyTask) => {
    setQuizAnswers(new Array(task.questions.length).fill(-1));
    setHomeworkAnswer('');
    onSelectTask(task);
  };

  const activeSub = selectedTask ? subByTask.get(selectedTask.id) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t(lang, 'navTasks')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {lang === 'ar'
              ? 'أجب عن الاختبارات التفاعلية وسلم الواجبات لكسب النقاط.'
              : 'Complete interactive English quizzes and homework challenges to earn points.'}
          </p>
        </div>

        <div className="grid grid-cols-3 sm:inline-flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl w-full sm:w-auto max-w-full">
          {(['all', 'quiz', 'homework'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilterType(k)}
              className={`min-h-[38px] px-2 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors text-center truncate ${
                filterType === k
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {k === 'all'
                ? t(lang, 'filterAll')
                : k === 'quiz'
                ? lang === 'ar'
                  ? 'اختبارات'
                  : 'Quizzes'
                : lang === 'ar'
                ? 'واجبات'
                : 'Homework'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<ClipboardList className="w-7 h-7" />} title={t(lang, 'noTasksYet')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((task) => {
            const sub = subByTask.get(task.id);
            return (
              <div
                key={task.id}
                className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2 tabular-nums">
                    <span>
                      {task.type === 'quiz'
                        ? lang === 'ar'
                          ? 'اختبار تفاعلي'
                          : 'Interactive Quiz'
                        : lang === 'ar'
                        ? 'واجب منزلي'
                        : 'Homework'}{' '}
                      · {getLevelLabel(task.level, lang)}
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      +{task.points} {t(lang, 'pointsUnit')}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
                    {lang === 'ar' ? task.titleAr : task.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                    {lang === 'ar' ? task.descriptionAr : task.description}
                  </p>
                  {task.dueDate && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 tabular-nums">
                      {lang === 'ar' ? 'الموعد:' : 'Due:'} {task.dueDate}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {sub ? (
                    <div className="text-xs font-bold tabular-nums">
                      {sub.status === 'completed' || sub.status === 'approved' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          {t(lang, 'completedLabel')} (+{sub.pointsAwarded} {t(lang, 'pointsUnit')})
                        </span>
                      ) : sub.status === 'pending' ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          {t(lang, 'pendingLabel')}
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400">
                          {t(lang, 'rejectedLabel')}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                      {task.type === 'quiz'
                        ? `${task.questions.length} ${lang === 'ar' ? 'أسئلة' : 'questions'}`
                        : t(lang, 'newLabel')}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => openTaskModal(task)}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    {sub
                      ? lang === 'ar'
                        ? 'عرض التفاصيل'
                        : 'View Details'
                      : task.type === 'quiz'
                      ? t(lang, 'startQuiz')
                      : t(lang, 'submitHomework')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task / Quiz Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {lang === 'ar' ? selectedTask.titleAr : selectedTask.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  +{selectedTask.points} {t(lang, 'pointsUnit')} · {getLevelLabel(selectedTask.level, lang)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectTask(null)}
                className="min-h-[44px] min-w-[44px] rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {lang === 'ar' ? selectedTask.descriptionAr : selectedTask.description}
              </p>

              {selectedTask.attachmentUrl && (
                <a
                  href={selectedTask.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{t(lang, 'openAttachment')}</span>
                </a>
              )}

              {activeSub ? (
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-4 space-y-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'حالة التسليم:' : 'Submission Status:'}{' '}
                    {activeSub.status === 'completed' || activeSub.status === 'approved'
                      ? t(lang, 'completedLabel')
                      : activeSub.status === 'pending'
                      ? t(lang, 'pendingLabel')
                      : t(lang, 'rejectedLabel')}
                  </p>
                  {activeSub.taskType === 'quiz' ? (
                    <p className="text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                      {lang === 'ar' ? 'النتيجة:' : 'Score:'} {activeSub.score} / {activeSub.maxScore} ·{' '}
                      +{activeSub.pointsAwarded} {t(lang, 'pointsUnit')}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">
                      {activeSub.answerText}
                    </p>
                  )}
                  {activeSub.teacherFeedback && (
                    <p className="text-sm text-sky-700 dark:text-sky-300 pt-2 border-t border-slate-200 dark:border-slate-700">
                      {lang === 'ar' ? 'ملاحظة المعلمة:' : 'Teacher Feedback:'} {activeSub.teacherFeedback}
                    </p>
                  )}
                </div>
              ) : selectedTask.type === 'quiz' ? (
                <div className="space-y-5">
                  {selectedTask.questions.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      {lang === 'ar' ? 'لا توجد أسئلة مضافة بعد.' : 'No questions added yet.'}
                    </p>
                  ) : (
                    selectedTask.questions.map((q, qIdx) => (
                      <div
                        key={qIdx}
                        className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3"
                      >
                        <div className="flex items-start gap-2">
                          <HelpCircle className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                          <p className="font-bold text-sm text-slate-900 dark:text-white">
                            {qIdx + 1}. {lang === 'ar' ? q.questionAr || q.question : q.question}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {q.options.map((opt, oIdx) => {
                            const selected = quizAnswers[qIdx] === oIdx;
                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => {
                                  const next = [...quizAnswers];
                                  next[qIdx] = oIdx;
                                  setQuizAnswers(next);
                                }}
                                className={`min-h-[44px] px-4 py-2.5 rounded-xl text-start text-sm font-medium border transition-colors ${
                                  selected
                                    ? 'bg-violet-600 border-violet-600 text-white'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-violet-400'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}

                  {!isTeacherPreview && selectedTask.questions.length > 0 && (
                    <button
                      type="button"
                      disabled={submitting || quizAnswers.some((a) => a === -1)}
                      onClick={async () => {
                        setSubmitting(true);
                        try {
                          await onSubmitQuiz(selectedTask, quizAnswers);
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      className="w-full min-h-[48px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors disabled:opacity-50"
                    >
                      {submitting ? t(lang, 'loadingText') : t(lang, 'submitNow')}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <textarea
                    rows={4}
                    value={homeworkAnswer}
                    onChange={(e) => setHomeworkAnswer(e.target.value)}
                    placeholder={t(lang, 'homeworkAnswerPlaceholder')}
                    className="w-full rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  {!isTeacherPreview && (
                    <button
                      type="button"
                      disabled={submitting || homeworkAnswer.trim().length === 0}
                      onClick={async () => {
                        setSubmitting(true);
                        try {
                          await onSubmitHomework(selectedTask, homeworkAnswer);
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      className="w-full min-h-[48px] rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm transition-colors disabled:opacity-50"
                    >
                      {submitting ? t(lang, 'loadingText') : t(lang, 'submitNow')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
