
import { NextRequest, NextResponse } from 'next/server';
import { extractTransactionFromText } from '@/ai/flows/extract-transaction-from-text';
import { addStoredTransaction } from '@/lib/storage';
import { formatCurrency } from '@/lib/utils';
import { transactionCategories, TransactionFormSchema } from '@/lib/types';
import { Twilio } from 'twilio';

// This is the Webhook endpoint for Twilio to call when a message is received.
export async function POST(request: NextRequest) {
  const twilioSignature = request.headers.get('x-twilio-signature');
  const contentType = request.headers.get('content-type') || '';

  // --- Integration via Direct API Call (JSON) ---
  if (contentType.includes('application/json') && !twilioSignature) {
    const apiSecret = process.env.API_SECRET_KEY;
    const authHeader = request.headers.get('authorization');
    
    if (!apiSecret || authHeader !== `Bearer ${apiSecret}`) {
        return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    }

    try {
        const jsonBody = await request.json();
        
        const transactionData = {
            description: jsonBody.description,
            amount: jsonBody.amount,
            type: jsonBody.type,
            category: jsonBody.category || 'Outros',
            date: jsonBody.date ? new Date(jsonBody.date) : new Date(),
            paid: true,
            paymentMethod: 'one-time',
        };

        // Validate with Zod schema before saving
        const validatedData = TransactionFormSchema.parse(transactionData);
        
        await addStoredTransaction(validatedData);

        return NextResponse.json({ success: true, message: 'Transação registrada com sucesso.' }, { status: 200 });

    } catch (error) {
        console.error('JSON API Error:', error);
        return NextResponse.json({ error: 'Dados inválidos ou erro ao processar a transação.', details: error }, { status: 400 });
    }
  }


  // --- Integration via Twilio WhatsApp ---
  const formData = await request.formData();
  const messageBody = formData.get('Body') as string;

  if (!messageBody) {
    return new Response('<Response><Message>Mensagem vazia.</Message></Response>', {
        headers: { 'Content-Type': 'text/xml' },
    });
  }

  try {
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
