import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LoadingSpinner from "@/components/common/loading-spinner";
import Header from "@/components/layout/header";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  Eye, 
  Edit, 
  FileText,
  Trash2
} from "lucide-react";
import type { Client } from "@/types";

export default function Clients() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

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

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients", searchTerm],
    retry: false,
  });

  const createClientMutation = useMutation({
    mutationFn: async (clientData: any) => {
      await apiRequest("POST", "/api/clients", clientData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Sucesso",
        description: "Cliente criado com sucesso!",
      });
      setIsNewClientModalOpen(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Erro",
        description: "Erro ao criar cliente. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await apiRequest("DELETE", `/api/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Sucesso",
        description: "Cliente removido com sucesso!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Erro",
        description: "Erro ao remover cliente. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleCreateClient = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const clientData = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      cpf: formData.get('cpf') as string,
      address: formData.get('address') as string,
      number: formData.get('number') as string,
      complement: formData.get('complement') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      zipCode: formData.get('zipCode') as string,
      notes: formData.get('notes') as string,
    };
    createClientMutation.mutate(clientData);
  };

  const handleDeleteClient = (clientId: string) => {
    if (confirm('Tem certeza que deseja remover este cliente?')) {
      deleteClientMutation.mutate(clientId);
    }
  };

  // Função para formatar telefone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  // Função para formatar CPF
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  // Função para buscar endereço por CEP
  const handleCEPChange = async (cep: string, form: HTMLFormElement) => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          const addressInput = form.querySelector('input[name="address"]') as HTMLInputElement;
          const cityInput = form.querySelector('input[name="city"]') as HTMLInputElement;
          const stateInput = form.querySelector('input[name="state"]') as HTMLInputElement;
          
          if (addressInput && data.logradouro) {
            addressInput.value = data.bairro ? `${data.logradouro}, ${data.bairro}` : data.logradouro;
            addressInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (cityInput && data.localidade) {
            cityInput.value = data.localidade;
            cityInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (stateInput && data.uf) {
            stateInput.value = data.uf;
            stateInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        toast({
          title: "Erro",
          description: "Não foi possível buscar o endereço pelo CEP.",
          variant: "destructive",
        });
      }
    }
  };

  if (authLoading || isLoading) {
    return <LoadingSpinner />;
  }

  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  ) || [];

  return (
    <div className="space-y-6">
      <Header 
        title="Clientes" 
        subtitle="Gerencie seus clientes"
      />

      {/* Novo Cliente Button */}
      <div className="flex justify-end px-4 md:px-0">
        <Dialog open={isNewClientModalOpen} onOpenChange={setIsNewClientModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 text-white hover:bg-blue-700 w-full md:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
              <DialogDescription>
                Adicione um novo cliente preenchendo as informações abaixo
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateClient} className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome *</label>
                  <Input name="name" required placeholder="Nome completo" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">E-mail</label>
                  <Input name="email" type="email" placeholder="email@exemplo.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Telefone *</label>
                  <Input 
                    name="phone" 
                    required 
                    placeholder="(00) 00000-0000"
                    onChange={(e) => {
                      e.target.value = formatPhone(e.target.value);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">CPF</label>
                  <Input 
                    name="cpf" 
                    placeholder="000.000.000-00"
                    onChange={(e) => {
                      e.target.value = formatCPF(e.target.value);
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">CEP</label>
                <Input 
                  name="zipCode" 
                  placeholder="00000-000"
                  onChange={(e) => {
                    const form = e.target.closest('form') as HTMLFormElement;
                    handleCEPChange(e.target.value, form);
                  }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Endereço</label>
                  <Input name="address" placeholder="Rua, avenida, praça" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Número</label>
                  <Input name="number" placeholder="123" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Complemento</label>
                <Input name="complement" placeholder="Apto, casa, bloco, etc." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Cidade</label>
                  <Input name="city" placeholder="Cidade" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Estado</label>
                  <Input name="state" placeholder="SP" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Observações</label>
                <textarea
                  name="notes"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  rows={3}
                  placeholder="Notas sobre o cliente..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setIsNewClientModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="brand-gradient text-white" disabled={createClientMutation.isPending}>
                  {createClientMutation.isPending ? "Criando..." : "Criar Cliente"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de Edição de Cliente */}
        <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
            </DialogHeader>
            {editingClient && (
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const clientData = {
                  name: formData.get('name') as string,
                  email: formData.get('email') as string,
                  phone: formData.get('phone') as string,
                  cpf: formData.get('cpf') as string,
                  address: formData.get('address') as string,
                  number: formData.get('number') as string,
                  complement: formData.get('complement') as string,
                  city: formData.get('city') as string,
                  state: formData.get('state') as string,
                  zipCode: formData.get('zipCode') as string,
                  notes: formData.get('notes') as string,
                };
                // Implementar updateClientMutation
                console.log('Editando cliente:', clientData);
                setEditingClient(null);
              }} className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nome *</label>
                    <Input name="name" required placeholder="Nome completo" defaultValue={editingClient.name} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">E-mail</label>
                    <Input name="email" type="email" placeholder="email@exemplo.com" defaultValue={editingClient.email || ''} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Telefone *</label>
                    <Input 
                      name="phone" 
                      required 
                      placeholder="(00) 00000-0000"
                      defaultValue={editingClient.phone}
                      onChange={(e) => {
                        e.target.value = formatPhone(e.target.value);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">CPF</label>
                    <Input 
                      name="cpf" 
                      placeholder="000.000.000-00"
                      defaultValue={editingClient.cpf || ''}
                      onChange={(e) => {
                        e.target.value = formatCPF(e.target.value);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">CEP</label>
                  <Input 
                    name="zipCode" 
                    placeholder="00000-000"
                    defaultValue={editingClient.zipCode || ''}
                    onChange={(e) => {
                      const form = e.target.closest('form') as HTMLFormElement;
                      handleCEPChange(e.target.value, form);
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Endereço</label>
                    <Input name="address" placeholder="Rua, avenida, praça" defaultValue={editingClient.address || ''} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Número</label>
                    <Input name="number" placeholder="123" defaultValue={editingClient.number || ''} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Complemento</label>
                  <Input name="complement" placeholder="Apto, casa, bloco, etc." defaultValue={editingClient.complement || ''} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Cidade</label>
                    <Input name="city" placeholder="Cidade" defaultValue={editingClient.city || ''} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Estado</label>
                    <Input name="state" placeholder="SP" defaultValue={editingClient.state || ''} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Observações</label>
                  <textarea
                    name="notes"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    rows={3}
                    placeholder="Notas sobre o cliente..."
                    defaultValue={editingClient.notes || ''}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setEditingClient(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="brand-gradient text-white">
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="mx-4 md:mx-0">
        <Card className="bg-white shadow-lg">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar clientes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <select className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary text-sm">
                  <option>Todos os clientes</option>
                  <option>Clientes ativos</option>
                  <option>Últimos 30 dias</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <div className="mx-4 md:mx-0">
        <Card className="bg-white shadow-lg">
          <CardContent className="p-0">
            {filteredClients.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm 
                    ? "Tente ajustar os termos de busca" 
                    : "Adicione seu primeiro cliente para começar"
                  }
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsNewClientModalOpen(true)} className="brand-gradient text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Cliente
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="hidden md:table-header-group">
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Orçamentos</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id} className="hover:bg-gray-50">
                        {/* Desktop view */}
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center mr-3">
                              <span className="text-brand-primary font-semibold">
                                {client.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{client.name}</p>
                              <p className="text-sm text-gray-600">
                                Cliente desde {new Date(client.createdAt || '').getFullYear()}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="space-y-1">
                            {client.email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span>{client.email}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{client.phone}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {client.city && client.state ? (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span>{client.city}, {client.state}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {client.quoteCount || 0} orçamentos
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              title="Ver perfil"
                              onClick={() => setLocation(`/clients/${client.id}`)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              title="Editar"
                              onClick={() => setEditingClient(client)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              title="Novo orçamento"
                              onClick={() => setLocation(`/new-quote?clientId=${client.id}`)}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              title="Excluir"
                              onClick={() => handleDeleteClient(client.id)}
                              disabled={deleteClientMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>

                        {/* Mobile view - single cell with card layout */}
                        <TableCell className="md:hidden" colSpan={5}>
                          <div className="p-3 space-y-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-brand-primary font-semibold">
                                    {client.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800">{client.name}</p>
                                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    {client.quoteCount || 0} orçamentos
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              {client.email && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Mail className="w-4 h-4 text-gray-400" />
                                  <span>{client.email}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span>{client.phone}</span>
                              </div>
                              {client.city && client.state && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <MapPin className="w-4 h-4 text-gray-400" />
                                  <span>{client.city}, {client.state}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 pt-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => setLocation(`/clients/${client.id}`)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => setEditingClient(client)}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => setLocation(`/new-quote?clientId=${client.id}`)}
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                Orçar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => handleDeleteClient(client.id)}
                                disabled={deleteClientMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4 mr-1 text-red-500" />
                                Excluir
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pagination */}
      {filteredClients.length > 10 && (
        <div className="flex items-center justify-between mx-4 md:mx-0">
          <p className="text-sm text-gray-600">
            Mostrando 1-{Math.min(10, filteredClients.length)} de {filteredClients.length} clientes
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              Anterior
            </Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-700" size="sm">
              1
            </Button>
            <Button variant="outline" size="sm" disabled>
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
