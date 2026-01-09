'use client'

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Loader2, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import type { ServiceOrder, Customer } from '@/lib/types';
import { ConfirmationDialog } from '@/components/app/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { AuthGuard } from '@/components/app/auth-guard';

const statusLabels: { [key: string]: string } = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluída',
    delivered: 'Entregue',
};

const statusColors: { [key: string]: string } = {
    pending: 'bg-yellow-500 hover:bg-yellow-600',
    in_progress: 'bg-blue-500 hover:bg-blue-600',
    completed: 'bg-green-600 hover:bg-green-700',
    delivered: 'bg-gray-500 hover:bg-gray-600',
};


function ServiceOrdersPageContent() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();

    const serviceOrdersCollection = useMemoFirebase(() => collection(firestore, 'serviceOrders'), [firestore]);
    const { data: serviceOrders, isLoading: serviceOrdersLoading } = useCollection<ServiceOrder>(serviceOrdersCollection);

    const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
    const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [orderToCancel, setOrderToCancel] = useState<ServiceOrder | null>(null);

    const sortedServiceOrders = useMemo(() => {
        if (!serviceOrders) return [];
        return [...serviceOrders].sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
    }, [serviceOrders]);

    const handleCancelClick = (order: ServiceOrder) => {
        setOrderToCancel(order);
        setDialogOpen(true);
    };

    const handleConfirmCancel = async () => {
        if (!orderToCancel) return;

        try {
            await deleteDoc(doc(firestore, 'serviceOrders', orderToCancel.id));
            toast({
                title: "Sucesso!",
                description: `Ordem de Serviço ${orderToCancel.id.substring(0,6).toUpperCase()} cancelada.`,
                variant: "default",
            });
        } catch (error) {
            console.error("Error cancelling service order: ", error);
            toast({
                title: "Erro!",
                description: "Não foi possível cancelar a ordem de serviço.",
                variant: "destructive"
            });
        }

        setOrderToCancel(null);
        setDialogOpen(false);
    };
    
    const handleViewClick = (orderId: string) => {
        router.push(`/service-orders/${orderId}`);
    };

    const handleEditClick = (orderId: string) => {
        router.push(`/service-orders/${orderId}/edit`);
    };
    
    const isLoading = serviceOrdersLoading || customersLoading;

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Ordens de Serviço</CardTitle>
                            <CardDescription>Gerencie todas as ordens de serviço abertas e concluídas.</CardDescription>
                        </div>
                        <Button asChild>
                            <Link href="/service-orders/new">
                                <PlusCircle className="mr-2 h-4 w-4" /> Nova Ordem de Serviço
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Item</TableHead>
                                <TableHead>Data de Entrada</TableHead>
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
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : sortedServiceOrders.length > 0 ? (
                                sortedServiceOrders.map((order: ServiceOrder) => {
                                    const customer = customers?.find(c => c.id === order.customerId);
                                    
                                    return (
                                        <TableRow key={order.id} onDoubleClick={() => handleViewClick(order.id)} className="cursor-pointer">
                                            <TableCell className="font-medium">{customer?.name || 'N/A'}</TableCell>
                                            <TableCell>{order.itemDescription}</TableCell>
                                            <TableCell>{new Date(order.entryDate).toLocaleDateString('pt-BR')}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant='default' className={statusColors[order.status]}>
                                                    {statusLabels[order.status]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalAmount)}
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
                                                        <DropdownMenuItem onClick={() => handleViewClick(order.id)}><Eye /></DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEditClick(order.id)}><Edit /></DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleCancelClick(order)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 /></DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                             ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Nenhuma ordem de serviço encontrada.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {orderToCancel && (
                <ConfirmationDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    title="Tem certeza?"
                    description={`Esta ação não pode ser desfeita. Isso cancelará permanentemente a ordem de serviço #${orderToCancel.id.substring(0,6).toUpperCase()}.`}
                    onConfirm={handleConfirmCancel}
                    confirmText="Sim, cancelar ordem"
                />
            )}
        </>
    );
}

export default function ServiceOrdersPage() {
    return (
        <AuthGuard>
            <ServiceOrdersPageContent />
        </AuthGuard>
    )
}
