import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Image, PanResponder, Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { defaultExploreFilterSlug } from '@/lib/exploreFilters';
import { DummyProduct, fetchProductsByCategory } from '@/lib/products';
import { fetchTryOnImage } from '@/lib/tryOn';

const theme = Colors.palette;

export default function ExploreScreen() {
  const router = useRouter();
  const { categorySlug } = useLocalSearchParams<{ categorySlug?: string }>();
  const activeCategorySlug = Array.isArray(categorySlug) ? categorySlug[0] : categorySlug;
  const selectedCategorySlug = activeCategorySlug ?? defaultExploreFilterSlug;
  const [products, setProducts] = useState<DummyProduct[]>([]);
  const [productIndex, setProductIndex] = useState(0);
  const [featuredProduct, setFeaturedProduct] = useState<DummyProduct | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [tryOnErrorMessage, setTryOnErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTryOn, setIsLoadingTryOn] = useState(false);
  const [tryOnImageUri, setTryOnImageUri] = useState('');
  const productsRef = useRef<DummyProduct[]>([]);
  const featuredProductRef = useRef<DummyProduct | null>(null);
  const cardTranslateY = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const isAnimatingCardRef = useRef(false);
  const tryOnImageCacheRef = useRef(new Map<number, string>());
  const swipePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy < -12 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderRelease: (_, gestureState) => {
        const isTap = Math.abs(gestureState.dx) < 10 && Math.abs(gestureState.dy) < 10;

        if (isTap) {
          openFeaturedProduct();
          return;
        }

        if (gestureState.dy <= -60 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)) {
          animateToNextProduct();
        }
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    featuredProductRef.current = featuredProduct;
  }, [featuredProduct]);

  useEffect(() => {
    let isMounted = true;

    async function loadTryOnPreview() {
      if (!featuredProduct) {
        setTryOnImageUri('');
        setTryOnErrorMessage('');
        return;
      }

      const cachedTryOnImageUri = tryOnImageCacheRef.current.get(featuredProduct.id);

      if (cachedTryOnImageUri) {
        setTryOnImageUri(cachedTryOnImageUri);
        setTryOnErrorMessage('');
        setIsLoadingTryOn(false);
        return;
      }

      setIsLoadingTryOn(true);
      setTryOnImageUri('');
      setTryOnErrorMessage('');

      try {
        const imageUri = await fetchTryOnImage({
          productImageUrl: featuredProduct.thumbnail,
        });

        if (isMounted) {
          tryOnImageCacheRef.current.set(featuredProduct.id, imageUri);
          setTryOnImageUri(imageUri);
        }
      } catch (error) {
        if (isMounted) {
          setTryOnErrorMessage(error instanceof Error ? error.message : 'Unable to load try-on preview.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingTryOn(false);
        }
      }
    }

    loadTryOnPreview();

    return () => {
      isMounted = false;
    };
  }, [featuredProduct]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const productData = await fetchProductsByCategory(selectedCategorySlug);

        if (isMounted) {
          setProducts(productData.products);
          setProductIndex(0);
          setFeaturedProduct(productData.products[0] ?? null);
          resetCardAnimation();
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load explore.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [selectedCategorySlug]);

  function showNextProduct() {
    const currentProducts = productsRef.current;

    if (currentProducts.length <= 1) {
      return;
    }

    setProductIndex((current) => {
      const nextIndex = (current + 1) % currentProducts.length;
      setFeaturedProduct(currentProducts[nextIndex]);

      return nextIndex;
    });
  }

  function animateToNextProduct() {
    const currentProducts = productsRef.current;

    if (currentProducts.length <= 1 || isAnimatingCardRef.current) {
      return;
    }

    isAnimatingCardRef.current = true;

    Animated.parallel([
      Animated.timing(cardTranslateY, {
        duration: 160,
        toValue: -80,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        duration: 160,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        isAnimatingCardRef.current = false;
        return;
      }

      showNextProduct();
      cardTranslateY.setValue(80);

      Animated.parallel([
        Animated.spring(cardTranslateY, {
          damping: 16,
          mass: 0.7,
          stiffness: 180,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          duration: 180,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimatingCardRef.current = false;
      });
    });
  }

  function resetCardAnimation() {
    isAnimatingCardRef.current = false;
    cardTranslateY.stopAnimation();
    cardOpacity.stopAnimation();
    cardTranslateY.setValue(0);
    cardOpacity.setValue(1);
  }

  function openFeaturedProduct() {
    const currentFeaturedProduct = featuredProductRef.current;

    if (!currentFeaturedProduct) {
      return;
    }

    router.push({
      pathname: '/product/[id]',
      params: { id: String(currentFeaturedProduct.id) },
    });
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.cta} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {featuredProduct ? (
        <Animated.View
          {...swipePanResponder.panHandlers}
          accessibilityRole="button"
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }],
            },
          ]}>
          {tryOnImageUri ? (
            <Image resizeMode="cover" source={{ uri: tryOnImageUri }} style={styles.image} />
          ) : (
            <View style={styles.tryOnPlaceholder}>
              {isLoadingTryOn ? (
                <ActivityIndicator color={theme.cta} />
              ) : (
                <Text style={styles.tryOnPlaceholderText}>
                  {tryOnErrorMessage || 'Try-on preview unavailable'}
                </Text>
              )}
            </View>
          )}
          <View style={styles.topOverlay}>
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : <View style={styles.toolbarSpacer} />}
            <Pressable
              accessibilityLabel="Open filters"
              onPress={() =>
                router.push({
                  pathname: '/explore-filters',
                  params: { categorySlug: selectedCategorySlug },
                })
              }
              style={styles.filterButton}>
              <FontAwesome color={theme.surface} name="sliders" size={18} />
            </Pressable>
          </View>
          <View style={styles.bottomOverlay}>
            <Text style={styles.productName}>{featuredProduct.title}</Text>
            <View style={styles.badgeRow}>
              <Text style={styles.badge}>${featuredProduct.price}</Text>
              <Text style={styles.badge}>{featuredProduct.rating.toFixed(1)}</Text>
            </View>
          </View>
        </Animated.View>
      ) : (
        <Text style={styles.description}>No product found for this filter.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.textPrimary,
    flex: 1,
    overflow: 'hidden',
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeRow: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    gap: 10,
  },
  container: {
    flex: 1,
    padding: 0,
  },
  description: {
    color: theme.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  error: {
    color: theme.surface,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 3,
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(28, 25, 23, 0.42)',
    borderColor: 'rgba(255, 255, 255, 0.36)',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    width: 42,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  image: {
    backgroundColor: theme.primarySoft,
    height: '100%',
    width: '100%',
  },
  productName: {
    color: theme.surface,
    fontSize: 22,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 3,
  },
  tryOnPlaceholder: {
    alignItems: 'center',
    backgroundColor: theme.primarySoft,
    flex: 1,
    justifyContent: 'center',
    padding: 18,
    width: '100%',
  },
  tryOnPlaceholderText: {
    color: theme.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
  },
  topOverlay: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 16,
    position: 'absolute',
    right: 16,
    top: 54,
  },
  toolbarSpacer: {
    backgroundColor: 'transparent',
    flex: 1,
  },
  bottomOverlay: {
    backgroundColor: 'transparent',
    bottom: 20,
    gap: 10,
    left: 16,
    position: 'absolute',
    right: 16,
  },
});
