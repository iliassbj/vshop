create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  asin text unique,
  title text not null,
  brand text,
  category text default 'Dresses',
  gender text default 'Women',
  price numeric(10,2),
  currency text default 'EUR',
  availability text,
  image_url text,
  product_url text,
  color text,
  size text,
  features text[],
  source text default 'fake_seed',
  created_at timestamptz default now()
);