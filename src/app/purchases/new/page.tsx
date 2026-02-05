
'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { PlusCircle, Trash2, Loader2, Calendar as CalendarIcon } from "lucide-react"
import { v4 as uuidv4 } from 'uuid';
import React, { useMemo, useState } from "react";

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, setDoc, writeBatch } from "firebase/firestore"
import type { Product } from "@/lib/types"
import { AuthGuard } from "@/components/app/auth-guard"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SearchableSelect } from "@/components/app/searchable-select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ProductForm } from "@/components/app/product-form"

const purchaseFormSchema = z.object({
  supplierName: z.string().min(2, "Nome do fornecedor é obrigatório."),
  items: z.array(z.object({
    productId: z.string().min(1, "Selecione um produto."),
    quantity: z.coerce.number().int().min(1, "Mínimo 1."),
    unitCost: z.coerce.number().min(0, "O custo não pode ser negativo."),
  })).min(1, "Adicione pelo menos um item."),
  notes: z.string().optional(),
})

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>

function NewPurchasePageContent() {
  const router = useRouter()
  const { toast } = useToast()
  const firestore = useFirestore()
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);

  const productsCollection = useMemoFirebase(() => collection(firestore, 'parts'), [firestore]);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplierName: "",
      items: [],
      notes: "",
    },
  })

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  })
  
  const watchedItems = form.watch("items") || [];

  const totalAmount = useMemo(() => {
    return watchedItems.reduce((acc, current) => {
        return acc + ((Number(current.unitCost) || 0) * (Number(current.quantity) || 0));
    }, 0);
  }, [watchedItems]);

  async function onSubmit(data: PurchaseFormValues) {
    if (!firestore || !products) return;
    try {
      const batch = writeBatch(firestore);
      const purchaseId = uuidv4();

      // Update Stock and Costs
      for (const item of data.items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const productRef = doc(firestore, 'parts', product.id);
          const newQuantity = (product.quantity || 0) + item.quantity;
          batch.update(productRef, { 
            quantity: newQuantity,
            cost: item.unitCost 
          });
        }
      }
      
      const purchaseData = {
        ...data,
        id: purchaseId,
        totalAmount,
        purchaseDate: new Date().toISOString(),
      };
      
      batch.set(doc(firestore, "purchases", purchaseId), purchaseData);

      await batch.commit();

      toast({
        title: "Sucesso!",
        description: "Compra registrada e estoque atualizado.",
      })
      router.push('/purchases')
    } catch (error) {
      console.error("Error creating purchase: ", error)
      toast({
        title: "Erro!",
        description: "Não foi possível registrar a compra.",
        variant: 'destructive',
      })
    }
  }
  
  const handleProductChange = (value: string, index: number) => {
    const product = products?.find(p => p.id === value);
    if (product) {
        update(index, {
            ...watchedItems[index],
            productId: value,
            unitCost: product.cost || 0,
            quantity: 1
        });
    }
  }

  const handleProductCreated = (newProduct: Product) => {
    append({ productId: newProduct.id, quantity: 1, unitCost: 0 });
  }

  if (productsLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  const productOptions = products?.filter(p => p.type === 'piece').map(p => ({ 
    value: p.id, 
    label: `${p.name} (Atual: ${p.quantity || 0})` 
  })) || [];

  return (
    <>
        <Card className="max-w-4xl mx-auto">
        <CardHeader>
            <CardTitle>Nova Compra / Entrada de Estoque</CardTitle>
            <CardDescription>Registre a entrada de mercadorias para atualizar o estoque e os custos.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                control={form.control}
                name="supplierName"
                render={({ field }) => (
                    <FormItem className="max-w-sm">
                    <FormLabel>Fornecedor</FormLabel>
                    <FormControl>
                        <Input placeholder="Ex: Distribuidora de Peças LTDA" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                
                <Separator />

                <div>
                <FormLabel>Itens da Compra</FormLabel>
                <div className="mt-2 space-y-4">
                    {fields.map((field, index) => {
                    return (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_100px_120px_120px_auto] items-end gap-4 p-4 border rounded-lg bg-muted/20">
                            <FormField
                            control={form.control}
                            name={`items.${index}.productId`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-xs md:hidden">Produto</FormLabel>
                                <FormControl>
                                    <SearchableSelect 
                                        options={productOptions}
                                        value={field.value}
                                        onValueChange={(val) => handleProductChange(val, index)}
                                        placeholder="Selecione um produto"
                                        searchPlaceholder="Pesquisar produto..."
                                    />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-xs md:hidden">Qtd.</FormLabel>
                                <FormControl>
                                    <Input type="number" min="1" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <FormField
                            control={form.control}
                            name={`items.${index}.unitCost`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-xs md:hidden">Custo Unit. (R$)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" placeholder="0,00" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground whitespace-nowrap">Subtotal:</span>
                                <span className="font-semibold text-sm">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                        (Number(watchedItems[index]?.unitCost) || 0) * (Number(watchedItems[index]?.quantity) || 0)
                                    )}
                                </span>
                            </div>
                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )
                    })}
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append({ productId: "", quantity: 1, unitCost: 0 })}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsNewProductDialogOpen(true)}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Produto
                        </Button>
                    </div>
                </div>
                </div>
                
                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Observações</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Ex: NF-e 1234, Prazo de entrega 5 dias..." className="resize-none" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="space-y-4 rounded-lg bg-muted/30 p-6">
                        <h4 className="text-lg font-semibold">Resumo Financeiro</h4>
                        <div className="flex justify-between items-center text-lg">
                            <span>Total da Compra</span>
                            <span className="font-bold">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-8">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancelar
                    </Button>
                    <Button type="submit">Salvar Compra</Button>
                </div>
            </form>
            </Form>
        </CardContent>
        </Card>

        <Dialog open={isNewProductDialogOpen} onOpenChange={setIsNewProductDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Criar Novo Produto</DialogTitle>
                    <DialogDescription>
                        Adicione um novo produto ao seu inventário. Ele estará disponível para a compra imediatamente.
                    </DialogDescription>
                </DialogHeader>
                <ProductForm 
                    onSuccess={handleProductCreated}
                    onClose={() => setIsNewProductDialogOpen(false)} 
                />
            </DialogContent>
        </Dialog>
    </>
  )
}

export default function NewPurchasePage() {
    return (
        <AuthGuard>
            <NewPurchasePageContent />
        </AuthGuard>
    )
}
