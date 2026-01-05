import type { Customer, Product, Sale } from './types';

export const customers: Customer[] = [
  { id: '1', name: 'João da Silva', email: 'joao.silva@example.com', phone: '11987654321', address: 'Rua das Flores, 123, São Paulo', document: '123.456.789-00' },
  { id: '2', name: 'Maria Oliveira', email: 'maria.oliveira@example.com', phone: '21912345678', address: 'Avenida Principal, 456, Rio de Janeiro', document: '987.654.321-11' },
  { id: '3', name: 'Carlos Pereira', email: 'carlos.pereira@example.com', phone: '31999998888', address: 'Praça Central, 789, Belo Horizonte', document: '456.789.123-22' },
  { id: '4', name: 'Ana Costa', email: 'ana.costa@example.com', phone: '41988776655', address: 'Rua da Praia, 101, Curitiba', document: '111.222.333-44' },
];

export const products: Product[] = [
  { id: 'p1', name: 'Parafuso Sextavado', description: 'M6x20mm Aço Inox', price: 0.50, quantity: 1000, type: 'piece' },
  { id: 'p2', name: 'Porca M6', description: 'Porca sextavada M6', price: 0.25, quantity: 2000, type: 'piece' },
  { id: 'p3', name: 'Arruela Lisa', description: 'Arruela M6', price: 0.10, quantity: 5000, type: 'piece' },
  { id: 'p4', name: 'Filtro de Óleo', description: 'Para motor 1.6', price: 35.00, quantity: 50, type: 'piece' },
  { id: 'p5', name: 'Vela de Ignição', description: 'Padrão universal', price: 15.00, quantity: 100, type: 'piece' },
  { id: 's1', name: 'Troca de Óleo', description: 'Serviço de troca de óleo do motor', price: 80.00, type: 'service' },
  { id: 's2', name: 'Alinhamento e Balanceamento', description: 'Alinhamento 3D e balanceamento das 4 rodas.', price: 120.00, type: 'service' },
];

export const sales: Sale[] = [
    {
        id: 's1',
        customerId: '1',
        items: [
            { productId: 'p1', quantity: 50, unitPrice: 0.50 },
            { productId: 'p2', quantity: 50, unitPrice: 0.25 },
        ],
        totalAmount: (50 * 0.50) + (50 * 0.25),
        saleDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 's2',
        customerId: '2',
        items: [
            { productId: 'p4', quantity: 1, unitPrice: 35.00 },
            { productId: 'p5', quantity: 4, unitPrice: 15.00 },
            { productId: 's1', quantity: 1, unitPrice: 80.00 },
        ],
        totalAmount: 35.00 + (4 * 15.00) + 80.00,
        saleDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
     {
        id: 's3',
        customerId: '3',
        items: [
            { productId: 'p3', quantity: 100, unitPrice: 0.10 },
        ],
        totalAmount: 100 * 0.10,
        saleDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 's4',
        customerId: '1',
        items: [
            { productId: 's2', quantity: 1, unitPrice: 120.00 },
        ],
        totalAmount: 120.00,
        saleDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
];
