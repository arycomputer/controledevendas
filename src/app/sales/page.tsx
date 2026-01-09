'use client'

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Loader2, Eye, XCircle } from 'lucide-react';
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

    const sortedSales = useMemo(() => {
        if (!sales) return [];
        return [...sales].sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    }, [sales]);

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
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right">Valor Total</TableHead>
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
                            ) : sortedSales.length > 0 ? (
                                sortedSales.map((sale: Sale) => {
                                    const customer = customers?.find(c => c.id === sale.customerId);
                                    
                                    return (
                                        <TableRow key={sale.id} onDoubleClick={() => handleViewClick(sale.id)} className="cursor-pointer">
                                            <TableCell className="font-medium">{customer?.name || 'N/A'}</TableCell>
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
