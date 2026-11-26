export type Language = 'ar' | 'en';
export type ThemeMode = 'light' | 'dark';
export type UserRole = 'teacher' | 'student';

export type AppTab =
  | 'home'
  | 'lessons'
  | 'tasks'
  | 'leaderboard'
  | 'rewards'
  | 'notes'
  | 'profile'
  | 'teacher'
  | 'settings';

export const VALIDATION_LIMITS = {
  DISPLAY_NAME_MAX: 80,
  PHOTO_URL_MAX: 220000,
  LEVEL_MAX: 40,
  TITLE_MAX: 120,
  REWARD_TITLE_MAX: 100,
  DESCRIPTION_MAX: 1500,
  REWARD_DESC_MAX: 500,
  TEACHER_NOTES_MAX: 2000,
  NOTE_CONTENT_MAX: 2500,
  VIDEO_URL_MAX: 1000,
  ATTACHMENT_URL_MAX: 220000,
  REASON_MAX: 200,
  FEEDBACK_MAX: 500,
  NOTIF_BODY_MAX: 500,
} as const;

export interface UserPrivate {
  uid: string;
  email: string;
  role: UserRole;
  preferredLanguage: Language;
  preferredTheme: ThemeMode;
  notificationsEnabled: boolean;
  fcmToken?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StudentProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  level: string;
  totalPoints: number;
  lifetimePoints: number;
  weeklyEarned: number;
  monthlyEarned: number;
  weekKey: string;
  monthKey: string;
  completedLessonsCount: number;
  badges: string[];
  lastTxId?: string;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Lesson {
  id: string;
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
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LessonCompletion {
  id: string;
  studentId: string;
  lessonId: string;
  lessonTitle: string;
  pointsAwarded: number;
  completedAt?: unknown;
}

export interface QuizQuestion {
  question: string;
  questionAr: string;
  options: string[];
  correctIndex: number;
}

export interface AcademyTask {
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
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TaskSubmission {
  id: string;
  studentId: string;
  studentName: string;
  taskId: string;
  taskTitle: string;
  taskType: 'quiz' | 'homework';
  answerText: string;
  selectedAnswers: number[];
  score: number;
  maxScore: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  pointsAwarded: number;
  teacherFeedback: string;
  submittedAt?: unknown;
  updatedAt?: unknown;
}

export interface AcademyNote {
  id: string;
  title: string;
  titleAr: string;
  content: string;
  contentAr: string;
  targetStudentId: string;
  category: 'announcement' | 'note' | 'student_note' | 'student_issue';
  attachmentUrl: string;
  attachmentType: 'none' | 'link' | 'image' | 'file';
  authorName?: string;
  authorRole?: UserRole;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RewardItem {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  costPoints: number;
  category: 'physical' | 'virtual';
  imageUrl: string;
  isAvailable: boolean;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RedemptionRequest {
  id: string;
  studentId: string;
  studentName: string;
  rewardId: string;
  rewardTitle: string;
  rewardTitleAr: string;
  costPoints: number;
  status: 'pending' | 'approved' | 'rejected';
  teacherNote: string;
  requestedAt?: unknown;
  updatedAt?: unknown;
}

export interface PointTransaction {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  type: 'earn' | 'redeem' | 'deduct' | 'bonus';
  sourceType: 'lesson' | 'quiz' | 'homework' | 'reward' | 'teacher';
  sourceId: string;
  reason: string;
  reasonAr: string;
  weekKey: string;
  monthKey: string;
  createdBy: string;
  createdAt?: unknown;
}

export interface AcademyNotification {
  id: string;
  targetStudentId: string;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
  type: 'video' | 'note' | 'task' | 'announcement' | 'points' | 'reward';
  linkTab: string;
  createdBy: string;
  createdAt?: unknown;
}
