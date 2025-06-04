import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Users, 
  Shield, 
  CreditCard, 
  RefreshCw, 
  Settings, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  UserCheck,
  UserX
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
  const [filterPlan, setFilterPlan] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editPlan, setEditPlan] = useState("");
  const [editPaymentStatus, setEditPaymentStatus] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  // Update user plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async (data: { userId: string; plan: string; paymentStatus: string; paymentMethod?: string | null }) => {
      console.log("=== MUTATION START ===");
      console.log("Mutation called with data:", data);

      try {
        const requestBody = {
          plan: data.plan,
          paymentStatus: data.paymentStatus,
          paymentMethod: data.paymentMethod,
        };

        console.log("Request body:", requestBody);
        console.log("API endpoint:", `/api/admin/users/${data.userId}/plan`);

        const response = await apiRequest(`/api/admin/users/${data.userId}/plan`, "PATCH", requestBody);

        console.log("API response received:", response);
        console.log("=== MUTATION SUCCESS ===");

        return response;
      } catch (error: any) {
        console.error("=== MUTATION ERROR ===");
        console.error("API request failed:", error);
        console.error("Error details:", {
          message: error?.message,
          response: error?.response?.data,
          status: error?.response?.status
        });
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("=== MUTATION onSuccess ===");
      console.log("Success data:", data);

      toast({
        title: "Sucesso!",
        description: "Plano do usuário atualizado com sucesso!",
      });

      // Refresh data and close dialog
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsDialogOpen(false);
      setSelectedUser(null);
      setEditPlan("");
      setEditPaymentStatus("");
      setEditPaymentMethod("");
    },
    onError: (error: any) => {
      console.error("=== MUTATION onError ===");
      console.error("Error object:", error);

      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Você não tem permissão para realizar esta ação.",
          variant: "destructive",
        });
        return;
      }

      // Extract error message from different possible locations
      let errorMessage = "Falha ao atualizar plano do usuário.";

      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      console.error("Final error message:", errorMessage);

      toast({
        title: "Erro ao Atualizar",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Reset quotes mutation
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

  // Filter users based on criteria
  const filteredUsers = users.filter((user: User) => {
    const matchesPlan = !filterPlan || filterPlan === "all" || user.plan === filterPlan;
    const matchesPayment = !filterPayment || filterPayment === "all" || user.paymentStatus === filterPayment;
    const matchesSearch = !searchTerm || 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.businessName?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesPlan && matchesPayment && matchesSearch;
  });

  // Calculate stats
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

  const handleUpdatePlan = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    console.log("=== FORM SUBMIT START ===");
    console.log("Selected user:", selectedUser?.id);
    console.log("Form values:", { editPlan, editPaymentStatus, editPaymentMethod });

    if (!selectedUser) {
      console.log("ERROR: No user selected");
      toast({
        title: "Erro",
        description: "Nenhum usuário selecionado.",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!editPlan || !editPaymentStatus) {
      console.log("ERROR: Missing required fields");
      toast({
        title: "Erro",
        description: "Plano e status de pagamento são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Validate plan value
    const validPlans = ["FREE", "PREMIUM"];
    if (!validPlans.includes(editPlan.toUpperCase())) {
      console.log("ERROR: Invalid plan:", editPlan);
      toast({
        title: "Erro",
        description: "Plano deve ser FREE ou PREMIUM.",
        variant: "destructive",
      });
      return;
    }

    // Validate payment status
    const validStatuses = ["ativo", "pendente", "vencido"];
    if (!validStatuses.includes(editPaymentStatus.toLowerCase())) {
      console.log("ERROR: Invalid payment status:", editPaymentStatus);
      toast({
        title: "Erro",
        description: "Status deve ser ativo, pendente ou vencido.",
        variant: "destructive",
      });
      return;
    }

    // Prepare mutation data
    const mutationData = {
      userId: selectedUser.id,
      plan: editPlan.toUpperCase(),
      paymentStatus: editPaymentStatus.toLowerCase(),
      paymentMethod: editPaymentMethod && editPaymentMethod.trim() !== "" ? editPaymentMethod.trim() : null,
    };

    console.log("Mutation data:", mutationData);
    console.log("=== CALLING MUTATION ===");

    updatePlanMutation.mutate(mutationData);
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
        {/* Header */}
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

        {/* Stats Cards */}
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

        {/* Filters */}
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

        {/* Users Table */}
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
                            {user.plan === "PREMIUM" ? "Premium" : user.plan === "PREMIUM_CORTESIA" ? "Premium Cortesia" : "Gratuito"}
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
                            if (!open) {
                              setSelectedUser(null);
                              setEditPlan("");
                              setEditPaymentStatus("");
                              setEditPaymentMethod("");
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditPlan(user.plan);
                                  setEditPaymentStatus(user.paymentStatus);
                                  setEditPaymentMethod(user.paymentMethod || "");
                                  setIsDialogOpen(true);
                                }}
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Gerenciar Usuário</DialogTitle>
                              </DialogHeader>
                              {selectedUser && (
                                <form onSubmit={handleUpdatePlan} className="space-y-4">
                                  <div>
                                    <Label>Usuário</Label>
                                    <p className="text-sm text-gray-600">
                                      {selectedUser.firstName} {selectedUser.lastName} ({selectedUser.email})
                                    </p>
                                  </div>

                                  <div>
                                    <Label htmlFor="plan">Plano</Label>
                                    <Select value={editPlan} onValueChange={setEditPlan}>
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
                                    <Select value={editPaymentStatus} onValueChange={setEditPaymentStatus}>
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
                                    <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecione um método" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="">Não especificado</SelectItem>
                                        <SelectItem value="pix">PIX</SelectItem>
                                        <SelectItem value="manual">Manual</SelectItem>
                                        <SelectItem value="asaas">Asaas</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="flex gap-2">
                                    <Button 
                                      type="submit"
                                      disabled={updatePlanMutation.isPending}
                                      className="flex-1"
                                    >
                                      {updatePlanMutation.isPending ? "Atualizando..." : "Atualizar"}
                                    </Button>
                                    <Button 
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        setIsDialogOpen(false);
                                        setSelectedUser(null);
                                        setEditPlan("");
                                        setEditPaymentStatus("");
                                        setEditPaymentMethod("");
                                      }}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </form>
                              )}
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