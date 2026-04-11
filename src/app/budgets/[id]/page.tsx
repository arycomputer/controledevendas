'use client'

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Printer, FilePenLine, Share2, MessageSquare, FileText, ImageIcon } from "lucide-react"
import React, { useState, useRef } from 'react';
import Image from "next/image";
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast";
import { useDoc, useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import type { Budget, Customer, Product, Sale } from "@/lib/types"
import { collection, doc, writeBatch } from "firebase/firestore"
import { AuthGuard } from "@/components/app/auth-guard"
import { useCompany } from "@/context/company-context";
import { Badge } from "@/components/ui/badge";
import { v4 as uuidv4 } from 'uuid';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


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
    const budgetId = params.id as string;
    const { companyData } = useCompany();
    const { toast } = useToast();

    const printRef = useRef<HTMLDivElement>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    const budgetDocRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'budgets', budgetId);
    }, [firestore, budgetId]);
    const { data: budget, isLoading: budgetLoading } = useDoc<Budget>(budgetDocRef);
    
    const customerDocRef = useMemoFirebase(() => {
        if (!firestore || !budget) return null;
        return doc(firestore, 'customers', budget.customerId);
    }, [firestore, budget]);
    const { data: customer, isLoading: customerLoading } = useDoc<Customer>(customerDocRef);
    
    const productsCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'parts');
    }, [firestore]);
    const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollectionRef);

    const salesCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'sales');
    }, [firestore]);
    const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesCollectionRef);

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
                    .print-image { max-width: 150px; border-radius: 4px; margin: 5px; }
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

    const generateBlob = async (type: 'image' | 'pdf'): Promise<{ blob: Blob, fileName: string }> => {
        if (!printRef.current) throw new Error("Elemento não encontrado");

        const canvas = await html2canvas(printRef.current, {
            useCORS: true,
            scale: 2,
            backgroundColor: "#ffffff",
            logging: false,
        });

        const fileName = `orcamento-${budgetId.substring(0, 6)}.`;

        if (type === 'image') {
            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    if (blob) resolve({ blob, fileName: fileName + 'png' });
                }, 'image/png');
            });
        } else {
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            const blob = pdf.output('blob');
            return { blob, fileName: fileName + 'pdf' };
        }
    }

    const handleShare = async (type: 'image' | 'pdf') => {
        if (!customer) return;
        setIsSharing(true);

        try {
            const { blob, fileName } = await generateBlob(type);
            const file = new File([blob], fileName, { type: blob.type });

            const message = `Olá ${customer.name}, segue em anexo o orçamento solicitado. ID: #${budgetId.substring(0,6).toUpperCase()}`;
            const whatsappUrl = `https://wa.me/${customer.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Orçamento',
                    text: message,
                });
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);

                toast({
                    title: "Arquivo gerado!",
                    description: "O arquivo foi baixado. Agora, envie-o manualmente no WhatsApp que acabamos de abrir.",
                });

                window.open(whatsappUrl, '_blank');
            }
        } catch (error) {
            console.error("Erro ao compartilhar:", error);
            toast({
                title: "Erro ao gerar arquivo",
                description: "Não foi possível preparar o arquivo para compartilhamento.",
                variant: "destructive"
            });
        } finally {
            setIsSharing(false);
        }
    }
    
    const handleConvertToSale = async () => {
        if (!firestore || !budget || !products) return;

        setIsConverting(true);

        try {
            const existingSale = sales?.find(s => s.budgetId === budget.id);
            if (existingSale) {
                toast({
                    title: "Orçamento já convertido",
                    description: `Este orçamento já foi convertido na venda #${existingSale.id.substring(0, 6).toUpperCase()}.`,
                });
                router.push(`/sales/${existingSale.id}`);
                return;
            }

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

            const batch = writeBatch(firestore);

            for (const item of budget.items) {
                const product = products.find(p => p.id === item.productId);
                if (product && product.type === 'piece') {
                    const productRef = doc(firestore, 'parts', product.id);
                    const newQuantity = (product.quantity || 0) - item.quantity;
                    batch.update(productRef, { quantity: newQuantity });
                }
            }
            
            const saleId = uuidv4();
            const saleData: Sale = {
                id: saleId,
                customerId: budget.customerId,
                items: budget.items,
                totalAmount: budget.totalAmount,
                saleDate: new Date().toISOString(),
                paymentMethod: 'cash',
                status: 'pending',
                downPayment: 0,
                amountReceivable: budget.totalAmount,
                budgetId: budget.id,
            };
            const saleRef = doc(firestore, "sales", saleId);
            batch.set(saleRef, saleData);

            await batch.commit();

            toast({
                title: "Sucesso!",
                description: "Orçamento convertido em venda.",
            });
            router.push(`/sales/${saleId}`);

        } catch (error) {
            console.error("Error converting budget to sale: ", error)
            toast({
                title: "Erro!",
                description: "Não foi possível converter o orçamento em venda.",
                variant: 'destructive',
            })
        } finally {
            setIsConverting(false);
        }
    };
    
    const isLoading = budgetLoading || customerLoading || productsLoading || salesLoading;
    
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
        <AuthGuard>
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 no-print">
                        <div>
                            <CardTitle>Detalhes do Orçamento</CardTitle>
                            <CardDescription className="font-mono text-xs mt-1">#{budget.id.toUpperCase()}</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => router.back()}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                            </Button>
                            
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="secondary" size="sm" disabled={isSharing}>
                                        {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                                        Compartilhar
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Formato de Envio</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleShare('image')}>
                                        <ImageIcon className="mr-2 h-4 w-4" /> WhatsApp (Imagem)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleShare('pdf')}>
                                        <FileText className="mr-2 h-4 w-4" /> WhatsApp (PDF)
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                             {budget.status === 'approved' && (
                                <Button size="sm" onClick={handleConvertToSale} disabled={isConverting}>
                                    {isConverting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <FilePenLine className="mr-2 h-4 w-4" />
                                    )}
                                    {isConverting ? 'Convertendo...' : 'Virar Venda'}
                                </Button>
                            )}
                             <Button size="sm" onClick={handlePrint}>
                                <Printer className="mr-2 h-4 w-4" /> Imprimir
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent ref={printRef} className="bg-white text-black p-8">
                    <div className="header text-center mb-6">
                        <h1 className="text-2xl font-bold">{companyData.name}</h1>
                        <p className="text-sm">{companyData.address}</p>
                        <p className="text-sm">Telefone: {companyData.phone} | E-mail: {companyData.email}</p>
                    </div>

                    <hr className="my-4 border-gray-200"/>

                    <div className="grid grid-cols-2 gap-6 text-sm mb-6">
                        <div className="info-item">
                            <h4 className="font-bold uppercase text-gray-500 text-[10px] mb-1">Cliente</h4>
                            <p className="font-semibold">{customer.name}</p>
                            <p>{customer.email}</p>
                            <p>{customer.phone}</p>
                        </div>
                        <div className="info-item">
                            <h4 className="font-bold uppercase text-gray-500 text-[10px] mb-1">Datas e Status</h4>
                            <p><span className="font-medium">Data:</span> {new Date(budget.budgetDate).toLocaleDateString('pt-BR')}</p>
                            <p><span className="font-medium">Válido até:</span> {new Date(budget.validUntil).toLocaleDateString('pt-BR')}</p>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="font-medium">Status:</span>
                                <Badge variant='default' className={`${statusColors[budget.status]} no-print text-[10px] px-2 py-0`}>
                                    {statusLabels[budget.status]}
                                </Badge>
                                <span className="print-only uppercase font-bold text-[10px]">{statusLabels[budget.status]}</span>
                            </div>
                        </div>
                    </div>

                    {(budget.itemDescription || budget.problemDescription) && (
                         <>
                            <Separator className="my-4"/>
                             <div className="space-y-6 text-sm mb-6">
                                <div className="grid grid-cols-2 gap-6">
                                    {(budget.itemDescription || budget.model) && (
                                        <div className="info-item">
                                            <h4 className="font-bold uppercase text-gray-500 text-[10px] mb-1">Equipamento</h4>
                                            {budget.itemDescription && <p>{budget.itemDescription}</p>}
                                            {budget.model && <p className="font-medium">{budget.model}</p>}
                                            {budget.serialNumber && <p className="text-xs text-muted-foreground">S/N: {budget.serialNumber}</p>}
                                        </div>
                                    )}
                                    {budget.problemDescription && (
                                         <div className="info-item">
                                            <h4 className="font-bold uppercase text-gray-500 text-[10px] mb-1">Problema Relatado</h4>
                                            <p>{budget.problemDescription}</p>
                                        </div>
                                    )}
                                </div>
                                {budget.solutionDescription && (
                                    <div className="info-item mt-6">
                                        <h4 className="font-bold uppercase text-gray-500 text-[10px] mb-1">Solução Proposta</h4>
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
                                <h4 className="font-bold uppercase text-gray-500 text-[10px] mb-2">Fotos do Equipamento</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {budget.imageUrls.map((url, index) => (
                                        <div key={index} className="relative aspect-square rounded-md border overflow-hidden w-full">
                                            <Image 
                                                src={url} 
                                                alt={`Equipamento ${index + 1}`} 
                                                fill 
                                                className="object-cover"
                                                sizes="(max-width: 768px) 50vw, 25vw"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}


                    <Separator className="my-4" />
                    
                    <div className="overflow-x-auto">
                        <h3 className="font-bold uppercase text-gray-500 text-[10px] mb-2">Itens do Orçamento</h3>
                        <Table className="border rounded-md w-full">
                            <TableHeader className="bg-gray-50">
                                <TableRow>
                                    <TableHead className="text-black font-bold h-8 text-xs">Item</TableHead>
                                    <TableHead className="text-black font-bold h-8 text-xs text-center w-[60px]">Qtd.</TableHead>
                                    <TableHead className="text-black font-bold h-8 text-xs text-right w-[100px]">Preço Unit.</TableHead>
                                    <TableHead className="text-black font-bold h-8 text-xs text-right w-[100px]">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {budget.items.map((item, index) => {
                                    const product = products?.find(p => p.id === item.productId);
                                    return (
                                    <TableRow key={index} className="h-8">
                                        <TableCell className="py-1 text-xs">{product?.name || 'Item não encontrado'}</TableCell>
                                        <TableCell className="py-1 text-xs text-center">{item.quantity}</TableCell>
                                        <TableCell className="py-1 text-xs text-right">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitPrice)}
                                        </TableCell>
                                        <TableCell className="py-1 text-xs text-right font-medium">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantity * item.unitPrice)}
                                        </TableCell>
                                    </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex justify-end mt-6">
                        <div className="w-full max-w-[200px] space-y-1">
                            <div className="flex justify-between items-center text-base font-bold border-t-2 border-black pt-2">
                                <span>TOTAL</span>
                                <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.totalAmount)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </AuthGuard>
    )
}

export default function BudgetDetailsPage() {
    return (
        <BudgetDetailsPageContent />
    )
}
