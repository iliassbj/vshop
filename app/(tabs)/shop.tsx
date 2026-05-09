import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import {
  DummyProduct,
  DummyProductCategory,
  fetchProductCategories,
  fetchProductsByCategory,
} from '@/lib/products';

const theme = Colors.palette;
const defaultCategorySlug = 'womens-dresses';

function ProductRow({ product }: { product: DummyProduct }) {
  return (
    <Link href={{ pathname: '/product/[id]', params: { id: String(product.id) } }} asChild>
      <Pressable style={styles.card}>
        <Image resizeMode="cover" source={{ uri: product.thumbnail }} style={styles.thumbnail} />
        <View style={styles.cardContent}>
          <Text style={styles.productName}>{product.title}</Text>
          <Text style={styles.meta}>{product.category}</Text>
          <Text style={styles.price}>${product.price}</Text>
          <Text style={styles.rating}>{product.rating.toFixed(1)} rating</Text>
        </View>
      </Pressable>
    </Link>
  );
}

export default function ShopScreen() {
  const [categories, setCategories] = useState<DummyProductCategory[]>([]);
  const [products, setProducts] = useState<DummyProduct[]>([]);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(defaultCategorySlug);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadProducts = useCallback(async (categorySlug: string, mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'refresh') {
      setIsRefreshing(true);
    } else {
      setIsLoadingProducts(true);
    }

    setErrorMessage('');

    try {
      const data = await fetchProductsByCategory(categorySlug);
      setProducts(data.products);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load products.');
    } finally {
      setIsLoadingProducts(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const categoryData = await fetchProductCategories();
        const initialCategory =
          categoryData.find((category) => category.slug === defaultCategorySlug)?.slug ??
          categoryData[0]?.slug;

        if (!initialCategory) {
          throw new Error('No product categories found.');
        }

        const productData = await fetchProductsByCategory(initialCategory);

        if (isMounted) {
          setCategories(categoryData);
          setSelectedCategorySlug(initialCategory);
          setProducts(productData.products);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load shop.');
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
  }, []);

  async function selectCategory(categorySlug: string) {
    if (categorySlug === selectedCategorySlug || isLoadingProducts) {
      setIsCategoryMenuOpen(false);
      return;
    }

    setIsCategoryMenuOpen(false);
    setSelectedCategorySlug(categorySlug);
    await loadProducts(categorySlug);
  }

  const selectedCategoryName =
    categories.find((category) => category.slug === selectedCategorySlug)?.name ?? 'Select category';

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.cta} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <View style={styles.dropdown}>
        <Pressable
          onPress={() => setIsCategoryMenuOpen((current) => !current)}
          style={styles.dropdownButton}>
          <Text style={styles.dropdownButtonText}>{selectedCategoryName}</Text>
          <Text style={styles.dropdownIcon}>{isCategoryMenuOpen ? '^' : 'v'}</Text>
        </Pressable>
        {isCategoryMenuOpen ? (
          <View style={styles.dropdownMenu}>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
              {categories.map((category) => {
                const selected = category.slug === selectedCategorySlug;

                return (
                  <Pressable
                    key={category.slug}
                    onPress={() => selectCategory(category.slug)}
                    style={[styles.dropdownItem, selected && styles.dropdownItemSelected]}>
                    <Text style={[styles.dropdownItemText, selected && styles.dropdownItemTextSelected]}>
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </View>
      {isLoadingProducts ? <ActivityIndicator color={theme.cta} style={styles.productLoader} /> : null}
      <FlatList
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.list}
        data={products}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor={theme.cta}
            onRefresh={() => loadProducts(selectedCategorySlug, 'refresh')}
          />
        }
        renderItem={({ item }) => <ProductRow product={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 12,
    overflow: 'hidden',
    padding: 10,
  },
  cardContent: {
    backgroundColor: 'transparent',
    gap: 6,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  error: {
    color: theme.discountRed,
    fontSize: 15,
    marginBottom: 12,
  },
  dropdown: {
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  dropdownButton: {
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  dropdownButtonText: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  dropdownIcon: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownItem: {
    backgroundColor: theme.surface,
    borderBottomColor: theme.border,
    borderBottomWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  dropdownItemSelected: {
    backgroundColor: theme.primarySoft,
  },
  dropdownItemText: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownItemTextSelected: {
    color: theme.cta,
  },
  dropdownMenu: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    maxHeight: 280,
    overflow: 'hidden',
  },
  gridRow: {
    gap: 12,
  },
  list: {
    gap: 12,
    paddingBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  meta: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  price: {
    color: theme.priceGreen,
    fontSize: 16,
    fontWeight: '700',
  },
  productLoader: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
  },
  rating: {
    color: theme.ratingAmber,
    fontSize: 14,
    fontWeight: '600',
  },
  thumbnail: {
    aspectRatio: 1,
    backgroundColor: theme.primarySoft,
    borderRadius: 8,
    width: '100%',
  },
});
