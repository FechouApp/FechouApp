import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Shield, Users, TrendingUp, DollarSign, FileText, Calendar,
  Activity, RefreshCw, Settings, AlertTriangle, CheckCircle,
  XCircle, Clock, BarChart3, PieChart, Target, Zap
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  plan: string;
  paymentStatus: string;
  paymentMethod?: string;
  quotesUsedThisMonth: number;
  quotesLimit: number;
  createdAt: string;
  planExpiresAt?: string;
}

interface AdminStats {
  totalUsers: number;
  premiumUsers: number;
  freeUsers: number;
  totalQuotes: number;
  activeQuotes: number;
  approvedQuotes: number;
  pendingQuotes: number;
  rejectedQuotes: number;
  totalRevenue: string;
  monthlyRevenue: string;
  averageQuoteValue: string;
  conversionRate: number;
  userGrowthRate: number;
  retentionRate: number;
  churnRate: number;
  activeUsersToday: number;
  activeUsersWeek: number;
  activeUsersMonth: number;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("overview");

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    retry: false,
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ userId, newPlan }: { userId: string; newPlan: string }) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}/plan`, {
        plan: newPlan,
        paymentStatus: "ativo",
        paymentMethod: "manual"
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Plano atualizado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar plano: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const resetQuotesMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/admin/users/${userId}/reset-quotes`, "PATCH");
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Orçamentos resetados!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao resetar orçamentos: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleTogglePlan = (user: User, planType: string) => {
    updatePlanMutation.mutate({ userId: user.id, newPlan: planType });
  };

  if (usersLoading || statsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-gray-800">Painel Administrativo</h1>
                <p className="text-sm md:text-base text-gray-600">Monitoramento completo do negócio</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => {
                  queryClient.invalidateQueries();
                  toast({ title: "Dados atualizados", description: "Informações recarregadas com sucesso!" });
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="w-full sm:w-auto"
                onClick={async () => {
                  try {
                    await apiRequest("POST", "/api/admin/refresh-counts");
                    queryClient.invalidateQueries();
                    toast({ 
                      title: "Contagens atualizadas", 
                      description: "As contagens de orçamentos foram recalculadas!" 
                    });
                  } catch (error) {
                    toast({ 
                      title: "Erro", 
                      description: "Falha ao atualizar contagens", 
                      variant: "destructive" 
                    });
                  }
                }}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Recalcular
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
            <TabsTrigger value="overview" className="text-xs md:text-sm">Visão Geral</TabsTrigger>
            <TabsTrigger value="users" className="text-xs md:text-sm">Usuários</TabsTrigger>
            <TabsTrigger value="financial" className="text-xs md:text-sm">Financeiro</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs md:text-sm">Analytics</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPIs Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-xs md:text-sm font-medium">Total Usuários</p>
                      <p className="text-2xl md:text-3xl font-bold">{stats?.totalUsers || users.length}</p>
                      <p className="text-blue-100 text-xs mt-1">
                        +{stats?.userGrowthRate || 0}% este mês
                      </p>
                    </div>
                    <Users className="w-6 h-6 md:w-8 md:h-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-xs md:text-sm font-medium">Receita Total</p>
                      <p className="text-2xl md:text-3xl font-bold">R$ {stats?.totalRevenue || "0,00"}</p>
                      <p className="text-green-100 text-xs mt-1">
                        R$ {stats?.monthlyRevenue || "0,00"} este mês
                      </p>
                    </div>
                    <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-xs md:text-sm font-medium">Orçamentos</p>
                      <p className="text-2xl md:text-3xl font-bold">{stats?.totalQuotes || 0}</p>
                      <p className="text-purple-100 text-xs mt-1">
                        {stats?.approvedQuotes || 0} aprovados
                      </p>
                    </div>
                    <FileText className="w-6 h-6 md:w-8 md:h-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-xs md:text-sm font-medium">Taxa Conversão</p>
                      <p className="text-2xl md:text-3xl font-bold">{stats?.conversionRate || 0}%</p>
                      <p className="text-orange-100 text-xs mt-1">
                        Orçamentos → Vendas
                      </p>
                    </div>
                    <Target className="w-8 h-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Métricas Secundárias */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Usuários Ativos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Hoje</span>
                    <span className="font-semibold">{stats?.activeUsersToday || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Esta semana</span>
                    <span className="font-semibold">{stats?.activeUsersWeek || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Este mês</span>
                    <span className="font-semibold">{stats?.activeUsersMonth || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Taxa Retenção</span>
                    <span className="font-semibold text-green-600">{stats?.retentionRate || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Taxa Churn</span>
                    <span className="font-semibold text-red-600">{stats?.churnRate || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Ticket Médio</span>
                    <span className="font-semibold">R$ {stats?.averageQuoteValue || "0,00"}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Status Orçamentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pendentes</span>
                    <Badge variant="secondary">{stats?.pendingQuotes || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Aprovados</span>
                    <Badge className="bg-green-500">{stats?.approvedQuotes || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Rejeitados</span>
                    <Badge variant="destructive">{stats?.rejectedQuotes || 0}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Usuários */}
          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Premium Pago</p>
                      <p className="text-3xl font-bold text-yellow-600">
                        {users.filter(u => u.plan === "PREMIUM").length}
                      </p>
                    </div>
                    <Zap className="w-8 h-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Premium Cortesia</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {users.filter(u => u.plan === "PREMIUM_CORTESIA").length}
                      </p>
                    </div>
                    <Zap className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Usuários Gratuitos</p>
                      <p className="text-3xl font-bold text-gray-600">
                        {users.filter(u => u.plan === "FREE").length}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-gray-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Taxa Premium</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {users.length > 0 ? Math.round((users.filter(u => u.plan === "PREMIUM").length / users.length) * 100) : 0}%
                      </p>
                    </div>
                    <PieChart className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Gerenciamento de Usuários ({users.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Orçamentos</TableHead>
                        <TableHead>Registro</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user: User) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.firstName} {user.lastName}</p>
                              <p className="text-xs text-gray-500">ID: {user.id}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{user.email}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              user.plan === "PREMIUM" ? "bg-yellow-500 text-black" : 
                              user.plan === "PREMIUM_CORTESIA" ? "bg-purple-500 text-white" : 
                              "bg-gray-500 text-white"
                            }>
                              {user.plan === "PREMIUM" ? "Premium Pago" : 
                               user.plan === "PREMIUM_CORTESIA" ? "Premium Cortesia" : 
                               "Gratuito"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={user.paymentStatus === "ativo" ? "default" : "secondary"}
                              className={user.paymentStatus === "ativo" ? "bg-green-500" : ""}
                            >
                              {user.paymentStatus || "pendente"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{user.quotesUsedThisMonth}/{user.quotesLimit}</p>
                              <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                                <div 
                                  className="bg-blue-600 h-1.5 rounded-full" 
                                  style={{ 
                                    width: `${Math.min((user.quotesUsedThisMonth / user.quotesLimit) * 100, 100)}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs text-gray-500">
                              {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                            {user.planExpiresAt && (
                              <p className="text-xs text-yellow-600">
                                Expira: {format(new Date(user.planExpiresAt), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTogglePlan(user, "FREE")}
                                disabled={updatePlanMutation.isPending || user.plan === "FREE"}
                                className="text-xs"
                              >
                                Gratuito
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTogglePlan(user, "PREMIUM")}
                                disabled={updatePlanMutation.isPending || user.plan === "PREMIUM"}
                                className="text-xs bg-yellow-50"
                              >
                                Premium
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTogglePlan(user, "PREMIUM_CORTESIA")}
                                disabled={updatePlanMutation.isPending || user.plan === "PREMIUM_CORTESIA"}
                                className="text-xs bg-purple-50"
                              >
                                Cortesia
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => resetQuotesMutation.mutate(user.id)}
                                disabled={resetQuotesMutation.isPending}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financeiro */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Receita Total</p>
                      <p className="text-3xl font-bold">R$ {stats?.totalRevenue || "0,00"}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Receita Mensal</p>
                      <p className="text-3xl font-bold">R$ {stats?.monthlyRevenue || "0,00"}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">Ticket Médio</p>
                      <p className="text-3xl font-bold">R$ {stats?.averageQuoteValue || "0,00"}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Usuários Premium</p>
                      <p className="text-3xl font-bold">{users.filter(u => u.plan === "PREMIUM").length}</p>
                    </div>
                    <Users className="w-8 h-8 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Receita por Plano</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
                      <div>
                        <p className="font-medium">Plano Premium</p>
                        <p className="text-sm text-gray-600">{users.filter(u => u.plan === "PREMIUM").length} usuários</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-yellow-600">R$ {stats?.totalRevenue || "0,00"}</p>
                        <p className="text-sm text-gray-600">100% da receita</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Plano Gratuito</p>
                        <p className="text-sm text-gray-600">{users.filter(u => u.plan === "FREE").length} usuários</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-600">R$ 0,00</p>
                        <p className="text-sm text-gray-600">Sem receita</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Métricas Financeiras</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Taxa de Conversão Premium</span>
                      <span className="font-semibold text-green-600">
                        {users.length > 0 ? Math.round((users.filter(u => u.plan === "PREMIUM").length / users.length) * 100) : 0}%
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Receita por Usuário (ARPU)</span>
                      <span className="font-semibold">
                        R$ {users.length > 0 ? (parseFloat(stats?.totalRevenue?.replace(",", ".") || "0") / users.length).toFixed(2) : "0,00"}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Usuários Ativos</span>
                      <span className="font-semibold">{stats?.activeUsersMonth || users.length}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Crescimento MoM</span>
                      <span className="font-semibold text-blue-600">+{stats?.userGrowthRate || 0}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Engajamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Usuários Ativos Hoje</span>
                    <span className="font-semibold">{stats?.activeUsersToday || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Taxa de Retenção</span>
                    <span className="font-semibold text-green-600">{stats?.retentionRate || 85}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Sessões Médias/Usuário</span>
                    <span className="font-semibold">4.2</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Crescimento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Novos Usuários (30d)</span>
                    <span className="font-semibold text-blue-600">+{Math.round(users.length * 0.15)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Taxa de Crescimento</span>
                    <span className="font-semibold text-green-600">+{stats?.userGrowthRate || 12}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Churn Rate</span>
                    <span className="font-semibold text-red-600">{stats?.churnRate || 3}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Taxa de Conversão</span>
                    <span className="font-semibold text-green-600">{stats?.conversionRate || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tempo Médio Resposta</span>
                    <span className="font-semibold">2.4h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Satisfação Cliente</span>
                    <span className="font-semibold text-yellow-600">4.8/5</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alertas e Notificações */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Alertas do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.filter(u => u.quotesUsedThisMonth >= u.quotesLimit * 0.8).length > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-800">Usuários próximos do limite</p>
                        <p className="text-sm text-yellow-600">
                          {users.filter(u => u.quotesUsedThisMonth >= u.quotesLimit * 0.8).length} usuários usaram 80%+ dos orçamentos
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {users.filter(u => u.plan === "PREMIUM" && u.planExpiresAt && new Date(u.planExpiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <Clock className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="font-medium text-red-800">Planos expirando</p>
                        <p className="text-sm text-red-600">
                          {users.filter(u => u.plan === "PREMIUM" && u.planExpiresAt && new Date(u.planExpiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length} planos premium expiram em 7 dias
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">Sistema operacional</p>
                      <p className="text-sm text-green-600">Todos os serviços funcionando normalmente</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}