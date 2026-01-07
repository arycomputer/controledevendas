
'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { v4 as uuidv4 } from 'uuid';

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
import { useFirestore } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import { AuthGuard } from "@/components/app/auth-guard"

const productFormSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  description: z.string().min(5, "A descrição deve ter pelo menos 5 caracteres."),
  price: z.coerce.number().min(0.01, "O preço deve ser maior que zero."),
  quantity: z.coerce.number().int().min(0, "A quantidade não pode ser negativa.").optional(),
  type: z.enum(['piece', 'service'], { required_error: "É necessário selecionar um tipo." }),
}).refine(data => {
    if (data.type === 'piece') {
        return data.quantity !== undefined && data.quantity !== null && !isNaN(data.quantity);
    }
    return true;
}, {
    message: "Quantidade é obrigatória para peças.",
    path: ["quantity"],
});


type ProductFormValues = z.infer<typeof productFormSchema>

function NewProductPageContent() {
  const router = useRouter()
  const { toast } = useToast()
  const firestore = useFirestore();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0.01,
      type: "piece",
      quantity: 0,
    },
  })
  
  const productType = form.watch("type");

  async function onSubmit(data: ProductFormValues) {
    if (!firestore) return;
    try {
        const productId = uuidv4();
        const productData = {
            ...data,
            id: productId,
            quantity: data.type === 'piece' ? data.quantity : undefined
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

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Novo Produto/Serviço</CardTitle>
        <CardDescription>Preencha os dados para cadastrar um novo item.</CardDescription>
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
