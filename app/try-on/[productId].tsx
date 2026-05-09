import { Link, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { DummyProduct, fetchProductById } from '@/lib/products';

const theme = Colors.palette;

export default function TryOnScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const [product, setProduct] = useState<DummyProduct | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const backHref: Href = product
    ? { pathname: '/product/[id]', params: { id: String(product.id) } }
    : '/shop';

  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const data = await fetchProductById(productId);

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
  }, [productId]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.cta} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Try On</Text>
      <Text style={styles.description}>
        {product ? `Preview ${product.title} in the virtual try-on flow.` : 'Choose a product to start try-on.'}
      </Text>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <View style={styles.preview}>
        {product ? (
          <Image resizeMode="contain" source={{ uri: product.thumbnail }} style={styles.previewImage} />
        ) : (
          <Text style={styles.previewText}>Try-on preview</Text>
        )}
      </View>
      <Link href={backHref} style={styles.link}>
        {product ? 'Back to product' : 'Back to shop'}
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
    padding: 20,
  },
  description: {
    color: theme.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  error: {
    color: theme.discountRed,
    fontSize: 15,
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
  preview: {
    alignItems: 'center',
    aspectRatio: 3 / 4,
    backgroundColor: theme.primarySoft,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    height: '100%',
    width: '100%',
  },
  previewText: {
    color: theme.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
  },
});
