import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/common/stats-card";
import LoadingSpinner from "@/components/common/loading-spinner";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  FileText, 
  CheckCircle, 
  DollarSign, 
  Star, 
  Plus, 
  UserPlus, 
  BarChart3,
  Bell,
  ArrowUp,
  Eye,
  Edit,
  Send
} from "lucide-react";
import type { DashboardStats, QuoteWithClient, ReviewWithClient } from "@/types";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

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

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: recentQuotes, isLoading: quotesLoading } = useQuery<QuoteWithClient[]>({
    queryKey: ["/api/quotes"],
    retry: false,
    select: (data) => data?.slice(0, 3),
  });

  const { data: recentReviews, isLoading: reviewsLoading } = useQuery<ReviewWithClient[]>({
    queryKey: ["/api/reviews"],
    retry: false,
    select: (data) => data?.slice(0, 3),
  });

  if (authLoading || statsLoading) {
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-white/70">Visão geral dos seus negócios</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Orçamentos Enviados"
          value={stats?.totalQuotes?.toString() || "0"}
          icon={<FileText className="w-6 h-6" />}
          trend="+15% este mês"
          trendUp={true}
        />
        <StatsCard
          title="Aprovados"
          value={stats?.approvedQuotes?.toString() || "0"}
          icon={<CheckCircle className="w-6 h-6" />}
          trend="+8% este mês"
          trendUp={true}
        />
        <StatsCard
          title="Faturamento"
          value={stats ? formatCurrency(stats.totalRevenue) : "R$ 0,00"}
          icon={<DollarSign className="w-6 h-6" />}
          trend="+23% este mês"
          trendUp={true}
        />
        <StatsCard
          title="Avaliação Média"
          value={stats?.averageRating?.toFixed(1) || "0.0"}
          icon={<Star className="w-6 h-6" />}
          trend="+0.2 este mês"
          trendUp={true}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Quotes */}
        <Card className="bg-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800">
              Orçamentos Recentes
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-brand-primary">
              Ver todos
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {quotesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-100 h-16 rounded-lg" />
                ))}
              </div>
            ) : recentQuotes && recentQuotes.length > 0 ? (
              recentQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 brand-gradient rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{quote.title}</p>
                      <p className="text-sm text-gray-500">
                        {quote.client.name} - {quote.quoteNumber}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">
                      {formatCurrency(quote.total)}
                    </p>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(
                        quote.status
                      )}`}
                    >
                      {getStatusText(quote.status)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhum orçamento ainda</p>
                <p className="text-sm">Crie seu primeiro orçamento para começar</p>
              </div>
            )}
            
            <Button className="w-full brand-gradient text-white">
              <Plus className="w-4 h-4 mr-2" />
              Novo Orçamento
            </Button>
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card className="bg-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800">
              Avaliações Recentes
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-brand-primary">
              Ver todas
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {reviewsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-gray-100 h-20 rounded-lg" />
                ))}
              </div>
            ) : recentReviews && recentReviews.length > 0 ? (
              recentReviews.map((review) => (
                <div key={review.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-800">{review.client.name}</p>
                    <div className="flex gap-1">{renderStars(review.rating)}</div>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {review.comment || "Sem comentário"}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Nenhuma avaliação ainda</p>
                <p className="text-sm">Complete seus primeiros projetos para receber avaliações</p>
              </div>
            )}
            
            <Button variant="secondary" className="w-full">
              <Star className="w-4 h-4 mr-2" />
              Ver Todas as Avaliações
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="brand-gradient text-white h-auto py-4 px-6">
              <Plus className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-semibold">Novo Orçamento</p>
                <p className="text-xs opacity-90">Criar orçamento para cliente</p>
              </div>
            </Button>
            
            <Button variant="outline" className="h-auto py-4 px-6">
              <UserPlus className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-semibold">Adicionar Cliente</p>
                <p className="text-xs text-gray-600">Cadastrar novo cliente</p>
              </div>
            </Button>
            
            <Button variant="outline" className="h-auto py-4 px-6">
              <BarChart3 className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-semibold">Relatórios</p>
                <p className="text-xs text-gray-600">Ver métricas detalhadas</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
