
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
import QuickSetup from "@/components/quick-setup";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Save, Crown, Trash2, AlertCircle, Star, ChevronDown } from "lucide-react";
import type { Client, CreateQuoteRequest, QuoteWithDetails } from "@/types";

import PhotoUploadSection from "@/components/quotes/photo-upload-section";

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
  
  // Extract client ID from URL parameters - fix for client pre-selection
  const [preSelectedClientId, setPreSelectedClientId] = useState<string | null>(null);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('clientId');
    if (clientId) {
      setPreSelectedClientId(clientId);
    }
  }, [location]);
  
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
    { id: "1", description: "", quantity: 1, unitPrice: "", total: "0" }
  ]);
  const [discount, setDiscount] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);

  // Auto-scroll helper for mobile
  const scrollToNextField = (currentFieldId: string) => {
    if (window.innerWidth > 768) return; // Only on mobile
    
    const fieldOrder = [
      'client-select',
      'title-input',
      'description-input',
      'item-0-description',
      'item-0-quantity',
      'item-0-price',
      'observations-input',
      'payment-terms-input',
      'execution-deadline-input'
    ];
    
    const currentIndex = fieldOrder.indexOf(currentFieldId);
    if (currentIndex >= 0 && currentIndex < fieldOrder.length - 1) {
      const nextFieldId = fieldOrder[currentIndex + 1];
      setTimeout(() => {
        const nextField = document.getElementById(nextFieldId);
        if (nextField) {
          nextField.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          nextField.focus();
        }
      }, 300);
    }
  };

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

  // Load saved items for favorites
  const { data: savedItems = [] } = useQuery<any[]>({
    queryKey: ["/api/saved-items"],
    retry: false,
  });

  // Mutation to save item as favorite
  const saveItemMutation = useMutation({
    mutationFn: (itemData: { name: string; unitPrice: string }) => 
      apiRequest("POST", "/api/saved-items", itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-items"] });
      toast({
        title: "Item salvo",
        description: "Item adicionado aos favoritos.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao salvar item.",
        variant: "destructive",
      });
    },
  });

  // Load quote data for editing
  const { data: quoteData, isLoading: quoteLoading } = useQuery<QuoteWithDetails>({
    queryKey: [`/api/quotes/${quoteId}`],
    enabled: !!quoteId,
    retry: false,
  });

  // Set pre-selected client
  useEffect(() => {
    if (preSelectedClientId && !isEditing) {
      console.log('Setting pre-selected client:', preSelectedClientId);
      setSelectedClientId(preSelectedClientId);
    }
  }, [preSelectedClientId, isEditing]);

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
      try {
        if (isEditing) {
          return await apiRequest("PUT", `/api/quotes/${quoteId}`, quoteData);
        } else {
          if (planLimits && !(planLimits as any).isPremium && !(planLimits as any).canCreateQuote) {
            throw new Error(`Limite de ${(planLimits as any).monthlyQuoteLimit} orçamentos por mês atingido. Faça upgrade para Premium.`);
          }
          return await apiRequest("POST", "/api/quotes", quoteData);
        }
      } catch (error) {
        console.error("API Request Error:", error);
        throw error;
      }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: [`/api/quotes/${quoteId}`] });
      }
      toast({
        title: "Sucesso",
        description: isEditing ? "Orçamento atualizado com sucesso!" : "Orçamento criado com sucesso!",
      });
      
      // Redirect with new quote ID for mobile scroll
      if (!isEditing && data?.id && window.innerWidth <= 768) {
        setLocation(`/quotes?newQuote=${data.id}`);
      } else {
        setLocation("/quotes");
      }
    },
    onError: (error: any) => {
      console.error("Quote creation/update error:", error);
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "Sessão expirada",
          description: "Fazendo login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }

      const errorMessage = error?.message || error?.response?.data?.message || "Erro desconhecido";
      
      toast({
        title: "Erro",
        description: isEditing 
          ? `Erro ao atualizar orçamento: ${errorMessage}` 
          : `Erro ao criar orçamento: ${errorMessage}`,
        variant: "destructive",
      });
    },
  });

  // Save item as favorite
  const saveItemAsFavorite = (item: QuoteItemData) => {
    if (!item.description.trim() || !item.unitPrice || parseFloat(item.unitPrice) <= 0) {
      toast({
        title: "Erro",
        description: "Preencha a descrição e o preço para salvar como favorito.",
        variant: "destructive",
      });
      return;
    }

    const maxItems = isUserPremium ? 15 : 3;
    if (savedItems.length >= maxItems) {
      toast({
        title: "Limite atingido",
        description: `${isUserPremium ? 'Premium' : 'Gratuito'} permite até ${maxItems} itens favoritos.`,
        variant: "destructive",
      });
      return;
    }

    saveItemMutation.mutate({
      name: item.description,
      unitPrice: item.unitPrice,
    });
  };

  // Add item from favorites
  const addItemFromFavorites = (savedItem: any) => {
    // Check if first item is empty, replace it, otherwise add new item
    const firstItem = items[0];
    const isFirstItemEmpty = !firstItem.description.trim() && (!firstItem.unitPrice || firstItem.unitPrice === "0");
    
    if (isFirstItemEmpty) {
      // Replace first empty item
      const updatedItem: QuoteItemData = {
        ...firstItem,
        description: savedItem.name,
        quantity: 1,
        unitPrice: savedItem.unitPrice,
        total: parseFloat(savedItem.unitPrice).toFixed(2)
      };
      setItems(prev => [updatedItem, ...prev.slice(1)]);
    } else {
      // Add new item if first item has content
      if (!isUserPremium && items.length >= maxItemsForFreeUser) {
        toast({
          title: "Limite atingido",
          description: `Plano gratuito permite apenas ${maxItemsForFreeUser} itens por orçamento.`,
          variant: "destructive",
        });
        return;
      }

      const newItem: QuoteItemData = {
        id: Math.random().toString(36).substr(2, 9),
        description: savedItem.name,
        quantity: 1,
        unitPrice: savedItem.unitPrice,
        total: parseFloat(savedItem.unitPrice).toFixed(2)
      };
      setItems(prev => [...prev, newItem]);
    }
    
    setShowFavorites(false);
    toast({
      title: "Item adicionado",
      description: "Item favorito adicionado ao orçamento.",
    });
  };

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
      unitPrice: "",
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
          const quantity = field === 'quantity' ? Math.max(1, Number(value) || 1) : item.quantity;
          const unitPrice = field === 'unitPrice' ? (value === "" ? 0 : Math.max(0, parseFloat(value.toString()) || 0)) : (item.unitPrice === "" ? 0 : parseFloat(item.unitPrice) || 0);
          updatedItem.total = (quantity * unitPrice).toFixed(2);
          
          // Update quantity field to ensure minimum value
          if (field === 'quantity') {
            updatedItem.quantity = quantity;
          }
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

  const handleSubmit = () => {
    // Validação mais detalhada
    if (!selectedClientId) {
      toast({
        title: "Cliente obrigatório",
        description: "Selecione um cliente para continuar.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Digite um título para o orçamento.",
        variant: "destructive",
      });
      return;
    }

    if (items.some(item => !item.description.trim())) {
      toast({
        title: "Descrição dos itens obrigatória",
        description: "Preencha a descrição de todos os itens.",
        variant: "destructive",
      });
      return;
    }

    if (items.some(item => item.quantity <= 0)) {
      toast({
        title: "Quantidade inválida",
        description: "A quantidade deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

    if (items.some(item => parseFloat(item.unitPrice) < 0)) {
      toast({
        title: "Valor inválido",
        description: "O valor unitário não pode ser negativo.",
        variant: "destructive",
      });
      return;
    }

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);

    // Process photos to base64
    const processPhotos = async () => {
      const photos = [];
      if (attachments.length > 0) {
        for (const file of attachments) {
          try {
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            photos.push({
              name: file.name,
              url: base64,
              size: file.size,
              type: file.type
            });
          } catch (error) {
            console.error('Error processing photo:', error);
          }
        }
      }
      return photos;
    };

    // Process photos and create quote
    processPhotos().then(photos => {
      const quoteData: CreateQuoteRequest = {
        quote: {
          clientId: selectedClientId,
          title: title.trim(),
          description: description.trim(),
          observations: observations.trim(),
          paymentTerms: paymentTerms.trim(),
          executionDeadline: executionDeadline.trim(),
          subtotal: totals.subtotal,
          discount: totals.discountAmount,
          total: totals.total,
          validUntil,
          sendByWhatsapp,
          sendByEmail,
        },
        items: items.map((item, index) => ({
          description: item.description.trim(),
          quantity: item.quantity,
          unitPrice: parseFloat(item.unitPrice).toFixed(2),
          total: parseFloat(item.total).toFixed(2),
          order: index,
        }))
      };

      createQuoteMutation.mutate(quoteData);
    });
  };

  if (authLoading || clientsLoading || (isEditing && quoteLoading)) {
    return <LoadingSpinner />;
  }

  const selectedClient = clients?.find(client => client.id === selectedClientId);
  const canProceed = selectedClientId && 
                    title.trim() && 
                    items.length > 0 &&
                    items.every(item => 
                      item.description.trim() && 
                      item.quantity > 0 && 
                      item.unitPrice && 
                      item.unitPrice !== "" &&
                      !isNaN(parseFloat(item.unitPrice)) &&
                      parseFloat(item.unitPrice) >= 0
                    ) &&
                    !createQuoteMutation.isPending;



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/quotes")}
              className="text-white hover:bg-white/20 p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">
                {isEditing ? "Editar Orçamento" : "Novo Orçamento"}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-3 space-y-4 pb-24">
        {/* Plan limit warning */}
        {planLimits && !(planLimits as any).isPremium && !(planLimits as any).canCreateQuote && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800 text-sm">Limite atingido</h3>
                <p className="text-xs text-amber-700 mt-1">
                  Você atingiu o limite de {(planLimits as any).monthlyQuoteLimit} orçamentos por mês.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Setup */}
        {(!clients || clients.length === 0) && <div><QuickSetup /></div>}

        {/* Client Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cliente *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedClientId} onValueChange={(value) => {
              setSelectedClientId(value);
              scrollToNextField('client-select');
            }}>
              <SelectTrigger id="client-select">
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
              <div className="p-2 bg-gray-50 rounded text-xs text-gray-600">
                {selectedClient.email && `${selectedClient.email} • `}
                {selectedClient.phone}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm">Título do Orçamento *</Label>
              <Input
                id="title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => scrollToNextField('title-input')}
                placeholder="Ex: Reforma Residencial"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Validade (dias)</Label>
              <Input
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value))}
                min="1"
                max="365"
                placeholder="30"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Descrição do Projeto</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição detalhada..."
                rows={3}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Items Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Itens do Orçamento</CardTitle>
              <Button
                size="sm"
                onClick={addItem}
                disabled={!isUserPremium && items.length >= maxItemsForFreeUser}
                className="bg-blue-600 text-white"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {!isUserPremium && (
              <p className="text-xs text-amber-600">
                Máximo {maxItemsForFreeUser} itens no plano gratuito
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Favorites Dropdown */}
            {savedItems.length > 0 && (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFavorites(!showFavorites)}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span>Itens Favoritos ({savedItems.length})</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFavorites ? 'rotate-180' : ''}`} />
                </Button>
                
                {showFavorites && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                    {savedItems.map((savedItem: any) => (
                      <button
                        key={savedItem.id}
                        onClick={() => addItemFromFavorites(savedItem)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{savedItem.name}</span>
                          <span className="text-xs text-gray-500">R$ {parseFloat(savedItem.unitPrice).toFixed(2).replace('.', ',')}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {items.map((item, index) => (
              <div key={item.id} className="p-3 bg-gray-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Item #{index + 1}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => saveItemAsFavorite(item)}
                      className="text-yellow-500 hover:text-yellow-600 h-6 w-6 p-0"
                      title="Salvar como favorito"
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                    {items.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 h-6 w-6 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-gray-600">Descrição *</Label>
                  <Textarea
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Ex: Desenvolvimento de sistema web personalizado"
                    rows={2}
                    className="mt-1 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-600">Quantidade</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                      min="1"
                      placeholder="1"
                      className="mt-1 text-sm h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Valor Unit.</Label>
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only valid decimal numbers or empty string
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          updateItem(item.id, 'unitPrice', value);
                        }
                      }}
                      placeholder="150.00"
                      min="0"
                      step="0.01"
                      className="mt-1 text-sm h-9 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                  </div>
                </div>

                <div className="text-right pt-2 border-t">
                  <span className="text-sm font-medium">
                    Total: R$ {parseFloat(item.total || "0").toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upload de Fotos - Seção Premium */}
        <PhotoUploadSection
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          disabled={createQuoteMutation.isPending}
        />

        {/* Additional Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informações Adicionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm">Condições de Pagamento</Label>
              <Textarea
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="Ex: 50% entrada, 50% entrega"
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Prazo de Execução</Label>
              <Textarea
                value={executionDeadline}
                onChange={(e) => setExecutionDeadline(e.target.value)}
                placeholder="Ex: 30 dias corridos"
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Observações</Label>
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Informações extras"
                rows={2}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Send Options */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Opções de Envio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
              <Label htmlFor="whatsapp" className="text-sm flex items-center gap-1">
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
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumo Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>R$ {totals.subtotal.replace('.', ',')}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Desconto (R$):</span>
              <Input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0,00"
                className="w-20 h-8 text-xs"
                min="0"
                step="0.01"
              />
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total:</span>
                <span className="text-blue-600">R$ {totals.total.replace('.', ',')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 z-50">
        <Button 
          onClick={handleSubmit}
          disabled={!canProceed || createQuoteMutation.isPending}
          className="w-full bg-blue-600 text-white h-12"
        >
          <Save className="w-4 h-4 mr-2" />
          {createQuoteMutation.isPending 
            ? (isEditing ? "Salvando..." : "Criando...") 
            : (isEditing ? "Salvar Alterações" : "Criar Orçamento")
          }
        </Button>
      </div>
    </div>
  );
}
