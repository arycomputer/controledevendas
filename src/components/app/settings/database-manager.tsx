
'use client'

import { useState, useRef } from "react"
import { useFirestore } from "@/firebase"
import { collection, getDocs, writeBatch, doc, query, where, setDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Loader2, Upload, Download, RefreshCw, Database } from "lucide-react"
import { ConfirmationDialog } from "@/components/app/confirmation-dialog"
import type { Budget, Sale, Product } from "@/lib/types"
import { v4 as uuidv4 } from 'uuid';

const COLLECTIONS_TO_BACKUP = [
    'customers', 
    'parts', 
    'sales', 
    'serviceOrders', 
    'budgets', 
    'discards',
    'users',
    'settings',
    'purchases'
];

export function DatabaseManager() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isProvisioning, setIsProvisioning] = useState(false);
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

                    const collectionKeys = Object.keys(data);
                    if (collectionKeys.length === 0) {
                        throw new Error("O arquivo de backup parece estar vazio.");
                    }

                    for (const collectionName in data) {
                        const documents = data[collectionName];
                        documents.forEach(docData => {
                            const id = docData._id;
                            if (!id) return;
                            
                            const docRef = doc(firestore, collectionName, id);
                            const { _id, ...rest } = docData;
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

    const handleProvisionDatabase = async () => {
        if (!firestore) return;
        setIsProvisioning(true);
        try {
            // Criar um lote de operações para garantir que tudo seja tentado
            const batch = writeBatch(firestore);

            // 1. Garantir configurações de cadastro
            const regRef = doc(firestore, 'settings', 'registration');
            batch.set(regRef, {
                customer: { email: true, phone: true, document: true, address: true },
                product: { description: true, quantity: true }
            }, { merge: true });

            // 2. FORÇAR a criação da coleção de Compras
            // Gravamos um documento de inicialização. Isso cria a coleção no Firebase.
            const purchaseInitRef = doc(firestore, 'purchases', '_init_system');
            batch.set(purchaseInitRef, { 
                name: "Sistema de Compras",
                status: "active",
                createdAt: new Date().toISOString()
            }, { merge: true });

            // 3. Garantir documento de empresa
            const companyRef = doc(firestore, 'settings', 'companyData');
            batch.set(companyRef, { 
                initialized: true 
            }, { merge: true });

            await batch.commit();

            toast({ 
                title: "Sucesso!", 
                description: "A coleção 'purchases' foi inicializada e as permissões foram verificadas." 
            });
        } catch (error: any) {
            console.error("Provisioning error:", error);
            toast({ 
                title: "Falha no Provisionamento", 
                description: "Certifique-se de estar logado. Se o erro persistir, as regras do Firebase podem estar demorando a propagar.", 
                variant: "destructive" 
            });
        } finally {
            setIsProvisioning(false);
        }
    };

    const handleSyncBudgets = async () => {
        if (!firestore) return;
        setIsSyncing(true);
        toast({ title: "Iniciando sincronização...", description: "Verificando orçamentos aprovados para converter em vendas." });

        try {
            const budgetsRef = collection(firestore, 'budgets');
            const salesRef = collection(firestore, 'sales');
            const productsRef = collection(firestore, 'parts');

            const approvedBudgetsQuery = query(budgetsRef, where("status", "==", "approved"));
            const approvedBudgetsSnapshot = await getDocs(approvedBudgetsQuery);
            const approvedBudgets = approvedBudgetsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Budget));

            const salesSnapshot = await getDocs(salesRef);
            const existingSaleBudgetIds = new Set<string>();
            salesSnapshot.forEach(doc => {
                const sale = doc.data() as Sale;
                if (sale.budgetId) {
                    existingSaleBudgetIds.add(sale.budgetId);
                }
            });

            const budgetsToConvert = approvedBudgets.filter(budget => !existingSaleBudgetIds.has(budget.id));

            if (budgetsToConvert.length === 0) {
                toast({ title: "Sincronização Concluída", description: "Nenhum novo orçamento para converter." });
                setIsSyncing(false);
                return;
            }

            let salesCreatedCount = 0;
            let stockErrors = 0;

            const productsSnapshot = await getDocs(productsRef);
            const products = productsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));

            for (const budget of budgetsToConvert) {
                let hasStockError = false;
                for (const item of budget.items) {
                    const product = products.find(p => p.id === item.productId);
                    if (product && product.type === 'piece' && (product.quantity === undefined || product.quantity < item.quantity)) {
                        hasStockError = true;
                        break;
                    }
                }

                if (hasStockError) {
                    stockErrors++;
                    continue;
                }

                const batch = writeBatch(firestore);

                for (const item of budget.items) {
                    const product = products.find(p => p.id === item.productId);
                    if (product && product.type === 'piece') {
                        const productRef = doc(firestore, 'parts', product.id);
                        const newQuantity = (product.quantity || 0) - item.quantity;
                        batch.update(productRef, { quantity: newQuantity });
                        
                        const productIndex = products.findIndex(p => p.id === product.id);
                        if(productIndex > -1) {
                            products[productIndex].quantity = newQuantity;
                        }
                    }
                }
                
                const saleId = uuidv4();
                const saleData: Sale = {
                    id: saleId,
                    budgetId: budget.id,
                    customerId: budget.customerId,
                    items: budget.items,
                    totalAmount: budget.totalAmount,
                    saleDate: new Date().toISOString(),
                    paymentMethod: 'cash',
                    status: 'pending',
                    downPayment: 0,
                    amountReceivable: budget.totalAmount,
                };
                const saleRef = doc(firestore, "sales", saleId);
                batch.set(saleRef, saleData);

                await batch.commit();
                salesCreatedCount++;
            }
            
            let description = `${salesCreatedCount} nova(s) venda(s) criada(s).`;
            if (stockErrors > 0) {
                description += ` ${stockErrors} orçamento(s) não foram convertidos por falta de estoque.`
            }

            toast({ title: "Sincronização Concluída!", description });

        } catch (error) {
            console.error("Error syncing budgets:", error);
            toast({ title: "Erro na Sincronização", description: "Não foi possível converter os orçamentos.", variant: "destructive" });
        } finally {
            setIsSyncing(false);
        }
    }


    return (
        <div className="space-y-6 max-w-lg">
            <div className="space-y-2">
                <h4 className="font-medium">Provisionar Estrutura</h4>
                <p className="text-sm text-muted-foreground">
                    Este botão forçará a criação da coleção de <strong>Compras</strong> e verificará as permissões. Clique aqui se receber erro de permissão.
                </p>
                <Button variant="secondary" onClick={handleProvisionDatabase} disabled={isProvisioning || isSyncing}>
                    {isProvisioning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                    {isProvisioning ? "Provisionando..." : "Verificar e Criar Estrutura"}
                </Button>
            </div>

            <div className="space-y-2">
                <h4 className="font-medium">Exportar Dados</h4>
                <p className="text-sm text-muted-foreground">
                    Crie um arquivo de backup completo de todos os seus dados.
                </p>
                <Button onClick={handleExport} disabled={isExporting || isImporting || isSyncing}>
                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    {isExporting ? "Exportando..." : "Exportar Dados"}
                </Button>
            </div>
            <div className="space-y-2">
                <h4 className="font-medium">Importar Dados</h4>
                <p className="text-sm text-muted-foreground">
                   Atenção: Esta ação substituirá TODOS os dados existentes no sistema.
                </p>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="application/json"
                    onChange={handleFileSelect}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isImporting || isExporting || isSyncing}>
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                     {isImporting ? "Importando..." : "Importar Dados"}
                </Button>
            </div>

            <div className="space-y-2">
                <h4 className="font-medium">Sincronizar Dados</h4>
                <p className="text-sm text-muted-foreground">
                   Converte orçamentos aprovados pendentes em vendas e atualiza o estoque.
                </p>
                <Button variant="outline" onClick={handleSyncBudgets} disabled={isSyncing || isExporting || isImporting}>
                    {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    {isSyncing ? "Sincronizando..." : "Sincronizar Orçamentos"}
                </Button>
            </div>

            <ConfirmationDialog
                open={isConfirmDialogOpen}
                onOpenChange={setIsConfirmDialogOpen}
                title="Confirmar Importação de Dados"
                description="Você tem certeza que deseja importar este arquivo? Todos os dados atuais serão substituídos permanentemente."
                onConfirm={handleConfirmImport}
                confirmText="Sim, importar e substituir tudo"
            />
        </div>
    );
}
