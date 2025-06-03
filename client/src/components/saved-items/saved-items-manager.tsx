
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Star, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SavedItem, CreateSavedItemRequest } from "@/types";

interface SavedItemsManagerProps {
  onSelectItem?: (item: SavedItem) => void;
  selectionMode?: boolean;
}

export default function SavedItemsManager({ onSelectItem, selectionMode = false }: SavedItemsManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<SavedItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    unitPrice: "",
  });

  const isPremium = (user as any)?.plan === "PREMIUM";
  const maxItems = isPremium ? 15 : 3;

  const { data: savedItems = [], isLoading } = useQuery<SavedItem[]>({
    queryKey: ["/api/saved-items"],
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateSavedItemRequest) => {
      await apiRequest("POST", "/api/saved-items", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-items"] });
      setFormData({ name: "", unitPrice: "" });
      setIsDialogOpen(false);
      toast({
        title: "Item salvo!",
        description: "Item adicionado aos seus favoritos.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar item.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateSavedItemRequest> }) => {
      await apiRequest("PUT", `/api/saved-items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-items"] });
      setEditingItem(null);
      setFormData({ name: "", unitPrice: "" });
      setIsDialogOpen(false);
      toast({
        title: "Item atualizado!",
        description: "Item foi atualizado com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao atualizar item.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/saved-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-items"] });
      toast({
        title: "Item removido!",
        description: "Item removido dos seus favoritos.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover item.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.unitPrice) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (item: SavedItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      unitPrice: item.unitPrice,
    });
    setIsDialogOpen(true);
  };

  const handleNewItem = () => {
    setEditingItem(null);
    setFormData({ name: "", unitPrice: "" });
    setIsDialogOpen(true);
  };

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-gray-500">Carregando itens salvos...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5" />
          {selectionMode ? "Selecionar Item Salvo" : "Meus Itens Salvos"}
          <Badge variant="outline" className="ml-2">
            {savedItems.length}/{maxItems}
          </Badge>
        </CardTitle>
        
        {!selectionMode && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={handleNewItem}
                disabled={savedItems.length >= maxItems}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Item
                {!isPremium && savedItems.length >= maxItems && (
                  <Crown className="w-4 h-4 ml-2" />
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar Item" : "Novo Item Favorito"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Item</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Instalação de tomada"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="unitPrice">Preço Unitário (R$)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: e.target.value }))}
                    placeholder="75.00"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingItem ? "Atualizar" : "Salvar"} Item
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      
      <CardContent>
        {savedItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Star className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="mb-2">Nenhum item salvo ainda</p>
            <p className="text-sm">Salve itens que você usa frequentemente nos orçamentos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm text-gray-600">{formatCurrency(item.unitPrice)}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectionMode && onSelectItem && (
                    <Button
                      size="sm"
                      onClick={() => onSelectItem(item)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Inserir
                    </Button>
                  )}
                  
                  {!selectionMode && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!isPremium && savedItems.length >= maxItems && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <Crown className="w-4 h-4 inline mr-1" />
              Para salvar mais itens, faça upgrade para o plano Pro.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
