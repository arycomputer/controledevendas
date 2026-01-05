import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { parts } from '@/lib/data';
import type { Part } from '@/lib/types';

export default function PartsPage() {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Estoque de Peças</CardTitle>
                        <CardDescription>Visualize e gerencie as peças do seu inventário.</CardDescription>
                    </div>
                    <Button asChild>
                        <Link href="/parts/new">
                            <PlusCircle className="mr-2 h-4 w-4" /> Nova Peça
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[30%]">Nome</TableHead>
                            <TableHead className="w-[45%]">Descrição</TableHead>
                            <TableHead className="text-right">Preço</TableHead>
                            <TableHead className="text-right">Estoque</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {parts.map((part: Part) => (
                            <TableRow key={part.id}>
                                <TableCell className="font-medium">{part.name}</TableCell>
                                <TableCell className="text-muted-foreground">{part.description}</TableCell>
                                <TableCell className="text-right">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(part.price)}
                                </TableCell>
                                <TableCell className="text-right">{part.quantity}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
