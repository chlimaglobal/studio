
import { NextRequest, NextResponse } from 'next/server';
import { extractTransactionFromText } from '@/ai/flows/extract-transaction-from-text';
import { addStoredTransaction } from '@/lib/storage';
import { formatCurrency } from '@/lib/utils';
import { transactionCategories } from '@/lib/types';
import { Twilio } from 'twilio';

// This is the Webhook endpoint for Twilio to call when a message is received.
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const messageBody = formData.get('Body') as string;
  const from = formData.get('From') as string;

  if (!messageBody) {
    return new Response('<Response><Message>Mensagem vazia.</Message></Response>', {
        headers: { 'Content-Type': 'text/xml' },
    });
  }

  try {
    // Use the existing AI flow to extract transaction details from the message text
    const extractedData = await extractTransactionFromText({ text: messageBody });

    if (!extractedData || !extractedData.description || !extractedData.amount) {
        throw new Error('Não foi possível extrair os detalhes da transação do texto.');
    }
    
    // The AI might not return a category, so we default to "Outros"
    const category = extractedData.category && transactionCategories.includes(extractedData.category) 
        ? extractedData.category 
        : 'Outros';

    // Prepare the data for storage
    const transactionToStore = {
      description: extractedData.description,
      amount: extractedData.amount,
      type: extractedData.type,
      category: category,
      date: new Date(),
      paid: true, // Assume it's paid when registered via WhatsApp
    };
    
    // Save the transaction to the database
    await addStoredTransaction(transactionToStore);

    // Create the success response message for Twilio
    const successMessage = `${extractedData.type === 'income' ? 'Receita' : 'Despesa'} de ${formatCurrency(extractedData.amount)} (${extractedData.description}) registrada com sucesso!`;

    // Respond to Twilio in TwiML format
    const twiml = new Twilio.twiml.MessagingResponse();
    twiml.message(successMessage);

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Webhook Error:', error);
    
    // Create a user-friendly error message
    const errorMessage = 'Desculpe, não consegui entender. Tente algo como "gastei 25 no lanche" ou "recebi 500 de bônus".';
    
    const twiml = new Twilio.twiml.MessagingResponse();
    twiml.message(errorMessage);

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
