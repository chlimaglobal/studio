
'use server';

import { stripe } from '@/lib/stripe';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@/lib/firebase';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { User } from 'firebase/auth';

export async function createCheckoutSession(priceId: string) {
  const currentUser = auth.currentUser as User;

  if (!currentUser) {
    throw new Error('Usuário não autenticado.');
  }

  const userDocRef = adminDb.collection('users').doc(currentUser.uid);
  const userDoc = await userDocRef.get();
  let stripeCustomerId = userDoc.data()?.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: currentUser.email!,
      name: currentUser.displayName || undefined,
      metadata: {
        firebaseUID: currentUser.uid,
      },
    });
    stripeCustomerId = customer.id;
    await userDocRef.set({ stripeCustomerId }, { merge: true });
  }

  const origin = headers().get('origin')!;
  
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard`,
      cancel_url: `${origin}/dashboard/pricing`,
    });

    return { url: session.url };
  } catch (error) {
    console.error('Stripe Error:', error);
    throw new Error('Falha ao criar a sessão de checkout do Stripe.');
  }
}

export async function createCustomerPortalSession() {
  const currentUser = auth.currentUser as User;
  
  if (!currentUser) {
    throw new Error('Usuário não autenticado.');
  }

  const userDocRef = adminDb.collection('users').doc(currentUser.uid);
  const userDoc = await userDocRef.get();
  const stripeCustomerId = userDoc.data()?.stripeCustomerId;

  if (!stripeCustomerId) {
    throw new Error('ID de cliente do Stripe não encontrado.');
  }
  
  const origin = headers().get('origin')!;

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/dashboard/pricing`,
    });

    return { url: portalSession.url };
  } catch (error) {
    console.error('Stripe Portal Error:', error);
    throw new Error('Falha ao criar sessão do portal do cliente.');
  }
}
