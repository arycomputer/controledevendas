'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import Image from "next/image"
import React, { useRef, useState, useEffect } from "react"

import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useCompany } from "@/context/company-context"

const companyFormSchema = z.object({
  name: z.string().min(2, "O nome da empresa é obrigatório."),
  logo: z.string().optional(),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional(),
  address: z.string().optional(),
})

type CompanyFormValues = z.infer<typeof companyFormSchema>

export function CompanyForm() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { companyData, setCompanyData } = useCompany();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: companyData,
  })
  
  useEffect(() => {
    form.reset(companyData);
    setLogoPreview(companyData.logo || null);
  }, [companyData, form]);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        form.setValue("logo", result, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  function onSubmit(data: CompanyFormValues) {
    setCompanyData(data);
    toast({
      title: "Sucesso!",
      description: "Dados da empresa atualizados.",
    });
    form.reset(data); // Mark form as not dirty
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
        <FormItem>
            <FormLabel>Logo da Empresa</FormLabel>
            <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 rounded-md overflow-hidden border">
                    {logoPreview ? (
                        <Image 
                            src={logoPreview} 
                            alt="Logo da empresa" 
                            fill 
                            className="object-cover"
                            data-ai-hint="logo company"
                        />
                    ) : (
                       <div className="h-full w-full bg-muted flex items-center justify-center text-xs text-muted-foreground">Sem logo</div>
                    )}
                </div>
                <Input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleLogoChange}
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>Alterar Logo</Button>
            </div>
        </FormItem>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Empresa</FormLabel>
              <FormControl>
                <Input placeholder="Nome da sua empresa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="document"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNPJ</FormLabel>
              <FormControl>
                <Input placeholder="00.000.000/0000-00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                    <Input placeholder="(00) 00000-0000" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                    <Input placeholder="contato@empresa.com" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço</FormLabel>
              <FormControl>
                <Input placeholder="Rua, número, cidade, estado" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <div className="flex justify-end pt-4">
            <Button type="submit">Salvar Alterações</Button>
        </div>
      </form>
    </Form>
  )
}
