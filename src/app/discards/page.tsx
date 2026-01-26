'use client'

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Loader2, Edit, Trash2, Search, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { Discard, Product } from '@/lib/types';
import { ConfirmationDialog } from '@/components/app/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { AuthGuard } from '@/components/app/auth-guard';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

function DiscardsPageContent() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    
    const discardsCollection = useMemoFirebase(() => collection(firestore, 'discards'), [firestore]);
    const { data: discards, isLoading: discardsLoading } = useCollection<Discard>(discardsCollection);

    const productsCollection = useMemoFirebase(() => collection(firestore, 'parts'), [firestore]);
    const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<Discard | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Discard; direction: 'ascending' | 'descending' }>({ key: 'discardDate', direction: 'descending' });

    const sortedAndFilteredDiscards = useMemo(() => {
        if (!discards || !products) return [];
        let filteredDiscards = [...discards];
        
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filteredDiscards = discards.filter(item =>
                item.description.toLowerCase().includes(lowercasedTerm) ||
                (item.model && item.model.toLowerCase().includes(lowercasedTerm)) ||
                (item.serialNumber && item.serialNumber.toLowerCase().includes(lowercasedTerm))
            );
        }

        filteredDiscards.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            
            if (sortConfig.key === 'discardDate') {
                return sortConfig.direction === 'ascending' 
                    ? new Date(a.discardDate).getTime() - new Date(b.discardDate).getTime()
                    : new Date(b.discardDate).getTime() - new Date(a.discardDate).getTime();
            }

            if (!aValue) return 1;
            if (!bValue) return -1;

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
        
        return filteredDiscards;

    }, [discards, products, searchTerm, sortConfig]);

     const requestSort = (key: keyof Discard) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleDeleteClick = (item: Discard) => {
        setItemToDelete(item);
        setDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;

        try {
            await deleteDoc(doc(firestore, 'discards', itemToDelete.id));
            toast({
                title: "Sucesso!",
                description: `Item "${itemToDelete.description}" excluído.`,
            });
        } catch (error) {
             console.error("Error deleting discard: ", error);
             toast({
                title: "Erro!",
                description: "Não foi possível excluir o item.",
                variant: "destructive"
            });
        }

        setItemToDelete(null);
        setDialogOpen(false);
    };

    const handleEditClick = (itemId: string) => {
        router.push(`/discards/${itemId}/edit`);
    };

    const isLoading = discardsLoading || productsLoading;

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <CardTitle>Descartes</CardTitle>
                            <CardDescription>Gerencie os equipamentos descartados.</CardDescription>
                        </div>
                        <Button asChild className="w-full sm:w-auto">
                            <Link href="/discards/new">
                                <PlusCircle className="mr-2 h-4 w-4" /> Novo Descarte
                            </Link>
                        </Button>
                    </div>
                     <div className="relative mt-4">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por descrição, modelo ou série..." 
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
                                <TableHead>
                                     <Button variant="ghost" onClick={() => requestSort('description')}>
                                        Descrição
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="hidden md:table-cell">
                                    <Button variant="ghost" onClick={() => requestSort('model')}>
                                        Modelo
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead>Componentes</TableHead>
                                <TableHead>
                                    <span className="sr-only">Ações</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : sortedAndFilteredDiscards && sortedAndFilteredDiscards.length > 0 ? (
                                sortedAndFilteredDiscards.map((item: Discard) => (
                                    <TableRow key={item.id} onDoubleClick={() => handleEditClick(item.id)} className="cursor-pointer">
                                        <TableCell className="font-medium">{item.description}</TableCell>
                                        <TableCell className="hidden md:table-cell">{item.model || 'N/A'}</TableCell>
                                        <TableCell>
                                            {item.items && item.items.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {item.items.map(component => {
                                                        const product = products?.find(p => p.id === component.productId);
                                                        return (
                                                            <Badge key={component.productId} variant="secondary">
                                                                {product?.name || '...'} ({component.quantity})
                                                            </Badge>
                                                        )
                                                    })}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-center block w-full">N/A</span>
                                            )}
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
                                                    <DropdownMenuItem onClick={() => handleEditClick(item.id)}><Edit className="mr-2 h-4 w-4"/> Editar</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleDeleteClick(item)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                     <TableCell colSpan={4} className="h-24 text-center">
                                        Nenhum item encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {itemToDelete && (
                 <ConfirmationDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    title="Tem certeza?"
                    description={`Esta ação não pode ser desfeita. Isso excluirá permanentemente o item "${itemToDelete.description}".`}
                    onConfirm={handleConfirmDelete}
                    confirmText="Sim, excluir item"
                />
            )}
        </>
    );
}


export default function DiscardsPage() {
    return (
        <AuthGuard>
            <DiscardsPageContent />
        </AuthGuard>
    )
}
