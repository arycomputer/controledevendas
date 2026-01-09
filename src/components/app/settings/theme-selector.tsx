'use client'

import { useCompany } from "@/context/company-context";
import { Check, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const themes = [
    { name: 'light', label: 'Claro', colors: ['#f3f3f3', '#e53e3e'] },
    { name: 'dark', label: 'Escuro', colors: ['#1a202c', '#e53e3e'] },
    { name: 'blue', label: 'Azul', colors: ['#eBF5FF', '#3B82F6'] },
    { name: 'green', label: 'Verde', colors: ['#F0FFF4', '#38A169'] },
    { name: 'orange', label: 'Laranja', colors: ['#FFF5EB', '#DD6B20'] },
];

export function ThemeSelector() {
    const { companyData, setCompanyData } = useCompany();

    const handleThemeChange = (themeName: string) => {
        setCompanyData({ theme: themeName });
    }

    return (
        <div className="max-w-lg space-y-4">
            <h3 className="text-lg font-medium">Escolha um tema</h3>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {themes.map((theme) => (
                     <div key={theme.name} onClick={() => handleThemeChange(theme.name)} className="cursor-pointer">
                        <div 
                            className={cn(
                                "h-24 rounded-lg border-2 flex flex-col justify-between p-2",
                                companyData.theme === theme.name ? "border-primary" : "border-muted"
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
        </div>
    )
}
