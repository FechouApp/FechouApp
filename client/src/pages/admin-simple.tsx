import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, Users, Settings, RefreshCw } from "lucide-react";

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
}

export default function AdminPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ userId, newPlan }: { userId: string; newPlan: string }) => {
      return await apiRequest(`/api/admin/users/${userId}/plan`, "PATCH", {
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
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar plano.",
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
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao resetar orçamentos.",
        variant: "destructive",
      });
    },
  });

  const handleTogglePlan = (user: User) => {
    const newPlan = user.plan === "FREE" ? "PREMIUM" : "FREE";
    updatePlanMutation.mutate({ userId: user.id, newPlan });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
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
              <p className="text-gray-600">Gerenciar usuários e planos</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Usuários</p>
                  <p className="text-3xl font-bold text-gray-900">{users.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Premium</p>
                  <p className="text-3xl font-bold text-yellow-600">
                    {users.filter(u => u.plan === "PREMIUM").length}
                  </p>
                </div>
                <Settings className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gratuitos</p>
                  <p className="text-3xl font-bold text-green-600">
                    {users.filter(u => u.plan === "FREE").length}
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuários ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Orçamentos</TableHead>
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
                        <Badge className={user.plan === "PREMIUM" ? "bg-yellow-500 text-black" : "bg-gray-500 text-white"}>
                          {user.plan === "PREMIUM" ? "Premium" : "Gratuito"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{user.quotesUsedThisMonth}/{user.quotesLimit}</p>
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
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTogglePlan(user)}
                            disabled={updatePlanMutation.isPending}
                          >
                            {user.plan === "FREE" ? "→ Premium" : "→ Gratuito"}
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
      </div>
    </div>
  );
}