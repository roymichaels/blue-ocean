import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import Portal from './Portal';
import Text from './Text';
import { useTheme, useLanguage } from '../ThemeProvider';
import { spacing, radius } from '../tokens';

export interface MenuItem {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
}

interface MenuProps {
  trigger: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MenuItem[];
}

export default function Menu({ trigger, open, onOpenChange, items }: MenuProps) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const menuRef = useRef<View>(null);

  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === `Escape`) onOpenChange(false);
    };

    const handleFocus = (e: FocusEvent) => {
      const element = menuRef.current as any;
      if (element && !element.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocus);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocus);
    };
  }, [open, onOpenChange]);

  return (
    <>
      {trigger}
      {open && (
        <Portal>
            <Pressable
              style={[
                styles.overlay,
                isRTL
                  ? { alignItems: 'flex-start', paddingLeft: 16, paddingRight: 0 }
                  : { alignItems: 'flex-end', paddingRight: 16, paddingLeft: 0 },
              ]}
              onPress={() => onOpenChange(false)}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              hitSlop={8}
            >
            <View
              ref={menuRef}
              style={[
                styles.menu,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                },
                isRTL ? { alignSelf: 'flex-start' } : { alignSelf: 'flex-end' },
              ]}
            >
              {items.map((item, index) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="menuitem"
                  accessibilityLabel={item.label}
                  hitSlop={8}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(null)}
                  style={[
                    styles.item,
                    isRTL ? { flexDirection: 'row-reverse' } : null,
                    focusedIndex === index && {
                      borderColor: colors.border.focus,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => {
                    onOpenChange(false);
                    item.onPress();
                  }}
                >
                  {item.icon}
                  <Text
                    style={[
                      styles.label,
                      {
                        color: item.destructive
                          ? colors.status.error
                          : colors.text.primary,
                      },
                      isRTL ? { marginRight: spacing.spacer12, marginLeft: 0 } : null,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Portal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingRight: 16,
    minHeight: 44,
    minWidth: 44,
  },
  menu: {
    borderWidth: 1,
    borderRadius: radius.md,
    minWidth: 200,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.spacer12,
    paddingHorizontal: spacing.spacer16,
    minHeight: 44,
    minWidth: 44,
  },
  label: {
    marginLeft: spacing.spacer12,
  },
});

