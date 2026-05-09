import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';

const theme = Colors.palette;

WebBrowser.maybeCompleteAuthSession();

function getOAuthParams(url: string) {
  const parsedUrl = new URL(url);
  const params = new URLSearchParams(parsedUrl.search);

  if (parsedUrl.hash) {
    new URLSearchParams(parsedUrl.hash.replace(/^#/, '')).forEach((value, key) => {
      params.set(key, value);
    });
  }

  return params;
}

export default function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingAction, setLoadingAction] = useState<'sign-in' | 'sign-up' | 'google' | null>(
    null,
  );

  const isLoading = loadingAction !== null;

  async function handleAuth(action: 'sign-in' | 'sign-up') {
    setErrorMessage('');
    setLoadingAction(action);

    const credentials = {
      email: email.trim(),
      password,
    };

    const { error } =
      action === 'sign-in'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);

    setLoadingAction(null);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.replace('/onboarding');
  }

  async function handleGoogleSignIn() {
    setErrorMessage('');
    setLoadingAction('google');

    try {
      const redirectTo = AuthSession.makeRedirectUri({
        scheme: 'vshop',
      });
      console.log('redirectTo:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (!data.url) {
        setErrorMessage('Unable to start Google sign-in.');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type !== 'success') {
        return;
      }

      const params = getOAuthParams(result.url);
      const oauthError = params.get('error_description') ?? params.get('error');

      if (oauthError) {
        setErrorMessage(oauthError);
        return;
      }

      const code = params.get('code');

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          setErrorMessage(exchangeError.message);
          return;
        }
      } else {
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken || !refreshToken) {
          setErrorMessage('Google sign-in did not return a session.');
          return;
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          setErrorMessage(sessionError.message);
          return;
        }
      }

      router.replace('/onboarding');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to sign in with Google.');
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in to vshop</Text>
      <TextInput
        autoCapitalize="none"
        autoComplete="email"
        editable={!isLoading}
        inputMode="email"
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={theme.textSecondary}
        selectionColor={theme.cta}
        style={styles.input}
        value={email}
      />
      <TextInput
        autoCapitalize="none"
        editable={!isLoading}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={theme.textSecondary}
        selectionColor={theme.cta}
        secureTextEntry
        style={styles.input}
        value={password}
      />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      <Pressable
        disabled={isLoading}
        onPress={() => handleAuth('sign-in')}
        style={({ pressed }) => [styles.button, (pressed || isLoading) && styles.buttonDisabled]}>
        {loadingAction === 'sign-in' ? (
          <ActivityIndicator color={theme.surface} />
        ) : (
          <Text style={styles.buttonText}>Sign in</Text>
        )}
      </Pressable>
      <Pressable
        disabled={isLoading}
        onPress={() => handleAuth('sign-up')}
        style={({ pressed }) => [
          styles.button,
          styles.secondaryButton,
          (pressed || isLoading) && styles.buttonDisabled,
        ]}>
        {loadingAction === 'sign-up' ? (
          <ActivityIndicator color={theme.cta} />
        ) : (
          <Text style={styles.secondaryButtonText}>Sign up</Text>
        )}
      </Pressable>
      <Pressable
        disabled={isLoading}
        onPress={handleGoogleSignIn}
        style={({ pressed }) => [
          styles.button,
          styles.googleButton,
          (pressed || isLoading) && styles.buttonDisabled,
        ]}>
        {loadingAction === 'google' ? (
          <ActivityIndicator color={theme.textPrimary} />
        ) : (
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  error: {
    color: theme.discountRed,
    fontSize: 16,
  },
  button: {
    alignItems: 'center',
    backgroundColor: theme.cta,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButton: {
    backgroundColor: theme.surface,
    borderColor: theme.cta,
    borderWidth: 1,
  },
  googleButton: {
    backgroundColor: theme.surface,
    borderColor: theme.border,
    borderWidth: 1,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: theme.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: theme.cta,
    fontSize: 16,
    fontWeight: '600',
  },
  googleButtonText: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
