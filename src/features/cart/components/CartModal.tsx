import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import SmartImage from '@/components/SmartImage';
import {
  X,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  MapPin,
  CreditCard,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { CartItem, ShippingAddress, Store } from '@/types';
import useCart from '../hooks/useCart';
import useCartStores from '../hooks/useCartStores';
import OrderService from '@/services/orders';
import eventBus from '@/services/eventBus';
const MoonPayButton = require('@/features/payments/components/MoonPayButton').default;
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import commonStyles from '../constants/styles';
import { useCurrency } from '../contexts/CurrencyContext';
import { useNotifications } from './NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { router } from 'expo-router';
import InfoModal from './InfoModal';
import ConfirmationModal from './ConfirmationModal';

interface CartModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CartModal({ visible, onClose }: CartModalProps) {
  const { cartItems, updateQuantity, removeItem, clearCart, getTotal } = useCart();
  const stores = useCartStores(cartItems);
  const [checkoutStep, setCheckoutStep] = useState<
    'cart' | 'shipping' | 'payment' | 'confirmation'
  >('cart');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    phone: '',
    street: '',
    city: '',
    postalCode: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const { isLoggedIn, user } = useAuth();
  const { colors } = useTheme();
  const { currencySymbol } = useCurrency();
  const { showNotification } = useNotifications();
  const { t } = useLanguage();
  const scrollViewRef = useRef<ScrollView>(null);

  // Info/confirm modals
  const [infoModal, setInfoModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
  });
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    action: () => {},
  });


  useEffect(() => {
    if (visible) {
      // reset flow
      setCheckoutStep('cart');
      setOrderPlaced(false);
      setOrderIds([]);
      if (isLoggedIn && user) {
        setShippingAddress((prev) => ({ ...prev, name: user.displayName || '' }));
      }
    }
  }, [visible, isLoggedIn, user]);

  useEffect(() => {
    // Scroll to top when changing steps
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, [checkoutStep]);

  const groupedItems = useMemo(() => {
    return cartItems.reduce<Record<string, CartItem[]>>((acc, item) => {
      const storeId = item.product.storeId;
      (acc[storeId] ||= []).push(item);
      return acc;
    }, {});
  }, [cartItems]);

  const getGroupTotal = (items: CartItem[]) =>
    items.reduce(
      (total, item) =>
        total + (item.unitPrice ?? item.product.price) * item.quantity,
      0
    );

  const goToShipping = () => {
    if (!isLoggedIn) {
      setInfoModal({
        visible: true,
        title: t('cart.loginRequiredTitle'),
        message: t('cart.loginRequiredMessage'),
        type: 'info',
      });
      return;
    }
    if (!cartItems.length) {
      setInfoModal({
        visible: true,
        title: t('cart.emptyCartTitle'),
        message: t('cart.emptyCartMessage'),
        type: 'warning',
      });
      return;
    }

    const overstock = cartItems.find(
      (i) => (i.effectiveQty ?? i.quantity) > (i.product.stock ?? Infinity)
    );
    if (overstock) {
      setInfoModal({
        visible: true,
        title: t('cart.outOfStockTitle'),
        message: t('cart.outOfStockMessage'),
        type: 'warning',
      });
      return;
    }

    // KYC gate
    if (user && user.kycStatus !== 'verified') {
      let message = '';
      switch (user.kycStatus) {
        case 'none':
          message = t('kyc.requiredForOrders');
          break;
        case 'pending':
          message = t('kyc.pendingOrdersMessage');
          break;
        case 'rejected':
          message = t('kyc.rejectedOrdersMessage');
          break;
        default:
          message = t('kyc.requiredForOrders');
      }
      if (user.kycStatus === 'none' || user.kycStatus === 'rejected') {
        setConfirmModal({
          visible: true,
          title: t('kyc.verification'),
          message,
          confirmText: t('kyc.goToKyc'),
          cancelText: t('common.cancel'),
          action: () => {
            onClose();
            router.push('/kyc');
          },
        });
      } else {
        setInfoModal({
          visible: true,
          title: t('kyc.verification'),
          message,
          type: 'warning',
        });
      }
      return;
    }

    eventBus.track('checkout.start', { items: cartItems.length, total: getTotal() });
    setCheckoutStep('shipping');
  };

  const goToPayment = () => {
    if (!validateShippingAddress()) return;
    setCheckoutStep('payment');
  };

  const goToConfirmation = () => setCheckoutStep('confirmation');

  const goBack = () => {
    switch (checkoutStep) {
      case 'shipping':
        setCheckoutStep('cart');
        break;
      case 'payment':
        setCheckoutStep('shipping');
        break;
      case 'confirmation':
        setCheckoutStep('payment');
        break;
      default:
        onClose();
    }
  };

  const validateShippingAddress = (): boolean => {
    if (!shippingAddress.name.trim()) {
      setInfoModal({
        visible: true,
        title: t('common.error'),
        message: t('cart.enterFullName'),
        type: 'error',
      });
      return false;
    }
    if (!shippingAddress.phone.trim()) {
      setInfoModal({
        visible: true,
        title: t('common.error'),
        message: t('cart.enterPhone'),
        type: 'error',
      });
      return false;
    }
    if (!shippingAddress.street.trim()) {
      setInfoModal({
        visible: true,
        title: t('common.error'),
        message: t('cart.enterStreet'),
        type: 'error',
      });
      return false;
    }
    if (!shippingAddress.city.trim()) {
      setInfoModal({
        visible: true,
        title: t('common.error'),
        message: t('cart.enterCity'),
        type: 'error',
      });
      return false;
    }
    return true;
  };

  const placeOrder = async () => {
    if (!validateShippingAddress()) return;

    setLoading(true);
    try {
      const orders = await OrderService.getInstance().createOrdersFromCart(
        user?.id || 'guest',
        cartItems,
        shippingAddress,
        'ton'
      );
      eventBus.track('checkout.complete', {
        orderIds: orders.map((o) => o.id),
        total: getTotal(),
      });
      setOrderIds(orders.map((o) => o.id));
      setOrderPlaced(true);
      await clearCart();

      showNotification(
        t('cart.orderReceived'),
        t('cart.ordersCreated', { count: orders.length }),
        'success'
      );

      setTimeout(() => onClose(), 5000);
    } catch (error) {
      setInfoModal({
        visible: true,
        title: t('common.error'),
        message: t('cart.orderCreationError'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderCartItem = (item: CartItem) => (
    <View
      key={item.id}
      style={[
        styles.cartItem,
        { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
      ]}
    >
      <SmartImage
        uri={item.product.images?.[0] || ''}
        style={styles.productImage}
        contentFit="cover"
        cachePolicy="disk"
      />

      <View style={styles.productInfo}>
        <Text
          style={[styles.productName, { color: colors.text.primary }]}
          numberOfLines={2}
        >
          {item.product.name}
        </Text>

        <Text style={[styles.productPrice, { color: colors.gold }]}>
          {currencySymbol}
          {(item.unitPrice ?? item.product.price).toFixed(2)}
        </Text>
        {item.tierName && (
          <Text style={[styles.tierInfo, { color: colors.text.secondary }]}>
            {'\n'}
            {item.tierName} • EQ {item.effectiveQty}
          </Text>
        )}
      </View>

      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={[
            styles.quantityButton,
            item.quantity === 1 && styles.quantityButtonDisabled,
            {
              backgroundColor: colors.surface.secondary,
              borderColor: colors.border.primary,
            },
          ]}
          onPress={() => updateQuantity(item.id, item.quantity - 1)}
          disabled={item.quantity === 1}
        >
          <Minus
            size={16}
            color={
              item.quantity === 1
                ? colors.interactive.disabled
                : colors.text.primary
            }
          />
        </TouchableOpacity>

        <Text style={[styles.quantity, { color: colors.text.primary }]}>
          {item.quantity}
        </Text>

        <TouchableOpacity
          style={[
            styles.quantityButton,
            item.quantity >= (item.product.stock || 99) &&
              styles.quantityButtonDisabled,
            {
              backgroundColor: colors.surface.secondary,
              borderColor: colors.border.primary,
            },
          ]}
          onPress={() => updateQuantity(item.id, item.quantity + 1)}
          disabled={item.quantity >= (item.product.stock || 99)}
        >
          <Plus
            size={16}
            color={
              item.quantity >= (item.product.stock || 99)
                ? colors.interactive.disabled
                : colors.text.primary
            }
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.removeButton} onPress={() => removeItem(item.id)}>
        <Trash2 size={16} color={colors.status.error} />
      </TouchableOpacity>
    </View>
  );

  const renderShippingForm = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={commonStyles.flex1}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.checkoutForm}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.checkoutHeader}>
          <MapPin size={24} color={colors.gold} />
          <Text style={[styles.checkoutTitle, { color: colors.text.primary }]}>
            {t('cart.shippingAddress')}
          </Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.text.primary }]}>
            {t('cart.fullName')}
          </Text>
          <TextInput
            style={[
              styles.formInput,
              {
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary,
                color: colors.text.primary,
              },
            ]}
            value={shippingAddress.name}
            onChangeText={(text) => setShippingAddress({ ...shippingAddress, name: text })}
            placeholder={t('cart.fullNamePlaceholder')}
            textAlign="end"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.text.primary }]}>
            {t('cart.phone')}
          </Text>
          <TextInput
            style={[
              styles.formInput,
              {
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary,
                color: colors.text.primary,
              },
            ]}
            value={shippingAddress.phone}
            onChangeText={(text) => setShippingAddress({ ...shippingAddress, phone: text })}
            placeholder={t('cart.phonePlaceholder')}
            keyboardType="phone-pad"
            textAlign="end"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.text.primary }]}>
            {t('cart.streetAddress')}
          </Text>
          <TextInput
            style={[
              styles.formInput,
              {
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary,
                color: colors.text.primary,
              },
            ]}
            value={shippingAddress.street}
            onChangeText={(text) => setShippingAddress({ ...shippingAddress, street: text })}
            placeholder={t('cart.streetAddressPlaceholder')}
            textAlign="end"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        <View style={styles.formRow}>
          <View style={styles.formGroupHalf}>
            <Text style={[styles.formLabel, { color: colors.text.primary }]}>
              {t('cart.city')}
            </Text>
            <TextInput
              style={[
                styles.formInput,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                  color: colors.text.primary,
                },
              ]}
              value={shippingAddress.city}
              onChangeText={(text) => setShippingAddress({ ...shippingAddress, city: text })}
              placeholder={t('cart.cityPlaceholder')}
              textAlign="end"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          <View style={styles.formGroupHalf}>
            <Text style={[styles.formLabel, { color: colors.text.primary }]}>
              {t('cart.postalCode')}
            </Text>
            <TextInput
              style={[
                styles.formInput,
                {
                  backgroundColor: colors.surface.primary,
                  borderColor: colors.border.primary,
                  color: colors.text.primary,
                },
              ]}
              value={shippingAddress.postalCode}
              onChangeText={(text) =>
                setShippingAddress({ ...shippingAddress, postalCode: text })
              }
              placeholder={t('cart.postalCodePlaceholder')}
              keyboardType="numeric"
              textAlign="end"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.text.primary }]}>
            {t('cart.notes')}
          </Text>
          <TextInput
            style={[
              styles.formInput,
              styles.textArea,
              {
                backgroundColor: colors.surface.primary,
                borderColor: colors.border.primary,
                color: colors.text.primary,
              },
            ]}
            value={shippingAddress.notes}
            onChangeText={(text) => setShippingAddress({ ...shippingAddress, notes: text })}
            placeholder={t('cart.notesPlaceholder')}
            multiline
            numberOfLines={3}
            textAlign="end"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        <View
          style={[
            styles.orderSummary,
            { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
          ]}
        >
          <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>
            {t('cart.orderSummary')}
          </Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
              {t('cart.productsTotal')}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
              {cartItems.length}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
              {t('cart.itemsTotal')}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
              {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
              {t('cart.shippingCost')}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
              {currencySymbol}0.00
            </Text>
          </View>
          <View
            style={[
              styles.summaryRow,
              styles.summaryTotal,
              { borderTopColor: colors.border.primary },
            ]}
          >
            <Text style={[styles.summaryTotalLabel, { color: colors.text.primary }]}>
              {t('cart.totalDue')}
            </Text>
            <Text style={[styles.summaryTotalValue, { color: colors.gold }]}>
              {currencySymbol}
              {getTotal().toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <ChevronRight size={20} color={colors.text.primary} />
          <Text style={[styles.backButtonText, { color: colors.text.primary }]}>
            {t('cart.backToCart')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: colors.gold }]}
          onPress={goToPayment}
        >
          <Text style={[styles.nextButtonText, { color: colors.text.inverse }]}>
            {t('cart.proceedToPayment')}
          </Text>
          <ChevronLeft size={20} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderPaymentForm = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={commonStyles.flex1}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.checkoutForm}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.checkoutHeader}>
          <CreditCard size={24} color={colors.gold} />
          <Text style={[styles.checkoutTitle, { color: colors.text.primary }]}>
            {t('cart.paymentMethods')}
          </Text>
        </View>

        <View style={styles.paymentOptions}>
          <TouchableOpacity
            style={[
              styles.paymentOption,
              styles.selectedPaymentOption,
              { backgroundColor: colors.interactive.secondary, borderColor: colors.gold },
            ]}
          >
            <View style={[styles.paymentOptionIcon, { backgroundColor: colors.surface.secondary }]}>
              <Text style={styles.paymentOptionEmoji}>💰</Text>
            </View>
            <View style={styles.paymentOptionInfo}>
              <Text style={[styles.paymentOptionTitle, { color: colors.text.primary }]}> 
                {t('cart.cashOnDelivery')}
              </Text>
              <Text style={[styles.paymentOptionDescription, { color: colors.text.secondary }]}> 
                {t('cart.cashOnDeliveryDesc')}
              </Text>
            </View>
            <View style={styles.paymentOptionCheck}>
              <Check size={20} color={colors.gold} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              styles.disabledPaymentOption,
              { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
            ]}
            disabled
          >
            <View style={[styles.paymentOptionIcon, { backgroundColor: colors.surface.secondary }]}>
              <Text style={styles.paymentOptionEmoji}>💳</Text>
            </View>
            <View style={styles.paymentOptionInfo}>
              <Text style={[styles.paymentOptionTitle, { color: colors.text.primary }]}> 
                {t('cart.creditCard')}
              </Text>
              <Text style={[styles.paymentOptionDescription, { color: colors.text.secondary }]}> 
                {t('cart.comingSoon')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.paymentOption,
              styles.disabledPaymentOption,
              { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
            ]}
            disabled
          >
            <View style={[styles.paymentOptionIcon, { backgroundColor: colors.surface.secondary }]}>
              <Text style={styles.paymentOptionEmoji}>📱</Text>
            </View>
            <View style={styles.paymentOptionInfo}>
              <Text style={[styles.paymentOptionTitle, { color: colors.text.primary }]}> 
                {t('cart.paymentApps')}
              </Text>
              <Text style={[styles.paymentOptionDescription, { color: colors.text.secondary }]}> 
                {t('cart.comingSoon')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <MoonPayButton usdAmount={getTotal()} />

        <View
          style={[
            styles.shippingAddressSummary,
            { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
          ]}
        >
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>
              {t('cart.shippingAddress')}
            </Text>
            <TouchableOpacity onPress={() => setCheckoutStep('shipping')}>
              <Text style={[styles.editLink, { color: colors.gold }]}>
                {t('common.edit')}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.addressText, { color: colors.text.primary }]}>
            {shippingAddress.name}
            {'\n'}
            {shippingAddress.street}
            {'\n'}
            {shippingAddress.city} {shippingAddress.postalCode}
            {'\n'}
            {shippingAddress.phone}
          </Text>
          {!!shippingAddress.notes && (
            <Text style={[styles.notesText, { color: colors.text.secondary }]}> 
              {t('cart.notes')}: {shippingAddress.notes}
            </Text>
          )}
        </View>

        {Object.entries(groupedItems).map(([storeId, items]) => (
          <View
            key={storeId}
            style={[
              styles.orderSummary,
              { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
            ]}
          >
            <Text style={[styles.summaryTitle, { color: colors.text.primary }]}> 
              {stores[storeId]?.name || t('cart.storeFallback')}
            </Text>
            {items.map((item) => (
              <View key={item.id} style={styles.summaryItem}>
                <Text style={[styles.summaryItemName, { color: colors.text.primary }]}>
                  {item.product.name} x{item.quantity}
                </Text>
                <Text style={[styles.summaryItemPrice, { color: colors.gold }]}>
                  {currencySymbol}
                  {((item.unitPrice ?? item.product.price) * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
            <View
              style={[
                styles.summaryRow,
                styles.summaryTotal,
                { borderTopColor: colors.border.primary },
              ]}
            >
              <Text style={[styles.summaryTotalLabel, { color: colors.text.primary }]}> 
                {t('cart.storeTotal')}
              </Text>
              <Text style={[styles.summaryTotalValue, { color: colors.gold }]}>
                {currencySymbol}
                {getGroupTotal(items).toFixed(2)}
              </Text>
            </View>
          </View>
        ))}

        <View
          style={[
            styles.orderSummary,
            { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
          ]}
        >
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}>
              {t('cart.shippingCost')}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}>
              {currencySymbol}0.00
            </Text>
          </View>
          <View
            style={[
              styles.summaryRow,
              styles.summaryTotal,
              { borderTopColor: colors.border.primary },
            ]}
          >
            <Text style={[styles.summaryTotalLabel, { color: colors.text.primary }]}> 
              {t('cart.totalDue')}
            </Text>
            <Text style={[styles.summaryTotalValue, { color: colors.gold }]}>
              {currencySymbol}
              {getTotal().toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <ChevronRight size={20} color={colors.text.primary} />
          <Text style={[styles.backButtonText, { color: colors.text.primary }]}> 
            {t('cart.backToAddress')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: colors.gold }]}
          onPress={goToConfirmation}
        >
          <Text style={[styles.nextButtonText, { color: colors.text.inverse }]}> 
            {t('cart.proceedToSummary')}
          </Text>
          <ChevronLeft size={20} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderOrderConfirmation = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={commonStyles.flex1}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.checkoutForm}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.confirmationHeader}>
          <Text style={[styles.confirmationTitle, { color: colors.text.primary }]}> 
            {t('cart.orderConfirmation')}
          </Text>
          <Text style={[styles.confirmationSubtitle, { color: colors.text.secondary }]}> 
            {t('cart.reviewOrderMessage')}
          </Text>
        </View>

        <View
          style={[
            styles.shippingAddressSummary,
            { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
          ]}
        >
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>
              {t('cart.shippingAddress')}
            </Text>
            <TouchableOpacity onPress={() => setCheckoutStep('shipping')}>
              <Text style={[styles.editLink, { color: colors.gold }]}>
                {t('common.edit')}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.addressText, { color: colors.text.primary }]}> 
            {shippingAddress.name}
            {'\n'}
            {shippingAddress.street}
            {'\n'}
            {shippingAddress.city} {shippingAddress.postalCode}
            {'\n'}
            {shippingAddress.phone}
          </Text>
          {!!shippingAddress.notes && (
            <Text style={[styles.notesText, { color: colors.text.secondary }]}> 
              {t('cart.notes')}: {shippingAddress.notes}
            </Text>
          )}
        </View>

        <View
          style={[
            styles.paymentMethodSummary,
            { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
          ]}
        >
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>
              {t('cart.paymentMethods')}
            </Text>
            <TouchableOpacity onPress={() => setCheckoutStep('payment')}>
              <Text style={[styles.editLink, { color: colors.gold }]}>
                {t('common.edit')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.paymentMethodInfo}>
            <Text style={styles.paymentMethodEmoji}>💰</Text>
            <Text style={[styles.paymentMethodText, { color: colors.text.primary }]}> 
              {t('cart.cashOnDelivery')}
            </Text>
          </View>
        </View>

        {Object.entries(groupedItems).map(([storeId, items]) => (
          <View
            key={storeId}
            style={[
              styles.orderSummary,
              { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
            ]}
          >
            <View style={styles.summaryHeader}>
              <Text style={[styles.summaryTitle, { color: colors.text.primary }]}>
                {t('cart.itemsFromStore', { store: stores[storeId]?.name || '' })}
              </Text>
              <TouchableOpacity onPress={() => setCheckoutStep('cart')}>
                <Text style={[styles.editLink, { color: colors.gold }]}>
                  {t('common.edit')}
                </Text>
              </TouchableOpacity>
            </View>
            {items.map((item) => (
              <View key={item.id} style={styles.summaryItem}>
                <Text style={[styles.summaryItemName, { color: colors.text.primary }]}>
                  {item.product.name} x{item.quantity}
                </Text>
                <Text style={[styles.summaryItemPrice, { color: colors.gold }]}>
                  {currencySymbol}
                  {((item.unitPrice ?? item.product.price) * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
            <View
              style={[
                styles.summaryRow,
                styles.summaryTotal,
                { borderTopColor: colors.border.primary },
              ]}
            >
              <Text style={[styles.summaryTotalLabel, { color: colors.text.primary }]}> 
                {t('cart.storeTotal')}
              </Text>
              <Text style={[styles.summaryTotalValue, { color: colors.gold }]}>
                {currencySymbol}
                {getGroupTotal(items).toFixed(2)}
              </Text>
            </View>
          </View>
        ))}

        <View
          style={[
            styles.orderSummary,
            { backgroundColor: colors.surface.primary, borderColor: colors.border.primary },
          ]}
        >
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text.secondary }]}> 
              {t('cart.shippingCost')}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text.primary }]}> 
              {currencySymbol}0.00
            </Text>
          </View>
          <View
            style={[
              styles.summaryRow,
              styles.summaryTotal,
              { borderTopColor: colors.border.primary },
            ]}
          >
            <Text style={[styles.summaryTotalLabel, { color: colors.text.primary }]}> 
              {t('cart.totalDue')}
            </Text>
            <Text style={[styles.summaryTotalValue, { color: colors.gold }]}> 
              {currencySymbol}
              {getTotal().toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.termsContainer}>
          <Text style={[styles.termsText, { color: colors.text.tertiary }]}> 
            {t('cart.termsNotice')}{'\n'}{t('cart.cashOnDeliveryNotice')}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border.primary }]}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <ChevronRight size={20} color={colors.text.primary} />
          <Text style={[styles.backButtonText, { color: colors.text.primary }]}> 
            {t('cart.backToPayment')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.completeOrderButton,
            { backgroundColor: colors.gold },
            loading && styles.buttonDisabled,
          ]}
          onPress={placeOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            <Text style={[styles.completeOrderText, { color: colors.text.inverse }]}> 
              {t('cart.completeOrder')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderOrderSuccess = () => (
    <View style={styles.successContainer}>
      <View
        style={[
          styles.successIconContainer,
          { backgroundColor: colors.status.success },
        ]}
      >
        <Check size={60} color={colors.text.inverse} />
      </View>
      <Text style={[styles.successTitle, { color: colors.text.primary }]}> 
        {t('cart.orderSuccessTitle')}
      </Text>
      <Text style={[styles.successOrderId, { color: colors.gold }]}>
        {orderIds.length === 1
          ? t('cart.orderNumber', { id: orderIds[0].slice(-6) })
          : t('cart.orderNumbers', {
              ids: orderIds.map((id) => `#${id.slice(-6)}`).join(', '),
            })}
      </Text>
      <Text style={[styles.successMessage, { color: colors.text.secondary }]}>
        {t('cart.orderSuccessMessage')}{'\n'}
        {t('cart.orderSuccessFollowUp')}
      </Text>
      <TouchableOpacity
        style={[styles.successButton, { backgroundColor: colors.gold }]}
        onPress={onClose}
      >
        <Text style={[styles.successButtonText, { color: colors.text.inverse }]}> 
          {t('common.close')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    if (orderPlaced) return renderOrderSuccess();

    switch (checkoutStep) {
      case 'shipping':
        return renderShippingForm();
      case 'payment':
        return renderPaymentForm();
      case 'confirmation':
        return renderOrderConfirmation();
      default:
        return (
          <>
            {cartItems.length > 0 ? (
              <>
                <ScrollView style={styles.cartList}>
                  {cartItems.map(renderCartItem)}
                </ScrollView>

                <View style={[styles.footer, { borderTopColor: colors.border.primary }]}>
                  <View style={styles.totalContainer}>
                    <Text style={[styles.totalText, { color: colors.text.primary }]}>
                      {t('cart.total')} {currencySymbol}
                      {getTotal().toFixed(2)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.checkoutButton, { backgroundColor: colors.gold }]}
                    onPress={goToShipping}
                  >
                    <ShoppingCart size={20} color={colors.text.inverse} />
                    <Text
                      style={[
                        styles.checkoutButtonText,
                        { color: colors.text.inverse },
                      ]}
                    >
                      {t('cart.proceedToPayment')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.emptyCart}>
                <ShoppingCart size={80} color={colors.interactive.disabled} />
                <Text style={[styles.emptyTitle, { color: colors.text.primary }]}> 
                  {t('cart.emptyCartTitle')}
                </Text>
                <Text style={[styles.emptyMessage, { color: colors.text.secondary }]}> 
                  {t('cart.emptyCartMessage')}
                </Text>
              </View>
            )}
          </>
        );
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
            <Text style={[styles.title, { color: colors.text.primary }]}> 
              {orderPlaced
                ? t('cart.orderComplete')
                : checkoutStep === 'cart'
                ? t('cart.cartTitle')
                : checkoutStep === 'shipping'
                ? t('cart.shippingDetails')
                : checkoutStep === 'payment'
                ? t('cart.paymentMethod')
                : t('cart.orderConfirmation')}
            </Text>
            {!orderPlaced && (
              <TouchableOpacity onPress={onClose}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Progress indicator */}
          {checkoutStep !== 'cart' && !orderPlaced && (
            <View style={styles.progressContainer}>
              <View style={styles.progressStep}>
                <View
                  style={[
                    styles.progressDot,
                    styles.progressDotActive,
                    { backgroundColor: colors.gold },
                  ]}
                />
                <Text
                  style={[
                    styles.progressText,
                    styles.progressTextActive,
                    { color: colors.gold },
                  ]}
                >
                  {t('cart.stepCart')}
                </Text>
              </View>
              <View
                style={[
                  styles.progressLine,
                  { backgroundColor: colors.gold },
                ]}
              />
              <View style={styles.progressStep}>
                <View
                  style={[
                    styles.progressDot,
                    { backgroundColor: colors.gold },
                  ]}
                />
                <Text
                  style={[
                    styles.progressText,
                    { color: colors.gold },
                  ]}
                >
                  {t('cart.stepShipping')}
                </Text>
              </View>
              <View
                style={[
                  styles.progressLine,
                  (checkoutStep === 'payment' || checkoutStep === 'confirmation')
                    ? { backgroundColor: colors.gold }
                    : { backgroundColor: colors.interactive.disabled },
                ]}
              />
              <View style={styles.progressStep}>
                <View
                  style={[
                    styles.progressDot,
                    (checkoutStep === 'payment' || checkoutStep === 'confirmation')
                      ? { backgroundColor: colors.gold }
                      : { backgroundColor: colors.interactive.disabled },
                  ]}
                />
                <Text
                  style={[
                    styles.progressText,
                    (checkoutStep === 'payment' || checkoutStep === 'confirmation')
                      ? { color: colors.gold }
                      : { color: colors.text.secondary },
                  ]}
                >
                  {t('cart.stepPayment')}
                </Text>
              </View>
              <View
                style={[
                  styles.progressLine,
                  checkoutStep === 'confirmation'
                    ? { backgroundColor: colors.gold }
                    : { backgroundColor: colors.interactive.disabled },
                ]}
              />
              <View style={styles.progressStep}>
                <View
                  style={[
                    styles.progressDot,
                    checkoutStep === 'confirmation'
                      ? { backgroundColor: colors.gold }
                      : { backgroundColor: colors.interactive.disabled },
                  ]}
                />
                <Text
                  style={[
                    styles.progressText,
                    checkoutStep === 'confirmation'
                      ? { color: colors.gold }
                      : { color: colors.text.secondary },
                  ]}
                >
                  {t('cart.stepConfirmation')}
                </Text>
              </View>
            </View>
          )}

          {renderContent()}
        </View>
      </Modal>

      {/* Info Modal */}
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        type={infoModal.type}
        onClose={() => setInfoModal({ ...infoModal, visible: false })}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText || t('common.confirm')}
        cancelText={confirmModal.cancelText || t('common.cancel')}
        onConfirm={() => {
          confirmModal.action();
          setConfirmModal({ ...confirmModal, visible: false });
        }}
        onCancel={() => setConfirmModal({ ...confirmModal, visible: false })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  progressStep: { alignItems: 'center' },
  progressDot: { width: 16, height: 16, borderRadius: 8, marginBottom: 4 },
  progressDotActive: { backgroundColor: '#D4AF37' },
  progressText: { fontSize: 12 },
  progressTextActive: { fontWeight: '600' },
  progressLine: { height: 2, flex: 1 },
  cartList: { flex: 1, padding: 16 },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  productImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  productInfo: { flex: 1, marginRight: 12 },
  productName: { fontSize: 14, fontWeight: '600', marginBottom: 4, textAlign: 'end' },
  productPrice: { fontSize: 16, fontWeight: 'bold', textAlign: 'end' },
  tierInfo: { fontSize: 12, textAlign: 'end' },
  quantityControls: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  quantityButtonDisabled: { opacity: 0.5 },
  quantity: { fontSize: 16, fontWeight: '600', marginHorizontal: 12 },
  removeButton: { padding: 8 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalContainer: { flex: 1 },
  totalText: { fontSize: 18, fontWeight: 'bold', textAlign: 'end' },
  checkoutButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 150,
  },
  checkoutButtonText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  emptyCart: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  emptyMessage: { fontSize: 16, textAlign: 'center' },
  checkoutForm: { flex: 1, padding: 16 },
  checkoutHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, justifyContent: 'center' },
  checkoutTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  formGroup: { marginBottom: 16 },
  formRow: { flexDirection: 'row', gap: 12 },
  formGroupHalf: { flex: 1 },
  formLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, textAlign: 'end' },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  orderSummary: { borderRadius: 12, padding: 16, marginVertical: 24, borderWidth: 1 },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'end' },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryItemName: { fontSize: 14, flex: 1, textAlign: 'end' },
  summaryItemPrice: { fontSize: 14, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '500' },
  summaryTotal: { borderTopWidth: 1, paddingTop: 12, marginTop: 8 },
  summaryTotalLabel: { fontSize: 16, fontWeight: 'bold' },
  summaryTotalValue: { fontSize: 18, fontWeight: 'bold' },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  backButtonText: { fontSize: 14, fontWeight: '500', marginLeft: 4 },
  nextButton: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  nextButtonText: { fontSize: 16, fontWeight: '600', marginRight: 4 },
  completeOrderButton: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center', minWidth: 180 },
  completeOrderText: { fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
  paymentOptions: { marginBottom: 24 },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  selectedPaymentOption: { borderWidth: 2 },
  disabledPaymentOption: { opacity: 0.6 },
  paymentOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentOptionEmoji: { fontSize: 20 },
  paymentOptionInfo: { flex: 1 },
  paymentOptionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4, textAlign: 'end' },
  paymentOptionDescription: { fontSize: 12, textAlign: 'end' },
  paymentOptionCheck: { marginLeft: 12 },
  shippingAddressSummary: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  editLink: { fontSize: 14, fontWeight: '500' },
  addressText: { fontSize: 14, lineHeight: 20, textAlign: 'end' },
  notesText: { fontSize: 12, marginTop: 8, fontStyle: 'italic', textAlign: 'end' },
  paymentMethodSummary: { borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1 },
  paymentMethodInfo: { flexDirection: 'row', alignItems: 'center' },
  paymentMethodEmoji: { fontSize: 20, marginRight: 12 },
  paymentMethodText: { fontSize: 14, fontWeight: '500' },
  confirmationHeader: { alignItems: 'center', marginBottom: 24 },
  confirmationTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  confirmationSubtitle: { fontSize: 14, textAlign: 'center' },
  termsContainer: { marginBottom: 24 },
  termsText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  successIconContainer: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  successOrderId: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  successMessage: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  successButton: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24, minWidth: 150, alignItems: 'center' },
  successButtonText: { fontSize: 16, fontWeight: '600' },
});
