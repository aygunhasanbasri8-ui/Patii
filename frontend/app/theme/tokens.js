// theme/tokens.js
// Pati uygulamasının tek doğruluk kaynağı (single source of truth) tema
// token sistemi. Tüm renk/spacing/typography kararları buradan türetilir.

export const colors = {
  // Marka — sıcak turuncu aile
  primary: '#FF8C42',
  primaryDark: '#E8722B',
  primaryLight: '#FFB67A',

  // Yüzeyler
  background: '#FFF8F0',
  surface: '#FFFFFF',
  surfaceSoft: '#FFEDDB',
  surfaceMuted: '#FFF1E2',

  // Metin
  textPrimary: '#3A2B22',
  textSecondary: '#9C8270',
  textOnPrimary: '#FFFFFF',
  textMuted: '#C2A992',

  // Durum
  success: '#6FA988',
  successSoft: '#E6F2EC',
  danger: '#E76F51',
  dangerSoft: '#FBE9E4',
  info: '#5B8DB8',
  infoSoft: '#E8F1F8',

  // Yardımcı
  border: '#F0DFCB',
  divider: '#F4E8D8',
  overlay: 'rgba(58, 43, 34, 0.45)',
  shadow: '#C77B3C',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
  circle: 9999,
};

export const typography = {
  display: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.2 },
  subtitle: { fontSize: 15, fontWeight: '600' },
  body: { fontSize: 14, fontWeight: '400' },
  bodyStrong: { fontSize: 14, fontWeight: '700' },
  caption: { fontSize: 12, fontWeight: '600' },
  button: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
};

export const shadow = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  floating: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
};
