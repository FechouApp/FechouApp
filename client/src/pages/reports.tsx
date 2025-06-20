
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import LoadingSpinner from "@/components/common/loading-spinner";
import BackButton from "@/components/common/back-button";
import { useLocation, Link } from "wouter";
import { Crown, Lock, AlertTriangle, Eye, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { 
  FileText, 
  CheckCircle, 
  DollarSign, 
  Star, 
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Target,
  Award,
  ThumbsUp
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { DashboardStats, QuoteWithClient, ReviewWithClient } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Reports() {
  const { user, isLoading: userLoading, isPremium } = useAuth();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: quotes } = useQuery({
    queryKey: ["/api/quotes"],
    retry: false,
  });

  const { data: reviews } = useQuery({
    queryKey: ["/api/reviews"],
    retry: false,
  });

  // Mutation para confirmar pagamento
  const confirmPaymentMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return await apiRequest("PATCH", `/api/quotes/${quoteId}/confirm-payment`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sucesso",
        description: "Pagamento confirmado com sucesso!",
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

  // Função para confirmar pagamento
  const handleConfirmPayment = (quote: any) => {
    setSelectedQuote(quote);
    setShowReceiptDialog(true);
  };

  // Função para confirmar e gerar recibo
  const confirmAndGenerateReceipt = () => {
    if (selectedQuote) {
      confirmPaymentMutation.mutate(selectedQuote.id);
      setShowReceiptDialog(false);
      setSelectedQuote(null);
    }
  };

  if (userLoading) {
    return <LoadingSpinner />;
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 p-4">
        {/* Botão de Voltar */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-white hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Relatórios Avançados</h1>
          <p className="text-white/70">Análises detalhadas para o seu negócio</p>
        </div>

        <Card className="bg-white/10 backdrop-blur-sm border-white/20 max-w-2xl mx-auto">
          <CardContent className="p-6 md:p-12 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4 rounded-full">
                <Lock className="w-12 h-12 text-white" />
              </div>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white mb-4">
              OS RELATÓRIOS ESTÃO DISPONÍVEIS PARA O PLANO PREMIUM
            </h2>

            <p className="text-white/80 mb-6 max-w-md mx-auto">
              CONHEÇA AS VANTAGENS DE SE TORNAR PREMIUM.
            </p>

            <div className="bg-white/10 rounded-lg p-4 mb-6">
              <h3 className="text-white font-semibold mb-3">O que você terá acesso:</h3>
              <ul className="text-white/80 text-sm space-y-2">
                <li>• Análise de tendências mensais</li>
                <li>• Gráficos de conversão</li>
                <li>• Relatórios de faturamento</li>
                <li>• Análise de clientes</li>
                <li>• Métricas de performance</li>
              </ul>
            </div>

            <Link href="/plans">
              <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold px-8 py-3 w-full md:w-auto">
                <Crown className="w-5 h-5 mr-2" />
                Fazer Upgrade para Premium
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (statsLoading) {
    return <LoadingSpinner />;
  }

  const formatCurrency = (value: any) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  const calculateMonthlyData = () => {
    if (!quotes || !Array.isArray(quotes)) return [];

    // Para mobile usar 6 meses, desktop 12 meses
    const monthsCount = isMobile ? 6 : 12;
    const months: any[] = [];
    const now = new Date();

    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      months.push({
        month: monthKey,
        monthDate: date,
        total: 0,
        approved: 0,
        revenue: 0
      });
    }

    // Processar orçamentos
    quotes.forEach(quote => {
      if (quote.createdAt) {
        const quoteDate = new Date(quote.createdAt);
        const monthKey = quoteDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

        const monthData = months.find(m => m.month === monthKey);
        if (monthData) {
          monthData.total++;
          if (quote.status === 'paid') {
            monthData.approved++;
            monthData.revenue += parseFloat(quote.total);
          }
        }
      }
    });

    // Calcular ticket médio
    return months.map(month => ({
      ...month,
      ticketMedio: month.approved > 0 ? month.revenue / month.approved : 0
    }));
  };

  const getStatusStats = () => {
    if (!quotes) return {};

    const statusCount = {};
    quotes.forEach(quote => {
      statusCount[quote.status] = (statusCount[quote.status] || 0) + 1;
    });

    return statusCount;
  };

  const getTopClients = () => {
    if (!quotes) return [];

    const clientStats = {};
    quotes.forEach(quote => {
      const clientId = quote.clientId;
      if (!clientStats[clientId] && quote.client) {
        clientStats[clientId] = {
          name: quote.client.name,
          quotesCount: 0,
          totalValue: 0,
          approvedCount: 0
        };
      }
      if (quote.client) {
        clientStats[clientId].quotesCount++;
        clientStats[clientId].totalValue += parseFloat(quote.total);
        if (quote.status === 'approved' || quote.status === 'paid') {
          clientStats[clientId].approvedCount++;
        }
      }
    });

    return Object.values(clientStats)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);
  };

  const getConversionRate = () => {
    if (!quotes || quotes.length === 0) return 0;
    const paid = quotes.filter(q => q.status === 'paid').length;
    return (paid / quotes.length * 100).toFixed(1);
  };

  const getAverageQuoteValue = () => {
    if (!quotes || quotes.length === 0) return 0;
    const paidQuotes = quotes.filter(q => q.status === 'paid');
    if (paidQuotes.length === 0) return 0;
    const total = paidQuotes.reduce((sum, quote) => sum + parseFloat(quote.total), 0);
    return total / paidQuotes.length;
  };

  const getTotalRevenue = () => {
    if (!quotes || quotes.length === 0) return 0;
    return quotes.filter(q => q.status === 'paid')
      .reduce((sum, quote) => sum + parseFloat(quote.total), 0);
  };

  const getPaidQuotesCount = () => {
    if (!quotes || quotes.length === 0) return 0;
    return quotes.filter(q => q.status === 'paid').length;
  };

  const getExpiringQuotes = () => {
    if (!quotes || quotes.length === 0) return [];
    
    const today = new Date();
    const fiveDaysFromNow = new Date();
    fiveDaysFromNow.setDate(today.getDate() + 5);
    
    return quotes.filter(quote => {
      if (quote.status !== 'pending' && quote.status !== 'draft') return false;
      
      const validUntil = new Date(quote.validUntil);
      return validUntil >= today && validUntil <= fiveDaysFromNow;
    }).sort((a, b) => new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime());
  };

  const getDaysUntilExpiration = (validUntil: string) => {
    const today = new Date();
    const expirationDate = new Date(validUntil);
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const monthlyData = calculateMonthlyData();
  const statusStats = getStatusStats();
  const topClients = getTopClients();
  const conversionRate = getConversionRate();
  const averageQuoteValue = getAverageQuoteValue();
  const expiringQuotes = getExpiringQuotes();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <BackButton />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Relatórios</h1>
        <p className="text-gray-600">Análise detalhada do seu desempenho</p>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Taxa de Pagamento</p>
                <p className="text-2xl font-bold text-green-600">{conversionRate}%</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(averageQuoteValue)}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Receita Total</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(getTotalRevenue())}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Orçamentos Pagos</p>
                <p className="text-2xl font-bold text-yellow-600">{getPaidQuotesCount()}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monitoramento de Prazos Vencendo */}
      {expiringQuotes.length > 0 && (
        <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200 shadow-lg mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              ⚠️ Orçamentos Vencendo em Breve
            </CardTitle>
            <p className="text-sm text-red-600">
              {expiringQuotes.length} orçamento{expiringQuotes.length > 1 ? 's' : ''} {expiringQuotes.length > 1 ? 'vencem' : 'vence'} nos próximos 5 dias
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiringQuotes.map((quote: any) => {
                const daysLeft = getDaysUntilExpiration(quote.validUntil);
                const isUrgent = daysLeft <= 2;
                
                return (
                  <div 
                    key={quote.id} 
                    className={`p-4 rounded-lg border-l-4 ${
                      isUrgent 
                        ? 'bg-red-100 border-red-500' 
                        : 'bg-orange-100 border-orange-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-gray-800">{quote.title}</p>
                            <p className="text-sm text-gray-600">
                              Cliente: {quote.client?.name || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          isUrgent 
                            ? 'bg-red-200 text-red-800' 
                            : 'bg-orange-200 text-orange-800'
                        }`}>
                          {daysLeft === 0 ? 'Vence hoje!' : 
                           daysLeft === 1 ? 'Vence amanhã' : 
                           `${daysLeft} dias restantes`}
                        </div>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(quote.total)}
                        </p>
                        <div className="flex flex-col gap-2 w-full">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-2 w-full"
                            onClick={() => setLocation(`/quotes/view/${quote.id}`)}
                          >
                            <Eye className="w-4 h-4" />
                            Ver Orçamento
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 w-full"
                            onClick={() => handleConfirmPayment(quote)}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Confirmar Pagamento
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráficos - Layout responsivo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Card className="bg-white shadow-lg overflow-hidden">
          <CardHeader className="p-3 md:p-4">
            <CardTitle className="text-base md:text-lg font-semibold text-gray-800">
              Performance dos Últimos {isMobile ? '6' : '12'} Meses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-4">
            <div className="w-full overflow-hidden">
              <ChartContainer
                config={{
                  total: {
                    label: "Orçamentos Emitidos",
                    color: "#3b82f6",
                  },
                  approved: {
                    label: "Orçamentos Pagos",
                    color: "#10b981",
                  },
                  ticketMedio: {
                    label: "Ticket Médio",
                    color: "#f59e0b",
                  },
                }}
                className="h-[200px] md:h-[280px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={monthlyData} 
                    margin={{ 
                      top: 10, 
                      right: isMobile ? 10 : 20, 
                      left: isMobile ? 0 : 10, 
                      bottom: isMobile ? 50 : 20 
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="month" 
                      fontSize={isMobile ? 9 : 11}
                      tickLine={false}
                      axisLine={false}
                      angle={isMobile ? -45 : 0}
                      textAnchor={isMobile ? "end" : "middle"}
                      height={isMobile ? 50 : 30}
                      interval={0}
                    />
                    <YAxis 
                      fontSize={isMobile ? 9 : 11}
                      tickLine={false}
                      axisLine={false}
                      width={isMobile ? 30 : 50}
                    />
                    <ChartTooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-white p-2 shadow-lg max-w-[200px]">
                              <div className="text-xs font-medium text-gray-600 mb-1">
                                {label}
                              </div>
                              {payload.map((entry, index) => (
                                <div key={index} className="text-xs" style={{ color: entry.color }}>
                                  {entry.dataKey === 'ticketMedio' 
                                    ? `${entry.name}: ${formatCurrency(entry.value)}`
                                    : `${entry.name}: ${entry.value}`
                                  }
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ChartLegend />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#3b82f6" 
                      strokeWidth={isMobile ? 1.5 : 2}
                      dot={{ fill: "#3b82f6", strokeWidth: 1, r: isMobile ? 2 : 3 }}
                      activeDot={{ r: isMobile ? 3 : 4, stroke: "#3b82f6", strokeWidth: 1 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="approved" 
                      stroke="#10b981" 
                      strokeWidth={isMobile ? 1.5 : 2}
                      dot={{ fill: "#10b981", strokeWidth: 1, r: isMobile ? 2 : 3 }}
                      activeDot={{ r: isMobile ? 3 : 4, stroke: "#10b981", strokeWidth: 1 }}
                    />
                    {!isMobile && (
                      <Line 
                        type="monotone" 
                        dataKey="ticketMedio" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        dot={{ fill: "#f59e0b", strokeWidth: 1, r: 3 }}
                        activeDot={{ r: 4, stroke: "#f59e0b", strokeWidth: 1 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg overflow-hidden">
          <CardHeader className="p-3 md:p-4">
            <CardTitle className="text-base md:text-lg font-semibold text-gray-800">
              Taxa de Pagamento por Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 md:p-4">
            <div className="w-full overflow-hidden">
              <ChartContainer
                config={{
                  conversionRate: {
                    label: "Taxa de Conversão (%)",
                    color: "#8b5cf6",
                  },
                }}
                className="h-[200px] md:h-[280px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={monthlyData.map(month => ({
                      ...month,
                      conversionRate: month.total > 0 ? ((month.approved / month.total) * 100).toFixed(1) : 0
                    }))}
                    margin={{ 
                      top: 10, 
                      right: isMobile ? 10 : 20, 
                      left: isMobile ? 0 : 10, 
                      bottom: isMobile ? 50 : 20 
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="month" 
                      fontSize={isMobile ? 9 : 11}
                      tickLine={false}
                      axisLine={false}
                      angle={isMobile ? -45 : 0}
                      textAnchor={isMobile ? "end" : "middle"}
                      height={isMobile ? 50 : 30}
                      interval={0}
                    />
                    <YAxis 
                      fontSize={isMobile ? 9 : 11}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      width={isMobile ? 30 : 50}
                    />
                    <ChartTooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-white p-2 shadow-lg max-w-[150px]">
                              <div className="text-xs font-medium text-gray-600 mb-1">
                                {label}
                              </div>
                              <div className="text-xs text-purple-600">
                                Taxa: {payload[0].value}%
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ChartLegend />
                    <Line 
                      type="monotone" 
                      dataKey="conversionRate" 
                      stroke="#8b5cf6" 
                      strokeWidth={isMobile ? 2 : 3}
                      dot={{ fill: "#8b5cf6", strokeWidth: 1, r: isMobile ? 2 : 4 }}
                      activeDot={{ r: isMobile ? 4 : 6, stroke: "#8b5cf6", strokeWidth: 1 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Mensal e Status dos Orçamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-white shadow-lg">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg font-semibold text-gray-800">
              Performance Mensal (Últimos {isMobile ? '3' : '6'} meses)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-4">
              {monthlyData.slice(isMobile ? -3 : -6).map((month, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{month.month}</p>
                    <p className="text-sm text-gray-600">{month.total} orçamentos</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{formatCurrency(month.revenue)}</p>
                    <p className="text-sm text-green-600">{month.approved} aprovados</p>
                    {!isMobile && (
                      <p className="text-xs text-blue-600">Ticket: {formatCurrency(month.ticketMedio)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg font-semibold text-gray-800">
              Status dos Orçamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-4">
              {Object.entries(statusStats).map(([status, count]) => {
                const getStatusInfo = (status) => {
                  switch (status.toLowerCase()) {
                    case 'paid':
                      return { label: 'Pago', color: 'text-green-600', bg: 'bg-green-100' };
                    case 'approved':
                      return { label: 'Aprovados', color: 'text-green-600', bg: 'bg-green-100' };
                    case 'pending':
                      return { label: 'Pendentes', color: 'text-blue-600', bg: 'bg-blue-100' };
                    case 'draft':
                      return { label: 'Rascunhos', color: 'text-gray-600', bg: 'bg-gray-100' };
                    case 'rejected':
                      return { label: 'Recusados', color: 'text-red-600', bg: 'bg-red-100' };
                    default:
                      return { label: status, color: 'text-gray-600', bg: 'bg-gray-100' };
                  }
                };

                const statusInfo = getStatusInfo(status);
                const percentage = quotes ? ((count / quotes.length) * 100).toFixed(1) : 0;

                return (
                  <div key={status} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 ${statusInfo.bg} rounded-lg flex items-center justify-center`}>
                        <div className={`w-3 h-3 ${statusInfo.color} rounded-full bg-current`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{statusInfo.label}</p>
                        <p className="text-sm text-gray-600">{percentage}% do total</p>
                      </div>
                    </div>
                    <span className={`text-xl font-bold ${statusInfo.color}`}>{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Clientes */}
      <Card className="bg-white shadow-lg">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg font-semibold text-gray-800">
            Principais Clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="space-y-4">
            {topClients.map((client, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{client.name}</p>
                    <p className="text-sm text-gray-600">
                      {client.quotesCount} orçamentos • {client.approvedCount} aprovados
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">{formatCurrency(client.totalValue)}</p>
                  <p className="text-sm text-green-600">
                    Taxa: {client.quotesCount > 0 ? ((client.approvedCount / client.quotesCount) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            ))}
            {topClients.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhum cliente ainda</p>
                <p className="text-sm">Crie orçamentos para ver seus principais clientes</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Pagamento */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedQuote && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800">{selectedQuote.title}</h4>
                <p className="text-sm text-gray-600">Cliente: {selectedQuote.client?.name}</p>
                <p className="text-lg font-semibold text-green-600 mt-2">
                  {formatCurrency(selectedQuote.total)}
                </p>
              </div>
            )}
            
            <p className="text-sm text-gray-600">
              Ao confirmar o pagamento, o orçamento será marcado como pago e você poderá gerar o recibo automaticamente.
            </p>
            
            <div className="flex gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setShowReceiptDialog(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={confirmAndGenerateReceipt}
                disabled={confirmPaymentMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {confirmPaymentMutation.isPending ? "Confirmando..." : "Confirmar Pagamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
