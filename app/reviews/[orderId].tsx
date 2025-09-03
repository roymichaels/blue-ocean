import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import useAppRouter from 'hooks/useAppRouter';
import { Star, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import Spinner from '@/shared/ui/Spinner';
import ordersAgent from '../../agents/orders-agent';
import reviewAgent from '../../agents/review-agent';
import { Order, Review } from '../../types';
import SmartImage from '../../components/SmartImage';

export default function SubmitReviewScreen() {
  const { replace, back } = useAppRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { isLoggedIn, user } = useAuth();
  const { colors } = useTheme();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    async function load() {
      if (!orderId || !isLoggedIn || !user) {
        setLoading(false);
        return;
      }
      const o = await ordersAgent.get(orderId);
      if (o && o.userId === user.id && o.status === 'delivered') {
        setOrder(o);
      }
      setLoading(false);
    }
    load();
  }, [orderId]);

  const submit = async () => {
    if (!order || rating === 0 || !title.trim()) return;
    const item = order.items[0];
    const review: Review = {
      id: Date.now().toString(),
      productId: item.productId,
      productName: item.product.name,
      productImage: item.product.images[0],
      orderId: order.id,
      userId: user!.id,
      userName: user!.username,
      userAvatar: '',
      rating,
      title,
      comment,
      date: new Date().toISOString(),
      helpful: 0,
      verified: true,
    };
    await reviewAgent.add(review);
    replace('/reviews');
  };

  const renderStars = () => (
    <View style={{ flexDirection: 'row' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => setRating(s)}>
          <Star
            size={32}
            color={s <= rating ? colors.gold : colors.text.secondary}
            fill={s <= rating ? colors.gold : 'none'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <Spinner label="Loading review" />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <Text style={{ color: colors.text.primary, textAlign: 'center', marginTop: 40 }}>
          Order not found or not eligible for review.
        </Text>
      </SafeAreaView>
    );
  }

  const item = order.items[0];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { borderBottomColor: colors.border.primary }]}> 
        <TouchableOpacity onPress={() => back()} style={[styles.backButton, { borderColor: colors.border.primary, backgroundColor: colors.surface.primary }]}> 
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>כתיבת ביקורת</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}> 
        <View style={styles.productRow}>
          <SmartImage
            uri={item.product.images[0]}
            width={60}
            height={60}
            style={styles.productImage}
          />
          <Text style={[styles.productName, { color: colors.text.primary }]} numberOfLines={1}>
            {item.product.name}
          </Text>
        </View>
        <View style={styles.ratingSection}> 
          {renderStars()}
        </View>
        <TextInput
          style={[styles.input, { borderColor: colors.border.primary, color: colors.text.primary }]}
          placeholder="כותרת"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor={colors.text.tertiary}
          textAlign="right"
        />
        <TextInput
          style={[styles.textarea, { borderColor: colors.border.primary, color: colors.text.primary }]}
          placeholder="הערות"
          value={comment}
          onChangeText={setComment}
          placeholderTextColor={colors.text.tertiary}
          multiline
          numberOfLines={4}
          textAlign="right"
        />
        <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.gold }] } onPress={submit}>
          <Text style={[styles.submitText, { color: colors.text.inverse }]}>שלח</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16 },
  productRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  productImage: { borderRadius: 8, marginLeft: 12 },
  productName: { flex: 1, fontSize: 16, fontWeight: '600', textAlign: 'right' },
  ratingSection: { alignItems: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 },
  textarea: { borderWidth: 1, borderRadius: 8, padding: 12, height: 120, marginBottom: 16, textAlignVertical: 'top' },
  submitButton: { borderRadius: 8, padding: 16, alignItems: 'center' },
  submitText: { fontSize: 16, fontWeight: '600' },
});

