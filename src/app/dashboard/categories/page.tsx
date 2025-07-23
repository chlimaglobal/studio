
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { categoryData } from '@/lib/types';
import { ArrowLeft, Home, MoreHorizontal, Plus, Utensils } from 'lucide-react';
import Link from 'next/link';

// A simple map for category icons, can be expanded
const categoryIcons: Record<string, React.ElementType> = {
  Moradia: Home,
  Alimentação: Utensils,
  Outros: MoreHorizontal,
  // Add other main categories here
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
                <div className="grid grid-cols-2 gap-3">
                  {subcategories.map((subcategory) => (
                    <div key={subcategory} className="flex items-center gap-3 rounded-lg p-3 bg-secondary/50">
                        {/* Placeholder for subcategory icons */}
                        <div className="w-8 h-8 bg-background rounded-md flex items-center justify-center">
                            <span className="text-xl">💰</span>
                        </div>
                        <span className="text-sm font-medium">{subcategory}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </main>
    </div>
  );
}
