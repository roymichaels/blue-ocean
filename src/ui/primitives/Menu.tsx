import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Portal from './Portal';
import Text from './Text';
import { useTheme } from '../ThemeProvider';
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

  return (
    <>
      {trigger}
      {open && (
        <Portal>
          <TouchableOpacity style={styles.overlay} onPress={() => onOpenChange(false)}>
            <View
              style={[
                styles.menu,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
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
                          ? colors.status.error
                          : colors.text.primary,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
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

