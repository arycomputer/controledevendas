'use client'

import { useForm } from "react-hook-form"
import { useToast } from "@/hooks/use-toast"
import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

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

export function RegistrationManager() {
    const { toast } = useToast()
    const firestore = useFirestore()
    const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'registration'), [firestore]);
    const { data: registrationSettings, isLoading } = useDoc<RegistrationFormValues>(settingsDocRef);
    
    const form = useForm<RegistrationFormValues>({
        defaultValues: defaultSettings
    })

    useEffect(() => {
        if (registrationSettings) {
            form.reset(registrationSettings);
        } else if (!isLoading) {
            // Data is not loading and no settings exist, so create the doc
            form.reset(defaultSettings);
            setDoc(settingsDocRef, defaultSettings);
        }
    }, [registrationSettings, isLoading, form, settingsDocRef]);
    
    async function onSubmit(data: RegistrationFormValues) {
        try {
            await setDoc(settingsDocRef, data, { merge: true });
            toast({
                title: "Sucesso!",
                description: "Configurações de campos obrigatórios atualizadas.",
            });
            form.reset(data); // Mark form as not dirty
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({
                title: "Erro!",
                description: "Não foi possível salvar as configurações.",
                variant: "destructive"
            });
        }
    }


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
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
                                        onCheckedChange={field.onChange}
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
                                        onCheckedChange={field.onChange}
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
                                        onCheckedChange={field.onChange}
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
                                        onCheckedChange={field.onChange}
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
                                        onCheckedChange={field.onChange}
                                    />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
                <div className="flex justify-end pt-4">
                   <Button type="submit" disabled={!form.formState.isDirty}>Salvar Alterações</Button>
                </div>
            </form>
        </Form>
    )
}
