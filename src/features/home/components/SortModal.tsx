import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X as XIcon } from 'lucide-react-native';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';
import { SortOption } from '@/features/home/hooks/useHomeFilters';
import { isReviewsEnabled } from '@/config/featureFlags';

interface SortModalProps {
  visible: boolean;
  sortBy: SortOption;
  onSelect: (option: SortOption) => void;
  onClose: () => void;
}

export default function SortModal({
  visible,
  sortBy,
  onSelect,
  onClose,
}: SortModalProps) {
  const { t } = useLanguage();
  const { colors: themeColors } = useTheme();
  const CloseIcon: any = (XIcon as any) || ((_: any) => null);

  const reviewsEnabled = isReviewsEnabled();
  const options = [
    { key: 'newest', label: t('home.newest') },
    { key: 'price-low', label: t('home.priceLowHigh') },
    { key: 'price-high', label: t('home.priceHighLow') },
    { key: 'rating', label: t('home.highRating') },
  ].filter((option) => reviewsEnabled || option.key !== 'rating');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          { backgroundColor: themeColors.background + '80' },
        ]}
      >
        <View
          style={[
            styles.content,
            {
              backgroundColor: themeColors.surface.elevated,
              borderColor: themeColors.border.primary,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeColors.text.primary }]}>
              {t('home.sortProducts')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <CloseIcon size={24} color={themeColors.text.primary} />
            </TouchableOpacity>
          </View>

          {options.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.option,
                { borderBottomColor: themeColors.border.secondary },
                sortBy === option.key && [
                  styles.selectedOption,
                  { backgroundColor: themeColors.interactive.secondary },
                ],
              ]}
              onPress={() => {
                onSelect(option.key as SortOption);
                onClose();
              }}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: themeColors.text.primary },
                  sortBy === option.key && { color: themeColors.gold },
                ]}
              >
                {option.label}
              </Text>
              {sortBy === option.key && (
                <View
                  style={[
                    styles.selectedDot,
                    { backgroundColor: themeColors.gold },
                  ]}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  selectedOption: {
    borderRadius: 12,
  },
  optionText: {
    fontSize: 16,
    textAlign: 'right',
  },
  selectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
