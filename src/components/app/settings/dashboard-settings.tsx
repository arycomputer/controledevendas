'use client'

import { useForm } from "react-hook-form"
import { useToast } from "@/hooks/use-toast"
import { Form, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { DashboardSettings } from "@/lib/types"

const defaultSettings: DashboardSettings = {
    showMonthFilter: true,
    showYearFilter: true,
}

export function DashboardSettingsManager() {
    const { toast } = useToast()
    const firestore = useFirestore()
    const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'dashboard'), [firestore]);
    const { data: dashboardSettings, isLoading: isSettingsLoading } = useDoc<DashboardSettings>(settingsDocRef);
    
    const form = useForm<DashboardSettings>({
        defaultValues: defaultSettings
    })

    useEffect(() => {
        if (dashboardSettings) {
            form.reset(dashboardSettings);
        }
    }, [dashboardSettings, form]);
    
    async function onSubmit(data: DashboardSettings) {
        if (!settingsDocRef) return;
        try {
            await setDoc(settingsDocRef, data, { merge: true });
            toast({
                title: "Sucesso!",
                description: "Configurações do Dashboard atualizadas.",
            });
            form.reset(data); 
        } catch (error) {
            console.error("Error saving settings:", error);
            toast({
                title: "Erro!",
                description: "Não foi possível salvar as configurações.",
                variant: "destructive"
            });
        }
    }

    if (isSettingsLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-lg">
                <div className="space-y-4">
                    <FormField
                        control={form.control}
                        name="showMonthFilter"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">Filtro Mensal</FormLabel>
                                    <FormDescription>Permite selecionar um mês específico para visualizar dados no Dashboard.</FormDescription>
                                </div>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="showYearFilter"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">Filtro Anual</FormLabel>
                                    <FormDescription>Permite selecionar o ano para visualizar os dados no Dashboard.</FormDescription>
                                </div>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormItem>
                        )}
                    />
                </div>
                <div className="flex justify-end pt-4">
                   <Button type="submit" disabled={!form.formState.isDirty}>Salvar Alterações</Button>
                </div>
            </form>
        </Form>
    )
}
