
'use client'

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Loader2, Eye, Trash2, Search, ArrowUpDown, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { Purchase } from '@/lib/types';
import { ConfirmationDialog } from '@/components/app/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { AuthGuard } from '@/components/app/auth-guard';
import { Input } from '@/components/ui/input';

function PurchasesPageContent() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();

    const purchasesCollection = useMemoFirebase(() => collection(firestore, 'purchases'), [firestore]);
    const { data: purchases, isLoading: purchasesLoading } = useCollection<Purchase>(purchasesCollection);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Purchase; direction: 'ascending' | 'descending' }>({ key: 'purchaseDate', direction: 'descending' });

    const processedPurchases = useMemo(() => {
        if (!purchases) return [];

        let filtered = [...purchases];

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                p.supplierName.toLowerCase().includes(lowercasedTerm) ||
                p.id.toLowerCase().includes(lowercasedTerm)
            );
        }

        filtered.sort((a, b) => {
            const key = sortConfig.key;
            let aValue: any = a[key];
            let bValue: any = b[key];
            
            if (key === 'purchaseDate') {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            }

            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [purchases, searchTerm, sortConfig]);

    const requestSort = (key: keyof Purchase) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleDeleteClick = (purchase: Purchase) => {
        setPurchaseToDelete(purchase);
        setDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!purchaseToDelete) return;
        try {
            await deleteDoc(doc(firestore, 'purchases', purchaseToDelete.id));
            toast({ title: "Sucesso!", description: "Registro de compra excluído." });
        } catch (error) {
            console.error("Error deleting purchase:", error);
            toast({ title: "Erro!", description: "Não foi possível excluir o registro.", variant: "destructive" });
        }
        setPurchaseToDelete(null);
        setDialogOpen(false);
    };

    const handleViewClick = (id: string) => {
        router.push(`/purchases/${id}`);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <CardTitle>Compras / Entradas</CardTitle>
                            <CardDescription>Gerencie as compras de produtos e entrada de estoque.</CardDescription>
                        </div>
                        <Button asChild className="w-full sm:w-auto">
                            <Link href="/purchases/new">
                                <PlusCircle className="mr-2 h-4 w-4" /> Registrar Compra
                            </Link>
                        </Button>
                    </div>
                    <div className="relative mt-4">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por fornecedor ou ID..." 
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
                                     <Button variant="ghost" onClick={() => requestSort('supplierName')}>
                                        Fornecedor
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="hidden md:table-cell">
                                    <Button variant="ghost" onClick={() => requestSort('purchaseDate')}>
                                        Data
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                     <Button variant="ghost" onClick={() => requestSort('totalAmount')}>
                                        Total
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead>
                                    <span className="sr-only">Ações</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchasesLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : processedPurchases.length > 0 ? (
                                processedPurchases.map((purchase) => (
                                    <TableRow key={purchase.id} onDoubleClick={() => handleViewClick(purchase.id)} className="cursor-pointer">
                                        <TableCell className="font-medium">{purchase.supplierName}</TableCell>
                                        <TableCell className="hidden md:table-cell">{new Date(purchase.purchaseDate).toLocaleDateString('pt-BR')}</TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(purchase.totalAmount)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleViewClick(purchase.id)}><Eye className="mr-2 h-4 w-4" /> Ver Detalhes</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleDeleteClick(purchase)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                             ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        Nenhuma compra registrada.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
            {purchaseToDelete && (
                <ConfirmationDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    title="Tem certeza?"
                    description={`Esta ação excluirá o registro da compra de ${purchaseToDelete.supplierName}. Isso não afetará o estoque já alterado.`}
                    onConfirm={handleConfirmDelete}
                    confirmText="Sim, excluir"
                />
            )}
        </>
    );
}

export default function PurchasesPage() {
    return (
        <AuthGuard>
            <PurchasesPageContent />
        </AuthGuard>
    )
}
