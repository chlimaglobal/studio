
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, CreditCard, Calendar, AlertCircle } from 'lucide-react';
import type { Card as CardType } from '@/lib/card-types';
import { AddCardDialog } from '@/components/add-card-dialog';
import CardIcon from '@/components/card-icon';
import { useEffect, useState } from 'react';
import { getStoredCards } from '@/lib/storage';
import Link from 'next/link';


export default function CardsPage() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  const fetchCards = () => {
    const storedCards = getStoredCards();
    setCards(storedCards);
  };

  useEffect(() => {
    setIsMounted(true);
    fetchCards();

    window.addEventListener('storage', fetchCards);
    return () => window.removeEventListener('storage', fetchCards);
  }, []);

  if (!isMounted) {
      return null; // Or a loading skeleton
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              Meus Cartões
            </h1>
            <p className="text-muted-foreground">Gerencie seus cartões de crédito em um só lugar.</p>
          </div>
          <AddCardDialog>
              <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar Cartão
              </Button>
          </AddCardDialog>
        </div>
        
        {cards.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <Link key={card.id} href={`/dashboard/cards/${encodeURIComponent(card.name)}`} passHref>
                <Card 
                  className="flex flex-col cursor-pointer hover:border-primary/50 transition-colors h-full"
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                        <CardTitle>{card.name}</CardTitle>
                        <CardDescription className="capitalize">{card.brand}</CardDescription>
                    </div>
                    <CardIcon brand={card.brand} className="w-12 h-auto" />
                  </CardHeader>
                  <CardContent className="flex-grow">
                    {/* Future content can go here, like limits, current balance, etc. */}
                  </CardContent>
                  <CardFooter className="bg-muted/50 p-4 rounded-b-lg text-sm text-muted-foreground flex justify-between">
                    <div className='flex items-center gap-2'>
                        <Calendar className="h-4 w-4" />
                        <span>Fecha dia {card.closingDay}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                        <AlertCircle className="h-4 w-4" />
                        <span>Vence dia {card.dueDay}</span>
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum cartão cadastrado</h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
                  Adicione seu primeiro cartão de crédito para começar a organizar.
              </p>
              <AddCardDialog>
                  <Button>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Adicionar Cartão
                  </Button>
              </AddCardDialog>
          </div>
        )}
      </div>
    </>
  );
}
