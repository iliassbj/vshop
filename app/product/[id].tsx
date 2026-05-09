import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { DummyProduct, fetchProductById } from '@/lib/products';

const theme = Colors.palette;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<DummyProduct | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const data = await fetchProductById(id);

        if (isMounted) {
          setProduct(data);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load product.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.cta} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Product not found</Text>
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <Link href="/shop" style={styles.link}>
          Back to shop
        </Link>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image resizeMode="cover" source={{ uri: product.thumbnail }} style={styles.heroImage} />
      <Text style={styles.brand}>{product.category}</Text>
      <Text style={styles.title}>{product.title}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.price}>${product.price}</Text>
        <Text style={styles.rating}>{product.rating.toFixed(1)} rating</Text>
      </View>
      <Text style={styles.description}>{product.description}</Text>
      <View style={styles.detailGroup}>
        <Text style={styles.detail}>Stock: {product.stock}</Text>
        <Text style={styles.detail}>{product.availabilityStatus}</Text>
        <Text style={styles.detail}>{product.shippingInformation}</Text>
        <Text style={styles.detail}>{product.returnPolicy}</Text>
      </View>
      <Link href={{ pathname: '/try-on/[productId]', params: { productId: String(product.id) } }} style={styles.link}>
        Try on
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  brand: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  container: {
    flexGrow: 1,
    gap: 14,
    padding: 20,
  },
  description: {
    color: theme.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  detail: {
    color: theme.textPrimary,
    fontSize: 15,
  },
  detailGroup: {
    backgroundColor: 'transparent',
    gap: 8,
  },
  error: {
    color: theme.discountRed,
    fontSize: 15,
  },
  heroImage: {
    aspectRatio: 1,
    backgroundColor: theme.primarySoft,
    borderRadius: 8,
    width: '100%',
  },
  link: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  metaRow: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  price: {
    color: theme.priceGreen,
    fontSize: 20,
    fontWeight: '700',
  },
  rating: {
    color: theme.ratingAmber,
    fontSize: 15,
    fontWeight: '700',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
  },
});
