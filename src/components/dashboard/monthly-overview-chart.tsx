"use client"

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis, Tooltip } from "recharts"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton";

type ChartData = Record<string, any> & { reconciliations?: number };

const chartConfig = {
  reconciliations: {
    label: "Reconciliations",
    color: "hsl(var(--primary))",
  },
}

const hashStringToHue = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h) % 360;
}

type Props = {
  data: ChartData[];
  isLoading: boolean;
  xKey?: string; // key for X axis (month, user, etc.)
  valueKey?: string; // numeric value key (defaults to reconciliations)
  colorBy?: 'index' | 'month' | 'user' | string; // the field name to color by, or 'index'
  colorMap?: Record<string,string>;
  showLabels?: boolean;
}

export function MonthlyOverviewChart({ data, isLoading, xKey = 'month', valueKey = 'reconciliations', colorBy = 'index', colorMap, showLabels = true }: Props) {
  if (isLoading) {
    return (
        <div className="h-[350px] w-full pr-4">
            <Skeleton className="h-full w-full" />
        </div>
    )
  }

  const getColorFor = (entry: ChartData, index: number) => {
    let key = '';
    if (colorBy === 'index') key = String(index);
    else if (typeof colorBy === 'string' && entry && entry[colorBy]) key = String(entry[colorBy]);
    else if (entry && entry[xKey]) key = String(entry[xKey]);

    if (colorMap && key && colorMap[key]) return colorMap[key];
    const hue = hashStringToHue(key || String(index));
    return `hsl(${hue} 70% 45%)`;
  }

  return (
    <div className="h-[350px] w-full">
       <ChartContainer config={chartConfig} className="w-full h-full">
        <BarChart accessibilityLayer data={data} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
          <XAxis
            dataKey={xKey}
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
          <Bar dataKey={valueKey} radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={`cell-${i}`} fill={getColorFor(entry, i)} />
            ))}
            {showLabels && <LabelList dataKey={valueKey} position="top" />}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}
