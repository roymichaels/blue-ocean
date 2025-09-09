import BannerArea from '@/features/home/components/BannerArea';
import { HeroBanner } from '@/types';

interface Props {
  banners: HeroBanner[];
  isStoreOwner: boolean;
  loading: boolean;
  onAddBanner: () => void;
  onEditBanner: (banner: HeroBanner) => void;
}

export default function HomeBanners({
  banners,
  isStoreOwner,
  loading,
  onAddBanner,
  onEditBanner,
}: Props) {
  return (
    <BannerArea
      heroBanners={banners}
      isStoreOwner={isStoreOwner}
      onAddBanner={onAddBanner}
      onEditBanner={onEditBanner}
      loading={loading}
    />
  );
}
