
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { Button } from '@/components/ui/button';
import Icon from './icon';
import { cn } from '@/lib/utils';
import type { icons } from 'lucide-react';

const onboardingSteps = [
    {
        icon: 'LayoutDashboard' as keyof typeof icons,
        title: "Seja bem-vindo ao FinanceFlow!",
        description: "Vamos dar uma olhada rápida nas principais ferramentas para transformar sua vida financeira.",
        color: "bg-blue-500/10 text-blue-500"
    },
    {
        icon: 'Plus' as keyof typeof icons,
        title: "Adicione Transações Facilmente",
        description: "Use o botão '+' para adicionar despesas e receitas manualmente ou use sua voz com a assistente Lúmina.",
        color: "bg-green-500/10 text-green-500"
    },
    {
        icon: 'BarChart3' as keyof typeof icons,
        title: "Relatórios Inteligentes",
        description: "Acesse a aba 'Relatórios' para ver gráficos detalhados sobre seus gastos e entender para onde seu dinheiro está indo.",
        color: "bg-purple-500/10 text-purple-500"
    },
    {
        icon: 'TrendingUp' as keyof typeof icons,
        title: "Controle seus Investimentos",
        description: "Na aba 'Investimentos', acompanhe a evolução do seu patrimônio, analise seu perfil e planeje seu futuro.",
        color: "bg-amber-500/10 text-amber-500"
    },
    {
        icon: 'MessageSquare' as keyof typeof icons,
        title: "Mural do Casal",
        description: "Converse com seu parceiro(a) e com a Lúmina para tomarem as melhores decisões financeiras juntos.",
        color: "bg-pink-500/10 text-pink-500"
    },
];


export function OnboardingGuide() {
    const [open, setOpen] = useState(false);
    const [api, setApi] = useState<CarouselApi>()
    const [current, setCurrent] = useState(0)
    const [count, setCount] = useState(0)
 
    useEffect(() => {
        const hasOnboardingCompleted = localStorage.getItem('onboardingComplete');
        if (!hasOnboardingCompleted) {
            setOpen(true);
        }
    }, []);

    useEffect(() => {
        if (!api) {
            return
        }
    
        setCount(api.scrollSnapList().length)
        setCurrent(api.selectedScrollSnap() + 1)
    
        api.on("select", () => {
            setCurrent(api.selectedScrollSnap() + 1)
        })
    }, [api]);

    const handleClose = (finished: boolean) => {
        setOpen(false);
        if (finished) {
            localStorage.setItem('onboardingComplete', 'true');
        }
    };

    const isLastStep = current === count;

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose(false)}>
            <DialogContent className="sm:max-w-md p-0 pt-8 flex flex-col justify-between h-[60vh]">
                 <Carousel setApi={setApi} className="w-full">
                    <CarouselContent>
                        {onboardingSteps.map((step, index) => (
                            <CarouselItem key={index}>
                                <div className="text-center h-full flex flex-col justify-center items-center px-6">
                                    <div className={cn("h-20 w-20 rounded-full flex items-center justify-center mb-6", step.color)}>
                                        <Icon name={step.icon} className="h-10 w-10" />
                                    </div>
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl mb-2">{step.title}</DialogTitle>
                                        <DialogDescription className="text-base">
                                            {step.description}
                                        </DialogDescription>
                                    </DialogHeader>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2"/>
                </Carousel>
                
                <div className="flex flex-col items-center gap-4 p-6 border-t">
                    <div className="text-center text-sm text-muted-foreground">
                        Passo {current} de {count}
                    </div>
                    
                    {isLastStep ? (
                        <Button onClick={() => handleClose(true)} className="w-full">Começar a Usar!</Button>
                    ) : (
                         <Button variant="ghost" onClick={() => handleClose(false)}>Pular Tutorial</Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
