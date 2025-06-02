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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-xl">
        <h1 className="text-3xl font-bold mb-2">
          Bem-vindo, {(user as any)?.firstName || 'Usuário'}!
        </h1>
        <p className="text-blue-100 text-lg">
          Gerencie seus orçamentos e acompanhe seu progresso
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-base font-medium text-gray-600">Total de Orçamentos</p>
                <p className="text-4xl font-bold text-gray-900">{dashboardStats.totalQuotes}</p>
              </div>
              <FileText className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-base font-medium text-gray-600">Aprovados</p>
                <p className="text-4xl font-bold text-green-600">{dashboardStats.approvedQuotes}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-base font-medium text-gray-600">Faturamento</p>
                <p className="text-3xl font-bold text-purple-600">
                  {formatCurrency(dashboardStats.totalRevenue)}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-base font-medium text-gray-600">Avaliação Média</p>
                <div className="flex items-center gap-2">
                  <p className="text-4xl font-bold text-yellow-600">
                    {dashboardStats.averageRating.toFixed(1)}
                  </p>
                  <Star className="w-8 h-8 text-yellow-400 fill-current" />
                </div>
              </div>
              <Star className="w-10 h-10 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/new-quote">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="p-6 text-center h-full flex flex-col justify-center">
              <Plus className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Novo Orçamento</h3>
              <p className="text-gray-600 text-sm">Criar um novo orçamento para cliente</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/clients">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="p-6 text-center h-full flex flex-col justify-center">
              <Users className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Gerenciar Clientes</h3>
              <p className="text-gray-600 text-sm">Adicionar e organizar clientes</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/quotes">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="p-6 text-center h-full flex flex-col justify-center">
              <FileText className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Ver Orçamentos</h3>
              <p className="text-gray-600 text-sm">Acompanhar status dos orçamentos</p>
            </CardContent>
          </Card>
        </Link>
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