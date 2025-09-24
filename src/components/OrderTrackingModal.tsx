import { errorLog } from '@/utils/logger';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import SmartImage from './SmartImage';
import { X, MapPin, Star, Phone, MessageCircle, Copy } from 'lucide-react-native';
import { Order, OrderStatus } from '../types';
import { useTheme } from '@/ui/ThemeProvider';
import { useCurrency } from '../contexts/CurrencyContext';
import OrderService from '@/services/orders';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/features/auth/AuthContext';
import { useLanguage } from '@/ui/ThemeProvider';
import { useLaunchGate } from '@/features/launchGate';
import { formatTimestamp } from '@/utils/formatTimestamp';
import { isDisputesEnabled, isReviewsEnabled } from '@/config/featureFlags';
import OrderTimeline from '@/components/OrderTimeline';



interface OrderTrackingModalProps {
  visible: boolean;
  onClose: () => void;
  order: Order | null;
}

export default function OrderTrackingModal({ visible, onClose, order }: OrderTrackingModalProps) {
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { currencySymbol } = useCurrency();
  const { requireUnlock } = useLaunchGate();
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const disputesEnabled = isDisputesEnabled();
  const reviewsEnabled = isReviewsEnabled();

  useEffect(() => {
    if (visible && order) {
      calculateEstimatedDelivery(order);
    }
  }, [visible, order]);

  useEffect(() => {
    // Clear timeout on unmount
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const calculateEstimatedDelivery = (order: Order) => {
    if (!order) return;
    
    const now = new Date();
    let estimatedMinutes = 0;
    
    switch (order.status) {
      case 'order_received':
        estimatedMinutes = 30;
        break;
      case 'courier_found':
        estimatedMinutes = 25;
        break;
      case 'courier_picked_up':
        estimatedMinutes = 20;
        break;
      case 'courier_on_way':
        estimatedMinutes = 15;
        break;
      case 'delivered':
        setEstimatedDelivery(t('orders.status.delivered', 'Delivered'));
        return;
    }
    
    const estimatedTime = new Date(now.getTime() + estimatedMinutes * 60000);
    const hours = estimatedTime.getHours().toString().padStart(2, '0');
    const minutes = estimatedTime.getMinutes().toString().padStart(2, '0');
    
    setEstimatedDelivery(`${hours}:${minutes} (משוער)`);
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'order_received': return 'הזמנה התקבלה';
      case 'courier_found': return 'נמצא שליח';
      case 'courier_picked_up': return 'שליח אסף';
      case 'courier_on_way': return 'שליח בדרך';
      case 'delivered': return 'נמסר';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => formatTimestamp(dateString);

  const contactCourier = () => {
    // In a real app, this would initiate a call or message to the courier
    Alert.alert('התקשרות לשליח', 'מתקשר לשליח...');
  };

  const contactSupport = () => {
    Alert.alert('Support', 'Delivery support over Waku is rolling out soon.');
  };

  const cancelOrder = async () => {
    if (!order) return;
    
    // Only allow cancellation if order is in early stages
    if (order.status !== 'order_received' && order.status !== 'courier_found') {
      Alert.alert(
        'לא ניתן לבטל',
        'לא ניתן לבטל הזמנה שכבר נאספה על ידי שליח'
      );
      return;
    }
    
    Alert.alert(
      'ביטול הזמנה',
      'האם אתה בטוח שברצונך לבטל את ההזמנה?',
      [
        { text: 'לא', style: 'cancel' },
        { 
          text: 'כן, בטל הזמנה', 
          style: 'destructive',
          onPress: async () => {
            try {
              const orderService = OrderService.getInstance();
              await requireUnlock('order.cancel');
              const success = await orderService.cancelOrder(order.id);
              
              if (success) {
                Alert.alert(
                  'הזמנה בוטלה',
                  'ההזמנה בוטלה בהצלחה',
                  [{ text: 'אישור', onPress: onClose }]
                );
              } else {
                Alert.alert('שגיאה', 'לא ניתן לבטל את ההזמנה');
              }
            } catch (error) {
              Alert.alert('שגיאה', 'אירעה שגיאה בביטול ההזמנה');
            }
          }
        }
      ]
    );
  };

  const writeReview = () => {
    onClose();
    Alert.alert('Info', 'Reviews are not available yet');
  };

  const copyOrderDetails = async () => {
    if (!order) return;

    try {
      // Format order details
      const formattedDetails = `
הזמנה #${order.id.slice(-6)}
-------------------
תאריך: ${formatDate(order.createdAt)}
סטטוס: ${getStatusText(order.status)}
סה"כ: ${currencySymbol}${order.total.toFixed(2)}
אמצעי תשלום: תשלום במזומן בעת המסירה

פרטי משלוח:
${order.shippingAddress.name}
${order.shippingAddress.street}
${order.shippingAddress.city} ${order.shippingAddress.postalCode}
${order.shippingAddress.phone}
${order.shippingAddress.notes ? `הערות: ${order.shippingAddress.notes}` : ''}

פריטים:
${order.items.map(item => `- ${item.product.name} x${item.quantity} - ${currencySymbol}${((item.unitPrice ?? item.product.price) * item.quantity).toFixed(2)}`).join('\n')}
      `.trim();

      await Clipboard.setStringAsync(formattedDetails);
      
      // Show success state
      setCopySuccess(true);
      
      // Reset after 2 seconds
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      
      copyTimeoutRef.current = setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
      
      Alert.alert('הצלחה', t('orders.detailsCopied'));
    } catch (error) {
      errorLog('Error copying order details:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בהעתקת פרטי ההזמנה');
    }
  };

  if (!order) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border.primary }]}>
          <Text style={[styles.title, { color: colors.text.primary }]}>מעקב הזמנה #{order.id.slice(-6)}</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Delivery Status Card */}
          <View style={[styles.statusCard, { 
            backgroundColor: colors.surface.primary,
            borderColor: colors.border.primary 
          }]}>
            <View style={styles.statusHeader}>
              <View>
                <Text style={[styles.statusTitle, { color: colors.text.secondary }]}>סטטוס משלוח</Text>
                <Text style={[styles.statusSubtitle, { color: colors.gold }]}>{getStatusText(order.status)}</Text>
              </View>
              {order.status !== 'delivered' && (
                <View style={styles.estimatedTime}>
                  <Text style={[styles.estimatedTimeLabel, { color: colors.text.secondary }]}>זמן הגעה:</Text>
                  <Text style={[styles.estimatedTimeValue, { color: colors.text.primary }]}>{estimatedDelivery}</Text>
                </View>
              )}
            </View>

            {/* Progress Bar */}
            <OrderTimeline order={order} withBorder={false} style={styles.timeline} />

            {/* Contact Options */}
            {order.status === 'courier_on_way' && (
              <View style={styles.contactOptions}>
                <TouchableOpacity 
                  style={[styles.contactButton, { 
                    backgroundColor: colors.surface.secondary,
                    borderColor: colors.border.primary 
                  }]}
                  onPress={contactCourier}
                >
                  <Phone size={20} color={colors.gold} />
                  <Text style={[styles.contactButtonText, { color: colors.gold }]}>התקשר לשליח</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.contactButton, { 
                    backgroundColor: colors.surface.secondary,
                    borderColor: colors.border.primary 
                  }]}
                  onPress={contactSupport}
                >
                  <MessageCircle size={20} color={colors.gold} />
                  <Text style={[styles.contactButtonText, { color: colors.gold }]}>צ'אט עם תמיכה</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Cancel Order Button */}
            {(order.status === 'order_received' || order.status === 'courier_found') && (
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.status.error }]}
                onPress={cancelOrder}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text.inverse }]}>ביטול הזמנה</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.disputeButton,
                disputesEnabled
                  ? { backgroundColor: colors.status.warning }
                  : {
                      backgroundColor: colors.surface.secondary,
                      borderColor: colors.border.primary,
                      borderWidth: 1,
                    },
              ]}
              disabled={!disputesEnabled}
              activeOpacity={disputesEnabled ? 0.7 : 1}
              onPress={() => {
                if (!disputesEnabled) return;
                Alert.alert(t('orders.openDispute', 'Open dispute'));
              }}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.disputeButtonText,
                  { color: disputesEnabled ? colors.text.inverse : colors.text.secondary },
                ]}
              >
                {disputesEnabled
                  ? t('orders.openDispute', 'Open dispute')
                  : t('orders.disputeComingSoon', 'בקרוב')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Order Info */}
          <View style={[styles.orderInfo, {
            backgroundColor: colors.surface.primary,
            borderColor: colors.border.primary 
          }]}>
            <View style={styles.orderInfoHeader}>
              <Text style={[styles.orderInfoTitle, { color: colors.text.primary }]}>פרטי הזמנה</Text>
              {isAdmin && (
                <TouchableOpacity 
                  style={[styles.copyButton, { 
                    backgroundColor: colors.surface.secondary,
                    borderColor: colors.border.primary 
                  }]}
                  onPress={copyOrderDetails}
                >
                  <Copy size={16} color={copySuccess ? colors.status.success : colors.gold} />
                  <Text style={[
                    styles.copyButtonText,
                    { color: colors.gold },
                    copySuccess && { color: colors.status.success }
                  ]}>
                    {copySuccess ? 'הועתק' : t('orders.copyDetails')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.orderInfoRow}>
              <Text style={[styles.orderInfoLabel, { color: colors.text.secondary }]}>מספר הזמנה:</Text>
              <Text style={[styles.orderInfoValue, { color: colors.text.primary }]}>#{order.id.slice(-6)}</Text>
            </View>
            <View style={styles.orderInfoRow}>
              <Text style={[styles.orderInfoLabel, { color: colors.text.secondary }]}>תאריך הזמנה:</Text>
              <Text style={[styles.orderInfoValue, { color: colors.text.primary }]}>{formatDate(order.createdAt)}</Text>
            </View>
            <View style={styles.orderInfoRow}>
              <Text style={[styles.orderInfoLabel, { color: colors.text.secondary }]}>סכום כולל:</Text>
              <Text style={[styles.orderInfoValue, { color: colors.text.primary }]}>{currencySymbol}{order.total.toFixed(2)}</Text>
            </View>
            <View style={styles.orderInfoRow}>
              <Text style={[styles.orderInfoLabel, { color: colors.text.secondary }]}>אמצעי תשלום:</Text>
              <Text style={[styles.orderInfoValue, { color: colors.text.primary }]}>תשלום במזומן בעת המסירה</Text>
            </View>
          </View>

          {/* Shipping Address */}
          <View style={[styles.shippingInfo, { 
            backgroundColor: colors.surface.primary,
            borderColor: colors.border.primary 
          }]}>
            <View style={styles.shippingHeader}>
              <MapPin size={20} color={colors.gold} />
              <Text style={[styles.shippingTitle, { color: colors.text.primary }]}>כתובת משלוח</Text>
            </View>
            <Text style={[styles.shippingAddress, { color: colors.text.primary }]}>
              {order.shippingAddress.name}{'\n'}
              {order.shippingAddress.street}{'\n'}
              {order.shippingAddress.city} {order.shippingAddress.postalCode}{'\n'}
              {order.shippingAddress.phone}
            </Text>
            {order.shippingAddress.notes && (
              <Text style={[styles.shippingNotes, { color: colors.text.secondary }]}>
                הערות: {order.shippingAddress.notes}
              </Text>
            )}
          </View>

          {/* Order Items */}
          <View style={[styles.itemsContainer, { 
            backgroundColor: colors.surface.primary,
            borderColor: colors.border.primary 
          }]}>
            <Text style={[styles.itemsTitle, { color: colors.text.primary }]}>פריטים בהזמנה</Text>
            {order.items.map((item, index) => (
              <View key={index} style={[styles.orderItem, { borderBottomColor: colors.border.secondary }]}>
                <SmartImage
                  uri={item.product.images[0]}
                  width={50}
                  height={50}
                  style={styles.itemImage}
                  contentFit="cover"
                />
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: colors.text.primary }]}>{item.product.name}</Text>
                  <Text style={[styles.itemDetails, { color: colors.text.secondary }]}>
                    כמות: {item.quantity} | מחיר: {currencySymbol}{(item.unitPrice ?? item.product.price).toFixed(2)}
                  </Text>
                  {item.selectedColor && (
                    <View style={styles.itemColor}>
                      <View style={[styles.colorDot, { 
                        backgroundColor: item.selectedColor,
                        borderColor: colors.border.primary 
                      }]} />
                      <Text style={[styles.colorText, { color: colors.text.secondary }]}>צבע נבחר</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.itemTotal, { color: colors.gold }]}>
                  {currencySymbol}{((item.unitPrice ?? item.product.price) * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
          </View>

          {/* Delivery Instructions */}
          {order.status === 'courier_on_way' && (
            <View style={[styles.deliveryInstructions, { 
              backgroundColor: colors.interactive.secondary,
              borderColor: colors.gold 
            }]}>
              <Text style={[styles.instructionsTitle, { color: colors.text.primary }]}>הוראות למסירה</Text>
              <Text style={[styles.instructionsText, { color: colors.text.primary }]}>
                • השליח יגיע בקרוב לכתובת שציינת{'\n'}
                • הכן את הסכום המדויק: {currencySymbol}{order.total.toFixed(2)}{'\n'}
                • ודא שמישהו נמצא בכתובת לקבלת ההזמנה{'\n'}
                • בדוק את המוצרים לפני התשלום
              </Text>
            </View>
          )}

          {/* Review Prompt */}
          {reviewsEnabled && order.status === 'delivered' && (
            <View style={[styles.reviewPrompt, {
              backgroundColor: colors.surface.primary,
              borderColor: colors.border.primary
            }]}> 
              <Star size={24} color={colors.gold} />
              <Text style={[styles.reviewTitle, { color: colors.text.primary }]}>איך היה המשלוח?</Text>
              <Text style={[styles.reviewText, { color: colors.text.secondary }]}>
                נשמח לשמוע על החוויה שלך ולקבל ביקורת על המוצרים שהזמנת
              </Text>
              <TouchableOpacity 
                style={[styles.reviewButton, { backgroundColor: colors.gold }]}
                onPress={writeReview}
              >
                <Text style={[styles.reviewButtonText, { color: colors.text.inverse }]}>כתוב ביקורת</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  estimatedTime: {
    alignItems: 'flex-end',
  },
  estimatedTimeLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  estimatedTimeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeline: {
    marginBottom: 16,
  },
  contactOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderWidth: 1,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  disputeButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  disputeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  orderInfo: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  orderInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderInfoLabel: {
    fontSize: 14,
  },
  orderInfoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  shippingInfo: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  shippingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'flex-end',
  },
  shippingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  shippingAddress: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
  },
  shippingNotes: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  itemsContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'right',
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  itemImage: {
    borderRadius: 8,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'right',
  },
  itemDetails: {
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'right',
  },
  itemColor: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 4,
    borderWidth: 1,
  },
  colorText: {
    fontSize: 12,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    alignSelf: 'center',
  },
  deliveryInstructions: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'right',
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
  },
  reviewPrompt: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 24,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  reviewText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  reviewButton: {
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
