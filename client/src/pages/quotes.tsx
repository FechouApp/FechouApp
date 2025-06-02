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
import Header from "@/components/layout/header";
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
  Trash2
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

  const handleDeleteQuote = (quoteId: string) => {
    if (confirm('Tem certeza que deseja remover este orçamento?')) {
      deleteQuoteMutation.mutate(quoteId);
    }
  };

  const handleNewQuote = () => {
    setLocation("/new-quote");
  };

  const handleViewQuote = (quoteId: string) => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "A visualização detalhada de orçamentos será implementada em breve.",
    });
  };

  const handleEditQuote = (quoteId: string) => {
    console.log('Tentando editar:', `/quotes/${quoteId}/edit`);
    setLocation(`/quotes/${quoteId}/edit`);
  };

  const handleSendQuote = (quoteId: string) => {
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "O envio de orçamentos será implementado em breve.",
    });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'SENT':
        return 'bg-blue-100 text-blue-800';
      case 'VIEWED':
        return 'bg-yellow-100 text-yellow-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'Aprovado';
      case 'PAID':
        return 'Pago';
      case 'SENT':
        return 'Enviado';
      case 'VIEWED':
        return 'Visualizado';
      case 'DRAFT':
        return 'Rascunho';
      case 'EXPIRED':
        return 'Expirado';
      default:
        return status;
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
    const matchesSearch = 
      quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.client.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="space-y-6">
      <Header 
        title="Orçamentos" 
        subtitle="Gerencie todos os seus orçamentos"
        showBackButton={true}
        backTo="/"
      />

      {/* Novo Orçamento Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleNewQuote}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Orçamento
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="bg-white shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar orçamentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select 
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos os status</option>
                <option value="DRAFT">Rascunho</option>
                <option value="SENT">Enviado</option>
                <option value="VIEWED">Visualizado</option>
                <option value="APPROVED">Aprovado</option>
                <option value="PAID">Pago</option>
                <option value="EXPIRED">Expirado</option>
              </select>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary">
                <option>Último mês</option>
                <option>Últimos 3 meses</option>
                <option>Último ano</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card className="bg-white shadow-lg">
        <CardContent className="p-0">
          {filteredQuotes.length === 0 ? (
            <div className="text-center py-12">
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
                <TableHeader>
                  <TableRow>
                    <TableHead>Orçamento</TableHead>
                    <TableHead className="hidden sm:table-cell">Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="hidden md:table-cell">Validade</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {filteredQuotes.map((quote) => {
                  const validityStatus = getValidityStatus(quote.validUntil);
                  
                  return (
                    <TableRow key={quote.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-800">{quote.quoteNumber}</p>
                          <p className="text-sm text-gray-600">{quote.title}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-gray-800">{quote.client.name}</p>
                          {quote.client.email && (
                            <p className="text-sm text-gray-600">{quote.client.email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-gray-800">
                          {formatCurrency(quote.total)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-block px-3 py-1 text-sm rounded-full font-medium ${getStatusColor(
                            quote.status
                          )}`}
                        >
                          {getStatusText(quote.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-gray-800">
                            {new Date(quote.validUntil).toLocaleDateString('pt-BR')}
                          </p>
                          <p className={`text-sm ${validityStatus.color}`}>
                            {validityStatus.text}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
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
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            title="Enviar"
                            onClick={() => handleSendQuote(quote.id)}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
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
                    </TableRow>
                  );
                })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {filteredQuotes.map((quote) => {
                  const validityStatus = getValidityStatus(quote.validUntil);
                  
                  return (
                    <Card key={quote.id} className="p-4">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-800">{quote.quoteNumber}</p>
                            <p className="text-sm text-gray-600">{quote.title}</p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}
                          >
                            {getStatusText(quote.status)}
                          </span>
                        </div>

                        {/* Cliente */}
                        <div>
                          <p className="text-sm text-gray-500">Cliente</p>
                          <p className="text-gray-800">{quote.client.name}</p>
                        </div>

                        {/* Valor e Validade */}
                        <div className="flex justify-between">
                          <div>
                            <p className="text-sm text-gray-500">Valor</p>
                            <p className="font-semibold text-gray-800">
                              {formatCurrency(quote.total)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Validade</p>
                            <p className={`text-sm ${validityStatus.color}`}>
                              {validityStatus.text}
                            </p>
                          </div>
                        </div>

                        {/* Ações */}
                        <div className="flex justify-between pt-3 border-t">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Ver"
                              onClick={() => handleViewQuote(quote.id)}
                            >
                              <Eye className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Editar"
                              onClick={() => handleEditQuote(quote.id)}
                            >
                              <Edit className="w-4 h-4 text-green-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Enviar"
                              onClick={() => handleSendQuote(quote.id)}
                            >
                              <Send className="w-4 h-4 text-orange-500" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Excluir"
                            onClick={() => handleDeleteQuote(quote.id)}
                            disabled={deleteQuoteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {filteredQuotes.length > 10 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/70">
            Mostrando 1-{Math.min(10, filteredQuotes.length)} de {filteredQuotes.length} orçamentos
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              Anterior
            </Button>
            <Button className="brand-gradient text-white" size="sm">
              1
            </Button>
            <Button variant="outline" size="sm" disabled>
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
