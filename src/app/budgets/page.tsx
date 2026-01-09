'use client'

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, MoreHorizontal, Loader2, Eye, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import type { Budget, Customer } from '@/lib/types';
import { ConfirmationDialog } from '@/components/app/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { AuthGuard } from '@/components/app/auth-guard';
import { Badge } from '@/components/ui/badge';

const statusLabels: { [key: string]: string } = {
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
};

const statusColors: { [key: string]: string } = {
    pending: 'bg-yellow-500 hover:bg-yellow-600',
    approved: 'bg-green-600 hover:bg-green-700',
    rejected: 'bg-red-500 hover:bg-red-600',
};


function BudgetsPageContent() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();

    const budgetsCollection = useMemoFirebase(() => collection(firestore, 'budgets'), [firestore]);
    const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsCollection);

    const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
    const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);

    const sortedBudgets = useMemo(() => {
        if (!budgets) return [];
        return [...budgets].sort((a, b) => new Date(b.budgetDate).getTime() - new Date(a.budgetDate).getTime());
    }, [budgets]);

    const handleDeleteClick = (budget: Budget) => {
        setBudgetToDelete(budget);
        setDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!budgetToDelete) return;

        try {
            await deleteDoc(doc(firestore, 'budgets', budgetToDelete.id));
            toast({
                title: "Sucesso!",
                description: `Orçamento ${budgetToDelete.id.substring(0,6).toUpperCase()} excluído.`,
                variant: "default",
            });
        } catch (error) {
            console.error("Error deleting budget: ", error);
            toast({
                title: "Erro!",
                description: "Não foi possível excluir o orçamento.",
                variant: "destructive"
            });
        }

        setBudgetToDelete(null);
        setDialogOpen(false);
    };
    
    const handleViewClick = (budgetId: string) => {
        router.push(`/budgets/${budgetId}`);
    };

    const handleEditClick = (budgetId: string) => {
        router.push(`/budgets/${budgetId}/edit`);
    }

    const handleStatusChange = async (budgetId: string, newStatus: 'approved' | 'rejected') => {
        try {
            const budgetRef = doc(firestore, 'budgets', budgetId);
            await updateDoc(budgetRef, { status: newStatus });
            toast({
                title: "Sucesso!",
                description: `Status do orçamento atualizado para ${statusLabels[newStatus]}.`
            });
        } catch (error) {
            console.error("Error updating budget status: ", error);
            toast({
                title: "Erro!",
                description: "Não foi possível atualizar o status do orçamento.",
                variant: "destructive"
            });
        }
    }
    
    const isLoading = budgetsLoading || customersLoading;

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Orçamentos</CardTitle>
                            <CardDescription>Crie e gerencie orçamentos para seus clientes.</CardDescription>
                        </div>
                        <Button asChild>
                            <Link href="/budgets/new">
                                <PlusCircle className="mr-2 h-4 w-4" /> Novo Orçamento
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
                                <TableHead>Validade</TableHead>
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
                            ) : sortedBudgets.length > 0 ? (
                                sortedBudgets.map((budget: Budget) => {
                                    const customer = customers?.find(c => c.id === budget.customerId);
                                    
                                    return (
                                        <TableRow key={budget.id} onDoubleClick={() => handleViewClick(budget.id)} className="cursor-pointer">
                                            <TableCell className="font-medium">{customer?.name || 'N/A'}</TableCell>
                                            <TableCell>{new Date(budget.budgetDate).toLocaleDateString('pt-BR')}</TableCell>
                                            <TableCell>{new Date(budget.validUntil).toLocaleDateString('pt-BR')}</TableCell>
                                             <TableCell className="text-center">
                                                <Badge variant='default' className={statusColors[budget.status]}>
                                                    {statusLabels[budget.status]}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.totalAmount)}
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
                                                        <DropdownMenuItem onClick={() => handleViewClick(budget.id)}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEditClick(budget.id)} disabled={budget.status !== 'pending'}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                                        {budget.status === 'pending' && (
                                                            <>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem onClick={() => handleStatusChange(budget.id, 'approved')}><CheckCircle className="mr-2 h-4 w-4" />Aprovar</DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleStatusChange(budget.id, 'rejected')} className="text-destructive focus:text-destructive focus:bg-destructive/10"><XCircle className="mr-2 h-4 w-4" />Rejeitar</DropdownMenuItem>
                                                            </>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleDeleteClick(budget)} className="text-destructive focus:text-destructive focus:bg-destructive/10" disabled={budget.status === 'approved'}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                             ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Nenhum orçamento encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {budgetToDelete && (
                <ConfirmationDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    title="Tem certeza?"
                    description={`Esta ação não pode ser desfeita. Isso excluirá permanentemente o orçamento #${budgetToDelete.id.substring(0,6).toUpperCase()}.`}
                    onConfirm={handleConfirmDelete}
                    confirmText="Sim, excluir orçamento"
                />
            )}
        </>
    );
}

export default function BudgetsPage() {
    return (
        <AuthGuard>
            <BudgetsPageContent />
        </AuthGuard>
    )
}
