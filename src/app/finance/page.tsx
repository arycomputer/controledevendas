'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Wallet, 
  Filter, 
  PlusCircle, 
  Loader2, 
  Search,
  ArrowUpDown,
  Trash2
} from 'lucide-react'
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { collection, doc, deleteDoc, setDoc } from 'firebase/firestore'
import type { Sale, Purchase, FinancialTransaction } from '@/lib/types'
import { AuthGuard } from '@/components/app/auth-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { v4 as uuidv4 } from 'uuid'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const months = [
  { value: "0", label: "Janeiro" },
  { value: "1", label: "Fevereiro" },
  { value: "2", label: "Março" },
  { value: "3", label: "Abril" },
  { value: "4", label: "Maio" },
  { value: "5", label: "Junho" },
  { value: "6", label: "Julho" },
  { value: "7", label: "Agosto" },
  { value: "8", label: "Setembro" },
  { value: "9", label: "Outubro" },
  { value: "10", label: "Novembro" },
  { value: "11", label: "Dezembro" },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

function FinancePageContent() {
  const firestore = useFirestore()
  const { toast } = useToast()
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString())
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString())
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State para nova transação manual
  const [newTx, setNewTx] = useState({
    description: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category: 'Outros'
  })

  // Queries
  const salesRef = useMemoFirebase(() => firestore ? collection(firestore, 'sales') : null, [firestore])
  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesRef)

  const purchasesRef = useMemoFirebase(() => firestore ? collection(firestore, 'purchases') : null, [firestore])
  const { data: purchases, isLoading: purchasesLoading } = useCollection<Purchase>(purchasesRef)

  const manualTxRef = useMemoFirebase(() => firestore ? collection(firestore, 'transactions') : null, [firestore])
  const { data: manualTx, isLoading: manualTxLoading } = useCollection<FinancialTransaction>(manualTxRef)

  // Combinação de dados em um Fluxo de Caixa único
  const allTransactions = useMemo(() => {
    if (!sales || !purchases || !manualTx) return []

    const list: any[] = []

    // 1. Vendas como Entradas
    sales.forEach(s => {
      if (s.status === 'cancelled') return
      const date = parseISO(s.saleDate)
      if (date.getMonth().toString() === selectedMonth && date.getFullYear().toString() === selectedYear) {
        list.push({
          id: s.id,
          date: s.saleDate,
          description: `Venda #${s.id.substring(0, 6).toUpperCase()}`,
          amount: s.totalAmount,
          type: 'income',
          category: 'Vendas',
          source: 'sale'
        })
      }
    })

    // 2. Compras como Saídas
    purchases.forEach(p => {
      const date = parseISO(p.purchaseDate)
      if (date.getMonth().toString() === selectedMonth && date.getFullYear().toString() === selectedYear) {
        list.push({
          id: p.id,
          date: p.purchaseDate,
          description: `Compra: ${p.supplierName}`,
          amount: p.totalAmount,
          type: 'expense',
          category: 'Estoque',
          source: 'purchase'
        })
      }
    })

    // 3. Transações Manuais
    manualTx.forEach(t => {
      const date = parseISO(t.date)
      if (date.getMonth().toString() === selectedMonth && date.getFullYear().toString() === selectedYear) {
        list.push({
          ...t,
          source: 'manual'
        })
      }
    })

    // Filtro de busca
    let filtered = list
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = list.filter(t => 
        t.description.toLowerCase().includes(term) || 
        t.category.toLowerCase().includes(term)
      )
    }

    // Ordenação Cronológica
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [sales, purchases, manualTx, selectedMonth, selectedYear, searchTerm])

  const stats = useMemo(() => {
    const income = allTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0)
    const expense = allTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0)
    return { income, expense, balance: income - expense }
  }, [allTransactions])

  const handleAddTransaction = async () => {
    if (!firestore || !newTx.description || !newTx.amount) return
    setIsSubmitting(true)
    try {
      const id = uuidv4()
      const txData: FinancialTransaction = {
        id,
        description: newTx.description,
        amount: Number(newTx.amount),
        type: newTx.type,
        category: newTx.category,
        date: new Date().toISOString()
      }
      await setDoc(doc(firestore, 'transactions', id), txData)
      toast({ title: "Sucesso!", description: "Lançamento financeiro registrado." })
      setIsDialogOpen(false)
      setNewTx({ description: '', amount: '', type: 'expense', category: 'Outros' })
    } catch (error) {
      console.error(error)
      toast({ title: "Erro", description: "Falha ao salvar lançamento.", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteManual = async (id: string) => {
    if (!firestore) return
    try {
      await deleteDoc(doc(firestore, 'transactions', id))
      toast({ title: "Removido", description: "Lançamento excluído com sucesso." })
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" })
    }
  }

  if (salesLoading || purchasesLoading || manualTxLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground mt-1">Controle de entradas, saídas e fluxo de caixa.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsDialogOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo no Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-green-600' : 'text-destructive'}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.balance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Receitas menos Despesas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-green-500" /> Total Entradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.income)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-destructive" /> Total Saídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.expense)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Fluxo de Caixa</CardTitle>
              <CardDescription>Movimentações financeiras detalhadas.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
               <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar..." 
                  className="pl-8 h-9" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
                <Filter className="h-4 w-4 text-muted-foreground ml-1" />
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[120px] h-8 text-xs border-none bg-transparent">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[90px] h-8 text-xs border-none bg-transparent">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden md:table-cell">Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[100px] text-center">Tipo</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTransactions.length > 0 ? (
                allTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">
                      {format(parseISO(t.date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="font-medium truncate max-w-[200px]">
                      {t.description}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {t.category}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-destructive'}`}>
                      {t.type === 'income' ? '+' : '-'} {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                    </TableCell>
                    <TableCell className="text-center">
                       {t.type === 'income' ? (
                         <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 uppercase text-[9px]">Entrada</Badge>
                       ) : (
                         <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 uppercase text-[9px]">Saída</Badge>
                       )}
                    </TableCell>
                    <TableCell>
                      {t.source === 'manual' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteManual(t.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Nenhuma movimentação encontrada para o período.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal para Novo Lançamento Manual */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Novo Lançamento Financeiro</DialogTitle>
            <DialogDescription>
              Registre despesas ou receitas manuais fora do fluxo de vendas/compras.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo de Lançamento</Label>
              <Select value={newTx.type} onValueChange={(val: any) => setNewTx({ ...newTx, type: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa (Saída)</SelectItem>
                  <SelectItem value="income">Receita (Entrada)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Input 
                id="description" 
                placeholder="Ex: Aluguel, Conta de Luz, Investimento..." 
                value={newTx.description}
                onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={newTx.category} onValueChange={(val) => setNewTx({ ...newTx, category: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Infraestrutura">Infraestrutura (Contas, Aluguel)</SelectItem>
                  <SelectItem value="Marketing">Marketing / Divulgação</SelectItem>
                  <SelectItem value="Pessoal">Salários / Pessoal</SelectItem>
                  <SelectItem value="Impostos">Impostos / Taxas</SelectItem>
                  <SelectItem value="Manutenção">Manutenção / Reparos</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input 
                id="amount" 
                type="number" 
                placeholder="0,00" 
                value={newTx.amount}
                onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddTransaction} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar Lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function FinancePage() {
  return (
    <AuthGuard>
      <FinancePageContent />
    </AuthGuard>
  )
}
