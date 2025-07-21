
'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils';

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
    const percentage = (payload[0].percent * 100).toFixed(2);
    
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm text-sm">
        <p className="font-medium">{data.name}</p>
        <p className="text-muted-foreground">{`${formatCurrency(value)} (${percentage}%)`}</p>
      </div>
    );
  }
  return null;
};

const CategoryPieChart = ({ data }: CategoryPieChartProps) => {
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
      </PieChart>
    </ResponsiveContainer>
  );
};

export default CategoryPieChart;
