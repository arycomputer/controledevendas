'use client'

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Loader2, Eye, XCircle, ArrowUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import type { Sale, Customer } from '@/lib/types';
import { ConfirmationDialog } from '@/components/app/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { AuthGuard } from '@/components/app/auth-guard';
import { Input } from '@/components/ui/input';

function SalesPageContent() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();

    const salesCollection = useMemoFirebase(() => collection(firestore, 'sales'), [firestore]);
    const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesCollection);

    const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
    const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
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
                sale.id.toLowerCase().includes(lowercasedTerm)
            );
        }

        filteredSales.sort((a, b) => {
            const key = sortConfig.key;
            let aValue: any = a[key as keyof typeof a];
            let bValue: any = b[key as keyof typeof b];
            
            if (key === 'saleDate') {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
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

    const handleCancelClick = (sale: Sale) => {
        setSaleToCancel(sale);
        setDialogOpen(true);
    };

    const handleConfirmCancel = async () => {
        if (!saleToCancel) return;

        try {
            await deleteDoc(doc(firestore, 'sales', saleToCancel.id));
            toast({
                title: "Sucesso!",
                description: `Venda ${saleToCancel.id.toUpperCase()} cancelada.`,
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
        setDialogOpen(false);
    };
    
    const handleViewClick = (saleId: string) => {
        router.push(`/sales/${saleId}`);
    };
    
    const isLoading = salesLoading || customersLoading;

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Histórico de Vendas</CardTitle>
                            <CardDescription>Visualize todas as vendas registradas no sistema.</CardDescription>
                        </div>
                        <Button asChild>
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
                                <TableHead>
                                    <Button variant="ghost" onClick={() => requestSort('saleDate')}>
                                        Data
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
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : processedSales.length > 0 ? (
                                processedSales.map((sale) => {
                                    return (
                                        <TableRow key={sale.id} onDoubleClick={() => handleViewClick(sale.id)} className="cursor-pointer">
                                            <TableCell className="font-medium">{sale.customerName}</TableCell>
                                            <TableCell>{new Date(sale.saleDate).toLocaleDateString('pt-BR')}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={sale.status === 'paid' ? 'default' : 'destructive'} className={sale.status === 'paid' ? 'bg-green-600 hover:bg-green-700' : ''}>
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
                                                        <DropdownMenuItem onClick={() => handleViewClick(sale.id)}><Eye /></DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleCancelClick(sale)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><XCircle /></DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                             ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
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
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    title="Tem certeza?"
                    description={`Esta ação não pode ser desfeita. Isso cancelará permanentemente a venda ${saleToCancel.id.toUpperCase()}.`}
                    onConfirm={handleConfirmCancel}
                    confirmText="Sim, cancelar venda"
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
