
import { useState, useEffect, useRef, useMemo } from "react";
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
import PhotoUploadSection from "./photo-upload-section";
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
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
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
      : [{ id: "1", description: "", quantity: 1, unitPrice: "", total: "0" }]
  );
  const [discount, setDiscount] = useState(existingQuote?.discount || "");
  const [attachments, setAttachments] = useState<File[]>([]);
  const clientDropdownRef = useRef<HTMLDivElement>(null);

  // Filter clients based on search input with more comprehensive search
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return [];
    return clients.filter(client =>
      client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      client.email?.toLowerCase().includes(clientSearch.toLowerCase()) ||
      client.phone.includes(clientSearch)
    ).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [clients, clientSearch]);

  // Get selected client object
  const currentSelectedClient = clients.find(client => client.id === selectedClientId);

  // Initialize client search with existing client name if editing
  useEffect(() => {
    if (existingQuote?.clientId && clients.length > 0) {
      const client = clients.find(c => c.id === existingQuote.clientId);
      if (client) {
        setClientSearch(client.name);
      }
    }
  }, [existingQuote?.clientId, clients]);

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setShowClientDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle client selection
  const handleClientSelect = (client: Client) => {
    setSelectedClientId(client.id);
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  // Handle client search input
  const handleClientSearchChange = (value: string) => {
    setClientSearch(value);
    setShowClientDropdown(true);
    
    // If search matches exactly one client, auto-select it
    const exactMatch = clients.find(client => 
      client.name.toLowerCase() === value.toLowerCase()
    );
    if (exactMatch) {
      setSelectedClientId(exactMatch.id);
    } else {
      setSelectedClientId("");
    }
  };

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
      unitPrice: "",
      total: "0"
    };
    // Adicionar novo item no topo da lista
    setItems([newItem, ...items]);
  };

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
          const unitPrice = field === 'unitPrice' ? (value === "" ? 0 : parseFloat(value.toString()) || 0) : (item.unitPrice === "" ? 0 : parseFloat(item.unitPrice) || 0);
          updatedItem.total = (quantity * unitPrice).toFixed(2);
        }

        return updatedItem;
      }
      return item;
    }));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.total || "0"), 0);
    const discountAmount = discount === "" ? 0 : parseFloat(discount) || 0;
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
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (items.some(item => !item.unitPrice.trim() || parseFloat(item.unitPrice) <= 0)) {
      toast({
        title: "Valor obrigatório", 
        description: "Preencha o valor unitário de todos os itens.",
        variant: "destructive",
      });
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

  const canProceed = selectedClientId && title && items.every(item => item.description);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Client and Quote Info */}
      <Card className="bg-white shadow-sm border-gray-200">
        <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">
            Informações do Orçamento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <div className="relative" ref={clientDropdownRef}>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Cliente *</Label>
              <Input
                value={clientSearch}
                onChange={(e) => handleClientSearchChange(e.target.value)}
                onFocus={() => setShowClientDropdown(true)}
                placeholder="Digite o nome do cliente..."
                className="w-full"
                autoComplete="off"
              />
              
              {/* Dropdown com clientes filtrados */}
              {showClientDropdown && clientSearch && filteredClients.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => handleClientSelect(client)}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <p className="font-medium text-gray-900">{client.name}</p>
                      <p className="text-sm text-gray-600">
                        {client.email && `${client.email} • `}
                        {client.phone}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Informações do cliente selecionado */}
              {currentSelectedClient && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    {currentSelectedClient.email && `${currentSelectedClient.email} • `}
                    {currentSelectedClient.phone}
                  </p>
                  {currentSelectedClient.city && currentSelectedClient.state && (
                    <p className="text-sm text-gray-600">
                      {currentSelectedClient.city}, {currentSelectedClient.state}
                    </p>
                  )}
                </div>
              )}
              
              {/* Mensagem quando não há clientes correspondentes */}
              {showClientDropdown && clientSearch && filteredClients.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
                  <p className="text-sm text-gray-500">Nenhum cliente encontrado</p>
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Título do Orçamento *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Reforma Residencial"
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Validade (dias)</Label>
              <Input
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                min="1"
                max="365"
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card className="bg-white shadow-sm border-gray-200">
        <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">
                Serviços e Produtos
              </CardTitle>
              {!isUserPremium && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-1 inline-block">
                  Máx. {maxItemsForFreeUser} itens (Gratuito)
                </span>
              )}
            </div>
            <Button
              onClick={addItem}
              className="brand-gradient text-white w-full sm:w-auto"
              disabled={!isUserPremium && items.length >= maxItemsForFreeUser}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Item
              {!isUserPremium && items.length >= maxItemsForFreeUser && (
                <Crown className="w-4 h-4 ml-1" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          {/* Seção de Itens Salvos */}
          <SavedItemsSection 
            onAddItem={(savedItem) => {
              const newItem: QuoteItemData = {
                id: Math.random().toString(36).substr(2, 9),
                description: savedItem.name,
                quantity: 1,
                unitPrice: savedItem.unitPrice,
                total: savedItem.unitPrice
              };
              setItems(prev => [newItem, ...prev]);
            }}
          />

          {/* Botão Adicionar Sempre Visível */}
          <div className="sticky top-4 z-10 bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
            <Button
              onClick={addItem}
              className="brand-gradient text-white w-full"
              disabled={!isUserPremium && items.length >= maxItemsForFreeUser}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Novo Item
              {!isUserPremium && (
                <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">
                  {items.length}/{maxItemsForFreeUser}
                </span>
              )}
            </Button>
          </div>

          {/* Lista de Itens do Orçamento */}
          <div className="space-y-6">
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum item adicionado ainda.</p>
                <p className="text-sm">Clique em "Adicionar Novo Item" para começar.</p>
              </div>
            ) : (
              items.map((item, index) => (
                <QuoteItem
                  key={item.id}
                  item={item}
                  onUpdate={(field, value) => updateItem(item.id, field, value)}
                  onRemove={() => removeItem(item.id)}
                  canRemove={items.length > 1}
                  index={index + 1}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card className="bg-white shadow-sm border-gray-200">
        <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
          <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">
            Descrição
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição detalhada do projeto..."
            rows={3}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Upload de Fotos - Exclusivo Premium */}
      <PhotoUploadSection
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        disabled={isSubmitting}
      />

      {/* Additional Info and Summary */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        {/* Additional Info */}
        <Card className="bg-white shadow-sm border-gray-200">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">
              Informações Adicionais
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 space-y-3 sm:space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Condições de Pagamento</Label>
              <Textarea
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Ex: 50% na assinatura do contrato, 50% na entrega..."
                rows={3}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Prazo de Execução</Label>
              <Textarea
                value={executionDeadline}
                onChange={(e) => setExecutionDeadline(e.target.value)}
                placeholder="Ex: 30 dias corridos após aprovação do projeto..."
                rows={3}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Observações Gerais</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Informações adicionais, termos e condições..."
                rows={3}
                className="w-full"
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
        <Card className="bg-white shadow-sm border-gray-200">
          <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
            <CardTitle className="text-base sm:text-lg font-semibold text-gray-800">
              Resumo Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
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
                      placeholder="0,00"
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
      <Card className="bg-white shadow-sm border-gray-200">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button 
              variant="secondary"
              onClick={() => handleSubmit('preview')}
              disabled={!canProceed || isSubmitting}
              className="w-full sm:w-auto order-2 sm:order-1"
              size="sm"
            >
              <Eye className="w-4 h-4 mr-1" />
              Visualizar
            </Button>
            <Button 
              onClick={() => handleSubmit('save')}
              disabled={!canProceed || isSubmitting}
              className="brand-gradient text-white w-full sm:w-auto order-1 sm:order-2"
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
