'use client'

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { sales, customers, products } from "@/lib/data"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function SaleDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const saleId = params.id as string;

    const sale = sales.find(s => s.id === saleId);
    const customer = sale ? customers.find(c => c.id === sale.customerId) : null;

    if (!sale || !customer) {
        return (
            <div className="flex flex-col gap-4 items-center justify-center h-full">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Venda não encontrada</CardTitle>
                        <CardDescription>A venda que você está tentando visualizar não existe ou foi removida.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                         <Button asChild variant="outline">
                            <Link href="/sales">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Vendas
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    const totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Detalhes da Venda</CardTitle>
                        <CardDescription className="font-mono text-xs mt-1">{sale.id.toUpperCase()}</CardDescription>
                    </div>
                     <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-1">
                        <h3 className="font-semibold">Cliente</h3>
                        <p className="text-muted-foreground">{customer.name}</p>
                        <p className="text-muted-foreground">{customer.email}</p>
                        <p className="text-muted-foreground">{customer.phone}</p>
                    </div>
                     <div className="space-y-1">
                        <h3 className="font-semibold">Detalhes da Venda</h3>
                        <p className="text-muted-foreground">Data: {new Date(sale.saleDate).toLocaleDateString('pt-BR')}</p>
                        <p className="text-muted-foreground">Itens: <Badge variant="secondary" className="ml-1">{totalItems}</Badge></p>
                    </div>
                </div>

                <Separator />
                
                <div>
                     <h3 className="font-semibold mb-2 text-sm">Itens Inclusos</h3>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produto/Serviço</TableHead>
                                <TableHead className="text-center">Qtd.</TableHead>
                                <TableHead className="text-right">Preço Unit.</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sale.items.map((item, index) => {
                                const product = products.find(p => p.id === item.productId);
                                return (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{product?.name || 'Item não encontrado'}</TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-right">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantity * item.unitPrice)}
                                    </TableCell>
                                </TableRow>
                                )
                            })}
                        </TableBody>
                     </Table>
                </div>

                 <Separator />

                <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total da Venda</span>
                    <span>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.totalAmount)}
                    </span>
                </div>

            </CardContent>
        </Card>
    )
}
