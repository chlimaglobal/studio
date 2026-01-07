
'use client';

import { formatCurrency } from '@/lib/utils';

const CustomTooltip = ({ active, payload, label, isPrivacyMode }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm">
                <p className="font-bold text-sm mb-1">{label}</p>
                {payload.map((p: any, i: number) => {
                    // Validate value before formatting
                    const value = Number(p.value);
                    if (isNaN(value)) {
                        return null; // Don't render if value is not a number
                    }
                    return (
                        <p key={i} style={{ color: p.color }} className="text-xs">
                            {`${p.name}: ${isPrivacyMode ? 'R$ ••••' : formatCurrency(value)}`}
                        </p>
                    )
                })}
            </div>
        );
    }
    return null;
};

export default CustomTooltip;

    