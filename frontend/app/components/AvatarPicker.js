import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';
import AvatarDisplay from './AvatarDisplay';

const EMOJI_ICONS = [
  '🐱', '🐶', '🐰', '🐹', '🐼', '🦊',
  '🐻', '🦁', '🐯', '🐧', '🐠', '🦜',
  '🐸', '🐭', '🦔', '🐣',
];

export default function AvatarPicker({ avatarType, avatarValue, petName, onSelectIcon, onSelectPhoto }) {
  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin gerekli', 'Galeriye erişim izni gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      onSelectPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin gerekli', 'Kamera izni gerekiyor.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      onSelectPhoto(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionLabel}>Avatar</Text>

      <View style={styles.previewRow}>
        <AvatarDisplay
          avatarType={avatarType}
          avatarValue={avatarValue}
          petName={petName}
          size={72}
          style={styles.preview}
        />
        <View style={styles.photoButtons}>
          <TouchableOpacity style={styles.photoBtn} onPress={takePhoto} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.photoBtnText}>Fotoğraf çek</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={pickFromGallery} activeOpacity={0.8}>
            <Ionicons name="image-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.photoBtnText}>Galeriden seç</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.orLabel}>— veya bir ikon seç —</Text>

      <View style={styles.grid}>
        {EMOJI_ICONS.map((emoji) => {
          const active = avatarType === 'icon' && avatarValue === emoji;
          return (
            <TouchableOpacity
              key={emoji}
              style={[styles.emojiCell, active && styles.emojiCellActive]}
              onPress={() => onSelectIcon(emoji)}
              activeOpacity={0.75}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: spacing.md },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  preview: {
    borderWidth: 3,
    borderColor: colors.primaryLight,
  },
  photoButtons: { flex: 1, gap: spacing.sm },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  photoBtnText: { ...typography.caption, color: colors.primaryDark },
  orLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  emojiCell: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiCellActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSoft,
  },
  emoji: { fontSize: 22 },
});
