'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { doc, setDoc } from "firebase/firestore"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

type CustomerFormValues = z.infer<typeof customerFormSchema>;
const customerFormSchema = z.object({
    name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
    email: z.string().email("Por favor, insira um e-mail válido."),
    phone: z.string().optional(),
    document: z.string().optional(),
    address: z.string().optional(),
});


export default function NewCustomerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const firestore = useFirestore();

  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'registration'), [firestore]);
  const { data: registrationSettings, isLoading: settingsLoading } = useDoc(settingsDocRef);
  
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(
      z.object({
        name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
        email: z.string().email("Por favor, insira um e-mail válido."),
        phone: z.string().optional(),
        document: z.string().optional(),
        address: z.string().optional(),
      }).refine(data => !registrationSettings?.customer?.phone || (data.phone && data.phone.length >= 10), {
        message: "O telefone deve ter pelo menos 10 dígitos.",
        path: ["phone"],
      }).refine(data => !registrationSettings?.customer?.document || (data.document && data.document.length >= 11), {
        message: "O documento (CPF/CNPJ) é obrigatório.",
        path: ["document"],
      }).refine(data => !registrationSettings?.customer?.address || (data.address && data.address.length >= 5), {
        message: "O endereço deve ter pelo menos 5 caracteres.",
        path: ["address"],
      })
    ),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      document: "",
      address: "",
    },
  })

  useEffect(() => {
    if (registrationSettings) {
        form.reset({
            name: "",
            email: "",
            phone: "",
            document: "",
            address: "",
        });
    }
  }, [registrationSettings, form]);

  async function onSubmit(data: CustomerFormValues) {
    if (!firestore) return;
    try {
      const customerId = uuidv4();
      const customerData = { ...data, id: customerId };
      const customerDocRef = doc(firestore, "customers", customerId);
      await setDoc(customerDocRef, customerData);

      toast({
        title: "Sucesso!",
        description: `Cliente "${data.name}" cadastrado.`,
        variant: "default",
      })
      router.push('/customers')
    } catch (error) {
      console.error("Error creating customer: ", error);
      toast({
        title: "Erro!",
        description: "Não foi possível cadastrar o cliente.",
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

  const customerSettings = registrationSettings?.customer || { phone: true, document: true, address: true };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Novo Cliente</CardTitle>
        <CardDescription>Preencha os dados para cadastrar um novo cliente.</CardDescription>
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
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancelar
                </Button>
                <Button type="submit">Salvar Cliente</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
