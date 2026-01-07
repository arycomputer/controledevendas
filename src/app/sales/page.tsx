import Link from 'next/link';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { sales, customers } from '@/lib/data';
import type { Sale } from '@/lib/types';

export default function SalesPage() {
    const sortedSales = sales.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

    return (
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
                            <TableHead>ID da Venda</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead className="text-center">Itens</TableHead>
                            <TableHead className="text-right">Valor Total</TableHead>
                            <TableHead>
                                <span className="sr-only">Ações</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedSales.map((sale: Sale) => {
                            const customer = customers.find(c => c.id === sale.customerId);
                            const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);

                            return (
                                <TableRow key={sale.id}>
                                    <TableCell className="font-mono text-xs">{sale.id.toUpperCase()}</TableCell>
                                    <TableCell className="font-medium">{customer?.name || 'N/A'}</TableCell>
                                    <TableCell>{new Date(sale.saleDate).toLocaleDateString('pt-BR')}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary">{totalItems} item(s)</Badge>
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
                                                <DropdownMenuItem onClick={() => console.log(`View ${sale.id}`)}>Visualizar</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => console.log(`Delete ${sale.id}`)} className="text-red-600">Cancelar Venda</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
