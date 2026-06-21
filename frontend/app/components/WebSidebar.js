import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PawMark from './PawMark';
import { colors, radius, spacing, typography } from '../theme/tokens';

const NAV_ITEMS = [
  { key: 'home',      label: 'Ana Sayfa',   icon: 'home-outline',          iconActive: 'home' },
  { key: 'profile',   label: 'Profil',       icon: 'person-outline',        iconActive: 'person' },
  { key: 'reminders', label: 'Hatırlatıcı',  icon: 'notifications-outline', iconActive: 'notifications' },
  { key: 'analyze',   label: 'Ses Analizi',  icon: 'mic-outline',           iconActive: 'mic' },
  { key: 'chat',      label: 'AI Chat',      icon: 'chatbubble-outline',    iconActive: 'chatbubble' },
];

export default function WebSidebar({ activeTab, onTabChange, userName, onLogout }) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.logoArea}>
        <PawMark size={32} />
        <Text style={styles.appName}>Pati</Text>
      </View>

      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => onTabChange(item.key)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={isActive ? item.iconActive : item.icon}
                size={20}
                color={isActive ? colors.textOnPrimary : colors.textMuted}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.userArea}>
        <View style={styles.userRow}>
          <View style={styles.userAvatar}>
            <Ionicons name="person" size={15} color={colors.textOnPrimary} />
          </View>
          <Text style={styles.userName} numberOfLines={1}>{userName || 'Kullanıcı'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.75}>
          <Ionicons name="log-out-outline" size={16} color={colors.textMuted} />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: colors.textPrimary,
    flexDirection: 'column',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  appName: {
    ...typography.title,
    color: colors.textOnPrimary,
  },
  nav: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    gap: spacing.md,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: colors.primary,
  },
  navLabel: {
    ...typography.bodyStrong,
    color: colors.textMuted,
  },
  navLabelActive: {
    color: colors.textOnPrimary,
  },
  userArea: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: spacing.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    ...typography.bodyStrong,
    color: colors.textOnPrimary,
    flex: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  logoutText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
