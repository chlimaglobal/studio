"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { sendMessageToLumina } from "@/lib/lumina/agent";
import { useTransactions, useViewMode, useAuth } from "@/components/client-providers";

export default function Chat() {
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [recording, setRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const { transactions } = useTransactions();
  const { viewMode } = useViewMode();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const removeImage = () => setFile(null);

  const handleSend = async () => {
    if (!input.trim() && !file) return;

    const localMsg = {
      role: "user",
      text: input.trim(),
      image: file ? URL.createObjectURL(file) : null,
    };

    setMessages((prev) => [...prev, localMsg]);
    
    // Guardar o estado atual antes de limpar
    const currentInput = input;
    const currentFile = file;

    setInput("");
    setFile(null);

    const response = await sendMessageToLumina({
      message: currentInput,
      imageFile: currentFile,
      chatHistory: messages,
      allTransactions: transactions,
      isCoupleMode: viewMode === 'together',
    });

    const safeText =
      response?.text && response?.text.trim() !== ""
        ? response.text
        : "Tudo certo por aqui! O que mais posso fazer por você?";

    const luminaMsg = {
      role: "lumina",
      text: safeText,
      image: response?.imageBase64 || null,
    };

    setMessages((prev) => [...prev, luminaMsg]);
  };

  return (
    <div className="flex flex-col h-full bg-[#ECECEC]">

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : ""}`}>
            <div
              className={`p-3 rounded-2xl max-w-[75%] ${
                m.role === "user"
                  ? "bg-[#D1F1FF] text-black"
                  : "bg-white text-black shadow-sm"
              }`}
            >
              {m.text && <p className="mb-2 whitespace-pre-wrap">{m.text}</p>}

              {m.image && (
                <Image
                  src={m.image}
                  width={260}
                  height={260}
                  alt="img"
                  className="rounded-xl"
                />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Preview da imagem */}
      {file && (
        <div className="flex items-center gap-3 p-3 bg-white shadow-md">
          <Image
            src={URL.createObjectURL(file)}
            width={60}
            height={60}
            alt="preview"
            className="rounded-lg"
          />
          <button
            onClick={removeImage}
            className="text-red-500 font-semibold text-sm"
          >
            Remover
          </button>
        </div>
      )}

      {/* Caixa de entrada estilo WhatsApp */}
      <div className="p-3 bg-white flex items-center gap-3">

        {/* Imagem */}
        <label className="cursor-pointer text-2xl">
          📎
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
          />
        </label>

        {/* Input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite uma mensagem"
          rows={1}
          className="flex-1 border border-gray-300 rounded-xl p-2 resize-none focus:outline-none"
          style={{ maxHeight: "120px" }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        {/* Enviar */}
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
