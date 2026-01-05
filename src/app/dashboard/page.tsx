import { CircleDollarSign, Users, Package, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/app/stat-card";
import { SalesChart } from "@/components/app/sales-chart";
import { customers, products, sales } from "@/lib/data";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const totalSalesValue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  
  const recentSales = sales
    .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Receita Total" 
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSalesValue)} 
          icon={CircleDollarSign} 
        />
        <StatCard 
          title="Vendas" 
          value={`+${sales.length}`} 
          icon={ShoppingCart}
        />
        <StatCard 
          title="Clientes" 
          value={`+${customers.length}`} 
          icon={Users} 
        />
        <StatCard 
          title="Produtos/Serviços" 
          value={`${products.length}`} 
          icon={Package} 
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Visão Geral de Vendas</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <SalesChart />
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
                {recentSales.map((sale) => {
                  const customer = customers.find(c => c.id === sale.customerId);
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
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
