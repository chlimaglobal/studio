
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Loader2, PlusCircle, Target, Star, Edit, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
import { useTransactions, useAuth, useSubscription } from '@/components/client-providers';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Progress } from '@/components/ui/progress';
import type { Goal } from '@/lib/goal-types';
import { AddGoalDialog } from '@/components/add-goal-dialog';
import { onGoalsUpdate, deleteStoredGoal } from '@/lib/storage';
import Icon from '@/components/icon';
import { icons } from 'lucide-react';
import Link from 'next/link';
import Confetti from 'react-confetti';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { EditGoalDialog } from '@/components/edit-goal-dialog';


const PremiumBlocker = () => (
    <Card className="text-center">
        <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
                <Star className="h-6 w-6 text-amber-500" />
                Recurso Premium
            </CardTitle>
            <CardDescription>
                A criação de metas financeiras é um recurso exclusivo para assinantes.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
                Faça o upgrade do seu plano para definir e acompanhar seus objetivos.
            </p>
            <Button asChild>
                <Link href="/dashboard/pricing">Ver Planos</Link>
            </Button>
        </CardContent>
    </Card>
);

const GoalCard = ({ goal, onEdit, onDelete }: { goal: Goal, onEdit: () => void, onDelete: () => void }) => {
    const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
    const timeLeft = formatDistanceToNow(new Date(goal.deadline), { addSuffix: true, locale: ptBR });
    const isCompleted = progress >= 100;
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (isCompleted) {
            setShowConfetti(true);
            const timer = setTimeout(() => setShowConfetti(false), 8000); // Confetti for 8 seconds
            return () => clearTimeout(timer);
        }
    }, [isCompleted]);

    return (
        <Card className="flex flex-col relative overflow-hidden">
            {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <Icon name={goal.icon as keyof typeof icons} className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>{goal.name}</CardTitle>
                            <CardDescription>Expira {timeLeft}</CardDescription>
                        </div>
                    </div>
                     <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta ação não pode ser desfeita. Isso excluirá permanentemente a meta.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
                                        Sim, excluir
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
                <Progress value={progress} />
                <div className="text-sm text-muted-foreground">
                    <span className="font-bold text-foreground">{formatCurrency(goal.currentAmount)}</span> de {formatCurrency(goal.targetAmount)}
                </div>
                 <p className={cn("text-xs font-semibold", isCompleted ? "text-green-500" : "text-primary")}>
                    {isCompleted ? "Meta Atingida!" : `${progress.toFixed(1)}% Completo`}
                </p>
            </CardContent>
            <CardFooter className="bg-muted/50 p-2 rounded-b-lg">
                  <Button variant="secondary" className="w-full">
                      Adicionar Progresso
                  </Button>
            </CardFooter>
        </Card>
    )
}


export default function GoalsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription();
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const { toast } = useToast();
    
    const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';

    useEffect(() => {
        if (user && (isSubscribed || isAdmin)) {
            setIsLoading(true);
            const unsubscribe = onGoalsUpdate(user.uid, (newGoals) => {
                setGoals(newGoals);
                setIsLoading(false);
            });
            return () => unsubscribe();
        } else if (!isSubscribed && !isAdmin) {
             setIsLoading(false);
        }
    }, [user, isSubscribed, isAdmin]);

    const handleDeleteGoal = async (goalId: string) => {
        if (!user) return;
        try {
            await deleteStoredGoal(user.uid, goalId);
            toast({
                title: 'Meta Excluída!',
                description: 'Seu objetivo foi removido com sucesso.',
            });
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Erro ao Excluir',
                description: 'Não foi possível remover a meta.',
            });
        }
    }


    if (isLoading || isSubscriptionLoading) {
        return (
            <div className="flex justify-center items-center h-full p-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Carregando metas...</span>
                </div>
            </div>
        );
    }
    
    return (
        <>
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
                        <p className="text-muted-foreground">
                            Defina e acompanhe seus objetivos financeiros.
                        </p>
                        </div>
                    </div>
                    {(isSubscribed || isAdmin) && (
                        <AddGoalDialog>
                            <Button>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Adicionar Meta
                            </Button>
                        </AddGoalDialog>
                    )}
                </div>
                
                {(!isSubscribed && !isAdmin) ? <PremiumBlocker /> : (
                    goals.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {goals.map(goal => (
                                <GoalCard 
                                    key={goal.id} 
                                    goal={goal}
                                    onEdit={() => setEditingGoal(goal)}
                                    onDelete={() => handleDeleteGoal(goal.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
                            <Target className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">Nenhuma meta cadastrada</h3>
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
                    )
                )}
            </div>
            {editingGoal && (
                <EditGoalDialog
                    goal={editingGoal}
                    open={!!editingGoal}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setEditingGoal(null);
                        }
                    }}
                />
            )}
        </>
    );
}
