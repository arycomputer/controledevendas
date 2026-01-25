'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { Loader2, UploadCloud, X, PlusCircle, Trash2 } from "lucide-react"
import { v4 as uuidv4 } from 'uuid';
import Image from "next/image";
import React from "react";

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useState, useRef } from "react"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, doc, setDoc } from "firebase/firestore"
import type { Product } from "@/lib/types"
import { AuthGuard } from "@/components/app/auth-guard"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { uploadImage } from "@/services/image-upload-service"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ProductForm } from "@/components/app/product-form"

const discardFormSchema = z.object({
  description: z.string().min(1, "A descrição é obrigatória."),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  problemDescription: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  items: z.array(z.object({
    productId: z.string().min(1, "Selecione um produto ou serviço."),
    quantity: z.coerce.number().int().min(1, "Mínimo 1."),
    unitPrice: z.coerce.number(),
  })).optional(),
})

type DiscardFormValues = z.infer<typeof discardFormSchema>

function NewDiscardPageContent() {
  const router = useRouter()
  const { toast } = useToast()
  const firestore = useFirestore()
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false);

  const productsCollection = useMemoFirebase(() => collection(firestore, 'parts'), [firestore]);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);

  const form = useForm<DiscardFormValues>({
    resolver: zodResolver(discardFormSchema),
    defaultValues: {
      description: "",
      model: "",
      serialNumber: "",
      problemDescription: "",
      imageUrls: [],
      items: [],
    },
  })

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  })

  const watchedImageUrls = form.watch("imageUrls");
  const watchedItems = form.watch("items");

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

  async function onSubmit(data: DiscardFormValues) {
    if (!firestore) return;
    try {
      const discardId = uuidv4();
      const discardData = {
        ...data,
        id: discardId,
        discardDate: new Date().toISOString(),
      };
      await setDoc(doc(firestore, "discards", discardId), discardData);

      toast({
        title: "Sucesso!",
        description: "Novo descarte registrado.",
      })
      router.push('/discards')
    } catch (error) {
      console.error("Error creating discard: ", error)
      toast({
        title: "Erro!",
        description: "Não foi possível registrar o descarte.",
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
            unitPrice: 0,
            quantity: 1
        });
    }
  }

  const handleProductCreated = (newProduct: Product) => {
    // The useCollection hook for products will automatically update the list.
  }

  if (productsLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }
  
  return (
    <>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Novo Descarte</CardTitle>
          <CardDescription>Preencha os dados para registrar um novo equipamento para descarte.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-6">
                   <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição do Descarte</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ex: Lote de peças de computador, Sucata de monitor" className="resize-none" {...field} />
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
                          <FormLabel>Marca/Modelo (opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Samsung T35F" {...field} />
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
                          <FormLabel>Número de Série (opcional)</FormLabel>
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
                        <FormLabel>Defeito Geral Apresentado (opcional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ex: Não liga, imagem distorcida, etc." className="resize-none" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
              
              <Separator />

              <div>
                <FormLabel>Peças Descartadas</FormLabel>
                <div className="mt-2 space-y-4">
                  {fields.map((field, index) => {
                     return (
                       <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_100px_auto] items-end gap-4 p-4 border rounded-lg bg-muted/20">
                          <FormField
                            control={form.control}
                            name={`items.${index}.productId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs md:hidden">Peça</FormLabel>
                                <Select onValueChange={(value) => handleProductChange(value, index)} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione uma peça" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {products?.map(product => {
                                        const isAlreadySelected = watchedItems.some((item, itemIndex) => item.productId === product.id && itemIndex !== index);
                                      return (
                                      <SelectItem key={product.id} value={product.id} disabled={isAlreadySelected}>
                                        {product.name}
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
                                  <Input type="number" min="1" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remover item</span>
                          </Button>
                        </div>
                     )
                  })}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ productId: "", quantity: 1, unitPrice: 0 })}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Peça
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsNewProductDialogOpen(true)}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Criar Nova Peça
                    </Button>
                  </div>
                   {form.formState.errors.items && <p className="text-sm font-medium text-destructive">{typeof form.formState.errors.items === 'object' && 'message' in form.formState.errors.items ? form.formState.errors.items.message : "Erro nos itens"}</p>}
                </div>
              </div>

              <Separator />

               <div>
                  <h3 className="text-lg font-medium mb-4">Fotos do Lote/Equipamento</h3>
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
              
              <div className="flex justify-end gap-2 w-full sm:w-auto">
                  <Button type="button" variant="outline" onClick={() => router.back()}>
                      Cancelar
                  </Button>
                  <Button type="submit">Salvar Descarte</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Dialog open={isNewProductDialogOpen} onOpenChange={setIsNewProductDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Criar Nova Peça</DialogTitle>
                <DialogDescription>
                    Adicione uma nova peça ao seu inventário. Ela estará disponível para seleção imediatamente.
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


export default function NewDiscardPage() {
    return (
        <AuthGuard>
            <NewDiscardPageContent />
        </AuthGuard>
    )
}
