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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { customers } from "@/lib/data"
import { useEffect } from "react"

const customerFormSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  email: z.string().email("Por favor, insira um e-mail válido."),
  phone: z.string().min(10, "O telefone deve ter pelo menos 10 dígitos."),
  document: z.string().min(11, "O documento (CPF/CNPJ) é obrigatório."),
  address: z.string().min(5, "O endereço deve ter pelo menos 5 caracteres."),
})

type CustomerFormValues = z.infer<typeof customerFormSchema>

export default function EditCustomerPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  
  const customerId = params.id as string;
  const customer = customers.find(c => c.id === customerId);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      document: "",
      address: "",
    },
  })

  useEffect(() => {
    if (customer) {
      form.reset(customer);
    } else {
       toast({
        title: "Erro",
        description: "Cliente não encontrado.",
        variant: "destructive",
      })
      router.push('/customers')
    }
  }, [customer, form, router, toast]);

  function onSubmit(data: CustomerFormValues) {
    // In a real app, you would send this data to your API to update the customer.
    console.log({ ...data, id: customerId })
    toast({
      title: "Sucesso!",
      description: `Dados do cliente "${data.name}" atualizados.`,
      variant: "default",
    })
    router.push('/customers')
  }
  
  if (!customer) {
    return (
       <Card className="max-w-2xl mx-auto">
         <CardHeader>
           <CardTitle>Cliente não encontrado</CardTitle>
           <CardDescription>O cliente que você está tentando editar não existe.</CardDescription>
         </CardHeader>
       </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Editar Cliente</CardTitle>
        <CardDescription>Atualize os dados do cliente.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: joao.silva@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: (11) 98765-4321" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
              control={form.control}
              name="document"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF/CNPJ</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 123.456.789-00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Rua das Flores, 123, São Paulo - SP" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.push('/customers')}>
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