'use client'

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Printer } from "lucide-react"
import React from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useDoc, useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import type { ServiceOrder, Customer, Product } from "@/lib/types"
import { collection, doc } from "firebase/firestore"
import { AuthGuard } from "@/components/app/auth-guard"
import { useCompany } from "@/context/company-context";

const statusLabels: { [key: string]: string } = {
    pending: 'Pendente',
    in_progress: 'Em Andamento',
    completed: 'Concluída',
    delivered: 'Entregue',
};

const statusColors: { [key: string]: string } = {
    pending: 'bg-yellow-500 hover:bg-yellow-600',
    in_progress: 'bg-blue-500 hover:bg-blue-600',
    completed: 'bg-green-600 hover:bg-green-700',
    delivered: 'bg-gray-500 hover:bg-gray-600',
};

function ServiceOrderDetailsPageContent() {
    const params = useParams();
    const router = useRouter();
    const firestore = useFirestore();
    const orderId = params.id as string;
    const { companyData } = useCompany();

    const printRef = React.useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const printContent = printRef.current;
        if (printContent) {
            const printWindow = window.open('', '', 'height=800,width=800');
            printWindow?.document.write('<html><head><title>Ordem de Serviço</title>');
            // A basic stylesheet for printing
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
                    .info-item p { margin: 0; color: #555; }
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


    // Data fetching
    const orderDocRef = useMemoFirebase(() => doc(firestore, 'serviceOrders', orderId), [firestore, orderId]);
    const { data: order, isLoading: orderLoading } = useDoc<ServiceOrder>(orderDocRef);
    
    const customerDocRef = useMemoFirebase(() => order ? doc(firestore, 'customers', order.customerId) : null, [firestore, order]);
    const { data: customer, isLoading: customerLoading } = useDoc<Customer>(customerDocRef);
    
    const productsCollectionRef = useMemoFirebase(() => collection(firestore, 'parts'), [firestore]);
    const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollectionRef);

    const isLoading = orderLoading || customerLoading || productsLoading;
    
    if(isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!order || !customer) {
        return (
            <div className="flex flex-col gap-4 items-center justify-center h-full">
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Ordem de Serviço não encontrada</CardTitle>
                        <CardDescription>A O.S. que você está tentando visualizar não existe ou foi removida.</CardDescription>
                    </CardHeader>
                    <CardFooter>
                         <Button asChild variant="outline">
                            <Link href="/service-orders">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Ordens de Serviço
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <>
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <div className="flex justify-between items-center no-print">
                        <div>
                            <CardTitle>Detalhes da Ordem de Serviço</CardTitle>
                            <CardDescription className="font-mono text-xs mt-1">#{order.id.toUpperCase()}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => router.back()}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                            </Button>
                             <Button onClick={handlePrint}>
                                <Printer className="mr-2 h-4 w-4" /> Imprimir
                            </Button>
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
                            <h4 className="font-semibold">Item</h4>
                            <p>{order.itemDescription}</p>
                        </div>
                    </div>

                     <div className="grid md:grid-cols-2 gap-6 text-sm mb-6">
                         <div className="info-item">
                            <h4 className="font-semibold">Datas e Status</h4>
                            <p>Entrada: {new Date(order.entryDate).toLocaleDateString('pt-BR')}</p>
                            {order.exitDate && <p>Saída: {new Date(order.exitDate).toLocaleDateString('pt-BR')}</p>}
                            <p className="flex items-center gap-2">
                                Status:
                                <Badge variant='default' className={`${statusColors[order.status]} no-print`}>
                                    {statusLabels[order.status]}
                                </Badge>
                                <span className="print-only">{statusLabels[order.status]}</span>
                            </p>
                        </div>
                        <div className="info-item">
                            <h4 className="font-semibold">Problema Relatado</h4>
                            <p>{order.problemDescription}</p>
                        </div>
                    </div>

                    <Separator />
                    
                    <div>
                        <h3 className="font-semibold my-4 text-sm section-title">Peças e Serviços Utilizados</h3>
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
                                {order.items.map((item, index) => {
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
                                <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.totalAmount)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    )
}

export default function ServiceOrderDetailsPage() {
    return (
        <AuthGuard>
            <ServiceOrderDetailsPageContent />
        </AuthGuard>
    )
}
