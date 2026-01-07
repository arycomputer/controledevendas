'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { Sale } from "@/lib/types";

const chartConfig = {
  total: {
    label: "Total",
    color: "hsl(var(--primary))",
  },
}

interface SalesChartProps {
    sales: Sale[];
}

export function SalesChart({ sales }: SalesChartProps) {
  const salesByDay = sales.reduce((acc, sale) => {
    const date = new Date(sale.saleDate).toLocaleDateString('en-CA'); // Use YYYY-MM-DD for sorting
    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date] += sale.totalAmount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(salesByDay)
    .map(([date, total]) => ({ 
      name: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), 
      total,
      originalDate: new Date(date)
    }))
    .sort((a,b) => a.originalDate.getTime() - b.originalDate.getTime())
    .slice(-15); // Show last 15 days with sales


  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `R$${value}`}
          />
          <Tooltip 
             content={<ChartTooltipContent formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value as number)} />} 
             cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}
          />
          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}