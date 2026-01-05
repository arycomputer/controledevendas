export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  document: string;
};

export type Part = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
};

export type SaleItem = {
  partId: string;
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
