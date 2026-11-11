import {
  ArabicPositionalFormKey,
  CurriculumLetter,
  HarakatVariant,
  NormalizedStrokeTemplate,
} from '../../types';
import {
  buildArabicDotStrokes,
  buildStroke,
  makeHamzaPoints,
  makeLinePoints,
  makePolylinePoints,
} from '../strokeGeometry';

const L = makeLinePoints;
const P = makePolylinePoints;

export type ArabicShapeFamily =
  | 'alef'
  | 'ba_boat'
  | 'jeem_belly'
  | 'dal_angle'
  | 'ra_slide'
  | 'seen_teeth'
  | 'sad_loop'
  | 'tah_tall'
  | 'ayn_curve'
  | 'fa_neck'
  | 'qaf_deep'
  | 'kaf_angle'
  | 'lam_hook'
  | 'meem_circle'
  | 'noon_bowl'
  | 'ha_loop'
  | 'waw_loop'
  | 'ya_duck';

/**
 * Generates curated, right-to-left normalized stroke templates for each Arabic shape family
 * and positional form (isolated, initial, medial, final), plus explicit dot/hamza strokes.
 */
function buildArabicFormStrokes(
  family: ArabicShapeFamily,
  formKey: ArabicPositionalFormKey,
  dotCount: 0 | 1 | 2 | 3,
  dotPlacement: 'none' | 'above' | 'below' | 'inside',
  hasHamza: boolean
): NormalizedStrokeTemplate[] {
  const strokes: NormalizedStrokeTemplate[] = [];

  if (family === 'alef') {
    if (formKey === 'final' || formKey === 'medial') {
      strokes.push(
        buildStroke(
          1,
          'curve',
          P([
            [0.74, 0.72],
            [0.48, 0.72],
            [0.48, 0.24],
          ]),
          'left-then-up',
          'Connect from right and rise tall upward',
          'اتصل من اليمين ثم اصعد للأعلى'
        )
      );
    } else {
      strokes.push(
        buildStroke(
          1,
          'line',
          L(0.5, 0.26, 0.5, 0.74),
          'down',
          'Draw a tall straight stem from top to bottom',
          'ارسم عمودًا مستقيمًا من الأعلى للأسفل'
        )
      );
    }
    if (hasHamza) {
      strokes.push(
        buildStroke(
          strokes.length + 1,
          'hamza',
          makeHamzaPoints(0.5, 0.15),
          'right-to-left',
          'Add the Hamza crown on top',
          'ارسم الهمزة فوق الألف',
          true
        )
      );
    }
    return strokes;
  }

  // Positional adaptations for initial and medial connecting forms
  if (formKey === 'initial') {
    if (family === 'jeem_belly') {
      strokes.push(
        buildStroke(
          1,
          'curve',
          P([
            [0.34, 0.46],
            [0.68, 0.46],
            [0.44, 0.66],
            [0.24, 0.66],
          ]),
          'right-to-left',
          'Draw the wave top and connect left on the baseline',
          'ارسم رأس الحرف واتجه لليسار على السطر'
        )
      );
    } else if (family === 'seen_teeth') {
      strokes.push(
        buildStroke(
          1,
          'curve',
          P([
            [0.76, 0.52],
            [0.7, 0.66],
            [0.62, 0.52],
            [0.54, 0.66],
            [0.46, 0.52],
            [0.4, 0.66],
            [0.22, 0.66],
          ]),
          'right-to-left',
          'Draw three small teeth and extend left to join',
          'ارسم ثلاث أسنان صغيرة ومدّ اليد لليسار'
        )
      );
    } else if (family === 'sad_loop' || family === 'tah_tall') {
      strokes.push(
        buildStroke(
          1,
          'loop',
          P([
            [0.48, 0.66],
            [0.64, 0.48],
            [0.74, 0.58],
            [0.56, 0.66],
            [0.22, 0.66],
          ]),
          'right-to-left',
          'Draw the oval loop and stretch left along the line',
          'ارسم الحلقة البيضاوية ومدّها لليسار'
        )
      );
      if (family === 'tah_tall') {
        strokes.push(
          buildStroke(
            2,
            'line',
            L(0.48, 0.22, 0.48, 0.64),
            'down',
            'Add the tall vertical stem',
            'أنزل العمود الطويل من الأعلى'
          )
        );
      }
    } else if (family === 'ayn_curve') {
      strokes.push(
        buildStroke(
          1,
          'curve',
          P([
            [0.64, 0.44],
            [0.42, 0.44],
            [0.42, 0.64],
            [0.66, 0.66],
            [0.24, 0.66],
          ]),
          'right-to-left',
          'Curve the small head and stretch left on the line',
          'ارسم رأس العين الصغير ومدّ اليد لليسار'
        )
      );
    } else if (family === 'fa_neck' || family === 'qaf_deep' || family === 'meem_circle' || family === 'ha_loop') {
      strokes.push(
        buildStroke(
          1,
          'loop',
          P([
            [0.64, 0.58],
            [0.54, 0.44],
            [0.44, 0.56],
            [0.58, 0.66],
            [0.24, 0.66],
          ]),
          'right-to-left',
          'Make a small round loop and extend left on the line',
          'ارسم حلقة دائرية صغيرة ومدّ اليد لليسار'
        )
      );
    } else if (family === 'kaf_angle') {
      strokes.push(
        buildStroke(
          1,
          'curve',
          P([
            [0.68, 0.28],
            [0.42, 0.46],
            [0.62, 0.66],
            [0.24, 0.66],
          ]),
          'right-to-left',
          'Slant down, angle back, and stretch left on the baseline',
          'انزل بميلان ثم اتجه لليسار على السطر'
        )
      );
    } else if (family === 'lam_hook') {
      strokes.push(
        buildStroke(
          1,
          'curve',
          P([
            [0.62, 0.22],
            [0.62, 0.66],
            [0.26, 0.66],
          ]),
          'down-then-left',
          'Go straight down from the top and turn left on the line',
          'انزل من الأعلى ثم اتجه لليسار على السطر'
        )
      );
    } else {
      // ba_boat, noon_bowl, ya_duck, dal_angle, ra_slide, waw_loop
      strokes.push(
        buildStroke(
          1,
          'curve',
          P([
            [0.66, 0.46],
            [0.66, 0.66],
            [0.26, 0.66],
          ]),
          'down-then-left',
          'Start with a small tooth down and stretch left to join',
          'ابدأ بسن صغيرة للأسفل ثم مدّ اليد لليسار'
        )
      );
    }
    const dotAnchorY = dotPlacement === 'above' ? 0.28 : 0.82;
    strokes.push(
      ...buildArabicDotStrokes(strokes.length + 1, dotCount, dotPlacement, 0.56, dotAnchorY)
    );
    return strokes;
  }

  if (formKey === 'medial') {
    strokes.push(
      buildStroke(
        1,
        'curve',
        P([
          [0.78, 0.66],
          [0.56, 0.66],
          [0.5, 0.46],
          [0.44, 0.66],
          [0.22, 0.66],
        ]),
        'right-to-left',
        'Enter from the right, form the middle peak, and exit left',
        'ادخل من اليمين، شكّل وسط الحرف، واتجه لليسار'
      )
    );
    if (family === 'tah_tall') {
      strokes.push(
        buildStroke(
          2,
          'line',
          L(0.5, 0.22, 0.5, 0.62),
          'down',
          'Add the tall vertical stem',
          'أنزل العمود الطويل من الأعلى'
        )
      );
    }
    const dotAnchorY = dotPlacement === 'above' ? 0.28 : 0.82;
    strokes.push(
      ...buildArabicDotStrokes(strokes.length + 1, dotCount, dotPlacement, 0.5, dotAnchorY)
    );
    return strokes;
  }

  // Isolated and Final forms (Final starts with a short right-hand connector lead-in)
  const rightLead: Array<[number, number]> = formKey === 'final' ? [[0.82, 0.64]] : [];

  switch (family) {
    case 'ba_boat':
      strokes.push(
        buildStroke(
          1,
          'curve',
          P([
            ...rightLead,
            [0.74, 0.5],
            [0.72, 0.68],
            [0.5, 0.7],
            [0.28, 0.68],
            [0.26, 0.5],
          ]),
          'right-to-left',
          'Start on the right, curve along the boat bottom to the left tip',
          'ابدأ من اليمين، ارسم صحن الحرف حتى الطرف الأيسر'
        )
      );
      break;

    case 'jeem_belly':
      strokes.push(
        buildStroke(
          1,
          'curve',
          P([
            ...rightLead,
            [0.36, 0.32],
            [0.68, 0.34],
            [0.38, 0.52],
            [0.34, 0.72],
            [0.54, 0.84],
            [0.68, 0.76],
          ]),
          'right-to-left',
          'Draw the top brow right, then sweep a big round belly underneath',
          'ارسم الحاجب العلوي ثم انزل ببطن دائري كبير'
        )
      );
      break;

    case 'dal_angle':
      strokes.push(
        buildStroke(
          1,
          'curve',
          P([
            ...rightLead,
            [0.56, 0.36],
            [0.68, 0.56],
            [0.64, 0.68],
            [0.34, 0.68],
          ]),
          'right-to-left',
          'Curve down to the right corner and rest flat to the left',
          'انزل بقوس مائل ثم استقر على السطر لليسار'
        )
      );
      break;

    case 'ra_slide':
      strokes.push(
        buildStroke(
          1,
          'curve',
          P([
            ...rightLead,
            [0.64, 0.42],
            [0.66, 0.58],
            [0.52, 0.76],
            [0.32, 0.82],
          ]),
          'down-left',
          'Start above the line and slide smoothly down to the left',
          'ابدأ فوق السطر وانزلق بنعومة للأسفل واليسار'
        )
      );
      break;

    case 'seen_teeth':
      strokes.push(
        buildStroke(
          1,
          'curve',
          P([
            ...rightLead,
            [0.78, 0.48],
            [0.72, 0.62],
            [0.64, 0.48],
            [0.56, 0.62],
            [0.48, 0.48],
            [0.44, 0.78],
            [0.3, 0.82],
            [0.22, 0.64],
          ]),
          'right-to-left',
          'Draw three little teeth from right to left, then a deep round bowl',
          'ارسم ثلاث أسنان من اليمين لليسار ثم كأسًا عميقًا'
        )
      );
      break;

    case 'sad_loop':
      strokes.push(
        buildStroke(
          1,
          'loop',
          P([
            ...rightLead,
            [0.52, 0.6],
            [0.68, 0.44],
            [0.78, 0.54],
            [0.56, 0.62],
            [0.48, 0.52],
            [0.44, 0.78],
            [0.28, 0.82],
            [0.22, 0.64],
          ]),
          'right-to-left',
          'Loop up and right, close the oval, then sweep the deep bowl left',
          'ارسم الحلقة البيضاوية ثم انزل بالكأس العميق لليسار'
        )
      );
      break;

    case 'tah_tall':
      strokes.push(
        buildStroke(
          1,
          'loop',
          P([
            ...rightLead,
            [0.46, 0.66],
            [0.64, 0.48],
            [0.74, 0.58],
            [0.54, 0.66],
            [0.26, 0.66],
          ]),
          'right-to-left',
          'Draw the oval loop and extend the base to the left',
          'ارسم الحلقة البيضاوية ومدّ القاعدة لليسار'
        ),
        buildStroke(
          2,
          'line',
          L(0.46, 0.22, 0.46, 0.64),
          'down',
          'Drop the tall mast straight down onto the loop',
          'أنزل العمود الطويل من الأعلى'
        )
      );
      break;

    case 'ayn_curve':
      strokes.push(
        buildStroke(
          1,
          'curve',
          P([
            ...rightLead,
            [0.62, 0.32],
            [0.42, 0.34],
            [0.44, 0.5],
            [0.62, 0.52],
            [0.36, 0.64],
            [0.36, 0.82],
            [0.62, 0.84],
          ]),
          'right-to-left',
          'Curve the small head on top, then sweep a large round belly below',
          'ارسم الرأس الصغير في الأعلى ثم البطن الكبير في الأسفل'
        )
      );
      break;

    case 'fa_neck':
      strokes.push(
        buildStroke(
          1,
          'loop',
          P([
            ...rightLead,
            [0.68, 0.52],
            [0.6, 0.38],
            [0.5, 0.48],
            [0.64, 0.66],
            [0.3, 0.68],
            [0.26, 0.52],
          ]),
          'right-to-left',
          'Make a round head, drop a short neck, and glide across the boat',
          'ارسم رأسًا دائريًا ثم صحنًا ممتدًا لليسار'
        )
      );
      break;

    case 'qaf_deep':
      strokes.push(
        buildStroke(
          1,
          'loop',
          P([
            ...rightLead,
            [0.66, 0.5],
            [0.58, 0.36],
            [0.48, 0.46],
            [0.62, 0.62],
            [0.56, 0.8],
            [0.34, 0.82],
            [0.28, 0.62],
          ]),
          'right-to-left',
          'Make a round head and sweep down into a deep cup',
          'ارسم رأسًا دائريًا ثم كأسًا عميقًا للأسفل'
        )
      );
      break;

    case 'kaf_angle':
      strokes.push(
        buildStroke(
          1,
          'curve',
          P([
            ...rightLead,
            [0.66, 0.24],
            [0.66, 0.68],
            [0.3, 0.68],
            [0.28, 0.54],
          ]),
          'down-then-left',
          'Come straight down from the top, then turn left along the line',
          'انزل بخط طويل من الأعلى ثم اتجه لليسار على السطر'
        )
      );
      if (hasHamza) {
        strokes.push(
          buildStroke(
            2,
            'hamza',
            makeHamzaPoints(0.48, 0.48, 0.045),
            'right-to-left',
            'Draw the small Kaf mark inside',
            'ارسم شارة الكاف الصغيرة بالداخل',
            true
          )
        );
      }
      break;

    case 'lam_hook':
      strokes.push(
        buildStroke(
          1,
          'curve',
          P([
            ...rightLead,
            [0.62, 0.22],
            [0.62, 0.68],
            [0.46, 0.82],
            [0.32, 0.68],
          ]),
          'down-hook',
          'Tall stem down from the top, then curve into a round cup at the bottom',
          'انزل بعمود طويل ثم انحنِ بكأس دائري في الأسفل'
        )
      );
      break;

    case 'meem_circle':
      strokes.push(
        buildStroke(
          1,
          'loop',
          P([
            ...rightLead,
            [0.56, 0.48],
            [0.68, 0.38],
            [0.68, 0.54],
            [0.42, 0.54],
            [0.42, 0.84],
          ]),
          'right-to-left',
          'Draw a small bead circle, go left, and drop the tail down',
          'ارسم حلقة صغيرة ثم اتجه لليسار وأنزل الذيل للأسفل'
        )
      );
      break;

    case 'noon_bowl':
      strokes.push(
        buildStroke(
          1,
          'curve',
          P([
            ...rightLead,
            [0.68, 0.48],
            [0.66, 0.76],
            [0.5, 0.82],
            [0.34, 0.76],
            [0.32, 0.52],
          ]),
          'right-to-left',
          'Curve down from the right into a deep round bowl and rise up on the left',
          'انزل من اليمين في كأس عميق واصعد من اليسار'
        )
      );
      break;

    case 'ha_loop':
      strokes.push(
        buildStroke(
          1,
          'loop',
          P([
            ...rightLead,
            [0.52, 0.34],
            [0.68, 0.54],
            [0.5, 0.68],
            [0.34, 0.54],
            [0.52, 0.34],
          ]),
          'circle',
          'Sweep around in a cozy teardrop loop',
          'ارسم حلقة دائرية متصلة'
        )
      );
      break;

    case 'waw_loop':
      strokes.push(
        buildStroke(
          1,
          'loop',
          P([
            ...rightLead,
            [0.58, 0.48],
            [0.48, 0.36],
            [0.64, 0.36],
            [0.64, 0.58],
            [0.48, 0.78],
            [0.32, 0.82],
          ]),
          'right-to-left',
          'Make a round head loop, then slide the tail down to the left',
          'ارسم رأس الواو الدائري ثم انزلق بالذيل لليسار'
        )
      );
      break;

    case 'ya_duck':
      strokes.push(
        buildStroke(
          1,
          'curve',
          P([
            ...rightLead,
            [0.62, 0.38],
            [0.44, 0.44],
            [0.64, 0.56],
            [0.56, 0.78],
            [0.34, 0.78],
            [0.28, 0.6],
          ]),
          'right-to-left',
          'Curve the little duck head, then sweep the bowl to the left',
          'ارسم رأس الياء المنحني ثم الصحن للأسفل واليسار'
        )
      );
      break;
  }

  // Append Arabic dots (1, 2, or 3) in their canonical position
  const dotAnchorX = family === 'seen_teeth' ? 0.62 : family === 'sad_loop' || family === 'tah_tall' ? 0.62 : 0.5;
  const dotAnchorY =
    dotPlacement === 'above'
      ? family === 'noon_bowl' || family === 'qaf_deep'
        ? 0.32
        : 0.24
      : dotPlacement === 'below'
        ? 0.82
        : 0.62;

  strokes.push(
    ...buildArabicDotStrokes(strokes.length + 1, dotCount, dotPlacement, dotAnchorX, dotAnchorY)
  );

  return strokes;
}

function makeHarakatVariants(char: string, basePhoneme: string): HarakatVariant[] {
  return [
    {
      key: 'fatha',
      symbol: '◌َ',
      displayWithLetter: `${char}َ`,
      soundLabelEn: `${basePhoneme}a (Fatha)`,
      soundLabelAr: `فَتْحَة (${char}َ)`,
      phoneticHint: 'Short open "a" sound on top',
    },
    {
      key: 'kasra',
      symbol: '◌ِ',
      displayWithLetter: `${char}ِ`,
      soundLabelEn: `${basePhoneme}i (Kasra)`,
      soundLabelAr: `كَسْرَة (${char}ِ)`,
      phoneticHint: 'Short smiling "i" sound below',
    },
    {
      key: 'damma',
      symbol: '◌ُ',
      displayWithLetter: `${char}ُ`,
      soundLabelEn: `${basePhoneme}u (Damma)`,
      soundLabelAr: `ضَمَّة (${char}ُ)`,
      phoneticHint: 'Short rounded "u" sound on top',
    },
  ];
}

interface RawArabicSpec {
  order: number;
  char: string;
  nameAr: string;
  nameEn: string;
  phoneme: string;
  soundLabel: string;
  family: ArabicShapeFamily;
  visualGroup: string;
  difficulty: 1 | 2 | 3;
  nonJoiningAfter: boolean;
  dotCount: 0 | 1 | 2 | 3;
  dotPlacement: 'none' | 'above' | 'below' | 'inside';
  hasHamza: boolean;
  forms: { isolated: string; initial: string; medial: string; final: string };
  word: string;
  meaningEn: string;
  emoji: string;
  letters: string[];
  sentenceAr: string;
  sentenceEn: string;
  word2: string;
  meaningEn2: string;
  emoji2: string;
  letters2: string[];
}

const ARABIC_SPECS: RawArabicSpec[] = [
  {
    order: 1, char: 'أ', nameAr: 'ألف', nameEn: 'Alef', phoneme: 'a', soundLabel: '/a/ أَلِف',
    family: 'alef', visualGroup: 'alef_lam', difficulty: 1, nonJoiningAfter: true,
    dotCount: 0, dotPlacement: 'none', hasHamza: true,
    forms: { isolated: 'أ', initial: 'أ', medial: 'ـأ', final: 'ـأ' },
    word: 'أرنب', meaningEn: 'Rabbit', emoji: '🐰', letters: ['أ', 'ر', 'ن', 'ب'],
    sentenceAr: 'أرنب أبيض يقفز.', sentenceEn: 'A white rabbit jumps.',
    word2: 'أسد', meaningEn2: 'Lion', emoji2: '🦁', letters2: ['أ', 'س', 'د'],
  },
  {
    order: 2, char: 'ب', nameAr: 'باء', nameEn: 'Baa', phoneme: 'b', soundLabel: '/b/ بَاء',
    family: 'ba_boat', visualGroup: 'ba_ta_tha', difficulty: 1, nonJoiningAfter: false,
    dotCount: 1, dotPlacement: 'below', hasHamza: false,
    forms: { isolated: 'ب', initial: 'بـ', medial: 'ـبـ', final: 'ـب' },
    word: 'بطة', meaningEn: 'Duck', emoji: '🦆', letters: ['ب', 'ط', 'ة'],
    sentenceAr: 'بطة تسبح في الماء.', sentenceEn: 'A duck swims in the water.',
    word2: 'بيت', meaningEn2: 'House', emoji2: '🏠', letters2: ['ب', 'ي', 'ت'],
  },
  {
    order: 3, char: 'ت', nameAr: 'تاء', nameEn: 'Taa', phoneme: 't', soundLabel: '/t/ تَاء',
    family: 'ba_boat', visualGroup: 'ba_ta_tha', difficulty: 1, nonJoiningAfter: false,
    dotCount: 2, dotPlacement: 'above', hasHamza: false,
    forms: { isolated: 'ت', initial: 'تـ', medial: 'ـتـ', final: 'ـت' },
    word: 'تفاح', meaningEn: 'Apples', emoji: '🍎', letters: ['ت', 'ف', 'ا', 'ح'],
    sentenceAr: 'تفاح أحمر لذيذ.', sentenceEn: 'Delicious red apples.',
    word2: 'تاج', meaningEn2: 'Crown', emoji2: '👑', letters2: ['ت', 'ا', 'ج'],
  },
  {
    order: 4, char: 'ث', nameAr: 'ثاء', nameEn: 'Thaa', phoneme: 'th', soundLabel: '/θ/ ثَاء',
    family: 'ba_boat', visualGroup: 'ba_ta_tha', difficulty: 2, nonJoiningAfter: false,
    dotCount: 3, dotPlacement: 'above', hasHamza: false,
    forms: { isolated: 'ث', initial: 'ثـ', medial: 'ـثـ', final: 'ـث' },
    word: 'ثعلب', meaningEn: 'Fox', emoji: '🦊', letters: ['ث', 'ع', 'ل', 'ب'],
    sentenceAr: 'ثعلب صغير ذكي.', sentenceEn: 'A clever little fox.',
    word2: 'ثلج', meaningEn2: 'Snow', emoji2: '❄️', letters2: ['ث', 'ل', 'ج'],
  },
  {
    order: 5, char: 'ج', nameAr: 'جيم', nameEn: 'Jeem', phoneme: 'j', soundLabel: '/dʒ/ جِيم',
    family: 'jeem_belly', visualGroup: 'jeem_ha_kha', difficulty: 2, nonJoiningAfter: false,
    dotCount: 1, dotPlacement: 'inside', hasHamza: false,
    forms: { isolated: 'ج', initial: 'جـ', medial: 'ـجـ', final: 'ـج' },
    word: 'جمل', meaningEn: 'Camel', emoji: '🐪', letters: ['ج', 'م', 'ل'],
    sentenceAr: 'جمل يمشي في الصحراء.', sentenceEn: 'A camel walks in the desert.',
    word2: 'جزر', meaningEn2: 'Carrots', emoji2: '🥕', letters2: ['ج', 'ز', 'ر'],
  },
  {
    order: 6, char: 'ح', nameAr: 'حاء', nameEn: 'Haa', phoneme: 'ḥ', soundLabel: '/ħ/ حَاء',
    family: 'jeem_belly', visualGroup: 'jeem_ha_kha', difficulty: 2, nonJoiningAfter: false,
    dotCount: 0, dotPlacement: 'none', hasHamza: false,
    forms: { isolated: 'ح', initial: 'حـ', medial: 'ـحـ', final: 'ـح' },
    word: 'حصان', meaningEn: 'Horse', emoji: '🐴', letters: ['ح', 'ص', 'ا', 'ن'],
    sentenceAr: 'حصان سريع يجري.', sentenceEn: 'A fast horse runs.',
    word2: 'حوت', meaningEn2: 'Whale', emoji2: '🐳', letters2: ['ح', 'و', 'ت'],
  },
  {
    order: 7, char: 'خ', nameAr: 'خاء', nameEn: 'Khaa', phoneme: 'kh', soundLabel: '/x/ خَاء',
    family: 'jeem_belly', visualGroup: 'jeem_ha_kha', difficulty: 2, nonJoiningAfter: false,
    dotCount: 1, dotPlacement: 'above', hasHamza: false,
    forms: { isolated: 'خ', initial: 'خـ', medial: 'ـخـ', final: 'ـخ' },
    word: 'خروف', meaningEn: 'Sheep', emoji: '🐑', letters: ['خ', 'ر', 'و', 'ف'],
    sentenceAr: 'خروف أبيض لطيف.', sentenceEn: 'A gentle white sheep.',
    word2: 'خبز', meaningEn2: 'Bread', emoji2: '🍞', letters2: ['خ', 'ب', 'ز'],
  },
  {
    order: 8, char: 'د', nameAr: 'دال', nameEn: 'Dal', phoneme: 'd', soundLabel: '/d/ دَال',
    family: 'dal_angle', visualGroup: 'dal_dhal', difficulty: 1, nonJoiningAfter: true,
    dotCount: 0, dotPlacement: 'none', hasHamza: false,
    forms: { isolated: 'د', initial: 'د', medial: 'ـد', final: 'ـد' },
    word: 'دب', meaningEn: 'Bear', emoji: '🐻', letters: ['د', 'ب'],
    sentenceAr: 'دب يحب العسل.', sentenceEn: 'A bear loves honey.',
    word2: 'ديك', meaningEn2: 'Rooster', emoji2: '🐓', letters2: ['د', 'ي', 'ك'],
  },
  {
    order: 9, char: 'ذ', nameAr: 'ذال', nameEn: 'Dhal', phoneme: 'dh', soundLabel: '/ð/ ذَال',
    family: 'dal_angle', visualGroup: 'dal_dhal', difficulty: 1, nonJoiningAfter: true,
    dotCount: 1, dotPlacement: 'above', hasHamza: false,
    forms: { isolated: 'ذ', initial: 'ذ', medial: 'ـذ', final: 'ـذ' },
    word: 'ذرة', meaningEn: 'Corn', emoji: '🌽', letters: ['ذ', 'ر', 'ة'],
    sentenceAr: 'ذرة صفراء لذيذة.', sentenceEn: 'Tasty yellow corn.',
    word2: 'ذهب', meaningEn2: 'Gold', emoji2: '🪙', letters2: ['ذ', 'ه', 'ب'],
  },
  {
    order: 10, char: 'ر', nameAr: 'راء', nameEn: 'Raa', phoneme: 'r', soundLabel: '/r/ رَاء',
    family: 'ra_slide', visualGroup: 'ra_zay', difficulty: 1, nonJoiningAfter: true,
    dotCount: 0, dotPlacement: 'none', hasHamza: false,
    forms: { isolated: 'ر', initial: 'ر', medial: 'ـر', final: 'ـر' },
    word: 'رمان', meaningEn: 'Pomegranate', emoji: '🍎', letters: ['ر', 'م', 'ا', 'ن'],
    sentenceAr: 'رمان حلو المذاق.', sentenceEn: 'Sweet pomegranate.',
    word2: 'ريشة', meaningEn2: 'Feather', emoji2: '🪶', letters2: ['ر', 'ي', 'ش', 'ة'],
  },
  {
    order: 11, char: 'ز', nameAr: 'زاي', nameEn: 'Zay', phoneme: 'z', soundLabel: '/z/ زَاي',
    family: 'ra_slide', visualGroup: 'ra_zay', difficulty: 1, nonJoiningAfter: true,
    dotCount: 1, dotPlacement: 'above', hasHamza: false,
    forms: { isolated: 'ز', initial: 'ز', medial: 'ـز', final: 'ـز' },
    word: 'زرافة', meaningEn: 'Giraffe', emoji: '🦒', letters: ['ز', 'ر', 'ا', 'ف', 'ة'],
    sentenceAr: 'زرافة طويلة العنق.', sentenceEn: 'A tall-necked giraffe.',
    word2: 'زهرة', meaningEn2: 'Flower', emoji2: '🌸', letters2: ['ز', 'ه', 'ر', 'ة'],
  },
  {
    order: 12, char: 'س', nameAr: 'سين', nameEn: 'Seen', phoneme: 's', soundLabel: '/s/ سِين',
    family: 'seen_teeth', visualGroup: 'seen_sheen', difficulty: 2, nonJoiningAfter: false,
    dotCount: 0, dotPlacement: 'none', hasHamza: false,
    forms: { isolated: 'س', initial: 'سـ', medial: 'ـسـ', final: 'ـس' },
    word: 'سمكة', meaningEn: 'Fish', emoji: '🐟', letters: ['س', 'م', 'ك', 'ة'],
    sentenceAr: 'سمكة ملونة في البحر.', sentenceEn: 'A colorful fish in the sea.',
    word2: 'سيارة', meaningEn2: 'Car', emoji2: '🚗', letters2: ['س', 'ي', 'ا', 'ر', 'ة'],
  },
  {
    order: 13, char: 'ش', nameAr: 'شين', nameEn: 'Sheen', phoneme: 'sh', soundLabel: '/ʃ/ شِين',
    family: 'seen_teeth', visualGroup: 'seen_sheen', difficulty: 2, nonJoiningAfter: false,
    dotCount: 3, dotPlacement: 'above', hasHamza: false,
    forms: { isolated: 'ش', initial: 'شـ', medial: 'ـشـ', final: 'ـش' },
    word: 'شمس', meaningEn: 'Sun', emoji: '☀️', letters: ['ش', 'م', 'س'],
    sentenceAr: 'شمس مشرقة في السماء.', sentenceEn: 'A bright sun in the sky.',
    word2: 'شجرة', meaningEn2: 'Tree', emoji2: '🌳', letters2: ['ش', 'ج', 'ر', 'ة'],
  },
  {
    order: 14, char: 'ص', nameAr: 'صاد', nameEn: 'Sad', phoneme: 'ṣ', soundLabel: '/sˤ/ صَاد',
    family: 'sad_loop', visualGroup: 'sad_dad', difficulty: 3, nonJoiningAfter: false,
    dotCount: 0, dotPlacement: 'none', hasHamza: false,
    forms: { isolated: 'ص', initial: 'صـ', medial: 'ـصـ', final: 'ـص' },
    word: 'صاروخ', meaningEn: 'Rocket', emoji: '🚀', letters: ['ص', 'ا', 'ر', 'و', 'خ'],
    sentenceAr: 'صاروخ ينطلق للفضاء.', sentenceEn: 'A rocket launches into space.',
    word2: 'صقر', meaningEn2: 'Falcon', emoji2: '🦅', letters2: ['ص', 'ق', 'ر'],
  },
  {
    order: 15, char: 'ض', nameAr: 'ضاد', nameEn: 'Dad', phoneme: 'ḍ', soundLabel: '/dˤ/ ضَاد',
    family: 'sad_loop', visualGroup: 'sad_dad', difficulty: 3, nonJoiningAfter: false,
    dotCount: 1, dotPlacement: 'above', hasHamza: false,
    forms: { isolated: 'ض', initial: 'ضـ', medial: 'ـضـ', final: 'ـض' },
    word: 'ضفدع', meaningEn: 'Frog', emoji: '🐸', letters: ['ض', 'ف', 'د', 'ع'],
    sentenceAr: 'ضفدع أخضر يقفز.', sentenceEn: 'A green frog hops.',
    word2: 'ضوء', meaningEn2: 'Light', emoji2: '💡', letters2: ['ض', 'و', 'ء'],
  },
  {
    order: 16, char: 'ط', nameAr: 'طاء', nameEn: 'Tah', phoneme: 'ṭ', soundLabel: '/tˤ/ طَاء',
    family: 'tah_tall', visualGroup: 'tah_zah', difficulty: 2, nonJoiningAfter: false,
    dotCount: 0, dotPlacement: 'none', hasHamza: false,
    forms: { isolated: 'ط', initial: 'طـ', medial: 'ـطـ', final: 'ـط' },
    word: 'طائرة', meaningEn: 'Airplane', emoji: '✈️', letters: ['ط', 'ا', 'ئ', 'ر', 'ة'],
    sentenceAr: 'طائرة تطير بين الغيوم.', sentenceEn: 'An airplane flies among the clouds.',
    word2: 'طبل', meaningEn2: 'Drum', emoji2: '🥁', letters2: ['ط', 'ب', 'ل'],
  },
  {
    order: 17, char: 'ظ', nameAr: 'ظاء', nameEn: 'Zah', phoneme: 'ẓ', soundLabel: '/ðˤ/ ظَاء',
    family: 'tah_tall', visualGroup: 'tah_zah', difficulty: 2, nonJoiningAfter: false,
    dotCount: 1, dotPlacement: 'above', hasHamza: false,
    forms: { isolated: 'ظ', initial: 'ظـ', medial: 'ـظـ', final: 'ـظ' },
    word: 'ظرف', meaningEn: 'Envelope', emoji: '✉️', letters: ['ظ', 'ر', 'ف'],
    sentenceAr: 'ظرف بداخله رسالة.', sentenceEn: 'An envelope with a letter inside.',
    word2: 'ظبي', meaningEn2: 'Gazelle', emoji2: '🦌', letters2: ['ظ', 'ب', 'ي'],
  },
  {
    order: 18, char: 'ع', nameAr: 'عين', nameEn: 'Ayn', phoneme: 'ʿ', soundLabel: '/ʕ/ عَيْن',
    family: 'ayn_curve', visualGroup: 'ayn_ghayn', difficulty: 3, nonJoiningAfter: false,
    dotCount: 0, dotPlacement: 'none', hasHamza: false,
    forms: { isolated: 'ع', initial: 'عـ', medial: 'ـعـ', final: 'ـع' },
    word: 'عنب', meaningEn: 'Grapes', emoji: '🍇', letters: ['ع', 'ن', 'ب'],
    sentenceAr: 'عنب حلو ولذيذ.', sentenceEn: 'Sweet and tasty grapes.',
    word2: 'عصفور', meaningEn2: 'Bird', emoji2: '🐦', letters2: ['ع', 'ص', 'ف', 'و', 'ر'],
  },
  {
    order: 19, char: 'غ', nameAr: 'غين', nameEn: 'Ghayn', phoneme: 'gh', soundLabel: '/ɣ/ غَيْن',
    family: 'ayn_curve', visualGroup: 'ayn_ghayn', difficulty: 3, nonJoiningAfter: false,
    dotCount: 1, dotPlacement: 'above', hasHamza: false,
    forms: { isolated: 'غ', initial: 'غـ', medial: 'ـغـ', final: 'ـغ' },
    word: 'غيمة', meaningEn: 'Cloud', emoji: '☁️', letters: ['غ', 'ي', 'م', 'ة'],
    sentenceAr: 'غيمة بيضاء في السماء.', sentenceEn: 'A white cloud in the sky.',
    word2: 'غزال', meaningEn2: 'Deer', emoji2: '🦌', letters2: ['غ', 'ز', 'ا', 'ل'],
  },
  {
    order: 20, char: 'ف', nameAr: 'فاء', nameEn: 'Faa', phoneme: 'f', soundLabel: '/f/ فَاء',
    family: 'fa_neck', visualGroup: 'fa_qaf', difficulty: 2, nonJoiningAfter: false,
    dotCount: 1, dotPlacement: 'above', hasHamza: false,
    forms: { isolated: 'ف', initial: 'فـ', medial: 'ـفـ', final: 'ـف' },
    word: 'فيل', meaningEn: 'Elephant', emoji: '🐘', letters: ['ف', 'ي', 'ل'],
    sentenceAr: 'فيل كبير ولطيف.', sentenceEn: 'A big, gentle elephant.',
    word2: 'فراشة', meaningEn2: 'Butterfly', emoji2: '🦋', letters2: ['ف', 'ر', 'ا', 'ش', 'ة'],
  },
  {
    order: 21, char: 'ق', nameAr: 'قاف', nameEn: 'Qaf', phoneme: 'q', soundLabel: '/q/ قَاف',
    family: 'qaf_deep', visualGroup: 'fa_qaf', difficulty: 2, nonJoiningAfter: false,
    dotCount: 2, dotPlacement: 'above', hasHamza: false,
    forms: { isolated: 'ق', initial: 'قـ', medial: 'ـقـ', final: 'ـق' },
    word: 'قمر', meaningEn: 'Moon', emoji: '🌙', letters: ['ق', 'م', 'ر'],
    sentenceAr: 'قمر يضيء في الليل.', sentenceEn: 'The moon shines at night.',
    word2: 'قلم', meaningEn2: 'Pen', emoji2: '✏️', letters2: ['ق', 'ل', 'م'],
  },
  {
    order: 22, char: 'ك', nameAr: 'كاف', nameEn: 'Kaf', phoneme: 'k', soundLabel: '/k/ كَاف',
    family: 'kaf_angle', visualGroup: 'kaf_lam', difficulty: 2, nonJoiningAfter: false,
    dotCount: 0, dotPlacement: 'none', hasHamza: true,
    forms: { isolated: 'ك', initial: 'كـ', medial: 'ـكـ', final: 'ـك' },
    word: 'كتاب', meaningEn: 'Book', emoji: '📖', letters: ['ك', 'ت', 'ا', 'ب'],
    sentenceAr: 'نقرأ في كتاب جميل.', sentenceEn: 'We read a lovely book.',
    word2: 'كلب', meaningEn2: 'Dog', emoji2: '🐶', letters2: ['ك', 'ل', 'ب'],
  },
  {
    order: 23, char: 'ل', nameAr: 'لام', nameEn: 'Lam', phoneme: 'l', soundLabel: '/l/ لَام',
    family: 'lam_hook', visualGroup: 'alef_lam', difficulty: 1, nonJoiningAfter: false,
    dotCount: 0, dotPlacement: 'none', hasHamza: false,
    forms: { isolated: 'ل', initial: 'لـ', medial: 'ـلـ', final: 'ـل' },
    word: 'ليمون', meaningEn: 'Lemon', emoji: '🍋', letters: ['ل', 'ي', 'م', 'و', 'ن'],
    sentenceAr: 'ليمون أصفر منعش.', sentenceEn: 'Fresh yellow lemon.',
    word2: 'لعبة', meaningEn2: 'Toy', emoji2: '🧸', letters2: ['ل', 'ع', 'ب', 'ة'],
  },
  {
    order: 24, char: 'م', nameAr: 'ميم', nameEn: 'Meem', phoneme: 'm', soundLabel: '/m/ مِيم',
    family: 'meem_circle', visualGroup: 'meem_ha_waw', difficulty: 2, nonJoiningAfter: false,
    dotCount: 0, dotPlacement: 'none', hasHamza: false,
    forms: { isolated: 'م', initial: 'مـ', medial: 'ـمـ', final: 'ـم' },
    word: 'موز', meaningEn: 'Banana', emoji: '🍌', letters: ['م', 'و', 'ز'],
    sentenceAr: 'موز أصفر مفيد.', sentenceEn: 'Healthy yellow banana.',
    word2: 'مفتاح', meaningEn2: 'Key', emoji2: '🔑', letters2: ['م', 'ف', 'ت', 'ا', 'ح'],
  },
  {
    order: 25, char: 'ن', nameAr: 'نون', nameEn: 'Noon', phoneme: 'n', soundLabel: '/n/ نُون',
    family: 'noon_bowl', visualGroup: 'noon_ya', difficulty: 1, nonJoiningAfter: false,
    dotCount: 1, dotPlacement: 'above', hasHamza: false,
    forms: { isolated: 'ن', initial: 'نـ', medial: 'ـنـ', final: 'ـن' },
    word: 'نجمة', meaningEn: 'Star', emoji: '⭐', letters: ['ن', 'ج', 'م', 'ة'],
    sentenceAr: 'نجمة تلمع في السماء.', sentenceEn: 'A star twinkles in the sky.',
    word2: 'نحلة', meaningEn2: 'Bee', emoji2: '🐝', letters2: ['ن', 'ح', 'ل', 'ة'],
  },
  {
    order: 26, char: 'هـ', nameAr: 'هاء', nameEn: 'Haa (soft)', phoneme: 'h', soundLabel: '/h/ هَاء',
    family: 'ha_loop', visualGroup: 'meem_ha_waw', difficulty: 3, nonJoiningAfter: false,
    dotCount: 0, dotPlacement: 'none', hasHamza: false,
    forms: { isolated: 'ه', initial: 'هـ', medial: 'ـهـ', final: 'ـه' },
    word: 'هدية', meaningEn: 'Gift', emoji: '🎁', letters: ['ه', 'د', 'ي', 'ة'],
    sentenceAr: 'هدية جميلة ومفرحة.', sentenceEn: 'A lovely, joyful gift.',
    word2: 'هرم', meaningEn2: 'Pyramid', emoji2: '🔺', letters2: ['ه', 'ر', 'م'],
  },
  {
    order: 27, char: 'و', nameAr: 'واو', nameEn: 'Waw', phoneme: 'w', soundLabel: '/w/ وَاو',
    family: 'waw_loop', visualGroup: 'meem_ha_waw', difficulty: 1, nonJoiningAfter: true,
    dotCount: 0, dotPlacement: 'none', hasHamza: false,
    forms: { isolated: 'و', initial: 'و', medial: 'ـو', final: 'ـو' },
    word: 'وردة', meaningEn: 'Rose', emoji: '🌹', letters: ['و', 'ر', 'د', 'ة'],
    sentenceAr: 'وردة حمراء جميلة.', sentenceEn: 'A beautiful red rose.',
    word2: 'وسادة', meaningEn2: 'Pillow', emoji2: '🛏️', letters2: ['و', 'س', 'ا', 'د', 'ة'],
  },
  {
    order: 28, char: 'ي', nameAr: 'ياء', nameEn: 'Yaa', phoneme: 'y', soundLabel: '/j/ يَاء',
    family: 'ya_duck', visualGroup: 'noon_ya', difficulty: 2, nonJoiningAfter: false,
    dotCount: 2, dotPlacement: 'below', hasHamza: false,
    forms: { isolated: 'ي', initial: 'يـ', medial: 'ـيـ', final: 'ـي' },
    word: 'يد', meaningEn: 'Hand', emoji: '✋', letters: ['ي', 'د'],
    sentenceAr: 'نكتب ونرسم باليد.', sentenceEn: 'We write and draw with our hand.',
    word2: 'يمامة', meaningEn2: 'Dove', emoji2: '🕊️', letters2: ['ي', 'م', 'ا', 'م', 'ة'],
  },
];

export const ARABIC_LETTERS: CurriculumLetter[] = ARABIC_SPECS.map((spec) => {
  const paddedOrder = String(spec.order).padStart(2, '0');
  const baseChar = spec.forms.isolated;
  return {
    id: `ar_${paddedOrder}`,
    language: 'ar',
    orderIndex: spec.order,
    character: baseChar,
    nameEn: `${spec.nameEn} (${baseChar})`,
    nameAr: `حرف ال${spec.nameAr}`,
    soundLabel: spec.soundLabel,
    ttsPrompt: `${spec.nameAr}. ${baseChar}، مثل كلمة ${spec.word}.`,
    pronunciationAsset: `ar_${paddedOrder}`,
    difficultyLevel: spec.difficulty,
    visualGroup: spec.visualGroup,
    arabicForms: spec.forms,
    nonJoiningAfter: spec.nonJoiningAfter,
    dotCount: spec.dotCount,
    dotPlacement: spec.dotPlacement,
    hasHamza: spec.hasHamza,
    harakatVariants: makeHarakatVariants(baseChar, spec.phoneme),
    example: {
      id: `word_ar_${paddedOrder}_1`,
      word: spec.word,
      meaningEn: spec.meaningEn,
      meaningAr: spec.word,
      emoji: spec.emoji,
      illustrationKey: spec.meaningEn.toLowerCase(),
      letters: spec.letters,
      sentenceEn: spec.sentenceEn,
      sentenceAr: spec.sentenceAr,
    },
    secondaryExample: {
      id: `word_ar_${paddedOrder}_2`,
      word: spec.word2,
      meaningEn: spec.meaningEn2,
      meaningAr: spec.word2,
      emoji: spec.emoji2,
      illustrationKey: spec.meaningEn2.toLowerCase(),
      letters: spec.letters2,
    },
    strokeTemplates: {
      isolated: buildArabicFormStrokes(
        spec.family,
        'isolated',
        spec.dotCount,
        spec.dotPlacement,
        spec.hasHamza
      ),
      initial: buildArabicFormStrokes(
        spec.family,
        'initial',
        spec.dotCount,
        spec.dotPlacement,
        spec.hasHamza && spec.family === 'alef'
      ),
      medial: buildArabicFormStrokes(
        spec.family,
        'medial',
        spec.dotCount,
        spec.dotPlacement,
        spec.hasHamza && spec.family === 'alef'
      ),
      final: buildArabicFormStrokes(
        spec.family,
        'final',
        spec.dotCount,
        spec.dotPlacement,
        spec.hasHamza
      ),
    },
  };
});
