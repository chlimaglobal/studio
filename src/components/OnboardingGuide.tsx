
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

const onboardingSteps = [
    {
        title: "Seja bem-vindo ao FinanceFlow!",
        description: "Vamos dar uma olhada rápida nas principais ferramentas para transformar sua vida financeira.",
    },
    {
        title: "Painel Principal",
        description: "Aqui você tem uma visão geral do seu mês: receitas, despesas e o balanço. Acompanhe seus gastos por categoria e orçamentos.",
    },
    {
        title: "Adicione Transações Facilmente",
        description: "Use o botão '+' para adicionar despesas e receitas manualmente ou use sua voz com a assistente Lúmina.",
    },
    {
        title: "Relatórios Inteligentes",
        description: "Acesse a aba 'Relatórios' para ver gráficos detalhados sobre seus gastos e entender para onde seu dinheiro está indo.",
    },
    {
        title: "Controle seus Investimentos",
        description: "Na aba 'Investimentos', acompanhe a evolução do seu patrimônio, analise seu perfil e planeje seu futuro.",
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
            <DialogContent className="sm:max-w-md p-8 flex flex-col justify-between h-[50vh]">
                 <Carousel setApi={setApi} className="w-full">
                    <CarouselContent>
                        {onboardingSteps.map((step, index) => (
                            <CarouselItem key={index}>
                                <div className="text-center h-48 flex flex-col justify-center items-center">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl mb-4">{step.title}</DialogTitle>
                                        <DialogDescription className="text-base">
                                            {step.description}
                                        </DialogDescription>
                                    </DialogHeader>
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-[-20px]" />
                    <CarouselNext className="right-[-20px]"/>
                </Carousel>
                
                <div className="flex flex-col items-center gap-4">
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
