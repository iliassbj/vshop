const supabaseProductsUrl = 'https://kqjjiipmtjvjuretmypg.supabase.co/functions/v1/products';

function getSupabaseProductsKey() {
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!key) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable.');
  }

  return key;
}

export type DummyProductReview = {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
  reviewerEmail: string;
};

export type DummyProduct = {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  tags: string[];
  brand?: string;
  sku: string;
  warrantyInformation: string;
  shippingInformation: string;
  availabilityStatus: string;
  reviews: DummyProductReview[];
  returnPolicy: string;
  minimumOrderQuantity: number;
  images: string[];
  thumbnail: string;
};

export type DummyProductCategory = {
  slug: string;
  name: string;
  url: string;
};

type ProductListResponse = {
  products: DummyProduct[];
  total: number;
  skip: number;
  limit: number;
};

type SupabaseProductsResponse<T> = {
  source: 'supabase-proxy';
  type: 'categories' | 'product' | 'products';
  data: T;
};

async function fetchJson<T>(url: string): Promise<T> {
  const supabaseProductsKey = getSupabaseProductsKey();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${supabaseProductsKey}`,
      apikey: supabaseProductsKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Product request failed with status ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

export function fetchProductCategories() {
  const params = new URLSearchParams({ type: 'categories' });

  return fetchJson<SupabaseProductsResponse<DummyProductCategory[]>>(
    `${supabaseProductsUrl}?${params.toString()}`,
  ).then((response) => response.data);
}

export function fetchProductsByCategory(categorySlug: string) {
  const params = new URLSearchParams({ type: 'products', category: categorySlug });

  return fetchJson<SupabaseProductsResponse<ProductListResponse>>(
    `${supabaseProductsUrl}?${params.toString()}`,
  ).then((response) => response.data);
}

export function fetchProductById(id: string | string[] | undefined) {
  const productId = Array.isArray(id) ? id[0] : id;

  if (!productId) {
    throw new Error('Missing product id.');
  }

  const params = new URLSearchParams({ type: 'product', id: productId });

  return fetchJson<SupabaseProductsResponse<DummyProduct>>(
    `${supabaseProductsUrl}?${params.toString()}`,
  ).then((response) => response.data);
}
