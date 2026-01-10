'use client'

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Loader2, Eye, Edit, Trash2, ArrowUpDown, Search } from 'lucide-react';
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
import { Input } from '@/components/ui/input';

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
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof ServiceOrder | 'customerName'; direction: 'ascending' | 'descending' }>({ key: 'entryDate', direction: 'descending' });

    const processedOrders = useMemo(() => {
        if (!serviceOrders || !customers) return [];
        
        let filteredOrders = serviceOrders.map(order => {
            const customer = customers.find(c => c.id === order.customerId);
            return {
                ...order,
                customerName: customer?.name || 'N/A'
            };
        });

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filteredOrders = filteredOrders.filter(order => 
                order.customerName.toLowerCase().includes(lowercasedTerm) ||
                order.itemDescription.toLowerCase().includes(lowercasedTerm) ||
                order.status.toLowerCase().includes(lowercasedTerm) ||
                order.id.toLowerCase().includes(lowercasedTerm)
            );
        }

        filteredOrders.sort((a, b) => {
            const key = sortConfig.key;
            let aValue: any = a[key as keyof typeof a];
            let bValue: any = b[key as keyof typeof b];
            
            if (key === 'entryDate') {
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

        return filteredOrders;

    }, [serviceOrders, customers, searchTerm, sortConfig]);

    const requestSort = (key: keyof ServiceOrder | 'customerName') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

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
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                            <CardTitle>Ordens de Serviço</CardTitle>
                            <CardDescription>Gerencie todas as ordens de serviço abertas e concluídas.</CardDescription>
                        </div>
                        <Button asChild className="w-full sm:w-auto">
                            <Link href="/service-orders/new">
                                <PlusCircle className="mr-2 h-4 w-4" /> Nova Ordem de Serviço
                            </Link>
                        </Button>
                    </div>
                     <div className="relative mt-4">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por cliente, item, status ou ID..." 
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
                                     <Button variant="ghost" onClick={() => requestSort('itemDescription')}>
                                        Item
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </TableHead>
                                <TableHead className="hidden lg:table-cell">
                                    <Button variant="ghost" onClick={() => requestSort('entryDate')}>
                                        Entrada
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
                                        Valor
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
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : processedOrders.length > 0 ? (
                                processedOrders.map((order: ServiceOrder & { customerName: string }) => {
                                    
                                    return (
                                        <TableRow key={order.id} onDoubleClick={() => handleViewClick(order.id)} className="cursor-pointer">
                                            <TableCell className="font-medium">{order.customerName}</TableCell>
                                            <TableCell className="hidden md:table-cell">{order.itemDescription}</TableCell>
                                            <TableCell className="hidden lg:table-cell">{new Date(order.entryDate).toLocaleDateString('pt-BR')}</TableCell>
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
                                                        <DropdownMenuItem onClick={() => handleViewClick(order.id)}><Eye className="mr-2 h-4 w-4" /> Ver Detalhes</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEditClick(order.id)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleCancelClick(order)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Cancelar</DropdownMenuItem>
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
