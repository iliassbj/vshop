# vShop

vShop is an Expo React Native shopping app with Supabase authentication, profile onboarding, product browsing, and a virtual try-on Explore flow.

## Features

- Email/password and Google OAuth authentication through Supabase.
- Onboarding flow for profile preferences, sizes, budget, and profile picture.
- Shop tab with product listing by category.
- Explore tab with full-screen virtual try-on previews.
- Dedicated Explore filter screen.
- Product detail and try-on routes.
- Supabase Edge Functions used as the backend gateway for products and virtual try-on.

## Tech Stack

- Expo 54
- React Native 0.81
- Expo Router
- Supabase JS
- TypeScript

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

Start the app:

```bash
npm run start
```

Run on a specific platform:

```bash
npm run android
npm run ios
npm run web
```

## Scripts

- `npm run start` starts the Expo dev server.
- `npm run android` starts Expo for Android.
- `npm run ios` starts Expo for iOS.
- `npm run web` starts Expo for web.

## Project Structure

- `app/` contains Expo Router screens and layouts.
- `app/(tabs)/` contains the Shop, Explore, and Profile tabs.
- `app/explore-filters.tsx` contains the dedicated Explore filter screen.
- `app/product/[id].tsx` contains the product detail route.
- `app/try-on/[productId].tsx` contains the try-on route.
- `components/` contains shared themed UI wrappers and starter components.
- `constants/Colors.ts` contains the shared color palette.
- `lib/supabase.ts` initializes the Supabase client.
- `lib/products.ts` fetches product data through the Supabase products Edge Function.
- `lib/tryOn.ts` calls the authenticated Supabase try-on Edge Function.
- `lib/exploreFilters.ts` defines the Explore filter options.
- `supabase/` contains SQL setup files for the profile table.

## Data Flow

Product data is fetched through:

```text
{EXPO_PUBLIC_SUPABASE_URL}/functions/v1/products
```

The products helper supports:

- `type=categories`
- `type=products&category=...`
- `type=product&id=...`

Virtual try-on is requested through:

```text
{EXPO_PUBLIC_SUPABASE_URL}/functions/v1/try-on
```

The try-on request is authenticated with the current Supabase session access token and sends:

```json
{
  "productImageUrl": "https://...",
  "sampleCount": 1
}
```

The app expects the try-on function to return a generated image, including the Google Vertex AI format:

```json
{
  "source": "google-vertex-ai-virtual-try-on",
  "data": {
    "predictions": [
      {
        "mimeType": "image/png",
        "bytesBase64Encoded": "..."
      }
    ]
  }
}
```

## Supabase Setup

Apply the SQL files in `supabase/` to create and update the `profiles` table:

- `supabase/profiles.sql`
- `supabase/profiles_2.sql`
- `supabase/profiles_3.sql`

The app uses Supabase auth for sessions and row-level secured profile data.

## Verification

Run TypeScript validation:

```bash
npx tsc --noEmit
```
