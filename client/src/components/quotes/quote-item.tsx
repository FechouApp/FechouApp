import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

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
  index 
}: QuoteItemProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-gray-50 rounded-lg">
      {/* Item Number */}
      <div className="md:col-span-1 flex items-center justify-center">
        <span className="text-lg font-semibold text-gray-700 bg-white rounded-full w-8 h-8 flex items-center justify-center">#{index}</span>
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
    </div>
  );
}
