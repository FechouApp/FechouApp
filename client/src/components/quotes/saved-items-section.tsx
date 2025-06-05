import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Plus, Crown, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { SavedItem } from "@/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SavedItemsSectionProps {
  onAddItem: (item: SavedItem) => void;
}

export default function SavedItemsSection({ onAddItem }: SavedItemsSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const isPremium = (user as any)?.plan === "PREMIUM" || (user as any)?.plan === "PREMIUM_CORTESIA";

  const { data: savedItems = [], isLoading } = useQuery<SavedItem[]>({
    queryKey: ["/api/saved-items"],
    retry: false,
  });

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  if (isLoading) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-500">Carregando itens salvos...</p>
      </div>
    );
  }

  if (savedItems.length === 0) {
    return (
      <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 text-blue-700">
          <Star className="w-4 h-4" />
          <span className="text-sm font-medium">Nenhum item favorito salvo</span>
        </div>
        <p className="text-xs text-blue-600 mt-1">
          Vá para "Itens Salvos" no menu para criar seus itens favoritos
        </p>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
        <CollapsibleTrigger asChild>
          <div className="p-3 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Itens Favoritos
                </span>
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                  {savedItems.length}
                </Badge>
              </div>
              {isOpen ? (
                <ChevronUp className="w-4 h-4 text-blue-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Clique para ver seus itens salvos
            </p>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {savedItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded border border-blue-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    onAddItem(item);
                    toast({
                      title: "Item adicionado",
                      description: `${item.name} foi adicionado ao orçamento.`,
                    });
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white ml-2 h-8 px-3"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Usar
                </Button>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}