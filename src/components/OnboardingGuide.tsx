
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
import Image from 'next/image';

const onboardingSteps = [
    {
        title: "Seja bem-vindo ao FinanceFlow!",
        description: "Vamos dar uma olhada rápida nas principais ferramentas para transformar sua vida financeira.",
        image: "https://placehold.co/600x400.png",
        imageHint: "welcome handshake",
    },
    {
        title: "Painel Principal",
        description: "Aqui você tem uma visão geral do seu mês: receitas, despesas e o balanço. Acompanhe seus gastos por categoria e orçamentos.",
        image: "https://placehold.co/600x400.png",
        imageHint: "dashboard analytics",
    },
    {
        title: "Adicione Transações Facilmente",
        description: "Use o botão '+' para adicionar despesas e receitas manualmente ou use sua voz com a assistente Lúmina.",
        image: "https://placehold.co/600x400.png",
        imageHint: "plus icon",
    },
    {
        title: "Relatórios Inteligentes",
        description: "Acesse a aba 'Relatórios' para ver gráficos detalhados sobre seus gastos e entender para onde seu dinheiro está indo.",
        image: "https://placehold.co/600x400.png",
        imageHint: "pie chart",
    },
    {
        title: "Controle seus Investimentos",
        description: "Na aba 'Investimentos', acompanhe a evolução do seu patrimônio, analise seu perfil e planeje seu futuro.",
        image: "https://placehold.co/600x400.png",
        imageHint: "investment growth",
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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{onboardingSteps[current -1]?.title}</DialogTitle>
                    <DialogDescription>
                        {onboardingSteps[current -1]?.description}
                    </DialogDescription>
                </DialogHeader>

                <Carousel setApi={setApi} className="w-full">
                    <CarouselContent>
                        {onboardingSteps.map((step, index) => (
                            <CarouselItem key={index}>
                                <Card>
                                    <CardContent className="flex aspect-video items-center justify-center p-0 rounded-lg overflow-hidden">
                                        <Image 
                                            src={step.image} 
                                            alt={step.title}
                                            width={600}
                                            height={400}
                                            data-ai-hint={step.imageHint}
                                        />
                                    </CardContent>
                                </Card>
                            </CarouselItem>
                        ))}
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

