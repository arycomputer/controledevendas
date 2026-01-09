'use client'

import { useCompany } from "@/context/company-context";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMemo } from "react";

const themes = [
    { name: 'light', label: 'Claro', colors: ['#f3f3f3', '#e53e3e'] },
    { name: 'dark', label: 'Escuro', colors: ['#1a202c', '#e53e3e'] },
    { name: 'blue', label: 'Azul', colors: ['#eBF5FF', '#3B82F6'] },
    { name: 'green', label: 'Verde', colors: ['#F0FFF4', '#38A169'] },
    { name: 'orange', label: 'Laranja', colors: ['#FFF5EB', '#DD6B20'] },
];

export function ThemeSelector() {
    const { companyData, setCompanyData, saveCompanyData, savedCompanyData } = useCompany();
    const { toast } = useToast();

    const isDirty = useMemo(() => {
        return companyData.theme !== savedCompanyData.theme;
    }, [companyData.theme, savedCompanyData.theme]);

    const handleThemeChange = (themeName: string) => {
        setCompanyData({ theme: themeName });
    }

    const handleSave = async () => {
        try {
            await saveCompanyData();
            toast({
                title: "Sucesso!",
                description: "Tema atualizado com sucesso.",
            });
        } catch (error) {
            toast({
                title: "Erro!",
                description: "Não foi possível salvar o tema.",
                variant: "destructive",
            });
        }
    }

    return (
        <div className="max-w-lg space-y-6">
            <div>
                <h3 className="text-lg font-medium">Escolha um tema</h3>
                <p className="text-sm text-muted-foreground">Clique para pré-visualizar e depois salve suas alterações.</p>
            </div>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {themes.map((theme) => (
                     <div key={theme.name} onClick={() => handleThemeChange(theme.name)} className="cursor-pointer">
                        <div 
                            className={cn(
                                "h-24 rounded-lg border-2 flex flex-col justify-between p-2 transition-all",
                                companyData.theme === theme.name ? "border-primary ring-2 ring-primary ring-offset-2" : "border-muted"
                            )}
                            style={{ backgroundColor: theme.colors[0]}}
                        >
                            <div className="flex justify-end">
                                {companyData.theme === theme.name && <Check className="h-5 w-5 text-primary" />}
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="h-5 w-5 rounded-full" style={{backgroundColor: theme.colors[1]}}></div>
                                <div className="h-3 flex-grow rounded-sm" style={{backgroundColor: theme.colors[1]}}></div>
                            </div>
                        </div>
                        <p className="text-sm font-medium text-center mt-2">{theme.label}</p>
                     </div>
                ))}
             </div>
             <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={!isDirty}>Salvar Alterações</Button>
            </div>
        </div>
    )
}
