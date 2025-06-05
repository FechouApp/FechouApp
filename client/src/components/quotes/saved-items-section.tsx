import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { 
  Plus, Save, Edit2, Trash2, Package, 
  AlertCircle, CheckCircle 
} from "lucide-react";

interface SavedItem {
  id: string;
  name: string;
  unitPrice: string;
  description?: string;
}

interface SavedItemsSectionProps {
  onAddItem: (item: { description: string; unitPrice: string; quantity: number }) => void;
}

export default function SavedItemsSection({ onAddItem }: SavedItemsSectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SavedItem | null>(null);
  const [newItemForm, setNewItemForm] = useState({
    name: "",
    unitPrice: "",
    description: ""
  });

  const { data: savedItems = [], isLoading } = useQuery<SavedItem[]>({
    queryKey: ["/api/saved-items"],
    retry: false,
  });

  const createItemMutation = useMutation({
    mutationFn: async (itemData: { name: string; unitPrice: string; description?: string }) => {
      return await apiRequest("/api/saved-items", "POST", itemData);
    },
    onSuccess: () => {
      toast({
        title: "Item salvo",
        description: "Item adicionado aos seus favoritos!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-items"] });
      setNewItemForm({ name: "", unitPrice: "", description: "" });
      setIsNewItemDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; unitPrice: string; description?: string }) => {
      return await apiRequest(`/api/saved-items/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      toast({
        title: "Item atualizado",
        description: "Alterações salvas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-items"] });
      setEditingItem(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/saved-items/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Item removido",
        description: "Item excluído dos seus favoritos.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-items"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateItem = () => {
    if (!newItemForm.name.trim() || !newItemForm.unitPrice.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e valor unitário são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    // Verificar limite baseado no plano
    const maxItems = user?.plan === "PREMIUM" || user?.plan === "PREMIUM_CORTESIA" ? 15 : 3;
    if (savedItems.length >= maxItems) {
      toast({
        title: "Limite atingido",
        description: `Você pode salvar até ${maxItems} itens no seu plano.`,
        variant: "destructive",
      });
      return;
    }

    createItemMutation.mutate(newItemForm);
  };

  const handleUpdateItem = () => {
    if (!editingItem || !newItemForm.name.trim() || !newItemForm.unitPrice.trim()) {
      return;
    }

    updateItemMutation.mutate({
      id: editingItem.id,
      ...newItemForm
    });
  };

  const handleAddToQuote = (item: SavedItem) => {
    onAddItem({
      description: item.name,
      unitPrice: item.unitPrice,
      quantity: 1
    });

    toast({
      title: "Item adicionado",
      description: `${item.name} foi adicionado ao orçamento.`,
    });
  };

  const startEdit = (item: SavedItem) => {
    setEditingItem(item);
    setNewItemForm({
      name: item.name,
      unitPrice: item.unitPrice,
      description: item.description || ""
    });
    setIsNewItemDialogOpen(true);
  };

  const resetForm = () => {
    setNewItemForm({ name: "", unitPrice: "", description: "" });
    setEditingItem(null);
    setIsNewItemDialogOpen(false);
  };

  // Determinar limite baseado no plano
  const maxItems = user?.plan === "PREMIUM" || user?.plan === "PREMIUM_CORTESIA" ? 15 : 3;
  const canAddMore = savedItems.length < maxItems;

  return (
    <Card className="bg-gray-50 border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">Itens Favoritos Salvos</CardTitle>
            <Badge variant="outline" className="text-xs">
              {savedItems.length}/{maxItems}
            </Badge>
          </div>

          <Dialog open={isNewItemDialogOpen} onOpenChange={setIsNewItemDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                disabled={!canAddMore}
                onClick={() => resetForm()}
              >
                <Plus className="w-4 h-4 mr-1" />
                Novo Item Favorito
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? "Editar Item" : "Novo Item Salvo"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="itemName">Nome do Item *</Label>
                  <Input
                    id="itemName"
                    value={newItemForm.name}
                    onChange={(e) => setNewItemForm({...newItemForm, name: e.target.value})}
                    placeholder="Ex: Desenvolvimento de Logo"
                  />
                </div>

                <div>
                  <Label htmlFor="itemPrice">Valor Unitário *</Label>
                  <Input
                    id="itemPrice"
                    value={newItemForm.unitPrice}
                    onChange={(e) => setNewItemForm({...newItemForm, unitPrice: e.target.value})}
                    placeholder="Ex: 250,00"
                  />
                </div>

                <div>
                  <Label htmlFor="itemDescription">Descrição (opcional)</Label>
                  <Input
                    id="itemDescription"
                    value={newItemForm.description}
                    onChange={(e) => setNewItemForm({...newItemForm, description: e.target.value})}
                    placeholder="Descrição adicional do serviço"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={editingItem ? handleUpdateItem : handleCreateItem}
                    disabled={createItemMutation.isPending || updateItemMutation.isPending}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingItem ? "Atualizar" : "Salvar Item"}
                  </Button>

                  <Button variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!canAddMore && (
          <div className="flex items-center gap-2 text-amber-600 text-sm mt-2">
            <AlertCircle className="w-4 h-4" />
            Limite de {maxItems} itens atingido
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            Carregando itens salvos...
          </div>
        ) : savedItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Nenhum item salvo ainda</p>
            <p className="text-sm">Clique em "Novo Item Favorito" para começar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedItems.map((item) => (
              <div 
                key={item.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border hover:shadow-sm transition-shadow"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      R$ {item.unitPrice}
                    </Badge>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddToQuote(item)}
                    className="bg-green-50 hover:bg-green-100 border-green-200"
                  >
                    <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                    Adicionar
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(item)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteItemMutation.mutate(item.id)}
                    disabled={deleteItemMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}