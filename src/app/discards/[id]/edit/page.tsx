'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useRouter, useParams } from "next/navigation"
import { Loader2, UploadCloud, X } from "lucide-react"
import Image from "next/image"
import React from "react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState, useRef } from "react"
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc, updateDoc } from "firebase/firestore"
import type { Discard } from "@/lib/types"
import { AuthGuard } from "@/components/app/auth-guard"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { uploadImage } from "@/services/image-upload-service"

const discardFormSchema = z.object({
  description: z.string().min(1, "A descrição é obrigatória."),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  problemDescription: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
})

type DiscardFormValues = z.infer<typeof discardFormSchema>

function EditDiscardPageContent() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const firestore = useFirestore()
  const discardId = params.id as string
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const discardDocRef = useMemoFirebase(() => doc(firestore, 'discards', discardId), [firestore, discardId]);
  const { data: discard, isLoading: discardLoading } = useDoc<Discard>(discardDocRef);

  const form = useForm<DiscardFormValues>({
    resolver: zodResolver(discardFormSchema),
    defaultValues: {
      description: "",
      model: "",
      serialNumber: "",
      problemDescription: "",
      imageUrls: [],
    },
  })

  useEffect(() => {
    if (discard) {
        form.reset({
            description: discard.description,
            model: discard.model || "",
            serialNumber: discard.serialNumber || "",
            problemDescription: discard.problemDescription || "",
            imageUrls: discard.imageUrls || [],
        });
    }
  }, [discard, form.reset]);
  
  const watchedImageUrls = form.watch("imageUrls");

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
      const discardData = {
        ...data,
      };
      await updateDoc(discardDocRef, discardData as { [x: string]: any });

      toast({
        title: "Sucesso!",
        description: "Descarte atualizado.",
      })
      router.push('/discards')
    } catch (error) {
      console.error("Error updating discard: ", error)
      toast({
        title: "Erro!",
        description: "Não foi possível atualizar o descarte.",
        variant: 'destructive',
      })
    }
  }

  const isLoading = discardLoading;

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  if (!discard) {
    return (
       <Card className="max-w-2xl mx-auto">
         <CardHeader>
           <CardTitle>Item não encontrado</CardTitle>
           <CardDescription>O item que você está tentando editar não existe.</CardDescription>
         </CardHeader>
       </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Editar Descarte</CardTitle>
        <CardDescription>Atualize os dados do item descartado.</CardDescription>
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
                      <FormLabel>Descrição do Equipamento</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ex: Monitor, Placa-mãe, Fonte de Alimentação" className="resize-none" {...field} />
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
                      <FormLabel>Defeito Apresentado</FormLabel>
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
            
            <div className="flex justify-end gap-2 w-full sm:w-auto">
                <Button type="button" variant="outline" onClick={() => router.push('/discards')}>
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

export default function EditDiscardPage() {
    return (
        <AuthGuard>
            <EditDiscardPageContent />
        </AuthGuard>
    )
}
