import React, { useMemo, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Edit3,
  Gift,
  History,
  Megaphone,
  Plus,
  Send,
  Star,
  Trash2,
  Trophy,
  Upload,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import {
  ASSET_IMAGES,
  BADGES_CATALOG,
  compressTransparentImageFile,
  getLevelLabel,
  LEVELS_LIST,
  TRANSPARENT_AVATAR_PRESETS,
} from '../lib/gamification';
import { t } from '../lib/i18n';
import {
  createOrUpdateLesson,
  createOrUpdateReward,
  createOrUpdateTask,
  deleteLesson,
  deleteNote,
  deleteReward,
  deleteTask,
  gradeHomeworkSubmission,
  publishNoteOrAnnouncement,
  reviewRedemptionRequest,
  sendCustomNotification,
  teacherAdjustStudentPoints,
  teacherCreateStudentProfile,
  teacherUpdateStudentProfile,
} from '../services/academyService';
import {
  AcademyNote,
  AcademyTask,
  Language,
  Lesson,
  PointTransaction,
  QuizQuestion,
  RedemptionRequest,
  RewardItem,
  StudentProfile,
  TaskSubmission,
} from '../types';
import { AvatarImage, EmptyState } from './SharedUI';

interface TeacherDashboardProps {
  lang: Language;
  teacherUid: string;
  students: StudentProfile[];
  lessons: Lesson[];
  tasks: AcademyTask[];
  submissions: TaskSubmission[];
  notes: AcademyNote[];
  rewards: RewardItem[];
  redemptions: RedemptionRequest[];
  transactions: PointTransaction[];
  onNotifyToast: (type: 'success' | 'error', message: string) => void;
}

type TeacherTab =
  | 'overview'
  | 'students'
  | 'lessons'
  | 'tasks'
  | 'notes'
  | 'rewards'
  | 'notifications';

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  lang,
  teacherUid,
  students,
  lessons,
  tasks,
  submissions,
  notes,
  rewards,
  redemptions,
  transactions,
  onNotifyToast,
}) => {
  const [activeTab, setActiveTab] = useState<TeacherTab>('overview');
  const [busy, setBusy] = useState(false);

  // Student modals
  const [studentSearch, setStudentSearch] = useState('');
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const [editStudentForm, setEditStudentForm] = useState({
    displayName: '',
    photoURL: '',
    level: 'Beginner',
    badges: [] as string[],
    isActive: true,
  });
  const [pointsModalStudent, setPointsModalStudent] = useState<StudentProfile | null>(null);
  const [pointsDelta, setPointsDelta] = useState<number>(20);
  const [pointsMode, setPointsMode] = useState<'add' | 'deduct'>('add');
  const [pointsReason, setPointsReason] = useState('');
  const [activityModalStudent, setActivityModalStudent] = useState<StudentProfile | null>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    displayName: '',
    photoURL: TRANSPARENT_AVATAR_PRESETS[0].url,
    level: 'Beginner',
    initialPoints: 0,
  });

  // Lesson modal
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    id: '',
    title: '',
    titleAr: '',
    description: '',
    descriptionAr: '',
    videoUrl: '',
    thumbnailUrl: ASSET_IMAGES.phonicsCover as string,
    level: 'Beginner',
    unit: 'Unit 1',
    topic: 'Phonics',
    teacherNotes: '',
    teacherNotesAr: '',
    points: 25,
    durationMinutes: 10,
    isPublished: true,
  });

  // Task modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState<{
    id: string;
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
    type: 'quiz' | 'homework';
    level: string;
    points: number;
    dueDate: string;
    attachmentUrl: string;
    questions: QuizQuestion[];
    isPublished: boolean;
  }>({
    id: '',
    title: '',
    titleAr: '',
    description: '',
    descriptionAr: '',
    type: 'quiz',
    level: 'Beginner',
    points: 30,
    dueDate: '',
    attachmentUrl: '',
    questions: [
      {
        question: 'Which letter starts the word "Apple"?',
        questionAr: 'أي حرف تبدأ به كلمة Apple؟',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
      },
    ],
    isPublished: true,
  });

  // Note form
  const [noteForm, setNoteForm] = useState({
    title: '',
    titleAr: '',
    content: '',
    contentAr: '',
    targetStudentId: 'all',
    category: 'announcement' as 'announcement' | 'note',
    attachmentUrl: '',
    attachmentType: 'none' as 'none' | 'link' | 'image' | 'file',
  });

  // Reward modal
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    id: '',
    title: '',
    titleAr: '',
    description: '',
    descriptionAr: '',
    costPoints: 100,
    category: 'physical' as 'physical' | 'virtual',
    imageUrl: ASSET_IMAGES.rewardGift as string,
    isAvailable: true,
  });

  // Notification form
  const [notifForm, setNotifForm] = useState({
    targetStudentId: 'all',
    title: '',
    titleAr: '',
    body: '',
    bodyAr: '',
    type: 'announcement' as 'video' | 'note' | 'task' | 'announcement' | 'points' | 'reward',
    linkTab: 'home',
  });

  const pendingRedemptions = useMemo(
    () => redemptions.filter((r) => r.status === 'pending'),
    [redemptions]
  );
  const pendingHomework = useMemo(
    () => submissions.filter((s) => s.taskType === 'homework' && s.status === 'pending'),
    [submissions]
  );

  const totalDistributedPoints = useMemo(
    () => students.reduce((sum, s) => sum + s.lifetimePoints, 0),
    [students]
  );

  const sortedByPoints = useMemo(
    () => [...students].sort((a, b) => b.totalPoints - a.totalPoints),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return sortedByPoints;
    return sortedByPoints.filter((s) => s.displayName.toLowerCase().includes(q));
  }, [sortedByPoints, studentSearch]);

  const studentById = useMemo(() => {
    const map = new Map<string, StudentProfile>();
    students.forEach((s) => map.set(s.uid, s));
    return map;
  }, [students]);

  const runAction = async (fn: () => Promise<void>, successMsg: string) => {
    setBusy(true);
    try {
      await fn();
      onNotifyToast('success', successMsg);
    } catch (err) {
      onNotifyToast('error', err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setBusy(false);
    }
  };

  const handlePngUploadFor = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onResult: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressTransparentImageFile(file);
      onResult(compressed);
    } catch (err) {
      onNotifyToast('error', err instanceof Error ? err.message : 'Image upload failed');
    }
  };

  const tabs: { id: TeacherTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: t(lang, 'tTabOverview'), icon: <Trophy className="w-4 h-4" /> },
    { id: 'students', label: t(lang, 'tTabStudents'), icon: <Users className="w-4 h-4" /> },
    { id: 'lessons', label: t(lang, 'tTabLessons'), icon: <BookOpen className="w-4 h-4" /> },
    {
      id: 'tasks',
      label: t(lang, 'tTabTasks'),
      icon: <ClipboardList className="w-4 h-4" />,
      badge: pendingHomework.length,
    },
    { id: 'notes', label: t(lang, 'tTabNotes'), icon: <Megaphone className="w-4 h-4" /> },
    {
      id: 'rewards',
      label: t(lang, 'tTabRewards'),
      icon: <Gift className="w-4 h-4" />,
      badge: pendingRedemptions.length,
    },
    { id: 'notifications', label: t(lang, 'tTabNotifications'), icon: <Bell className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          {t(lang, 'teacherDashboardTitle')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {lang === 'ar'
            ? 'إدارة الطلاب والنقاط والفيديوهات والاختبارات والمتجر والإشعارات.'
            : 'Manage students, points, video lessons, quizzes, rewards, and notifications.'}
        </p>
      </div>

      {/* KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t(lang, 'statStudents')}
            </span>
            <Users className="w-5 h-5 text-sky-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {students.length}
          </p>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t(lang, 'statDistributedPoints')}
            </span>
            <Star className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {totalDistributedPoints}
          </p>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t(lang, 'statPendingActions')}
            </span>
            <Gift className="w-5 h-5 text-violet-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {pendingRedemptions.length + pendingHomework.length}
          </p>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t(lang, 'statLessonsCount')}
            </span>
            <BookOpen className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {lessons.length}
          </p>
        </div>
      </section>

      {/* Horizontal Teacher Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[44px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors ${
              activeTab === tab.id
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {typeof tab.badge === 'number' && tab.badge > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-bold tabular-nums">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {t(lang, 'mostActiveStudents')}
            </h2>
            {sortedByPoints.length === 0 ? (
              <p className="text-sm text-slate-500">{t(lang, 'noStudentsYet')}</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedByPoints.slice(0, 6).map((st, idx) => (
                  <div key={st.uid} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-sm font-bold text-slate-400 tabular-nums">
                        #{idx + 1}
                      </span>
                      <AvatarImage
                        src={st.photoURL}
                        alt={st.displayName}
                        className="w-10 h-10 rounded-xl object-contain bg-slate-50 dark:bg-slate-800 p-0.5"
                        transparentStage
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {st.displayName}
                        </p>
                        <p className="text-xs text-slate-500 tabular-nums">
                          {st.completedLessonsCount} {t(lang, 'completedLessons')}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-sm text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
                      {st.totalPoints} {t(lang, 'pointsUnit')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {t(lang, 'recentTransactions')}
            </h2>
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500">
                {lang === 'ar' ? 'لا توجد حركات نقاط بعد.' : 'No point transactions yet.'}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.slice(0, 8).map((tx) => (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {tx.studentName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {lang === 'ar' ? tx.reasonAr : tx.reason}
                      </p>
                    </div>
                    <span
                      className={`font-bold text-sm tabular-nums shrink-0 ${
                        tx.amount >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: STUDENTS & POINTS */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder={lang === 'ar' ? 'ابحث باسم الطالب...' : 'Search students by name...'}
              className="min-h-[44px] w-full sm:max-w-xs px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowAddStudentModal(true)}
              className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{t(lang, 'createStudentManually')}</span>
            </button>
          </div>

          {filteredStudents.length === 0 ? (
            <EmptyState icon={<Users className="w-7 h-7" />} title={t(lang, 'noStudentsYet')} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStudents.map((st, idx) => (
                <div
                  key={st.uid}
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/50 p-1.5 shrink-0 flex items-center justify-center">
                        <AvatarImage
                          src={st.photoURL}
                          alt={st.displayName}
                          className="w-full h-full object-contain"
                          transparentStage
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                          #{idx + 1} · {st.displayName}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {getLevelLabel(st.level, lang)} · {st.completedLessonsCount}{' '}
                          {t(lang, 'completedLessons')} · {st.badges.length}{' '}
                          {lang === 'ar' ? 'شارات' : 'badges'}
                        </p>
                      </div>
                    </div>

                    <div className="text-end shrink-0">
                      <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                        {st.totalPoints}
                      </p>
                      <p className="text-[11px] text-slate-400">{t(lang, 'pointsUnit')}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setPointsModalStudent(st);
                        setPointsMode('add');
                        setPointsDelta(20);
                        setPointsReason('');
                      }}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>{t(lang, 'adjustPoints')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingStudent(st);
                        setEditStudentForm({
                          displayName: st.displayName,
                          photoURL: st.photoURL,
                          level: st.level,
                          badges: st.badges,
                          isActive: st.isActive,
                        });
                      }}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{t(lang, 'editStudent')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivityModalStudent(st)}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>{t(lang, 'studentActivityLog')}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LESSONS */}
      {activeTab === 'lessons' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setLessonForm({
                  id: '',
                  title: '',
                  titleAr: '',
                  description: '',
                  descriptionAr: '',
                  videoUrl: '',
                  thumbnailUrl: ASSET_IMAGES.phonicsCover,
                  level: 'Beginner',
                  unit: 'Unit 1',
                  topic: 'Phonics',
                  teacherNotes: '',
                  teacherNotesAr: '',
                  points: 25,
                  durationMinutes: 10,
                  isPublished: true,
                });
                setShowLessonModal(true);
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t(lang, 'addLesson')}</span>
            </button>
          </div>

          {lessons.length === 0 ? (
            <EmptyState icon={<BookOpen className="w-7 h-7" />} title={t(lang, 'noLessonsYet')} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                      <img
                        src={lesson.thumbnailUrl || ASSET_IMAGES.phonicsCover}
                        alt={lesson.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mb-1">
                        {getLevelLabel(lesson.level, lang)} · {lesson.unit} · +{lesson.points}{' '}
                        {t(lang, 'pointsUnit')}
                      </p>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        {lang === 'ar' ? lesson.titleAr : lesson.title}
                      </h3>
                    </div>
                  </div>
                  <div className="px-4 pb-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLessonForm({
                          id: lesson.id,
                          title: lesson.title,
                          titleAr: lesson.titleAr,
                          description: lesson.description,
                          descriptionAr: lesson.descriptionAr,
                          videoUrl: lesson.videoUrl,
                          thumbnailUrl: lesson.thumbnailUrl,
                          level: lesson.level,
                          unit: lesson.unit,
                          topic: lesson.topic,
                          teacherNotes: lesson.teacherNotes,
                          teacherNotesAr: lesson.teacherNotesAr,
                          points: lesson.points,
                          durationMinutes: lesson.durationMinutes,
                          isPublished: lesson.isPublished,
                        });
                        setShowLessonModal(true);
                      }}
                      className="min-h-[38px] flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{t(lang, 'editLabel')}</span>
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          () => deleteLesson(lesson.id),
                          lang === 'ar' ? 'تم حذف الدرس' : 'Lesson deleted'
                        )
                      }
                      className="min-h-[38px] px-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-center"
                      aria-label={t(lang, 'deleteLabel')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TASKS & QUIZZES + HOMEWORK GRADING */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setTaskForm({
                  id: '',
                  title: '',
                  titleAr: '',
                  description: '',
                  descriptionAr: '',
                  type: 'quiz',
                  level: 'Beginner',
                  points: 30,
                  dueDate: '',
                  attachmentUrl: '',
                  questions: [
                    {
                      question: 'Choose the correct word:',
                      questionAr: 'اختر الكلمة الصحيحة:',
                      options: ['Apple', 'Apel', 'Aple', 'Appl'],
                      correctIndex: 0,
                    },
                  ],
                  isPublished: true,
                });
                setShowTaskModal(true);
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t(lang, 'addTask')}</span>
            </button>
          </div>

          {pendingHomework.length > 0 && (
            <section className="rounded-3xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 p-5 space-y-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t(lang, 'pendingHomework')} ({pendingHomework.length})
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingHomework.map((sub) => {
                  const st = studentById.get(sub.studentId);
                  const taskObj = tasks.find((tk) => tk.id === sub.taskId);
                  return (
                    <div key={sub.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                          {sub.studentName} · {sub.taskTitle}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                          {sub.answerText}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={busy || !st}
                          onClick={() =>
                            st &&
                            runAction(
                              () =>
                                gradeHomeworkSubmission(
                                  teacherUid,
                                  sub,
                                  st,
                                  'approved',
                                  taskObj?.points || 25,
                                  lang === 'ar' ? 'عمل رائع!' : 'Great work!'
                                ),
                              lang === 'ar' ? 'تم اعتماد الواجب ومنح النقاط' : 'Homework approved'
                            )
                          }
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {t(lang, 'approveLabel')} (+{taskObj?.points || 25})
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={busy || !st}
                          onClick={() =>
                            st &&
                            runAction(
                              () =>
                                gradeHomeworkSubmission(
                                  teacherUid,
                                  sub,
                                  st,
                                  'rejected',
                                  0,
                                  lang === 'ar' ? 'يرجى المحاولة مرة أخرى' : 'Please try again'
                                ),
                              lang === 'ar' ? 'تم رفض التسليم' : 'Submission rejected'
                            )
                          }
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>{t(lang, 'rejectLabel')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {tasks.length === 0 ? (
            <EmptyState icon={<ClipboardList className="w-7 h-7" />} title={t(lang, 'noTasksYet')} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map((tsk) => (
                <div
                  key={tsk.id}
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {tsk.type.toUpperCase()} · +{tsk.points} {t(lang, 'pointsUnit')}
                    </p>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                      {lang === 'ar' ? tsk.titleAr : tsk.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setTaskForm({
                          id: tsk.id,
                          title: tsk.title,
                          titleAr: tsk.titleAr,
                          description: tsk.description,
                          descriptionAr: tsk.descriptionAr,
                          type: tsk.type,
                          level: tsk.level,
                          points: tsk.points,
                          dueDate: tsk.dueDate,
                          attachmentUrl: tsk.attachmentUrl,
                          questions: tsk.questions,
                          isPublished: tsk.isPublished,
                        });
                        setShowTaskModal(true);
                      }}
                      className="min-h-[38px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
                    >
                      {t(lang, 'editLabel')}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          () => deleteTask(tsk.id),
                          lang === 'ar' ? 'تم حذف المهمة' : 'Task deleted'
                        )
                      }
                      className="min-h-[38px] px-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: NOTES & ANNOUNCEMENTS */}
      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t(lang, 'addNote')}
            </h2>

            <div className="space-y-3">
              <select
                value={noteForm.targetStudentId}
                onChange={(e) => setNoteForm({ ...noteForm, targetStudentId: e.target.value })}
                className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              >
                <option value="all">{t(lang, 'allStudentsOption')}</option>
                {students.map((st) => (
                  <option key={st.uid} value={st.uid}>
                    {st.displayName}
                  </option>
                ))}
              </select>

              <select
                value={noteForm.category}
                onChange={(e) =>
                  setNoteForm({ ...noteForm, category: e.target.value as 'announcement' | 'note' })
                }
                className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              >
                <option value="announcement">{t(lang, 'generalAnnouncement')}</option>
                <option value="note">{t(lang, 'personalNote')}</option>
              </select>

              <input
                type="text"
                placeholder={lang === 'ar' ? 'العنوان بالعربية' : 'Title (Arabic)'}
                value={noteForm.titleAr}
                onChange={(e) => setNoteForm({ ...noteForm, titleAr: e.target.value })}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />

              <input
                type="text"
                placeholder={lang === 'ar' ? 'Title (English)' : 'Title (English)'}
                value={noteForm.title}
                onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />

              <textarea
                rows={3}
                placeholder={lang === 'ar' ? 'نص الملاحظة بالعربية' : 'Content (Arabic)'}
                value={noteForm.contentAr}
                onChange={(e) => setNoteForm({ ...noteForm, contentAr: e.target.value })}
                className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />

              <textarea
                rows={3}
                placeholder={lang === 'ar' ? 'Content (English)' : 'Content (English)'}
                value={noteForm.content}
                onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />

              <select
                value={noteForm.attachmentType}
                onChange={(e) =>
                  setNoteForm({
                    ...noteForm,
                    attachmentType: e.target.value as 'none' | 'link' | 'image' | 'file',
                  })
                }
                className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              >
                <option value="none">{lang === 'ar' ? 'بدون مرفق' : 'No attachment'}</option>
                <option value="link">{lang === 'ar' ? 'رابط' : 'Link URL'}</option>
                <option value="image">{lang === 'ar' ? 'صورة' : 'Image'}</option>
                <option value="file">{lang === 'ar' ? 'رابط ملف' : 'File URL'}</option>
              </select>

              {noteForm.attachmentType !== 'none' && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="https://..."
                    value={noteForm.attachmentUrl}
                    onChange={(e) => setNoteForm({ ...noteForm, attachmentUrl: e.target.value })}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
                  />
                  {noteForm.attachmentType === 'image' && (
                    <label className="min-h-[40px] px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'رفع صورة مباشرة' : 'Upload image file'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          handlePngUploadFor(e, (url) =>
                            setNoteForm({ ...noteForm, attachmentUrl: url })
                          )
                        }
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}

              <button
                type="button"
                disabled={busy || (!noteForm.title && !noteForm.titleAr) || (!noteForm.content && !noteForm.contentAr)}
                onClick={() =>
                  runAction(async () => {
                    await publishNoteOrAnnouncement(teacherUid, {
                      ...noteForm,
                      title: noteForm.title || noteForm.titleAr,
                      titleAr: noteForm.titleAr || noteForm.title,
                      content: noteForm.content || noteForm.contentAr,
                      contentAr: noteForm.contentAr || noteForm.content,
                    });
                    setNoteForm({
                      title: '',
                      titleAr: '',
                      content: '',
                      contentAr: '',
                      targetStudentId: 'all',
                      category: 'announcement',
                      attachmentUrl: '',
                      attachmentType: 'none',
                    });
                  }, lang === 'ar' ? 'تم نشر الملاحظة وإرسال الإشعار' : 'Note published & notification sent')
                }
                className="w-full min-h-[46px] rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm disabled:opacity-50"
              >
                {t(lang, 'addNote')}
              </button>
            </div>
          </section>

          <section className="lg:col-span-7 space-y-3">
            {notes.length === 0 ? (
              <EmptyState icon={<Megaphone className="w-7 h-7" />} title={t(lang, 'noNotesYet')} />
            ) : (
              notes.map((n) => (
                <div
                  key={n.id}
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      {n.targetStudentId === 'all'
                        ? t(lang, 'allStudentsOption')
                        : studentById.get(n.targetStudentId)?.displayName || n.targetStudentId}{' '}
                      · {n.category}
                    </p>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      {lang === 'ar' ? n.titleAr : n.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      {lang === 'ar' ? n.contentAr : n.content}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      runAction(
                        () => deleteNote(n.id),
                        lang === 'ar' ? 'تم حذف الملاحظة' : 'Note deleted'
                      )
                    }
                    className="min-h-[38px] px-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </section>
        </div>
      )}

      {/* TAB 6: REWARDS & REDEMPTIONS */}
      {activeTab === 'rewards' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setRewardForm({
                  id: '',
                  title: '',
                  titleAr: '',
                  description: '',
                  descriptionAr: '',
                  costPoints: 100,
                  category: 'physical',
                  imageUrl: ASSET_IMAGES.rewardGift,
                  isAvailable: true,
                });
                setShowRewardModal(true);
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t(lang, 'addReward')}</span>
            </button>
          </div>

          {pendingRedemptions.length > 0 && (
            <section className="rounded-3xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 p-5 space-y-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t(lang, 'pendingRedemptions')} ({pendingRedemptions.length})
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingRedemptions.map((req) => {
                  const st = studentById.get(req.studentId);
                  return (
                    <div
                      key={req.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">
                          {req.studentName} → {lang === 'ar' ? req.rewardTitleAr : req.rewardTitle}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                          {req.costPoints} {t(lang, 'pointsUnit')} ·{' '}
                          {lang === 'ar' ? 'رصيد الطالب الحالي:' : 'Current balance:'}{' '}
                          {st?.totalPoints ?? 0}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={busy || !st}
                          onClick={() =>
                            st &&
                            runAction(
                              () =>
                                reviewRedemptionRequest(
                                  teacherUid,
                                  req,
                                  st,
                                  'approved',
                                  lang === 'ar' ? 'ألف مبروك!' : 'Enjoy your reward!'
                                ),
                              lang === 'ar' ? 'تمت الموافقة وخصم النقاط' : 'Redemption approved'
                            )
                          }
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{t(lang, 'approveLabel')}</span>
                        </button>
                        <button
                          type="button"
                          disabled={busy || !st}
                          onClick={() =>
                            st &&
                            runAction(
                              () =>
                                reviewRedemptionRequest(
                                  teacherUid,
                                  req,
                                  st,
                                  'rejected',
                                  lang === 'ar' ? 'غير متوفر حاليًا' : 'Currently unavailable'
                                ),
                              lang === 'ar' ? 'تم رفض الطلب' : 'Redemption rejected'
                            )
                          }
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>{t(lang, 'rejectLabel')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {rewards.length === 0 ? (
            <EmptyState icon={<Gift className="w-7 h-7" />} title={t(lang, 'noRewardsYet')} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((rw) => (
                <div
                  key={rw.id}
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                      <img
                        src={rw.imageUrl || ASSET_IMAGES.rewardGift}
                        alt={rw.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums mb-1">
                        {rw.costPoints} {t(lang, 'pointsUnit')}
                      </p>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        {lang === 'ar' ? rw.titleAr : rw.title}
                      </h3>
                    </div>
                  </div>
                  <div className="px-4 pb-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRewardForm({
                          id: rw.id,
                          title: rw.title,
                          titleAr: rw.titleAr,
                          description: rw.description,
                          descriptionAr: rw.descriptionAr,
                          costPoints: rw.costPoints,
                          category: rw.category,
                          imageUrl: rw.imageUrl,
                          isAvailable: rw.isAvailable,
                        });
                        setShowRewardModal(true);
                      }}
                      className="min-h-[38px] flex-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
                    >
                      {t(lang, 'editLabel')}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          () => deleteReward(rw.id),
                          lang === 'ar' ? 'تم حذف الهدية' : 'Reward deleted'
                        )
                      }
                      className="min-h-[38px] px-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: PUSH NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <section className="max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {t(lang, 'sendNotification')}
          </h2>

          <select
            value={notifForm.targetStudentId}
            onChange={(e) => setNotifForm({ ...notifForm, targetStudentId: e.target.value })}
            className="w-full min-h-[44px] px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
          >
            <option value="all">{t(lang, 'allStudentsOption')}</option>
            {students.map((st) => (
              <option key={st.uid} value={st.uid}>
                {st.displayName}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder={lang === 'ar' ? 'عنوان الإشعار بالعربية' : 'Notification Title (Arabic)'}
            value={notifForm.titleAr}
            onChange={(e) => setNotifForm({ ...notifForm, titleAr: e.target.value })}
            className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
          />

          <input
            type="text"
            placeholder="Notification Title (English)"
            value={notifForm.title}
            onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
            className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
          />

          <textarea
            rows={3}
            placeholder={lang === 'ar' ? 'نص الإشعار بالعربية' : 'Message (Arabic)'}
            value={notifForm.bodyAr}
            onChange={(e) => setNotifForm({ ...notifForm, bodyAr: e.target.value })}
            className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
          />

          <textarea
            rows={3}
            placeholder="Message (English)"
            value={notifForm.body}
            onChange={(e) => setNotifForm({ ...notifForm, body: e.target.value })}
            className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
          />

          <button
            type="button"
            disabled={busy || (!notifForm.title && !notifForm.titleAr) || (!notifForm.body && !notifForm.bodyAr)}
            onClick={() =>
              runAction(async () => {
                await sendCustomNotification(teacherUid, {
                  ...notifForm,
                  title: notifForm.title || notifForm.titleAr,
                  titleAr: notifForm.titleAr || notifForm.title,
                  body: notifForm.body || notifForm.bodyAr,
                  bodyAr: notifForm.bodyAr || notifForm.body,
                });
                setNotifForm({
                  targetStudentId: 'all',
                  title: '',
                  titleAr: '',
                  body: '',
                  bodyAr: '',
                  type: 'announcement',
                  linkTab: 'home',
                });
              }, lang === 'ar' ? 'تم إرسال الإشعار الفوري بنجاح' : 'Push notification sent!')
            }
            className="min-h-[46px] px-6 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{t(lang, 'sendNotification')}</span>
          </button>
        </section>
      )}

      {/* MODAL: ADJUST POINTS */}
      {pointsModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {t(lang, 'adjustPoints')} · {pointsModalStudent.displayName}
              </h3>
              <button type="button" onClick={() => setPointsModalStudent(null)} className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPointsMode('add')}
                className={`min-h-[42px] rounded-xl text-sm font-bold ${
                  pointsMode === 'add'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                {lang === 'ar' ? '+ إضافة نقاط' : '+ Add Points'}
              </button>
              <button
                type="button"
                onClick={() => setPointsMode('deduct')}
                className={`min-h-[42px] rounded-xl text-sm font-bold ${
                  pointsMode === 'deduct'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                {lang === 'ar' ? '- خصم نقاط' : '- Deduct Points'}
              </button>
            </div>

            <input
              type="number"
              min={1}
              max={10000}
              value={pointsDelta}
              onChange={(e) => setPointsDelta(Math.max(1, Number(e.target.value)))}
              className="w-full min-h-[44px] px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm tabular-nums"
            />

            <input
              type="text"
              placeholder={t(lang, 'reasonLabel')}
              value={pointsReason}
              onChange={(e) => setPointsReason(e.target.value)}
              className="w-full min-h-[44px] px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />

            <button
              type="button"
              disabled={busy || !pointsReason.trim()}
              onClick={() =>
                runAction(async () => {
                  const delta = pointsMode === 'add' ? pointsDelta : -pointsDelta;
                  await teacherAdjustStudentPoints(
                    teacherUid,
                    pointsModalStudent,
                    delta,
                    pointsReason
                  );
                  setPointsModalStudent(null);
                }, lang === 'ar' ? 'تم تحديث رصيد النقاط' : 'Student points updated')
              }
              className="w-full min-h-[46px] rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm disabled:opacity-50"
            >
              {t(lang, 'saveChanges')}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STUDENT PROFILE + TRANSPARENT PNG UPLOAD */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {t(lang, 'editStudent')}
              </h3>
              <button type="button" onClick={() => setEditingStudent(null)} className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-sky-50 dark:bg-sky-950/50 p-1.5 flex items-center justify-center shrink-0">
                <AvatarImage
                  src={editStudentForm.photoURL}
                  alt={editStudentForm.displayName}
                  className="w-full h-full object-contain"
                  transparentStage
                />
              </div>
              <div className="space-y-2 flex-1">
                <label className="min-h-[40px] px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-bold inline-flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{t(lang, 'uploadTransparentPng')}</span>
                  <input
                    type="file"
                    accept="image/png,image/webp,image/jpeg"
                    onChange={(e) =>
                      handlePngUploadFor(e, (url) =>
                        setEditStudentForm({ ...editStudentForm, photoURL: url })
                      )
                    }
                    className="hidden"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {TRANSPARENT_AVATAR_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setEditStudentForm({ ...editStudentForm, photoURL: p.url })}
                      className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 p-1"
                    >
                      <img src={p.url} alt={p.labelEn} className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <input
              type="text"
              value={editStudentForm.displayName}
              onChange={(e) => setEditStudentForm({ ...editStudentForm, displayName: e.target.value })}
              placeholder={lang === 'ar' ? 'اسم الطالب' : 'Student Name'}
              className="w-full min-h-[44px] px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />

            <select
              value={editStudentForm.level}
              onChange={(e) => setEditStudentForm({ ...editStudentForm, level: e.target.value })}
              className="w-full min-h-[44px] px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            >
              {LEVELS_LIST.map((lvl) => (
                <option key={lvl.key} value={lvl.key}>
                  {lang === 'ar' ? lvl.ar : lvl.en}
                </option>
              ))}
            </select>

            <div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-violet-500" />
                <span>{t(lang, 'earnedBadges')}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {BADGES_CATALOG.map((b) => {
                  const has = editStudentForm.badges.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        const next = has
                          ? editStudentForm.badges.filter((x) => x !== b.id)
                          : [...editStudentForm.badges, b.id];
                        setEditStudentForm({ ...editStudentForm, badges: next });
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                        has
                          ? 'bg-violet-600 border-violet-600 text-white'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {lang === 'ar' ? b.titleAr : b.titleEn}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              disabled={busy || !editStudentForm.displayName.trim()}
              onClick={() =>
                runAction(async () => {
                  await teacherUpdateStudentProfile(editingStudent.uid, editStudentForm);
                  setEditingStudent(null);
                }, lang === 'ar' ? 'تم حفظ بيانات الطالب' : 'Student profile updated')
              }
              className="w-full min-h-[46px] rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm"
            >
              {t(lang, 'saveChanges')}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADD STUDENT PROFILE MANUALLY */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {t(lang, 'createStudentManually')}
              </h3>
              <button type="button" onClick={() => setShowAddStudentModal(false)} className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              placeholder={lang === 'ar' ? 'اسم الطالب' : 'Student Name'}
              value={newStudentForm.displayName}
              onChange={(e) => setNewStudentForm({ ...newStudentForm, displayName: e.target.value })}
              className="w-full min-h-[44px] px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
            <select
              value={newStudentForm.level}
              onChange={(e) => setNewStudentForm({ ...newStudentForm, level: e.target.value })}
              className="w-full min-h-[44px] px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            >
              {LEVELS_LIST.map((l) => (
                <option key={l.key} value={l.key}>
                  {lang === 'ar' ? l.ar : l.en}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              max={10000}
              placeholder={lang === 'ar' ? 'نقاط البداية' : 'Initial Points'}
              value={newStudentForm.initialPoints}
              onChange={(e) =>
                setNewStudentForm({ ...newStudentForm, initialPoints: Number(e.target.value) })
              }
              className="w-full min-h-[44px] px-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
            <label className="min-h-[40px] px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-xs font-bold inline-flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{t(lang, 'uploadTransparentPng')}</span>
              <input
                type="file"
                accept="image/png,image/webp,image/jpeg"
                onChange={(e) =>
                  handlePngUploadFor(e, (url) =>
                    setNewStudentForm({ ...newStudentForm, photoURL: url })
                  )
                }
                className="hidden"
              />
            </label>
            <button
              type="button"
              disabled={busy || !newStudentForm.displayName.trim()}
              onClick={() =>
                runAction(async () => {
                  await teacherCreateStudentProfile(newStudentForm);
                  setShowAddStudentModal(false);
                  setNewStudentForm({
                    displayName: '',
                    photoURL: TRANSPARENT_AVATAR_PRESETS[0].url,
                    level: 'Beginner',
                    initialPoints: 0,
                  });
                }, lang === 'ar' ? 'تم إنشاء ملف الطالب' : 'Student profile created')
              }
              className="w-full min-h-[46px] rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm"
            >
              {t(lang, 'saveChanges')}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: STUDENT ACTIVITY LOG */}
      {activityModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {t(lang, 'studentActivityLog')} · {activityModalStudent.displayName}
              </h3>
              <button type="button" onClick={() => setActivityModalStudent(null)} className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions
                .filter((tx) => tx.studentId === activityModalStudent.uid)
                .map((tx) => (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {lang === 'ar' ? tx.reasonAr : tx.reason}
                      </p>
                      <p className="text-xs text-slate-500">{tx.sourceType}</p>
                    </div>
                    <span
                      className={`font-bold text-sm tabular-nums ${
                        tx.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                    </span>
                  </div>
                ))}
              {transactions.filter((tx) => tx.studentId === activityModalStudent.uid).length === 0 && (
                <p className="text-sm text-slate-500 py-4">
                  {lang === 'ar' ? 'لا يوجد نشاط مسجل بعد.' : 'No recorded activity yet.'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT LESSON */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {lessonForm.id ? t(lang, 'editLesson') : t(lang, 'addLesson')}
              </h3>
              <button type="button" onClick={() => setShowLessonModal(false)} className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder={lang === 'ar' ? 'عنوان الدرس بالعربية' : 'Title (Arabic)'}
                value={lessonForm.titleAr}
                onChange={(e) => setLessonForm({ ...lessonForm, titleAr: e.target.value })}
                className="min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
              <input
                type="text"
                placeholder="Title (English)"
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                className="min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'رابط الفيديو (YouTube / Vimeo / MP4)' : 'Video URL (YouTube / Vimeo / MP4)'}
                value={lessonForm.videoUrl}
                onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                className="sm:col-span-2 min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
              <select
                value={lessonForm.level}
                onChange={(e) => setLessonForm({ ...lessonForm, level: e.target.value })}
                className="min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              >
                {LEVELS_LIST.map((l) => (
                  <option key={l.key} value={l.key}>
                    {lang === 'ar' ? l.ar : l.en}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder={lang === 'ar' ? 'الوحدة (مثال: Unit 1)' : 'Unit (e.g. Unit 1)'}
                value={lessonForm.unit}
                onChange={(e) => setLessonForm({ ...lessonForm, unit: e.target.value })}
                className="min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'الموضوع (Phonics / Grammar)' : 'Topic (Phonics / Grammar)'}
                value={lessonForm.topic}
                onChange={(e) => setLessonForm({ ...lessonForm, topic: e.target.value })}
                className="min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
              <input
                type="number"
                min={0}
                max={1000}
                placeholder={t(lang, 'pointsAmountLabel')}
                value={lessonForm.points}
                onChange={(e) => setLessonForm({ ...lessonForm, points: Number(e.target.value) })}
                className="min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setLessonForm({ ...lessonForm, thumbnailUrl: ASSET_IMAGES.phonicsCover })}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
              >
                {lang === 'ar' ? 'غلاف الصوتيات' : 'Phonics Cover'}
              </button>
              <button
                type="button"
                onClick={() => setLessonForm({ ...lessonForm, thumbnailUrl: ASSET_IMAGES.grammarCover })}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold"
              >
                {lang === 'ar' ? 'غلاف القواعد' : 'Grammar Cover'}
              </button>
            </div>

            <textarea
              rows={2}
              placeholder={lang === 'ar' ? 'وصف الدرس بالعربية' : 'Description (Arabic)'}
              value={lessonForm.descriptionAr}
              onChange={(e) => setLessonForm({ ...lessonForm, descriptionAr: e.target.value })}
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
            <textarea
              rows={2}
              placeholder={lang === 'ar' ? 'ملاحظات المعلمة المرتبطة بالفيديو' : 'Teacher notes for this video'}
              value={lessonForm.teacherNotesAr}
              onChange={(e) => setLessonForm({ ...lessonForm, teacherNotesAr: e.target.value })}
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />

            <button
              type="button"
              disabled={busy || !lessonForm.videoUrl.trim() || (!lessonForm.title.trim() && !lessonForm.titleAr.trim())}
              onClick={() =>
                runAction(async () => {
                  await createOrUpdateLesson(teacherUid, {
                    ...lessonForm,
                    id: lessonForm.id || undefined,
                    title: lessonForm.title || lessonForm.titleAr,
                    titleAr: lessonForm.titleAr || lessonForm.title,
                    description: lessonForm.description || lessonForm.descriptionAr,
                    teacherNotes: lessonForm.teacherNotes || lessonForm.teacherNotesAr,
                  });
                  setShowLessonModal(false);
                }, lang === 'ar' ? 'تم حفظ الدرس بنجاح' : 'Lesson saved successfully')
              }
              className="w-full min-h-[46px] rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm disabled:opacity-50"
            >
              {t(lang, 'saveChanges')}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT TASK OR QUIZ */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {t(lang, 'addTask')}
              </h3>
              <button type="button" onClick={() => setShowTaskModal(false)} className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={taskForm.type}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, type: e.target.value as 'quiz' | 'homework' })
                }
                className="min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              >
                <option value="quiz">{lang === 'ar' ? 'اختبار تفاعلي' : 'Interactive Quiz'}</option>
                <option value="homework">{lang === 'ar' ? 'واجب منزلي' : 'Homework'}</option>
              </select>
              <input
                type="number"
                min={0}
                max={1000}
                value={taskForm.points}
                onChange={(e) => setTaskForm({ ...taskForm, points: Number(e.target.value) })}
                placeholder={t(lang, 'pointsAmountLabel')}
                className="min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'العنوان بالعربية' : 'Title (Arabic)'}
                value={taskForm.titleAr}
                onChange={(e) => setTaskForm({ ...taskForm, titleAr: e.target.value })}
                className="min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
              <input
                type="text"
                placeholder="Title (English)"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                className="min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
            </div>

            <textarea
              rows={2}
              placeholder={lang === 'ar' ? 'التعليمات / الوصف' : 'Description / Instructions'}
              value={taskForm.descriptionAr}
              onChange={(e) => setTaskForm({ ...taskForm, descriptionAr: e.target.value })}
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />

            {taskForm.type === 'quiz' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'أسئلة الاختبار' : 'Quiz Questions'}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setTaskForm({
                        ...taskForm,
                        questions: [
                          ...taskForm.questions,
                          {
                            question: '',
                            questionAr: '',
                            options: ['Option A', 'Option B', 'Option C', 'Option D'],
                            correctIndex: 0,
                          },
                        ],
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-xs font-bold"
                  >
                    + {lang === 'ar' ? 'إضافة سؤال' : 'Add Question'}
                  </button>
                </div>

                {taskForm.questions.map((q, qIdx) => (
                  <div key={qIdx} className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 space-y-2.5">
                    <input
                      type="text"
                      placeholder={`Question ${qIdx + 1}`}
                      value={q.question}
                      onChange={(e) => {
                        const next = [...taskForm.questions];
                        next[qIdx] = { ...q, question: e.target.value, questionAr: e.target.value };
                        setTaskForm({ ...taskForm, questions: next });
                      }}
                      className="w-full min-h-[40px] px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={q.correctIndex === oIdx}
                            onChange={() => {
                              const next = [...taskForm.questions];
                              next[qIdx] = { ...q, correctIndex: oIdx };
                              setTaskForm({ ...taskForm, questions: next });
                            }}
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const next = [...taskForm.questions];
                              const opts = [...q.options];
                              opts[oIdx] = e.target.value;
                              next[qIdx] = { ...q, options: opts };
                              setTaskForm({ ...taskForm, questions: next });
                            }}
                            className="w-full min-h-[36px] px-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              disabled={busy || (!taskForm.title.trim() && !taskForm.titleAr.trim())}
              onClick={() =>
                runAction(async () => {
                  await createOrUpdateTask(teacherUid, {
                    ...taskForm,
                    id: taskForm.id || undefined,
                    title: taskForm.title || taskForm.titleAr,
                    titleAr: taskForm.titleAr || taskForm.title,
                    description: taskForm.description || taskForm.descriptionAr,
                  });
                  setShowTaskModal(false);
                }, lang === 'ar' ? 'تم حفظ المهمة بنجاح' : 'Task saved successfully')
              }
              className="w-full min-h-[46px] rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm disabled:opacity-50"
            >
              {t(lang, 'saveChanges')}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT REWARD */}
      {showRewardModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                {t(lang, 'addReward')}
              </h3>
              <button type="button" onClick={() => setShowRewardModal(false)} className="p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              type="text"
              placeholder={lang === 'ar' ? 'اسم الهدية بالعربية' : 'Reward Name (Arabic)'}
              value={rewardForm.titleAr}
              onChange={(e) => setRewardForm({ ...rewardForm, titleAr: e.target.value })}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
            <input
              type="text"
              placeholder="Reward Name (English)"
              value={rewardForm.title}
              onChange={(e) => setRewardForm({ ...rewardForm, title: e.target.value })}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min={1}
                max={100000}
                value={rewardForm.costPoints}
                onChange={(e) => setRewardForm({ ...rewardForm, costPoints: Number(e.target.value) })}
                className="min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              />
              <select
                value={rewardForm.category}
                onChange={(e) =>
                  setRewardForm({ ...rewardForm, category: e.target.value as 'physical' | 'virtual' })
                }
                className="min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
              >
                <option value="physical">{t(lang, 'physicalGift')}</option>
                <option value="virtual">{t(lang, 'virtualGift')}</option>
              </select>
            </div>
            <textarea
              rows={2}
              placeholder={lang === 'ar' ? 'وصف الهدية' : 'Description'}
              value={rewardForm.descriptionAr}
              onChange={(e) => setRewardForm({ ...rewardForm, descriptionAr: e.target.value })}
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm"
            />

            <label className="min-h-[40px] px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-xs font-bold inline-flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{lang === 'ar' ? 'رفع صورة للهدية' : 'Upload Gift Image'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  handlePngUploadFor(e, (url) => setRewardForm({ ...rewardForm, imageUrl: url }))
                }
                className="hidden"
              />
            </label>

            <button
              type="button"
              disabled={busy || (!rewardForm.title.trim() && !rewardForm.titleAr.trim())}
              onClick={() =>
                runAction(async () => {
                  await createOrUpdateReward(teacherUid, {
                    ...rewardForm,
                    id: rewardForm.id || undefined,
                    title: rewardForm.title || rewardForm.titleAr,
                    titleAr: rewardForm.titleAr || rewardForm.title,
                    description: rewardForm.description || rewardForm.descriptionAr,
                  });
                  setShowRewardModal(false);
                }, lang === 'ar' ? 'تم حفظ الهدية في المتجر' : 'Reward saved')
              }
              className="w-full min-h-[46px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm disabled:opacity-50"
            >
              {t(lang, 'saveChanges')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
