'use client'

import { useState, useRef } from "react"
import { useFirestore } from "@/firebase"
import { collection, getDocs, writeBatch, doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Loader2, Upload, Download } from "lucide-react"
import { ConfirmationDialog } from "@/components/app/confirmation-dialog"

const COLLECTIONS_TO_BACKUP = [
    'customers', 
    'parts', 
    'sales', 
    'serviceOrders', 
    'budgets', 
    'discards',
    'users',
    'settings'
];

export function DatabaseManager() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [fileToImport, setFileToImport] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        if (!firestore) return;
        setIsExporting(true);
        toast({ title: "Iniciando exportação...", description: "Coletando dados de todas as coleções." });

        try {
            const backupData: { [key: string]: any[] } = {};

            for (const collectionName of COLLECTIONS_TO_BACKUP) {
                const collectionRef = collection(firestore, collectionName);
                const snapshot = await getDocs(collectionRef);
                backupData[collectionName] = snapshot.docs.map(doc => ({ ...doc.data(), _id: doc.id }));
            }
            
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement("a");
            a.href = url;
            const date = new Date().toISOString().slice(0, 10);
            a.download = `backup-vendascontrol-${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            toast({ title: "Exportação Concluída!", description: "Seu backup foi salvo com sucesso." });

        } catch (error) {
            console.error("Error exporting database:", error);
            toast({ title: "Erro na Exportação", description: "Não foi possível gerar o backup.", variant: "destructive" });
        } finally {
            setIsExporting(false);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type !== 'application/json') {
                toast({ title: "Arquivo Inválido", description: "Por favor, selecione um arquivo .json.", variant: "destructive" });
                return;
            }
            setFileToImport(file);
            setIsConfirmDialogOpen(true);
        }
    };

    const handleConfirmImport = async () => {
        if (!firestore || !fileToImport) return;
        
        setIsImporting(true);
        setIsConfirmDialogOpen(false);
        toast({ title: "Iniciando importação...", description: "Isso pode levar alguns instantes. Não feche esta página." });

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const text = e.target?.result;
                    if (typeof text !== 'string') {
                         throw new Error("Falha ao ler o arquivo.");
                    }
                    const data = JSON.parse(text) as { [key: string]: any[] };
                    
                    const batch = writeBatch(firestore);

                    // Basic validation
                    const collectionKeys = Object.keys(data);
                    if (collectionKeys.length === 0 || !collectionKeys.every(k => COLLECTIONS_TO_BACKUP.includes(k))) {
                        throw new Error("O arquivo de backup parece estar corrompido ou em um formato inválido.");
                    }

                    for (const collectionName in data) {
                        const documents = data[collectionName];
                        documents.forEach(docData => {
                            const id = docData._id; // Use the stored id
                            if (!id) return; // Skip if no id
                            
                            const docRef = doc(firestore, collectionName, id);
                            const { _id, ...rest } = docData; // Remove _id before writing
                            batch.set(docRef, rest);
                        });
                    }

                    await batch.commit();

                    toast({ title: "Importação Concluída!", description: "Seu backup foi restaurado. A página será recarregada." });
                    
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);

                } catch (parseError) {
                     console.error("Error parsing or writing data:", parseError);
                     toast({ title: "Erro na Importação", description: "O arquivo de backup está corrompido ou em um formato inválido.", variant: "destructive" });
                } finally {
                     setIsImporting(false);
                     if(fileInputRef.current) fileInputRef.current.value = "";
                     setFileToImport(null);
                }
            };
            reader.readAsText(fileToImport);
        } catch (error) {
            console.error("Error importing database:", error);
            toast({ title: "Erro na Importação", description: "Não foi possível ler o arquivo selecionado.", variant: "destructive" });
            setIsImporting(false);
        }
    };


    return (
        <div className="space-y-6 max-w-lg">
            <div className="space-y-2">
                <h4 className="font-medium">Exportar Dados</h4>
                <p className="text-sm text-muted-foreground">
                    Crie um arquivo de backup completo de todos os seus dados. É recomendado fazer backups regularmente.
                </p>
                <Button onClick={handleExport} disabled={isExporting || isImporting}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    {isExporting ? "Exportando..." : "Exportar Dados"}
                </Button>
            </div>
            <div className="space-y-2">
                <h4 className="font-medium">Importar Dados</h4>
                <p className="text-sm text-muted-foreground">
                   Importe um arquivo de backup (.json). <strong className="text-destructive">Atenção:</strong> Esta ação substituirá TODOS os dados existentes no sistema pelos dados do arquivo.
                </p>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="application/json"
                    onChange={handleFileSelect}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting || isExporting}>
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                     {isImporting ? "Importando..." : "Importar Dados"}
                </Button>
            </div>

            <ConfirmationDialog
                open={isConfirmDialogOpen}
                onOpenChange={setIsConfirmDialogOpen}
                title="Confirmar Importação de Dados"
                description="Você tem certeza que deseja importar este arquivo? Todos os dados atuais serão substituídos permanentemente. Esta ação não pode ser desfeita."
                onConfirm={handleConfirmImport}
                confirmText="Sim, importar e substituir tudo"
            />
        </div>
    );
}
