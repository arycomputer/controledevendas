'use client'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import Image from "next/image"
import React, { useRef, useState, useEffect } from "react"
import { Loader2, UploadCloud } from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useCompany } from "@/context/company-context"
import { uploadImage } from "@/services/image-upload-service"
import { maskDocument, maskPhone } from "@/lib/utils"

const companyFormSchema = z.object({
  name: z.string().min(2, "O nome da empresa é obrigatório."),
  logo: z.string().optional(),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional().or(z.literal('')),
  address: z.string().optional(),
})

type CompanyFormValues = z.infer<typeof companyFormSchema>

export function CompanyForm() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { savedCompanyData, setCompanyData, saveCompanyData } = useCompany();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);


  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: savedCompanyData,
  })
  
  useEffect(() => {
    form.reset(savedCompanyData);
    setLogoPreview(savedCompanyData.logo || null);
  }, [savedCompanyData, form]);

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      setLogoPreview(URL.createObjectURL(file)); // Show local preview immediately

      try {
        const imageUrl = await uploadImage(file);
        form.setValue("logo", imageUrl, { shouldDirty: true });
        setCompanyData({ logo: imageUrl }); // Update context for live UI updates
        toast({
          title: "Upload Concluído",
          description: "O novo logo foi carregado com sucesso.",
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        console.error("Upload failed:", error);
        toast({
          title: "Falha no Upload",
          description: errorMessage,
          variant: "destructive",
        });
        setLogoPreview(savedCompanyData.logo || null); // Revert preview on error
      } finally {
        setIsUploading(false);
      }
    }
  };
  
  useEffect(() => {
    const subscription = form.watch((value) => {
      setCompanyData(value as Partial<CompanyFormValues>);
    });
    return () => subscription.unsubscribe();
  }, [form, setCompanyData]);


  async function onSubmit(data: CompanyFormValues) {
    try {
        setCompanyData(data);
        await saveCompanyData();
        toast({
          title: "Sucesso!",
          description: "Dados da empresa atualizados.",
        });
        form.reset(data);
    } catch (error) {
        toast({
            title: "Erro!",
            description: "Não foi possível salvar os dados da empresa.",
            variant: "destructive"
        });
    }
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
                     {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                    )}
                </div>
                <Input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleLogoChange}
                    disabled={isUploading}
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    <UploadCloud className="mr-2 h-4 w-4"/>
                    Alterar Logo
                </Button>
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
                <Input 
                    placeholder="00.000.000/0000-00" 
                    {...field}
                    onChange={(e) => field.onChange(maskDocument(e.target.value))}
                />
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
                    <Input 
                        placeholder="(00) 00000-0000" 
                        {...field}
                        onChange={(e) => field.onChange(maskPhone(e.target.value))}
                    />
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
            <Button type="submit" disabled={!form.formState.isDirty || isUploading}>Salvar Alterações</Button>
        </div>
      </form>
    </Form>
  )
}
