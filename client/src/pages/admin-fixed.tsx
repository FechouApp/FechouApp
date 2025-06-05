import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Users, 
  Shield, 
  RefreshCw, 
  Settings, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Filter,
  Search
} from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  businessName?: string;
  plan: string;
  paymentStatus: string;
  paymentMethod?: string;
  quotesUsedThisMonth: number;
  quotesLimit: number;
  createdAt: string;
  lastLoginAt?: string;
  planExpiresAt?: string;
}

export default function AdminPanel() {
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (data: { userId: string; plan: string; paymentStatus: string; paymentMethod?: string }) => {
      return await apiRequest("PATCH", `/api/admin/users/${data.userId}/plan`, {
        plan: data.plan,
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod,
      });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Plano do usuário atualizado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você não tem permissão para acessar esta área.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao atualizar plano do usuário.",
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
        description: "Contagem de orçamentos resetada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você não tem permissão para acessar esta área.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Erro",
        description: "Falha ao resetar contagem de orçamentos.",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter((user: User) => {
    const matchesPlan = filterPlan === "all" || user.plan === filterPlan;
    const matchesPayment = filterPayment === "all" || user.paymentStatus === filterPayment;
    const matchesSearch = !searchTerm || 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.businessName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesPlan && matchesPayment && matchesSearch;
  });

  const totalUsers = users.length;
  const premiumUsers = users.filter((user: User) => user.plan === "PREMIUM").length;
  const freeUsers = users.filter((user: User) => user.plan === "FREE").length;
  const activePayments = users.filter((user: User) => user.paymentStatus === "ativo").length;
  const pendingPayments = users.filter((user: User) => user.paymentStatus === "pendente").length;
  const expiredPayments = users.filter((user: User) => user.paymentStatus === "vencido").length;

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "ativo": return "bg-green-500";
      case "pendente": return "bg-yellow-500";
      case "vencido": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getPlanColor = (plan: string) => {
    return plan === "PREMIUM" ? "bg-yellow-500 text-black" : "bg-gray-500 text-white";
  };

  const handleUpdateUser = (plan: string, paymentStatus: string, paymentMethod: string) => {
    if (!selectedUser) return;
    
    updatePlanMutation.mutate({
      userId: selectedUser.id,
      plan,
      paymentStatus,
      paymentMethod: paymentMethod === "none" ? undefined : paymentMethod,
    });
  };

  if (isLoading) {
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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Painel Administrativo</h1>
              <p className="text-gray-600">Gerenciamento de usuários e planos - Fechou!</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
                  <p className="text-3xl font-bold text-gray-900">{totalUsers}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Usuários Premium</p>
                  <p className="text-3xl font-bold text-yellow-600">{premiumUsers}</p>
                  <p className="text-xs text-gray-500">{freeUsers} usuários gratuitos</p>
                </div>
                <TrendingUp className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pagamentos Ativos</p>
                  <p className="text-3xl font-bold text-green-600">{activePayments}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pendentes/Vencidos</p>
                  <p className="text-3xl font-bold text-red-600">{pendingPayments + expiredPayments}</p>
                  <p className="text-xs text-gray-500">{pendingPayments} pendentes, {expiredPayments} vencidos</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros e Busca
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Buscar usuário</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Email, nome ou empresa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="filterPlan">Filtrar por plano</Label>
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os planos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os planos</SelectItem>
                    <SelectItem value="FREE">Gratuito</SelectItem>
                    <SelectItem value="PREMIUM">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filterPayment">Status de pagamento</Label>
                <Select value={filterPayment} onValueChange={setFilterPayment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFilterPlan("all");
                    setFilterPayment("all");
                    setSearchTerm("");
                  }}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usuários Cadastrados ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status Pagamento</TableHead>
                    <TableHead>Orçamentos</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user: User) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          {user.businessName && (
                            <p className="text-xs text-gray-400">{user.businessName}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {user.phone && <p className="text-sm">{user.phone}</p>}
                          {user.lastLoginAt ? (
                            <p className="text-xs text-gray-500">
                              Último login: {new Date(user.lastLoginAt).toLocaleDateString('pt-BR')}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400">Nunca logou</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge className={getPlanColor(user.plan)}>
                            {user.plan === "PREMIUM" ? "Premium" : "Gratuito"}
                          </Badge>
                          {user.planExpiresAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              Expira: {new Date(user.planExpiresAt).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge className={`${getPaymentStatusColor(user.paymentStatus)} text-white`}>
                            {user.paymentStatus}
                          </Badge>
                          {user.paymentMethod && (
                            <p className="text-xs text-gray-500 mt-1">{user.paymentMethod}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.quotesUsedThisMonth}/{user.quotesLimit}</p>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
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
                        <p className="text-sm">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog open={isDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (!open) setSelectedUser(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsDialogOpen(true);
                                }}
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Gerenciar Usuário</DialogTitle>
                                <DialogDescription>
                                  Edite o plano e status de pagamento do usuário selecionado
                                </DialogDescription>
                              </DialogHeader>
                              <UserEditForm 
                                user={user} 
                                onUpdate={handleUpdateUser}
                                onCancel={() => setIsDialogOpen(false)}
                                isLoading={updatePlanMutation.isPending}
                              />
                            </DialogContent>
                          </Dialog>

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
      </div>
    </div>
  );
}

function UserEditForm({ 
  user, 
  onUpdate, 
  onCancel, 
  isLoading 
}: { 
  user: User; 
  onUpdate: (plan: string, paymentStatus: string, paymentMethod: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [plan, setPlan] = useState(user.plan);
  const [paymentStatus, setPaymentStatus] = useState(user.paymentStatus);
  const [paymentMethod, setPaymentMethod] = useState(user.paymentMethod || "none");

  return (
    <div className="space-y-4">
      <div>
        <Label>Usuário</Label>
        <p className="text-sm text-gray-600">
          {user.firstName} {user.lastName} ({user.email})
        </p>
      </div>
      
      <div>
        <Label htmlFor="plan">Plano</Label>
        <Select value={plan} onValueChange={setPlan}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FREE">Gratuito</SelectItem>
            <SelectItem value="PREMIUM">Premium</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="paymentStatus">Status de Pagamento</Label>
        <Select value={paymentStatus} onValueChange={setPaymentStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="paymentMethod">Método de Pagamento</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Não especificado</SelectItem>
            <SelectItem value="pix">PIX</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="asaas">Asaas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button 
          onClick={() => onUpdate(plan, paymentStatus, paymentMethod)}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? "Atualizando..." : "Atualizar"}
        </Button>
        <Button 
          variant="outline"
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}