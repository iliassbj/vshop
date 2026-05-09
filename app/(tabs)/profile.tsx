import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

const genderOptions = ['men', 'women', 'unisex'];
const styleOptions = ['casual', 'streetwear', 'chic', 'sport', 'business'];
const clothingSizeOptions = ['XS', 'S', 'M', 'L', 'XL'];
const shoeSizeOptions = [36, 38, 40, 42, 44, 46, 48];
const budgetMin = 20;
const budgetMax = 2000;
const completedOnboardingStep = 6;
const theme = Colors.palette;

type SizeField = 'top' | 'bottom' | 'shoes';
type ProfilePicture = {
  base64: string;
  mimeType: string;
};

export default function ProfileScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [gender, setGender] = useState('');
  const [preferredStyles, setPreferredStyles] = useState<string[]>([]);
  const [sizes, setSizes] = useState<Record<SizeField, string>>({
    bottom: '',
    shoes: '',
    top: '',
  });
  const [budgetRange, setBudgetRange] = useState({
    max: '200',
    min: '20',
  });
  const [profilePicture, setProfilePicture] = useState<ProfilePicture | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setErrorMessage('');
    setStatusMessage('');
    setIsLoadingProfile(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage(userError?.message ?? 'You must be signed in to edit your profile.');
      setIsLoadingProfile(false);
      return;
    }

    setUserId(user.id);

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'gender, preferred_styles, budget_min, budget_max, sizes, profile_picture_base64, profile_picture_mime_type',
      )
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      setErrorMessage(error.message);
      setIsLoadingProfile(false);
      return;
    }

    if (data) {
      const savedSizes = typeof data.sizes === 'object' && data.sizes !== null ? data.sizes : {};

      setGender(typeof data.gender === 'string' ? data.gender : '');
      setPreferredStyles(Array.isArray(data.preferred_styles) ? data.preferred_styles : []);
      setBudgetRange({
        min:
          typeof data.budget_min === 'number'
            ? String(Math.min(Math.max(data.budget_min, budgetMin), budgetMax))
            : '20',
        max:
          typeof data.budget_max === 'number'
            ? String(Math.min(Math.max(data.budget_max, budgetMin), budgetMax))
            : '200',
      });
      setSizes({
        top: typeof savedSizes.top === 'string' ? savedSizes.top : '',
        bottom: typeof savedSizes.bottom === 'string' ? savedSizes.bottom : '',
        shoes: typeof savedSizes.shoes === 'string' ? savedSizes.shoes : '',
      });

      if (typeof data.profile_picture_base64 === 'string') {
        setProfilePicture({
          base64: data.profile_picture_base64,
          mimeType:
            typeof data.profile_picture_mime_type === 'string'
              ? data.profile_picture_mime_type
              : 'image/jpeg',
        });
      }
    }

    setIsLoadingProfile(false);
  }

  function toggleStyle(style: string) {
    setStatusMessage('');
    setPreferredStyles((current) =>
      current.includes(style) ? current.filter((item) => item !== style) : [...current, style],
    );
  }

  function updateSize(field: SizeField, value: string) {
    setStatusMessage('');
    setSizes((current) => ({ ...current, [field]: value }));
  }

  function updateBudget(field: 'min' | 'max', value: string) {
    setStatusMessage('');
    setBudgetRange((current) => ({ ...current, [field]: value.replace(/[^0-9]/g, '') }));
  }

  async function pickProfilePicture() {
    setErrorMessage('');
    setStatusMessage('');

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setErrorMessage('Photo library permission is required to update your picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      mediaTypes: ['images'],
      quality: 0.7,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset.base64) {
      setErrorMessage('The selected picture could not be converted to base64.');
      return;
    }

    setProfilePicture({
      base64: asset.base64,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  }

  function isBudgetRangeValid() {
    const parsedBudgetMin = Number(budgetRange.min);
    const parsedBudgetMax = Number(budgetRange.max);

    return (
      Number.isFinite(parsedBudgetMin) &&
      Number.isFinite(parsedBudgetMax) &&
      parsedBudgetMin >= budgetMin &&
      parsedBudgetMax <= budgetMax &&
      parsedBudgetMin <= parsedBudgetMax
    );
  }

  function isProfileValid() {
    return Boolean(
      gender &&
        preferredStyles.length > 0 &&
        sizes.top &&
        sizes.bottom &&
        sizes.shoes &&
        isBudgetRangeValid(),
    );
  }

  async function applyProfileChanges() {
    if (!userId) {
      setErrorMessage('You must be signed in to save your profile.');
      return;
    }

    if (!isProfileValid()) {
      setErrorMessage('Complete the required profile fields before applying changes.');
      return;
    }

    const parsedBudgetMin = Number(budgetRange.min);
    const parsedBudgetMax = Number(budgetRange.max);

    setErrorMessage('');
    setStatusMessage('');
    setIsSaving(true);

    const { error } = await supabase.from('profiles').upsert({
      id: userId,
      gender,
      preferred_styles: preferredStyles,
      budget_min: parsedBudgetMin,
      budget_max: parsedBudgetMax,
      sizes: {
        top: sizes.top,
        bottom: sizes.bottom,
        shoes: sizes.shoes,
      },
      profile_picture_base64: profilePicture?.base64 ?? null,
      profile_picture_mime_type: profilePicture?.mimeType ?? null,
      profile_completion_step: completedOnboardingStep,
    });

    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStatusMessage('Profile updated.');
  }

  if (isLoadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.cta} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.description}>Changes are saved only when you apply them.</Text>
      </View>

      <Section title="Picture">
        {profilePicture ? (
          <Image
            resizeMode="contain"
            source={{ uri: `data:${profilePicture.mimeType};base64,${profilePicture.base64}` }}
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>No picture selected</Text>
          </View>
        )}
        <Pressable onPress={pickProfilePicture} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>
            {profilePicture ? 'Choose another picture' : 'Choose picture'}
          </Text>
        </Pressable>
      </Section>

      <Section title="Gender">
        <OptionGrid
          options={genderOptions}
          selectedValues={[gender]}
          onSelect={(option) => {
            setStatusMessage('');
            setGender(option);
          }}
        />
      </Section>

      <Section title="Styles">
        <OptionGrid options={styleOptions} selectedValues={preferredStyles} onSelect={toggleStyle} />
      </Section>

      <Section title="Clothing sizes">
        <Text style={styles.label}>Top</Text>
        <OptionGrid
          options={clothingSizeOptions}
          selectedValues={[sizes.top]}
          onSelect={(option) => updateSize('top', option)}
        />
        <Text style={styles.label}>Bottom</Text>
        <OptionGrid
          options={clothingSizeOptions}
          selectedValues={[sizes.bottom]}
          onSelect={(option) => updateSize('bottom', option)}
        />
      </Section>

      <Section title="Shoe size">
        <OptionGrid
          options={shoeSizeOptions.map(String)}
          selectedValues={[sizes.shoes]}
          onSelect={(option) => updateSize('shoes', option)}
        />
      </Section>

      <Section title="Outfit budget">
        <Text style={styles.description}>Choose a range from 20 EUR to 2000 EUR.</Text>
        <View style={styles.budgetInputs}>
          <View style={styles.budgetInputGroup}>
            <Text style={styles.label}>Min</Text>
            <TextInput
              inputMode="numeric"
              onChangeText={(value) => updateBudget('min', value)}
              placeholder="20"
              placeholderTextColor={theme.textSecondary}
              selectionColor={theme.cta}
              style={styles.input}
              value={budgetRange.min}
            />
          </View>
          <View style={styles.budgetInputGroup}>
            <Text style={styles.label}>Max</Text>
            <TextInput
              inputMode="numeric"
              onChangeText={(value) => updateBudget('max', value)}
              placeholder="2000"
              placeholderTextColor={theme.textSecondary}
              selectionColor={theme.cta}
              style={styles.input}
              value={budgetRange.max}
            />
          </View>
        </View>
      </Section>

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      {statusMessage ? <Text style={styles.success}>{statusMessage}</Text> : null}

      <Pressable
        disabled={isSaving || !isProfileValid()}
        onPress={applyProfileChanges}
        style={[styles.button, (isSaving || !isProfileValid()) && styles.buttonDisabled]}>
        {isSaving ? (
          <ActivityIndicator color={theme.surface} />
        ) : (
          <Text style={styles.buttonText}>Apply</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function OptionGrid({
  onSelect,
  options,
  selectedValues,
}: {
  onSelect: (option: string) => void;
  options: string[];
  selectedValues: string[];
}) {
  return (
    <View style={styles.options}>
      {options.map((option) => {
        const selected = selectedValues.includes(option);

        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={[styles.option, selected && styles.optionSelected]}>
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  budgetInputGroup: {
    backgroundColor: 'transparent',
    flex: 1,
    gap: 8,
  },
  budgetInputs: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    alignItems: 'center',
    backgroundColor: theme.cta,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: theme.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  container: {
    gap: 18,
    padding: 20,
    paddingBottom: 32,
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
  header: {
    backgroundColor: 'transparent',
    gap: 6,
  },
  imagePlaceholder: {
    alignItems: 'center',
    aspectRatio: 3 / 4,
    backgroundColor: theme.primarySoft,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    width: '100%',
  },
  imagePlaceholderText: {
    color: theme.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  option: {
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    minWidth: 76,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionSelected: {
    backgroundColor: theme.cta,
    borderColor: theme.cta,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  optionTextSelected: {
    color: theme.surface,
  },
  options: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  profileImage: {
    aspectRatio: 3 / 4,
    backgroundColor: theme.primarySoft,
    borderRadius: 8,
    width: '100%',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderColor: theme.cta,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: theme.cta,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'transparent',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  success: {
    color: theme.priceGreen,
    fontSize: 15,
    fontWeight: '600',
  },
});
