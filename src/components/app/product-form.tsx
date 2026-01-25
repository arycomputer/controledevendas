'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
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
import { useToast } from "@/hooks/use-toast"
import { useFirestore } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import type { Product } from "@/lib/types"

const productFormSchema = z.object({
  name: z.string().min(2, "O nome da peça deve ter pelo menos 2 caracteres."),
  description: z.string().optional(),
})

type ProductFormValues = z.infer<typeof productFormSchema>

interface ProductFormProps {
    onSuccess: (product: Product) => void;
    onClose: () => void;
}

export function ProductForm({ onSuccess, onClose }: ProductFormProps) {
  const { toast } = useToast()
  const firestore = useFirestore()
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  async function onSubmit(data: ProductFormValues) {
    if (!firestore) return;

    try {
        const productId = uuidv4();
        const newProduct: Product = {
            id: productId,
            name: data.name,
            description: data.description || "",
            price: 0,
            quantity: 0,
            type: 'piece',
            link: '',
            imageUrl: '',
        };

        await setDoc(doc(firestore, "parts", productId), newProduct);
        
        onSuccess(newProduct);
        toast({ title: "Sucesso!", description: "Nova peça criada." });
        onClose();

    } catch (error) {
        console.error("Error creating product: ", error);
        toast({ title: "Erro!", description: "Não foi possível criar a nova peça.", variant: "destructive" });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Peça</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Placa-mãe, Parafuso M4" {...field} />
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
              <FormLabel>Descrição (opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalhes sobre a peça" className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
            </Button>
            <Button type="submit">Salvar Peça</Button>
        </div>
      </form>
    </Form>
  )
}
