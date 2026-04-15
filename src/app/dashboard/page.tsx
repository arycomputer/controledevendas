'use client'

import { CircleDollarSign, Users, Package, ShoppingCart, Loader2, Wrench, Handshake, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/app/stat-card";
import { SalesChart } from "@/components/app/sales-chart";
import { Badge } from "@/components/ui/badge";
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import type { Customer, Product, Sale, DashboardSettings } from "@/lib/types";
import { AuthGuard } from "@/components/app/auth-guard";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

function DashboardPageContent() {
  const firestore = useFirestore();
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());

  const salesCollection = useMemoFirebase(() => firestore ? collection(firestore, 'sales') : null, [firestore]);
  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesCollection);

  const customersCollection = useMemoFirebase(() => firestore ? collection(firestore, 'customers') : null, [firestore]);
  const { data: customers, isLoading: customersLoading } = useCollection<Customer>(customersCollection);
  
  const productsCollection = useMemoFirebase(() => firestore ? collection(firestore, 'parts') : null, [firestore]);
  const { data: products, isLoading: productsLoading } = useCollection<Product>(productsCollection);

  const dashSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'dashboard') : null, [firestore]);
  const { data: dashSettings, isLoading: settingsLoading } = useDoc<DashboardSettings>(dashSettingsRef);

  const isLoading = salesLoading || customersLoading || productsLoading || settingsLoading;
  
  const filteredSales = useMemo(() => {
    if (!sales) return [];
    
    return sales.filter(sale => {
      if (sale.status === 'cancelled') return false;
      
      const saleDate = new Date(sale.saleDate);
      const monthMatch = dashSettings?.showMonthFilter ? saleDate.getMonth().toString() === selectedMonth : true;
      const yearMatch = dashSettings?.showYearFilter ? saleDate.getFullYear().toString() === selectedYear : true;
      
      return monthMatch && yearMatch;
    });
  }, [sales, selectedMonth, selectedYear, dashSettings]);

  const stats = useMemo(() => {
    if (!filteredSales || !products) return { totalSalesValue: 0, totalPartsCost: 0, totalServicesRevenue: 0, recentSales: [] };

    const totalSalesValue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    
    const recentSales = [...filteredSales]
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
      .slice(0, 5);
      
    const productsMap = new Map(products.map(p => [p.id, p]));
    let totalPartsCost = 0;
    let totalServicesRevenue = 0;

    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = productsMap.get(item.productId);
        if (product) {
          if (product.type === 'piece') {
            totalPartsCost += (product.cost || 0) * item.quantity;
          } else if (product.type === 'service') {
            totalServicesRevenue += item.unitPrice * item.quantity;
          }
        }
      });
    });

    return { totalSalesValue, totalPartsCost, totalServicesRevenue, recentSales };
  }, [filteredSales, products]);

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        
        {(dashSettings?.showMonthFilter || dashSettings?.showYearFilter) && (
          <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg border">
            <Filter className="h-4 w-4 text-muted-foreground ml-1" />
            {dashSettings?.showMonthFilter && (
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {dashSettings?.showYearFilter && (
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[100px] h-8 text-xs">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Receita Total" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalSalesValue)} 
          icon={CircleDollarSign} 
        />
         <StatCard 
          title="Custo de Peças" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalPartsCost)} 
          icon={Wrench} 
        />
        <StatCard 
          title="Receita de Serviços" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalServicesRevenue)} 
          icon={Handshake} 
        />
        <StatCard 
          title="Vendas" 
          value={`+${filteredSales.length}`} 
          icon={ShoppingCart}
        />
        <StatCard 
          title="Clientes" 
          value={`+${customers?.length || 0}`} 
          icon={Users} 
        />
        <StatCard 
          title="Produtos/Serviços" 
          value={`${products?.length || 0}`} 
          icon={Package} 
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Visão Geral de Vendas</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <SalesChart sales={filteredSales}/>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Vendas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentSales.length > 0 ? (
                  stats.recentSales.map((sale) => {
                    const customer = customers?.find(c => c.id === sale.customerId);
                    return (
                      <TableRow key={sale.id}>
                        <TableCell>
                          <div className="font-medium">{customer?.name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{customer?.email || ''}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.totalAmount)}
                        </TableCell>
                         <TableCell className="text-center">
                          <Badge variant="outline">{new Date(sale.saleDate).toLocaleDateString('pt-BR')}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                      Nenhuma venda no período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
    return (
        <AuthGuard>
            <DashboardPageContent />
        </AuthGuard>
    )
}
