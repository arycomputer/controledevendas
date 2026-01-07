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
import { products } from "@/lib/data"
import { useEffect } from "react"

const productFormSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  description: z.string().min(5, "A descrição deve ter pelo menos 5 caracteres."),
  price: z.coerce.number().min(0.01, "O preço deve ser maior que zero."),
  quantity: z.coerce.number().int().min(0, "A quantidade não pode ser negativa.").optional(),
  type: z.enum(['piece', 'service'], { required_error: "É necessário selecionar um tipo." }),
}).refine(data => {
    if (data.type === 'piece' && (data.quantity === undefined || data.quantity === null)) {
        return false;
    }
    return true;
}, {
    message: "Quantidade é obrigatória para peças.",
    path: ["quantity"],
});


type ProductFormValues = z.infer<typeof productFormSchema>

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()

  const productId = params.id as string;
  const product = products.find(p => p.id === productId);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      type: "piece",
      quantity: 0,
    },
  })
  
  useEffect(() => {
    if (product) {
      form.reset(product);
    } else {
       toast({
        title: "Erro",
        description: "Produto não encontrado.",
        variant: "destructive",
      })
      router.push('/products')
    }
  }, [product, form, router, toast]);

  const productType = form.watch("type");

  function onSubmit(data: ProductFormValues) {
    // In a real app, you would send this data to your API.
    const finalData = {
        ...data,
        id: productId,
        quantity: data.type === 'piece' ? data.quantity : undefined
    }
    console.log(finalData)
    toast({
      title: "Sucesso!",
      description: `Produto "${data.name}" atualizado.`,
    })
    router.push('/products')
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
                {productType === 'piece' && (
                    <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Quantidade em Estoque</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="Ex: 100" {...field} />
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
