
'use client';
import { functions, httpsCallable } from './firebase';

export const generateInviteCode = httpsCallable<{ accountId: string }, { code: string; error?: string }>(functions, 'generateInviteCode');

export const acceptInviteCode = httpsCallable<{ code: string }, { success: boolean, accountName: string; error?: string }>(functions, 'acceptInviteCode');
