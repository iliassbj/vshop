import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

const genderOptions = ['men', 'women', 'unisex'];
const styleOptions = ['casual', 'streetwear', 'chic', 'sport', 'business'];
const clothingSizeOptions = ['XS', 'S', 'M', 'L', 'XL'];
const shoeSizeOptions = [36, 38, 40, 42, 44, 46, 48];
const budgetMin = 20;
const budgetMax = 2000;
const totalSteps = 6;
const theme = Colors.palette;

type SizeField = 'top' | 'bottom' | 'shoes';
type ProfilePicture = {
  base64: string;
  mimeType: string;
};

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [gender, setGender] = useState('');
  const [preferredStyles, setPreferredStyles] = useState<string[]>([]);
  const [sizes, setSizes] = useState<Record<SizeField, string>>({
    top: '',
    bottom: '',
    shoes: '',
  });
  const [budgetRange, setBudgetRange] = useState({
    max: '200',
    min: '20',
  });
  const [profilePicture, setProfilePicture] = useState<ProfilePicture | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setIsLoadingProfile(true);
    setErrorMessage('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage(userError?.message ?? 'You must be signed in to set up your profile.');
      setIsLoadingProfile(false);
      return;
    }

    setUserId(user.id);

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'gender, preferred_styles, budget_min, budget_max, sizes, profile_picture_base64, profile_picture_mime_type, profile_completion_step',
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
      const completionStep =
        typeof data.profile_completion_step === 'number' ? data.profile_completion_step : 0;

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

      if (completionStep >= totalSteps) {
        setIsLoadingProfile(false);
        router.replace('/(tabs)/shop');
        return;
      }

      setStep(Math.min(completionStep + 1, totalSteps));
    } else {
      await supabase.from('profiles').upsert({ id: user.id, profile_completion_step: 0 });
    }

    setIsLoadingProfile(false);
  }

  function toggleStyle(style: string) {
    setPreferredStyles((current) =>
      current.includes(style) ? current.filter((item) => item !== style) : [...current, style],
    );
  }

  function updateSize(field: SizeField, value: string) {
    setSizes((current) => ({ ...current, [field]: value }));
  }

  async function pickProfilePicture() {
    setErrorMessage('');

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setErrorMessage('Photo library permission is required to upload a picture.');
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

  function canContinue() {
    if (step === 1) return Boolean(gender);
    if (step === 2) return preferredStyles.length > 0;
    if (step === 3) return Boolean(sizes.top && sizes.bottom);
    if (step === 4) return Boolean(sizes.shoes);
    if (step === 5) return isBudgetRangeValid();
    if (step === 6) return Boolean(profilePicture);

    return false;
  }

  function buildPayload(completedStep: number) {
    const parsedBudgetMin = Number(budgetRange.min);
    const parsedBudgetMax = Number(budgetRange.max);

    return {
      id: userId,
      gender: gender || null,
      preferred_styles: preferredStyles,
      budget_min: Number.isFinite(parsedBudgetMin) ? parsedBudgetMin : null,
      budget_max: Number.isFinite(parsedBudgetMax) ? parsedBudgetMax : null,
      sizes: {
        top: sizes.top || null,
        bottom: sizes.bottom || null,
        shoes: sizes.shoes || null,
      },
      profile_picture_base64: profilePicture?.base64 ?? null,
      profile_picture_mime_type: profilePicture?.mimeType ?? null,
      profile_completion_step: completedStep,
    };
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

  function updateBudget(field: 'min' | 'max', value: string) {
    setBudgetRange((current) => ({ ...current, [field]: value.replace(/[^0-9]/g, '') }));
  }

  async function saveStep() {
    if (!userId) {
      setErrorMessage('You must be signed in to save your profile.');
      return;
    }

    if (!canContinue()) {
      setErrorMessage('Complete this step before continuing.');
      return;
    }

    setErrorMessage('');
    setIsSaving(true);

    const { error } = await supabase.from('profiles').upsert(buildPayload(step));

    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (step === totalSteps) {
      router.replace('/(tabs)/shop');
      return;
    }

    setStep((current) => current + 1);
  }

  function goBack() {
    setErrorMessage('');
    setStep((current) => Math.max(current - 1, 1));
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
        <Text style={styles.eyebrow}>Step {step} of {totalSteps}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(step / totalSteps) * 100}%` }]} />
        </View>
      </View>

      {step === 1 ? (
        <StepPanel title="Select your gender">
          <OptionGrid
            options={genderOptions}
            selectedValues={[gender]}
            onSelect={(option) => setGender(option)}
          />
        </StepPanel>
      ) : null}

      {step === 2 ? (
        <StepPanel title="Select your styles">
          <OptionGrid
            options={styleOptions}
            selectedValues={preferredStyles}
            onSelect={toggleStyle}
          />
        </StepPanel>
      ) : null}

      {step === 3 ? (
        <StepPanel title="Select your clothing sizes">
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
        </StepPanel>
      ) : null}

      {step === 4 ? (
        <StepPanel title="Select your shoe size">
          <OptionGrid
            options={shoeSizeOptions.map(String)}
            selectedValues={[sizes.shoes]}
            onSelect={(option) => updateSize('shoes', option)}
          />
        </StepPanel>
      ) : null}

      {step === 5 ? (
        <StepPanel title="Select your outfit budget">
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
        </StepPanel>
      ) : null}

      {step === 6 ? (
        <StepPanel title="Upload your picture">
          {profilePicture ? (
            <Image
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
        </StepPanel>
      ) : null}

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          disabled={step === 1 || isSaving}
          onPress={goBack}
          style={[styles.backButton, (step === 1 || isSaving) && styles.buttonDisabled]}>
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Pressable
          disabled={isSaving || !canContinue()}
          onPress={saveStep}
          style={[styles.button, (isSaving || !canContinue()) && styles.buttonDisabled]}>
          {isSaving ? (
            <ActivityIndicator color={theme.surface} />
          ) : (
            <Text style={styles.buttonText}>{step === totalSteps ? 'Finish' : 'Continue'}</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

function StepPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.title}>{title}</Text>
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
  actions: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  backButtonText: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
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
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: theme.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    gap: 18,
    padding: 24,
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
  eyebrow: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  header: {
    backgroundColor: 'transparent',
    gap: 10,
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
    marginTop: 8,
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
  panel: {
    backgroundColor: 'transparent',
    gap: 16,
  },
  profileImage: {
    aspectRatio: 3 / 4,
    borderRadius: 8,
    width: '100%',
  },
  progressFill: {
    backgroundColor: theme.cta,
    borderRadius: 999,
    height: '100%',
  },
  progressTrack: {
    backgroundColor: theme.border,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderColor: theme.cta,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: theme.cta,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
});
