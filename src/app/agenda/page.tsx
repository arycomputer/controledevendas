
'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarIcon, Wrench, ClipboardList, Clock, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { collection } from 'firebase/firestore'
import type { ServiceOrder, Budget, Customer } from '@/lib/types'
import { AuthGuard } from '@/components/app/auth-guard'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format, isPast, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function AgendaPageContent() {
  const firestore = useFirestore()

  const servicesRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceOrders') : null, [firestore])
  const { data: services, isLoading: servicesLoading } = useCollection<ServiceOrder>(servicesRef)

  const budgetsRef = useMemoFirebase(() => firestore ? collection(firestore, 'budgets') : null, [firestore])
  const { data: budgets, isLoading: budgetsLoading } = useCollection<Budget>(budgetsRef)

  const customersRef = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore])
  const { data: customers } = useCollection<Customer>(customersRef)

  const activeServices = useMemo(() => {
    return services?.filter(s => s.status === 'pending' || s.status === 'in_progress')
      .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()) || []
  }, [services])

  const urgentBudgets = useMemo(() => {
    return budgets?.filter(b => b.status === 'pending')
      .sort((a, b) => new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime()) || []
  }, [budgets])

  if (servicesLoading || budgetsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Clock className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Minha Agenda</h1>
        <p className="text-muted-foreground mt-1">O que temos para hoje? Gerencie seus prazos e compromissos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Serviços Pendentes */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold px-1">
            <Wrench className="h-5 w-5 text-primary" />
            <h2>Ordens de Serviço Ativas</h2>
            <Badge variant="secondary" className="ml-auto">{activeServices.length}</Badge>
          </div>

          {activeServices.length > 0 ? (
            <div className="grid gap-4">
              {activeServices.map(service => {
                const customer = customers?.find(c => c.id === service.customerId)
                return (
                  <Card key={service.id} className="hover:shadow-md transition-shadow group">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                           <Badge variant={service.status === 'pending' ? 'destructive' : 'default'} className="text-[10px] uppercase">
                            {service.status === 'pending' ? 'Pendente' : 'Em Andamento'}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">#{service.id.substring(0,6).toUpperCase()}</span>
                        </div>
                        <h3 className="font-bold">{service.itemDescription}</h3>
                        <p className="text-sm text-muted-foreground">{customer?.name || 'Cliente N/A'}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                          <CalendarIcon className="h-3 w-3" />
                          <span>Entrada: {format(parseISO(service.entryDate), "dd 'de' MMMM", { locale: ptBR })}</span>
                        </div>
                      </div>
                      <Button asChild variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/service-orders/${service.id}`}>
                          <ArrowRight className="h-5 w-5" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground">Nenhuma ordem de serviço pendente!</p>
            </Card>
          )}
        </section>

        {/* Orçamentos Pendentes */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-lg font-semibold px-1">
            <ClipboardList className="h-5 w-5 text-orange-500" />
            <h2>Acompanhamento de Orçamentos</h2>
            <Badge variant="secondary" className="ml-auto">{urgentBudgets.length}</Badge>
          </div>

          {urgentBudgets.length > 0 ? (
            <div className="grid gap-4">
              {urgentBudgets.map(budget => {
                const customer = customers?.find(c => c.id === budget.customerId)
                const isExpired = isPast(parseISO(budget.validUntil))
                return (
                  <Card key={budget.id} className={`hover:shadow-md transition-shadow group ${isExpired ? 'bg-destructive/5' : ''}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                           <Badge variant={isExpired ? 'destructive' : 'outline'} className="text-[10px] uppercase">
                            {isExpired ? 'Expirado' : 'Aguardando'}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">#{budget.id.substring(0,6).toUpperCase()}</span>
                        </div>
                        <h3 className="font-bold text-sm">{customer?.name || 'Cliente N/A'}</h3>
                        <p className="text-sm font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.totalAmount)}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                          <Clock className={`h-3 w-3 ${isExpired ? 'text-destructive' : ''}`} />
                          <span className={isExpired ? 'text-destructive font-semibold' : ''}>
                            {isExpired ? 'Venceu em' : 'Válido até'}: {format(parseISO(budget.validUntil), "dd/MM/yyyy")}
                          </span>
                        </div>
                      </div>
                      <Button asChild variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/budgets/${budget.id}`}>
                          <ArrowRight className="h-5 w-5" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border-dashed flex flex-col items-center justify-center p-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="text-muted-foreground">Nenhum orçamento pendente para acompanhar.</p>
            </Card>
          )}
        </section>
      </div>
    </div>
  )
}

export default function AgendaPage() {
  return (
    <AuthGuard>
      <AgendaPageContent />
    </AuthGuard>
  )
}
