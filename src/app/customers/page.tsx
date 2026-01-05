'use client'

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { PlusCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { customers as allCustomers } from '@/lib/data';
import type { Customer } from '@/lib/types';

export default function CustomersPage() {
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return allCustomers;
        const lowercasedTerm = searchTerm.toLowerCase();
        return allCustomers.filter(customer => 
            customer.name.toLowerCase().includes(lowercasedTerm) ||
            customer.phone.includes(searchTerm) ||
            customer.document.replace(/[^\d]/g, "").includes(searchTerm.replace(/[^\d]/g, ""))
        );
    }, [searchTerm]);

    return (
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
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    Nenhum cliente encontrado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
