'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useRouter } from "next/navigation"

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

const partFormSchema = z.object({
  name: z.string().min(2, "O nome da peça deve ter pelo menos 2 caracteres."),
  description: z.string().min(5, "A descrição deve ter pelo menos 5 caracteres."),
  price: z.coerce.number().min(0.01, "O preço deve ser maior que zero."),
  quantity: z.coerce.number().int().min(0, "A quantidade não pode ser negativa."),
})

type PartFormValues = z.infer<typeof partFormSchema>

export default function NewPartPage() {
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<PartFormValues>({
    resolver: zodResolver(partFormSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0.01,
      quantity: 0,
    },
  })

  function onSubmit(data: PartFormValues) {
    // In a real app, you would send this data to your API to create a new part.
    console.log(data)
    toast({
      title: "Sucesso!",
      description: `Peça "${data.name}" cadastrada no estoque.`,
    })
    router.push('/parts')
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Nova Peça</CardTitle>
        <CardDescription>Preencha os dados para cadastrar uma nova peça no estoque.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Peça</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Filtro de Ar" {...field} />
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
                    <Textarea placeholder="Ex: Para motor 1.0 8v" className="resize-none" {...field} />
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
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                </Button>
                <Button type="submit">Salvar Peça</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
