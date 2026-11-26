import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import {
  Bell,
  BookOpen,
  ClipboardList,
  Eye,
  Gift,
  Home,
  LayoutDashboard,
  Lock,
  Settings,
  Trophy,
  User as UserIcon,
} from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LeaderboardView } from './components/LeaderboardView';
import { LessonsView } from './components/LessonsView';
import { LoginScreen } from './components/LoginScreen';
import { NotesView } from './components/NotesView';
import { ProfileView } from './components/ProfileView';
import { RewardsStoreView } from './components/RewardsStoreView';
import { AvatarImage, ToastBanner } from './components/SharedUI';
import { SettingsView } from './components/SettingsView';
import { StudentHome } from './components/StudentHome';
import { StudentOnboardingScreen } from './components/StudentOnboardingScreen';
import { TasksView } from './components/TasksView';
import { TeacherDashboard } from './components/TeacherDashboard';
import {
  auth,
  BOOTSTRAP_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  registerNotificationServiceWorker,
  requestBrowserAndFcmNotifications,
  testConnection,
  triggerLocalPushNotification,
} from './lib/firebase';
import { ASSET_IMAGES, celebrateAchievement, TRANSPARENT_AVATAR_PRESETS } from './lib/gamification';
import { t } from './lib/i18n';
import {
  applyWebAppIconToHead,
  bootstrapUserSession,
  completeLessonAtomically,
  completeStudentRegistration,
  deleteLesson,
  deleteNote,
  deleteNotification,
  deleteReward,
  deleteStudentProfile,
  deleteTask,
  getAppIconBranding,
  markNoteRead,
  markNotificationRead,
  publishStudentNoteOrIssue,
  requestRewardRedemption,
  resetAllAcademyDataAndAccounts,
  saveAppIconBranding,
  submitHomework,
  submitQuizAtomically,
  updateOwnStudentProfile,
  updateUserPreferences,
} from './services/academyService';
import {
  AcademyNote,
  AcademyNotification,
  AcademyTask,
  AppTab,
  Language,
  Lesson,
  LessonCompletion,
  PointTransaction,
  RedemptionRequest,
  RewardItem,
  StudentProfile,
  TaskSubmission,
  ThemeMode,
  UserPrivate,
  UserRole,
} from './types';

function AcademyApp() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('student');
  const [userPrivate, setUserPrivate] = useState<UserPrivate | null>(null);
  const [lang, setLang] = useState<Language>('ar');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [pendingPhotoURL, setPendingPhotoURL] = useState<string>('');
  const [customAppIconUrl, setCustomAppIconUrl] = useState<string>('');

  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [teacherPreviewStudentMode, setTeacherPreviewStudentMode] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Live Firestore Collections
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completions, setCompletions] = useState<LessonCompletion[]>([]);
  const [tasks, setTasks] = useState<AcademyTask[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [notes, setNotes] = useState<AcademyNote[]>([]);
  const [readNoteIds, setReadNoteIds] = useState<Set<string>>(new Set());
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRequest[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [notifications, setNotifications] = useState<AcademyNotification[]>([]);
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(new Set());

  // Selected modal items
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedTask, setSelectedTask] = useState<AcademyTask | null>(null);

  const seenNotifIdsRef = useRef<Set<string>>(new Set());
  const initialNotifsLoadedRef = useRef(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Apply RTL/LTR & Dark/Light class to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Startup connection check, SW registration & Web App Icon sync
  useEffect(() => {
    testConnection();
    registerNotificationServiceWorker();
    getAppIconBranding().then((iconUrl) => {
      if (iconUrl) {
        setCustomAppIconUrl(iconUrl);
      }
    });
  }, []);

  useEffect(() => {
    applyWebAppIconToHead(customAppIconUrl);
  }, [customAppIconUrl]);

  // Auth listener & user bootstrap
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setUserPrivate(null);
        setRole('student');
        setNeedsOnboarding(false);
        setStudents([]);
        setLessons([]);
        setCompletions([]);
        setTasks([]);
        setSubmissions([]);
        setNotes([]);
        setRewards([]);
        setRedemptions([]);
        setTransactions([]);
        setNotifications([]);
        initialNotifsLoadedRef.current = false;
        seenNotifIdsRef.current = new Set();
        setAuthReady(true);
        return;
      }

      try {
        const session = await bootstrapUserSession(firebaseUser);
        setUser(firebaseUser);
        setRole(session.role);
        setUserPrivate(session.userPrivate);
        setNeedsOnboarding(session.needsOnboarding);
        setLang(session.userPrivate.preferredLanguage || 'ar');
        setTheme(session.userPrivate.preferredTheme || 'light');
        setActiveTab(session.role === 'teacher' ? 'teacher' : 'home');
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Failed to initialize session');
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Real-time Firestore subscriptions (only when authReady && user && !needsOnboarding)
  useEffect(() => {
    if (!authReady || !user || needsOnboarding) return;
    const isTeacher = role === 'teacher';
    const unsubscribers: (() => void)[] = [];

    const sortByCreatedDesc = <T extends { createdAt?: unknown }>(items: T[]): T[] => {
      return [...items].sort((a, b) => {
        const ta = (a.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
        const tb = (b.createdAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
        return tb - ta;
      });
    };

    // 1. Students
    const studentsQuery = isTeacher
      ? collection(db, 'students')
      : query(collection(db, 'students'), where('isActive', '==', true));
    unsubscribers.push(
      onSnapshot(
        studentsQuery,
        (snap) => {
          setStudents(snap.docs.map((d) => d.data() as StudentProfile));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'students')
      )
    );

    // 2. Lessons
    const lessonsQuery = isTeacher
      ? collection(db, 'lessons')
      : query(collection(db, 'lessons'), where('isPublished', '==', true));
    unsubscribers.push(
      onSnapshot(
        lessonsQuery,
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lesson));
          setLessons(sortByCreatedDesc(list));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'lessons')
      )
    );

    // 3. Lesson Completions
    const completionsQuery = isTeacher
      ? collection(db, 'lesson_completions')
      : query(collection(db, 'lesson_completions'), where('studentId', '==', user.uid));
    unsubscribers.push(
      onSnapshot(
        completionsQuery,
        (snap) => {
          setCompletions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LessonCompletion)));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'lesson_completions')
      )
    );

    // 4. Tasks
    const tasksQuery = isTeacher
      ? collection(db, 'tasks')
      : query(collection(db, 'tasks'), where('isPublished', '==', true));
    unsubscribers.push(
      onSnapshot(
        tasksQuery,
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AcademyTask));
          setTasks(sortByCreatedDesc(list));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'tasks')
      )
    );

    // 5. Task Submissions
    const submissionsQuery = isTeacher
      ? collection(db, 'task_submissions')
      : query(collection(db, 'task_submissions'), where('studentId', '==', user.uid));
    unsubscribers.push(
      onSnapshot(
        submissionsQuery,
        (snap) => {
          setSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TaskSubmission)));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'task_submissions')
      )
    );

    // 6. Notes & Announcements
    const notesQuery = isTeacher
      ? collection(db, 'notes')
      : query(collection(db, 'notes'), where('targetStudentId', 'in', ['all', user.uid]));
    unsubscribers.push(
      onSnapshot(
        notesQuery,
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AcademyNote));
          setNotes(sortByCreatedDesc(list));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'notes')
      )
    );

    // 7. Note Reads
    unsubscribers.push(
      onSnapshot(
        query(collection(db, 'note_reads'), where('studentId', '==', user.uid)),
        (snap) => {
          setReadNoteIds(new Set(snap.docs.map((d) => String(d.data().noteId))));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'note_reads')
      )
    );

    // 8. Rewards
    const rewardsQuery = isTeacher
      ? collection(db, 'rewards')
      : query(collection(db, 'rewards'), where('isAvailable', '==', true));
    unsubscribers.push(
      onSnapshot(
        rewardsQuery,
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RewardItem));
          setRewards(sortByCreatedDesc(list));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'rewards')
      )
    );

    // 9. Redemptions
    const redemptionsQuery = isTeacher
      ? collection(db, 'redemptions')
      : query(collection(db, 'redemptions'), where('studentId', '==', user.uid));
    unsubscribers.push(
      onSnapshot(
        redemptionsQuery,
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RedemptionRequest));
          setRedemptions(list);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'redemptions')
      )
    );

    // 10. Point Transactions
    const txQuery = isTeacher
      ? collection(db, 'point_transactions')
      : query(collection(db, 'point_transactions'), where('studentId', '==', user.uid));
    unsubscribers.push(
      onSnapshot(
        txQuery,
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PointTransaction));
          setTransactions(sortByCreatedDesc(list));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'point_transactions')
      )
    );

    // 11. Notifications (Real-time + Browser Push trigger)
    const notifQuery = isTeacher
      ? collection(db, 'notifications')
      : query(collection(db, 'notifications'), where('targetStudentId', 'in', ['all', user.uid]));
    unsubscribers.push(
      onSnapshot(
        notifQuery,
        (snap) => {
          const list = sortByCreatedDesc(
            snap.docs.map((d) => ({ id: d.id, ...d.data() } as AcademyNotification))
          );
          setNotifications(list);

          if (!initialNotifsLoadedRef.current) {
            list.forEach((n) => seenNotifIdsRef.current.add(n.id));
            initialNotifsLoadedRef.current = true;
          } else {
            list.forEach((n) => {
              if (!seenNotifIdsRef.current.has(n.id)) {
                seenNotifIdsRef.current.add(n.id);
                if (role === 'student') {
                  const title = lang === 'ar' ? n.titleAr : n.title;
                  const body = lang === 'ar' ? n.bodyAr : n.body;
                  triggerLocalPushNotification(title, body);
                  showToast('success', `${title} — ${body}`);
                }
              }
            });
          }
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
      )
    );

    // 12. Notification Reads
    unsubscribers.push(
      onSnapshot(
        query(collection(db, 'notification_reads'), where('studentId', '==', user.uid)),
        (snap) => {
          setReadNotifIds(new Set(snap.docs.map((d) => String(d.data().notifId))));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'notification_reads')
      )
    );

    // 13. Academy Web App Icon Branding
    unsubscribers.push(
      onSnapshot(
        doc(db, 'app_settings', 'branding'),
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as { appIconUrl?: string };
            setCustomAppIconUrl(typeof data.appIconUrl === 'string' ? data.appIconUrl : '');
          }
        },
        () => {
          // Optional branding document fallback
        }
      )
    );

    return () => {
      unsubscribers.forEach((u) => u());
    };
  }, [authReady, user, role, lang, needsOnboarding]);

  const activeStudent: StudentProfile | null = useMemo(() => {
    if (!user) return null;
    if (role === 'student') {
      return students.find((s) => s.uid === user.uid) || null;
    }
    // In Teacher Student-View Preview, display top student or clean placeholder preview profile
    return (
      students[0] || {
        uid: 'preview',
        displayName: user.displayName || 'Ms Nardeen Preview',
        photoURL: TRANSPARENT_AVATAR_PRESETS[0].url,
        level: 'Academy Champion',
        totalPoints: 0,
        lifetimePoints: 0,
        weeklyEarned: 0,
        monthlyEarned: 0,
        weekKey: '2026-W48',
        monthKey: '2026-11',
        completedLessonsCount: 0,
        badges: ['star_of_week'],
        isActive: true,
      }
    );
  }, [user, role, students]);

  const currentRank = useMemo(() => {
    if (!activeStudent) return 0;
    const sorted = [...students]
      .filter((s) => s.isActive)
      .sort((a, b) => b.totalPoints - a.totalPoints);
    const idx = sorted.findIndex((s) => s.uid === activeStudent.uid);
    return idx >= 0 ? idx + 1 : 0;
  }, [students, activeStudent]);

  const unreadNotesCount = useMemo(
    () => notes.filter((n) => !readNoteIds.has(n.id)).length,
    [notes, readNoteIds]
  );

  const unreadNotifsCount = useMemo(
    () => notifications.filter((n) => !readNotifIds.has(n.id)).length,
    [notifications, readNotifIds]
  );

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code || '')
          : '';
      const rawMessage = err instanceof Error ? err.message : String(err);

      if (code === 'auth/unauthorized-domain' || rawMessage.includes('auth/unauthorized-domain')) {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        setAuthError(
          lang === 'ar'
            ? `النطاق الحالي غير مصرح به في Firebase Authentication:\n${host}\nيرجى إضافة هذا النطاق في Firebase Console ← Authentication ← Settings ← Authorized domains.`
            : `Current domain is not authorized in Firebase Authentication:\n${host}\nPlease add this domain under Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else if (code === 'auth/popup-blocked') {
        setAuthError(
          lang === 'ar'
            ? 'قام المتصفح بحظر نافذة تسجيل الدخول. يرجى السماح بالنوافذ المنبثقة لهذا الموقع والمحاولة مرة أخرى.'
            : 'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.'
        );
      } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError(
          lang === 'ar'
            ? 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.'
            : 'The sign-in window was closed before completing sign-in.'
        );
      } else {
        setAuthError(rawMessage || 'Google Sign-In failed');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleChangeLang = async (nextLang: Language) => {
    setLang(nextLang);
    if (user) {
      await updateUserPreferences(user.uid, { preferredLanguage: nextLang });
    }
  };

  const handleChangeTheme = async (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    if (user) {
      await updateUserPreferences(user.uid, { preferredTheme: nextTheme });
    }
  };

  const handleEnableNotifications = async () => {
    const res = await requestBrowserAndFcmNotifications();
    if (res.granted && user) {
      await updateUserPreferences(user.uid, {
        notificationsEnabled: true,
        ...(res.fcmToken ? { fcmToken: res.fcmToken } : {}),
      });
      setUserPrivate((prev) => (prev ? { ...prev, notificationsEnabled: true } : prev));
      showToast(
        'success',
        lang === 'ar' ? 'تم تفعيل الإشعارات الفورية بنجاح!' : 'Push notifications enabled!'
      );
    } else {
      showToast(
        'error',
        lang === 'ar'
          ? 'يرجى السماح بالإشعارات من إعدادات المتصفح.'
          : 'Please allow notifications in your browser settings.'
      );
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#0B1120]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl border-4 border-sky-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {t(lang, 'loadingText')}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        lang={lang}
        theme={theme}
        loading={authLoading}
        error={authError}
        appIconUrl={customAppIconUrl || ASSET_IMAGES.appIcon}
        pendingPhotoURL={pendingPhotoURL}
        onSelectPendingPhoto={setPendingPhotoURL}
        onToggleLang={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        onSignIn={handleGoogleSignIn}
      />
    );
  }

  if (role === 'student' && needsOnboarding) {
    return (
      <StudentOnboardingScreen
        lang={lang}
        defaultName={user.displayName || ''}
        defaultPhotoURL={pendingPhotoURL || user.photoURL || TRANSPARENT_AVATAR_PRESETS[0].url}
        onComplete={async (displayName, photoURL) => {
          await completeStudentRegistration(user, displayName, photoURL);
          setPendingPhotoURL('');
          setNeedsOnboarding(false);
          celebrateAchievement(false);
          showToast(
            'success',
            lang === 'ar'
              ? 'مرحبًا بك في Ms nardeen Academy! تم إنشاء حسابك بنجاح.'
              : 'Welcome to Ms nardeen Academy! Your profile is ready.'
          );
        }}
        onSignOut={handleSignOut}
      />
    );
  }

  const isTeacher = role === 'teacher';
  const showTeacherSidebar = isTeacher && !teacherPreviewStudentMode;

  const studentNavItems: { id: AppTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'home', label: t(lang, 'navHome'), icon: <Home className="w-5 h-5" /> },
    { id: 'lessons', label: t(lang, 'navLessons'), icon: <BookOpen className="w-5 h-5" /> },
    { id: 'tasks', label: t(lang, 'navTasks'), icon: <ClipboardList className="w-5 h-5" /> },
    { id: 'leaderboard', label: t(lang, 'navLeaderboard'), icon: <Trophy className="w-5 h-5" /> },
    { id: 'rewards', label: t(lang, 'navRewards'), icon: <Gift className="w-5 h-5" /> },
    {
      id: 'notes',
      label: t(lang, 'navNotes'),
      icon: <Bell className="w-5 h-5" />,
      count: unreadNotesCount,
    },
    { id: 'profile', label: t(lang, 'navProfile'), icon: <UserIcon className="w-5 h-5" /> },
    {
      id: 'settings',
      label: t(lang, 'navSettings'),
      icon: <Settings className="w-5 h-5" />,
      count: unreadNotifsCount,
    },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white dark:bg-slate-900 border-e border-slate-200/80 dark:border-slate-800 p-5 justify-between z-30">
        <div className="space-y-6">
          <div className="px-2 flex items-center gap-3">
            <img
              src={customAppIconUrl || ASSET_IMAGES.appIcon}
              alt={t(lang, 'brandName')}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-cover border border-sky-200/80 dark:border-sky-800 shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <span className="text-lg font-bold tracking-tight text-sky-700 dark:text-sky-300 block truncate">
                {t(lang, 'brandName')}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isTeacher ? t(lang, 'teacherRole') : t(lang, 'studentRole')}
              </p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {isTeacher && (
              <button
                type="button"
                onClick={() => {
                  setTeacherPreviewStudentMode(false);
                  setActiveTab('teacher');
                }}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                  activeTab === 'teacher' && !teacherPreviewStudentMode
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>{t(lang, 'navTeacher')}</span>
              </button>
            )}

            {(!isTeacher || teacherPreviewStudentMode) &&
              studentNavItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl text-sm font-semibold flex items-center justify-between transition-colors ${
                    activeTab === item.id
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-bold tabular-nums">
                      {item.count}
                    </span>
                  )}
                </button>
              ))}

            {showTeacherSidebar && (
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-2xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span>{t(lang, 'navSettings')}</span>
              </button>
            )}
          </nav>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          {isTeacher && (
            <button
              type="button"
              onClick={() => {
                const next = !teacherPreviewStudentMode;
                setTeacherPreviewStudentMode(next);
                setActiveTab(next ? 'home' : 'teacher');
              }}
              className="w-full min-h-[42px] px-3.5 py-2 rounded-2xl bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-xs font-bold flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              <span>
                {teacherPreviewStudentMode
                  ? t(lang, 'backToTeacherDashboard')
                  : t(lang, 'previewStudentMode')}
              </span>
            </button>
          )}

          {activeStudent && (!isTeacher || teacherPreviewStudentMode) && (
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-slate-800 p-0.5 shrink-0 overflow-hidden flex items-center justify-center">
                <AvatarImage
                  src={activeStudent.photoURL}
                  alt={activeStudent.displayName}
                  className="w-full h-full rounded-lg"
                  transparentStage
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {activeStudent.displayName}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-bold tabular-nums">
                  {activeStudent.totalPoints} {t(lang, 'pointsUnit')}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Compact Top Bar (52px) */}
      <header className="lg:hidden sticky top-0 z-30 w-full max-w-full h-13 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-4 flex items-center justify-between gap-2 overflow-hidden">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={customAppIconUrl || ASSET_IMAGES.appIcon}
            alt={t(lang, 'brandName')}
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-lg object-cover border border-sky-200/80 dark:border-sky-800 shrink-0"
          />
          <span className="text-sm sm:text-base font-bold text-sky-700 dark:text-sky-300 truncate">
            {t(lang, 'brandName')}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isTeacher && (
            <button
              type="button"
              onClick={() => {
                const next = !teacherPreviewStudentMode;
                setTeacherPreviewStudentMode(next);
                setActiveTab(next ? 'home' : 'teacher');
              }}
              className="min-h-[38px] px-2.5 sm:px-3 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-xs font-bold whitespace-nowrap"
            >
              {teacherPreviewStudentMode ? t(lang, 'navTeacher') : t(lang, 'previewStudentMode')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="min-h-[40px] min-w-[40px] rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center relative"
            aria-label={t(lang, 'navSettings')}
          >
            <Settings className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center justify-center tabular-nums">
                {unreadNotifsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 w-full lg:ps-64 pb-24 lg:pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
          {/* Teacher Dashboard (Strictly Role-Gated) */}
          {activeTab === 'teacher' && (
            isTeacher ? (
              <TeacherDashboard
                lang={lang}
                teacherUid={user.uid}
                students={students}
                lessons={lessons}
                tasks={tasks}
                submissions={submissions}
                notes={notes}
                rewards={rewards}
                redemptions={redemptions}
                transactions={transactions}
                notifications={notifications}
                onNotifyToast={showToast}
              />
            ) : (
              <div className="rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 p-10 text-center max-w-md mx-auto my-12">
                <Lock className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  {t(lang, 'accessDeniedTitle')}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t(lang, 'accessDeniedDesc')}
                </p>
              </div>
            )
          )}

          {activeTab === 'home' && activeStudent && (
            <StudentHome
              lang={lang}
              student={activeStudent}
              rank={currentRank}
              totalStudents={students.filter((s) => s.isActive).length}
              lessons={lessons}
              completions={completions}
              notes={notes}
              readNoteIds={readNoteIds}
              tasks={tasks}
              submissions={submissions}
              notificationsEnabled={Boolean(userPrivate?.notificationsEnabled)}
              onEnableNotifications={handleEnableNotifications}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenLesson={(lesson) => {
                setSelectedLesson(lesson);
                setActiveTab('lessons');
              }}
              onOpenTask={(task) => {
                setSelectedTask(task);
                setActiveTab('tasks');
              }}
            />
          )}

          {activeTab === 'lessons' && (
            <LessonsView
              lang={lang}
              lessons={lessons}
              completions={completions}
              isTeacherPreview={isTeacher}
              selectedLesson={selectedLesson}
              onSelectLesson={setSelectedLesson}
              onCompleteLesson={async (lesson) => {
                if (!activeStudent || isTeacher) return;
                try {
                  const newBadges = await completeLessonAtomically(activeStudent, lesson);
                  celebrateAchievement(newBadges.length > 0);
                  showToast(
                    'success',
                    lang === 'ar'
                      ? `أحسنت! حصلت على +${lesson.points} نقطة`
                      : `Awesome! You earned +${lesson.points} points!`
                  );
                } catch (err) {
                  showToast('error', err instanceof Error ? err.message : 'Failed to complete lesson');
                }
              }}
              onDeleteLesson={
                isTeacher
                  ? async (lessonId) => {
                      try {
                        await deleteLesson(lessonId);
                        if (selectedLesson?.id === lessonId) setSelectedLesson(null);
                        showToast('success', lang === 'ar' ? 'تم حذف الدرس' : 'Lesson deleted');
                      } catch (err) {
                        showToast('error', err instanceof Error ? err.message : 'Failed to delete lesson');
                      }
                    }
                  : undefined
              }
            />
          )}

          {activeTab === 'tasks' && (
            <TasksView
              lang={lang}
              tasks={tasks}
              submissions={submissions}
              isTeacherPreview={isTeacher}
              selectedTask={selectedTask}
              onSelectTask={setSelectedTask}
              onSubmitQuiz={async (task, answers) => {
                if (!activeStudent || isTeacher) return;
                try {
                  const res = await submitQuizAtomically(activeStudent, task, answers);
                  celebrateAchievement(res.score === res.maxScore);
                  showToast(
                    'success',
                    `${t(lang, 'quizSubmitted')} (+${res.pointsAwarded} ${t(lang, 'pointsUnit')})`
                  );
                } catch (err) {
                  showToast('error', err instanceof Error ? err.message : 'Failed to submit quiz');
                }
              }}
              onSubmitHomework={async (task, answerText) => {
                if (!activeStudent || isTeacher) return;
                try {
                  await submitHomework(activeStudent, task, answerText);
                  showToast('success', t(lang, 'homeworkSubmitted'));
                } catch (err) {
                  showToast('error', err instanceof Error ? err.message : 'Failed to submit homework');
                }
              }}
              onDeleteTask={
                isTeacher
                  ? async (taskId) => {
                      try {
                        await deleteTask(taskId);
                        if (selectedTask?.id === taskId) setSelectedTask(null);
                        showToast('success', lang === 'ar' ? 'تم حذف المهمة' : 'Task deleted');
                      } catch (err) {
                        showToast('error', err instanceof Error ? err.message : 'Failed to delete task');
                      }
                    }
                  : undefined
              }
            />
          )}

          {activeTab === 'leaderboard' && (
            <LeaderboardView
              lang={lang}
              students={students}
              currentStudentId={activeStudent?.uid}
              isTeacher={isTeacher}
              onDeleteStudent={
                isTeacher
                  ? async (studentId) => {
                      try {
                        await deleteStudentProfile(studentId);
                        showToast(
                          'success',
                          lang === 'ar' ? 'تمت إزالة ملف الطالب بنجاح' : 'Student profile removed'
                        );
                      } catch (err) {
                        showToast(
                          'error',
                          err instanceof Error ? err.message : 'Failed to remove student profile'
                        );
                      }
                    }
                  : undefined
              }
            />
          )}

          {activeTab === 'rewards' && activeStudent && (
            <RewardsStoreView
              lang={lang}
              student={activeStudent}
              rewards={rewards}
              redemptions={redemptions}
              isTeacherPreview={isTeacher}
              onRedeem={async (reward) => {
                if (isTeacher) return;
                try {
                  await requestRewardRedemption(activeStudent, reward);
                  showToast('success', t(lang, 'requestSentNotice'));
                } catch (err) {
                  showToast('error', err instanceof Error ? err.message : 'Redemption request failed');
                }
              }}
              onDeleteReward={
                isTeacher
                  ? async (rewardId) => {
                      try {
                        await deleteReward(rewardId);
                        showToast('success', lang === 'ar' ? 'تم حذف الهدية' : 'Reward deleted');
                      } catch (err) {
                        showToast('error', err instanceof Error ? err.message : 'Failed to delete reward');
                      }
                    }
                  : undefined
              }
            />
          )}

          {activeTab === 'notes' && (
            <NotesView
              lang={lang}
              notes={notes}
              readNoteIds={readNoteIds}
              currentStudent={activeStudent}
              currentUserId={user.uid}
              isTeacherPreview={isTeacher}
              onMarkRead={async (noteId) => {
                if (!user) return;
                await markNoteRead(user.uid, noteId);
              }}
              onCreateStudentNote={async (data) => {
                if (!activeStudent || isTeacher) return;
                await publishStudentNoteOrIssue(activeStudent, data);
                showToast(
                  'success',
                  lang === 'ar'
                    ? 'تم نشر مشاركتك لتظهر لجميع الطلاب والمعلمة!'
                    : 'Your post is now visible to all students and the teacher!'
                );
              }}
              onDeleteOwnNote={async (noteId) => {
                if (isTeacher) return;
                await deleteNote(noteId);
                showToast('success', lang === 'ar' ? 'تم حذف الملاحظة' : 'Note deleted');
              }}
              onDeleteNote={async (noteId) => {
                try {
                  await deleteNote(noteId);
                  showToast('success', lang === 'ar' ? 'تم حذف الملاحظة' : 'Note deleted');
                } catch (err) {
                  showToast('error', err instanceof Error ? err.message : 'Failed to delete note');
                }
              }}
            />
          )}

          {activeTab === 'profile' && activeStudent && (
            <ProfileView
              lang={lang}
              student={activeStudent}
              rank={currentRank}
              completions={completions}
              transactions={transactions}
              redemptions={redemptions}
              isTeacherPreview={isTeacher}
              onUpdateProfile={async (displayName, photoURL) => {
                if (!user || isTeacher) return;
                await updateOwnStudentProfile(user.uid, displayName, photoURL);
                showToast('success', lang === 'ar' ? 'تم تحديث الملف الشخصي' : 'Profile updated');
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              lang={lang}
              theme={theme}
              email={user.email || ''}
              isTeacher={isTeacher}
              isBootstrapAdmin={
                isTeacher &&
                (user.email || '').trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL &&
                user.emailVerified
              }
              appIconUrl={customAppIconUrl}
              notificationsEnabled={Boolean(userPrivate?.notificationsEnabled)}
              notifications={notifications}
              readNotifIds={readNotifIds}
              onChangeLang={handleChangeLang}
              onChangeTheme={handleChangeTheme}
              onEnableNotifications={handleEnableNotifications}
              onUpdateAppIcon={async (iconUrl) => {
                await saveAppIconBranding(user.uid, iconUrl);
                setCustomAppIconUrl(iconUrl);
                showToast(
                  'success',
                  lang === 'ar' ? 'تم تحديث أيقونة التطبيق بنجاح!' : 'Web App icon updated!'
                );
              }}
              onDeleteNotification={
                isTeacher
                  ? async (notifId) => {
                      try {
                        await deleteNotification(notifId);
                        showToast('success', lang === 'ar' ? 'تم حذف الإشعار' : 'Notification deleted');
                      } catch (err) {
                        showToast(
                          'error',
                          err instanceof Error ? err.message : 'Failed to delete notification'
                        );
                      }
                    }
                  : undefined
              }
              onFactoryReset={async () => {
                await resetAllAcademyDataAndAccounts();
                setCustomAppIconUrl('');
                setPendingPhotoURL('');
                setSelectedLesson(null);
                setSelectedTask(null);
                setTeacherPreviewStudentMode(false);
              }}
              onMarkNotificationRead={async (notifId) => {
                if (!user) return;
                await markNotificationRead(user.uid, notifId);
              }}
              onSignOut={handleSignOut}
            />
          )}
        </div>
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (5 symmetrical thumb-zone items) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 w-full max-w-[100vw] z-40 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center px-1 overflow-hidden">
        {isTeacher && !teacherPreviewStudentMode ? (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('teacher')}
              className={`min-w-0 w-full px-0.5 flex flex-col items-center justify-center min-h-[46px] overflow-hidden ${
                activeTab === 'teacher' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              <span className="text-[11px] font-semibold mt-0.5 truncate max-w-full block">
                {t(lang, 'navTeacher')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('leaderboard')}
              className={`min-w-0 w-full px-0.5 flex flex-col items-center justify-center min-h-[46px] overflow-hidden ${
                activeTab === 'leaderboard' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Trophy className="w-5 h-5 shrink-0" />
              <span className="text-[11px] font-semibold mt-0.5 truncate max-w-full block">
                {t(lang, 'navLeaderboard')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTeacherPreviewStudentMode(true);
                setActiveTab('lessons');
              }}
              className="min-w-0 w-full px-0.5 flex flex-col items-center justify-center min-h-[46px] overflow-hidden text-slate-500 dark:text-slate-400"
            >
              <BookOpen className="w-5 h-5 shrink-0" />
              <span className="text-[11px] font-semibold mt-0.5 truncate max-w-full block">
                {t(lang, 'navLessons')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTeacherPreviewStudentMode(true);
                setActiveTab('rewards');
              }}
              className="min-w-0 w-full px-0.5 flex flex-col items-center justify-center min-h-[46px] overflow-hidden text-slate-500 dark:text-slate-400"
            >
              <Gift className="w-5 h-5 shrink-0" />
              <span className="text-[11px] font-semibold mt-0.5 truncate max-w-full block">
                {t(lang, 'navRewards')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`min-w-0 w-full px-0.5 flex flex-col items-center justify-center min-h-[46px] overflow-hidden ${
                activeTab === 'settings' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Settings className="w-5 h-5 shrink-0" />
              <span className="text-[11px] font-semibold mt-0.5 truncate max-w-full block">
                {t(lang, 'navSettings')}
              </span>
            </button>
          </>
        ) : (
          <>
            {(
              [
                { id: 'home', label: t(lang, 'navHome'), icon: <Home className="w-5 h-5 shrink-0" /> },
                { id: 'lessons', label: t(lang, 'navLessons'), icon: <BookOpen className="w-5 h-5 shrink-0" /> },
                { id: 'tasks', label: t(lang, 'navTasks'), icon: <ClipboardList className="w-5 h-5 shrink-0" /> },
                { id: 'leaderboard', label: t(lang, 'navLeaderboard'), icon: <Trophy className="w-5 h-5 shrink-0" /> },
                { id: 'profile', label: t(lang, 'navProfile'), icon: <UserIcon className="w-5 h-5 shrink-0" /> },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-w-0 w-full px-0.5 flex flex-col items-center justify-center min-h-[46px] overflow-hidden ${
                  activeTab === tab.id ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {tab.icon}
                <span className="text-[11px] font-semibold mt-0.5 truncate max-w-full block">
                  {tab.label}
                </span>
              </button>
            ))}
          </>
        )}
      </nav>

      {/* Mobile Secondary Quick-Links Strip inside Home/Settings? Notes & Rewards are on Home + let's make sure mobile users can also jump to Rewards & Notes easily from Home & Profile! Wait: on mobile bottom bar, let's check if Rewards & Notes are reachable: */}
      <ToastBanner toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AcademyApp />
    </ErrorBoundary>
  );
}
