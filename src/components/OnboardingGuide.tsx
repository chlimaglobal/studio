
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
import { Card, CardContent } from '@/components/ui/card';
import { LayoutDashboard, Plus, BarChart3, LineChart, Handshake } from 'lucide-react';
import Icon from './icon';
import { icons } from 'lucide-react';

const onboardingSteps = [
    {
        title: "Seja bem-vindo ao FinanceFlow!",
        description: "Vamos dar uma olhada rápida nas principais ferramentas para transformar sua vida financeira.",
        icon: "Handshake",
    },
    {
        title: "Painel Principal",
        description: "Aqui você tem uma visão geral do seu mês: receitas, despesas e o balanço. Acompanhe seus gastos por categoria e orçamentos.",
        icon: "LayoutDashboard",
    },
    {
        title: "Adicione Transações Facilmente",
        description: "Use o botão '+' para adicionar despesas e receitas manualmente ou use sua voz com a assistente Lúmina.",
        icon: "Plus",
    },
    {
        title: "Relatórios Inteligentes",
        description: "Acesse a aba 'Relatórios' para ver gráficos detalhados sobre seus gastos e entender para onde seu dinheiro está indo.",
        icon: "BarChart3",
    },
    {
        title: "Controle seus Investimentos",
        description: "Na aba 'Investimentos', acompanhe a evolução do seu patrimônio, analise seu perfil e planeje seu futuro.",
        icon: "LineChart",
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
    const currentStep = onboardingSteps[current - 1] || onboardingSteps[0];


    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose(false)}>
            <DialogContent className="sm:max-w-md">
                 <Carousel setApi={setApi} className="w-full">
                    <CarouselContent>
                        {onboardingSteps.map((step, index) => {
                            const StepIcon = icons[step.icon as keyof typeof icons] || Handshake;
                            return (
                                <CarouselItem key={index}>
                                    <DialogHeader className="text-center h-16">
                                        <DialogTitle>{step.title}</DialogTitle>
                                    </DialogHeader>
                                    <Card className="bg-transparent border-0 shadow-none">
                                        <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
                                            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                                                 <StepIcon className="w-12 h-12 text-primary" />
                                            </div>
                                            <p className="text-muted-foreground text-center h-20">
                                                {step.description}
                                            </p>
                                        </CardContent>
                                    </Card>
                                </CarouselItem>
                            )
                        })}
                    </CarouselContent>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2"/>
                </Carousel>
                
                <div className="py-2 text-center text-sm text-muted-foreground">
                    Passo {current} de {count}
                </div>
                
                {isLastStep ? (
                    <Button onClick={() => handleClose(true)} className="w-full">Começar a Usar!</Button>
                ) : (
                    <div className="flex justify-end">
                        <Button variant="ghost" onClick={() => handleClose(false)}>Pular Tutorial</Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
