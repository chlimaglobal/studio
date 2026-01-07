
'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { useMemo } from 'react';

interface CategoryPieChartProps {
  data: { name: string; value: number }[];
}

const COLORS = [
  'hsl(var(--chart-1))', 
  'hsl(var(--chart-2))', 
  'hsl(var(--chart-3))', 
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = payload[0].value;
    
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
        <p className="font-medium">{data.name}</p>
        <p className="text-muted-foreground">{formatCurrency(value)}</p>
      </div>
    );
  }
  return null;
};

const CategoryPieChart = ({ data }: CategoryPieChartProps) => {

  const totalValue = useMemo(() => data.reduce((sum, entry) => sum + entry.value, 0), [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip 
            cursor={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
            content={<CustomTooltip />} 
        />
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          innerRadius={80} // This creates the donut hole
          outerRadius={120}
          paddingAngle={2}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
          stroke="hsl(var(--background))"
          strokeWidth={3}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <foreignObject x="50%" y="50%" width="160" height="100" style={{ transform: 'translate(-80px, -40px)', textAlign: 'center' }}>
            <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px' }}>Gasto Total</div>
            <div style={{ color: 'hsl(var(--foreground))', fontSize: '24px', fontWeight: 'bold' }}>
                {formatCurrency(totalValue)}
            </div>
        </foreignObject>
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CategoryPieChart;

    