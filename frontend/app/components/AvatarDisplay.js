import { Image, StyleSheet, Text, View } from 'react-native';
import { BACKEND_BASE_URL } from '../lib/api';
import { colors, radius } from '../theme/tokens';

export default function AvatarDisplay({ avatarType, avatarValue, petName, size = 60, style }) {
  const letter = (petName || '?').charAt(0).toUpperCase();
  const circleStyle = { width: size, height: size, borderRadius: size / 2 };

  if (avatarType === 'photo' && avatarValue) {
    const uri = avatarValue.startsWith('/static')
      ? `${BACKEND_BASE_URL}${avatarValue}`
      : avatarValue;
    return (
      <Image
        source={{ uri }}
        style={[styles.base, circleStyle, style]}
        resizeMode="cover"
      />
    );
  }

  if (avatarType === 'icon' && avatarValue) {
    return (
      <View style={[styles.base, styles.iconBg, circleStyle, style]}>
        <Text style={{ fontSize: size * 0.52, lineHeight: size * 0.7 }}>{avatarValue}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.base, styles.letterBg, circleStyle, style]}>
      <Text style={[styles.letter, { fontSize: size * 0.4 }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconBg: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  letterBg: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  letter: {
    fontWeight: '800',
    color: colors.primaryDark,
  },
});
