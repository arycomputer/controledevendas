'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useRouter, useParams } from "next/navigation"
import { doc, updateDoc } from 'firebase/firestore'
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { useEffect, useMemo } from "react"

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
import { Loader2 } from "lucide-react"

const createCustomerFormSchema = (settings: any) => {
    const defaultSettings = { phone: true, document: true, address: true };
    const customerSettings = settings?.customer || defaultSettings;

    return z.object({
        name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
        email: z.string().email("Por favor, insira um e-mail válido."),
        phone: customerSettings.phone 
            ? z.string().min(10, "O telefone deve ter pelo menos 10 dígitos.") 
            : z.string().optional(),
        document: customerSettings.document 
            ? z.string().min(11, "O documento (CPF/CNPJ) é obrigatório.")
            : z.string().optional(),
        address: customerSettings.address 
            ? z.string().min(5, "O endereço deve ter pelo menos 5 caracteres.")
            : z.string().optional(),
    });
};


export default function EditCustomerPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const firestore = useFirestore();
  
  const customerId = params.id as string;
  
  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'registration'), [firestore]);
  const { data: registrationSettings, isLoading: settingsLoading } = useDoc(settingsDocRef);
  
  const customerDocRef = useMemoFirebase(() => doc(firestore, 'customers', customerId), [firestore, customerId]);
  const { data: customer, isLoading: customerLoading } = useDoc(customerDocRef);

  const customerFormSchema = useMemo(() => createCustomerFormSchema(registrationSettings), [registrationSettings]);
  type CustomerFormValues = z.infer<typeof customerFormSchema>

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
      form.reset({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        document: customer.document,
        address: customer.address
      });
    }
  }, [customer, form]);

  async function onSubmit(data: CustomerFormValues) {
    try {
      await updateDoc(customerDocRef, data);
      toast({
        title: "Sucesso!",
        description: `Dados do cliente "${data.name}" atualizados.`,
        variant: "default",
      })
      router.push('/customers')
    } catch (error) {
       console.error("Error updating customer: ", error);
       toast({
        title: "Erro!",
        description: "Não foi possível atualizar o cliente.",
        variant: "destructive"
      })
    }
  }
  
  const isLoading = customerLoading || settingsLoading;

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
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

  const customerSettings = registrationSettings?.customer || { phone: true, document: true, address: true };

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
              {customerSettings.phone && (
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
              )}
            </div>
            {customerSettings.document && (
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
            )}
            {customerSettings.address && (
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
            )}
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
