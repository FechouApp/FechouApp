import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  FileText, 
  CheckCircle, 
  DollarSign, 
  Star, 
  Plus, 
  Users, 
  TrendingUp,
  Calendar,
  Eye,
  Send,
  BarChart3
} from "lucide-react";
import StatsCard from "@/components/common/stats-card";
import LoadingSpinner from "@/components/common/loading-spinner";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: recentQuotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ["/api/quotes"],
    retry: false,
  });

  const { data: recentReviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["/api/reviews"],
    retry: false,
  });

  // Use fallback values if stats are not available
  const dashboardStats = {
    totalQuotes: (stats as any)?.totalQuotes || 0,
    approvedQuotes: (stats as any)?.approvedQuotes || 0,
    totalRevenue: (stats as any)?.totalRevenue || "0",
    averageRating: (stats as any)?.averageRating || 0,
    thisMonthQuotes: (stats as any)?.thisMonthQuotes || 0,
    quoteTrend: (stats as any)?.quoteTrend || "+0%",
    quoteTrendUp: (stats as any)?.quoteTrendUp || true,
    approvalTrend: (stats as any)?.approvalTrend || "+0%",
    approvalTrendUp: (stats as any)?.approvalTrendUp || true,
    revenueTrend: (stats as any)?.revenueTrend || "+0%",
    revenueTrendUp: (stats as any)?.revenueTrendUp || true,
    ratingTrend: (stats as any)?.ratingTrend || "+0%",
    ratingTrendUp: (stats as any)?.ratingTrendUp || true,
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (statsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-xl shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Bem-vindo de volta, {(user as any)?.firstName || 'Usuário'}!
            </h1>
            <p className="text-blue-100">
              Gerencie seus orçamentos e acompanhe seu progresso
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <Badge 
              variant={(user as any)?.plan === "PREMIUM" ? "default" : "secondary"}
              className={`${(user as any)?.plan === "PREMIUM" ? "bg-yellow-500 text-black" : "bg-gray-500 text-white"}`}
            >
              {(user as any)?.plan === "PREMIUM" ? "Premium" : "Gratuito"}
            </Badge>
          </div>
        </div>

        {/* Título das Ações */}
        <div className="mb-4">
          <h3 className="text-white font-semibold text-lg opacity-100">Ações Rápidas</h3>
        </div>

        {/* Quick Actions - Responsivo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/new-quote">
            <Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 justify-start h-12">
              <Plus className="w-5 h-5 mr-3" />
              Novo Orçamento
            </Button>
          </Link>

          <Link href="/clients">
            <Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 justify-start h-12">
              <Users className="w-5 h-5 mr-3" />
              Adicionar Cliente
            </Button>
          </Link>

          <Link href="/quotes">
            <Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 justify-start h-12">
              <FileText className="w-5 h-5 mr-3" />
              Ver Orçamentos
            </Button>
          </Link>

          {(user as any)?.plan === "PREMIUM" ? (
            <Link href="/reports">
              <Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 justify-start h-12">
                <BarChart3 className="w-5 h-5 mr-3" />
                Relatórios
              </Button>
            </Link>
          ) : (
            <Link href="/plans">
              <Button className="w-full bg-gradient-to-r from-yellow-500/80 to-orange-500/80 hover:from-yellow-600/80 hover:to-orange-600/80 text-white border border-yellow-400/40 justify-start h-12">
                <BarChart3 className="w-5 h-5 mr-3" />
                Relatórios Pro
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total de Orçamentos"
          value={dashboardStats.totalQuotes.toString()}
          icon={<FileText className="w-6 h-6" />}
          trend={dashboardStats.quoteTrend}
          trendUp={dashboardStats.quoteTrendUp}
          className="bg-white"
        />

        <StatsCard
          title="Orçamentos Aprovados"
          value={dashboardStats.approvedQuotes.toString()}
          icon={<CheckCircle className="w-6 h-6" />}
          trend={dashboardStats.approvalTrend}
          trendUp={dashboardStats.approvalTrendUp}
          className="bg-white"
        />

        <StatsCard
          title="Faturamento Total"
          value={formatCurrency(dashboardStats.totalRevenue)}
          icon={<DollarSign className="w-6 h-6" />}
          trend={dashboardStats.revenueTrend}
          trendUp={dashboardStats.revenueTrendUp}
          className="bg-white"
        />

        <StatsCard
          title="Avaliação Média"
          value={`${dashboardStats.averageRating.toFixed(1)}/5`}
          icon={<Star className="w-6 h-6" />}
          trend={dashboardStats.ratingTrend}
          trendUp={dashboardStats.ratingTrendUp}
          className="bg-white"
        />
      </div>

      

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quotes */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Orçamentos Recentes
              </span>
              <Link href="/quotes">
                <Button variant="ghost" size="sm">Ver todos</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {quotesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse bg-gray-200 h-16 rounded"></div>
                ))}
              </div>
            ) : recentQuotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum orçamento encontrado</p>
                <Link href="/new-quote">
                  <Button className="mt-4" size="sm">
                    Criar primeiro orçamento
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentQuotes.slice(0, 5).map((quote: any) => (
                  <div key={quote.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{quote.title}</p>
                          <p className="text-sm text-gray-600">{quote.client?.name}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(quote.status)}>
                        {quote.status === 'approved' ? 'Aprovado' : 
                         quote.status === 'pending' ? 'Pendente' : 
                         quote.status === 'rejected' ? 'Recusado' : 'Rascunho'}
                      </Badge>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(quote.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Avaliações Recentes
              </span>
              <Link href="/reviews">
                <Button variant="ghost" size="sm">Ver todas</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviewsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse bg-gray-200 h-16 rounded"></div>
                ))}
              </div>
            ) : recentReviews.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma avaliação ainda</p>
                <p className="text-sm mt-2">As avaliações aparecerão quando os clientes avaliarem seus orçamentos.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentReviews.slice(0, 5).map((review: any) => (
                  <div key={review.id} className="p-3 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{review.clientName}</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star 
                                key={star} 
                                className={`w-4 h-4 ${star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-sm text-gray-600">{review.comment}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}