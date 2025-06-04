
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
import LoadingSpinner from "@/components/common/loading-spinner";
import QuoteItem from "@/components/quotes/quote-item";
import SavedItemsSection from "@/components/quotes/saved-items-section";
import QuickSetup from "@/components/quick-setup";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Eye, Save, Crown } from "lucide-react";
import type { Client, CreateQuoteRequest, QuoteWithDetails } from "@/types";

interface QuoteItemData {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

export default function NewQuote() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Extract quote ID from URL for editing
  const quoteId = location.includes('/edit') ? location.split('/')[2] : null;
  const isEditing = !!quoteId;
  
  // Premium user check
  const isUserPremium = (user as any)?.plan === "PREMIUM" || (user as any)?.plan === "PREMIUM_CORTESIA";
  const maxItemsForFreeUser = 3;
  
  // Form states
  const [selectedClientId, setSelectedClientId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [observations, setObservations] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [executionDeadline, setExecutionDeadline] = useState("");
  const [validityDays, setValidityDays] = useState(30);
  const [sendByWhatsapp, setSendByWhatsapp] = useState(true);
  const [sendByEmail, setSendByEmail] = useState(false);
  const [items, setItems] = useState<QuoteItemData[]>([
    { id: "1", description: "", quantity: 1, unitPrice: "0", total: "0" }
  ]);
  const [discount, setDiscount] = useState("0");

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    retry: false,
  });

  // Check plan limits
  const { data: planLimits } = useQuery({
    queryKey: ["/api/user/plan-limits"],
    retry: false,
  });

  // Load quote data for editing
  const { data: quoteData, isLoading: quoteLoading } = useQuery<QuoteWithDetails>({
    queryKey: [`/api/quotes/${quoteId}`],
    enabled: !!quoteId,
    retry: false,
  });

  // Load existing quote data
  useEffect(() => {
    if (quoteData && isEditing) {
      setSelectedClientId(quoteData.clientId || "");
      setTitle(quoteData.title || "");
      setDescription(quoteData.description || "");
      setObservations(quoteData.observations || "");
      setPaymentTerms(quoteData.paymentTerms || "");
      setExecutionDeadline(quoteData.executionDeadline || "");
      setSendByWhatsapp(quoteData.sendByWhatsapp ?? true);
      setSendByEmail(quoteData.sendByEmail ?? false);
      setDiscount(quoteData.discount || "0");
      
      if (quoteData.items?.length > 0) {
        setItems(quoteData.items.map((item: any, index: number) => ({
          id: String(index + 1),
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        })));
      }
    }
  }, [quoteData, isEditing]);

  const createQuoteMutation = useMutation({
    mutationFn: async (quoteData: CreateQuoteRequest) => {
      if (isEditing) {
        await apiRequest("PUT", `/api/quotes/${quoteId}`, quoteData);
      } else {
        if (planLimits && !planLimits.isPremium && !planLimits.canCreateQuote) {
          throw new Error(`Limite de ${planLimits.monthlyQuoteLimit} orçamentos por mês atingido. Faça upgrade para Premium.`);
        }
        await apiRequest("POST", "/api/quotes", quoteData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: [`/api/quotes/${quoteId}`] });
      }
      toast({
        title: "Sucesso",
        description: isEditing ? "Orçamento atualizado com sucesso!" : "Orçamento criado com sucesso!",
      });
      setLocation("/quotes");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: isEditing ? "Erro ao atualizar orçamento. Tente novamente." : "Erro ao criar orçamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Item management functions
  const addItem = () => {
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

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: string, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };

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

  const handleSubmit = () => {
    if (!selectedClientId || !title || items.some(item => !item.description)) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha cliente, título e descrição de todos os itens.",
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

    createQuoteMutation.mutate(quoteData);
  };

  if (authLoading || clientsLoading || (isEditing && quoteLoading)) {
    return <LoadingSpinner />;
  }

  const selectedClient = clients?.find(client => client.id === selectedClientId);
  const canProceed = selectedClientId && title && items.every(item => item.description);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/quotes")}
              className="text-white hover:bg-white/20 p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">
              {isEditing ? "Editar Orçamento" : "Novo Orçamento"}
            </h1>
          </div>
          <p className="text-sm text-white/80 ml-11">
            {isEditing ? "Edite os dados do seu orçamento" : "Crie um novo orçamento para seu cliente"}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-w-md mx-auto">
        {/* Plan limit warning */}
        {planLimits && !planLimits.isPremium && !planLimits.canCreateQuote && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-amber-600 font-bold text-xs">!</span>
                </div>
                <div>
                  <h3 className="font-medium text-amber-800 text-sm">Limite mensal atingido</h3>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    Você atingiu o limite de {planLimits.monthlyQuoteLimit} orçamentos por mês do plano gratuito.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show quick setup if no clients */}
        {(!clients || clients.length === 0) && (
          <div className="mb-4">
            <QuickSetup />
          </div>
        )}

        {/* Client Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cliente e Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Cliente *</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClient && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                  {selectedClient.email && `${selectedClient.email} • `}
                  {selectedClient.phone}
                </div>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Título do Orçamento *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Reforma Residencial"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Validade (dias)</Label>
              <Input
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                min="1"
                max="365"
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Itens do Orçamento</CardTitle>
                {!isUserPremium && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded mt-1 inline-block">
                    Máx. {maxItemsForFreeUser} itens (Gratuito)
                  </span>
                )}
              </div>
              <Button
                size="sm"
                onClick={addItem}
                disabled={!isUserPremium && items.length >= maxItemsForFreeUser}
                className="brand-gradient text-white"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <SavedItemsSection 
              onAddItem={(savedItem) => {
                if (!isUserPremium && items.length >= maxItemsForFreeUser) {
                  toast({
                    title: "Limite atingido",
                    description: `Plano gratuito permite apenas ${maxItemsForFreeUser} itens.`,
                    variant: "destructive",
                  });
                  return;
                }
                const newItem: QuoteItemData = {
                  id: Math.random().toString(36).substr(2, 9),
                  description: savedItem.description,
                  quantity: savedItem.quantity,
                  unitPrice: savedItem.unitPrice,
                  total: (parseFloat(savedItem.unitPrice.replace(',', '.')) * savedItem.quantity).toFixed(2)
                };
                setItems(prev => [...prev, newItem]);
              }}
            />

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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Descrição do Projeto</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição detalhada do projeto..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informações Adicionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Condições de Pagamento</Label>
              <Textarea
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Ex: 50% na assinatura, 50% na entrega..."
                rows={2}
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Prazo de Execução</Label>
              <Textarea
                value={executionDeadline}
                onChange={(e) => setExecutionDeadline(e.target.value)}
                placeholder="Ex: 30 dias corridos..."
                rows={2}
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Observações</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Informações adicionais..."
                rows={2}
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Opções de Envio</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="whatsapp"
                    checked={sendByWhatsapp}
                    onCheckedChange={(checked) => {
                      if (!isUserPremium && checked) {
                        toast({
                          title: "Funcionalidade Premium",
                          description: "WhatsApp disponível apenas no Premium.",
                          variant: "destructive",
                        });
                        return;
                      }
                      setSendByWhatsapp(checked === true);
                    }}
                    disabled={!isUserPremium}
                  />
                  <Label htmlFor="whatsapp" className={`text-sm flex items-center gap-1 ${!isUserPremium ? 'text-gray-400' : ''}`}>
                    WhatsApp
                    {!isUserPremium && <Crown className="w-3 h-3 text-amber-500" />}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="email"
                    checked={sendByEmail}
                    onCheckedChange={(checked) => setSendByEmail(checked === true)}
                  />
                  <Label htmlFor="email" className="text-sm">E-mail</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>R$ {totals.subtotal}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Desconto:</span>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0.00"
                  className="w-20 h-8 text-xs"
                  min="0"
                  step="0.01"
                />
              </div>
              <hr />
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span className="text-blue-600">R$ {totals.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="pb-6">
          <Button 
            onClick={handleSubmit}
            disabled={!canProceed || createQuoteMutation.isPending}
            className="w-full brand-gradient text-white h-12"
          >
            <Save className="w-4 h-4 mr-2" />
            {createQuoteMutation.isPending 
              ? (isEditing ? "Salvando..." : "Criando...") 
              : (isEditing ? "Salvar Alterações" : "Criar Orçamento")
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
