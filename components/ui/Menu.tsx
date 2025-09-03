import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text from '@/shared/ui/Text';
import { spacing, radius } from '@/shared/ui/tokens';
import { useTheme } from '../../contexts/ThemeContext';
import { Portal, Overlay } from '@/ui/primitives';

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
  const { getColor } = useTheme();

  return (
    <>
      {trigger}
      {open && (
        <Portal>
          <Overlay />
          <View style={styles.overlay} pointerEvents="box-none">
            <View
              style={[
                styles.menu,
                {
                  backgroundColor: getColor('background.secondary'),
                  borderColor: getColor('border.primary'),
                },
              ]}
            >
              {items.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.item}
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
                          ? getColor('status.error')
                          : getColor('text.primary'),
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Portal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
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
  },
  label: {
    marginLeft: spacing.spacer12,
  },
});
