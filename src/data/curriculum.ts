import {
  AchievementType,
  AvatarId,
  CurriculumLetter,
  LanguageCode,
  WordExample,
} from '../types';
import { ARABIC_LETTERS } from './arabic/letters';
import { ENGLISH_LETTERS } from './english/letters';

export { ARABIC_LETTERS, ENGLISH_LETTERS };

export const ALL_LETTERS: CurriculumLetter[] = [...ENGLISH_LETTERS, ...ARABIC_LETTERS];

const LETTER_MAP: Record<string, CurriculumLetter> = {};
for (const letter of ALL_LETTERS) {
  LETTER_MAP[letter.id] = letter;
}

export function getLettersByLanguage(language: LanguageCode): CurriculumLetter[] {
  return language === 'ar' ? ARABIC_LETTERS : ENGLISH_LETTERS;
}

export function getLetterById(letterId: string): CurriculumLetter | undefined {
  return LETTER_MAP[letterId];
}

export function getNextLetter(currentLetterId: string): CurriculumLetter {
  const current = getLetterById(currentLetterId);
  if (!current) return ENGLISH_LETTERS[0];
  const list = getLettersByLanguage(current.language);
  const idx = list.findIndex((item) => item.id === current.id);
  if (idx < 0 || idx + 1 >= list.length) {
    return list[0];
  }
  return list[idx + 1];
}

/**
 * Selects distractors for Letter Treasure Hunt and Letter Challenge.
 * When `includeVisuallySimilar` is false (early stages), avoids letters from the same visualGroup
 * (e.g. ب/ت/ث) so beginners are not overwhelmed. When true, includes similar group members to
 * sharpen visual discrimination.
 */
export function getLetterDistractors(
  target: CurriculumLetter,
  count = 3,
  includeVisuallySimilar = false
): CurriculumLetter[] {
  const pool = getLettersByLanguage(target.language).filter((l) => l.id !== target.id);
  const filtered = includeVisuallySimilar
    ? [
        ...pool.filter((l) => l.visualGroup === target.visualGroup),
        ...pool.filter((l) => l.visualGroup !== target.visualGroup),
      ]
    : pool.filter((l) => l.visualGroup !== target.visualGroup);

  const selected: CurriculumLetter[] = [];
  const step = Math.max(1, Math.floor(filtered.length / (count + 1)));
  for (let i = 0; i < filtered.length && selected.length < count; i += step) {
    selected.push(filtered[i]);
  }
  for (const item of filtered) {
    if (selected.length >= count) break;
    if (!selected.some((s) => s.id === item.id)) {
      selected.push(item);
    }
  }
  return selected.slice(0, count);
}

export function getWordBuilderDeck(language: LanguageCode): Array<{
  letterId: string;
  example: WordExample;
}> {
  const letters = getLettersByLanguage(language);
  const deck: Array<{ letterId: string; example: WordExample }> = [];
  for (const letter of letters) {
    deck.push({ letterId: letter.id, example: letter.example });
    if (letter.secondaryExample) {
      deck.push({ letterId: letter.id, example: letter.secondaryExample });
    }
  }
  return deck;
}

export interface AvatarDefinition {
  id: AvatarId;
  nameEn: string;
  nameAr: string;
  emoji: string;
  bgColor: string;
  accentColor: string;
}

export const AVATAR_CATALOG: AvatarDefinition[] = [
  {
    id: 'explorer_fox',
    nameEn: 'Explorer Fox',
    nameAr: 'الثعلب المستكشف',
    emoji: '🦊',
    bgColor: '#FFE1DA',
    accentColor: '#FF6B4A',
  },
  {
    id: 'star_owl',
    nameEn: 'Starry Owl',
    nameAr: 'البومة النجمية',
    emoji: '🦉',
    bgColor: '#EAE2FF',
    accentColor: '#8B6CEF',
  },
  {
    id: 'sunny_lion',
    nameEn: 'Sunny Lion',
    nameAr: 'الأسد المشمس',
    emoji: '🦁',
    bgColor: '#FFF2C6',
    accentColor: '#FFB800',
  },
  {
    id: 'mint_turtle',
    nameEn: 'Minty Turtle',
    nameAr: 'السلحفاة الذكية',
    emoji: '🐢',
    bgColor: '#D5F7E8',
    accentColor: '#2EC486',
  },
  {
    id: 'cosmic_bunny',
    nameEn: 'Cosmic Bunny',
    nameAr: 'الأرنب الفضائي',
    emoji: '🐰',
    bgColor: '#D8EEFF',
    accentColor: '#3898EC',
  },
  {
    id: 'rainbow_dolphin',
    nameEn: 'Wave Dolphin',
    nameAr: 'الدولفين المرح',
    emoji: '🐬',
    bgColor: '#E0F7FA',
    accentColor: '#00ACC1',
  },
];

export interface BadgeDefinition {
  type: AchievementType;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  emoji: string;
  color: string;
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    type: 'first_letter_traced',
    titleEn: 'First Trace!',
    titleAr: 'أول تتبع!',
    descriptionEn: 'Traced your very first letter with care.',
    descriptionAr: 'تتبعت أول حرف لك بعناية.',
    emoji: '✨',
    color: '#3898EC',
  },
  {
    type: 'first_independent_write',
    titleEn: 'Freehand Writer',
    titleAr: 'كاتب مستقل',
    descriptionEn: 'Wrote a letter all by yourself without a guide!',
    descriptionAr: 'كتبت حرفًا بمفردك دون نقاط مساعدة!',
    emoji: '✏️',
    color: '#2EC486',
  },
  {
    type: 'brave_retry',
    titleEn: 'Brave Try-Again',
    titleAr: 'محاولة شجاعة',
    descriptionEn: 'Practiced a letter again to make it even better.',
    descriptionAr: 'تدربت على الحرف مرة أخرى بمهارة.',
    emoji: '💪',
    color: '#FF6B4A',
  },
  {
    type: 'five_english_letters',
    titleEn: 'ABC Explorer',
    titleAr: 'مستكشف الإنجليزية',
    descriptionEn: 'Practiced 5 English letters.',
    descriptionAr: 'تدربت على ٥ حروف إنجليزية.',
    emoji: '🔤',
    color: '#3898EC',
  },
  {
    type: 'five_arabic_letters',
    titleEn: 'Arabic Hero',
    titleAr: 'بطل الحروف العربية',
    descriptionEn: 'Practiced 5 Arabic letters.',
    descriptionAr: 'تدربت على ٥ حروف عربية.',
    emoji: '🕌',
    color: '#2EC486',
  },
  {
    type: 'dots_detective',
    titleEn: 'Dots Detective',
    titleAr: 'محقق النقاط',
    descriptionEn: 'Placed Arabic letter dots in the right spot!',
    descriptionAr: 'وضعت نقاط الحروف العربية في مكانها الصحيح!',
    emoji: '🔍',
    color: '#8B6CEF',
  },
  {
    type: 'word_builder_star',
    titleEn: 'Word Builder',
    titleAr: 'باني الكلمات',
    descriptionEn: 'Built a complete word from letters.',
    descriptionAr: 'ركّبت كلمة كاملة من الحروف.',
    emoji: '🧩',
    color: '#FFB800',
  },
  {
    type: 'rocket_launcher',
    titleEn: 'Rocket Captain',
    titleAr: 'قائد الصاروخ',
    descriptionEn: 'Launched the space rocket by writing letters!',
    descriptionAr: 'أطلقت صاروخ الفضاء بكتابة الحروف!',
    emoji: '🚀',
    color: '#FF6B4A',
  },
  {
    type: 'monster_helper',
    titleEn: 'Monster Friend',
    titleAr: 'صديق الوحش اللطيف',
    descriptionEn: 'Completed the friendly monster curves!',
    descriptionAr: 'أكملت منحنيات الوحش اللطيف!',
    emoji: '👾',
    color: '#8B6CEF',
  },
  {
    type: 'treasure_hunter',
    titleEn: 'Treasure Hunter',
    titleAr: 'صائد الكنوز',
    descriptionEn: 'Found hidden letters in the treasure chest!',
    descriptionAr: 'وجدت الحروف المخفية في صندوق الكنز!',
    emoji: '💎',
    color: '#FFB800',
  },
  {
    type: 'review_champion',
    titleEn: 'Challenge Star',
    titleAr: 'نجم التحدي',
    descriptionEn: 'Completed a full mixed Letter Challenge!',
    descriptionAr: 'أكملت تحدي الحروف الشامل بنجاح!',
    emoji: '🏆',
    color: '#2EC486',
  },
  {
    type: 'alphabet_explorer',
    titleEn: 'Bilingual Star',
    titleAr: 'نجم اللغتين',
    descriptionEn: 'Practiced letters in both Arabic and English!',
    descriptionAr: 'تعلمت حروفًا في العربية والإنجليزية معًا!',
    emoji: '🌟',
    color: '#FFB800',
  },
];
