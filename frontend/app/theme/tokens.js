export const colors = {
  primary: '#FF8C42',
  primaryDark: '#E8722B',
  primaryLight: '#FFB67A',
  primaryXLight: '#FFF5EC',

  background: '#FFF8F0',
  surface: '#FFFFFF',
  surfaceSoft: '#FFEDDB',
  surfaceMuted: '#FFF1E2',
  surfaceElevated: '#FFFCF8',

  textPrimary: '#3A2B22',
  textSecondary: '#9C8270',
  textOnPrimary: '#FFFFFF',
  textMuted: '#C2A992',

  success: '#6FA988',
  successDark: '#4D8A6A',
  successSoft: '#E6F2EC',
  danger: '#E76F51',
  dangerDark: '#C55A3D',
  dangerSoft: '#FBE9E4',
  info: '#5B8DB8',
  infoDark: '#3A6D9A',
  infoSoft: '#E8F1F8',
  warning: '#F4A261',
  warningSoft: '#FDF0E4',

  border: '#F0DFCB',
  borderFocus: '#FF8C42',
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
  subtle: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 3,
  },
  medium: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 5,
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
