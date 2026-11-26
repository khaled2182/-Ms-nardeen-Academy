import { signOut, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  BOOTSTRAP_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  evaluateAutoBadges,
  getMonthKey,
  getSuggestedLevel,
  getWeekKey,
  TRANSPARENT_AVATAR_PRESETS,
} from '../lib/gamification';
import {
  AcademyNote,
  AcademyTask,
  Language,
  Lesson,
  QuizQuestion,
  RedemptionRequest,
  RewardItem,
  StudentProfile,
  TaskSubmission,
  TeacherInvite,
  TeacherProfile,
  TeacherRoleType,
  ThemeMode,
  UserPrivate,
  UserRole,
  VALIDATION_LIMITS,
} from '../types';

function clampStr(val: string, max: number): string {
  return val.trim().slice(0, max);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toEmailDocId(email: string): string {
  const clean = normalizeEmail(email);
  const bytes = new TextEncoder().encode(clean);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
    .slice(0, 128);
}

function makeTxId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export async function bootstrapUserSession(user: User): Promise<{
  role: UserRole;
  isAdminTeacher: boolean;
  userPrivate: UserPrivate;
  studentProfile: StudentProfile | null;
  needsOnboarding: boolean;
}> {
  const uid = user.uid;
  const email = normalizeEmail(user.email || '');
  const isBootstrapTeacher = email === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() && user.emailVerified;

  let isRegisteredTeacher = isBootstrapTeacher;
  let teacherRoleType: TeacherRoleType = isBootstrapTeacher ? 'admin' : 'teacher';

  if (!isRegisteredTeacher && user.emailVerified) {
    try {
      const teacherSnap = await getDoc(doc(db, 'teachers', uid));
      if (teacherSnap.exists()) {
        isRegisteredTeacher = true;
        const tData = teacherSnap.data() as TeacherProfile;
        teacherRoleType = tData.roleType === 'admin' ? 'admin' : 'teacher';
      }
    } catch {
      // Non-teachers cannot read missing teacher docs; fallback to invite check
    }
  }

  if (!isRegisteredTeacher && user.emailVerified && email) {
    try {
      const inviteId = toEmailDocId(email);
      const inviteSnap = await getDoc(doc(db, 'teacher_invites', inviteId));
      if (inviteSnap.exists()) {
        const invite = inviteSnap.data() as Omit<TeacherInvite, 'id'>;
        if (normalizeEmail(invite.email) === email) {
          const batch = writeBatch(db);
          batch.set(doc(db, 'teachers', uid), {
            uid,
            email,
            displayName: clampStr(
              invite.displayName || user.displayName || 'Teacher',
              VALIDATION_LIMITS.DISPLAY_NAME_MAX
            ),
            roleType: invite.roleType === 'admin' ? 'admin' : 'teacher',
            inviteId,
            addedBy: invite.addedBy,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          batch.update(doc(db, 'teacher_invites', inviteId), {
            status: 'active',
            uid,
            updatedAt: serverTimestamp(),
          });
          await batch.commit();
          isRegisteredTeacher = true;
          teacherRoleType = invite.roleType === 'admin' ? 'admin' : 'teacher';
        }
      }
    } catch {
      // No invite or not eligible
    }
  }

  const role: UserRole = isRegisteredTeacher ? 'teacher' : 'student';
  const isAdminTeacher = isBootstrapTeacher || (isRegisteredTeacher && teacherRoleType === 'admin');
  const privateRef = doc(db, 'user_private', uid);
  let userPrivate: UserPrivate;

  try {
    const privateSnap = await getDoc(privateRef);
    if (!privateSnap.exists()) {
      const payload: UserPrivate = {
        uid,
        email: clampStr(user.email || `${uid}@academy.local`, 254),
        role,
        preferredLanguage: 'ar',
        preferredTheme: 'light',
        notificationsEnabled: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(privateRef, payload);
      userPrivate = { ...payload };
    } else {
      const existing = privateSnap.data() as UserPrivate;
      if (existing.role !== role && isRegisteredTeacher) {
        await updateDoc(privateRef, { role: 'teacher', updatedAt: serverTimestamp() });
        userPrivate = { ...existing, role: 'teacher' };
      } else if (existing.role === 'teacher' && !isRegisteredTeacher) {
        userPrivate = { ...existing, role: 'student' };
      } else {
        userPrivate = existing;
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `user_private/${uid}`);
  }

  if (role === 'teacher') {
    return { role, isAdminTeacher, userPrivate, studentProfile: null, needsOnboarding: false };
  }

  const studentRef = doc(db, 'students', uid);
  try {
    const studentSnap = await getDoc(studentRef);
    if (!studentSnap.exists()) {
      return { role, isAdminTeacher: false, userPrivate, studentProfile: null, needsOnboarding: true };
    }
    return {
      role,
      isAdminTeacher: false,
      userPrivate,
      studentProfile: studentSnap.data() as StudentProfile,
      needsOnboarding: false,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `students/${uid}`);
  }
}

export async function completeStudentRegistration(
  user: User,
  displayName: string,
  photoURL: string
): Promise<StudentProfile> {
  const uid = user.uid;
  const studentRef = doc(db, 'students', uid);
  const fallbackAvatar =
    TRANSPARENT_AVATAR_PRESETS[uid.charCodeAt(0) % TRANSPARENT_AVATAR_PRESETS.length].url;

  const newStudent: StudentProfile = {
    uid,
    displayName: clampStr(displayName || user.displayName || 'New Learner', VALIDATION_LIMITS.DISPLAY_NAME_MAX),
    photoURL: clampStr(photoURL || user.photoURL || fallbackAvatar, VALIDATION_LIMITS.PHOTO_URL_MAX),
    level: 'Beginner',
    totalPoints: 0,
    lifetimePoints: 0,
    weeklyEarned: 0,
    monthlyEarned: 0,
    weekKey: getWeekKey(),
    monthKey: getMonthKey(),
    completedLessonsCount: 0,
    badges: [],
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(studentRef, newStudent);
    return newStudent;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `students/${uid}`);
  }
}

export async function updateUserPreferences(
  uid: string,
  prefs: Partial<{
    preferredLanguage: Language;
    preferredTheme: ThemeMode;
    notificationsEnabled: boolean;
    fcmToken: string;
  }>
): Promise<void> {
  const path = `user_private/${uid}`;
  try {
    await updateDoc(doc(db, 'user_private', uid), {
      ...prefs,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateOwnStudentProfile(
  uid: string,
  displayName: string,
  photoURL: string
): Promise<void> {
  const path = `students/${uid}`;
  try {
    await updateDoc(doc(db, 'students', uid), {
      displayName: clampStr(displayName, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
      photoURL: clampStr(photoURL, VALIDATION_LIMITS.PHOTO_URL_MAX),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function completeLessonAtomically(
  student: StudentProfile,
  lesson: Lesson
): Promise<string[]> {
  const uid = student.uid;
  const completionId = `${uid}_${lesson.id}`;
  const txId = makeTxId('lsn');
  const currentWeek = getWeekKey();
  const currentMonth = getMonthKey();
  const pts = Math.max(0, Math.min(1000, Math.round(lesson.points)));

  const nextWeekly = student.weekKey === currentWeek ? student.weeklyEarned + pts : pts;
  const nextMonthly = student.monthKey === currentMonth ? student.monthlyEarned + pts : pts;
  const nextTotal = student.totalPoints + pts;
  const nextLifetime = student.lifetimePoints + pts;
  const nextLessonsCount = student.completedLessonsCount + 1;
  const nextBadges = evaluateAutoBadges(student.badges, {
    completedLessonsCount: nextLessonsCount,
    lifetimePoints: nextLifetime,
  });

  const batch = writeBatch(db);

  batch.set(doc(db, 'lesson_completions', completionId), {
    studentId: uid,
    lessonId: lesson.id,
    lessonTitle: clampStr(lesson.title, VALIDATION_LIMITS.TITLE_MAX),
    pointsAwarded: pts,
    completedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'point_transactions', txId), {
    studentId: uid,
    studentName: clampStr(student.displayName, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
    amount: pts,
    type: 'earn',
    sourceType: 'lesson',
    sourceId: lesson.id,
    reason: clampStr(`Completed lesson: ${lesson.title}`, VALIDATION_LIMITS.REASON_MAX),
    reasonAr: clampStr(`إتمام درس: ${lesson.titleAr}`, VALIDATION_LIMITS.REASON_MAX),
    weekKey: currentWeek,
    monthKey: currentMonth,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });

  batch.update(doc(db, 'students', uid), {
    totalPoints: nextTotal,
    lifetimePoints: nextLifetime,
    weeklyEarned: nextWeekly,
    monthlyEarned: nextMonthly,
    weekKey: currentWeek,
    monthKey: currentMonth,
    completedLessonsCount: nextLessonsCount,
    badges: nextBadges,
    lastTxId: txId,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return nextBadges.filter((b) => !student.badges.includes(b));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `lesson_completions/${completionId}`);
  }
}

export async function submitQuizAtomically(
  student: StudentProfile,
  task: AcademyTask,
  selectedAnswers: number[]
): Promise<{ score: number; maxScore: number; pointsAwarded: number; newBadges: string[] }> {
  const uid = student.uid;
  const subId = `${uid}_${task.id}`;
  const txId = makeTxId('quiz');
  const maxScore = Math.max(1, task.questions.length);

  let correctCount = 0;
  task.questions.forEach((q, idx) => {
    if (selectedAnswers[idx] === q.correctIndex) {
      correctCount += 1;
    }
  });

  const ratio = correctCount / maxScore;
  const pointsAwarded = Math.max(0, Math.min(task.points, Math.round(task.points * ratio)));

  const currentWeek = getWeekKey();
  const currentMonth = getMonthKey();
  const nextWeekly =
    student.weekKey === currentWeek ? student.weeklyEarned + pointsAwarded : pointsAwarded;
  const nextMonthly =
    student.monthKey === currentMonth ? student.monthlyEarned + pointsAwarded : pointsAwarded;
  const nextTotal = student.totalPoints + pointsAwarded;
  const nextLifetime = student.lifetimePoints + pointsAwarded;
  const nextBadges = evaluateAutoBadges(student.badges, {
    completedLessonsCount: student.completedLessonsCount,
    lifetimePoints: nextLifetime,
    didQuiz: true,
  });

  const batch = writeBatch(db);

  batch.set(doc(db, 'task_submissions', subId), {
    studentId: uid,
    studentName: clampStr(student.displayName, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
    taskId: task.id,
    taskTitle: clampStr(task.title, VALIDATION_LIMITS.TITLE_MAX),
    taskType: 'quiz',
    answerText: `${correctCount}/${maxScore}`,
    selectedAnswers: selectedAnswers.slice(0, 20),
    score: correctCount,
    maxScore,
    status: 'completed',
    pointsAwarded,
    teacherFeedback: '',
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'point_transactions', txId), {
    studentId: uid,
    studentName: clampStr(student.displayName, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
    amount: pointsAwarded,
    type: 'earn',
    sourceType: 'quiz',
    sourceId: task.id,
    reason: clampStr(
      `Quiz: ${task.title} (${correctCount}/${maxScore})`,
      VALIDATION_LIMITS.REASON_MAX
    ),
    reasonAr: clampStr(
      `اختبار: ${task.titleAr} (${correctCount}/${maxScore})`,
      VALIDATION_LIMITS.REASON_MAX
    ),
    weekKey: currentWeek,
    monthKey: currentMonth,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });

  batch.update(doc(db, 'students', uid), {
    totalPoints: nextTotal,
    lifetimePoints: nextLifetime,
    weeklyEarned: nextWeekly,
    monthlyEarned: nextMonthly,
    weekKey: currentWeek,
    monthKey: currentMonth,
    badges: nextBadges,
    lastTxId: txId,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    return {
      score: correctCount,
      maxScore,
      pointsAwarded,
      newBadges: nextBadges.filter((b) => !student.badges.includes(b)),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `task_submissions/${subId}`);
  }
}

export async function submitHomework(
  student: StudentProfile,
  task: AcademyTask,
  answerText: string
): Promise<void> {
  const subId = `${student.uid}_${task.id}`;
  try {
    await setDoc(doc(db, 'task_submissions', subId), {
      studentId: student.uid,
      studentName: clampStr(student.displayName, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
      taskId: task.id,
      taskTitle: clampStr(task.title, VALIDATION_LIMITS.TITLE_MAX),
      taskType: 'homework',
      answerText: clampStr(answerText, 2000),
      selectedAnswers: [],
      score: 0,
      maxScore: 100,
      status: 'pending',
      pointsAwarded: 0,
      teacherFeedback: '',
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `task_submissions/${subId}`);
  }
}

export async function requestRewardRedemption(
  student: StudentProfile,
  reward: RewardItem
): Promise<void> {
  const ref = doc(collection(db, 'redemptions'));
  try {
    await setDoc(ref, {
      studentId: student.uid,
      studentName: clampStr(student.displayName, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
      rewardId: reward.id,
      rewardTitle: clampStr(reward.title, VALIDATION_LIMITS.REWARD_TITLE_MAX),
      rewardTitleAr: clampStr(reward.titleAr, VALIDATION_LIMITS.REWARD_TITLE_MAX),
      costPoints: reward.costPoints,
      status: 'pending',
      teacherNote: '',
      requestedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'redemptions');
  }
}

export async function markNoteRead(studentId: string, noteId: string): Promise<void> {
  const readId = `${studentId}_${noteId}`;
  try {
    await setDoc(doc(db, 'note_reads', readId), {
      studentId,
      noteId,
      readAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `note_reads/${readId}`);
  }
}

export async function markNotificationRead(studentId: string, notifId: string): Promise<void> {
  const readId = `${studentId}_${notifId}`;
  try {
    await setDoc(doc(db, 'notification_reads', readId), {
      studentId,
      notifId,
      readAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `notification_reads/${readId}`);
  }
}

// ==========================================
// TEACHER DASHBOARD OPERATIONS
// ==========================================

export async function createOrUpdateLesson(
  teacherUid: string,
  data: {
    id?: string;
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
    videoUrl: string;
    thumbnailUrl: string;
    level: string;
    unit: string;
    topic: string;
    teacherNotes: string;
    teacherNotesAr: string;
    points: number;
    durationMinutes: number;
    isPublished: boolean;
  }
): Promise<void> {
  const isEdit = Boolean(data.id);
  const ref = data.id ? doc(db, 'lessons', data.id) : doc(collection(db, 'lessons'));

  const payload = {
    title: clampStr(data.title, VALIDATION_LIMITS.TITLE_MAX),
    titleAr: clampStr(data.titleAr || data.title, VALIDATION_LIMITS.TITLE_MAX),
    description: clampStr(data.description, VALIDATION_LIMITS.DESCRIPTION_MAX),
    descriptionAr: clampStr(data.descriptionAr || data.description, VALIDATION_LIMITS.DESCRIPTION_MAX),
    videoUrl: clampStr(data.videoUrl, VALIDATION_LIMITS.VIDEO_URL_MAX),
    thumbnailUrl: clampStr(data.thumbnailUrl, VALIDATION_LIMITS.PHOTO_URL_MAX),
    level: clampStr(data.level || 'Beginner', VALIDATION_LIMITS.LEVEL_MAX),
    unit: clampStr(data.unit || 'Unit 1', 60),
    topic: clampStr(data.topic || 'Phonics', 60),
    teacherNotes: clampStr(data.teacherNotes, VALIDATION_LIMITS.TEACHER_NOTES_MAX),
    teacherNotesAr: clampStr(data.teacherNotesAr || data.teacherNotes, VALIDATION_LIMITS.TEACHER_NOTES_MAX),
    points: Math.max(0, Math.min(1000, Math.round(data.points))),
    durationMinutes: Math.max(1, Math.min(300, Math.round(data.durationMinutes))),
    isPublished: data.isPublished,
    updatedAt: serverTimestamp(),
  };

  try {
    if (isEdit) {
      await updateDoc(ref, payload);
    } else {
      const batch = writeBatch(db);
      batch.set(ref, {
        ...payload,
        createdBy: teacherUid,
        createdAt: serverTimestamp(),
      });
      if (data.isPublished) {
        const notifRef = doc(collection(db, 'notifications'));
        batch.set(notifRef, {
          targetStudentId: 'all',
          title: clampStr(`New Video Lesson: ${payload.title}`, VALIDATION_LIMITS.TITLE_MAX),
          titleAr: clampStr(`درس فيديو جديد: ${payload.titleAr}`, VALIDATION_LIMITS.TITLE_MAX),
          body: clampStr(
            `Watch now to earn ${payload.points} points!`,
            VALIDATION_LIMITS.NOTIF_BODY_MAX
          ),
          bodyAr: clampStr(
            `شاهد الدرس الآن واحصل على ${payload.points} نقطة!`,
            VALIDATION_LIMITS.NOTIF_BODY_MAX
          ),
          type: 'video',
          linkTab: 'lessons',
          createdBy: teacherUid,
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, isEdit ? OperationType.UPDATE : OperationType.CREATE, 'lessons');
  }
}

export async function deleteLesson(lessonId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'lessons', lessonId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `lessons/${lessonId}`);
  }
}

export async function createOrUpdateTask(
  teacherUid: string,
  data: {
    id?: string;
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
  }
): Promise<void> {
  const isEdit = Boolean(data.id);
  const ref = data.id ? doc(db, 'tasks', data.id) : doc(collection(db, 'tasks'));

  const payload = {
    title: clampStr(data.title, VALIDATION_LIMITS.TITLE_MAX),
    titleAr: clampStr(data.titleAr || data.title, VALIDATION_LIMITS.TITLE_MAX),
    description: clampStr(data.description, VALIDATION_LIMITS.DESCRIPTION_MAX),
    descriptionAr: clampStr(data.descriptionAr || data.description, VALIDATION_LIMITS.DESCRIPTION_MAX),
    type: data.type,
    level: clampStr(data.level || 'Beginner', VALIDATION_LIMITS.LEVEL_MAX),
    points: Math.max(0, Math.min(1000, Math.round(data.points))),
    dueDate: clampStr(data.dueDate, 40),
    attachmentUrl: clampStr(data.attachmentUrl, 1000),
    questions: data.type === 'quiz' ? data.questions.slice(0, 20) : [],
    isPublished: data.isPublished,
    updatedAt: serverTimestamp(),
  };

  try {
    if (isEdit) {
      await updateDoc(ref, payload);
    } else {
      const batch = writeBatch(db);
      batch.set(ref, {
        ...payload,
        createdBy: teacherUid,
        createdAt: serverTimestamp(),
      });
      if (data.isPublished) {
        batch.set(doc(collection(db, 'notifications')), {
          targetStudentId: 'all',
          title: clampStr(`New ${data.type === 'quiz' ? 'Quiz' : 'Homework'}: ${payload.title}`, VALIDATION_LIMITS.TITLE_MAX),
          titleAr: clampStr(`${data.type === 'quiz' ? 'اختبار' : 'واجب'} جديد: ${payload.titleAr}`, VALIDATION_LIMITS.TITLE_MAX),
          body: clampStr(`Complete to earn up to ${payload.points} points!`, VALIDATION_LIMITS.NOTIF_BODY_MAX),
          bodyAr: clampStr(`أنجز المهمة الآن واحصل على ${payload.points} نقطة!`, VALIDATION_LIMITS.NOTIF_BODY_MAX),
          type: 'task',
          linkTab: 'tasks',
          createdBy: teacherUid,
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, isEdit ? OperationType.UPDATE : OperationType.CREATE, 'tasks');
  }
}

export async function deleteTask(taskId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tasks/${taskId}`);
  }
}

export async function gradeHomeworkSubmission(
  teacherUid: string,
  submission: TaskSubmission,
  student: StudentProfile,
  decision: 'approved' | 'rejected',
  pointsToAward: number,
  feedback: string
): Promise<void> {
  const batch = writeBatch(db);
  const subRef = doc(db, 'task_submissions', submission.id);
  const awarded = decision === 'approved' ? Math.max(0, Math.min(1000, Math.round(pointsToAward))) : 0;

  batch.update(subRef, {
    status: decision,
    pointsAwarded: awarded,
    teacherFeedback: clampStr(feedback, VALIDATION_LIMITS.FEEDBACK_MAX),
    updatedAt: serverTimestamp(),
  });

  if (decision === 'approved' && awarded > 0) {
    const txId = makeTxId('hw');
    const currentWeek = getWeekKey();
    const currentMonth = getMonthKey();
    const nextWeekly = student.weekKey === currentWeek ? student.weeklyEarned + awarded : awarded;
    const nextMonthly = student.monthKey === currentMonth ? student.monthlyEarned + awarded : awarded;

    batch.set(doc(db, 'point_transactions', txId), {
      studentId: student.uid,
      studentName: clampStr(student.displayName, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
      amount: awarded,
      type: 'earn',
      sourceType: 'homework',
      sourceId: submission.taskId,
      reason: clampStr(`Homework approved: ${submission.taskTitle}`, VALIDATION_LIMITS.REASON_MAX),
      reasonAr: clampStr(`اعتماد الواجب: ${submission.taskTitle}`, VALIDATION_LIMITS.REASON_MAX),
      weekKey: currentWeek,
      monthKey: currentMonth,
      createdBy: teacherUid,
      createdAt: serverTimestamp(),
    });

    batch.update(doc(db, 'students', student.uid), {
      totalPoints: student.totalPoints + awarded,
      lifetimePoints: student.lifetimePoints + awarded,
      weeklyEarned: nextWeekly,
      monthlyEarned: nextMonthly,
      weekKey: currentWeek,
      monthKey: currentMonth,
      lastTxId: txId,
      updatedAt: serverTimestamp(),
    });
  }

  batch.set(doc(collection(db, 'notifications')), {
    targetStudentId: student.uid,
    title: decision === 'approved' ? 'Homework Approved!' : 'Homework Reviewed',
    titleAr: decision === 'approved' ? 'تم اعتماد واجبك!' : 'تمت مراجعة واجبك',
    body:
      decision === 'approved'
        ? `You earned +${awarded} points for "${submission.taskTitle}".`
        : `Ms Nardeen reviewed "${submission.taskTitle}". Check feedback.`,
    bodyAr:
      decision === 'approved'
        ? `حصلت على +${awarded} نقطة عن واجب "${submission.taskTitle}".`
        : `راجعت Ms Nardeen واجب "${submission.taskTitle}". تفقد الملاحظة.`,
    type: 'points',
    linkTab: 'tasks',
    createdBy: teacherUid,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `task_submissions/${submission.id}`);
  }
}

export async function publishNoteOrAnnouncement(
  teacherUid: string,
  data: {
    title: string;
    titleAr: string;
    content: string;
    contentAr: string;
    targetStudentId: string;
    category: 'announcement' | 'note';
    attachmentUrl: string;
    attachmentType: 'none' | 'link' | 'image' | 'file';
  }
): Promise<void> {
  const noteRef = doc(collection(db, 'notes'));
  const batch = writeBatch(db);

  const payload = {
    title: clampStr(data.title, VALIDATION_LIMITS.TITLE_MAX),
    titleAr: clampStr(data.titleAr || data.title, VALIDATION_LIMITS.TITLE_MAX),
    content: clampStr(data.content, VALIDATION_LIMITS.NOTE_CONTENT_MAX),
    contentAr: clampStr(data.contentAr || data.content, VALIDATION_LIMITS.NOTE_CONTENT_MAX),
    targetStudentId: data.targetStudentId || 'all',
    category: data.category,
    attachmentUrl: clampStr(data.attachmentUrl, VALIDATION_LIMITS.ATTACHMENT_URL_MAX),
    attachmentType: data.attachmentType,
    authorName: 'Ms Nardeen',
    authorRole: 'teacher' as const,
    createdBy: teacherUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  batch.set(noteRef, payload);
  batch.set(doc(collection(db, 'notifications')), {
    targetStudentId: payload.targetStudentId,
    title: clampStr(
      `${data.category === 'announcement' ? 'Announcement' : 'Teacher Note'}: ${payload.title}`,
      VALIDATION_LIMITS.TITLE_MAX
    ),
    titleAr: clampStr(
      `${data.category === 'announcement' ? 'إعلان جديد' : 'ملاحظة جديدة'}: ${payload.titleAr}`,
      VALIDATION_LIMITS.TITLE_MAX
    ),
    body: clampStr(payload.content, VALIDATION_LIMITS.NOTIF_BODY_MAX),
    bodyAr: clampStr(payload.contentAr, VALIDATION_LIMITS.NOTIF_BODY_MAX),
    type: data.category === 'announcement' ? 'announcement' : 'note',
    linkTab: 'notes',
    createdBy: teacherUid,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'notes');
  }
}

export async function publishStudentNoteOrIssue(
  student: StudentProfile,
  data: {
    title: string;
    content: string;
    category: 'student_note' | 'student_issue';
    attachmentUrl: string;
    attachmentType: 'none' | 'image' | 'link';
  }
): Promise<void> {
  const noteRef = doc(collection(db, 'notes'));
  const cleanTitle = clampStr(data.title, VALIDATION_LIMITS.TITLE_MAX);
  const cleanContent = clampStr(data.content, VALIDATION_LIMITS.NOTE_CONTENT_MAX);

  try {
    await setDoc(noteRef, {
      title: cleanTitle,
      titleAr: cleanTitle,
      content: cleanContent,
      contentAr: cleanContent,
      targetStudentId: 'all',
      category: data.category,
      attachmentUrl: clampStr(data.attachmentUrl, VALIDATION_LIMITS.ATTACHMENT_URL_MAX),
      attachmentType: data.attachmentType,
      authorName: clampStr(student.displayName || 'Student', VALIDATION_LIMITS.DISPLAY_NAME_MAX),
      authorRole: 'student',
      createdBy: student.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'notes');
  }
}

export async function deleteNote(noteId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'notes', noteId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `notes/${noteId}`);
  }
}

export async function createOrUpdateReward(
  teacherUid: string,
  data: {
    id?: string;
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
    costPoints: number;
    category: 'physical' | 'virtual';
    imageUrl: string;
    isAvailable: boolean;
  }
): Promise<void> {
  const isEdit = Boolean(data.id);
  const ref = data.id ? doc(db, 'rewards', data.id) : doc(collection(db, 'rewards'));
  const payload = {
    title: clampStr(data.title, VALIDATION_LIMITS.REWARD_TITLE_MAX),
    titleAr: clampStr(data.titleAr || data.title, VALIDATION_LIMITS.REWARD_TITLE_MAX),
    description: clampStr(data.description, VALIDATION_LIMITS.REWARD_DESC_MAX),
    descriptionAr: clampStr(data.descriptionAr || data.description, VALIDATION_LIMITS.REWARD_DESC_MAX),
    costPoints: Math.max(1, Math.min(100000, Math.round(data.costPoints))),
    category: data.category,
    imageUrl: clampStr(data.imageUrl, VALIDATION_LIMITS.PHOTO_URL_MAX),
    isAvailable: data.isAvailable,
    updatedAt: serverTimestamp(),
  };

  try {
    if (isEdit) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, {
        ...payload,
        createdBy: teacherUid,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isEdit ? OperationType.UPDATE : OperationType.CREATE, 'rewards');
  }
}

export async function deleteReward(rewardId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'rewards', rewardId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `rewards/${rewardId}`);
  }
}

export async function reviewRedemptionRequest(
  teacherUid: string,
  request: RedemptionRequest,
  student: StudentProfile,
  decision: 'approved' | 'rejected',
  teacherNote: string
): Promise<void> {
  if (decision === 'approved' && student.totalPoints < request.costPoints) {
    throw new Error('Student no longer has enough points for this reward.');
  }

  const batch = writeBatch(db);
  batch.update(doc(db, 'redemptions', request.id), {
    status: decision,
    teacherNote: clampStr(teacherNote, 300),
    updatedAt: serverTimestamp(),
  });

  if (decision === 'approved') {
    const txId = makeTxId('rdm');
    const currentWeek = getWeekKey();
    const currentMonth = getMonthKey();

    batch.set(doc(db, 'point_transactions', txId), {
      studentId: student.uid,
      studentName: clampStr(student.displayName, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
      amount: -request.costPoints,
      type: 'redeem',
      sourceType: 'reward',
      sourceId: request.rewardId,
      reason: clampStr(`Redeemed reward: ${request.rewardTitle}`, VALIDATION_LIMITS.REASON_MAX),
      reasonAr: clampStr(`استبدال هدية: ${request.rewardTitleAr}`, VALIDATION_LIMITS.REASON_MAX),
      weekKey: currentWeek,
      monthKey: currentMonth,
      createdBy: teacherUid,
      createdAt: serverTimestamp(),
    });

    batch.update(doc(db, 'students', student.uid), {
      totalPoints: Math.max(0, student.totalPoints - request.costPoints),
      lastTxId: txId,
      updatedAt: serverTimestamp(),
    });
  }

  batch.set(doc(collection(db, 'notifications')), {
    targetStudentId: student.uid,
    title: decision === 'approved' ? 'Reward Approved!' : 'Reward Request Update',
    titleAr: decision === 'approved' ? 'تمت الموافقة على هديتك!' : 'تحديث بخصوص طلب الهدية',
    body:
      decision === 'approved'
        ? `Your redemption for "${request.rewardTitle}" was approved!`
        : `Your request for "${request.rewardTitle}" was declined. No points were deducted.`,
    bodyAr:
      decision === 'approved'
        ? `تمت الموافقة على طلب "${request.rewardTitleAr}" وخصم ${request.costPoints} نقطة.`
        : `تم رفض طلب "${request.rewardTitleAr}" ولم يتم خصم أي نقاط.`,
    type: 'reward',
    linkTab: 'rewards',
    createdBy: teacherUid,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `redemptions/${request.id}`);
  }
}

export async function teacherAdjustStudentPoints(
  teacherUid: string,
  student: StudentProfile,
  delta: number,
  reason: string
): Promise<void> {
  if (delta === 0) return;
  const txId = makeTxId('adj');
  const currentWeek = getWeekKey();
  const currentMonth = getMonthKey();

  const nextTotal = Math.max(0, student.totalPoints + delta);
  const nextLifetime = delta > 0 ? student.lifetimePoints + delta : student.lifetimePoints;
  const baseWeekly = student.weekKey === currentWeek ? student.weeklyEarned : 0;
  const baseMonthly = student.monthKey === currentMonth ? student.monthlyEarned : 0;
  const nextWeekly = Math.max(0, baseWeekly + delta);
  const nextMonthly = Math.max(0, baseMonthly + delta);
  const nextBadges = evaluateAutoBadges(student.badges, {
    completedLessonsCount: student.completedLessonsCount,
    lifetimePoints: nextLifetime,
  });

  const batch = writeBatch(db);

  batch.set(doc(db, 'point_transactions', txId), {
    studentId: student.uid,
    studentName: clampStr(student.displayName, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
    amount: delta,
    type: delta > 0 ? 'bonus' : 'deduct',
    sourceType: 'teacher',
    sourceId: txId,
    reason: clampStr(reason, VALIDATION_LIMITS.REASON_MAX),
    reasonAr: clampStr(reason, VALIDATION_LIMITS.REASON_MAX),
    weekKey: currentWeek,
    monthKey: currentMonth,
    createdBy: teacherUid,
    createdAt: serverTimestamp(),
  });

  batch.update(doc(db, 'students', student.uid), {
    totalPoints: nextTotal,
    lifetimePoints: nextLifetime,
    weeklyEarned: nextWeekly,
    monthlyEarned: nextMonthly,
    weekKey: currentWeek,
    monthKey: currentMonth,
    level: student.level || getSuggestedLevel(nextLifetime),
    badges: nextBadges,
    lastTxId: txId,
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(collection(db, 'notifications')), {
    targetStudentId: student.uid,
    title: delta > 0 ? `You received +${delta} bonus points!` : 'Points Adjustment',
    titleAr: delta > 0 ? `حصلت على +${delta} نقطة إضافية!` : `تعديل رصيد النقاط (${delta})`,
    body: clampStr(reason, VALIDATION_LIMITS.NOTIF_BODY_MAX),
    bodyAr: clampStr(reason, VALIDATION_LIMITS.NOTIF_BODY_MAX),
    type: 'points',
    linkTab: 'profile',
    createdBy: teacherUid,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `students/${student.uid}`);
  }
}

export async function teacherUpdateStudentProfile(
  studentId: string,
  updates: {
    displayName: string;
    photoURL: string;
    level: string;
    badges: string[];
    isActive: boolean;
  }
): Promise<void> {
  try {
    await updateDoc(doc(db, 'students', studentId), {
      displayName: clampStr(updates.displayName, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
      photoURL: clampStr(updates.photoURL, VALIDATION_LIMITS.PHOTO_URL_MAX),
      level: clampStr(updates.level, VALIDATION_LIMITS.LEVEL_MAX),
      badges: updates.badges.slice(0, 30),
      isActive: updates.isActive,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `students/${studentId}`);
  }
}

export async function teacherCreateStudentProfile(data: {
  displayName: string;
  photoURL: string;
  level: string;
  initialPoints: number;
}): Promise<void> {
  const studentRef = doc(collection(db, 'students'));
  const pts = Math.max(0, Math.min(100000, Math.round(data.initialPoints)));
  try {
    await setDoc(studentRef, {
      uid: studentRef.id,
      displayName: clampStr(data.displayName, VALIDATION_LIMITS.DISPLAY_NAME_MAX),
      photoURL: clampStr(
        data.photoURL || TRANSPARENT_AVATAR_PRESETS[0].url,
        VALIDATION_LIMITS.PHOTO_URL_MAX
      ),
      level: clampStr(data.level || 'Beginner', VALIDATION_LIMITS.LEVEL_MAX),
      totalPoints: pts,
      lifetimePoints: pts,
      weeklyEarned: pts,
      monthlyEarned: pts,
      weekKey: getWeekKey(),
      monthKey: getMonthKey(),
      completedLessonsCount: 0,
      badges: [],
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'students');
  }
}

export async function sendCustomNotification(
  teacherUid: string,
  data: {
    targetStudentId: string;
    title: string;
    titleAr: string;
    body: string;
    bodyAr: string;
    type: 'video' | 'note' | 'task' | 'announcement' | 'points' | 'reward';
    linkTab: string;
  }
): Promise<void> {
  try {
    await setDoc(doc(collection(db, 'notifications')), {
      targetStudentId: data.targetStudentId || 'all',
      title: clampStr(data.title, VALIDATION_LIMITS.TITLE_MAX),
      titleAr: clampStr(data.titleAr || data.title, VALIDATION_LIMITS.TITLE_MAX),
      body: clampStr(data.body, VALIDATION_LIMITS.NOTIF_BODY_MAX),
      bodyAr: clampStr(data.bodyAr || data.body, VALIDATION_LIMITS.NOTIF_BODY_MAX),
      type: data.type,
      linkTab: data.linkTab || 'home',
      createdBy: teacherUid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'notifications');
  }
}

async function deleteByStudentIdBestEffort(collectionName: string, studentId: string): Promise<void> {
  try {
    const snap = await getDocs(
      query(collection(db, collectionName), where('studentId', '==', studentId))
    );
    if (snap.empty) return;
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = writeBatch(db);
      docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch {
    // Non-bootstrap teachers may not have list access to all student-scoped logs
  }
}

export async function deleteStudentProfile(studentId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `students/${studentId}`);
  }

  const relatedCols = [
    'lesson_completions',
    'task_submissions',
    'redemptions',
    'point_transactions',
    'note_reads',
    'notification_reads',
  ];
  for (const colName of relatedCols) {
    await deleteByStudentIdBestEffort(colName, studentId);
  }

  if (studentId !== auth.currentUser?.uid) {
    try {
      await deleteDoc(doc(db, 'user_private', studentId));
    } catch {
      // Only bootstrap admin can delete user_private records
    }
  }
}

export async function deleteAllStudentProfiles(): Promise<void> {
  try {
    await deleteCollectionInBatches('students');
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'students');
  }

  const relatedCols = [
    'lesson_completions',
    'task_submissions',
    'redemptions',
    'point_transactions',
    'note_reads',
    'notification_reads',
  ];
  for (const colName of relatedCols) {
    try {
      await deleteCollectionInBatches(colName);
    } catch {
      // Best-effort cleanup
    }
  }

  try {
    const privSnap = await getDocs(collection(db, 'user_private'));
    const currentUid = auth.currentUser?.uid;
    const toDelete = privSnap.docs.filter((d) => d.id !== currentUid && d.data().role !== 'teacher');
    for (let i = 0; i < toDelete.length; i += 400) {
      const batch = writeBatch(db);
      toDelete.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch {
    // Best-effort cleanup
  }
}

export async function resetAllStudentsPoints(): Promise<void> {
  const currentWeek = getWeekKey();
  const currentMonth = getMonthKey();

  try {
    const snap = await getDocs(collection(db, 'students'));
    if (!snap.empty) {
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        docs.slice(i, i + 400).forEach((d) => {
          batch.update(d.ref, {
            totalPoints: 0,
            lifetimePoints: 0,
            weeklyEarned: 0,
            monthlyEarned: 0,
            weekKey: currentWeek,
            monthKey: currentMonth,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'students');
  }

  try {
    await deleteCollectionInBatches('point_transactions');
  } catch {
    // Best-effort cleanup of transaction history
  }
}

export async function resetSingleStudentPoints(studentId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'students', studentId), {
      totalPoints: 0,
      lifetimePoints: 0,
      weeklyEarned: 0,
      monthlyEarned: 0,
      weekKey: getWeekKey(),
      monthKey: getMonthKey(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `students/${studentId}`);
  }
}

export async function deleteTaskSubmission(submissionId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'task_submissions', submissionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `task_submissions/${submissionId}`);
  }
}

export async function deleteRedemptionRequest(redemptionId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'redemptions', redemptionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `redemptions/${redemptionId}`);
  }
}

export async function deleteNotification(notifId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'notifications', notifId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `notifications/${notifId}`);
  }
}

export async function deletePointTransaction(txId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'point_transactions', txId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `point_transactions/${txId}`);
  }
}

export async function getAppIconBranding(): Promise<string> {
  try {
    const snap = await getDoc(doc(db, 'app_settings', 'branding'));
    if (snap.exists()) {
      const data = snap.data() as { appIconUrl?: string };
      return typeof data.appIconUrl === 'string' ? data.appIconUrl : '';
    }
    return '';
  } catch {
    return '';
  }
}

export async function saveAppIconBranding(teacherUid: string, appIconUrl: string): Promise<void> {
  try {
    await setDoc(doc(db, 'app_settings', 'branding'), {
      appIconUrl: clampStr(appIconUrl, VALIDATION_LIMITS.PHOTO_URL_MAX),
      updatedBy: teacherUid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'app_settings/branding');
  }
}

export function applyWebAppIconToHead(iconUrl: string): void {
  if (typeof document === 'undefined') return;
  const resolvedFavicon = iconUrl || '/favicon.png';
  const resolvedTouch = iconUrl || '/apple-touch-icon.png';

  const iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (iconLink) {
    iconLink.href = resolvedFavicon;
  }

  const touchLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (touchLink) {
    touchLink.href = resolvedTouch;
  }
}

async function deleteCollectionInBatches(collectionName: string): Promise<void> {
  const snap = await getDocs(collection(db, collectionName));
  if (snap.empty) return;

  const docs = snap.docs;
  const CHUNK_SIZE = 400;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    docs.slice(i, i + CHUNK_SIZE).forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  }
}

export async function resetAllAcademyDataAndAccounts(): Promise<void> {
  const currentUser = auth.currentUser;
  const email = (currentUser?.email || '').trim().toLowerCase();
  if (!currentUser || !currentUser.emailVerified || email !== BOOTSTRAP_ADMIN_EMAIL) {
    throw new Error('Only the verified bootstrap administrator can reset all academy data.');
  }

  const collectionsToWipe = [
    'lesson_completions',
    'task_submissions',
    'note_reads',
    'notification_reads',
    'point_transactions',
    'redemptions',
    'notifications',
    'notes',
    'lessons',
    'tasks',
    'rewards',
    'students',
    'teacher_invites',
    'teachers',
    'user_private',
  ];

  for (const colName of collectionsToWipe) {
    try {
      await deleteCollectionInBatches(colName);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, colName);
    }
  }

  try {
    await deleteDoc(doc(db, 'app_settings', 'branding'));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'app_settings/branding');
  }

  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // Ignore storage access errors in restricted contexts
  }

  applyWebAppIconToHead('');
  await signOut(auth);
}

// ==========================================
// TEACHER ACCOUNT MANAGEMENT
// ==========================================

export async function addTeacherInvite(
  addedByUid: string,
  data: {
    email: string;
    displayName: string;
    roleType: TeacherRoleType;
  }
): Promise<void> {
  const email = normalizeEmail(data.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 96) {
    throw new Error('Please enter a valid email address.');
  }
  if (email === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
    throw new Error('This email is already the primary administrator account.');
  }

  const inviteId = toEmailDocId(email);
  const inviteRef = doc(db, 'teacher_invites', inviteId);

  try {
    const existing = await getDoc(inviteRef);
    if (existing.exists()) {
      throw new Error('This email is already added to the teacher accounts list.');
    }

    await setDoc(inviteRef, {
      email,
      displayName: clampStr(data.displayName || email.split('@')[0], VALIDATION_LIMITS.DISPLAY_NAME_MAX),
      roleType: data.roleType,
      status: 'pending',
      uid: '',
      addedBy: addedByUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('already added') || error.message.includes('primary administrator'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, `teacher_invites/${inviteId}`);
  }
}

export async function updateTeacherAccount(
  invite: TeacherInvite,
  updates: {
    displayName: string;
    roleType: TeacherRoleType;
  }
): Promise<void> {
  const cleanName = clampStr(updates.displayName, VALIDATION_LIMITS.DISPLAY_NAME_MAX);
  if (!cleanName) return;

  const batch = writeBatch(db);
  batch.update(doc(db, 'teacher_invites', invite.id), {
    displayName: cleanName,
    roleType: updates.roleType,
    updatedAt: serverTimestamp(),
  });

  if (invite.uid) {
    try {
      const teacherRef = doc(db, 'teachers', invite.uid);
      const teacherSnap = await getDoc(teacherRef);
      if (teacherSnap.exists()) {
        batch.update(teacherRef, {
          displayName: cleanName,
          roleType: updates.roleType,
          updatedAt: serverTimestamp(),
        });
      }
    } catch {
      // Fallback if teacher doc isn't created yet
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `teacher_invites/${invite.id}`);
  }
}

export async function removeTeacherAccount(invite: TeacherInvite): Promise<void> {
  if (invite.uid && invite.uid === auth.currentUser?.uid) {
    throw new Error('You cannot remove your own currently signed-in teacher account.');
  }

  const batch = writeBatch(db);
  batch.delete(doc(db, 'teacher_invites', invite.id));

  if (invite.uid) {
    try {
      const teacherRef = doc(db, 'teachers', invite.uid);
      const teacherSnap = await getDoc(teacherRef);
      if (teacherSnap.exists()) {
        batch.delete(teacherRef);
      }
    } catch {
      // Ignore lookup errors
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `teacher_invites/${invite.id}`);
  }

  if (invite.uid) {
    try {
      const privRef = doc(db, 'user_private', invite.uid);
      const privSnap = await getDoc(privRef);
      if (privSnap.exists()) {
        await updateDoc(privRef, {
          role: 'student',
          updatedAt: serverTimestamp(),
        });
      }
    } catch {
      // Best-effort role sync on user_private
    }
  }
}

export async function removeLegacyTeacherDoc(teacherUid: string): Promise<void> {
  if (teacherUid === auth.currentUser?.uid) {
    throw new Error('You cannot remove your own currently signed-in teacher account.');
  }

  try {
    await deleteDoc(doc(db, 'teachers', teacherUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `teachers/${teacherUid}`);
  }

  try {
    const privRef = doc(db, 'user_private', teacherUid);
    const privSnap = await getDoc(privRef);
    if (privSnap.exists()) {
      await updateDoc(privRef, {
        role: 'student',
        updatedAt: serverTimestamp(),
      });
    }
  } catch {
    // Best-effort role sync
  }
}

