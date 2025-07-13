import { getTransactions } from '@/app/actions';
import { generateFinancialAnalysis } from '@/ai/flows/generate-financial-analysis';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lightbulb, ListChecks, Activity } from 'lucide-react';

export default async function AnalysisPage() {
  const transactions = await getTransactions();
  const analysis = await generateFinancialAnalysis({ transactions });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Análise Financeira
          </h1>
          <p className="text-muted-foreground">
            Sua saúde financeira e dicas personalizadas pela nossa IA.
          </p>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Lightbulb />
            Diagnóstico da IA
          </CardTitle>
          <CardDescription>
            Uma visão geral da sua situação financeira no período.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-foreground/90 whitespace-pre-wrap">{analysis.diagnosis}</p>
        </CardContent>
      </Card>
      
      {analysis.isSurvivalMode && (
         <Card className="border-destructive/50">
            <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle />
                Modo Sobrevivência Ativado
            </CardTitle>
            <CardDescription>
                Seus gastos estão superando suas receitas. Aqui estão algumas sugestões emergenciais para reverter a situação.
            </CardDescription>
            </CardHeader>
         </Card>
      )}


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks />
            Plano de Ação Sugerido
          </CardTitle>
          <CardDescription>
            Dicas práticas e personalizadas para você economizar mais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analysis.suggestions && analysis.suggestions.length > 0 ? (
            <ul className="space-y-4">
              {analysis.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-4 p-4 rounded-md border bg-muted/50">
                    <span className="flex h-2 w-2 translate-y-2 rounded-full bg-primary" />
                    <p className="flex-1 text-sm text-foreground/80">{suggestion}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma sugestão específica no momento. Continue registrando suas transações!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
