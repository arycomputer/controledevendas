'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { products as initialProducts } from '@/lib/data';
import type { Product } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ConfirmationDialog } from '@/components/app/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';

export default function ProductsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product);
        setDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!productToDelete) return;

        setProducts(products.filter(p => p.id !== productToDelete.id));
        
        toast({
            title: "Sucesso!",
            description: `Item "${productToDelete.name}" excluído.`,
        });

        setProductToDelete(null);
        setDialogOpen(false);
    };

    const handleEditClick = (productId: string) => {
        router.push(`/products/${productId}/edit`);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Produtos e Serviços</CardTitle>
                            <CardDescription>Visualize e gerencie os itens do seu inventário.</CardDescription>
                        </div>
                        <Button asChild>
                            <Link href="/products/new">
                                <PlusCircle className="mr-2 h-4 w-4" /> Novo Item
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[25%]">Nome</TableHead>
                                <TableHead className="w-[40%]">Descrição</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Preço</TableHead>
                                <TableHead className="text-right">Estoque</TableHead>
                                <TableHead>
                                    <span className="sr-only">Ações</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((product: Product) => (
                                <TableRow key={product.id}>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{product.description}</TableCell>
                                    <TableCell>
                                        <Badge variant={product.type === 'piece' ? 'secondary' : 'outline'}>
                                            {product.type === 'piece' ? 'Peça' : 'Serviço'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                                    </TableCell>
                                    <TableCell className="text-right">{product.type === 'piece' ? product.quantity : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Abrir menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleEditClick(product.id)}>Editar</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleDeleteClick(product)} className="text-destructive focus:text-destructive focus:bg-destructive/10">Excluir</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {productToDelete && (
                 <ConfirmationDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    title="Tem certeza?"
                    description={`Esta ação não pode ser desfeita. Isso excluirá permanentemente o item "${productToDelete.name}".`}
                    onConfirm={handleConfirmDelete}
                    confirmText="Sim, excluir item"
                />
            )}
        </>
    );
}