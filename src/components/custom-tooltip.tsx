'use client';

import { formatCurrency } from '@/lib/utils';

const CustomTooltip = ({ active, payload, label, isPrivacyMode }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm">
                <p className="font-bold text-sm mb-1">{label}</p>
                {payload.map((p: any, i: number) => (
                    <p key={i} style={{ color: p.color }} className="text-xs">
                        {`${p.name}: ${isPrivacyMode ? 'R$ ••••' : formatCurrency(p.value as number)}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default CustomTooltip;
