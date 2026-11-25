import confetti from 'canvas-confetti';
import { Language, StudentProfile } from '../types';

export const ASSET_IMAGES = {
  heroBanner: '/src/assets/images/academy_hero_banner_1795608772262.jpg',
  phonicsCover: '/src/assets/images/lesson_phonics_cover_1795608772906.jpg',
  grammarCover: '/src/assets/images/lesson_grammar_cover_1795608771753.jpg',
  rewardGift: '/src/assets/images/reward_mystery_gift_1795608772834.jpg',
  trophyCrest: '/src/assets/images/trophy_champion_crest_1795608772175.jpg',
} as const;

// Transparent-background SVG character cutouts so #1 Leaderboard frame always works cleanly
export const TRANSPARENT_AVATAR_PRESETS = [
  {
    id: 'owl_scholar',
    labelAr: 'البومة الذكية',
    labelEn: 'Scholar Owl',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" fill="none">
        <ellipse cx="120" cy="142" rx="64" ry="74" fill="#38BDF8"/>
        <ellipse cx="120" cy="156" rx="42" ry="50" fill="#E0F2FE"/>
        <path d="M62 88C54 60 72 44 88 64Z" fill="#7C3AED"/>
        <path d="M178 88C186 60 168 44 152 64Z" fill="#7C3AED"/>
        <circle cx="94" cy="108" r="24" fill="#FFFFFF" stroke="#1E293B" stroke-width="5"/>
        <circle cx="146" cy="108" r="24" fill="#FFFFFF" stroke="#1E293B" stroke-width="5"/>
        <line x1="118" y1="108" x2="122" y2="108" stroke="#1E293B" stroke-width="5"/>
        <circle cx="96" cy="108" r="9" fill="#0F172A"/>
        <circle cx="144" cy="108" r="9" fill="#0F172A"/>
        <circle cx="99" cy="104" r="3" fill="#FFFFFF"/>
        <circle cx="147" cy="104" r="3" fill="#FFFFFF"/>
        <polygon points="120,118 110,132 130,132" fill="#FBBF24"/>
        <path d="M56 144C42 156 44 182 66 184Z" fill="#0284C7"/>
        <path d="M184 144C198 156 196 182 174 184Z" fill="#0284C7"/>
        <path d="M84 44L120 30L156 44L120 58Z" fill="#1E293B"/>
        <rect x="98" y="48" width="44" height="14" rx="4" fill="#334155"/>
        <circle cx="156" cy="60" r="5" fill="#FBBF24"/>
      </svg>`
    )}`,
  },
  {
    id: 'star_explorer',
    labelAr: 'المستكشف النجم',
    labelEn: 'Star Explorer',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" fill="none">
        <path d="M68 214C68 172 90 154 120 154C150 154 172 172 172 214Z" fill="#A78BFA"/>
        <circle cx="120" cy="108" r="46" fill="#FDE68A"/>
        <path d="M74 98C76 64 102 48 134 52C158 55 170 76 168 100C156 82 138 76 116 80C94 84 82 90 74 98Z" fill="#334155"/>
        <circle cx="102" cy="112" r="6" fill="#0F172A"/>
        <circle cx="138" cy="112" r="6" fill="#0F172A"/>
        <path d="M106 130C114 139 126 139 134 130" stroke="#0F172A" stroke-width="5" stroke-linecap="round"/>
        <circle cx="88" cy="122" r="6" fill="#FCA5A5" opacity="0.65"/>
        <circle cx="152" cy="122" r="6" fill="#FCA5A5" opacity="0.65"/>
        <polygon points="120,164 126,178 141,179 129,188 133,203 120,195 107,203 111,188 99,179 114,178" fill="#FBBF24"/>
      </svg>`
    )}`,
  },
  {
    id: 'mint_rocket',
    labelAr: 'رائد الفضاء',
    labelEn: 'Space Cadet',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" fill="none">
        <path d="M68 214C70 174 92 156 120 156C148 156 170 174 172 214Z" fill="#34D399"/>
        <circle cx="120" cy="104" r="54" fill="#E0F2FE" stroke="#38BDF8" stroke-width="6"/>
        <circle cx="120" cy="106" r="38" fill="#FED7AA"/>
        <path d="M84 96C88 72 108 62 130 66C148 69 156 84 156 98C140 86 116 84 84 96Z" fill="#7C3AED"/>
        <circle cx="106" cy="108" r="5.5" fill="#0F172A"/>
        <circle cx="134" cy="108" r="5.5" fill="#0F172A"/>
        <path d="M108 124C115 132 125 132 132 124" stroke="#0F172A" stroke-width="4.5" stroke-linecap="round"/>
        <rect x="102" y="172" width="36" height="22" rx="8" fill="#FFFFFF"/>
        <circle cx="120" cy="183" r="6" fill="#38BDF8"/>
      </svg>`
    )}`,
  },
  {
    id: 'sunny_reader',
    labelAr: 'قارئة الأبطال',
    labelEn: 'Book Hero',
    url: `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" fill="none">
        <path d="M68 214C70 174 90 156 120 156C150 156 170 174 172 214Z" fill="#38BDF8"/>
        <circle cx="120" cy="108" r="44" fill="#FDE68A"/>
        <path d="M74 108C74 68 98 48 122 48C146 48 168 68 168 108C154 90 138 82 120 82C102 82 88 90 74 108Z" fill="#F59E0B"/>
        <circle cx="104" cy="112" r="5.5" fill="#0F172A"/>
        <circle cx="136" cy="112" r="5.5" fill="#0F172A"/>
        <path d="M108 128C115 135 125 135 132 128" stroke="#0F172A" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M84 176L120 186L156 176V214H84Z" fill="#FBBF24"/>
      </svg>`
    )}`,
  },
];

export interface BadgeDefinition {
  id: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  colorClass: string;
}

export const BADGES_CATALOG: BadgeDefinition[] = [
  {
    id: 'first_lesson',
    titleAr: 'الخطوة الأولى',
    titleEn: 'First Step',
    descAr: 'أكملت أول درس فيديو بنجاح',
    descEn: 'Completed your first video lesson',
    colorClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  },
  {
    id: 'five_lessons',
    titleAr: 'متابع مجتهد',
    titleEn: 'Dedicated Learner',
    descAr: 'أكملت 5 دروس تعليمية',
    descEn: 'Completed 5 English lessons',
    colorClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  },
  {
    id: 'quiz_master',
    titleAr: 'بطل الاختبارات',
    titleEn: 'Quiz Master',
    descAr: 'أنجزت اختبارًا تفاعليًا بنجاح',
    descEn: 'Completed an interactive English quiz',
    colorClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
  },
  {
    id: 'century_club',
    titleAr: 'نادي المئة',
    titleEn: 'Century Club',
    descAr: 'جمعت 100 نقطة إجمالية أو أكثر',
    descEn: 'Earned 100+ lifetime points',
    colorClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  },
  {
    id: 'star_of_week',
    titleAr: 'نجم الأسبوع',
    titleEn: 'Star of the Week',
    descAr: 'تميّز استثنائي بتقدير Ms Nardeen',
    descEn: 'Special recognition from Ms Nardeen',
    colorClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  },
  {
    id: 'reading_hero',
    titleAr: 'بطل القراءة',
    titleEn: 'Reading Hero',
    descAr: 'أداء رائع في النطق والقراءة',
    descEn: 'Outstanding phonics and reading skill',
    colorClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  },
];

export const LEVELS_LIST = [
  { key: 'Beginner', ar: 'المستوى التمهيدي', en: 'Beginner', minPoints: 0 },
  { key: 'Starter', ar: 'المستوى المبتدئ', en: 'Starter', minPoints: 100 },
  { key: 'Explorer', ar: 'المستكشف', en: 'Explorer', minPoints: 250 },
  { key: 'Word Wizard', ar: 'ساحر الكلمات', en: 'Word Wizard', minPoints: 500 },
  { key: 'Academy Champion', ar: 'بطل الأكاديمية', en: 'Academy Champion', minPoints: 1000 },
] as const;

export function getLevelLabel(levelKey: string, lang: Language): string {
  const found = LEVELS_LIST.find((l) => l.key === levelKey);
  if (!found) return levelKey;
  return lang === 'ar' ? found.ar : found.en;
}

export function getSuggestedLevel(lifetimePoints: number): string {
  let current: string = LEVELS_LIST[0].key;
  for (const lvl of LEVELS_LIST) {
    if (lifetimePoints >= lvl.minPoints) {
      current = lvl.key;
    }
  }
  return current;
}

export function getWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getEffectiveWeeklyPoints(student: StudentProfile): number {
  return student.weekKey === getWeekKey() ? student.weeklyEarned : 0;
}

export function getEffectiveMonthlyPoints(student: StudentProfile): number {
  return student.monthKey === getMonthKey() ? student.monthlyEarned : 0;
}

export function evaluateAutoBadges(
  existingBadges: string[],
  stats: { completedLessonsCount: number; lifetimePoints: number; didQuiz?: boolean }
): string[] {
  const next = new Set(existingBadges);
  if (stats.completedLessonsCount >= 1) next.add('first_lesson');
  if (stats.completedLessonsCount >= 5) next.add('five_lessons');
  if (stats.lifetimePoints >= 100) next.add('century_club');
  if (stats.didQuiz) next.add('quiz_master');
  return Array.from(next).slice(0, 30);
}

export function celebrateAchievement(intense = false): void {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    confetti({
      particleCount: intense ? 100 : 55,
      spread: intense ? 85 : 65,
      origin: { y: 0.65 },
      colors: ['#38BDF8', '#A78BFA', '#34D399', '#FBBF24'],
    });
  } catch {
    // Ignore confetti errors in headless contexts
  }
}

export function parseEmbedVideoUrl(url: string): { kind: 'iframe' | 'video'; src: string } {
  const trimmed = url.trim();
  // YouTube standard or shorts or youtu.be
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,15})/
  );
  if (ytMatch?.[1]) {
    return { kind: 'iframe', src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0` };
  }
  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch?.[1]) {
    return { kind: 'iframe', src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
  }
  // Google Drive preview
  const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch?.[1]) {
    return { kind: 'iframe', src: `https://drive.google.com/file/d/${driveMatch[1]}/preview` };
  }
  return { kind: 'video', src: trimmed };
}

/**
 * Compresses an uploaded image file (preserving PNG/WebP alpha transparency when applicable)
 * so any gallery photo safely fits within Firestore's 220KB photoURL limit.
 */
export function compressTransparentImageFile(file: File, maxDim = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const isAlphaSource = file.type === 'image/png' || file.type === 'image/webp';

        let result = isAlphaSource
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/webp', 0.85);

        if (result.length > 200000 && isAlphaSource) {
          const smallCanvas = document.createElement('canvas');
          smallCanvas.width = Math.max(1, Math.round(width * 0.65));
          smallCanvas.height = Math.max(1, Math.round(height * 0.65));
          const sCtx = smallCanvas.getContext('2d');
          if (sCtx) {
            sCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
            result = smallCanvas.toDataURL('image/png');
          }
        }
        if (result.length > 210000) {
          result = canvas.toDataURL('image/webp', 0.8);
        }
        if (result.length > 210000) {
          result = canvas.toDataURL('image/jpeg', 0.78);
        }
        if (result.length > 215000) {
          reject(new Error('Image is too large even after compression. Please choose a smaller image.'));
          return;
        }
        resolve(result);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
