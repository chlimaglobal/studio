
'use client';

import { Button } from '@/components/ui/button';
import { Check, Fuel, MessageCircle, Wallet } from 'lucide-react';
import Image from 'next/image';

const LogoIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 20V14.5C4 13.0667 4.58333 11.8333 5.75 10.8C6.91667 9.76667 8.33333 9.25 10 9.25C11.6667 9.25 13.0833 9.76667 14.25 10.8C15.4167 11.8333 16 13.0667 16 14.5V20H11V14.5C11 14.0333 10.85 13.65 10.55 13.35C10.25 13.05 9.86667 12.9 9.4 12.9C8.93333 12.9 8.55 13.05 8.25 13.35C7.95 13.65 7.8 14.0333 7.8 14.5V20H4ZM12 8L15.3 4H19.5L14 9.5L18 13V15.5L12 8Z" fill="hsl(var(--primary))"/>
    </svg>
);


export default function WhatsAppPage() {

  return (
    <div className="flex flex-col items-center text-center space-y-8 px-4 py-8">
        
        <LogoIcon />

        <div className="w-full max-w-sm mx-auto p-4 rounded-xl shadow-lg bg-secondary/30" style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-4c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63-2c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm54-3c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM28 63c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-6-22c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z' fill='%232e2e2e' fill-opacity='0.08' fill-rule='evenodd'/%3E%3C/svg%3E")`
        }}>
            <div className="space-y-3">
                <div className="flex justify-end">
                    <div className="bg-green-200/80 text-gray-900 rounded-lg rounded-br-none p-3 max-w-xs">
                        <p>quanto gastei de combustivel este mes?</p>
                        <div className="flex items-center justify-end text-xs text-gray-500 mt-1">
                            <span>6:13 da tarde</span>
                            <Check className="w-4 h-4 ml-1 text-blue-500" />
                            <Check className="w-4 h-4 -ml-2 text-blue-500" />
                        </div>
                    </div>
                </div>
                <div className="flex justify-start">
                    <div className="bg-card text-card-foreground rounded-lg rounded-bl-none p-3 max-w-xs shadow">
                        <p className="flex items-center">
                            No mês de junho de 2025, você gastou o total de R$ 100,00 com Combustível <Fuel className="w-4 h-4 ml-1.5 text-primary"/>
                        </p>
                        <div className="flex items-center justify-end text-xs text-muted-foreground mt-1">
                            <span>6:14 da tarde</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Um assistente no <span className="text-primary">WhatsApp</span>?</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
                Isso mesmo. Uma inteligência artificial sempre disponível para você diretamente no WhatsApp!
            </p>
             <p className="text-muted-foreground max-w-md mx-auto">
                Você pode enviar mensagens, áudios, fotos de comprovantes e muito mais. Tudo que você cadastrar no assistente aparecerá no aplicativo no celular e vice-versa.
            </p>
        </div>

        <Button size="lg" className="w-full max-w-sm">
            <MessageCircle className="mr-2 h-5 w-5" />
            Conectar com o WhatsApp
        </Button>
    </div>
  );
}
