export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  description: string;
};

export const mockProducts: Product[] = [
  {
    id: 'linen-shirt',
    name: 'Relaxed Linen Shirt',
    brand: 'Northline',
    category: 'Tops',
    price: 68,
    description: 'A breathable everyday shirt with a relaxed fit.',
  },
  {
    id: 'wide-leg-denim',
    name: 'Wide Leg Denim',
    brand: 'Aster',
    category: 'Bottoms',
    price: 94,
    description: 'High-rise denim with a clean wide-leg silhouette.',
  },
  {
    id: 'city-jacket',
    name: 'City Jacket',
    brand: 'Vela',
    category: 'Outerwear',
    price: 128,
    description: 'A lightweight jacket for layering across seasons.',
  },
];

export function getProductById(id: string | string[] | undefined) {
  return mockProducts.find((product) => product.id === id);
}
