
'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { v4 as uuidv4 } from 'uuid';
import React, { useRef, useState, useMemo } from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import { AuthGuard } from "@/components/app/auth-guard"
import { Loader2, UploadCloud, ImageIcon, Link as LinkIcon } from "lucide-react"
import { uploadImage, uploadImageFromUrl } from "@/services/image-upload-service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const createProductFormSchema = (settings: any) => z.object({
    name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
    description: z.string().optional(),
    price: z.coerce.number().min(0.01, "O preço deve ser maior que zero."),
    cost: z.coerce.number().optional(),
    type: z.enum(['piece', 'service'], { required_error: "É necessário selecionar um tipo." }),
    quantity: z.any().optional(),
    link: z.string().url("Por favor, insira um URL válido.").optional().or(z.literal('')),
    imageUrl: z.string().optional(),
}).refine(data => !settings?.product?.description || (data.description && data.description.length >= 5), {
    message: "A descrição deve ter pelo menos 5 caracteres.",
    path: ["description"],
}).refine(data => {
    if (data.type === 'piece' && settings?.product?.quantity) {
      return data.quantity !== undefined && data.quantity !== null && data.quantity !== '' && !isNaN(data.quantity);
    }
    return true;
}, {
    message: "Quantidade é obrigatória para peças.",
    path: ["quantity"],
});

type ProductFormValues = z.infer<Return<typeof createProductFormSchema>>;


function NewProductPageContent() {
  const router = useRouter()
  const { toast } = useToast()
  const firestore = useFirestore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'registration'), [firestore]);
  const { data: registrationSettings, isLoading: settingsLoading } = useDoc(settingsDocRef);
  
  const productFormSchema = createProductFormSchema(registrationSettings);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0.01,
      cost: 0,
      type: "piece",
      quantity: 0,
      link: "",
      imageUrl: "",
    },
  })
  
  const productType = form.watch("type");

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      setImagePreview(URL.createObjectURL(file)); 

      try {
        const uploadedImageUrl = await uploadImage(file);
        form.setValue("imageUrl", uploadedImageUrl, { shouldDirty: true });
        setImagePreview(uploadedImageUrl);
        toast({
          title: "Upload Concluído",
          description: "A imagem do produto foi carregada.",
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        console.error("Upload failed:", error);
        toast({
          title: "Falha no Upload",
          description: errorMessage,
          variant: "destructive",
        });
        setImagePreview(null);
      } finally {
        setIsUploading(false);
      }
    }
  };
  
  const handleUrlUpload = async () => {
    if (!imageUrlInput) {
        toast({ title: "URL Inválido", description: "Por favor, insira um URL de imagem válido.", variant: "destructive" });
        return;
    }
    setIsUploading(true);
    setImagePreview(imageUrlInput);
    try {
        const uploadedUrl = await uploadImageFromUrl(imageUrlInput);
        form.setValue("imageUrl", uploadedUrl, { shouldDirty: true });
        setImagePreview(uploadedUrl);
        toast({ title: "Upload Concluído", description: "A imagem foi carregada a partir do link." });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        console.error("Upload from URL failed:", error);
        toast({ title: "Falha no Upload", description: errorMessage, variant: "destructive" });
        setImagePreview(null);
    } finally {
        setIsUploading(false);
    }
};


  async function onSubmit(data: ProductFormValues) {
    if (!firestore) return;
    try {
        const productId = uuidv4();
        const productData = {
            ...data,
            id: productId,
            quantity: data.type === 'piece' ? (data.quantity ? Number(data.quantity) : 0) : 1000,
            cost: data.type === 'piece' ? (data.cost ? Number(data.cost) : 0) : 0,
        };
        const productDocRef = doc(firestore, "parts", productId);
        await setDoc(productDocRef, productData);

        toast({
          title: "Sucesso!",
          description: `Produto "${data.name}" cadastrado.`,
        })
        router.push('/products')
    } catch (error) {
        console.error("Error creating product: ", error);
        toast({
            title: "Erro!",
            description: "Não foi possível cadastrar o item.",
            variant: "destructive"
        })
    }
  }

  if (settingsLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  const productSettings = registrationSettings?.product || { description: true, quantity: true };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Novo Produto/Serviço</CardTitle>
        <CardDescription>Preencha os dados para cadastrar um novo item.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="piece">Peça</SelectItem>
                            <SelectItem value="service">Serviço</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: Filtro de Ar / Troca de Óleo" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <FormItem>
                    <FormLabel>Imagem do Produto</FormLabel>
                     <div className="flex items-center justify-center h-28 w-28 rounded-md overflow-hidden border-2 border-dashed bg-muted">
                        {imagePreview ? (
                            <div className="relative h-full w-full">
                                <Image src={imagePreview} alt="Pré-visualização" fill className="object-cover"/>
                                {isUploading && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground">
                                <ImageIcon className="mx-auto h-8 w-8"/>
                                <span className="text-xs">Sem imagem</span>
                            </div>
                        )}
                    </div>
                </FormItem>
            </div>
             <Tabs defaultValue="file">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="file">Upload de Arquivo</TabsTrigger>
                    <TabsTrigger value="url">Carregar de URL</TabsTrigger>
                </TabsList>
                <TabsContent value="file">
                    <div className="flex items-center gap-2 rounded-md border p-4">
                        <Input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/png, image/jpeg, image/gif, image/webp"
                            onChange={handleImageChange}
                            disabled={isUploading}
                        />
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full">
                            <UploadCloud className="mr-2 h-4 w-4"/>
                            {imagePreview ? 'Alterar Arquivo' : 'Enviar Arquivo'}
                        </Button>
                    </div>
                </TabsContent>
                <TabsContent value="url">
                    <div className="flex items-center gap-2 rounded-md border p-4">
                        <Input 
                            type="text" 
                            placeholder="https://exemplo.com/imagem.png"
                            value={imageUrlInput}
                            onChange={(e) => setImageUrlInput(e.target.value)}
                            disabled={isUploading}
                        />
                        <Button type="button" variant="outline" onClick={handleUrlUpload} disabled={isUploading}>
                            <LinkIcon className="mr-2 h-4 w-4"/>
                            Carregar Link
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>
            
            {productSettings.description && (
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                          <Textarea placeholder="Ex: Para motor 1.0 8v / Serviço de troca de óleo do motor" className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            )}
             <FormField
              control={form.control}
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Preço de Venda (R$)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" placeholder="Ex: 25.50" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                {productType === 'piece' ? (
                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Preço de Custo (R$)</FormLabel>
                        <FormControl>
                            <Input type="number" step="0.01" placeholder="Ex: 12.00" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                ): null}
            </div>
            {productType === 'piece' && productSettings.quantity && (
                <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Quantidade em Estoque</FormLabel>
                    <FormControl>
                        <Input
                        type="number"
                        placeholder="Ex: 100"
                        {...field}
                        onChange={e => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                        value={field.value ?? ''}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            )}
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                </Button>
                <Button type="submit">Salvar Item</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}

export default function NewProductPage() {
    return (
        <AuthGuard>
            <NewProductPageContent />
        </AuthGuard>
    )
}
