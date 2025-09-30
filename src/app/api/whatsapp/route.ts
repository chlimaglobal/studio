
import { NextRequest, NextResponse } from 'next/server';
import { extractTransactionFromText } from '@/ai/flows/extract-transaction-from-text';
import { addStoredTransaction } from '@/lib/storage';
import { formatCurrency } from '@/lib/utils';
import { transactionCategories, TransactionFormSchema } from '@/lib/types';
import { Twilio } from 'twilio';

// This is the Webhook endpoint for Twilio to call when a message is received.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const apiSecret = process.env.API_SECRET_KEY;

  // --- Integration via Direct API Call (JSON) ---
  if (authHeader && authHeader === `Bearer ${apiSecret}`) {
    try {
        const jsonBody = await request.json();
        
        // Adapt to different field names for flexibility
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

        // Validate with Zod schema before saving
        const validatedData = TransactionFormSchema.parse(transactionData);
        
        // In a multi-user environment, you'd identify the user via the API key
        // For this app, we assume a single user context for this direct API call.
        // A user ID must be passed or inferred from the API key for multi-user scenarios.
        // For this example, we assume a placeholder or single user.
        await addStoredTransaction(validatedData);

        return NextResponse.json({ success: true, message: 'Transação registrada com sucesso.' }, { status: 200 });

    } catch (error) {
        console.error('JSON API Error:', error);
        return NextResponse.json({ error: 'Dados inválidos ou erro ao processar a transação.', details: error }, { status: 400 });
    }
  }


  // --- Integration via Twilio WhatsApp ---
  try {
    const formData = await request.formData();
    const messageBody = formData.get('Body') as string;

    if (!messageBody) {
        return new Response('<Response><Message>Mensagem vazia.</Message></Response>', {
            headers: { 'Content-Type': 'text/xml' },
        });
    }

    const extractedData = await extractTransactionFromText({ text: messageBody });

    if (!extractedData || !extractedData.description || !extractedData.amount) {
        throw new Error('Não foi possível extrair os detalhes da transação do texto.');
    }
    
    const category = extractedData.category && transactionCategories.includes(extractedData.category) 
        ? extractedData.category 
        : 'Outros';

    const transactionToStore = {
      description: extractedData.description,
      amount: extractedData.amount,
      type: extractedData.type,
      category: category,
      date: new Date(),
      paid: true,
      paymentMethod: 'one-time',
    };
    
    const validatedData = TransactionFormSchema.parse(transactionToStore);
    await addStoredTransaction(validatedData);

    const successMessage = `${validatedData.type === 'income' ? 'Receita' : 'Despesa'} de ${formatCurrency(validatedData.amount)} (${validatedData.description}) registrada com sucesso!`;

    const twiml = new Twilio.twiml.MessagingResponse();
    twiml.message(successMessage);

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Twilio Webhook Error:', error);
    
    const errorMessage = 'Desculpe, não consegui entender. Tente algo como "gastei 25 no lanche" ou "recebi 500 de bônus".';
    
    const twiml = new Twilio.twiml.MessagingResponse();
    twiml.message(errorMessage);

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
