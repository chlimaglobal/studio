
'use server';

import { stripe } from '@/lib/stripe';
import { adminDb, adminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { headers } from 'next/headers';

async function getAuthenticatedUser(token: string) {
    if (!adminApp) {
        console.error('Firebase Admin App not initialized.');
        return null;
    }
    const auth = getAuth(adminApp);
    try {
        if (!token) {
             console.error('Authorization token missing');
             return null;
        }
        const decodedToken = await auth.verifyIdToken(token);
        return {
            uid: decodedToken.uid,
            email: decodedToken.email,
            displayName: decodedToken.name,
        };
    } catch (error) {
        console.error('Error verifying auth token in Server Action:', error);
        return null;
    }
}


export async function createCheckoutSession(priceId: string, token: string) {
  const currentUser = await getAuthenticatedUser(token); 

  if (!currentUser) {
    throw new Error('Usuário não autenticado.');
  }
  
  if (!adminDb) {
     throw new Error('O banco de dados do administrador não foi inicializado.');
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
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/pricing`,
    });

    return { url: session.url };
  } catch (error) {
    console.error('Stripe Error:', error);
    throw new Error('Falha ao criar a sessão de checkout do Stripe.');
  }
}

export async function createCustomerPortalSession(token: string) {
  const currentUser = await getAuthenticatedUser(token);

  if (!currentUser) {
    throw new Error('Usuário não autenticado.');
  }
  
  if (!adminDb) {
     throw new Error('O banco de dados do administrador não foi inicializado.');
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
