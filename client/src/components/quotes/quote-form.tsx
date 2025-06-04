import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import QuoteItem from "./quote-item";
import SavedItemsSection from "./saved-items-section";
import { Plus, Calendar, Save, Eye, Send, Trash2, Crown, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Client, CreateQuoteRequest, SavedItem } from "@/types";

interface QuoteFormProps {
  clients: Client[];
  onSubmit: (data: CreateQuoteRequest) => void;
  isSubmitting: boolean;
  step: number;
  onStepChange: (step: number) => void;
  existingQuote?: any; // Dados do orçamento para edição
}

interface QuoteItemData {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

export default function QuoteForm({ 
  clients, 
  onSubmit, 
  isSubmitting, 
  step, 
  onStepChange,
  existingQuote
}: QuoteFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isUserPremium = (user as any)?.plan === "PREMIUM";
  const maxItemsForFreeUser = 3;
  const [selectedClientId, setSelectedClientId] = useState(existingQuote?.clientId || "");
  const [title, setTitle] = useState(existingQuote?.title || "");
  const [description, setDescription] = useState(existingQuote?.description || "");
  const [observations, setObservations] = useState(existingQuote?.observations || "");
  const [paymentTerms, setPaymentTerms] = useState(existingQuote?.paymentTerms || "");
  const [executionDeadline, setExecutionDeadline] = useState(existingQuote?.executionDeadline || "");
  const [validityDays, setValidityDays] = useState(30);
  const [sendByWhatsapp, setSendByWhatsapp] = useState(existingQuote?.sendByWhatsapp ?? true);
  const [sendByEmail, setSendByEmail] = useState(existingQuote?.sendByEmail ?? false);
  const [items, setItems] = useState<QuoteItemData[]>(
    existingQuote?.items?.length > 0 
      ? existingQuote.items.map((item: any, index: number) => ({
          id: String(index + 1),
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        }))
      : [{ id: "1", description: "", quantity: 1, unitPrice: "0", total: "0" }]
  );
  const [discount, setDiscount] = useState(existingQuote?.discount || "0");

  const addItem = () => {
    // Verificar limitação do plano gratuito
    if (!isUserPremium && items.length >= maxItemsForFreeUser) {
      toast({
        title: "Limite atingido",
        description: `Plano gratuito permite apenas ${maxItemsForFreeUser} itens por orçamento. Faça upgrade para Premium.`,
        variant: "destructive",
      });
      return;
    }

    const newItem: QuoteItemData = {
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      unitPrice: "0",
      total: "0"
    };
    setItems([...items, newItem]);
  };

    // Função removida - agora integrada diretamente no SavedItemsSection

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: string, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };

        // Recalculate total when quantity or unitPrice changes
        if (field === 'quantity' || field === 'unitPrice') {
          const quantity = field === 'quantity' ? Number(value) : item.quantity;
          const unitPrice = field === 'unitPrice' ? parseFloat(value.toString()) || 0 : parseFloat(item.unitPrice) || 0;
          updatedItem.total = (quantity * unitPrice).toFixed(2);
        }

        return updatedItem;
      }
      return item;
    }));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.total || "0"), 0);
    const discountAmount = parseFloat(discount) || 0;
    const total = Math.max(0, subtotal - discountAmount);

    return {
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const totals = calculateTotals();

  const handleSubmit = (action: 'preview' | 'save') => {
    if (!selectedClientId || !title || items.some(item => !item.description)) {
      return;
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);

    const quoteData: CreateQuoteRequest = {
      quote: {
        clientId: selectedClientId,
        title,
        description,
        observations,
        paymentTerms,
        executionDeadline,
        subtotal: totals.subtotal,
        discount: totals.discountAmount,
        total: totals.total,
        validUntil,
        sendByWhatsapp,
        sendByEmail,
      },
      items: items.map((item, index) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        order: index,
      }))
    };

    onSubmit(quoteData);
  };

  const selectedClient = clients.find(client => client.id === selectedClientId);
  const canProceed = selectedClientId && title && items.every(item => item.description);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Client and Quote Info */}
      <Card className="bg-white shadow-lg overflow-hidden mx-0">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">
            Informações do Orçamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Cliente *</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue placeholder="Selecione um cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClient && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 break-words">
                      {selectedClient.email && `${selectedClient.email} • `}
                      {selectedClient.phone}
                    </p>
                    {selectedClient.city && selectedClient.state && (
                      <p className="text-sm text-gray-600 break-words">
                        {selectedClient.city}, {selectedClient.state}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Título do Orçamento *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Reforma Residencial"
                  className="mt-2 w-full"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Validade (dias)</Label>
                <Input
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(Number(e.target.value))}
                  min="1"
                  max="365"
                  className="mt-2 w-full"
                />
              </div>
            </div>
          </div>


        </CardContent>
      </Card>

      {/* Items */}
      <Card className="bg-white shadow-lg overflow-hidden mx-0">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">
                <span className="block">Serviços e Produtos</span>
                {!isUserPremium && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-2 inline-block">
                    Máx. {maxItemsForFreeUser} itens (Gratuito)
                  </span>
                )}
              </CardTitle>
              <Button
                onClick={addItem}
                className="brand-gradient text-white w-full sm:w-auto text-sm"
                disabled={!isUserPremium && items.length >= maxItemsForFreeUser}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span className="hidden xs:inline">Adicionar Item</span>
                <span className="xs:hidden">Adicionar</span>
                {!isUserPremium && items.length >= maxItemsForFreeUser && (
                  <Crown className="w-4 h-4 ml-1" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-6 pt-0">
          {/* Seção de Itens Salvos */}
          <SavedItemsSection 
            onAddItem={(savedItem) => {
              const newItem: QuoteItemData = {
                id: Math.random().toString(36).substr(2, 9),
                description: savedItem.description,
                quantity: savedItem.quantity,
                unitPrice: savedItem.unitPrice,
                total: (parseFloat(savedItem.unitPrice.replace(',', '.')) * savedItem.quantity).toFixed(2).replace('.', ',')
              };
              setItems(prev => [...prev, newItem]);
            }}
          />

          {/* Lista de Itens do Orçamento */}
          {items.map((item, index) => (
            <QuoteItem
              key={item.id}
              item={item}
              onUpdate={(field, value) => updateItem(item.id, field, value)}
              onRemove={() => removeItem(item.id)}
              canRemove={items.length > 1}
              index={index + 1}
            />
          ))}
        </CardContent>
      </Card>



      {/* Description */}
      <Card className="bg-white shadow-lg mx-0">
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">
            Descrição
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição detalhada do projeto..."
            rows={3}
            className="w-full text-sm"
          />
        </CardContent>
      </Card>

      {/* Summary and Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Additional Info */}
        <Card className="bg-white shadow-lg overflow-hidden mx-0">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base font-semibold text-gray-800">
              Informações Adicionais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-6 pt-0">
            <div>
              <Label className="text-sm font-medium text-gray-700">Condições de Pagamento</Label>
              <Textarea
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Ex: 50% na assinatura do contrato, 50% na entrega..."
                rows={3}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Prazo de Execução</Label>
              <Textarea
                value={executionDeadline}
                onChange={(e) => setExecutionDeadline(e.target.value)}
                placeholder="Ex: 30 dias corridos após aprovação do projeto..."
                rows={3}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Observações Gerais</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Informações adicionais, termos e condições..."
                rows={3}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Opções de Envio
              </Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="whatsapp"
                    checked={sendByWhatsapp}
                    onCheckedChange={(checked) => {
                      if (!isUserPremium && checked) {
                        toast({
                          title: "Funcionalidade Premium",
                          description: "Notificações WhatsApp estão disponíveis apenas no plano Premium.",
                          variant: "destructive",
                        });
                        return;
                      }
                      setSendByWhatsapp(checked === true);
                    }}
                    disabled={!isUserPremium}
                  />
                  <Label htmlFor="whatsapp" className={`text-sm ${!isUserPremium ? 'text-gray-400' : 'text-gray-700'} flex items-center gap-2`}>
                    Enviar via WhatsApp
                    {!isUserPremium && <Crown className="w-4 h-4 text-amber-500" />}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email"
                    checked={sendByEmail}
                    onCheckedChange={(checked) => setSendByEmail(checked === true)}
                  />
                  <Label htmlFor="email" className="text-sm text-gray-700">
                    Enviar via E-mail
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card className="bg-white shadow-lg overflow-hidden mx-0">
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-base font-semibold text-gray-800">
              Resumo Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
            <div className="space-y-4">
              <div className="space-y-3 pb-4 border-b border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">R$ {totals.subtotal}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Desconto:</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0.00"
                      className="w-24 h-8 text-sm"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span className="text-brand-primary">R$ {totals.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card className="bg-white shadow-lg overflow-hidden mx-0">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
            <Button 
              variant="secondary"
              onClick={() => handleSubmit('preview')}
              disabled={!canProceed || isSubmitting}
              className="w-full sm:w-auto order-2 sm:order-1 text-sm"
              size="sm"
            >
              <Eye className="w-4 h-4 mr-1" />
              Visualizar
            </Button>
            <Button 
              onClick={() => handleSubmit('save')}
              disabled={!canProceed || isSubmitting}
              className="brand-gradient text-white w-full sm:w-auto order-1 sm:order-2 text-sm"
              size="sm"
            >
              <Save className="w-4 h-4 mr-1" />
              {isSubmitting ? (existingQuote ? "Salvando..." : "Criando...") : (existingQuote ? "Salvar" : "Criar e Enviar")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}