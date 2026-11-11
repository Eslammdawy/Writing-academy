import { CurriculumLetter, NormalizedStrokeTemplate } from '../../types';
import {
  buildStroke,
  makeDotPoints,
  makeLinePoints,
  makePolylinePoints,
  makeQuadCurvePoints,
} from '../strokeGeometry';

const L = makeLinePoints;
const Q = makeQuadCurvePoints;
const P = makePolylinePoints;
const D = makeDotPoints;

/**
 * Curated stroke templates for all 26 English uppercase and 26 lowercase letters.
 * Coordinates are normalized in [0, 1] where y=0.20 is cap height, y=0.45 is x-height,
 * y=0.75 is baseline, and y=0.90 is descender line.
 */
const UPPERCASE_STROKES: Record<string, NormalizedStrokeTemplate[]> = {
  A: [
    buildStroke(1, 'line', L(0.5, 0.2, 0.28, 0.75), 'down-left', 'Slant down to the left', 'ارسم خطًا مائلًا لليسار'),
    buildStroke(2, 'line', L(0.5, 0.2, 0.72, 0.75), 'down-right', 'Slant down to the right', 'ارسم خطًا مائلًا لليمين'),
    buildStroke(3, 'line', L(0.36, 0.52, 0.64, 0.52), 'right', 'Cross in the middle', 'ارسم خطًا أفقيًا في الوسط'),
  ],
  B: [
    buildStroke(1, 'line', L(0.34, 0.2, 0.34, 0.75), 'down', 'Draw a tall line down', 'ارسم خطًا طويلًا للأسفل'),
    buildStroke(2, 'curve', P([[0.34, 0.2], [0.64, 0.24], [0.64, 0.42], [0.34, 0.47]]), 'curve-right', 'Curve around the top', 'ارسم نصف دائرة في الأعلى'),
    buildStroke(3, 'curve', P([[0.34, 0.47], [0.66, 0.52], [0.66, 0.7], [0.34, 0.75]]), 'curve-right', 'Curve around the bottom', 'ارسم نصف دائرة في الأسفل'),
  ],
  C: [
    buildStroke(1, 'curve', P([[0.68, 0.28], [0.46, 0.18], [0.28, 0.36], [0.28, 0.6], [0.46, 0.76], [0.68, 0.68]]), 'curve-left', 'Big open curve to the left', 'ارسم قوسًا كبيرًا مفتوحًا'),
  ],
  D: [
    buildStroke(1, 'line', L(0.34, 0.2, 0.34, 0.75), 'down', 'Tall line straight down', 'ارسم خطًا مستقيمًا للأسفل'),
    buildStroke(2, 'curve', P([[0.34, 0.2], [0.68, 0.26], [0.7, 0.48], [0.68, 0.69], [0.34, 0.75]]), 'curve-right', 'Big belly curve from top to bottom', 'ارسم قوسًا كبيرًا من الأعلى للأسفل'),
  ],
  E: [
    buildStroke(1, 'line', L(0.34, 0.2, 0.34, 0.75), 'down', 'Straight line down', 'خط مستقيم للأسفل'),
    buildStroke(2, 'line', L(0.34, 0.2, 0.68, 0.2), 'right', 'Top bar across', 'خط علوي لليمين'),
    buildStroke(3, 'line', L(0.34, 0.47, 0.62, 0.47), 'right', 'Middle bar across', 'خط أوسط لليمين'),
    buildStroke(4, 'line', L(0.34, 0.75, 0.68, 0.75), 'right', 'Bottom bar across', 'خط سفلي لليمين'),
  ],
  F: [
    buildStroke(1, 'line', L(0.35, 0.2, 0.35, 0.75), 'down', 'Straight line down', 'خط مستقيم للأسفل'),
    buildStroke(2, 'line', L(0.35, 0.2, 0.68, 0.2), 'right', 'Top bar across', 'خط علوي لليمين'),
    buildStroke(3, 'line', L(0.35, 0.47, 0.62, 0.47), 'right', 'Middle bar across', 'خط أوسط لليمين'),
  ],
  G: [
    buildStroke(1, 'curve', P([[0.68, 0.28], [0.46, 0.18], [0.28, 0.36], [0.28, 0.6], [0.48, 0.76], [0.68, 0.66], [0.68, 0.5]]), 'curve-left', 'Curve around and up', 'ارسم قوسًا كبيرًا ثم اصعد قليلًا'),
    buildStroke(2, 'line', L(0.52, 0.5, 0.68, 0.5), 'right', 'Little shelf across', 'خط صغير للداخل'),
  ],
  H: [
    buildStroke(1, 'line', L(0.32, 0.2, 0.32, 0.75), 'down', 'Left pillar down', 'عمود أيسر للأسفل'),
    buildStroke(2, 'line', L(0.68, 0.2, 0.68, 0.75), 'down', 'Right pillar down', 'عمود أيمن للأسفل'),
    buildStroke(3, 'line', L(0.32, 0.47, 0.68, 0.47), 'right', 'Bridge across the middle', 'جسر في المنتصف'),
  ],
  I: [
    buildStroke(1, 'line', L(0.5, 0.2, 0.5, 0.75), 'down', 'Straight line down the center', 'خط مستقيم للأسفل'),
    buildStroke(2, 'line', L(0.36, 0.2, 0.64, 0.2), 'right', 'Top hat across', 'خط صغير في الأعلى'),
    buildStroke(3, 'line', L(0.36, 0.75, 0.64, 0.75), 'right', 'Bottom shoes across', 'خط صغير في الأسفل'),
  ],
  J: [
    buildStroke(1, 'curve', P([[0.58, 0.2], [0.58, 0.62], [0.48, 0.75], [0.34, 0.66]]), 'down-hook', 'Go straight down and hook left', 'انزل للأسفل ثم انحنِ لليسار'),
    buildStroke(2, 'line', L(0.42, 0.2, 0.72, 0.2), 'right', 'Top bar across', 'خط علوي في الأعلى'),
  ],
  K: [
    buildStroke(1, 'line', L(0.34, 0.2, 0.34, 0.75), 'down', 'Tall line straight down', 'خط طويل للأسفل'),
    buildStroke(2, 'line', L(0.68, 0.2, 0.34, 0.48), 'down-left', 'Kick in to the middle', 'خط مائل للوسط'),
    buildStroke(3, 'line', L(0.38, 0.45, 0.68, 0.75), 'down-right', 'Kick out to the bottom', 'خط مائل للأسفل'),
  ],
  L: [
    buildStroke(1, 'line', L(0.36, 0.2, 0.36, 0.75), 'down', 'Tall line down', 'خط طويل للأسفل'),
    buildStroke(2, 'line', L(0.36, 0.75, 0.68, 0.75), 'right', 'Turn right on the floor', 'اتجه لليمين على السطر'),
  ],
  M: [
    buildStroke(1, 'line', L(0.24, 0.2, 0.24, 0.75), 'down', 'Left line down', 'خط أيسر للأسفل'),
    buildStroke(2, 'line', L(0.24, 0.2, 0.5, 0.56), 'down-right', 'Slide down to the valley', 'انزل للوادي في الوسط'),
    buildStroke(3, 'line', L(0.5, 0.56, 0.76, 0.2), 'up-right', 'Climb up to the peak', 'اصعد للقمة اليمنى'),
    buildStroke(4, 'line', L(0.76, 0.2, 0.76, 0.75), 'down', 'Right line down', 'خط أيمن للأسفل'),
  ],
  N: [
    buildStroke(1, 'line', L(0.3, 0.2, 0.3, 0.75), 'down', 'Left line down', 'خط أيسر للأسفل'),
    buildStroke(2, 'line', L(0.3, 0.2, 0.7, 0.75), 'down-right', 'Diagonal slide down', 'خط مائل للأسفل'),
    buildStroke(3, 'line', L(0.7, 0.2, 0.7, 0.75), 'down', 'Right line down', 'خط أيمن للأسفل'),
  ],
  O: [
    buildStroke(1, 'loop', P([[0.5, 0.2], [0.28, 0.32], [0.28, 0.62], [0.5, 0.75], [0.72, 0.62], [0.72, 0.32], [0.5, 0.2]]), 'circle', 'Draw a big round circle', 'ارسم دائرة كبيرة كاملة'),
  ],
  P: [
    buildStroke(1, 'line', L(0.34, 0.2, 0.34, 0.75), 'down', 'Tall line down', 'خط طويل للأسفل'),
    buildStroke(2, 'curve', P([[0.34, 0.2], [0.66, 0.24], [0.66, 0.44], [0.34, 0.48]]), 'curve-right', 'Loop around the top', 'قوس علوي لليمين'),
  ],
  Q: [
    buildStroke(1, 'loop', P([[0.5, 0.2], [0.28, 0.32], [0.28, 0.62], [0.5, 0.75], [0.72, 0.62], [0.72, 0.32], [0.5, 0.2]]), 'circle', 'Draw a big round circle', 'ارسم دائرة كبيرة'),
    buildStroke(2, 'line', L(0.54, 0.58, 0.74, 0.78), 'down-right', 'Add the little kickstand tail', 'أضف ذيلًا صغيرًا مائلًا'),
  ],
  R: [
    buildStroke(1, 'line', L(0.34, 0.2, 0.34, 0.75), 'down', 'Tall line down', 'خط طويل للأسفل'),
    buildStroke(2, 'curve', P([[0.34, 0.2], [0.66, 0.24], [0.66, 0.44], [0.34, 0.48]]), 'curve-right', 'Loop around the top', 'قوس علوي لليمين'),
    buildStroke(3, 'line', L(0.46, 0.48, 0.68, 0.75), 'down-right', 'Kick leg down to the right', 'خط مائل للأسفل'),
  ],
  S: [
    buildStroke(1, 'curve', P([[0.64, 0.26], [0.46, 0.2], [0.32, 0.32], [0.5, 0.47], [0.68, 0.6], [0.52, 0.75], [0.34, 0.68]]), 'snake', 'Curve left then snake right', 'تعرج مثل الثعبان اللطيف'),
  ],
  T: [
    buildStroke(1, 'line', L(0.5, 0.2, 0.5, 0.75), 'down', 'Tall line straight down', 'خط مستقيم للأسفل'),
    buildStroke(2, 'line', L(0.28, 0.2, 0.72, 0.2), 'right', 'Roof bar across the top', 'سقف أفقي في الأعلى'),
  ],
  U: [
    buildStroke(1, 'curve', P([[0.32, 0.2], [0.32, 0.6], [0.5, 0.75], [0.68, 0.6], [0.68, 0.2]]), 'cup', 'Down, curve at the bottom, and up', 'انزل، انحنِ في الأسفل، ثم اصعد'),
  ],
  V: [
    buildStroke(1, 'line', L(0.3, 0.2, 0.5, 0.75), 'down-right', 'Slant down to the bottom point', 'خط مائل للنقطة السفلية'),
    buildStroke(2, 'line', L(0.5, 0.75, 0.7, 0.2), 'up-right', 'Slant up to the top right', 'خط مائل للأعلى'),
  ],
  W: [
    buildStroke(1, 'line', L(0.22, 0.2, 0.36, 0.75), 'down-right', 'Slant down', 'انزل مائلًا'),
    buildStroke(2, 'line', L(0.36, 0.75, 0.5, 0.38), 'up-right', 'Climb to the middle', 'اصعد للوسط'),
    buildStroke(3, 'line', L(0.5, 0.38, 0.64, 0.75), 'down-right', 'Slant down again', 'انزل مائلًا مرة أخرى'),
    buildStroke(4, 'line', L(0.64, 0.75, 0.78, 0.2), 'up-right', 'Climb to the top right', 'اصعد للأعلى'),
  ],
  X: [
    buildStroke(1, 'line', L(0.3, 0.2, 0.7, 0.75), 'down-right', 'Criss slant down-right', 'خط مائل لليمين'),
    buildStroke(2, 'line', L(0.7, 0.2, 0.3, 0.75), 'down-left', 'Cross slant down-left', 'خط متقاطع لليسار'),
  ],
  Y: [
    buildStroke(1, 'line', L(0.3, 0.2, 0.5, 0.48), 'down-right', 'Little branch from left', 'فرع أيسر للوسط'),
    buildStroke(2, 'line', L(0.7, 0.2, 0.5, 0.48), 'down-left', 'Little branch from right', 'فرع أيمن للوسط'),
    buildStroke(3, 'line', L(0.5, 0.48, 0.5, 0.75), 'down', 'Trunk straight down', 'جذع مستقيم للأسفل'),
  ],
  Z: [
    buildStroke(1, 'line', L(0.3, 0.2, 0.7, 0.2), 'right', 'Zig across the top', 'خط أفقي في الأعلى'),
    buildStroke(2, 'line', L(0.7, 0.2, 0.3, 0.75), 'down-left', 'Zag diagonal down', 'خط مائل للأسفل'),
    buildStroke(3, 'line', L(0.3, 0.75, 0.7, 0.75), 'right', 'Zig across the bottom', 'خط أفقي في الأسفل'),
  ],
};

const LOWERCASE_STROKES: Record<string, NormalizedStrokeTemplate[]> = {
  a: [
    buildStroke(1, 'loop', P([[0.62, 0.48], [0.46, 0.42], [0.34, 0.56], [0.46, 0.74], [0.62, 0.66]]), 'curve-left', 'Round little belly', 'دائرة صغيرة لطيفة'),
    buildStroke(2, 'line', L(0.62, 0.42, 0.62, 0.75), 'down', 'Short stick down on the right', 'خط قصير للأسفل'),
  ],
  b: [
    buildStroke(1, 'line', L(0.36, 0.2, 0.36, 0.75), 'down', 'Tall stick down', 'خط طويل للأسفل'),
    buildStroke(2, 'curve', P([[0.36, 0.48], [0.64, 0.46], [0.66, 0.62], [0.36, 0.75]]), 'curve-right', 'Round belly to the right', 'بطن دائري لليمين'),
  ],
  c: [
    buildStroke(1, 'curve', P([[0.64, 0.48], [0.46, 0.42], [0.34, 0.58], [0.46, 0.75], [0.64, 0.7]]), 'curve-left', 'Small open curve', 'قوس صغير مفتوح'),
  ],
  d: [
    buildStroke(1, 'curve', P([[0.62, 0.48], [0.34, 0.48], [0.34, 0.7], [0.62, 0.74]]), 'curve-left', 'Round belly to the left', 'بطن دائري لليسار'),
    buildStroke(2, 'line', L(0.62, 0.2, 0.62, 0.75), 'down', 'Tall stick down on the right', 'خط طويل للأسفل'),
  ],
  e: [
    buildStroke(1, 'line', L(0.34, 0.56, 0.66, 0.56), 'right', 'Hit the ball across', 'خط أفقي صغير'),
    buildStroke(2, 'curve', P([[0.66, 0.56], [0.5, 0.42], [0.34, 0.56], [0.48, 0.75], [0.64, 0.7]]), 'curve-left', 'Run around the bases', 'قوس دائري حوله'),
  ],
  f: [
    buildStroke(1, 'curve', P([[0.62, 0.24], [0.48, 0.2], [0.46, 0.38], [0.46, 0.75]]), 'down', 'Candy cane hook and straight down', 'انحنِ من الأعلى وانزل للأسفل'),
    buildStroke(2, 'line', L(0.34, 0.46, 0.6, 0.46), 'right', 'Cross across the middle', 'خط قصير في الوسط'),
  ],
  g: [
    buildStroke(1, 'loop', P([[0.62, 0.48], [0.36, 0.46], [0.36, 0.7], [0.62, 0.72]]), 'curve-left', 'Small circle on the line', 'دائرة صغيرة'),
    buildStroke(2, 'curve', P([[0.62, 0.44], [0.62, 0.82], [0.48, 0.9], [0.36, 0.84]]), 'down-hook', 'Fishhook tail down below', 'انزل بذيل منحني تحت السطر'),
  ],
  h: [
    buildStroke(1, 'line', L(0.36, 0.2, 0.36, 0.75), 'down', 'Tall line down', 'خط طويل للأسفل'),
    buildStroke(2, 'curve', P([[0.36, 0.52], [0.52, 0.44], [0.64, 0.52], [0.64, 0.75]]), 'arch-down', 'Hump over and down', 'قوس صغير ثم للأسفل'),
  ],
  i: [
    buildStroke(1, 'line', L(0.5, 0.44, 0.5, 0.75), 'down', 'Short line down', 'خط قصير للأسفل'),
    buildStroke(2, 'dot', D(0.5, 0.3), 'tap', 'Tap the little dot on top', 'ضع نقطة صغيرة في الأعلى', true),
  ],
  j: [
    buildStroke(1, 'curve', P([[0.54, 0.44], [0.54, 0.82], [0.42, 0.9], [0.34, 0.82]]), 'down-hook', 'Go down and hook left', 'انزل للأسفل وانحنِ لليسار'),
    buildStroke(2, 'dot', D(0.54, 0.3), 'tap', 'Tap the dot on top', 'ضع نقطة في الأعلى', true),
  ],
  k: [
    buildStroke(1, 'line', L(0.36, 0.2, 0.36, 0.75), 'down', 'Tall line down', 'خط طويل للأسفل'),
    buildStroke(2, 'line', L(0.62, 0.44, 0.36, 0.6), 'down-left', 'Small kick in', 'خط مائل للداخل'),
    buildStroke(3, 'line', L(0.42, 0.56, 0.64, 0.75), 'down-right', 'Small kick out', 'خط مائل للخارج'),
  ],
  l: [
    buildStroke(1, 'line', L(0.5, 0.2, 0.5, 0.75), 'down', 'Tall straight line down', 'خط طويل مستقيم للأسفل'),
  ],
  m: [
    buildStroke(1, 'line', L(0.24, 0.44, 0.24, 0.75), 'down', 'Short line down', 'خط قصير للأسفل'),
    buildStroke(2, 'curve', P([[0.24, 0.52], [0.37, 0.44], [0.5, 0.52], [0.5, 0.75]]), 'arch-down', 'First hill over and down', 'التل الأول للأسفل'),
    buildStroke(3, 'curve', P([[0.5, 0.52], [0.63, 0.44], [0.76, 0.52], [0.76, 0.75]]), 'arch-down', 'Second hill over and down', 'التل الثاني للأسفل'),
  ],
  n: [
    buildStroke(1, 'line', L(0.34, 0.44, 0.34, 0.75), 'down', 'Short line down', 'خط قصير للأسفل'),
    buildStroke(2, 'curve', P([[0.34, 0.52], [0.5, 0.44], [0.66, 0.52], [0.66, 0.75]]), 'arch-down', 'One hill over and down', 'تل واحد ثم للأسفل'),
  ],
  o: [
    buildStroke(1, 'loop', P([[0.5, 0.44], [0.34, 0.52], [0.34, 0.68], [0.5, 0.75], [0.66, 0.68], [0.66, 0.52], [0.5, 0.44]]), 'circle', 'Small round circle', 'دائرة صغيرة كاملة'),
  ],
  p: [
    buildStroke(1, 'line', L(0.36, 0.44, 0.36, 0.9), 'down', 'Line down below the floor', 'انزل بخط تحت السطر'),
    buildStroke(2, 'curve', P([[0.36, 0.46], [0.64, 0.46], [0.64, 0.7], [0.36, 0.74]]), 'curve-right', 'Round loop on top right', 'بطن دائري لليمين'),
  ],
  q: [
    buildStroke(1, 'curve', P([[0.62, 0.46], [0.36, 0.46], [0.36, 0.7], [0.62, 0.74]]), 'curve-left', 'Round loop on top left', 'بطن دائري لليسار'),
    buildStroke(2, 'curve', P([[0.62, 0.44], [0.62, 0.88], [0.72, 0.82]]), 'down-hook', 'Line down and flick right', 'انزل تحت السطر وارفعه قليلًا'),
  ],
  r: [
    buildStroke(1, 'line', L(0.38, 0.44, 0.38, 0.75), 'down', 'Short line down', 'خط قصير للأسفل'),
    buildStroke(2, 'curve', Q(0.38, 0.54, 0.5, 0.42, 0.64, 0.48), 'arch-right', 'Little rainbow curve at the top', 'قوس صغير في الأعلى'),
  ],
  s: [
    buildStroke(1, 'curve', P([[0.62, 0.48], [0.46, 0.43], [0.36, 0.52], [0.64, 0.64], [0.48, 0.75], [0.36, 0.7]]), 'snake', 'Small wiggly snake', 'ثعبان صغير متعرج'),
  ],
  t: [
    buildStroke(1, 'curve', P([[0.48, 0.24], [0.48, 0.7], [0.58, 0.75]]), 'down', 'Tall line down with a tiny curve', 'خط طويل للأسفل'),
    buildStroke(2, 'line', L(0.34, 0.44, 0.62, 0.44), 'right', 'Crossbar in the middle', 'خط أفقي قصير'),
  ],
  u: [
    buildStroke(1, 'curve', P([[0.34, 0.44], [0.34, 0.68], [0.5, 0.75], [0.64, 0.66]]), 'cup', 'Small cup down and around', 'كوب صغير للأسفل والأعلى'),
    buildStroke(2, 'line', L(0.64, 0.44, 0.64, 0.75), 'down', 'Short line down on the right', 'خط قصير للأسفل'),
  ],
  v: [
    buildStroke(1, 'line', L(0.34, 0.44, 0.5, 0.75), 'down-right', 'Small slant down', 'خط مائل صغير للأسفل'),
    buildStroke(2, 'line', L(0.5, 0.75, 0.66, 0.44), 'up-right', 'Small slant up', 'خط مائل صغير للأعلى'),
  ],
  w: [
    buildStroke(1, 'line', L(0.24, 0.44, 0.36, 0.75), 'down-right', 'Slant down', 'انزل مائلًا'),
    buildStroke(2, 'line', L(0.36, 0.75, 0.5, 0.52), 'up-right', 'Up to the middle', 'اصعد للوسط'),
    buildStroke(3, 'line', L(0.5, 0.52, 0.64, 0.75), 'down-right', 'Down again', 'انزل مرة أخرى'),
    buildStroke(4, 'line', L(0.64, 0.75, 0.76, 0.44), 'up-right', 'Up to the top', 'اصعد للأعلى'),
  ],
  x: [
    buildStroke(1, 'line', L(0.34, 0.44, 0.66, 0.75), 'down-right', 'Small criss down-right', 'خط مائل لليمين'),
    buildStroke(2, 'line', L(0.66, 0.44, 0.34, 0.75), 'down-left', 'Small cross down-left', 'خط متقاطع لليسار'),
  ],
  y: [
    buildStroke(1, 'line', L(0.34, 0.44, 0.5, 0.72), 'down-right', 'Short slant down', 'خط مائل قصير'),
    buildStroke(2, 'line', L(0.66, 0.44, 0.38, 0.9), 'down-left', 'Long slant down below the line', 'خط مائل طويل تحت السطر'),
  ],
  z: [
    buildStroke(1, 'line', L(0.34, 0.44, 0.66, 0.44), 'right', 'Across the top', 'خط أفقي علوي'),
    buildStroke(2, 'line', L(0.66, 0.44, 0.34, 0.75), 'down-left', 'Slant down-left', 'خط مائل للأسفل'),
    buildStroke(3, 'line', L(0.34, 0.75, 0.66, 0.75), 'right', 'Across the bottom', 'خط أفقي سفلي'),
  ],
};

interface RawEnglishSpec {
  char: string;
  sound: string;
  difficulty: 1 | 2 | 3;
  group: string;
  word: string;
  meaningAr: string;
  emoji: string;
  sentenceEn: string;
  sentenceAr: string;
  word2: string;
  meaningAr2: string;
  emoji2: string;
}

const ENGLISH_SPECS: RawEnglishSpec[] = [
  { char: 'A', sound: '/æ/ as in Apple', difficulty: 1, group: 'diagonal', word: 'Apple', meaningAr: 'تفاحة', emoji: '🍎', sentenceEn: 'A red apple.', sentenceAr: 'تفاحة حمراء.', word2: 'Ant', meaningAr2: 'نملة', emoji2: '🐜' },
  { char: 'B', sound: '/b/ as in Ball', difficulty: 1, group: 'stem-loop', word: 'Ball', meaningAr: 'كرة', emoji: '⚽', sentenceEn: 'Bounce the ball.', sentenceAr: 'نطط الكرة.', word2: 'Bear', meaningAr2: 'دب', emoji2: '🐻' },
  { char: 'C', sound: '/k/ as in Cat', difficulty: 1, group: 'round', word: 'Cat', meaningAr: 'قطة', emoji: '🐱', sentenceEn: 'A cute cat.', sentenceAr: 'قطة لطيفة.', word2: 'Car', meaningAr2: 'سيارة', emoji2: '🚗' },
  { char: 'D', sound: '/d/ as in Duck', difficulty: 1, group: 'stem-loop', word: 'Duck', meaningAr: 'بطة', emoji: '🦆', sentenceEn: 'The duck swims.', sentenceAr: 'البطة تسبح.', word2: 'Dog', meaningAr2: 'كلب', emoji2: '🐶' },
  { char: 'E', sound: '/ɛ/ as in Elephant', difficulty: 1, group: 'straight', word: 'Egg', meaningAr: 'بيضة', emoji: '🥚', sentenceEn: 'A warm egg.', sentenceAr: 'بيضة دافئة.', word2: 'Elephant', meaningAr2: 'فيل', emoji2: '🐘' },
  { char: 'F', sound: '/f/ as in Fish', difficulty: 1, group: 'straight', word: 'Fish', meaningAr: 'سمكة', emoji: '🐟', sentenceEn: 'A fast fish.', sentenceAr: 'سمكة سريعة.', word2: 'Frog', meaningAr2: 'ضفدع', emoji2: '🐸' },
  { char: 'G', sound: '/ɡ/ as in Goat', difficulty: 2, group: 'round', word: 'Goat', meaningAr: 'ماعز', emoji: '🐐', sentenceEn: 'A happy goat.', sentenceAr: 'ماعز سعيد.', word2: 'Grapes', meaningAr2: 'عنب', emoji2: '🍇' },
  { char: 'H', sound: '/h/ as in Hat', difficulty: 1, group: 'straight', word: 'Hat', meaningAr: 'قبعة', emoji: '🎩', sentenceEn: 'Put on a hat.', sentenceAr: 'ارتدِ قبعة.', word2: 'Horse', meaningAr2: 'حصان', emoji2: '🐴' },
  { char: 'I', sound: '/ɪ/ as in Igloo', difficulty: 1, group: 'straight', word: 'Ice', meaningAr: 'ثلج', emoji: '🧊', sentenceEn: 'Cold ice cube.', sentenceAr: 'مكعب ثلج بارد.', word2: 'Island', meaningAr2: 'جزيرة', emoji2: '🏝️' },
  { char: 'J', sound: '/dʒ/ as in Juice', difficulty: 2, group: 'hook', word: 'Jam', meaningAr: 'مربى', emoji: '🍓', sentenceEn: 'Sweet berry jam.', sentenceAr: 'مربى التوت الحلو.', word2: 'Juice', meaningAr2: 'عصير', emoji2: '🧃' },
  { char: 'K', sound: '/k/ as in Kite', difficulty: 2, group: 'diagonal', word: 'Kite', meaningAr: 'طائرة ورقية', emoji: '🪁', sentenceEn: 'Fly a kite high.', sentenceAr: 'طيّر الطائرة الورقية عاليًا.', word2: 'Key', meaningAr2: 'مفتاح', emoji2: '🔑' },
  { char: 'L', sound: '/l/ as in Lion', difficulty: 1, group: 'straight', word: 'Lion', meaningAr: 'أسد', emoji: '🦁', sentenceEn: 'A brave lion.', sentenceAr: 'أسد شجاع.', word2: 'Leaf', meaningAr2: 'ورقة شجر', emoji2: '🍃' },
  { char: 'M', sound: '/m/ as in Moon', difficulty: 2, group: 'multi-line', word: 'Moon', meaningAr: 'قمر', emoji: '🌙', sentenceEn: 'Bright yellow moon.', sentenceAr: 'قمر أصفر مضيء.', word2: 'Monkey', meaningAr2: 'قرد', emoji2: '🐵' },
  { char: 'N', sound: '/n/ as in Nest', difficulty: 2, group: 'multi-line', word: 'Nest', meaningAr: 'عش', emoji: '🪺', sentenceEn: 'A bird nest.', sentenceAr: 'عش عصفور.', word2: 'Nut', meaningAr2: 'جوزة', emoji2: '🥜' },
  { char: 'O', sound: '/ɒ/ as in Owl', difficulty: 1, group: 'round', word: 'Owl', meaningAr: 'بومة', emoji: '🦉', sentenceEn: 'A wise owl.', sentenceAr: 'بومة حكيمة.', word2: 'Orange', meaningAr2: 'برتقالة', emoji2: '🍊' },
  { char: 'P', sound: '/p/ as in Penguin', difficulty: 1, group: 'stem-loop', word: 'Pen', meaningAr: 'قلم', emoji: '🖊️', sentenceEn: 'Write with a pen.', sentenceAr: 'اكتب بالقلم.', word2: 'Panda', meaningAr2: 'باندا', emoji2: '🐼' },
  { char: 'Q', sound: '/kw/ as in Queen', difficulty: 3, group: 'round', word: 'Queen', meaningAr: 'ملكة', emoji: '👑', sentenceEn: 'A kind queen.', sentenceAr: 'ملكة طيبة.', word2: 'Quilt', meaningAr2: 'لحاف', emoji2: '🛏️' },
  { char: 'R', sound: '/r/ as in Rabbit', difficulty: 2, group: 'stem-loop', word: 'Rain', meaningAr: 'مطر', emoji: '🌧️', sentenceEn: 'Soft rain falls.', sentenceAr: 'ينزل المطر اللطيف.', word2: 'Rabbit', meaningAr2: 'أرنب', emoji2: '🐰' },
  { char: 'S', sound: '/s/ as in Sun', difficulty: 2, group: 'curved', word: 'Sun', meaningAr: 'شمس', emoji: '☀️', sentenceEn: 'The warm sun shines.', sentenceAr: 'الشمس الدافئة تشرق.', word2: 'Star', meaningAr2: 'نجمة', emoji2: '⭐' },
  { char: 'T', sound: '/t/ as in Tree', difficulty: 1, group: 'straight', word: 'Tree', meaningAr: 'شجرة', emoji: '🌳', sentenceEn: 'A tall green tree.', sentenceAr: 'شجرة خضراء طويلة.', word2: 'Train', meaningAr2: 'قطار', emoji2: '🚂' },
  { char: 'U', sound: '/ʌ/ as in Umbrella', difficulty: 1, group: 'cup', word: 'Up', meaningAr: 'أعلى', emoji: '🎈', sentenceEn: 'Look up at balloons.', sentenceAr: 'انظر للأعلى نحو البالونات.', word2: 'Umbrella', meaningAr2: 'مظلة', emoji2: '☂️' },
  { char: 'V', sound: '/v/ as in Van', difficulty: 2, group: 'diagonal', word: 'Van', meaningAr: 'حافلة صغيرة', emoji: '🚐', sentenceEn: 'A blue van.', sentenceAr: 'حافلة صغيرة زرقاء.', word2: 'Violin', meaningAr2: 'كمان', emoji2: '🎻' },
  { char: 'W', sound: '/w/ as in Whale', difficulty: 3, group: 'multi-line', word: 'Web', meaningAr: 'شبكة', emoji: '🕸️', sentenceEn: 'A spider web.', sentenceAr: 'شبكة عنكبوت.', word2: 'Whale', meaningAr2: 'حوت', emoji2: '🐳' },
  { char: 'X', sound: '/ks/ as in Box', difficulty: 2, group: 'diagonal', word: 'Box', meaningAr: 'صندوق', emoji: '📦', sentenceEn: 'Open the toy box.', sentenceAr: 'افتح صندوق الألعاب.', word2: 'Xylophone', meaningAr2: 'إكسيلوفون', emoji2: '🎼' },
  { char: 'Y', sound: '/j/ as in Yo-yo', difficulty: 2, group: 'diagonal', word: 'Yak', meaningAr: 'ثور التبت', emoji: '🦬', sentenceEn: 'A furry yak.', sentenceAr: 'ياك ذو فراء.', word2: 'Yo-yo', meaningAr2: 'يويو', emoji2: '🪀' },
  { char: 'Z', sound: '/z/ as in Zebra', difficulty: 2, group: 'diagonal', word: 'Zoo', meaningAr: 'حديقة حيوان', emoji: '🦓', sentenceEn: 'Visit the zoo.', sentenceAr: 'زيارة حديقة الحيوان.', word2: 'Zebra', meaningAr2: 'حمار وحشي', emoji2: '🦓' },
];

export const ENGLISH_LETTERS: CurriculumLetter[] = ENGLISH_SPECS.map((spec, idx) => {
  const upper = spec.char;
  const lower = spec.char.toLowerCase();
  return {
    id: `en_${upper}`,
    language: 'en',
    orderIndex: idx + 1,
    character: upper,
    lowercaseCharacter: lower,
    nameEn: `Letter ${upper}`,
    nameAr: `حرف ${upper}`,
    soundLabel: spec.sound,
    ttsPrompt: `${upper}. ${upper} is for ${spec.word}.`,
    pronunciationAsset: `en_${upper}`,
    difficultyLevel: spec.difficulty,
    visualGroup: spec.group,
    example: {
      id: `word_en_${upper}_1`,
      word: spec.word,
      meaningEn: spec.word,
      meaningAr: spec.meaningAr,
      emoji: spec.emoji,
      illustrationKey: spec.word.toLowerCase(),
      letters: spec.word.toUpperCase().split(''),
      sentenceEn: spec.sentenceEn,
      sentenceAr: spec.sentenceAr,
    },
    secondaryExample: {
      id: `word_en_${upper}_2`,
      word: spec.word2,
      meaningEn: spec.word2,
      meaningAr: spec.meaningAr2,
      emoji: spec.emoji2,
      illustrationKey: spec.word2.toLowerCase(),
      letters: spec.word2.toUpperCase().split(''),
    },
    strokeTemplates: {
      uppercase: UPPERCASE_STROKES[upper],
      lowercase: LOWERCASE_STROKES[lower],
    },
  };
});
