import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { colors, shadow } from '../theme/tokens';

export default function PawMark({ size = 64, iconRatio = 0.5 }) {
  const iconSize = Math.round(size * iconRatio);
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Ionicons name="paw" size={iconSize} color={colors.textOnPrimary} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.floating,
  },
});
