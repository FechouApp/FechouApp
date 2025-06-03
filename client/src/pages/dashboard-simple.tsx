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
  Send
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: recentQuotes = [] } = useQuery({
    queryKey: ["/api/quotes"],
    retry: false,
  });

  const { data: recentReviews = [] } = useQuery({
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
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { label: string; variant: any } } = {
      'DRAFT': { label: 'Rascunho', variant: 'secondary' },
      'PENDING': { label: 'Pendente', variant: 'secondary' },
      'SENT': { label: 'Enviado', variant: 'default' },
      'VIEWED': { label: 'Visualizado', variant: 'default' },
      'APPROVED': { label: 'Aprovado', variant: 'default' },
      'REJECTED': { label: 'Rejeitado', variant: 'destructive' },
      'PAID': { label: 'Pago', variant: 'default' },
      'EXPIRED': { label: 'Expirado', variant: 'destructive' },
    };

    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 p-4 sm:p-0">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 sm:p-6 lg:p-8 rounded-xl">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
          Bem-vindo, {(user as any)?.firstName || 'Usuário'}!
        </h1>
        <p className="text-blue-100 text-sm sm:text-base lg:text-lg">
          Gerencie seus orçamentos e acompanhe seu progresso
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-blue-100 text-sm sm:text-base">Plano:</span>
            <Badge 
              variant={(user as any)?.plan === "PREMIUM" ? "default" : "secondary"}
              className={`${(user as any)?.plan === "PREMIUM" ? "bg-yellow-500 text-black" : "bg-gray-500 text-white"} text-xs sm:text-sm`}
            >
              {(user as any)?.plan === "PREMIUM" ? "Premium" : "Gratuito"}
            </Badge>
          </div>
          {(user as any)?.plan === "PREMIUM" && (user as any)?.planExpiresAt && (
            <span className="text-blue-100 text-xs sm:text-sm">
              Válido até: {new Date((user as any).planExpiresAt).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>

        {/* Quick Actions - Moved inside welcome section */}
        <div className="space-y-3 mt-6">
          <Link href="/new-quote">
            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white h-16 rounded-lg shadow-md hover:shadow-lg transition-all">
              <div className="flex items-center gap-4 w-full justify-start px-4">
                <Plus className="w-6 h-6 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-lg">Novo Orçamento</div>
                  <div className="text-sm opacity-90">Criar orçamento para cliente</div>
                </div>
              </div>
            </Button>
          </Link>

          <Link href="/clients">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-16 rounded-lg shadow-md hover:shadow-lg transition-all">
              <div className="flex items-center gap-4 w-full justify-start px-4">
                <Users className="w-6 h-6 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-lg">Adicionar Cliente</div>
                  <div className="text-sm opacity-90">Cadastrar novo cliente</div>
                </div>
              </div>
            </Button>
          </Link>

          {(user as any)?.plan === "PREMIUM" ? (
            <Link href="/reports">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-16 rounded-lg shadow-md hover:shadow-lg transition-all">
                <div className="flex items-center gap-4 w-full justify-start px-4">
                  <TrendingUp className="w-6 h-6 flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-semibold text-lg">Relatórios</div>
                    <div className="text-sm opacity-90">Ver métricas detalhadas</div>
                  </div>
                </div>
              </Button>
            </Link>
          ) : (
            <Link href="/plans">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white h-16 rounded-lg shadow-md hover:shadow-lg transition-all">
                <div className="flex items-center gap-4 w-full justify-start px-4">
                  <TrendingUp className="w-6 h-6 flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-semibold text-lg">Relatórios</div>
                    <div className="text-sm opacity-90">Upgrade para Premium</div>
                  </div>
                </div>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1 sm:space-y-2">
                <p className="text-xs sm:text-sm lg:text-base font-medium text-gray-600">Total de Orçamentos</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">{dashboardStats.totalQuotes}</p>
              </div>
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1 sm:space-y-2">
                <p className="text-xs sm:text-sm lg:text-base font-medium text-gray-600">Aprovados</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600">{dashboardStats.approvedQuotes}</p>
              </div>
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1 sm:space-y-2">
                <p className="text-xs sm:text-sm lg:text-base font-medium text-gray-600">Faturamento</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-600">
                  {formatCurrency(dashboardStats.totalRevenue)}
                </p>
              </div>
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1 sm:space-y-2">
                <p className="text-xs sm:text-sm lg:text-base font-medium text-gray-600">Avaliação Média</p>
                <div className="flex items-center gap-1 sm:gap-2">
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-600">
                    {dashboardStats.averageRating.toFixed(1)}
                  </p>
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-400 fill-current" />
                </div>
              </div>
              <Star className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quotes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Orçamentos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(recentQuotes as any[]).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum orçamento ainda</p>
                <Link href="/new-quote">
                  <Button className="mt-3" size="sm">
                    Criar Primeiro Orçamento
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {(recentQuotes as any[]).slice(0, 5).map((quote: any) => (
                  <div key={quote.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{quote.title}</p>
                      <p className="text-sm text-gray-600">
                        {quote.client?.name} • {formatCurrency(quote.total)}
                      </p>
                    </div>
                    {getStatusBadge(quote.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Avaliações Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(recentReviews as any[]).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma avaliação ainda</p>
                <p className="text-sm">Complete orçamentos para receber avaliações</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(recentReviews as any[]).slice(0, 5).map((review: any) => (
                  <div key={review.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{review.client?.name}</p>
                      <div className="flex">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    )}
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