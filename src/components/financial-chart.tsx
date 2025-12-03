
'use client';

import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ReferenceLine
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import CustomTooltip from './custom-tooltip';

interface FinancialChartProps {
  data: {
    date: string;
    aReceber: number;
    aPagar: number;
    resultado: number;
  }[];
  isPrivacyMode: boolean;
  costOfLiving: number;
}

export default function FinancialChart({
  data,
  isPrivacyMode,
  costOfLiving
}: FinancialChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 5, right: 15, left: 15, bottom: 30 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border) / 0.2)"
          vertical={false}
        />

        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          interval={0}
          angle={-30}
          textAnchor="end"
        />

        <YAxis
          tickLine={false}
          axisLine={false}
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          width={70}
          tickFormatter={(value) => formatCurrency(value)}
        />

        <Tooltip content={<CustomTooltip isPrivacyMode={isPrivacyMode} />} />

        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          wrapperStyle={{ paddingTop: 10 }}
        />

        {/* ======================= RECEITAS (VERDE) ======================= */}
        <Line
          type="monotone"
          dataKey="aReceber"
          name="Receitas"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2.5}
          dot={{ r: 5 }}
          activeDot={{ r: 7 }}
          connectNulls={true}
        />

        {/* ======================= DESPESAS (VERMELHO) ======================= */}
        <Line
          type="monotone"
          dataKey="aPagar"
          name="Despesas"
          stroke="hsl(var(--chart-2))"
          strokeWidth={2.5}
          dot={{ r: 5 }}
          activeDot={{ r: 7 }}
          connectNulls={true}
        />

        {/* ======================= BALANÇO (AZUL/PADRÃO) ======================= */}
        <Line
          type="monotone"
          dataKey="resultado"
          name="Balanço"
          stroke="hsl(var(--chart-4))"
          strokeWidth={2.5}
          dot={{ r: 5 }}
          activeDot={{ r: 7 }}
          connectNulls={true}
        />

        {/* ======================= CUSTO DE VIDA (LINHA DE REFERÊNCIA) ======================= */}
        <ReferenceLine
          y={costOfLiving}
          label={{
            value: 'Custo de Vida',
            position: 'center',
            fill: 'hsl(var(--muted-foreground))',
            fontSize: 10
          }}
          stroke="hsl(var(--muted-foreground))"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          ifOverflow="extendDomain"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

