import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Settings } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function QuickSetup() {
  const { toast } = useToast();

  const createSampleClientsMutation = useMutation({
    mutationFn: async () => {
      const sampleClients = [
        {
          name: "João Silva",
          email: "joao.silva@email.com",
          phone: "(11) 99999-1234",
          address: "Rua das Flores, 123",
          city: "São Paulo",
          state: "SP",
          zipCode: "01234-567",
          notes: "Cliente frequente, prefere orçamentos detalhados"
        },
        {
          name: "Maria Santos",
          email: "maria.santos@email.com", 
          phone: "(11) 98888-5678",
          address: "Av. Paulista, 456",
          city: "São Paulo",
          state: "SP",
          zipCode: "01311-000",
          notes: "Trabalhos de reforma residencial"
        },
        {
          name: "Carlos Ferreira",
          email: "carlos.ferreira@email.com",
          phone: "(11) 97777-9012",
          address: "Rua Augusta, 789",
          city: "São Paulo", 
          state: "SP",
          zipCode: "01305-100",
          notes: "Serviços elétricos comerciais"
        }
      ];

      for (const client of sampleClients) {
        await apiRequest("/api/clients", "POST", client);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Clientes criados!",
        description: "3 clientes de exemplo foram adicionados. Agora você pode criar orçamentos.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar os clientes de exemplo.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Settings className="w-5 h-5" />
          Configuração Rápida
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-700">
          Para começar a criar orçamentos, você precisa ter alguns clientes cadastrados.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => createSampleClientsMutation.mutate()}
            disabled={createSampleClientsMutation.isPending}
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            {createSampleClientsMutation.isPending ? "Criando..." : "Criar Clientes de Exemplo"}
          </Button>
          
          <Button variant="outline" asChild>
            <a href="/clients" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Gerenciar Clientes
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}