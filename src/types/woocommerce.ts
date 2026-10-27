import type { WithLinks } from './api';

export interface WcStoreImage {
  id: number;
  src: string;
  thumbnail: string;
  srcset?: string;
  name?: string;
  alt?: string;
}

export interface WcStoreProduct extends WithLinks {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  sku?: string;
  short_description?: string;
  description?: string;
  on_sale?: boolean;
  prices: {
    price: string;
    regular_price: string;
    sale_price?: string;
    currency_code?: string;
    currency_symbol?: string;
  };
  images?: WcStoreImage[];
  categories?: { id: number; name: string; slug: string; link?: string }[];
  tags?: { id: number; name: string; slug: string; link?: string }[];
  attributes?: { id: number; name: string; taxonomy?: string; terms: { id: number; name: string; slug: string }[] }[];
  variations?: { id: number; attributes: { name: string; value: string }[] }[];
  is_in_stock?: boolean;
  stock_availability?: { text: string; class: string };
}
