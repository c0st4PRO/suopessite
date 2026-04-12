export interface ProductColor {
  name: string;
  hex: string;
  inStock: boolean;
  imageIndex?: number;
  sizeStock?: { [size: string]: boolean };
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  sku: string;
  image: string;
  images?: string[];
  description: string;
  features?: string;
  care?: string;
  colors?: ProductColor[];
  hasSizes?: boolean;
  sizes?: string[];
  inStock: boolean;
}

export interface CartItem extends Product {
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
}
