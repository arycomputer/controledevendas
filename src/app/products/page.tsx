'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Loader2, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { Product } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ConfirmationDialog } from '@/components/app/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { AuthGuard } from '@/components/app/auth-guard';

function ProductsPageContent() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    
    const productsCollection = useMemoFirebase(() => collection(firestore, 'parts'), [firestore]);
    const { data: products, isLoading } = useCollection<Product>(productsCollection);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product);
        setDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!productToDelete) return;

        try {
            await deleteDoc(doc(firestore, 'parts', productToDelete.id));
            toast({
                title: "Sucesso!",
                description: `Item "${productToDelete.name}" excluído.`,
            });
        } catch (error) {
             console.error("Error deleting product: ", error);
             toast({
                title: "Erro!",
                description: "Não foi possível excluir o item.",
                variant: "destructive"
            });
        }

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
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : products && products.length > 0 ? (
                                products.map((product: Product) => (
                                    <TableRow key={product.id} onDoubleClick={() => handleEditClick(product.id)} className="cursor-pointer">
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
                                                    <DropdownMenuItem onClick={() => handleEditClick(product.id)}><Edit /></DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleDeleteClick(product)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 /></DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                     <TableCell colSpan={6} className="h-24 text-center">
                                        Nenhum item encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
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


export default function ProductsPage() {
    return (
        <AuthGuard>
            <ProductsPageContent />
        </AuthGuard>
    )
}
