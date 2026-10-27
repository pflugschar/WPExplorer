import type { RenderedField, WithLinks } from './api';

export interface WordPressPost extends WithLinks {
  id: number;
  date: string;
  date_gmt?: string;
  modified: string;
  modified_gmt?: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: RenderedField;
  content?: RenderedField;
  excerpt?: RenderedField;
  author?: number;
  featured_media?: number;
  comment_status?: string;
  ping_status?: string;
  sticky?: boolean;
  categories?: number[];
  tags?: number[];
  parent?: number;
  menu_order?: number;
}

export type WordPressPage = WordPressPost;

export interface WordPressMedia extends WithLinks {
  id: number;
  date: string;
  modified: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: RenderedField;
  author?: number;
  caption?: RenderedField;
  description?: RenderedField;
  media_type: string;
  mime_type: string;
  source_url: string;
  post?: number;
  media_details?: {
    width?: number;
    height?: number;
    filesize?: number;
    file?: string;
    sizes?: Record<string, { source_url: string; width: number; height: number; mime_type: string }>;
  };
}

export interface WordPressTerm extends WithLinks {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent?: number;
}

export interface WordPressComment extends WithLinks {
  id: number;
  post: number;
  parent: number;
  author: number;
  author_name: string;
  author_url?: string;
  date: string;
  content: RenderedField;
  link: string;
  status: string;
  type: string;
  author_avatar_urls?: Record<string, string>;
}

export interface WordPressUser extends WithLinks {
  id: number;
  name: string;
  url?: string;
  description?: string;
  link: string;
  slug: string;
  avatar_urls?: Record<string, string>;
}

export interface WordPressPostType {
  name: string;
  slug: string;
  description?: string;
  hierarchical?: boolean;
  rest_base: string;
  rest_namespace?: string;
  taxonomies?: string[];
}

export interface WordPressTaxonomy {
  name: string;
  slug: string;
  description?: string;
  types?: string[];
  hierarchical?: boolean;
  rest_base: string;
  rest_namespace?: string;
}

export interface WordPressSearchResult {
  id: number;
  title: string;
  url: string;
  type: string;
  subtype: string;
  _links?: WordPressPost['_links'];
}
