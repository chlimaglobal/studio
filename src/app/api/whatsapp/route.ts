
import { NextRequest, NextResponse } from 'next/server';
import { addStoredTransaction } from '@/lib/storage';
import { TransactionFormSchema } from '@/lib/definitions';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const apiSecret = process.env.API_SECRET_KEY;

  if (!apiSecret) {
    console.error('API_SECRET_KEY is not set.');
    return NextResponse.json({ error: 'A chave secreta da API não está configurada no servidor.' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${apiSecret}`) {
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }

  try {
    const jsonBody = await request.json();

    const amount = jsonBody.amount ?? jsonBody.valor;
    const description = jsonBody.description ?? jsonBody.descricao;
    const category = jsonBody.category ?? jsonBody.categoria;
    const type = jsonBody.type ?? (amount >= 0 ? 'income' : 'expense');

    if (description === undefined || amount === undefined) {
      return NextResponse.json({ error: 'Os campos "description" (ou "descricao") e "amount" (ou "valor") são obrigatórios.' }, { status: 400 });
    }

    const transactionData = {
      description: description,
      amount: Math.abs(amount),
      type: type,
      category: category || 'Outros',
      date: jsonBody.date ? new Date(jsonBody.date) : new Date(),
      paid: true,
      paymentMethod: 'one-time',
    };
    
    const validatedData = TransactionFormSchema.parse(transactionData);
    
    // In a multi-user environment, you'd need a way to identify the user
    // For this example, we assume a placeholder user ID 'whatsapp-user' is passed
    // in the body or a default is used. This is NOT secure for production.
    const userId = jsonBody.userId || 'default-user-id-placeholder';

    await addStoredTransaction([validatedData], userId);

    return NextResponse.json({ success: true, message: 'Transação registrada com sucesso.' }, { status: 200 });

  } catch (error) {
    console.error('JSON API Error:', error);
    const details = error instanceof z.ZodError ? error.errors : error;
    return NextResponse.json({ error: 'Dados inválidos ou erro ao processar a transação.', details: details }, { status: 400 });
  }
}
