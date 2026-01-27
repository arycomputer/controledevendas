'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { PlusCircle, Trash2, Loader2 } from "lucide-react"
import { v4 as uuidv4 } from 'uuid';

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useMemo } from "react"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, setDoc, updateDoc } from "firebase/firestore"
import type { Customer, Product } from "@/lib/types"
import { AuthGuard } from "@/components/app/auth-guard"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const saleFormSchema = z.object({
  customerId: z.string({ required_error: "É necessário selecionar um cliente." }).min(1, "É necessário selecionar um cliente."),
  items: z.array(z.object({
    productId: z.string().min(1, "Selecione um produto ou serviço."),
    quantity: z.coerce.number().int().min(1, "Mínimo 1."),
    unitPrice: z.coerce.number().min(0, "O preço unitário não pode ser negativo."),
  })).min(1, "Adicione pelo menos um item à venda."),
  paymentMethod: z.enum(['cash', 'pix', 'credit_card', 'debit_card'], { required_error: "Selecione uma forma de pagamento." }),
  status: z.enum(['paid', 'pending'], { required_error: "Selecione o status do pagamento." }),
  downPayment: z.coerce.number().optional(),
})

type SaleFormValues = z.infer<typeof saleFormSchema>

function NewSalePageContent() {
  const router = useRouter()
  const { toast } = useToast()
  const firestore = useFirestore()

  const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);

  const productsCollection = useMemoFirebase(() => collection(firestore, 'parts'), [firestore]);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      customerId: "",
      items: [],
      paymentMethod: 'cash',
      status: 'paid',
      downPayment: 0,
    },
  })

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  })
  
  const watchedItems = form.watch("items");
  const watchedStatus = form.watch("status");
  const watchedDownPayment = form.watch("downPayment");

  const totalAmount = useMemo(() => watchedItems.reduce((acc, current) => {
    return acc + ((current.unitPrice || 0) * (current.quantity || 0));
  }, 0), [watchedItems]);
  
  const amountReceivable = useMemo(() => {
     if (watchedStatus === 'paid') return 0;
     const downPayment = watchedDownPayment || 0;
     return totalAmount - downPayment;
  }, [totalAmount, watchedStatus, watchedDownPayment]);


  useEffect(() => {
    if (watchedStatus === 'paid') {
      form.setValue('downPayment', totalAmount);
    }
  }, [watchedStatus, totalAmount, form]);


  async function onSubmit(data: SaleFormValues) {
    if (!firestore || !products) return;
    try {
      // Stock validation
      for (const item of data.items) {
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
      for (const item of data.items) {
        const product = products.find(p => p.id === item.productId);
        if (product && product.type === 'piece') {
          const productRef = doc(firestore, 'parts', product.id);
          const newQuantity = (product.quantity || 0) - item.quantity;
          await updateDoc(productRef, { quantity: newQuantity });
        }
      }
      
      const saleId = uuidv4();
      const saleData = {
        ...data,
        id: saleId,
        totalAmount,
        amountReceivable: amountReceivable,
        downPayment: data.downPayment || 0,
        saleDate: new Date().toISOString(),
        paymentDate: data.status === 'paid' ? new Date().toISOString() : undefined,
      };
      await setDoc(doc(firestore, "sales", saleId), saleData);

      toast({
        title: "Sucesso!",
        description: "Nova venda registrada.",
      })
      router.push('/sales')
    } catch (error) {
      console.error("Error creating sale: ", error)
      toast({
        title: "Erro!",
        description: "Não foi possível registrar a venda.",
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
            unitPrice: product.price,
            quantity: product.type === 'service' ? 1 : watchedItems[index].quantity || 1
        });
    }
  }

  const isLoading = customersLoading || productsLoading;

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Registrar Nova Venda</CardTitle>
        <CardDescription>Selecione o cliente e os produtos/serviços para registrar uma nova venda.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem className="max-w-sm">
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers?.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Itens da Venda</FormLabel>
              <div className="mt-2 space-y-4">
                {fields.map((field, index) => {
                   const selectedProduct = products?.find(p => p.id === watchedItems[index]?.productId);
                   const isService = selectedProduct?.type === 'service';

                   return (
                     <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_80px_120px_120px_auto] items-end gap-4 p-4 border rounded-lg bg-muted/20">
                        <FormField
                          control={form.control}
                          name={`items.${index}.productId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs md:hidden">Produto/Serviço</FormLabel>
                              <Select onValueChange={(value) => handleProductChange(value, index)} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um item" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {products?.map(product => {
                                      const isOutOfStock = product.type === 'piece' && (!product.quantity || product.quantity <= 0);
                                      const isAlreadySelected = watchedItems.some((item, itemIndex) => item.productId === product.id && itemIndex !== index);
                                      const isDisabled = isOutOfStock || isAlreadySelected;
                                    return (
                                    <SelectItem key={product.id} value={product.id} disabled={isDisabled}>
                                      {product.name} ({product.type === 'piece' ? `${product.quantity || 0} em estoque` : 'Serviço'}) - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                                    </SelectItem>
                                  )})
                                }
                                </SelectContent>
                              </Select>
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
                                <Input type="number" min="1" disabled={isService} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs md:hidden">Preço Unit. (R$)</FormLabel>
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
                                    (watchedItems[index]?.unitPrice || 0) * (watchedItems[index]?.quantity || 0)
                                )}
                            </span>
                        </div>
                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remover item</span>
                        </Button>
                      </div>
                   )
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Item
                </Button>
                 {form.formState.errors.items && <p className="text-sm font-medium text-destructive">{form.formState.errors.items.message}</p>}
              </div>
            </div>
            
            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Forma de Pagamento</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-wrap gap-4"
                            >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="cash" />
                                </FormControl>
                                <FormLabel className="font-normal">Dinheiro</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="pix" />
                                </FormControl>
                                <FormLabel className="font-normal">Pix</FormLabel>
                            </FormItem>
                             <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="debit_card" />
                                </FormControl>
                                <FormLabel className="font-normal">Cartão de Débito</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="credit_card" />
                                </FormControl>
                                <FormLabel className="font-normal">Cartão de Crédito</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Status do Pagamento</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex items-center space-x-4"
                            >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="paid" />
                                </FormControl>
                                <FormLabel className="font-normal">Pago</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="pending" />
                                </FormControl>
                                <FormLabel className="font-normal">A Receber</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    {watchedStatus === 'pending' && (
                        <FormField
                            control={form.control}
                            name="downPayment"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Entrada (R$)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" placeholder="Ex: 50,00" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>
                 <div className="space-y-4 rounded-lg bg-muted/30 p-6">
                    <h4 className="text-lg font-semibold">Resumo Financeiro</h4>
                    <div className="flex justify-between items-center text-lg">
                        <span>Total dos Itens</span>
                        <span className="font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)}
                        </span>
                    </div>
                     {watchedStatus === 'pending' && (
                        <>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Entrada</span>
                                <span>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(watchedDownPayment || 0)}
                                </span>
                            </div>
                            <Separator/>
                            <div className="flex justify-between items-center text-lg">
                                <span className="text-destructive">Valor a Receber</span>
                                <span className="font-bold text-destructive">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amountReceivable)}
                                </span>
                            </div>
                        </>
                    )}
                     {watchedStatus === 'paid' && (
                        <>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Total Pago</span>
                                <span>
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)}
                                </span>
                            </div>
                            <Separator/>
                             <div className="flex justify-between items-center text-lg">
                                <span className="text-green-600">Total a Receber</span>
                                <span className="font-bold text-green-600">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(0)}
                                </span>
                            </div>
                        </>
                    )}

                </div>
            </div>


            <div className="flex justify-end gap-2 pt-8">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                </Button>
                <Button type="submit">Registrar Venda</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}


export default function NewSalePage() {
    return (
        <AuthGuard>
            <NewSalePageContent />
        </AuthGuard>
    )
}
