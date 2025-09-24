import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { Card } from '@/ui';

interface Props {
  colors: any;
}

const NotificationSettings: React.FC<Props> = ({ colors }) => {
  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.primary,
          opacity: 0.7,
        },
      ]}
    >
      <View style={styles.header}>
        <Bell size={20} color={colors.gold} />
        <Text style={[styles.title, { color: colors.text.primary }]}>הגדרות התראות</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.description, { color: colors.text.secondary }]}>הגדרות התראות מערכת ודחיפה</Text>
        <View style={[styles.badge, { backgroundColor: colors.gold }]}>
          <Text style={[styles.badgeText, { color: colors.text.inverse }]}>בקרוב</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    justifyContent: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'right',
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default NotificationSettings;
