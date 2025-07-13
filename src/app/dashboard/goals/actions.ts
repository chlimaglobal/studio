'use server';

import { revalidatePath } from 'next/cache';
import { AddGoalFormSchema, type Goal } from '@/lib/goal-types';
import { z } from 'zod';

// Simulating a database in memory
const mockGoals: Goal[] = [
    { id: 'goal_1', name: 'Viagem para o Japão', icon: 'Plane', targetAmount: 20000, currentAmount: 7500 },
    { id: 'goal_2', name: 'Carro Novo', icon: 'Car', targetAmount: 80000, currentAmount: 35000 },
    { id: 'goal_3', name: 'Reserva de Emergência', icon: 'ShieldCheck', targetAmount: 15000, currentAmount: 15000 },
];


export async function getGoals(): Promise<Goal[]> {
    return Promise.resolve(mockGoals);
}

export async function addGoal(data: z.infer<typeof AddGoalFormSchema>) {
    try {
        const newGoal: Goal = {
            id: `goal_${Date.now()}`,
            ...data
        };
        mockGoals.push(newGoal);
        revalidatePath('/dashboard/goals');
        
        return { 
            success: true, 
            message: "Meta adicionada com sucesso!",
        };
    } catch(error) {
        console.error("Failed to add goal:", error);
        return { 
            success: false, 
            message: "Falha ao adicionar meta."
        };
    }
}