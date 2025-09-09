import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { HeroBanner, Product } from '@/types';
import { useLanguage } from '@/ui/ThemeProvider';

export function useHomeModals(error?: Error | null) {
  const params = useLocalSearchParams<{ showCart?: string }>();
  const { t } = useLanguage();

  const [bannerFormVisible, setBannerFormVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const openBannerForm = useCallback((banner?: HeroBanner) => {
    setEditingBanner(banner ?? null);
    setBannerFormVisible(true);
  }, []);
  const closeBannerForm = useCallback(() => setBannerFormVisible(false), []);

  const [productFormVisible, setProductFormVisible] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const openProductForm = useCallback((product?: Product) => {
    setProductToEdit(product ?? null);
    setProductFormVisible(true);
  }, []);
  const closeProductForm = useCallback(() => setProductFormVisible(false), []);

  const [showCartModal, setShowCartModal] = useState(false);
  const closeCartModal = useCallback(() => setShowCartModal(false), []);

  const [storeCreationVisible, setStoreCreationVisible] = useState(false);
  const openStoreCreation = useCallback(() => setStoreCreationVisible(true), []);
  const closeStoreCreation = useCallback(() => setStoreCreationVisible(false), []);

  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
    buttonText: undefined as string | undefined,
  });
  const closeInfoModal = useCallback(
    () => setInfoModal((prev) => ({ ...prev, visible: false })),
    [],
  );

  useEffect(() => {
    if (params.showCart === 'true') {
      setShowCartModal(true);
    }
  }, [params.showCart]);

  useEffect(() => {
    if (error) {
      setInfoModal({
        visible: true,
        title: t('common.error'),
        message: t('home.loadErrorMessage'),
        type: 'error',
        buttonText: t('common.reload'),
      });
    }
  }, [error, t]);

  return {
    bannerFormVisible,
    editingBanner,
    openBannerForm,
    closeBannerForm,
    productFormVisible,
    productToEdit,
    openProductForm,
    closeProductForm,
    showCartModal,
    closeCartModal,
    storeCreationVisible,
    openStoreCreation,
    closeStoreCreation,
    infoModal,
    closeInfoModal,
  } as const;
}

export type UseHomeModalsReturn = ReturnType<typeof useHomeModals>;
