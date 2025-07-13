
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Target } from 'lucide-react';
import { AddGoalDialog } from '@/components/add-goal-dialog';
import { Progress } from '@/components/ui/progress';
import Icon from '@/components/icon';
import { icons } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Goal } from '@/lib/goal-types';
import { getStoredGoals } from '@/lib/storage';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  const fetchGoals = () => {
    const storedGoals = getStoredGoals();
    setGoals(storedGoals);
  };

  useEffect(() => {
    setIsMounted(true);
    fetchGoals();

    window.addEventListener('storage', fetchGoals);
    return () => window.removeEventListener('storage', fetchGoals);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };
  
  const calculateProgress = (current: number, target: number) => {
    if (target <= 0) return 0;
    return (current / target) * 100;
  };

  if (!isMounted) {
    return null; // Or a loading skeleton
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Target className="h-6 w-6" />
            Minhas Metas
          </h1>
          <p className="text-muted-foreground">Acompanhe seu progresso em direção aos seus sonhos.</p>
        </div>
        <AddGoalDialog>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Meta
            </Button>
        </AddGoalDialog>
      </div>
      
      {goals.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
            return (
                <Card key={goal.id} className="flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Icon name={goal.icon as keyof typeof icons} className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle>{goal.name}</CardTitle>
                            <CardDescription>
                                {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow">
                     <Progress value={progress} aria-label={`${progress.toFixed(0)}% concluído`}/>
                </CardContent>
                <CardFooter className="text-sm text-muted-foreground">
                    <p>{progress.toFixed(0)}% concluído</p>
                </CardFooter>
                </Card>
            )
        })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
            <Target className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma meta criada</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
                Crie sua primeira meta para começar a planejar seu futuro.
            </p>
             <AddGoalDialog>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Meta
                </Button>
            </AddGoalDialog>
        </div>
      )}
    </div>
  );
}
