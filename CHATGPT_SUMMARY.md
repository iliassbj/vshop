# vshop Project Summary

## Overview

`vshop` is an Expo React Native app built with TypeScript and Expo Router. The project is structured around an MVP virtual shopping flow with auth, onboarding, tabbed browsing, product details, and virtual try-on.

The app uses Expo Router typed routes and starts at `/auth`.

## Tech Stack

- Expo SDK 54
- React Native 0.81
- React 19
- TypeScript
- Expo Router
- React Navigation

## App Config

- Expo app name: `vshop`
- Expo slug: `vshop`
- URL scheme: `vshop`
- Orientation: portrait
- User interface style: automatic
- New Architecture: enabled
- Expo Router plugin: enabled
- Typed routes: enabled

## Current App Structure

The main route tree lives under `app/`:

```text
app/
  _layout.tsx
  index.tsx
  auth/
    index.tsx
  onboarding/
    index.tsx
  (tabs)/
    _layout.tsx
    shop.tsx
    explore.tsx
    profile.tsx
  product/
    [id].tsx
  try-on/
    [productId].tsx
```

## Routes

- `/` redirects to `/auth`
- `/auth` is the authentication entry point
- `/onboarding` is the first-run setup screen
- `/(tabs)/shop` is the main product list tab
- `/(tabs)/explore` is the category and discovery tab
- `/(tabs)/profile` is the account and preferences tab
- `/product/[id]` is the dynamic product detail route
- `/try-on/[productId]` is the dynamic virtual try-on route

## MVP Flow

1. User lands on `/auth`.
2. Auth links to `/onboarding`.
3. Onboarding links into the shop tab.
4. Shop displays mock products from `constants/mockProducts.ts`.
5. Product rows open `/product/[id]`.
6. Product detail links to `/try-on/[productId]`.
7. Bottom tabs provide shop, explore, and profile navigation.

## Notable Files

- `app/_layout.tsx` defines the root navigation stack.
- `app/(tabs)/_layout.tsx` defines bottom tabs for shop, explore, and profile.
- `app/index.tsx` redirects users to auth.
- `app.json` uses `vshop` for the Expo app name and slug.
- `constants/mockProducts.ts` contains typed mock product data used by shop, explore, product detail, and try-on screens.
- `components/ExternalLink.tsx` had a stale generated `@ts-expect-error` removed so TypeScript validation passes.

## Commands

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run start
```

Start web:

```bash
npm run web
```

Type-check:

```bash
npx tsc --noEmit
```

## Current Validation

`npx tsc --noEmit` passes.

## Notes

- The generated dependency install reported 14 moderate npm audit vulnerabilities.
- `expo-dev-server.log` may exist locally from a prior Expo web server run.
