export const COLORS = {
  // Playful cartoon adventure pastel palette with high-contrast text
  background: '#FFFDF7',
  surface: '#FFFFFF',
  surfaceSoft: '#F6F9FF',
  surfaceWarm: '#FFF6E8',
  surfaceMint: '#EEFBF5',
  surfaceLavender: '#F6F0FF',
  surfaceCoral: '#FFF0ED',

  // Primary Brand Accents
  skyBlue: '#3898EC',
  skyBlueDark: '#1E6FB8',
  skyBlueLight: '#D8EEFF',

  sunshineYellow: '#FFB800',
  sunshineYellowDark: '#C98A00',
  sunshineYellowLight: '#FFF2C6',

  mintGreen: '#2EC486',
  mintGreenDark: '#1B8F5E',
  mintGreenLight: '#D5F7E8',

  coralOrange: '#FF6B4A',
  coralOrangeDark: '#D1492B',
  coralOrangeLight: '#FFE1DA',

  lavenderPurple: '#8B6CEF',
  lavenderPurpleDark: '#5E3FD1',
  lavenderPurpleLight: '#EAE2FF',

  // Language World Accents
  englishWorld: '#3898EC',
  englishWorldBg: '#EAF5FF',
  arabicWorld: '#2EC486',
  arabicWorldBg: '#E9FBF3',

  // High-contrast readable text
  textPrimary: '#1E293B',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textOnDark: '#FFFFFF',

  // Borders & Canvas
  borderLight: '#E2E8F0',
  borderCard: '#CBD5E1',
  canvasBackground: '#FFFFFF',
  canvasBaseline: '#CBD5E1',
  canvasMidline: '#E2E8F0',
  canvasGuideStroke: '#94A3B8',
  canvasActiveStroke: '#3898EC',
  canvasDotStroke: '#FF6B4A',
  canvasSuccessStroke: '#2EC486',
} as const;

export const SPACING = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44,
} as const;

export const RADIUS = {
  sm: 12,
  md: 20,
  lg: 28,
  xl: 36,
  pill: 999,
} as const;

export const TOUCH_TARGETS = {
  minChildButtonHeight: 72,
  largeTabletButtonHeight: 76,
  minIconHitSlop: 16,
} as const;

export const SHADOWS = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  button: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
} as const;
