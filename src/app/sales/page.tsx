'use client'

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Loader2, Eye, XCircle, ArrowUpDown, Search, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import type { Sale, Customer } from '@/lib/types';
import { ConfirmationDialog } from '@/components/app/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { AuthGuard } from '@/components/app/auth-guard';
import { Input } from '@/components/ui/input';

const paymentMethodLabels: { [key: string]: string } = {
    cash: 'Dinheiro',
    pix: 'Pix',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
};

function SalesPageContent() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();

    const salesCollection = useMemoFirebase(() => collection(firestore, 'sales'), [firestore]);
    const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesCollection);

    const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
    const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);

    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
    
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
            
            if (key === 'saleDate' || key === 'paymentDate') {
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

    const requestSort = (key: keyof Sale | 'customerName' | 'paymentDate') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleCancelClick = (sale: Sale) => {
        setSaleToCancel(sale);
        setCancelDialogOpen(true);
    };

    const handleConfirmCancel = async () => {
        if (!saleToCancel) return;

        try {
            await deleteDoc(doc(firestore, 'sales', saleToCancel.id));
            toast({
                title: "Sucesso!",
                description: `Venda ${saleToCancel.id.toUpperCase().substring(0,6)} cancelada.`,
                variant: "default",
            });
        } catch (error) {
            console.error("Error cancelling sale: ", error);
            toast({
                title: "Erro!",
                description: "Não foi possível cancelar a venda.",
                variant: "destructive"
            });
        }

        setSaleToCancel(null);
        setCancelDialogOpen(false);
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
    
    const isLoading = salesLoading || customersLoading;

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
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                     <Button variant="ghost" onClick={() => requestSort('customerName')}>
                                        Cliente
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="hidden md:table-cell">
                                    <Button variant="ghost" onClick={() => requestSort('saleDate')}>
                                        Data Venda
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="hidden lg:table-cell">
                                    <Button variant="ghost" onClick={() => requestSort('paymentDate')}>
                                        Data Pag.
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="hidden lg:table-cell">
                                    <Button variant="ghost" onClick={() => requestSort('paymentMethod' as any)}>
                                        Forma Pag.
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-center">
                                    <Button variant="ghost" onClick={() => requestSort('status')}>
                                        Status
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="text-right">
                                     <Button variant="ghost" onClick={() => requestSort('totalAmount')}>
                                        Valor Total
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
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : processedSales.length > 0 ? (
                                processedSales.map((sale) => {
                                    return (
                                        <TableRow key={sale.id} onDoubleClick={() => handleViewClick(sale.id)} className="cursor-pointer">
                                            <TableCell className="font-medium">{sale.customerName}</TableCell>
                                            <TableCell className="hidden md:table-cell">{new Date(sale.saleDate).toLocaleDateString('pt-BR')}</TableCell>
                                            <TableCell className="hidden lg:table-cell">{sale.paymentDate ? new Date(sale.paymentDate).toLocaleDateString('pt-BR') : '-'}</TableCell>
                                            <TableCell className="hidden lg:table-cell">{paymentMethodLabels[sale.paymentMethod]}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge 
                                                    variant={sale.status === 'paid' ? 'default' : 'destructive'} 
                                                    className={
                                                        sale.status === 'paid' 
                                                        ? 'bg-green-600 hover:bg-green-700' 
                                                        : 'cursor-pointer hover:bg-destructive/80'
                                                    }
                                                    onClick={() => sale.status === 'pending' && handlePaymentClick(sale)}
                                                >
                                                    {sale.status === 'paid' ? 'Pago' : 'A Receber'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
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
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleCancelClick(sale)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><XCircle className="mr-2 h-4 w-4" /> Cancelar Venda</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                             ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        Nenhuma venda encontrada.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
            {saleToCancel && (
                <ConfirmationDialog
                    open={cancelDialogOpen}
                    onOpenChange={setCancelDialogOpen}
                    title="Tem certeza?"
                    description={`Esta ação não pode ser desfeita. Isso cancelará permanentemente a venda ${saleToCancel.id.substring(0,6).toUpperCase()}.`}
                    onConfirm={handleConfirmCancel}
                    confirmText="Sim, cancelar venda"
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
