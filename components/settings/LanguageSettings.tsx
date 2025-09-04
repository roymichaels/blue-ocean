import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Globe } from 'lucide-react-native';
import Card from '@/ui/primitives/Card';

interface Props {
  colors: any;
  currentLanguage: string;
}

const LanguageSettings: React.FC<Props> = ({ colors, currentLanguage }) => {
  return (
    <Card
      style={[
        styles.card,
        { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
      ]}
    >
      <View style={styles.header}>
        <Globe size={20} color={colors.gold} />
        <Text style={[styles.title, { color: colors.text.primary }]}>הגדרות שפה</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.description, { color: colors.text.secondary }]}>ניתן לשנות את שפת האפליקציה מתפריט הפרופיל</Text>
        <View style={[styles.infoBox, { backgroundColor: colors.interactive.secondary }]}>
          <Text style={[styles.infoText, { color: colors.text.primary }]}>שפה נוכחית: {currentLanguage === 'he' ? 'עברית' : 'English'}</Text>
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
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'right',
  },
  infoBox: {
    borderRadius: 8,
    padding: 12,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default LanguageSettings;
