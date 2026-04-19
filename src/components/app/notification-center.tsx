
'use client'

import React, { useMemo } from 'react'
import { Bell, Package, ClipboardList, Wrench, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase'
import { collection } from 'firebase/firestore'
import type { Product, ServiceOrder, Budget } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { addDays, isBefore, parseISO } from 'date-fns'

export function NotificationCenter() {
  const firestore = useFirestore()

  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'parts') : null, [firestore])
  const { data: products } = useCollection<Product>(productsRef)

  const servicesRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceOrders') : null, [firestore])
  const { data: services } = useCollection<ServiceOrder>(servicesRef)

  const budgetsRef = useMemoFirebase(() => firestore ? collection(firestore, 'budgets') : null, [firestore])
  const { data: budgets } = useCollection<Budget>(budgetsRef)

  const notifications = useMemo(() => {
    const alerts: { id: string; title: string; description: string; type: 'stock' | 'service' | 'budget'; link: string; icon: any }[] = []

    // 1. Estoque Baixo
    products?.forEach(p => {
      if (p.type === 'piece' && (p.quantity || 0) < 5) {
        alerts.push({
          id: `stock-${p.id}`,
          title: 'Estoque Baixo',
          description: `${p.name} tem apenas ${p.quantity || 0} unidades.`,
          type: 'stock',
          link: `/products/${p.id}/edit`,
          icon: Package
        })
      }
    })

    // 2. Serviços Pendentes
    services?.forEach(s => {
      if (s.status === 'pending' || s.status === 'in_progress') {
        alerts.push({
          id: `service-${s.id}`,
          title: 'Serviço Ativo',
          description: `O.S. #${s.id.substring(0, 6)} aguarda conclusão.`,
          type: 'service',
          link: `/service-orders/${s.id}`,
          icon: Wrench
        })
      }
    })

    // 3. Orçamentos a vencer (próximos 3 dias)
    const threeDaysFromNow = addDays(new Date(), 3)
    budgets?.forEach(b => {
      if (b.status === 'pending') {
        const validUntil = parseISO(b.validUntil)
        if (isBefore(validUntil, threeDaysFromNow)) {
           alerts.push({
            id: `budget-${b.id}`,
            title: 'Orçamento a Vencer',
            description: `Vence em ${new Date(b.validUntil).toLocaleDateString('pt-BR')}.`,
            type: 'budget',
            link: `/budgets/${b.id}`,
            icon: ClipboardList
          })
        }
      }
    })

    return alerts
  }, [products, services, budgets])

  const unreadCount = notifications.length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-destructive text-white border-2 border-background">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b bg-muted/50">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            Notificações
            {unreadCount > 0 && <Badge variant="secondary">{unreadCount}</Badge>}
          </h4>
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length > 0 ? (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <Link 
                  key={n.id} 
                  href={n.link}
                  className="flex items-start gap-3 p-4 hover:bg-muted/50 border-b last:border-0 transition-colors"
                >
                  <div className="mt-0.5 p-2 rounded-full bg-primary/10">
                    <n.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold uppercase text-muted-foreground">{n.title}</span>
                    <p className="text-sm leading-snug">{n.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center flex flex-col items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Tudo em dia! Nenhuma notificação.</p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
