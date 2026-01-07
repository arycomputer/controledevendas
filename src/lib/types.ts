'use client';

import { z } from "zod";

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  document: z.string(),
  address: z.string(),
});
export type Customer = z.infer<typeof CustomerSchema>;


export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  quantity: z.number().optional(),
  type: z.enum(['piece', 'service']),
});
export type Product = z.infer<typeof ProductSchema>;

export const SaleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
});
export type SaleItem = z.infer<typeof SaleItemSchema>;


export const SaleSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  items: z.array(SaleItemSchema),
  totalAmount: z.number(),
  saleDate: z.string(), // ISO date string
});
export type Sale = z.infer<typeof SaleSchema>;


export const UserSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    role: z.enum(['admin', 'seller']),
});
export type User = z.infer<typeof UserSchema>;
