'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { PlusCircle, Trash2, Loader2, Calendar as CalendarIcon } from "lucide-react"
import { v4 as uuidv4 } from 'uuid';

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useMemo } from "react"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, setDoc, updateDoc } from "firebase/firestore"
import type { Customer, Product } from "@/lib/types"
import { AuthGuard } from "@/components/app/auth-guard"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"


const serviceOrderFormSchema = z.object({
  customerId: z.string({ required_error: "É necessário selecionar um cliente." }).min(1, "É necessário selecionar um cliente."),
  entryDate: z.date({ required_error: "A data de entrada é obrigatória."}),
  itemDescription: z.string().min(5, "Descreva o item com mais detalhes."),
  problemDescription: z.string().min(10, "Descreva o problema com mais detalhes."),
  items: z.array(z.object({
    productId: z.string().min(1, "Selecione um produto ou serviço."),
    quantity: z.coerce.number().int().min(1, "Mínimo 1."),
    unitPrice: z.coerce.number().min(0, "O preço unitário não pode ser negativo."),
  })).min(1, "Adicione pelo menos um item."),
})

type ServiceOrderFormValues = z.infer<typeof serviceOrderFormSchema>

function NewServiceOrderPageContent() {
  const router = useRouter()
  const { toast } = useToast()
  const firestore = useFirestore()

  const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);

  const productsCollection = useMemoFirebase(() => collection(firestore, 'parts'), [firestore]);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);

  const form = useForm<ServiceOrderFormValues>({
    resolver: zodResolver(serviceOrderFormSchema),
    defaultValues: {
      customerId: "",
      entryDate: new Date(),
      itemDescription: "",
      problemDescription: "",
      items: [],
    },
  })

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  })
  
  const watchedItems = form.watch("items");

  const totalAmount = useMemo(() => watchedItems.reduce((acc, current) => {
    return acc + ((current.unitPrice || 0) * (current.quantity || 0));
  }, 0), [watchedItems]);

  async function onSubmit(data: ServiceOrderFormValues) {
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
      
      const orderId = uuidv4();
      const orderData = {
        ...data,
        id: orderId,
        totalAmount,
        entryDate: data.entryDate.toISOString(),
        status: 'pending',
      };
      await setDoc(doc(firestore, "serviceOrders", orderId), orderData);

      toast({
        title: "Sucesso!",
        description: "Nova ordem de serviço registrada.",
      })
      router.push('/service-orders')
    } catch (error) {
      console.error("Error creating service order: ", error)
      toast({
        title: "Erro!",
        description: "Não foi possível registrar a ordem de serviço.",
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
        <CardTitle>Nova Ordem de Serviço</CardTitle>
        <CardDescription>Preencha os dados para abrir uma nova O.S.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
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
                <FormField
                control={form.control}
                name="entryDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col pt-2 md:pt-0">
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
                                    format(field.value, "dd/MM/yyyy")
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
            
            <div className="flex flex-col sm:flex-row justify-end items-center gap-4 sm:gap-6">
                <div className="text-lg text-right w-full sm:w-auto">
                    <span>Total da O.S.: </span>
                    <span className="font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)}
                    </span>
                </div>
                <div className="flex justify-end gap-2 w-full sm:w-auto">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancelar
                    </Button>
                    <Button type="submit">Salvar Ordem de Serviço</Button>
                </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}


export default function NewServiceOrderPage() {
    return (
        <AuthGuard>
            <NewServiceOrderPageContent />
        </AuthGuard>
    )
}
