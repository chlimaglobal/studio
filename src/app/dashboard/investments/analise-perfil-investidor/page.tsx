
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { runInvestorProfileAnalysis } from '../../actions';

// Placeholder para as perguntas do questionário
const questions = [
  {
    id: 'q1',
    text: 'Qual é o seu principal objetivo ao investir?',
    answers: [
      { id: 'a1', text: 'Preservar meu capital com baixo risco.' },
      { id: 'a2', text: 'Gerar uma fonte de renda passiva.' },
      { id: 'a3', text: 'Aumentar meu patrimônio, aceitando alguma volatilidade.' },
      { id: 'a4', text: 'Maximizar os ganhos, mesmo que isso signifique correr mais riscos.' },
    ],
  },
  {
    id: 'q2',
    text: 'Por quanto tempo você pretende manter seus investimentos?',
    answers: [
      { id: 'b1', text: 'Menos de 2 anos.' },
      { id: 'b2', text: 'De 2 a 5 anos.' },
      { id: 'b3', text: 'De 5 a 10 anos.' },
      { id: 'b4', text: 'Mais de 10 anos.' },
    ],
  },
    {
    id: 'q3',
    text: 'Como você reagiria se seus investimentos caíssem 20% em um mês?',
    answers: [
      { id: 'c1', text: 'Venderia tudo para evitar mais perdas.' },
      { id: 'c2', text: 'Venderia uma parte e manteria o resto.' },
      { id: 'c3', text: 'Manteria minha posição, confiando na recuperação.' },
      { id: 'c4', text: 'Compraria mais, aproveitando os preços baixos.' },
    ],
  },
];

export default function InvestorProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleAnswer = (questionId: string, answerId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerId }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  const handlePrevious = () => {
      if (currentQuestionIndex > 0) {
          setCurrentQuestionIndex(currentQuestionIndex - 1);
      }
  }

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
        const result = await runInvestorProfileAnalysis({ answers });
        const query = new URLSearchParams({
            analysisResult: JSON.stringify(result)
        }).toString();
        router.push(`/dashboard/investments/analise-perfil-investidor/resultado?${query}`);
    } catch (error) {
        console.error("Analysis failed:", error);
        toast({
            variant: "destructive",
            title: "Erro na Análise",
            description: "Não foi possível gerar seu perfil. Tente novamente."
        })
    } finally {
        setIsLoading(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Análise de Perfil de Investidor</h1>
          <p className="text-muted-foreground">Responda algumas perguntas para descobrirmos seu perfil.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pergunta {currentQuestionIndex + 1} de {questions.length}</CardTitle>
          <CardDescription>{currentQuestion.text}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentQuestion.answers.map((answer) => (
              <Button
                key={answer.id}
                variant={answers[currentQuestion.id] === answer.id ? 'default' : 'outline'}
                className="w-full justify-start h-auto py-3 text-left whitespace-normal"
                onClick={() => handleAnswer(currentQuestion.id, answer.id)}
              >
                {answer.text}
              </Button>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
                Anterior
            </Button>
            {isLastQuestion ? (
                <Button onClick={handleSubmit} disabled={isLoading || !answers[currentQuestion.id]}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Finalizar e Ver Perfil'}
                </Button>
            ) : (
                <Button onClick={handleNext} disabled={!answers[currentQuestion.id]}>Próxima</Button>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}
