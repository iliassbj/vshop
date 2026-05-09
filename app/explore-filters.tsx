import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { defaultExploreFilterSlug, exploreFilters } from '@/lib/exploreFilters';

const theme = Colors.palette;

export default function ExploreFiltersScreen() {
  const router = useRouter();
  const { categorySlug } = useLocalSearchParams<{ categorySlug?: string }>();
  const initialCategorySlug = Array.isArray(categorySlug) ? categorySlug[0] : categorySlug;
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(
    initialCategorySlug ?? defaultExploreFilterSlug,
  );

  function applyFilters() {
    router.replace({
      pathname: '/(tabs)/explore',
      params: { categorySlug: selectedCategorySlug },
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Product type</Text>
        <View style={styles.filterGrid}>
          {exploreFilters.map((filter) => {
            const selected = filter.categorySlug === selectedCategorySlug;

            return (
              <Pressable
                key={filter.categorySlug}
                onPress={() => setSelectedCategorySlug(filter.categorySlug)}
                style={[styles.filterOption, selected && styles.filterOptionSelected]}>
                <Text style={[styles.filterOptionText, selected && styles.filterOptionTextSelected]}>
                  {filter.label}
                </Text>
                {selected ? <FontAwesome color={theme.surface} name="check" size={14} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable onPress={applyFilters} style={styles.applyButton}>
        <Text style={styles.applyButtonText}>Apply filters</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  applyButton: {
    alignItems: 'center',
    backgroundColor: theme.cta,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 16,
  },
  applyButtonText: {
    color: theme.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  container: {
    gap: 22,
    padding: 20,
    paddingBottom: 32,
  },
  filterGrid: {
    backgroundColor: 'transparent',
    gap: 10,
  },
  filterOption: {
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: 14,
  },
  filterOptionSelected: {
    backgroundColor: theme.cta,
    borderColor: theme.cta,
  },
  filterOptionText: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  filterOptionTextSelected: {
    color: theme.surface,
  },
  section: {
    backgroundColor: 'transparent',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
});
