'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { useRouter, useParams } from "next/navigation"
import { PlusCircle, Trash2, Loader2, Calendar as CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useMemo } from "react"
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, updateDoc } from "firebase/firestore"
import type { Customer, Product, ServiceOrder } from "@/lib/types"
import { AuthGuard } from "@/components/app/auth-guard"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"


const serviceOrderFormSchema = z.object({
  customerId: z.string({ required_error: "É necessário selecionar um cliente." }).min(1, "É necessário selecionar um cliente."),
  entryDate: z.date({ required_error: "A data de entrada é obrigatória."}),
  exitDate: z.date().optional(),
  itemDescription: z.string().min(5, "Descreva o item com mais detalhes."),
  problemDescription: z.string().min(10, "Descreva o problema com mais detalhes."),
  items: z.array(z.object({
    productId: z.string().min(1, "Selecione um produto ou serviço."),
    quantity: z.coerce.number().int().min(1, "Mínimo 1."),
    unitPrice: z.coerce.number(),
  })).min(1, "Adicione pelo menos um item."),
  status: z.enum(['pending', 'in_progress', 'completed', 'delivered'], { required_error: "Selecione um status." }),
})

type ServiceOrderFormValues = z.infer<typeof serviceOrderFormSchema>

function EditServiceOrderPageContent() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const firestore = useFirestore()
  const orderId = params.id as string

  // Data fetching
  const orderDocRef = useMemoFirebase(() => doc(firestore, 'serviceOrders', orderId), [firestore, orderId]);
  const { data: order, isLoading: orderLoading } = useDoc<ServiceOrder>(orderDocRef);

  const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);

  const productsCollection = useMemoFirebase(() => collection(firestore, 'parts'), [firestore]);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);

  const form = useForm<ServiceOrderFormValues>({
    resolver: zodResolver(serviceOrderFormSchema),
    defaultValues: useMemo(() => ({
        customerId: order?.customerId || "",
        entryDate: order ? new Date(order.entryDate) : new Date(),
        exitDate: order?.exitDate ? new Date(order.exitDate) : undefined,
        itemDescription: order?.itemDescription || "",
        problemDescription: order?.problemDescription || "",
        items: order?.items || [],
        status: order?.status || 'pending',
    }), [order]),
  })

  useEffect(() => {
    if (order) {
        form.reset({
            ...order,
            entryDate: new Date(order.entryDate),
            exitDate: order.exitDate ? new Date(order.exitDate) : undefined,
        });
    }
  }, [order, form]);
  
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  })
  
  const watchedItems = form.watch("items");
  const watchedStatus = form.watch("status");

  const totalAmount = useMemo(() => watchedItems.reduce((acc, current) => {
    return acc + ((current.unitPrice || 0) * (current.quantity || 0));
  }, 0), [watchedItems]);

  useEffect(() => {
    if (watchedStatus === 'completed' && !form.getValues('exitDate')) {
        form.setValue('exitDate', new Date());
    }
  }, [watchedStatus, form]);


  async function onSubmit(data: ServiceOrderFormValues) {
    if (!firestore || !products || !order) return;
    try {
        const originalItems = order.items;
        const currentItems = data.items;
        
        // Calculate stock changes
        const stockChanges: {[productId: string]: number} = {};

        // Add back old quantities
        originalItems.forEach(item => {
            const product = products.find(p => p.id === item.productId && p.type === 'piece');
            if (product) {
                 stockChanges[item.productId] = (stockChanges[item.productId] || 0) + item.quantity;
            }
        });

        // Subtract new quantities
        for (const item of currentItems) {
            const product = products.find(p => p.id === item.productId && p.type === 'piece');
            if (product) {
                const availableStock = (product.quantity || 0) + (stockChanges[item.productId] || 0);
                 if (availableStock < item.quantity) {
                    toast({
                        title: "Erro de Estoque",
                        description: `Estoque insuficiente para "${product.name}". Disponível: ${availableStock}.`,
                        variant: "destructive",
                    });
                    return;
                }
                stockChanges[item.productId] = (stockChanges[item.productId] || 0) - item.quantity;
            }
        }

        // Apply stock updates
        for(const productId in stockChanges) {
            if (stockChanges[productId] !== 0) {
                const productRef = doc(firestore, 'parts', productId);
                const product = products.find(p => p.id === productId);
                const newQuantity = (product?.quantity || 0) + stockChanges[productId];
                await updateDoc(productRef, { quantity: newQuantity });
            }
        }
      
      const orderData = {
        ...data,
        id: orderId,
        totalAmount,
        entryDate: data.entryDate.toISOString(),
        exitDate: data.exitDate ? data.exitDate.toISOString() : undefined,
      };
      await updateDoc(orderDocRef, orderData as { [x: string]: any });

      toast({
        title: "Sucesso!",
        description: "Ordem de serviço atualizada.",
      })
      router.push('/service-orders')
    } catch (error) {
      console.error("Error updating service order: ", error)
      toast({
        title: "Erro!",
        description: "Não foi possível atualizar a ordem de serviço.",
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

  const isLoading = orderLoading || customersLoading || productsLoading;

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  if (!order) {
    return (
       <Card className="max-w-2xl mx-auto">
         <CardHeader>
           <CardTitle>Ordem de Serviço não encontrada</CardTitle>
           <CardDescription>O item que você está tentando editar não existe.</CardDescription>
         </CardHeader>
       </Card>
    )
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Editar Ordem de Serviço</CardTitle>
        <CardDescription>Atualize os dados da O.S. #{order.id.substring(0,6).toUpperCase()}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                <FormField
                control={form.control}
                name="entryDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Data de Entrada</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP")
                                ) : (
                                    <span>Selecione uma data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                 )}
                />
                <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="completed">Concluída</SelectItem>
                        <SelectItem value="delivered">Entregue</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="itemDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do Item</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Notebook Dell Vostro, N/S ABC-1234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="problemDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Problema/Serviço Solicitado</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ex: Tela não liga, faz barulho ao iniciar." className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Peças e Serviços</FormLabel>
              <div className="mt-2 space-y-4">
                {fields.map((field, index) => {
                   const selectedProduct = products?.find(p => p.id === watchedItems[index]?.productId);
                   const isService = selectedProduct?.type === 'service';

                   return (
                     <div key={field.id} className="grid grid-cols-[1fr_100px_100px_auto] items-end gap-4 p-4 border rounded-lg bg-muted/20">
                        <FormField
                          control={form.control}
                          name={`items.${index}.productId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Produto/Serviço</FormLabel>
                              <Select onValueChange={(value) => handleProductChange(value, index)} value={field.value}>
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
                              <FormLabel className="text-xs">Qtd.</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" disabled={isService} {...field} />
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <FormField
                    control={form.control}
                    name="exitDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Data de Saída</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "PPP")
                                    ) : (
                                        <span>Selecione uma data</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="flex justify-end items-center gap-6">
                    <div className="text-lg">
                        <span>Total da O.S.: </span>
                        <span className="font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.push('/service-orders')}>
                    Cancelar
                </Button>
                <Button type="submit">Salvar Alterações</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default function EditServiceOrderPage() {
    return (
        <AuthGuard>
            <EditServiceOrderPageContent />
        </AuthGuard>
    )
}
