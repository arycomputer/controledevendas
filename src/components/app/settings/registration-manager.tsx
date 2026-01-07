'use client'

import { useForm } from "react-hook-form"
import { useToast } from "@/hooks/use-toast"
import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import { useEffect, useCallback } from "react"
import { Loader2 } from "lucide-react"

const defaultSettings = {
    customer: {
        phone: true,
        document: true,
        address: true,
    },
    product: {
        description: true,
        quantity: true,
    }
}

type RegistrationFormValues = typeof defaultSettings;

// Simple debounce function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<F>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
}


export function RegistrationManager() {
    const { toast } = useToast()
    const firestore = useFirestore()
    const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'registration'), [firestore]);
    const { data: registrationSettings, isLoading } = useDoc<RegistrationFormValues>(settingsDocRef);
    
    const form = useForm<RegistrationFormValues>({
        defaultValues: defaultSettings
    })
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSave = useCallback(
        debounce((data: RegistrationFormValues) => {
            setDoc(settingsDocRef, data, { merge: true });
            toast({
                title: "Sucesso!",
                description: "Configurações de campos obrigatórios atualizadas.",
            });
        }, 500), 
        [settingsDocRef, toast]
    );

    useEffect(() => {
        if (registrationSettings) {
            form.reset(registrationSettings);
        } else if (!isLoading) {
            // Pre-fill form and create document if it doesn't exist
            form.reset(defaultSettings);
            setDoc(settingsDocRef, defaultSettings);
        }
    }, [registrationSettings, isLoading, form, settingsDocRef]);


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <Form {...form}>
            <form className="space-y-8 max-w-lg">
                <div>
                    <h3 className="text-lg font-medium mb-4">Cadastro de Clientes</h3>
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="customer.phone"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <FormLabel className="font-normal">Telefone obrigatório</FormLabel>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={(checked) => {
                                            field.onChange(checked);
                                            debouncedSave(form.getValues());
                                        }}
                                    />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="customer.document"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <FormLabel className="font-normal">Documento (CPF/CNPJ) obrigatório</FormLabel>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={(checked) => {
                                            field.onChange(checked);
                                            debouncedSave(form.getValues());
                                        }}
                                    />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="customer.address"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <FormLabel className="font-normal">Endereço obrigatório</FormLabel>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={(checked) => {
                                            field.onChange(checked);
                                            debouncedSave(form.getValues());
                                        }}
                                    />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                <Separator />
                
                <div>
                    <h3 className="text-lg font-medium mb-4">Cadastro de Produtos (Peças)</h3>
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="product.description"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <FormLabel className="font-normal">Descrição obrigatória</FormLabel>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={(checked) => {
                                            field.onChange(checked);
                                            debouncedSave(form.getValues());
                                        }}
                                    />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="product.quantity"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <FormLabel className="font-normal">Quantidade obrigatória</FormLabel>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={(checked) => {
                                            field.onChange(checked);
                                            debouncedSave(form.getValues());
                                        }}
                                    />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            </form>
        </Form>
    )
}
