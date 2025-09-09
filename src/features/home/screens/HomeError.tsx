import React, { Suspense } from 'react';
import { RefreshControl } from 'react-native';
import { Info } from 'lucide-react-native';
import EmptyState from '@/shared/ui/EmptyState';
import { Spinner } from '@/ui/primitives';
import InfoModal from '@/components/InfoModal';
import { CartModal } from '@/features/cart';
import { ScrollArea } from '@/ui/layout';
import { useLanguage, useTheme } from '@/ui/ThemeProvider';

type Props = {
  refreshing: boolean;
  refresh: () => void;
  handleReload: () => void;
  infoModal: any;
  showCartModal: boolean;
  closeCartModal: () => void;
};

export default function HomeError({
  refreshing,
  refresh,
  handleReload,
  infoModal,
  showCartModal,
  closeCartModal,
}: Props) {
  const { t } = useLanguage();
  const { colors: themeColors } = useTheme();

  return (
    <>
      <ScrollArea
        testID="home-root"
        backgroundColor={themeColors.canvas}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <EmptyState
          icon={Info}
          title={t('common.error')}
          message={t('home.loadErrorMessage')}
          actionText={t('common.reload')}
          onAction={handleReload}
        />
      </ScrollArea>
      <Suspense fallback={<Spinner />}>
        <InfoModal
          visible={infoModal.visible}
          title={infoModal.title}
          message={infoModal.message}
          type={infoModal.type}
          buttonText={infoModal.buttonText}
          onClose={handleReload}
          autoClose={false}
        />
      </Suspense>
      <Suspense fallback={<Spinner />}>
        <CartModal visible={showCartModal} onClose={closeCartModal} />
      </Suspense>
    </>
  );
}
