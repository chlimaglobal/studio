
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, PlusCircle, Target, ArrowLeft, Loader2, Star } from 'lucide-react';
import { AddGoalDialog } from '@/components/add-goal-dialog';
import { Progress } from '@/components/ui/progress';
import Icon from '@/components/icon';
import { icons } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Goal } from '@/lib/goal-types';
import { onGoalsUpdate } from '@/lib/storage';
import { format, differenceInDays, isPast } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth, useSubscription } from '@/app/layout';
import Link from 'next/link';

const PremiumBlocker = () => (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
        <Target className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Recurso Premium
        </h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">
            A criação de metas financeiras é um recurso exclusivo para assinantes.
        </p>
        <Button asChild>
            <Link href="/dashboard/pricing">Ver Planos</Link>
        </Button>
    </div>
);


export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();
  const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription();

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    if (isSubscribed) {
        setIsLoading(true);
        const unsubscribe = onGoalsUpdate(user.uid, (newGoals) => {
        setGoals(newGoals);
        setIsLoading(false);
        });
        return () => unsubscribe();
    } else {
        setIsLoading(false);
    }
  }, [user, isSubscribed]);
  
  const calculateProgress = (current: number, target: number) => {
    if (target <= 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getDaysRemaining = (deadline: Date | string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0,0,0,0);
    return differenceInDays(deadlineDate, today);
  };

  if (isLoading || isSubscriptionLoading) {
    return (
        <div className="flex justify-center items-center h-full p-8">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Carregando suas metas...</span>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Target className="h-6 w-6" />
                Minhas Metas
              </h1>
              <p className="text-muted-foreground">Acompanhe seu progresso em direção aos seus sonhos.</p>
            </div>
        </div>
        {isSubscribed && (
            <AddGoalDialog>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Meta
                </Button>
            </AddGoalDialog>
        )}
      </div>
      
      {!isSubscribed ? <PremiumBlocker /> : 
        goals.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => {
                const progress = calculateProgress(goal.currentAmount, goal.targetAmount);
                const daysRemaining = getDaysRemaining(goal.deadline);
                const isFinished = isPast(new Date(goal.deadline)) && progress < 100;

                return (
                    <Card key={goal.id} className="flex flex-col">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <Icon name={goal.icon as keyof typeof icons} className="h-8 w-8 text-primary" />
                                <div>
                                    <CardTitle>{goal.name}</CardTitle>
                                    <CardDescription>
                                        Meta: {formatCurrency(goal.targetAmount)}
                                    </CardDescription>
                                </div>
                            </div>
                            <div className={`text-right text-sm flex items-center gap-1.5 ${isFinished ? 'text-destructive' : 'text-muted-foreground'}`}>
                                <Calendar className="h-4 w-4" />
                                <span>
                                    {isFinished ? 'Prazo finalizado' : `${daysRemaining} dias`}
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-2">
                        <Progress value={progress} aria-label={`${progress.toFixed(0)}% concluído`}/>
                        <div className="text-sm text-muted-foreground flex justify-between">
                            <span>{formatCurrency(goal.currentAmount)}</span>
                            <span className="font-medium">{progress.toFixed(0)}%</span>
                        </div>
                    </CardContent>
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
