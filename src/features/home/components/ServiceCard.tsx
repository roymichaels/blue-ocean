import React from 'react';
import { AccessibilityRole } from 'react-native';
import { useTheme } from '@/ui/ThemeProvider';
import PromoCard from './PromoCard';

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
  backgroundColor?: string;
  testID?: string;
  accessibilityRole?: AccessibilityRole;
}

export default function ServiceCard({
  icon,
  title,
  onPress,
  backgroundColor,
  testID,
  accessibilityRole,
}: ServiceCardProps) {
  const { colors } = useTheme();

  return (
    <PromoCard
      backgroundColor={backgroundColor ?? colors.surface.primary}
      icon={icon}
      title={title}
      onPress={onPress}
      testID={testID}
      accessibilityRole={accessibilityRole}
    />
  );
}

