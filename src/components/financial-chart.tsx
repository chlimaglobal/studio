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

/* ============================================================
   FUNÇÃO DE CORREÇÃO DE DADOS DO GRÁFICO
   ============================================================ */
function fixChartData(rawData: any[]) {
  if (!rawData || rawData.length === 0) return [];

  return rawData
    .map((item) => {
      return {
        ...item,
        aReceber: Number(item.aReceber) || 0,
        aPagar: Number(item.aPagar) || 0,
        resultado:
          Number(item.aReceber || 0) - Number(item.aPagar || 0)
      };
    })
    .sort((a, b) => {
      // Ordena pelo mês corretamente
      const [ma, ya] = a.date.split('/'); // ex: "07/25"
      const [mb, yb] = b.date.split('/');

      return (
        new Date(`20${ya}-${ma}-01`).getTime() -
        new Date(`20${yb}-${mb}-01`).getTime()
      );
    });
}

/* ============================================================ */

export default function FinancialChart({
  data,
  isPrivacyMode,
  costOfLiving
}: FinancialChartProps) {

  // 🔥 AQUI A CORREÇÃO É APLICADA
  const fixedData = fixChartData(data);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={fixedData}
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

        {/* RECEITAS */}
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

        {/* DESPESAS */}
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

        {/* BALANÇO */}
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
