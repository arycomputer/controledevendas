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
import { Separator } from "@/components/ui/separator"

const createCustomerFormSchema = (settings: any) => z.object({
    name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
    email: z.string().optional(),
    phone: z.string().optional(),
    document: z.string().optional(),
    zipCode: z.string().optional(),
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
}).refine(data => !settings?.customer?.email || (data.email && z.string().email().safeParse(data.email).success), {
    message: "Por favor, insira um e-mail válido.",
    path: ["email"],
}).refine(data => !settings?.customer?.phone || (data.phone && data.phone.length >= 10), {
    message: "O telefone deve ter pelo menos 10 dígitos.",
    path: ["phone"],
}).refine(data => !settings?.customer?.document || (data.document && data.document.length >= 11), {
    message: "O documento (CPF/CNPJ) é obrigatório.",
    path: ["document"],
}).refine(data => !settings?.customer?.address || (data.zipCode && data.zipCode.replace(/\D/g, '').length === 8), {
    message: "O CEP deve ter 8 dígitos.",
    path: ["zipCode"],
}).refine(data => !settings?.customer?.address || (data.street && data.street.length > 0), {
    message: "A rua é obrigatória.",
    path: ["street"],
}).refine(data => !settings?.customer?.address || (data.neighborhood && data.neighborhood.length > 0), {
    message: "O bairro é obrigatório.",
    path: ["neighborhood"],
}).refine(data => !settings?.customer?.address || (data.city && data.city.length > 0), {
    message: "A cidade é obrigatória.",
    path: ["city"],
}).refine(data => !settings?.customer?.address || (data.state && data.state.length > 0), {
    message: "O estado é obrigatório.",
    path: ["state"],
});


type CustomerFormValues = z.infer<ReturnType<typeof createCustomerFormSchema>>;


export default function NewCustomerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const firestore = useFirestore();

  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'registration'), [firestore]);
  const { data: registrationSettings, isLoading: settingsLoading } = useDoc(settingsDocRef);
  
  const customerFormSchema = createCustomerFormSchema(registrationSettings);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      document: "",
      zipCode: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    },
  })

  useEffect(() => {
    if (registrationSettings) {
        form.reset({
            name: "",
            email: "",
            phone: "",
            document: "",
            zipCode: "",
            street: "",
            number: "",
            complement: "",
            neighborhood: "",
            city: "",
            state: "",
        });
    }
  }, [registrationSettings, form]);

  const handleZipCodeBlur = async (zipCode: string) => {
    if (zipCode.length !== 8) {
      return;
    }
    try {
      const response = await fetch(`https://viacep.com.br/ws/${zipCode}/json/`);
      const data = await response.json();
      if (!data.erro) {
        form.setValue("street", data.logradouro, { shouldValidate: true });
        form.setValue("neighborhood", data.bairro, { shouldValidate: true });
        form.setValue("city", data.localidade, { shouldValidate: true });
        form.setValue("state", data.uf, { shouldValidate: true });
      } else {
        toast({
            title: "CEP não encontrado",
            description: "Não foi possível encontrar o CEP informado.",
            variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching address from ZIP code:", error);
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível buscar o endereço a partir do CEP.",
        variant: "destructive",
      });
    }
  };

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

  const customerSettings = registrationSettings?.customer || { email: true, phone: true, document: true, address: true };

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
              {customerSettings.email && (
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
              )}
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
              <>
                <Separator className="my-6" />
                <h3 className="text-lg font-medium -mb-2">Endereço</h3>
                <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                            <Input 
                                placeholder="Ex: 12345-678" 
                                {...field}
                                onBlur={e => handleZipCodeBlur(e.target.value.replace(/\D/g, ''))}
                                maxLength={9}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                        control={form.control}
                        name="street"
                        render={({ field }) => (
                        <FormItem className="md:col-span-2">
                            <FormLabel>Rua</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Rua das Flores" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="number"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: 123" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="complement"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                            <Input placeholder="Ex: Apto 101, Bloco B" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                        control={form.control}
                        name="neighborhood"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Bairro</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Centro" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: São Paulo" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: SP" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
              </>
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
