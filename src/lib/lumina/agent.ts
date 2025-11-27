
'use client';

// Helper function to convert a File to a Base64 string
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

// Main function to send data to the Lumina API endpoint
export async function sendMessageToLumina({
  message,
  imageFile,
  chatHistory,
  allTransactions,
  isCoupleMode
}: {
  message: string,
  imageFile: File | null,
  chatHistory: any[],
  allTransactions: any[],
  isCoupleMode: boolean
}) {
  let imageBase64: string | null = null;

  // If there's an image file, convert it to Base64
  if (imageFile) {
    imageBase64 = await fileToBase64(imageFile);
  }

  // Prepare the body for the API request
  const body = {
    userQuery: message || "",
    imageBase64,
    chatHistory: chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      text: msg.text || '',
      timestamp: new Date().toISOString(),
    })),
    allTransactions,
    isCoupleMode: !!isCoupleMode
  };

  try {
    const res = await fetch('/api/lumina/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("API response not OK", res);
      // Return a standard error message for the UI
      return {
        text: "Tive uma pequena instabilidade, mas já recuperei tudo. Como posso te ajudar agora?",
        suggestions: [
          "Resumo das minhas despesas",
          "Analisar minhas finanças",
          "Criar um orçamento"
        ]
      };
    }

    return await res.json();
  } catch (error) {
    console.error("Error sending message to Lumina:", error);
    // Return a standard error message for network or other fetch errors
     return {
        text: "Não consegui me conectar. Verifique sua internet e tente novamente.",
        suggestions: []
      };
  }
}
