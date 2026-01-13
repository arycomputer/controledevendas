'use client'

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Printer, FileText } from "lucide-react"
import React from 'react';
import Image from "next/image";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useDoc, useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import type { Budget, Customer, Product, Sale } from "@/lib/types"
import { collection, doc, setDoc, updateDoc } from "firebase/firestore"
import { AuthGuard } from "@/components/app/auth-guard"
import { useCompany } from "@/context/company-context";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';
import { Badge } from "@/components/ui/badge";

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

function BudgetDetailsPageContent() {
    const params = useParams();
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();
    const budgetId = params.id as string;
    const { companyData } = useCompany();

    const printRef = React.useRef<HTMLDivElement>(null);

    const budgetDocRef = useMemoFirebase(() => doc(firestore, 'budgets', budgetId), [firestore, budgetId]);
    const { data: budget, isLoading: budgetLoading } = useDoc<Budget>(budgetDocRef);
    
    const customerDocRef = useMemoFirebase(() => budget ? doc(firestore, 'customers', budget.customerId) : null, [firestore, budget]);
    const { data: customer, isLoading: customerLoading } = useDoc<Customer>(customerDocRef);
    
    const productsCollectionRef = useMemoFirebase(() => collection(firestore, 'parts'), [firestore]);
    const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollectionRef);

    const handlePrint = () => {
        const printContent = printRef.current;
        if (printContent) {
            const printWindow = window.open('', '', 'height=800,width=800');
            printWindow?.document.write('<html><head><title>Orçamento</title>');
            printWindow?.document.write(`
                <style>
                    body { font-family: sans-serif; margin: 2rem; }
                    .header, .footer { text-align: center; margin-bottom: 1rem; }
                    .header h1 { margin: 0; }
                    .header p { margin: 0; font-size: 0.9rem; }
                    .card { border: 1px solid #ccc; border-radius: 8px; padding: 1.5rem; }
                    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
                    .section-title { font-weight: bold; margin-bottom: 0.5rem; font-size: 1.1rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem; }
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem; }
                    .info-item h4 { font-weight: bold; margin: 0 0 0.25rem 0; }
                    .info-item p, .info-item div { margin: 0; color: #555; }
                    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    .totals { float: right; width: 50%; margin-top: 1rem; }
                    .totals .flex { display: flex; justify-content: space-between; }
                    .totals span { font-size: 0.9rem; }
                    .totals .total { font-weight: bold; font-size: 1rem; }
                    hr { border: none; border-top: 1px solid #eee; margin: 1.5rem 0; }
                    @media print {
                        body { margin: 0; }
                        .no-print { display: none; }
                    }
                </style>
            `);
            printWindow?.document.write('</head><body>');
            printWindow?.document.write(printContent.innerHTML);
            printWindow?.document.write('</body></html>');
            printWindow?.document.close();
            printWindow?.focus();
            printWindow?.print();
        }
    }
    
     const handleConvertToSale = async () => {
        if (!firestore || !products || !budget) return;
        try {
            // Stock validation
            for (const item of budget.items) {
                const product = products.find(p => p.id === item.productId);
                if (product && product.type === 'piece' && (product.quantity === undefined || product.quantity < item.quantity)) {
                    toast({
                        title: "Erro de Estoque",
                        description: `Estoque insuficiente para o produto "${product.name}". Disponível: ${product.quantity || 0}.`,
                        variant: "destructive",
                    });
                    return;
                }
            }

            // Update stock
            for (const item of budget.items) {
                const product = products.find(p => p.id === item.productId);
                if (product && product.type === 'piece') {
                    const productRef = doc(firestore, 'parts', product.id);
                    const newQuantity = (product.quantity || 0) - item.quantity;
                    await updateDoc(productRef, { quantity: newQuantity });
                }
            }
            
            const saleId = uuidv4();
            const saleData: Sale = {
                id: saleId,
                customerId: budget.customerId,
                items: budget.items,
                totalAmount: budget.totalAmount,
                saleDate: new Date().toISOString(),
                paymentMethod: 'cash', // Default
                status: 'pending', // Default
                downPayment: 0,
                amountReceivable: budget.totalAmount,
            };
            await setDoc(doc(firestore, "sales", saleId), saleData);

            await updateDoc(budgetDocRef, { status: "approved" });

            toast({
                title: "Sucesso!",
                description: "Orçamento convertido em venda.",
            })
            router.push(`/sales/${saleId}`)
        } catch (error) {
            console.error("Error converting budget to sale: ", error)
            toast({
                title: "Erro!",
                description: "Não foi possível converter o orçamento em venda.",
                variant: 'destructive',
            })
        }
    }


    const isLoading = budgetLoading || customerLoading || productsLoading;
    
    if(isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!budget || !customer) {
        return (
            <div className="flex flex-col gap-4 items-center justify-center h-full">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Orçamento não encontrado</CardTitle>
                        <CardDescription>O orçamento que você está tentando visualizar não existe ou foi removido.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                         <Button asChild variant="outline">
                            <Link href="/budgets">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Orçamentos
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <>
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <div className="flex justify-between items-start no-print">
                        <div>
                            <CardTitle>Detalhes do Orçamento</CardTitle>
                            <CardDescription className="font-mono text-xs mt-1">#{budget.id.toUpperCase()}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => router.back()}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                            </Button>
                             <Button onClick={handlePrint}>
                                <Printer className="mr-2 h-4 w-4" /> Imprimir
                            </Button>
                            {budget.status === 'pending' && (
                                <Button onClick={handleConvertToSale}>
                                    <FileText className="mr-2 h-4 w-4" /> Converter em Venda
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent ref={printRef}>
                    <div className="header">
                        <h1>{companyData.name}</h1>
                        <p>{companyData.address}</p>
                        <p>Telefone: {companyData.phone} | E-mail: {companyData.email}</p>
                    </div>

                    <hr/>

                    <div className="grid md:grid-cols-2 gap-6 text-sm mb-6">
                        <div className="info-item">
                            <h4 className="font-semibold">Cliente</h4>
                            <p>{customer.name}</p>
                            <p>{customer.email}</p>
                            <p>{customer.phone}</p>
                        </div>
                        <div className="info-item">
                            <h4 className="font-semibold">Datas e Status</h4>
                            <p>Data do Orçamento: {new Date(budget.budgetDate).toLocaleDateString('pt-BR')}</p>
                            <p>Válido até: {new Date(budget.validUntil).toLocaleDateString('pt-BR')}</p>
                             <div className="flex items-center gap-2">
                                Status:
                                <Badge variant='default' className={`${statusColors[budget.status]} no-print`}>
                                    {statusLabels[budget.status]}
                                </Badge>
                                <span className="print-only">{statusLabels[budget.status]}</span>
                            </div>
                        </div>
                    </div>

                    {(budget.itemDescription || budget.problemDescription) && (
                         <>
                            <Separator className="my-4"/>
                             <div className="space-y-6 text-sm mb-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    {(budget.itemDescription || budget.model) && (
                                        <div className="info-item">
                                            <h4 className="font-semibold">Equipamento</h4>
                                            {budget.itemDescription && <p>{budget.itemDescription}</p>}
                                            {budget.model && <p className="font-medium">{budget.model}</p>}
                                            {budget.serialNumber && <p className="text-xs text-muted-foreground">S/N: {budget.serialNumber}</p>}
                                        </div>
                                    )}
                                    {budget.problemDescription && (
                                         <div className="info-item">
                                            <h4 className="font-semibold">Problema/Defeito Relatado</h4>
                                            <p>{budget.problemDescription}</p>
                                        </div>
                                    )}
                                </div>
                                {budget.solutionDescription && (
                                    <div className="info-item mt-6">
                                        <h4 className="font-semibold">Solução Proposta</h4>
                                        <p>{budget.solutionDescription}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                    
                    {budget.imageUrls && budget.imageUrls.length > 0 && (
                        <>
                            <Separator className="my-4"/>
                            <div>
                                <h4 className="font-semibold text-sm mb-4">Fotos do Equipamento</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {budget.imageUrls.map((url, index) => (
                                        <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                                            <div className="relative aspect-square group overflow-hidden rounded-md border">
                                                <Image src={url} alt={`Imagem do equipamento ${index + 1}`} fill className="object-cover transition-transform group-hover:scale-105" />
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}


                    <Separator />
                    
                    <div>
                        <h3 className="font-semibold my-4 text-sm section-title">Itens do Orçamento</h3>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-center">Qtd.</TableHead>
                                    <TableHead className="text-right">Preço Unit.</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {budget.items.map((item, index) => {
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

                    <Separator className="my-6" />

                    <div className="flex justify-end">
                        <div className="w-full max-w-sm space-y-2 totals">
                            <div className="flex justify-between items-center text-lg font-bold total">
                                <span>Total</span>
                                <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.totalAmount)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    )
}

export default function BudgetDetailsPage() {
    return (
        <AuthGuard>
            <BudgetDetailsPageContent />
        </AuthGuard>
    )
}
