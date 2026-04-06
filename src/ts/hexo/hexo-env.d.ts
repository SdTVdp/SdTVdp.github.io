declare type HexoCollection<T> =
  | T[]
  | {
      data?: T[];
      length?: number;
      sort?: (orderBy: string) => T[];
      toArray?: () => T[];
      reduce?: <R>(callback: (result: R, item: T) => R, initial: R) => R;
      [Symbol.iterator]?: () => Iterator<T>;
    };

declare interface HexoRenderable {
  title?: string;
  path?: string;
  source?: string;
  content?: string;
  excerpt?: string;
  description?: string;
  cover?: string | string[] | false;
  top_img?: string | string[] | false;
  sticky?: boolean | number | string;
  top?: boolean | number | string;
  pin?: boolean | number | string;
  published?: boolean;
  date?: { valueOf?: () => number; format?: (pattern: string) => string } | number;
  categories?: HexoCollection<{ name: string }>;
  tags?: HexoCollection<{ name: string }>;
  set?: (key: string, value: unknown) => void;
  save?: () => Promise<unknown>;
  setCategories?: (categories: string[]) => Promise<unknown>;
  [key: string]: unknown;
}

declare interface HexoLocals {
  posts?: HexoCollection<HexoRenderable>;
  pages?: HexoCollection<HexoRenderable>;
  categories?: HexoCollection<{
    name: string;
    path: string;
    length: number;
    posts: HexoCollection<HexoRenderable> & { sort?: (orderBy: string) => HexoRenderable[] };
  }>;
  [key: string]: unknown;
}

declare interface HexoContext {
  config: Record<string, any>;
  theme: { config: Record<string, any> };
  base_dir: string;
  source_dir: string;
  extend: {
    filter: {
      register: (name: string, handler: (...args: any[]) => any) => void;
    };
    generator: {
      register: (name: string, handler: (...args: any[]) => any) => void;
    };
    helper: {
      register: (name: string, handler: (...args: any[]) => any) => void;
    };
  };
  locals: {
    get: <T = unknown>(name: string) => T;
  };
  log: {
    warn: (message: string) => void;
    info: (message: string) => void;
  };
  on: (event: string, handler: (...args: any[]) => any) => void;
}

declare const hexo: HexoContext;

declare module "hexo-pagination" {
  const pagination: (base: string, posts: unknown, options: Record<string, unknown>) => unknown[];
  export = pagination;
}

declare var __sdtvdpHexoContext: HexoContext | undefined;

