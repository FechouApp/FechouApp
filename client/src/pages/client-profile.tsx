
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  FileText,
  Eye,
  Edit,
  Calendar,
  User,
  Hash
} from "lucide-react";
import type { Client, Quote } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPhone, formatCPF, formatCEP } from "@/lib/utils";

export default function ClientProfile() {
  const { clientId } = useParams<{ clientId: string }>();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

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

  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: [`/api/clients/${clientId}`],
    enabled: !!clientId,
    retry: false,
  });

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
    retry: false,
  });

  // Filter quotes for this specific client
  const clientQuotes = quotes.filter(quote => quote.clientId === clientId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'paid':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprovado';
      case 'pending':
        return 'Pendente';
      case 'rejected':
        return 'Rejeitado';
      case 'paid':
        return 'Pago';
      default:
        return 'Rascunho';
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  const handleViewQuote = (quoteId: string) => {
    setLocation(`/quotes/view/${quoteId}`);
  };

  const handleEditQuote = (quoteId: string) => {
    setLocation(`/quotes/${quoteId}/edit`);
  };

  const handleNewQuote = () => {
    setLocation(`/new-quote?clientId=${clientId}`);
  };

  if (authLoading || clientLoading || quotesLoading) {
    return <LoadingSpinner />;
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <Header 
          title="Cliente não encontrado" 
          subtitle="O cliente que você está procurando não existe"
          backTo="/clients"
        />
        <Card className="bg-white shadow-lg">
          <CardContent className="p-8 text-center">
            <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Cliente não encontrado
            </h3>
            <p className="text-gray-500 mb-6">
              O cliente que você está procurando não existe ou foi removido.
            </p>
            <Button onClick={() => setLocation("/clients")} className="brand-gradient text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Clientes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header 
        title={`Perfil - ${client.name}`}
        subtitle="Visualize os dados e orçamentos do cliente"
        backTo="/clients"
      />

      {/* Ações do Cliente */}
      <div className="flex justify-end gap-3">
        <Button 
          onClick={handleNewQuote}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <FileText className="w-4 h-4 mr-2" />
          Novo Orçamento
        </Button>
        <Button 
          onClick={() => setLocation(`/clients?edit=${clientId}`)}
          variant="outline"
        >
          <Edit className="w-4 h-4 mr-2" />
          Editar Cliente
        </Button>
      </div>

      {/* Informações do Cliente */}
      <Card className="bg-white shadow-lg">
        <CardHeader className="brand-gradient text-white rounded-t-lg">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {client.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <CardTitle className="text-2xl mb-2">{client.name}</CardTitle>
              <p className="text-white/90">
                Cliente desde {format(new Date(client.createdAt || ''), 'MMMM \'de\' yyyy', { locale: ptBR })}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informações de Contato */}
            <div>
              <h3 className="font-semibold mb-4 text-lg">Informações de Contato</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium">Telefone</p>
                    <p className="text-gray-600">{formatPhone(client.phone)}</p>
                  </div>
                </div>
                
                {client.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">E-mail</p>
                      <p className="text-gray-600">{client.email}</p>
                    </div>
                  </div>
                )}

                {client.cpf && (
                  <div className="flex items-center gap-3">
                    <Hash className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">CPF</p>
                      <p className="text-gray-600">{formatCPF(client.cpf)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Informações de Endereço */}
            <div>
              <h3 className="font-semibold mb-4 text-lg">Endereço</h3>
              {client.address || client.city || client.state ? (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="font-medium">Localização</p>
                    <div className="text-gray-600 space-y-1">
                      {client.address && (
                        <p>
                          {client.address}
                          {client.number && `, ${client.number}`}
                          {client.complement && ` - ${client.complement}`}
                        </p>
                      )}
                      {(client.city || client.state || client.zipCode) && (
                        <p>
                          {client.city && `${client.city}`}
                          {client.state && `, ${client.state}`}
                          {client.zipCode && ` - CEP: ${formatCEP(client.zipCode)}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Endereço não informado</p>
              )}

              {client.notes && (
                <div className="mt-6">
                  <h4 className="font-medium mb-2">Observações</h4>
                  <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                    {client.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{clientQuotes.length}</p>
              <p className="text-sm text-gray-600">Total de Orçamentos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {clientQuotes.filter(q => q.status === 'approved' || q.status === 'paid').length}
              </p>
              <p className="text-sm text-gray-600">Aprovados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {clientQuotes.filter(q => q.status === 'pending').length}
              </p>
              <p className="text-sm text-gray-600">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(
                  clientQuotes
                    .filter(q => q.status === 'approved' || q.status === 'paid')
                    .reduce((sum, q) => sum + parseFloat(q.total), 0)
                    .toString()
                )}
              </p>
              <p className="text-sm text-gray-600">Valor Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orçamentos do Cliente */}
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Orçamentos ({clientQuotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {clientQuotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                Nenhum orçamento encontrado
              </h3>
              <p className="text-gray-500 mb-6">
                Este cliente ainda não possui orçamentos cadastrados.
              </p>
              <Button onClick={handleNewQuote} className="brand-gradient text-white">
                <FileText className="w-4 h-4 mr-2" />
                Criar Primeiro Orçamento
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orçamento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientQuotes.map((quote) => (
                    <TableRow key={quote.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="font-medium">{quote.title}</p>
                          <p className="text-sm text-gray-600">#{quote.quoteNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(quote.total)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(quote.status)}>
                          {getStatusLabel(quote.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(quote.createdAt || ''), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            title="Visualizar"
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
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
