import { supabase } from '@/lib/supabase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

if (!supabaseUrl) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL environment variable.');
}

const tryOnUrl = `${supabaseUrl}/functions/v1/try-on`;

type TryOnResponse = {
  data?: unknown;
  imageBase64?: string;
  imageUrl?: string;
  image_base64?: string;
  image_url?: string;
  output?: unknown;
  outputUrl?: string;
  result?: unknown;
  url?: string;
};

type VertexTryOnPrediction = {
  bytesBase64Encoded?: string;
  mimeType?: string;
};

function asImageUri(value: string, mimeType = 'image/png') {
  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  return `data:${mimeType};base64,${value}`;
}

function extractTryOnImageUri(payload: unknown): string {
  if (typeof payload === 'string') {
    return asImageUri(payload);
  }

  if (Array.isArray(payload)) {
    const image = payload.map(extractTryOnImageUri).find(Boolean);

    if (image) {
      return image;
    }
  }

  if (payload && typeof payload === 'object') {
    const response = payload as TryOnResponse;
    const predictions = (response.data as { predictions?: VertexTryOnPrediction[] } | undefined)?.predictions;

    if (Array.isArray(predictions)) {
      const prediction = predictions.find((item) => item.bytesBase64Encoded);

      if (prediction?.bytesBase64Encoded) {
        return asImageUri(prediction.bytesBase64Encoded, prediction.mimeType ?? 'image/png');
      }
    }

    const candidates = [
      response.imageBase64,
      response.imageUrl,
      response.image_base64,
      response.image_url,
      response.output,
      response.outputUrl,
      response.result,
      response.url,
      response.data,
    ];

    for (const candidate of candidates) {
      if (!candidate) {
        continue;
      }

      const image = extractTryOnImageUri(candidate);

      if (image) {
        return image;
      }
    }
  }

  return '';
}

export async function fetchTryOnImage({
  productImageUrl,
}: {
  productImageUrl: string;
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('User is not logged in.');
  }

  console.log('Try-on auth token:', {
    length: session.access_token.length,
    preview: `${session.access_token}`,
  });

  const response = await fetch(tryOnUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productImageUrl,
      sampleCount: 1,
    }),
  });

  const data = (await response.json()) as unknown;

  if (!response.ok) {
    const errorMessage =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Virtual try-on failed.';

    throw new Error(errorMessage);
  }

  const imageUri = extractTryOnImageUri(data);

  if (!imageUri) {
    throw new Error('Try-on response did not include an image.');
  }

  return imageUri;
}
