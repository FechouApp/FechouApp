import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LoadingSpinner from "@/components/common/loading-spinner";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { 
  FileText, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Send,
  MoreHorizontal,
  Calendar,
  Filter,
  Trash2,
  ArrowLeft,
  DollarSign,
  MessageCircle
} from "lucide-react";
import type { QuoteWithClient } from "@/types";

export default function Quotes() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const { data: quotes, isLoading } = useQuery<QuoteWithClient[]>({
    queryKey: ["/api/quotes"],
    retry: false,
  });

  // Scroll to newest quote on mobile after creation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const newQuoteId = urlParams.get('newQuote');
    
    if (newQuoteId && quotes && window.innerWidth <= 768) {
      setTimeout(() => {
        const quoteElement = document.querySelector(`[data-quote-id="${newQuoteId}"]`);
        if (quoteElement) {
          quoteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [quotes]);

  const deleteQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      await apiRequest("DELETE", `/api/quotes/${quoteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: "Sucesso",
        description: "Orçamento removido com sucesso!",
      });
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
        description: "Erro ao remover orçamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para confirmar pagamento e gerar recibo
  const confirmPaymentMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      // Primeiro aprovar o orçamento se não estiver aprovado
      const quote = quotes?.find(q => q.id === quoteId);
      if (quote?.status === 'pending') {
        await apiRequest("PATCH", `/api/quotes/${quoteId}/approve`);
      }
      // Depois confirmar pagamento
      return await apiRequest("PATCH", `/api/quotes/${quoteId}/confirm-payment`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sucesso",
        description: "Pagamento confirmado e recibo gerado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao confirmar pagamento",
        variant: "destructive",
      });
    }
  });

  const handleDeleteQuote = (quoteId: string) => {
    if (confirm('Tem certeza que deseja remover este orçamento?')) {
      deleteQuoteMutation.mutate(quoteId);
    }
  };

  const handleNewQuote = () => {
    setLocation("/new-quote");
  };

  const handleViewQuote = (quoteId: string) => {
    // Navegar para a página profissional com botões WhatsApp
    setLocation(`/quotes/view/${quoteId}`);
  };

  const handleEditQuote = (quoteId: string) => {
    console.log('Tentando editar:', `/quotes/${quoteId}/edit`);
    setLocation(`/quotes/${quoteId}/edit`);
  };

  const handleSendQuote = (quoteId: string) => {
    // Encontrar o orçamento específico
    const quote = quotes?.find(q => q.id === quoteId);
    if (!quote) return;

    toast({
      title: "Opções de Envio",
      description: `Para enviar orçamentos precisamos configurar:
      • Email SMTP para envio automático
      • API do WhatsApp Business para mensagens
      • Servidor para gerar PDFs profissionais

      Você gostaria de configurar essas integrações?`,
      duration: 8000,
    });
  };

  const handleConfirmPayment = (quoteId: string) => {
    if (confirm('Confirmar que este orçamento foi pago? Isso irá gerar um recibo automaticamente.')) {
      confirmPaymentMutation.mutate(quoteId);
    }
  };

  const handleViewReceipt = (quoteId: string) => {
    setLocation(`/quotes/${quoteId}/receipt`);
  };

  const handleShareReceiptWhatsApp = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/receipt/whatsapp`);
      const data = await response.json();
      
      if (response.ok) {
        window.open(data.whatsappLink, '_blank');
        toast({
          title: "WhatsApp aberto",
          description: "Link do recibo compartilhado no WhatsApp!",
        });
      } else {
        toast({
          title: "Erro",
          description: data.message || "Erro ao gerar link do WhatsApp",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao compartilhar recibo via WhatsApp",
        variant: "destructive",
      });
    }
  };

  if (authLoading || isLoading) {
    return <LoadingSpinner />;
  }

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'Rascunho';
      case 'pending':
        return 'Pendente';
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Recusado';
      case 'paid':
        return 'Pago';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'paid':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getValidityStatus = (validUntil: Date) => {
    const today = new Date();
    const validity = new Date(validUntil);
    const diffTime = validity.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: "Expirado", color: "text-red-600" };
    } else if (diffDays <= 2) {
      return { text: `Expira em ${diffDays} dias`, color: "text-red-600" };
    } else if (diffDays <= 7) {
      return { text: `Expira em ${diffDays} dias`, color: "text-yellow-600" };
    } else {
      return { text: `${diffDays} dias restantes`, color: "text-green-600" };
    }
  };

  const filteredQuotes = quotes?.filter(quote => {
    const matchesSearch = searchTerm === '' || 
      quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quote.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quote.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;

    return matchesSearch && matchesStatus;
  })?.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  }) || [];

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
          <p className="text-gray-600">Gerencie todos os seus orçamentos</p>
        </div>
      </div>

      {/* Novo Orçamento Button */}
      <div className="flex justify-end px-4 md:px-0">
        <Button 
          onClick={handleNewQuote}
          className="bg-blue-600 text-white hover:bg-blue-700 w-full md:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Orçamento
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mx-4 md:mx-0">
        <Card className="bg-white shadow-lg">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar orçamentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <select 
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Todos os status</option>
                  <option value="draft">Rascunho</option>
                  <option value="pending">Pendente</option>
                  <option value="approved">Aprovado</option>
                  <option value="rejected">Recusado</option>
                </select>
                <select className="flex-1 md:flex-none px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary text-sm">
                  <option>Último mês</option>
                  <option>Últimos 3 meses</option>
                  <option>Último ano</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotes Table */}
      <div className="mx-4 md:mx-0">
        <Card className="bg-white shadow-lg">
          <CardContent className="p-0">
            {filteredQuotes.length === 0 ? (
              <div className="text-center py-12 px-4">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  {searchTerm || statusFilter !== 'all' 
                    ? "Nenhum orçamento encontrado" 
                    : "Nenhum orçamento criado"
                  }
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm || statusFilter !== 'all'
                    ? "Tente ajustar os filtros de busca" 
                    : "Crie seu primeiro orçamento para começar"
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={handleNewQuote} className="brand-gradient text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Orçamento
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="hidden md:table-header-group">
                    <TableRow>
                      <TableHead>Orçamento</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                {filteredQuotes.map((quote) => {
                  const validityStatus = getValidityStatus(quote.validUntil);

                  return (
                    <TableRow key={quote.id} data-quote-id={quote.id} className="hover:bg-gray-50 md:border-b-2 md:border-gray-100 border-b-0">
                      {/* Desktop view */}
                      <TableCell className="hidden md:table-cell">
                        <div>
                          <p className="font-medium text-gray-800">{quote.quoteNumber}</p>
                          <p className="text-sm text-gray-600">{quote.title}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div>
                          <p className="text-gray-800">{quote.client?.name || 'Cliente não informado'}</p>
                          {quote.client?.email && (
                            <p className="text-sm text-gray-600">{quote.client?.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="font-semibold text-gray-800">
                          {formatCurrency(quote.total)}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span
                          className={`inline-block px-3 py-1 text-sm rounded-full font-medium ${getStatusColor(
                            quote.status
                          )}`}
                        >
                          {getStatusText(quote.status)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div>
                          <p className="text-gray-800">
                            {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {quote.createdAt ? new Date(quote.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div>
                          <p className="text-gray-800">
                            {new Date(quote.validUntil).toLocaleDateString('pt-BR')}
                          </p>
                          <p className={`text-sm ${validityStatus.color}`}>
                            {validityStatus.text}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            title="Ver orçamento"
                            onClick={() => handleViewQuote(quote.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            title="Editar"
                            onClick={() => handleEditQuote(quote.id)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {quote.status === 'paid' ? (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              title="Ver Recibo"
                              onClick={() => handleViewReceipt(quote.id)}
                            >
                              <FileText className="w-4 h-4 text-blue-600" />
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              title="Confirmar Pagamento"
                              onClick={() => handleConfirmPayment(quote.id)}
                              disabled={confirmPaymentMutation.isPending}
                            >
                              <DollarSign className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            title="Excluir"
                            onClick={() => handleDeleteQuote(quote.id)}
                            disabled={deleteQuoteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>

                      {/* Mobile view - single cell with card layout */}
                      <TableCell className="md:hidden" colSpan={6}>
                        <div className="bg-white border-2 border-blue-100 rounded-lg p-4 space-y-3 mx-2 my-3 shadow-sm hover:border-blue-200 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-800">{quote.quoteNumber}</p>
                              <p className="text-sm text-gray-600">{quote.title}</p>
                            </div>
                            <span
                              className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(
                                quote.status
                              )}`}
                            >
                              {getStatusText(quote.status)}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">Cliente</p>
                              <p className="font-medium text-gray-800">{quote.client?.name || 'Cliente não informado'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Valor</p>
                              <p className="font-semibold text-gray-800">
                                {formatCurrency(quote.total)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-center flex-1">
                              <p className="text-sm text-gray-600">Criado em</p>
                              <p className="text-gray-800 text-sm">
                                {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                              </p>
                            </div>
                            <div className="text-center flex-1">
                              <p className="text-sm text-gray-600">Válido até</p>
                              <p className="text-gray-800 text-sm">
                                {new Date(quote.validUntil).toLocaleDateString('pt-BR')}
                              </p>
                              <p className={`text-xs ${validityStatus.color}`}>
                                {validityStatus.text}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-1 pt-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleViewQuote(quote.id)}
                              className="flex flex-col items-center justify-center px-1 py-2 text-xs h-12"
                            >
                              <Eye className="w-3 h-3 mb-1" />
                              Ver
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleEditQuote(quote.id)}
                              className="flex flex-col items-center justify-center px-1 py-2 text-xs h-12"
                            >
                              <Edit className="w-3 h-3 mb-1" />
                              Editar
                            </Button>
                            {quote.status === 'paid' ? (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleViewReceipt(quote.id)}
                                className="flex flex-col items-center justify-center px-1 py-2 text-xs h-12"
                                title="Ver Recibo"
                              >
                                <FileText className="w-3 h-3 text-blue-600 mb-1" />
                                Recibo
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleConfirmPayment(quote.id)}
                                disabled={confirmPaymentMutation.isPending}
                                className="flex flex-col items-center justify-center px-1 py-2 text-xs h-12"
                                title="Confirmar Pagamento"
                              >
                                <DollarSign className="w-3 h-3 text-green-600 mb-1" />
                                Pagar
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleDeleteQuote(quote.id)}
                              disabled={deleteQuoteMutation.isPending}
                              className="flex flex-col items-center justify-center px-1 py-2 text-xs h-12"
                              title="Excluir"
                            >
                              <Trash2 className="w-3 h-3 text-red-500 mb-1" />
                              Apagar
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {filteredQuotes.length > 10 && (
        <div className="flex items-center justify-between mx-4 md:mx-0">
          <p className="text-sm text-gray-600">
            Mostrando 1-{Math.min(10, filteredQuotes.length)} de {filteredQuotes.length} orçamentos
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              Anterior
            </Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" size="sm">
              1
            </Button>
            <Button variant="outline" size="sm" disabled>
              Próximo
            </Button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}