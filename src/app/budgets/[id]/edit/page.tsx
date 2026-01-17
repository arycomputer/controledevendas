'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { useRouter, useParams } from "next/navigation"
import { PlusCircle, Trash2, Loader2, Calendar as CalendarIcon, UploadCloud, X } from "lucide-react"
import Image from "next/image"
import React from "react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useMemo, useState, useRef } from "react"
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, updateDoc } from "firebase/firestore"
import type { Customer, Product, Budget } from "@/lib/types"
import { AuthGuard } from "@/components/app/auth-guard"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { uploadImage } from "@/services/image-upload-service"

const budgetFormSchema = z.object({
  customerId: z.string({ required_error: "É necessário selecionar um cliente." }).min(1, "É necessário selecionar um cliente."),
  validUntil: z.date({ required_error: "A data de validade é obrigatória."}),
  itemDescription: z.string().optional(),
  model: z.string().optional(),
  problemDescription: z.string().optional(),
  solutionDescription: z.string().optional(),
  serialNumber: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, "Selecione um produto ou serviço."),
    quantity: z.coerce.number().int().min(1, "Mínimo 1."),
    unitPrice: z.coerce.number(),
  })).min(1, "Adicione pelo menos um item."),
  imageUrls: z.array(z.string()).optional(),
})

type BudgetFormValues = z.infer<typeof budgetFormSchema>

function EditBudgetPageContent() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const firestore = useFirestore()
  const budgetId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const budgetDocRef = useMemoFirebase(() => doc(firestore, 'budgets', budgetId), [firestore, budgetId]);
  const { data: budget, isLoading: budgetLoading } = useDoc<Budget>(budgetDocRef);

  const customersCollection = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);

  const productsCollection = useMemoFirebase(() => collection(firestore, 'parts'), [firestore]);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      customerId: "",
      validUntil: new Date(),
      itemDescription: "",
      model: "",
      problemDescription: "",
      solutionDescription: "",
      serialNumber: "",
      items: [],
      imageUrls: [],
    },
  })

  useEffect(() => {
    if (budget) {
        // Explicitly set values to avoid issues with spreading extra properties from `budget`
        form.reset({
            customerId: budget.customerId,
            validUntil: new Date(budget.validUntil),
            itemDescription: budget.itemDescription || "",
            model: budget.model || "",
            problemDescription: budget.problemDescription || "",
            solutionDescription: budget.solutionDescription || "",
            serialNumber: budget.serialNumber || "",
            items: budget.items,
            imageUrls: budget.imageUrls || [],
        });
    }
  }, [budget, form.reset]); // Depend on budget and the stable reset function
  
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  })
  
  const watchedItems = form.watch("items");
  const watchedImageUrls = form.watch("imageUrls");

  const totalAmount = useMemo(() => watchedItems.reduce((acc, current) => {
    return acc + ((current.unitPrice || 0) * (current.quantity || 0));
  }, 0), [watchedItems]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setIsUploading(true);
    const currentUrls = form.getValues("imageUrls") || [];

    try {
        const uploadPromises = Array.from(files).map(file => uploadImage(file));
        const newImageUrls = await Promise.all(uploadPromises);
        
        form.setValue("imageUrls", [...currentUrls, ...newImageUrls], { shouldDirty: true });

        toast({
            title: "Upload Concluído",
            description: `${files.length} imagem(ns) carregada(s) com sucesso.`,
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        toast({
            title: "Falha no Upload",
            description: errorMessage,
            variant: "destructive",
        });
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
  };

  const removeImage = (indexToRemove: number) => {
    const currentUrls = form.getValues("imageUrls") || [];
    const newUrls = currentUrls.filter((_, index) => index !== indexToRemove);
    form.setValue("imageUrls", newUrls, { shouldDirty: true });
  }

  async function onSubmit(data: BudgetFormValues) {
    if (!firestore || !products) return;
    try {
      const budgetData = {
        ...data,
        id: budgetId,
        totalAmount,
        validUntil: data.validUntil.toISOString(),
      };
      await updateDoc(budgetDocRef, budgetData as { [x: string]: any });

      toast({
        title: "Sucesso!",
        description: "Orçamento atualizado.",
      })
      router.push('/budgets')
    } catch (error) {
      console.error("Error updating budget: ", error)
      toast({
        title: "Erro!",
        description: "Não foi possível atualizar o orçamento.",
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

  const isLoading = budgetLoading || customersLoading || productsLoading;

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  if (!budget) {
    return (
       <Card className="max-w-2xl mx-auto">
         <CardHeader>
           <CardTitle>Orçamento não encontrado</CardTitle>
           <CardDescription>O item que você está tentando editar não existe.</CardDescription>
         </CardHeader>
       </Card>
    )
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Editar Orçamento</CardTitle>
        <CardDescription>Atualize os dados do Orçamento #{budget.id.substring(0,6).toUpperCase()}</CardDescription>
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
                name="validUntil"
                render={({ field }) => (
                    <FormItem className="flex flex-col pt-2 md:pt-0">
                        <FormLabel>Válido Até</FormLabel>
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

            <Separator />
            
             <div>
                <h3 className="text-lg font-medium mb-4">Dados do Equipamento (Opcional)</h3>
                 <div className="space-y-6">
                     <FormField
                      control={form.control}
                      name="itemDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição do Equipamento</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Notebook, Smartphone, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="model"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Marca/Modelo</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Dell Vostro 3400" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="serialNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de Série</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: BR-123XYZ" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                     <FormField
                      control={form.control}
                      name="problemDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Problema/Defeito Relatado</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Ex: Tela não liga, faz barulho ao iniciar." className="resize-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="solutionDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Solução do Defeito</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Ex: Troca da fonte de alimentação e limpeza interna." className="resize-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
            </div>

            <Separator />

            <div>
                <h3 className="text-lg font-medium mb-4">Fotos do Equipamento</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
                    {watchedImageUrls?.map((url, index) => (
                        <div key={index} className="relative aspect-square group">
                            <Image src={url} alt={`Imagem do equipamento ${index + 1}`} fill className="object-cover rounded-md border" />
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeImage(index)}
                            >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Remover imagem</span>
                            </Button>
                        </div>
                    ))}
                     {isUploading && (
                        <div className="relative aspect-square group flex items-center justify-center border-2 border-dashed rounded-md bg-muted">
                           <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                </div>
                <Input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/png, image/jpeg, image/gif, image/webp"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    multiple
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Adicionar Imagens
                </Button>
            </div>

            <Separator />
            
            <div>
              <FormLabel>Itens do Orçamento</FormLabel>
              <div className="mt-2 space-y-4">
                {fields.map((field, index) => {
                   const selectedProduct = products?.find(p => p.id === watchedItems[index]?.productId);
                   const isService = selectedProduct?.type === 'service';

                   return (
                     <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_100px_100px_auto] items-end gap-4 p-4 border rounded-lg bg-muted/20">
                        <FormField
                          control={form.control}
                          name={`items.${index}.productId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs md:hidden">Produto/Serviço</FormLabel>
                              <Select onValueChange={(value) => handleProductChange(value, index)} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um item" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {products?.map(product => {
                                      const isAlreadySelected = watchedItems.some((item, itemIndex) => item.productId === product.id && itemIndex !== index);
                                    return (
                                    <SelectItem key={product.id} value={product.id} disabled={isAlreadySelected}>
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
                    <span>Total do Orçamento: </span>
                    <span className="font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAmount)}
                    </span>
                </div>
                 <div className="flex justify-end gap-2 w-full sm:w-auto">
                    <Button type="button" variant="outline" onClick={() => router.push('/budgets')}>
                        Cancelar
                    </Button>
                    <Button type="submit">Salvar Alterações</Button>
                </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default function EditBudgetPage() {
    return (
        <AuthGuard>
            <EditBudgetPageContent />
        </AuthGuard>
    )
}
