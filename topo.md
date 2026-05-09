# vShop Project Topology

Last updated: 2026-05-07

This document is the living topology map for the project. Keep it updated as files are added, removed, or repurposed.

## Architecture Overview

vShop is an Expo React Native application using Expo Router for file-based navigation. The app currently has a small shopping flow backed by DummyJSON product data and a Supabase-backed authentication/profile setup flow.

Primary architectural pieces:

- `app/` contains all screens and navigation layouts. Expo Router turns these files into routes.
- `components/` contains reusable UI wrappers and starter helper components.
- `constants/` contains global styling tokens and legacy mock product data.
- `lib/` contains app service clients, currently the Supabase client.
- `supabase/` contains database setup SQL for the backend profile table.
- `assets/` contains fonts and app image assets used by Expo.

## Runtime Flow

1. `package.json` points Expo to `expo-router/entry`, so Expo Router owns the app entrypoint.
2. `app/_layout.tsx` loads fonts, keeps the splash screen visible until assets are ready, configures the React Navigation theme, and declares the root stack routes.
3. `app/index.tsx` redirects the root route to `/auth`.
4. `app/auth/index.tsx` signs users in or up through Supabase email/password auth or Google OAuth.
5. Successful auth routes users to `/onboarding`.
6. `app/onboarding/index.tsx` runs a six-step onboarding wizard, resumes from `profile_completion_step`, and upserts each completed step into the Supabase `profiles` table.
7. After onboarding, users enter the tab navigator at `/(tabs)/shop`.
8. Shop and Explore fetch product categories from DummyJSON. Shop displays products for the selected category, Explore displays one featured product for the selected category, and product detail/try-on fetch individual products by ID.

## Route Map

- `/` -> `app/index.tsx`; redirects to `/auth`.
- `/auth` -> `app/auth/index.tsx`; sign in, sign up, and Google OAuth.
- `/onboarding` -> `app/onboarding/index.tsx`; profile/preferences setup.
- `/(tabs)/shop` -> `app/(tabs)/shop.tsx`; product list.
- `/(tabs)/explore` -> `app/(tabs)/explore.tsx`; category browsing and featured product link.
- `/(tabs)/profile` -> `app/(tabs)/profile.tsx`; editable profile settings.
- `/product/[id]` -> `app/product/[id].tsx`; product detail page by DummyJSON product id.
- `/try-on/[productId]` -> `app/try-on/[productId].tsx`; placeholder virtual try-on page.
- unmatched routes -> `app/+not-found.tsx`.

## Data And Services

- Supabase auth is initialized in `lib/supabase.ts` with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- The onboarding screen writes profile data and progress to the `profiles` table.
- `supabase/profiles.sql` defines the `profiles` table, row-level security policies, and an `updated_at` trigger.
- `supabase/profiles_2.sql` adds temporary base64 profile-picture columns to `profiles`.
- `supabase/profiles_3.sql` adds `profile_completion_step` so onboarding can resume from the last completed step.
- Shop product browsing uses `lib/products.ts` to fetch `https://dummyjson.com/products/categories`, then fetches the selected category from `https://dummyjson.com/products/category/[slug]`.
- Product detail and try-on use `lib/products.ts` to fetch individual DummyJSON products by ID.
- `constants/mockProducts.ts` is legacy mock data and is not used by the current Shop or Explore flows.

## File Inventory

### Root Files

- `.env`  
  Local environment variables. It should hold actual Supabase values. Do not document or commit secret values here.

- `.env.example`  
  Template for required public Expo environment variables: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

- `.gitignore`  
  Ignores dependencies, Expo build output, generated native folders, debug logs, local env variants, and TypeScript build info.

- `app.json`  
  Expo configuration: app name/slug, scheme `vshop`, app icons/splash assets, native platform options, web bundler/static output, plugins, and typed route experiment.

- `CHATGPT_SUMMARY.md`  
  Existing project summary/context note. Not part of runtime code.

- `expo-dev-server.log`  
  Local Expo dev server log. Useful for debugging local runs, not part of runtime source.

- `expo-env.d.ts`  
  Generated Expo TypeScript reference file. It is ignored by git and should not be edited manually.

- `package.json`  
  Project package manifest. Defines Expo scripts (`start`, `android`, `ios`, `web`), Expo Router entrypoint, runtime dependencies, and TypeScript/test-related dev dependencies.

- `package-lock.json`  
  npm lockfile pinning the exact installed dependency tree.

- `theme.md`  
  Human-readable list of the project color palette. The executable version of these tokens lives in `constants/Colors.ts`.

- `topo.md`  
  This architecture and file topology document.

- `tsconfig.json`  
  TypeScript config extending Expo defaults, enabling `strict`, adding the `@/*` path alias, and including Expo generated types.

### `app/`

- `app/_layout.tsx`  
  Root layout for Expo Router. Loads `SpaceMono` and FontAwesome fonts, manages splash-screen hiding, exports the route error boundary, defines the initial route setting, builds the navigation theme from `Colors`, and declares root stack screens.

- `app/+html.tsx`  
  Web-only root HTML wrapper. Sets document metadata, resets ScrollView web styles, and injects a stable body background color.

- `app/+not-found.tsx`  
  Fallback screen for unknown routes. Sets the stack title to `Oops!` and links users back to `/`.

- `app/index.tsx`  
  Root route component. Immediately redirects users to `/auth`.

### `app/auth/`

- `app/auth/index.tsx`  
  Authentication screen. Contains email/password sign-in and sign-up, Google OAuth through Supabase plus Expo WebBrowser/AuthSession, OAuth URL parameter parsing, loading/error state, and navigation to onboarding after success.

### `app/onboarding/`

- `app/onboarding/index.tsx`  
  Multi-step profile setup screen. Lets users choose gender, multiple styles, single-select top/bottom sizes, shoe size, min/max outfit budget inputs, and a profile picture through `expo-image-picker`. Loads existing profile data, resumes from `profile_completion_step`, upserts each completed step, handles save errors, and navigates to `/(tabs)/shop` when complete.

### `app/(tabs)/`

- `app/(tabs)/_layout.tsx`  
  Tab navigator layout. Defines Shop, Explore, and Profile tabs with FontAwesome icons and themed header/tab bar styling.

- `app/(tabs)/shop.tsx`  
  Shop tab. Fetches DummyJSON product categories, shows a dropdown category selector, fetches products for the selected category, renders them in a two-column `FlatList` with remote thumbnails, supports pull-to-refresh, and links each row to `/product/[id]`.

- `app/(tabs)/explore.tsx`  
  Explore tab. Fetches DummyJSON product categories, shows a dropdown category selector, fetches products for the selected category, displays one image-first featured product at a time, and uses vertical swipe gestures on the card to cycle through products in that category.

- `app/(tabs)/profile.tsx`  
  Editable profile tab. Loads the signed-in user's profile from Supabase, lets the user modify picture, gender, styles, sizes, shoe size, and budget locally, and persists changes only when the `Apply` button is pressed.

### `app/product/`

- `app/product/[id].tsx`  
  Product detail screen. Reads the `id` route param, fetches the product from DummyJSON, shows product metadata and thumbnail, links to try-on, and handles loading/error states.

### `app/try-on/`

- `app/try-on/[productId].tsx`  
  Try-on screen placeholder. Reads `productId`, fetches the product from DummyJSON, displays the product thumbnail in the preview area, and links back to the product or shop depending on lookup success.

### `components/`

- `components/Themed.tsx`  
  Shared themed `Text` and `View` wrappers plus `useThemeColor`. Reads the current color scheme and maps theme color names to `constants/Colors.ts`.

- `components/StyledText.tsx`  
  Defines `MonoText`, a themed text component using the loaded `SpaceMono` font.

- `components/ExternalLink.tsx`  
  Wrapper around Expo Router `Link` for external URLs. On native platforms, it prevents default navigation and opens links in an in-app browser.

- `components/EditScreenInfo.tsx`  
  Starter/template helper component showing where to edit a screen and linking to Expo help. It is currently not used by the main vShop screens.

- `components/useColorScheme.ts`  
  Native color-scheme hook export from React Native.

- `components/useColorScheme.web.ts`  
  Web-specific color-scheme hook that always returns `light` to keep server-rendered and client-rendered styles consistent.

- `components/useClientOnlyValue.ts`  
  Native implementation of a helper that returns the client value immediately.

- `components/useClientOnlyValue.web.ts`  
  Web implementation of the same helper. Returns the server value first, then switches to the client value after mount.

### `components/__tests__/`

- `components/__tests__/StyledText-test.js`  
  Snapshot-style test for `MonoText` using `react-test-renderer`.

### `constants/`

- `constants/Colors.ts`  
  Central executable color palette and light/dark theme token exports. Most screens import `Colors.palette` directly for local styles.

- `constants/mockProducts.ts`  
  Mock catalog data. Defines the `Product` type, three sample products, and `getProductById()` lookup helper.

### `lib/`

- `lib/supabase.ts`  
  Supabase client setup. Imports React Native URL polyfill, reads Expo public environment variables, throws if missing, and exports the configured client.

- `lib/products.ts`  
  DummyJSON product API helper. Defines product/category/review types, fetches the category list, fetches products by category slug, and fetches individual products by ID.

### `supabase/`

- `supabase/profiles.sql`  
  SQL migration/setup script for `public.profiles`. Creates profile columns, enables RLS, adds select/insert/update policies scoped to the current auth user, and maintains `updated_at` with a trigger.

- `supabase/profiles_2.sql`  
  Incremental profile schema migration. Adds `profile_picture_base64` for temporary base64 image storage and `profile_picture_mime_type` so the app can reconstruct the image data URI.

- `supabase/profiles_3.sql`  
  Incremental profile schema migration. Adds `profile_completion_step` with a 0-6 check constraint so onboarding can resume from the last completed step.

### `assets/`

- `assets/fonts/SpaceMono-Regular.ttf`  
  Font loaded in `app/_layout.tsx` and used by `MonoText`.

- `assets/images/icon.png`  
  Main app icon referenced by `app.json`.

- `assets/images/adaptive-icon.png`  
  Android adaptive icon foreground referenced by `app.json`.

- `assets/images/splash-icon.png`  
  Splash screen image referenced by `app.json`.

- `assets/images/favicon.png`  
  Web favicon referenced by `app.json`.

### `.vscode/`

- `.vscode/extensions.json`  
  Recommends the Expo VS Code extension.

- `.vscode/settings.json`  
  Configures explicit code actions on save for fixes, import organization, and member sorting.

## Generated Or Dependency Directories

- `.expo/`  
  Local Expo generated state/cache.

- `node_modules/`  
  Installed npm dependencies.

- `.git/`  
  Git repository metadata.

These directories should generally not be edited directly or described file-by-file in this document.

## Maintenance Notes

- Update this file whenever a route, shared component, service, data model, environment variable, or backend schema changes.
- When mock data is replaced by a real catalog API or Supabase tables, update the Data And Services section and the affected route notes.
- If auth/session routing changes, update Runtime Flow and Route Map together.

## Cleanup Candidates

These files are not part of the active app flow right now. Keep them only if they are useful as starter/reference code or are about to be used.

- `components/EditScreenInfo.tsx`  
  Unused by current routes. Expo starter helper component.

- `components/ExternalLink.tsx`  
  Only used by `EditScreenInfo.tsx`, which is currently unused.

- `components/StyledText.tsx`  
  Only used by `EditScreenInfo.tsx` and its test. The app loads `SpaceMono`, but current screens do not render `MonoText`.

- `components/__tests__/StyledText-test.js`  
  Tests `MonoText`, but there is no `test` script in `package.json` and `MonoText` is not used by the active app.

- `components/useClientOnlyValue.ts` and `components/useClientOnlyValue.web.ts`  
  Unused platform helper files from the starter template.

- `theme.md`  
  Duplicates the palette already encoded in `constants/Colors.ts`. Useful as human-readable design notes, but not used by code.

- `CHATGPT_SUMMARY.md`  
  Context/history document only. Not used by the app.

- `expo-dev-server.log`  
  Local dev log only. Not source code.

Potential duplication to resolve later:

- `constants/Colors.ts` defines `light` and `dark` themes with the same values. This is intentional if the app should look identical in both modes, but it is duplicated data.
- Screens use both themed wrappers from `components/Themed.tsx` and direct `Colors.palette` imports for local styles. That is workable, but future styling will be easier to maintain if the project settles on a consistent pattern.
