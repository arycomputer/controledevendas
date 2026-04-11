'use client'

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Loader2, Eye, XCircle, ArrowUpDown, Search, CreditCard, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import type { Sale, Customer, Product } from '@/lib/types';
import { ConfirmationDialog } from '@/components/app/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { AuthGuard } from '@/components/app/auth-guard';
import { Input } from '@/components/ui/input';

const paymentMethodLabels: { [key: string]: string } = {
    cash: 'Dinheiro',
    pix: 'Pix',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
};

const statusLabels: { [key: string]: string } = {
    paid: 'Pago',
    pending: 'A Receber',
    cancelled: 'Estornado',
};

const statusColors: { [key: string]: string } = {
    paid: 'bg-green-600 hover:bg-green-700',
    pending: 'bg-destructive hover:bg-destructive/80',
    cancelled: 'bg-slate-500 hover:bg-slate-600',
};

function SalesPageContent() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();

    const salesCollection = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'sales');
    }, [firestore]);
    const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesCollection);

    const customersCollection = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'customers');
    }, [firestore]);
    const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);

    const productsCollection = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'parts');
    }, [firestore]);
    const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
    
    const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
    const [saleToReverse, setSaleToReverse] = useState<Sale | null>(null);

    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [saleToPay, setSaleToPay] = useState<Sale | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof Sale | 'customerName'; direction: 'ascending' | 'descending' }>({ key: 'saleDate', direction: 'descending' });

    const processedSales = useMemo(() => {
        if (!sales || !customers) return [];

        let filteredSales = sales.map(sale => {
            const customer = customers.find(c => c.id === sale.customerId);
            return {
                ...sale,
                customerName: customer?.name || 'N/A'
            };
        });

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filteredSales = filteredSales.filter(sale =>
                sale.customerName.toLowerCase().includes(lowercasedTerm) ||
                sale.status.toLowerCase().includes(lowercasedTerm) ||
                sale.id.toLowerCase().includes(lowercasedTerm) ||
                paymentMethodLabels[sale.paymentMethod].toLowerCase().includes(lowercasedTerm)
            );
        }

        filteredSales.sort((a, b) => {
            const key = sortConfig.key;
            let aValue: any = a[key as keyof typeof a];
            let bValue: any = b[key as keyof typeof b];
            
            if (key === 'saleDate') {
                aValue = aValue ? new Date(aValue).getTime() : 0;
                bValue = bValue ? new Date(bValue).getTime() : 0;
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });

        return filteredSales;

    }, [sales, customers, searchTerm, sortConfig]);

    const requestSort = (key: keyof Sale | 'customerName') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleDeleteClick = (sale: Sale) => {
        setSaleToDelete(sale);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!saleToDelete || !firestore) return;
        try {
            await deleteDoc(doc(firestore, 'sales', saleToDelete.id));
            toast({
                title: "Venda Excluída",
                description: `O registro da venda foi removido permanentemente.`,
            });
        } catch (error) {
            console.error("Error deleting sale: ", error);
            toast({
                title: "Erro!",
                description: "Não foi possível excluir o registro.",
                variant: "destructive"
            });
        }
        setSaleToDelete(null);
        setDeleteDialogOpen(false);
    };

    const handleReverseClick = (sale: Sale) => {
        setSaleToReverse(sale);
        setReverseDialogOpen(true);
    };

    const handleConfirmReverse = async () => {
        if (!saleToReverse || !firestore || !products) return;

        try {
            const batch = writeBatch(firestore);

            for (const item of saleToReverse.items) {
                const product = products.find(p => p.id === item.productId);
                if (product && product.type === 'piece') {
                    const productRef = doc(firestore, 'parts', product.id);
                    const newQuantity = (product.quantity || 0) + item.quantity;
                    batch.update(productRef, { quantity: newQuantity });
                }
            }

            batch.update(doc(firestore, 'sales', saleToReverse.id), {
                status: 'cancelled',
                amountReceivable: 0,
                downPayment: 0
            });

            await batch.commit();

            toast({
                title: "Venda Estornada",
                description: `Os produtos retornaram ao estoque e a venda foi marcada como cancelada.`,
            });
        } catch (error) {
            console.error("Error reversing sale: ", error);
            toast({
                title: "Erro!",
                description: "Não foi possível estornar a venda.",
                variant: "destructive"
            });
        }

        setSaleToReverse(null);
        setReverseDialogOpen(false);
    };
    
     const handlePaymentClick = (sale: Sale) => {
        setSaleToPay(sale);
        setPaymentDialogOpen(true);
    };

    const handleConfirmPayment = async () => {
        if (!saleToPay || !firestore) return;

        try {
            const saleRef = doc(firestore, 'sales', saleToPay.id);
            await updateDoc(saleRef, {
                status: 'paid',
                paymentDate: new Date().toISOString(),
                amountReceivable: 0,
            });
            toast({
                title: "Sucesso!",
                description: "Pagamento registrado com sucesso!",
            });
        } catch (error) {
            console.error("Error updating sale status:", error);
            toast({
                title: "Erro!",
                description: "Não foi possível registrar o pagamento.",
                variant: "destructive"
            });
        }

        setSaleToPay(null);
        setPaymentDialogOpen(false);
    };

    const handleViewClick = (saleId: string) => {
        router.push(`/sales/${saleId}`);
    };
    
    const isLoading = salesLoading || customersLoading || productsLoading;

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <CardTitle>Histórico de Vendas</CardTitle>
                            <CardDescription>Visualize todas as vendas registradas no sistema.</CardDescription>
                        </div>
                        <Button asChild className="w-full sm:w-auto">
                            <Link href="/sales/new">
                                <PlusCircle className="mr-2 h-4 w-4" /> Nova Venda
                            </Link>
                        </Button>
                    </div>
                    <div className="relative mt-4">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por cliente, status ou ID..." 
                            className="w-full pl-8" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                     <Button variant="ghost" onClick={() => requestSort('customerName')} className="p-0 hover:bg-transparent">
                                        Cliente
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="hidden md:table-cell">
                                    <Button variant="ghost" onClick={() => requestSort('saleDate')} className="p-0 hover:bg-transparent">
                                        Data Venda
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="hidden lg:table-cell">
                                    <Button variant="ghost" onClick={() => requestSort('paymentMethod' as any)} className="p-0 hover:bg-transparent">
                                        Forma Pag.
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-center">
                                    <Button variant="ghost" onClick={() => requestSort('status')} className="p-0 hover:bg-transparent mx-auto">
                                        Status
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                     <Button variant="ghost" onClick={() => requestSort('totalAmount')} className="p-0 hover:bg-transparent ml-auto">
                                        Valor Total
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="w-[80px]">
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
                            ) : processedSales.length > 0 ? (
                                processedSales.map((sale) => {
                                    return (
                                        <TableRow 
                                            key={sale.id} 
                                            onDoubleClick={() => handleViewClick(sale.id)} 
                                            className={`cursor-pointer ${sale.status === 'cancelled' ? 'opacity-60' : ''}`}
                                        >
                                            <TableCell className="font-medium">{sale.customerName}</TableCell>
                                            <TableCell className="hidden md:table-cell">{new Date(sale.saleDate).toLocaleDateString('pt-BR')}</TableCell>
                                            <TableCell className="hidden lg:table-cell text-xs uppercase">{paymentMethodLabels[sale.paymentMethod]}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge 
                                                    variant={sale.status === 'paid' ? 'default' : 'destructive'} 
                                                    className={`${statusColors[sale.status]} ${sale.status === 'pending' ? 'cursor-pointer hover:bg-destructive/80' : ''} text-[10px] uppercase px-2 py-0`}
                                                    onClick={(e) => {
                                                        if (sale.status === 'pending') {
                                                            e.stopPropagation();
                                                            handlePaymentClick(sale);
                                                        }
                                                    }}
                                                >
                                                    {statusLabels[sale.status]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={`text-right font-semibold font-mono ${sale.status === 'cancelled' ? 'line-through' : ''}`}>
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.totalAmount)}
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
                                                        <DropdownMenuItem onClick={() => handleViewClick(sale.id)}><Eye className="mr-2 h-4 w-4" /> Ver Detalhes</DropdownMenuItem>
                                                        {sale.status === 'pending' && (
                                                            <DropdownMenuItem onClick={() => handlePaymentClick(sale)}>
                                                                <CreditCard className="mr-2 h-4 w-4" /> Marcar como Pago
                                                            </DropdownMenuItem>
                                                        )}
                                                        {sale.status !== 'cancelled' && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => handleReverseClick(sale)} className="text-orange-600 focus:text-orange-600 focus:bg-orange-50">
                                                                    <RotateCcw className="mr-2 h-4 w-4" /> Estornar Venda
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleDeleteClick(sale)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                            <Trash2 className="mr-2 h-4 w-4" /> Excluir Registro
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                             ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Nenhuma venda encontrada.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
            {saleToReverse && (
                <ConfirmationDialog
                    open={reverseDialogOpen}
                    onOpenChange={setReverseDialogOpen}
                    title="Confirmar Estorno"
                    description={`Deseja estornar a venda ${saleToReverse.id.substring(0,6).toUpperCase()}? Os produtos retornarão ao estoque e o registro será mantido como "Estornado".`}
                    onConfirm={handleConfirmReverse}
                    confirmText="Sim, estornar venda"
                />
            )}

            {saleToDelete && (
                <ConfirmationDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    title="Excluir Registro"
                    description={`Tem certeza que deseja excluir permanentemente a venda ${saleToDelete.id.substring(0,6).toUpperCase()}? Isso NÃO devolverá os itens ao estoque automaticamente.`}
                    onConfirm={handleConfirmDelete}
                    confirmText="Sim, excluir permanentemente"
                />
            )}
            
            {saleToPay && (
                <ConfirmationDialog
                    open={paymentDialogOpen}
                    onOpenChange={setPaymentDialogOpen}
                    title="Confirmar Pagamento"
                    description={`Deseja marcar a venda ${saleToPay.id.substring(0,6).toUpperCase()} como 'Paga'? A data de hoje será registrada como data de pagamento.`}
                    onConfirm={handleConfirmPayment}
                    confirmText="Sim, marcar como pago"
                />
            )}
        </>
    );
}

export default function SalesPage() {
    return (
        <AuthGuard>
            <SalesPageContent />
        </AuthGuard>
    )
}
