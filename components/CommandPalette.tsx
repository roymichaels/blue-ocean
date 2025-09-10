import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, Pressable } from 'react-native';
import { Text, Portal, Overlay } from '@/ui';
import { useTheme } from '@/ui/ThemeProvider';
import { useLanguage } from '@/ui/ThemeProvider';
import { useAppInfo } from '../contexts/AppInfoContext';
import { useAppRouter } from '@/services';
import { useProducts } from '@/services/useProducts';
import { spacing, radius, typography } from '@/ui/tokens';
import { useOrders } from '@/services/useOrders';

interface CommandPaletteProps {
  visible: boolean;
  onClose: () => void;
}

interface PaletteItem {
  label: string;
  action: () => void;
  section: string;
}

export default function CommandPalette({ visible, onClose }: CommandPaletteProps) {
  const { colors } = useTheme();
  const { t, isRTL } = useLanguage();
  const { tenantId } = useAppInfo();
  const { push } = useAppRouter();
  const { data: products = [] } = useProducts(tenantId);
  const { data: orders = [] } = useOrders(tenantId);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(id);
  }, [query]);

  const sections = useMemo(() => {
    const q = debounced.toLowerCase();
    const nav: PaletteItem[] = [
      { label: t('navigation.home'), action: () => push('/') , section: t('commandPalette.navigate', 'Navigate') },
    ].filter((i) => i.label.toLowerCase().includes(q));
    const prod: PaletteItem[] = products
      .filter((p) => p.name.toLowerCase().includes(q))
      .map((p) => ({
        label: p.name,
        action: () => push(`/store/${p.storeId}`),
        section: t('commandPalette.products', 'Products'),
      }));
    const ord: PaletteItem[] = orders
      .filter((o) => o.id.toLowerCase().includes(q))
      .map((o) => ({
        label: o.id,
        action: () => push(`/orders/${o.id}`),
        section: t('commandPalette.orders', 'Orders'),
      }));
    const actions: PaletteItem[] = [
      { label: t('notifications.notifications'), action: () => push('/notifications'), section: t('commandPalette.actions', 'Actions') },
    ].filter((i) => i.label.toLowerCase().includes(q));
    const flat = [...nav, ...prod, ...ord, ...actions];
    const grouped: Record<string, PaletteItem[]> = {};
    flat.forEach((item) => {
      if (!grouped[item.section]) grouped[item.section] = [];
      grouped[item.section].push(item);
    });
    return { flat, grouped };
  }, [debounced, products, orders, push, t]);

  useEffect(() => setActive(0), [sections]);

  const handleKeyDown = (e: any) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, sections.flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      sections.flat[active]?.action();
      onClose();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!visible) return null;

  return (
    <Portal>
      <Overlay style={[styles.overlay, { backgroundColor: colors.canvas }]} />
      <View style={[styles.center, { pointerEvents: 'box-none' }]}>
        <View style={[styles.container, { backgroundColor: colors.surface.elevated }]}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            onKeyDown={handleKeyDown}
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor={colors.text.tertiary}
            style={[
              styles.input,
              { color: colors.text.primary, textAlign: isRTL ? 'right' : 'left' },
            ]}
          />
          <View style={styles.results}>
            {Object.entries(sections.grouped).map(([title, items]) => (
              <View key={title} style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
                  {title}
                </Text>
                {items.map((item, idx) => {
                  const index = sections.flat.indexOf(item);
                  const selected = index === active;
                  return (
                    <Pressable
                      key={item.label}
                      onPress={() => {
                        item.action();
                        onClose();
                      }}
                      style={[
                        styles.item,
                        selected && { backgroundColor: colors.surface.primary },
                      ]}
                    >
                      <Text style={[styles.itemText, { color: colors.text.primary }]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spacer20,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    borderRadius: radius.xl,
    padding: spacing.spacer16,
  },
  input: {
    ...typography.md,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.spacer8,
    marginBottom: spacing.spacer12,
  },
  results: {
    maxHeight: 300,
  },
  section: {
    marginBottom: spacing.spacer12,
  },
  sectionTitle: {
    ...typography.sm,
    marginBottom: spacing.spacer4,
  },
  item: {
    paddingVertical: spacing.spacer8,
    paddingHorizontal: spacing.spacer8,
    borderRadius: radius.sm,
  },
  itemText: {
    ...typography.md,
  },
});
