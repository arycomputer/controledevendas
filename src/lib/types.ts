export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  document: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity?: number; // Optional, as services won't have a quantity
  type: 'piece' | 'service';
};

export type SaleItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export type Sale = {
  id: string;
  customerId: string;
  items: SaleItem[];
  totalAmount: number;
  saleDate: string; // ISO date string
};
