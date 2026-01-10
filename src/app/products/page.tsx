'use client'

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Loader2, Edit, Trash2, Link as LinkIcon, Search, ArrowUpDown, ImageIcon } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

function ProductsPageContent() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    
    const productsCollection = useMemoFirebase(() => collection(firestore, 'parts'), [firestore]);
    const { data: products, isLoading } = useCollection<Product>(productsCollection);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Product; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

    const sortedAndFilteredProducts = useMemo(() => {
        if (!products) return [];
        let filteredProducts = [...products];
        
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filteredProducts = products.filter(product =>
                product.name.toLowerCase().includes(lowercasedTerm) ||
                (product.description && product.description.toLowerCase().includes(lowercasedTerm)) ||
                product.type.toLowerCase().includes(lowercasedTerm)
            );
        }

        filteredProducts.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;
            
            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
        
        return filteredProducts;

    }, [products, searchTerm, sortConfig]);

     const requestSort = (key: keyof Product) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

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
                     <div className="relative mt-4">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por nome, descrição ou tipo..." 
                            className="w-full pl-8" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16">Imagem</TableHead>
                                <TableHead>
                                     <Button variant="ghost" onClick={() => requestSort('name')}>
                                        Nome
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead>
                                    <Button variant="ghost" onClick={() => requestSort('type')}>
                                        Tipo
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                     <Button variant="ghost" onClick={() => requestSort('price')}>
                                        Preço
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead>
                                    <span className="sr-only">Ações</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : sortedAndFilteredProducts && sortedAndFilteredProducts.length > 0 ? (
                                sortedAndFilteredProducts.map((product: Product) => (
                                    <TableRow key={product.id} onDoubleClick={() => handleEditClick(product.id)} className="cursor-pointer">
                                        <TableCell>
                                            <div className="relative h-12 w-12 rounded-md overflow-hidden border bg-muted flex items-center justify-center">
                                                {product.imageUrl ? (
                                                    <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                                                ) : (
                                                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>
                                            <Badge variant={product.type === 'piece' ? 'secondary' : 'outline'}>
                                                {product.type === 'piece' ? 'Peça' : 'Serviço'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                                        </TableCell>
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
                                                     {product.link && (
                                                        <DropdownMenuItem onClick={() => window.open(product.link, '_blank')}>
                                                            <LinkIcon />
                                                        </DropdownMenuItem>
                                                    )}
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
                                     <TableCell colSpan={5} className="h-24 text-center">
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
