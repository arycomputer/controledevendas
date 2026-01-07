import Link from 'next/link';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { products } from '@/lib/data';
import type { Product } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export default function ProductsPage() {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Produtos e Serviços</CardTitle>
                        <CardDescription>Visualize e gerencie os itens do seu inventário.</CardDescription>
                    </div>
                    <Button asChild>
                        <Link href="/products/new">
                            <PlusCircle className="mr-2 h-4 w-4" /> Novo Produto
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[25%]">Nome</TableHead>
                            <TableHead className="w-[40%]">Descrição</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">Preço</TableHead>
                            <TableHead className="text-right">Estoque</TableHead>
                            <TableHead>
                                <span className="sr-only">Ações</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product: Product) => (
                            <TableRow key={product.id}>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell className="text-muted-foreground">{product.description}</TableCell>
                                <TableCell>
                                    <Badge variant={product.type === 'piece' ? 'secondary' : 'outline'}>
                                        {product.type === 'piece' ? 'Peça' : 'Serviço'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                                </TableCell>
                                <TableCell className="text-right">{product.type === 'piece' ? product.quantity : 'N/A'}</TableCell>
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
                                            <DropdownMenuItem onClick={() => console.log(`Edit ${product.id}`)}>Editar</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => console.log(`Delete ${product.id}`)} className="text-red-600">Excluir</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
