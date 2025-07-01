import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Heart, Search, Star } from 'lucide-react-native';
import { router } from 'expo-router';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import UserAvatar from './UserAvatar';
import WishlistModal from './WishlistModal';
import CartService from '../services/cart';

interface GlobalHeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showSearch?: boolean;
}

export default function GlobalHeader({ 
  searchQuery = '', 
  onSearchChange, 
  showSearch = true 
}: GlobalHeaderProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [showWishlistModal, setShowWishlistModal] = useState(false);
  const [wishlistItemsCount, setWishlistItemsCount] = useState(0);

  useEffect(() => {
    const cartService = CartService.getInstance();
    
    const updateCounts = () => {
      setWishlistItemsCount(cartService.getWishlistItemsCount());
    };

    updateCounts();
    cartService.addListener(updateCounts);
    
    return () => cartService.removeListener(updateCounts);
  }, []);

  const navigateToReviews = () => {
    router.push('/reviews');
  };

  return (
    <>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerTop}>
          <View style={styles.logo}>
            <View style={[styles.logoIcon, { backgroundColor: colors.gold }]} />
            <Text style={[styles.logoText, { color: colors.gold }]}>{t('ageVerification.platformName')}</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              style={[styles.iconButton, { backgroundColor: colors.surface.primary }]}
              onPress={navigateToReviews}
            >
              <Star size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.iconButton, { backgroundColor: colors.surface.primary }]}
              onPress={() => setShowWishlistModal(true)}
            >
              <Heart size={24} color={colors.text.primary} />
              {wishlistItemsCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.gold }]}>
                  <Text style={[styles.badgeText, { color: colors.text.inverse }]}>{wishlistItemsCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <UserAvatar />
          </View>
        </View>
        
        {/* Search Bar */}
        {showSearch && (
          <View style={[styles.searchContainer, { 
            backgroundColor: colors.surface.primary,
            borderColor: colors.border.primary 
          }]}>
            <Search size={20} color={colors.text.tertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text.primary }]}
              placeholder={t('home.searchPlaceholder')}
              value={searchQuery}
              onChangeText={onSearchChange}
              textAlign="right"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        )}
      </View>
      
      <WishlistModal 
        visible={showWishlistModal} 
        onClose={() => setShowWishlistModal(false)} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    position: 'relative',
    padding: 4,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    left: -4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
});