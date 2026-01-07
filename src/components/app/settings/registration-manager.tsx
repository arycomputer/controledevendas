'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

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
    const form = useForm<RegistrationFormValues>({
        defaultValues: defaultSettings
    })

    function onSubmit(data: RegistrationFormValues) {
        console.log("Saving new settings:", data)
        toast({
            title: "Sucesso!",
            description: "Configurações de campos obrigatórios atualizadas.",
        })
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
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="customer.document"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <FormLabel className="font-normal">Documento (CPF/CNPJ) obrigatório</FormLabel>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="customer.address"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <FormLabel className="font-normal">Endereço obrigatório</FormLabel>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
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
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="product.quantity"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                    <FormLabel className="font-normal">Quantidade obrigatória</FormLabel>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
                
                <Button type="submit">Salvar Configurações</Button>
            </form>
        </Form>
    )
}
