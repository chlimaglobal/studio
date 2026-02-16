'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { categoryData } from '@/types';
import { 
    ArrowLeft, Home, MoreHorizontal, Plus, Utensils, Croissant, Coffee, Bike,
    UtensilsCrossed, ShoppingCart, Gamepad2, AppWindow, Tv, Smartphone, Wifi,
    Lightbulb, Refrigerator, Building, HandCoins, Wrench, Droplets, Car, Shield,
    Stethoscope, Smile, FlaskConical, Pill, Drama, Trees, Beer, Film, PartyPopper,
    Swords, Landmark, CreditCard, Banknote, BookOpen, GraduationCap, School,
    Percent, Library, TrendingUp, Dog, Shirt, Plane, SprayCan, Hand, Briefcase, Gift,
    PiggyBank, LineChart, AreaChart, CandlestickChart, Fuel, Baby
} from 'lucide-react';
import Link from 'next/link';

// A simple map for main category icons
const categoryIcons: Record<string, React.ElementType> = {
  Moradia: Home,
  Alimentação: Utensils,
  'Assinaturas/Serviços': Tv,
  Transporte: Car,
  Saúde: Stethoscope,
  'Lazer/Hobbies': PartyPopper,
  'Dívidas/Empréstimos': CreditCard,
  Educação: GraduationCap,
  'Impostos/Taxas': Percent,
  'Investimentos e Reservas': TrendingUp,
  Bebê: Baby,
  Pets: Dog,
  Salário: Banknote,
  Vestuário: Shirt,
  Viagens: Plane,
  'Cuidado Pessoal': Hand,
  Finanças: Landmark,
  Outros: MoreHorizontal,
};

// Detailed map for subcategory icons
const subcategoryIcons: Record<string, React.ElementType> = {
    // Alimentação
    "Padaria": Croissant,
    "Cafeteria": Coffee,
    "Delivery": Bike,
    "Restaurante": UtensilsCrossed,
    "Supermercado": ShoppingCart,
    // Assinaturas/Serviços
    "Jogos": Gamepad2,
    "Aplicativos": AppWindow,
    "Streamings": Tv,
    "Telefone/Celular": Smartphone,
    "Televisão": Tv,
    "Internet": Wifi,
    // Moradia
    "Luz": Lightbulb,
    "Eletrodomésticos": Refrigerator,
    "Condomínio": Building,
    "Aluguel/Prestação": HandCoins,
    "Reformas": Wrench,
    "Água": Droplets,
    // Transporte
    "IPVA": Car,
    "Manutenção": Wrench,
    "Táxi/Uber": Car,
    "Licenciamento": Car,
    "Combustível": Fuel,
    "Multa": Car,
    // Saúde
    "Plano de Saúde": Shield,
    "Plano Odontológico": Smile,
    "Consultas": Stethoscope,
    "Dentista": Smile,
    "Exames": FlaskConical,
    "Farmácia": Pill,
    // Lazer/Hobbies
    "Teatro": Drama,
    "Parques": Trees,
    "Bares": Beer,
    "Cinema": Film,
    "Shows e Eventos": PartyPopper,
    "Esportes": Swords,
    // Dívidas/Empréstimos
    "Empréstimo": Landmark,
    "Cartão de Crédito": CreditCard,
    "Cheque Especial": Landmark,
    "Consórcio": Landmark,
    "Empréstimo Consignado": Landmark,
    "Encargos": Percent,
    // Educação
    "Cursos": BookOpen,
    "Faculdade": GraduationCap,
    "Materiais e Livros": BookOpen,
    "Escola": School,
    // Impostos/Taxas
    "Imposto de Renda": Library,
    "Tarifa Bancária": Library,
    "Anuidade Cartão": CreditCard,
    "Tributos": Library,
    // Investimentos e Reservas
    "Reserva de Emergência": PiggyBank,
    "Ações": LineChart,
    "Fundos Imobiliários": AreaChart,
    "Renda Fixa": CandlestickChart,
    "Juros": Percent,
    "Proventos": TrendingUp,
    "Aplicação": TrendingUp,
    "Rendimentos": TrendingUp,
    "Retirada": TrendingUp,
    // Bebê
    "Fraldas": Baby,
    "Fórmulas/Alimentação": Droplets,
    "Roupas e Acessórios": Shirt,
    "Saúde do Bebê": Stethoscope,
    "Brinquedos/Educação": Gamepad2,
    // Pets
    "Banho/Tosa": Droplets,
    "Acessórios Pet": Dog,
    "Alimentação Pet": Dog,
    "Medicamentos": Pill,
    "Veterinário": Stethoscope,
    // Salário
    "Férias": Plane,
    "Hora extra": Banknote,
    "Comissão": Banknote,
    "13º Salário": Banknote,
    "Aposentadoria": Banknote,
    "Trabalho": Briefcase,
    // Vestuário
    "Calçados": Shirt,
    "Acessórios": Shirt,
    "Roupas": Shirt,
    // Viagens
    "Hotel": Building,
    "Passagem": Plane,
    "Passeio": Plane,
    // Cuidado Pessoal
    "Higiene Pessoal": SprayCan,
    "Manicure": Hand,
    "Cabeleireiro/Barbeiro": Hand,
    "Maquiagem": Hand,
    // Finanças
    "Financiamento": Landmark,
    "Renegociação": Landmark,
    "Seguros": Shield,
    // Outros
    "Presentes": Gift,
    "Compras": ShoppingCart,
};


export default function CategoriesPage() {
  return (
    <div className="flex flex-col h-full">
      <header className="p-4 flex items-center justify-between sticky top-0 bg-background z-10">
        <Link href="/dashboard/profile">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Categorias</h1>
        <Button variant="ghost" size="icon">
          <Plus className="h-6 w-6" />
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.entries(categoryData).map(([category, subcategories]) => {
          const Icon = categoryIcons[category] || MoreHorizontal;
          return (
            <Card key={category} className="overflow-hidden">
                <div className="p-4 bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded-full">
                            <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <h2 className="text-lg font-semibold">{category}</h2>
                    </div>
                    <Button variant="ghost" size="icon">
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>

              <CardContent className="p-4">
                 <div className="mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground text-center">Subcategorias</h3>
                 </div>
                <div className="grid grid-flow-row auto-rows-max grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {subcategories.map((subcategory) => {
                    const SubIcon = subcategoryIcons[subcategory] || Landmark;
                    return (
                        <div key={subcategory} className="flex items-center gap-3 rounded-lg p-3 bg-secondary/50">
                            <div className="w-8 h-8 bg-background rounded-md flex items-center justify-center flex-shrink-0">
                                <SubIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <span className="text-sm font-medium truncate">{subcategory}</span>
                        </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
}