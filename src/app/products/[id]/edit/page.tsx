
'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useRouter, useParams } from "next/navigation"

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
import { useEffect, useMemo } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { Loader2 } from "lucide-react"
import { AuthGuard } from "@/components/app/auth-guard"
import type { Product } from "@/lib/types"

const createProductFormSchema = (settings: any) => z.object({
    name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
    description: z.string().optional(),
    price: z.coerce.number().min(0.01, "O preço deve ser maior que zero."),
    type: z.enum(['piece', 'service'], { required_error: "É necessário selecionar um tipo." }),
    quantity: z.any().optional(),
    link: z.string().url("Por favor, insira um URL válido.").optional().or(z.literal('')),
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


function EditProductPageContent() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const firestore = useFirestore()

  const productId = params.id as string;

  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'registration'), [firestore]);
  const { data: registrationSettings, isLoading: settingsLoading } = useDoc(settingsDocRef);
  
  const productDocRef = useMemoFirebase(() => doc(firestore, 'parts', productId), [firestore, productId]);
  const { data: product, isLoading: productLoading } = useDoc<Product>(productDocRef);
  
  const productFormSchema = createProductFormSchema(registrationSettings);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: useMemo(() => ({
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price || 0,
      type: product?.type || "piece",
      quantity: product?.quantity ?? 0,
      link: product?.link || "",
    }), [product]),
  })
  
  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description,
        price: product.price,
        type: product.type,
        quantity: product.quantity ?? '',
        link: product.link || "",
      });
    }
  }, [product, form]);

  const productType = form.watch("type");

  useEffect(() => {
    if (productType === 'service') {
        form.setValue('quantity', 1000);
    }
  }, [productType, form]);

  async function onSubmit(data: ProductFormValues) {
    try {
        const finalData: Partial<ProductFormValues> & { quantity?: number } = {
            ...data,
        };

        if (data.type === 'service') {
            finalData.quantity = 1000;
        } else {
            finalData.quantity = data.quantity ? Number(data.quantity) : 0;
        }

        await updateDoc(productDocRef, finalData as { [x: string]: any });
        toast({
          title: "Sucesso!",
          description: `Produto "${data.name}" atualizado.`,
        })
        router.push('/products')
    } catch(error) {
        console.error("Error updating product:", error)
        toast({
          title: "Erro!",
          description: "Não foi possível atualizar o item.",
          variant: "destructive",
        })
    }
  }

  const isLoading = productLoading || settingsLoading;

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }
  
  if (!product) {
    return (
       <Card className="max-w-2xl mx-auto">
         <CardHeader>
           <CardTitle>Produto não encontrado</CardTitle>
           <CardDescription>O item que você está tentando editar não existe.</CardDescription>
         </CardHeader>
       </Card>
    )
  }
  
  const productSettings = registrationSettings?.product || { description: true, quantity: true };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Editar Produto/Serviço</CardTitle>
        <CardDescription>Atualize os dados do item.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <FormLabel>Preço (R$)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" placeholder="Ex: 25.50" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
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
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.push('/products')}>
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

export default function EditProductPage() {
    return (
        <AuthGuard>
            <EditProductPageContent />
        </AuthGuard>
    )
}

    