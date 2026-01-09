'use client'

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useDoc, useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import type { Sale, Customer, Product } from "@/lib/types"
import { collection, doc } from "firebase/firestore"
import { AuthGuard } from "@/components/app/auth-guard"

const paymentMethodLabels: { [key: string]: string } = {
    cash: 'Dinheiro',
    pix: 'Pix',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
};


function SaleDetailsPageContent() {
    const params = useParams();
    const router = useRouter();
    const firestore = useFirestore();
    const saleId = params.id as string;

    const saleDocRef = useMemoFirebase(() => doc(firestore, 'sales', saleId), [firestore, saleId]);
    const { data: sale, isLoading: saleLoading } = useDoc<Sale>(saleDocRef);
    
    // We fetch customer and product data here to display in the sale details
    const customerDocRef = useMemoFirebase(() => sale ? doc(firestore, 'customers', sale.customerId) : null, [firestore, sale]);
    const { data: customer, isLoading: customerLoading } = useDoc<Customer>(customerDocRef);
    
    const productsCollectionRef = useMemoFirebase(() => collection(firestore, 'parts'), [firestore]);
    const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollectionRef);

    const isLoading = saleLoading || customerLoading || productsLoading;
    
    if(isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
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
                    <div className="space-y-1">
                        <h3 className="font-semibold">Pagamento</h3>
                        <p className="text-muted-foreground">Forma: {paymentMethodLabels[sale.paymentMethod]}</p>
                        <div className="text-muted-foreground flex items-center gap-2">
                            Status:
                             <Badge variant={sale.status === 'paid' ? 'default' : 'destructive'} className={sale.status === 'paid' ? 'bg-green-600 hover:bg-green-700' : ''}>
                                {sale.status === 'paid' ? 'Pago' : 'A Receber'}
                            </Badge>
                        </div>
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
                                const product = products?.find(p => p.id === item.productId);
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

                 <div className="grid grid-cols-2 gap-4 text-sm">
                    <div></div>
                     <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.totalAmount)}</span>
                        </div>
                        {sale.status === 'pending' && (
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Entrada</span>
                            <span>- {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.downPayment || 0)}</span>
                        </div>
                        )}
                         <Separator />
                          <div className="flex justify-between items-center font-bold text-base">
                            <span>{sale.status === 'paid' ? 'Total Pago' : 'Total a Receber'}</span>
                            <span className={sale.status === 'pending' ? 'text-destructive' : 'text-green-600'}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.status === 'paid' ? sale.totalAmount : sale.amountReceivable || 0)}
                            </span>
                        </div>
                    </div>
                </div>

            </CardContent>
        </Card>
    )
}

export default function SaleDetailsPage() {
    return (
        <AuthGuard>
            <SaleDetailsPageContent />
        </AuthGuard>
    )
}
