
'use client'

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Truck, Calendar as CalendarIcon, FileText } from "lucide-react"
import React from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDoc, useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import type { Purchase, Product } from "@/lib/types"
import { collection, doc } from "firebase/firestore"
import { AuthGuard } from "@/components/app/auth-guard"

function PurchaseDetailsPageContent() {
    const params = useParams();
    const router = useRouter();
    const firestore = useFirestore();
    const purchaseId = params.id as string;

    const purchaseDocRef = useMemoFirebase(() => doc(firestore, 'purchases', purchaseId), [firestore, purchaseId]);
    const { data: purchase, isLoading: purchaseLoading } = useDoc<Purchase>(purchaseDocRef);
    
    const productsCollectionRef = useMemoFirebase(() => collection(firestore, 'parts'), [firestore]);
    const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollectionRef);

    const isLoading = purchaseLoading || productsLoading;
    
    if(isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!purchase) {
        return (
            <div className="flex flex-col gap-4 items-center justify-center h-full">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Compra não encontrada</CardTitle>
                        <CardDescription>O registro que você está tentando visualizar não existe.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                         <Button asChild variant="outline">
                            <Link href="/purchases">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Compras
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                            <Truck className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Detalhes da Compra</CardTitle>
                            <CardDescription className="font-mono text-xs mt-1">ID: {purchase.id.toUpperCase()}</CardDescription>
                        </div>
                    </div>
                     <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">Fornecedor:</span>
                            <span>{purchase.supplierName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">Data da Compra:</span>
                            <span>{new Date(purchase.purchaseDate).toLocaleDateString('pt-BR')}</span>
                        </div>
                    </div>
                    {purchase.notes && (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold">Observações:</span>
                            </div>
                            <p className="text-muted-foreground pl-6 italic">{purchase.notes}</p>
                        </div>
                    )}
                </div>

                <Separator />
                
                <div>
                     <h3 className="font-semibold mb-4 text-sm">Itens Comprados</h3>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produto</TableHead>
                                <TableHead className="text-center">Qtd.</TableHead>
                                <TableHead className="text-right">Custo Unit.</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchase.items.map((item, index) => {
                                const product = products?.find(p => p.id === item.productId);
                                return (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{product?.name || 'Item não encontrado'}</TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-right">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitCost)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantity * item.unitCost)}
                                    </TableCell>
                                </TableRow>
                                )
                            })}
                        </TableBody>
                     </Table>
                </div>

                 <div className="flex justify-end pt-4">
                     <div className="w-full max-w-[200px] space-y-2">
                          <div className="flex justify-between items-center font-bold text-lg border-t pt-2">
                            <span>Total</span>
                            <span className="text-primary">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(purchase.totalAmount)}
                            </span>
                        </div>
                    </div>
                </div>

            </CardContent>
        </Card>
    )
}

export default function PurchaseDetailsPage() {
    return (
        <AuthGuard>
            <PurchaseDetailsPageContent />
        </AuthGuard>
    )
}
