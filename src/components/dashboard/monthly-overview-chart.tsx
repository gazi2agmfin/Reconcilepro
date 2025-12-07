"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton";

type ChartData = {
  month: string;
  reconciliations: number;
}

const chartConfig = {
  reconciliations: {
    label: "Reconciliations",
    color: "hsl(var(--primary))",
  },
}

export function MonthlyOverviewChart({ data, isLoading }: { data: ChartData[], isLoading: boolean }) {
  if (isLoading) {
    return (
        <div className="h-[350px] w-full pr-4">
            <Skeleton className="h-full w-full" />
        </div>
    )
  }

  return (
    <div className="h-[350px] w-full">
       <ChartContainer config={chartConfig} className="w-full h-full">
        <BarChart accessibilityLayer data={data} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
          <XAxis
            dataKey="month"
            stroke="hsl(var(--foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
            allowDecimals={false}
          />
          <Tooltip 
            cursor={{ fill: 'hsl(var(--accent) / 0.2)' }} 
            content={<ChartTooltipContent indicator="dot" />} 
          />
          <Bar dataKey="reconciliations" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}
