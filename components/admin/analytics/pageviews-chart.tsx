"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const chartConfig: ChartConfig = {
  pageviews: { label: "Pageviews", color: "var(--chart-1)" },
  completions: { label: "Completions", color: "var(--chart-2)" },
};

export function PageviewsChart({ data }: { data: Array<{ date: string; pageviews: number; completions: number }> }) {
  if (data.length === 0) {
    return <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">No traffic data yet.</p>;
  }

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <AreaChart data={data} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => v.slice(5)} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area dataKey="pageviews" type="monotone" fill="var(--color-pageviews)" fillOpacity={0.2} stroke="var(--color-pageviews)" />
        <Area dataKey="completions" type="monotone" fill="var(--color-completions)" fillOpacity={0.2} stroke="var(--color-completions)" />
      </AreaChart>
    </ChartContainer>
  );
}
