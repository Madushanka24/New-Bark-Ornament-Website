
/* ==========================================
   BARK ORNAMENT - PRODUCT DATA
   File: src/lib/products.ts

   Development catalogue:
   - Category structure based on approved scope
   - Example products are NOT verified inventory
   - No public prices
   - Replace development records with CMS data
   ========================================== */

/* ==========================================
   TYPES
   ========================================== */

export type ProductCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
  shortDescription: string;
  description: string;
  materials: string[];
  sizes: string[];
  finishes: string[];
  customizable: boolean;
  images: string[];
  featured: boolean;
  status: "draft" | "published";
  isDemo: boolean;
};

/* ==========================================
   TEN PRODUCT CATEGORIES
   ========================================== */

export const productCategories: ProductCategory[] = [
  {
    id: "cat-001",
    name: "Printing & Corporate Stationery",
    slug: "printing-stationery",
    description:
      "Customized printing and stationery solutions for hospitality businesses.",
    image: null,
  },
  {
    id: "cat-002",
    name: "Menus & Guest Service Products",
    slug: "menus-guest-service",
    description:
      "Menu presentation and guest service products for hotels and resorts.",
    image: null,
  },
  {
    id: "cat-003",
    name: "Tags, Stickers & Cards",
    slug: "tags-stickers-cards",
    description:
      "Custom tags, stickers, labels and printed cards.",
    image: null,
  },
  {
    id: "cat-004",
    name: "Bags & Packaging",
    slug: "bags-packaging",
    description:
      "Customized bags and packaging products for hospitality applications.",
    image: null,
  },
  {
    id: "cat-005",
    name: "Wooden Products & Crafts",
    slug: "wooden-products",
    description:
      "Wooden accessories, decorative products and craft solutions.",
    image: null,
  },
  {
    id: "cat-006",
    name: "Cane & Natural Products",
    slug: "cane-natural",
    description:
      "Cane and natural-material product collections.",
    image: null,
  },
  {
    id: "cat-007",
    name: "Ceramic, Pottery & Laksha",
    slug: "ceramic-pottery-laksha",
    description:
      "Decorative and functional ceramic, pottery and Laksha products.",
    image: null,
  },
  {
    id: "cat-008",
    name: "Candles & Party Products",
    slug: "candles-party",
    description:
      "Decorative candles and selected celebration products.",
    image: null,
  },
  {
    id: "cat-009",
    name: "Gifts & Promotional Products",
    slug: "gifts-promotional",
    description:
      "Customized gifts and promotional products for hospitality brands.",
    image: null,
  },
  {
    id: "cat-010",
    name: "Laundry & Hotel Operations",
    slug: "laundry-operations",
    description:
      "Selected supplies for hotel operations and laundry requirements.",
    image: null,
  },
];

/* ==========================================
   DEVELOPMENT PRODUCT RECORDS

   These are sample catalogue concepts.
   They are not confirmed Bark Ornament stock.
   Actual specifications must be verified.
   ========================================== */

export const products: Product[] = [
  {
    id: "demo-001",
    name: "Customized Letterhead",
    slug: "customized-letterhead",
    categorySlug: "printing-stationery",
    shortDescription:
      "Example of branded corporate stationery.",
    description:
      "A demonstration listing for customized hotel or corporate letterhead. Materials, sizes and finishes are subject to confirmation.",
    materials: [],
    sizes: [],
    finishes: [],
    customizable: true,
    images: [],
    featured: true,
    status: "draft",
    isDemo: true,
  },
  {
    id: "demo-002",
    name: "Hotel Menu Cover",
    slug: "hotel-menu-cover",
    categorySlug: "menus-guest-service",
    shortDescription:
      "Example of a customized menu presentation product.",
    description:
      "A demonstration menu cover listing. Cover materials, dimensions, binding methods and branding options require confirmation.",
    materials: [],
    sizes: [],
    finishes: [],
    customizable: true,
    images: [],
    featured: true,
    status: "draft",
    isDemo: true,
  },
  {
    id: "demo-003",
    name: "Branded Luggage Tag",
    slug: "branded-luggage-tag",
    categorySlug: "tags-stickers-cards",
    shortDescription:
      "Example of a customized hospitality tag.",
    description:
      "A demonstration luggage tag listing for a hospitality product catalogue.",
    materials: [],
    sizes: [],
    finishes: [],
    customizable: true,
    images: [],
    featured: false,
    status: "draft",
    isDemo: true,
  },
  {
    id: "demo-004",
    name: "Customized Paper Bag",
    slug: "customized-paper-bag",
    categorySlug: "bags-packaging",
    shortDescription:
      "Example of branded packaging for hospitality use.",
    description:
      "A demonstration paper bag listing. Paper type, dimensions, handles and printing options require confirmation.",
    materials: [],
    sizes: [],
    finishes: [],
    customizable: true,
    images: [],
    featured: true,
    status: "draft",
    isDemo: true,
  },
  {
    id: "demo-005",
    name: "Wooden Welcome Sign",
    slug: "wooden-welcome-sign",
    categorySlug: "wooden-products",
    shortDescription:
      "Example of a personalized wooden hospitality sign.",
    description:
      "A demonstration wooden welcome sign listing. Wood type, dimensions and decorative treatment are not yet specified.",
    materials: [],
    sizes: [],
    finishes: [],
    customizable: true,
    images: [],
    featured: true,
    status: "draft",
    isDemo: true,
  },
  {
    id: "demo-006",
    name: "Cane Basket",
    slug: "cane-basket",
    categorySlug: "cane-natural",
    shortDescription:
      "Example of a natural-material basket.",
    description:
      "A demonstration cane basket listing. Design, material composition and dimensions require confirmation.",
    materials: [],
    sizes: [],
    finishes: [],
    customizable: false,
    images: [],
    featured: false,
    status: "draft",
    isDemo: true,
  },
  {
    id: "demo-007",
    name: "Decorative Ceramic Item",
    slug: "decorative-ceramic-item",
    categorySlug: "ceramic-pottery-laksha",
    shortDescription:
      "Example of a ceramic decorative product.",
    description:
      "A demonstration ceramic product listing. Exact product design and technical specifications are not yet established.",
    materials: [],
    sizes: [],
    finishes: [],
    customizable: false,
    images: [],
    featured: false,
    status: "draft",
    isDemo: true,
  },
  {
    id: "demo-008",
    name: "Decorative Candle",
    slug: "decorative-candle",
    categorySlug: "candles-party",
    shortDescription:
      "Example of a decorative hospitality candle.",
    description:
      "A demonstration candle listing. Wax type, dimensions and other specifications require confirmation.",
    materials: [],
    sizes: [],
    finishes: [],
    customizable: false,
    images: [],
    featured: false,
    status: "draft",
    isDemo: true,
  },
  {
    id: "demo-009",
    name: "Branded Gift Box",
    slug: "branded-gift-box",
    categorySlug: "gifts-promotional",
    shortDescription:
      "Example of customized gift packaging.",
    description:
      "A demonstration branded gift box listing for hospitality promotional applications.",
    materials: [],
    sizes: [],
    finishes: [],
    customizable: true,
    images: [],
    featured: true,
    status: "draft",
    isDemo: true,
  },
  {
    id: "demo-010",
    name: "Laundry Bag",
    slug: "laundry-bag",
    categorySlug: "laundry-operations",
    shortDescription:
      "Example of a laundry-related hotel product.",
    description:
      "A demonstration hotel laundry bag listing. Material and production specifications require confirmation.",
    materials: [],
    sizes: [],
    finishes: [],
    customizable: true,
    images: [],
    featured: false,
    status: "draft",
    isDemo: true,
  },
];

/* ==========================================
   CATEGORY FUNCTIONS
   ========================================== */

export function getAllCategories(): ProductCategory[] {
  return productCategories;
}

export function getCategoryBySlug(
  slug: string
): ProductCategory | undefined {
  return productCategories.find(
    (category) => category.slug === slug
  );
}

/* ==========================================
   PRODUCT FUNCTIONS

   Development previews are shown only when
   explicitly requested by the catalogue UI.
   ========================================== */

export function getAllProducts(
  includeDrafts = false
): Product[] {
  return products.filter(
    (product) =>
      includeDrafts || product.status === "published"
  );
}

export function getProductBySlug(
  slug: string,
  includeDrafts = false
): Product | undefined {
  return getAllProducts(includeDrafts).find(
    (product) => product.slug === slug
  );
}

export function getProductsByCategory(
  categorySlug: string,
  includeDrafts = false
): Product[] {
  return getAllProducts(includeDrafts).filter(
    (product) =>
      product.categorySlug === categorySlug
  );
}

export function getFeaturedProducts(
  includeDrafts = false
): Product[] {
  return getAllProducts(includeDrafts).filter(
    (product) => product.featured
  );
}

/* ==========================================
   SEARCH
   ========================================== */

export function searchProducts(
  query: string,
  includeDrafts = false
): Product[] {
  const searchTerm = query.trim().toLowerCase();

  if (!searchTerm) {
    return getAllProducts(includeDrafts);
  }

  return getAllProducts(includeDrafts).filter(
    (product) => {
      const category = getCategoryBySlug(
        product.categorySlug
      );

      const searchableText = [
        product.name,
        product.shortDescription,
        product.description,
        category?.name ?? "",
        ...product.materials,
        ...product.sizes,
        ...product.finishes,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(searchTerm);
    }
  );
}

/* ==========================================
   RELATED PRODUCTS
   ========================================== */

export function getRelatedProducts(
  product: Product,
  limit = 4,
  includeDrafts = false
): Product[] {
  return getProductsByCategory(
    product.categorySlug,
    includeDrafts
  )
    .filter((item) => item.id !== product.id)
    .slice(0, limit);
}

/* ==========================================
   SORTING
   ========================================== */

export type ProductSort =
  | "name-asc"
  | "name-desc";

export function sortProducts(
  items: Product[],
  sortBy: ProductSort = "name-asc"
): Product[] {
  return [...items].sort((a, b) => {
    if (sortBy === "name-desc") {
      return b.name.localeCompare(a.name);
    }

    return a.name.localeCompare(b.name);
  });
}
