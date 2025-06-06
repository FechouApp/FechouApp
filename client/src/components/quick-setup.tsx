import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Settings } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function QuickSetup() {
  const { toast } = useToast();

  // Removed automatic sample client creation

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
          Para começar a criar orçamentos, você precisa ter pelo menos um cliente cadastrado.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild className="flex items-center gap-2">
            <a href="/clients" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Cadastrar Novo Cliente
            </a>
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