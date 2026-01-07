'use client'

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, Search, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { customers as initialCustomers } from '@/lib/data';
import type { Customer } from '@/lib/types';
import { ConfirmationDialog } from '@/components/app/confirmation-dialog';
import { useToast } from '@/hooks/use-toast';

export default function CustomersPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    
    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return customers;
        const lowercasedTerm = searchTerm.toLowerCase();
        return customers.filter(customer => 
            customer.name.toLowerCase().includes(lowercasedTerm) ||
            customer.phone.includes(searchTerm) ||
            customer.document.replace(/[^\d]/g, "").includes(searchTerm.replace(/[^\d]/g, ""))
        );
    }, [searchTerm, customers]);

    const handleDeleteClick = (customer: Customer) => {
        setCustomerToDelete(customer);
        setDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!customerToDelete) return;
        
        // In a real app, you would call an API to delete the customer
        setCustomers(customers.filter(c => c.id !== customerToDelete.id));
        
        toast({
            title: "Sucesso!",
            description: `Cliente "${customerToDelete.name}" excluído.`,
        });

        setCustomerToDelete(null);
        setDialogOpen(false);
    };

    const handleEditClick = (customerId: string) => {
        router.push(`/customers/${customerId}/edit`);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Clientes</CardTitle>
                            <CardDescription>Gerencie seus clientes e veja seus detalhes de contato.</CardDescription>
                        </div>
                        <Button asChild>
                            <Link href="/customers/new">
                                <PlusCircle className="mr-2 h-4 w-4" /> Novo Cliente
                            </Link>
                        </Button>
                    </div>
                    <div className="relative mt-4">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por nome, telefone ou documento..." 
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
                                <TableHead>Nome</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead>Documento</TableHead>
                                <TableHead>Endereço</TableHead>
                                <TableHead>
                                    <span className="sr-only">Ações</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCustomers.length > 0 ? (
                                filteredCustomers.map((customer: Customer) => (
                                    <TableRow key={customer.id}>
                                        <TableCell className="font-medium">{customer.name}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">{customer.email}</div>
                                            <div className="text-xs text-muted-foreground">{customer.phone}</div>
                                        </TableCell>
                                        <TableCell>{customer.document}</TableCell>
                                        <TableCell>{customer.address}</TableCell>
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
                                                    <DropdownMenuItem onClick={() => handleEditClick(customer.id)}>Editar</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handleDeleteClick(customer)} className="text-destructive focus:text-destructive focus:bg-destructive/10">Excluir</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Nenhum cliente encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            {customerToDelete && (
                <ConfirmationDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    title="Tem certeza?"
                    description={`Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente "${customerToDelete.name}".`}
                    onConfirm={handleConfirmDelete}
                    confirmText="Sim, excluir cliente"
                />
            )}
        </>
    );
}