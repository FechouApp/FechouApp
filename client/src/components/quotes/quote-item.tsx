import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Star } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface QuoteItemProps {
  item: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: string;
    total: string;
  };
  onUpdate: (field: string, value: string | number) => void;
  onRemove: () => void;
  canRemove: boolean;
  index: number;
}

export default function QuoteItem({
  item,
  onUpdate,
  onRemove,
  canRemove,
  index,
}: QuoteItemProps) {
  const { toast } = useToast();

  const saveItemMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/saved-items", {
        name: item.description,
        unitPrice: item.unitPrice,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-items"] });
      toast({
        title: "Item salvo!",
        description: "Item adicionado aos seus favoritos.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Erro ao salvar item nos favoritos.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: string) => {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  const handlePriceChange = (value: string) => {
    // Remove currency formatting and keep only numbers and decimal point
    const cleanValue = value.replace(/[^\d.,]/g, '').replace(',', '.');
    onUpdate('unitPrice', cleanValue);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg shadow-sm hover:border-blue-300 transition-colors">
      {/* Item Number */}
      <div className="md:col-span-1 flex items-center justify-center">
        <span className="text-lg font-semibold text-white bg-blue-500 rounded-full w-8 h-8 flex items-center justify-center">#{index}</span>
      </div>

      {/* Description */}
      <div className="md:col-span-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição *
        </label>
        <Input
          value={item.description}
          onChange={(e) => onUpdate('description', e.target.value)}
          placeholder="Descrição do serviço/produto"
          className="text-sm"
        />
      </div>

      {/* Quantity */}
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Quantidade
        </label>
        <Input
          type="number"
          value={item.quantity}
          onChange={(e) => onUpdate('quantity', parseInt(e.target.value) || 1)}
          min="1"
          className="text-sm"
        />
      </div>

      {/* Unit Price */}
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Valor Unitário
        </label>
        <Input
          value={item.unitPrice}
          onChange={(e) => handlePriceChange(e.target.value)}
          placeholder="0,00"
          className="text-sm"
        />
      </div>

      {/* Total */}
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Total
        </label>
        <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-gray-800">
          {formatCurrency(item.total)}
        </div>
      </div>

      {/* Remove Button */}
      {canRemove && (
        <div className="md:col-span-12 flex justify-end mt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Remover
          </Button>
        </div>
      )}
       {/* Save Item */}
       <div className="md:col-span-12 flex justify-end mt-2">
          {item.description && item.unitPrice && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => saveItemMutation.mutate()}
              disabled={saveItemMutation.isPending}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              title="Salvar como favorito"
            >
              <Star className="w-4 h-4 mr-1" />
              Salvar Item
            </Button>
          )}
        </div>
    </div>
  );
}