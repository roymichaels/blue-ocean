import React from 'react';
import { Modal, TouchableOpacity, View, StyleSheet } from 'react-native';
import Text from '@/shared/ui/Text';
import { spacing, radius } from '@/shared/ui/tokens';
import { useTheme } from '../../contexts/ThemeContext';

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
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => onOpenChange(false)}
      >
        <TouchableOpacity style={styles.overlay} onPress={() => onOpenChange(false)}>
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
        </TouchableOpacity>
      </Modal>
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
