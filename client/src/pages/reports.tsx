import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/common/loading-spinner";
import { Link, useLocation } from "wouter";
import { Crown, Lock, ArrowLeft } from "lucide-react";
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
  Eye,
  ThumbsUp
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartLegend } from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { DashboardStats, QuoteWithClient, ReviewWithClient } from "@/types";

export default function Reports() {
  const { user, isLoading: userLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  if (userLoading) {
    return <LoadingSpinner />;
  }

  // Verificar se o usuário tem plano premium
  const isPremium = (user as any)?.plan === "PREMIUM";

  if (!isPremium) {
    return (
      <div className="space-y-8">
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

        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Relatórios Avançados</h1>
          <p className="text-white/70">Análises detalhadas para o seu negócio</p>
        </div>

        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-12 text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4 rounded-full">
                <Lock className="w-12 h-12 text-white" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-4">
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
              <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold px-8 py-3">
                <Crown className="w-5 h-5 mr-2" />
                Fazer Upgrade para Premium
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: quotes } = useQuery({
    queryKey: ["/api/quotes"],
    retry: false,
  });

  const { data: reviews } = useQuery({
    queryKey: ["/api/reviews"],
    retry: false,
  });

  if (statsLoading) {
    return <LoadingSpinner />;
  }

  const formatCurrency = (value) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  const calculateMonthlyData = () => {
    if (!quotes) return [];

    // Gerar últimos 12 meses
    const months = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
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
          if (quote.status === 'approved' || quote.status === 'paid') {
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
      if (!clientStats[clientId]) {
        clientStats[clientId] = {
          name: quote.client.name,
          quotesCount: 0,
          totalValue: 0,
          approvedCount: 0
        };
      }
      clientStats[clientId].quotesCount++;
      clientStats[clientId].totalValue += parseFloat(quote.total);
      if (quote.status === 'approved' || quote.status === 'paid') {
        clientStats[clientId].approvedCount++;
      }
    });

    return Object.values(clientStats)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);
  };

  const getConversionRate = () => {
    if (!quotes || quotes.length === 0) return 0;
    const approved = quotes.filter(q => q.status === 'approved' || q.status === 'paid').length;
    return (approved / quotes.length * 100).toFixed(1);
  };

  const getAverageQuoteValue = () => {
    if (!quotes || quotes.length === 0) return 0;
    const approvedQuotes = quotes.filter(q => q.status === 'approved' || q.status === 'paid');
    if (approvedQuotes.length === 0) return 0;
    const total = approvedQuotes.reduce((sum, quote) => sum + parseFloat(quote.total), 0);
    return total / approvedQuotes.length;
  };

  const monthlyData = calculateMonthlyData();
  const statusStats = getStatusStats();
  const topClients = getTopClients();
  const conversionRate = getConversionRate();
  const averageQuoteValue = getAverageQuoteValue();

  return (
    <div className="space-y-8">
      {/* Botão de Voltar */}
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Relatórios</h1>
        <p className="text-gray-600">Análise detalhada do seu desempenho</p>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Taxa de Conversão</p>
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
                <p className="text-sm font-medium text-gray-600">Clientes Únicos</p>
                <p className="text-2xl font-bold text-purple-600">{topClients.length}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Avaliação Média</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.averageRating?.toFixed(1) || "0.0"}</p>
              </div>
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos - Últimos 12 Meses */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Performance dos Últimos 12 Meses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                total: {
                  label: "Orçamentos Emitidos",
                  color: "#3b82f6",
                },
                approved: {
                  label: "Orçamentos Fechados",
                  color: "#10b981",
                },
                ticketMedio: {
                  label: "Ticket Médio",
                  color: "#f59e0b",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid grid-cols-1 gap-2">
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {label}
                                </span>
                                {payload.map((entry, index) => (
                                  <span key={index} className="font-bold text-muted-foreground" style={{ color: entry.color }}>
                                    {entry.dataKey === 'ticketMedio' 
                                      ? `${entry.name}: ${formatCurrency(entry.value)}`
                                      : `${entry.name}: ${entry.value}`
                                    }
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="approved" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "#10b981", strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ticketMedio" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: "#f59e0b", strokeWidth: 2 }}
                  />
                  <ChartLegend />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Taxa de Conversão por Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                conversionRate: {
                  label: "Taxa de Conversão (%)",
                  color: "#8b5cf6",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData.map(month => ({
                  ...month,
                  conversionRate: month.total > 0 ? ((month.approved / month.total) * 100).toFixed(1) : 0
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <ChartTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid grid-cols-1 gap-2">
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {label}
                                </span>
                                <span className="font-bold text-purple-600">
                                  Taxa de Conversão: {payload[0].value}%
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="conversionRate" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, stroke: "#8b5cf6", strokeWidth: 2 }}
                  />
                  <ChartLegend />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e Análises */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Performance Mensal */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Performance Mensal (Últimos 6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.slice(-6).map((month, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{month.month}</p>
                    <p className="text-sm text-gray-600">{month.total} orçamentos</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">{formatCurrency(month.revenue)}</p>
                    <p className="text-sm text-green-600">{month.approved} aprovados</p>
                    <p className="text-xs text-blue-600">Ticket: {formatCurrency(month.ticketMedio)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status dos Orçamentos */}
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Status dos Orçamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(statusStats).map(([status, count]) => {
                const getStatusInfo = (status) => {
                  switch (status.toLowerCase()) {
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
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">
            Principais Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topClients.map((client, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 brand-gradient rounded-lg flex items-center justify-center text-white font-bold">
                    #{index + 1}
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
              <div <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhum cliente ainda</p>
                <p className="text-sm">Crie orçamentos para ver seus principais clientes</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Métricas de Engajamento */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Engajamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                <span className="text-gray-600">Visualizações</span>
              </div>
              <span className="font-semibold text-gray-800">
                {quotes?.filter(q => q.status !== 'draft').length || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-green-600" />
                <span className="text-gray-600">Aprovações</span>
              </div>
              <span className="font-semibold text-gray-800">
                {quotes?.filter(q => q.status === 'approved' || q.status === 'paid').length || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-600" />
                <span className="text-gray-600">Avaliações</span>
              </div>
              <span className="font-semibold text-gray-800">
                {reviews?.length || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Tempo Médio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="text-gray-600">Para aprovação</span>
              </div>
              <span className="font-semibold text-gray-800">2-3 dias</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-600" />
                <span className="text-gray-600">Validade</span>
              </div>
              <span className="font-semibold text-gray-800">30 dias</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-800">
              Meta do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-brand-primary">
                {(() => {
                  const currentMonth = new Date().getMonth();
                  const currentYear = new Date().getFullYear();
                  return quotes?.filter(q => {
                    const quoteDate = new Date(q.createdAt);
                    return quoteDate.getMonth() === currentMonth && quoteDate.getFullYear() === currentYear;
                  }).length || 0;
                })()}
              </p>
              <p className="text-gray-600">orçamentos este mês</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="brand-gradient h-2 rounded-full" 
                style={{ width: `${Math.min(((() => {
                  const currentMonth = new Date().getMonth();
                  const currentYear = new Date().getFullYear();
                  const thisMonthQuotes = quotes?.filter(q => {
                    const quoteDate = new Date(q.createdAt);
                    return quoteDate.getMonth() === currentMonth && quoteDate.getFullYear() === currentYear;
                  }).length || 0;
                  return (thisMonthQuotes / 20) * 100;
                })()), 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 text-center">
              Meta: 20 orçamentos/mês
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}