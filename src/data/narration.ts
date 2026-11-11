import { LanguageCode } from '../types';

export type NarrationKey =
  | 'welcome.chooseAvatar'
  | 'home.welcome'
  | 'lesson.intro'
  | 'lesson.lowercaseIntro'
  | 'lesson.watch'
  | 'lesson.trace.start'
  | 'lesson.stroke.ok'
  | 'lesson.stroke.retry'
  | 'lesson.idle'
  | 'lesson.write.start'
  | 'lesson.success'
  | 'lesson.retry'
  | 'lesson.gentleSkip'
  | 'game.find'
  | 'game.matchPicture'
  | 'game.launchRocket'
  | 'game.completeMonster'
  | 'game.challenge'
  | 'game.correct'
  | 'game.tryAgain'
  | 'words.intro'
  | 'words.tapNext'
  | 'words.completed'
  | 'session.done'
  | 'session.breakSuggestion'
  | 'voice.test';

export interface NarrationEntry {
  key: NarrationKey;
  en: string | string[];
  ar: string | string[];
  /** Optional bundled audio asset key when pre-recorded human audio is provided */
  recordedAssetEn?: string;
  recordedAssetAr?: string;
}

/**
 * Bilingual voice-first narration lines.
 * Arabic lines strictly use gender-neutral "we" phrasing ("لنكتب", "هيا", "نبدأ")
 * or universal praise ("رائع!", "جميل!") so they fit any child profile.
 */
export const NARRATION_LINES: Record<NarrationKey, NarrationEntry> = {
  'welcome.chooseAvatar': {
    key: 'welcome.chooseAvatar',
    en: 'Hi {name}! Tap your picture to play!',
    ar: 'أهلًا {name}! لنضغط على صورتنا ونلعب!',
  },
  'home.welcome': {
    key: 'home.welcome',
    en: 'Hi {name}! Tap the big star to start.',
    ar: 'أهلًا {name}! لنضغط على النجمة الكبيرة ونبدأ.',
  },
  'lesson.intro': {
    key: 'lesson.intro',
    en: 'This is the letter {letter}. {letter} like {word}.',
    ar: 'هذا حرف {letterName}. مثل {word}.',
  },
  'lesson.lowercaseIntro': {
    key: 'lesson.lowercaseIntro',
    en: 'Now let us write small {letter}!',
    ar: 'الآن لنكتب الشكل الثاني للحرف!',
  },
  'lesson.watch': {
    key: 'lesson.watch',
    en: 'Watch how we write it.',
    ar: 'هيا نشاهد كيف نكتب الحرف.',
  },
  'lesson.trace.start': {
    key: 'lesson.trace.start',
    en: 'Your turn! Start at the star and follow the arrow.',
    ar: 'هيا نجرّب معًا! نبدأ من النجمة ونتبع السهم.',
  },
  'lesson.stroke.ok': {
    key: 'lesson.stroke.ok',
    en: ['Great!', 'Yes!', 'Super!'],
    ar: ['رائع!', 'جميل جدًا!', 'ممتاز!'],
  },
  'lesson.stroke.retry': {
    key: 'lesson.stroke.retry',
    en: "Almost! Let's try that part again.",
    ar: 'قريب جدًا! لنحاول هذا الجزء مرة أخرى.',
  },
  'lesson.idle': {
    key: 'lesson.idle',
    en: "Want help? Let's watch the star.",
    ar: 'هل نشاهد النجمة معًا؟',
  },
  'lesson.write.start': {
    key: 'lesson.write.start',
    en: 'Now write it all by yourself!',
    ar: 'الآن نكتب الحرف بمفردنا!',
  },
  'lesson.success': {
    key: 'lesson.success',
    en: 'You did it! Look at your stars!',
    ar: 'رائع! ما أجمل كتابتنا! لننظر إلى النجوم.',
  },
  'lesson.retry': {
    key: 'lesson.retry',
    en: "Let's try once more.",
    ar: 'لنحاول مرة أخرى.',
  },
  'lesson.gentleSkip': {
    key: 'lesson.gentleSkip',
    en: "You worked so hard! We'll try again tomorrow.",
    ar: 'جهد رائع! سنحاول مرة أخرى غدًا.',
  },
  'game.find': {
    key: 'game.find',
    en: 'Find the letter {letter}!',
    ar: 'أين حرف {letterName}؟',
  },
  'game.matchPicture': {
    key: 'game.matchPicture',
    en: 'Tap the picture for {letter}!',
    ar: 'لنختر الصورة التي تبدأ بحرف {letterName}!',
  },
  'game.launchRocket': {
    key: 'game.launchRocket',
    en: 'Write {letter} to launch the rocket!',
    ar: 'هيا نكتب حرف {letterName} لينطلق الصاروخ!',
  },
  'game.completeMonster': {
    key: 'game.completeMonster',
    en: 'Finish the letter {letter} for our monster friend!',
    ar: 'لنكمل حرف {letterName} ليبتسم صديقنا الوحش!',
  },
  'game.challenge': {
    key: 'game.challenge',
    en: 'Let us play the letter challenge!',
    ar: 'هيا نلعب تحدي الحروف معًا!',
  },
  'game.correct': {
    key: 'game.correct',
    en: 'Yay! That is right!',
    ar: 'رائع! إجابة صحيحة!',
  },
  'game.tryAgain': {
    key: 'game.tryAgain',
    en: "Let's look at the glowing one!",
    ar: 'لننظر إلى المربع المضيء ونجرّب مرة أخرى!',
  },
  'words.intro': {
    key: 'words.intro',
    en: 'Let us build the word {word}!',
    ar: 'هيا نركّب كلمة {word} معًا!',
  },
  'words.tapNext': {
    key: 'words.tapNext',
    en: 'Look for the glowing letter {letter}!',
    ar: 'لنضغط على الحرف المضيء {letter}!',
  },
  'words.completed': {
    key: 'words.completed',
    en: 'Super! We spelled {word}!',
    ar: 'ممتاز! ركّبنا كلمة {word}!',
  },
  'session.done': {
    key: 'session.done',
    en: 'All done for today! See you tomorrow.',
    ar: 'انتهينا لليوم! نلتقي غدًا.',
  },
  'session.breakSuggestion': {
    key: 'session.breakSuggestion',
    en: 'Great playing! Time for a little rest, or keep playing?',
    ar: 'لعب رائع! هل نأخذ استراحة قصيرة أم نكمل اللعب؟',
  },
  'voice.test': {
    key: 'voice.test',
    en: 'Hello! English voice narration is ready.',
    ar: 'أهلًا! الصوت العربي جاهز للعمل.',
  },
};

/**
 * Resolves a narration key with variables into a concrete string.
 */
export function formatNarrationLine(
  key: NarrationKey,
  language: LanguageCode,
  vars?: Record<string, string | number>,
  randomSeedIndex?: number
): string {
  const entry = NARRATION_LINES[key];
  if (!entry) return '';
  const raw = language === 'ar' ? entry.ar : entry.en;
  let template: string;
  if (Array.isArray(raw)) {
    const idx =
      typeof randomSeedIndex === 'number'
        ? Math.abs(randomSeedIndex) % raw.length
        : Math.floor(Math.random() * raw.length);
    template = raw[idx] ?? raw[0] ?? '';
  } else {
    template = raw;
  }

  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const val = vars[k];
    return val !== undefined && val !== null ? String(val) : '';
  });
}
