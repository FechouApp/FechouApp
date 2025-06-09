import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Calendar, 
  User, 
  Mail, 
  Phone,
  DollarSign,
  CheckCircle
} from "lucide-react";
import { useLocation } from "wouter";
import BackButton from "@/components/common/back-button";
import LoadingSpinner from "@/components/common/loading-spinner";

export default function ReceiptView() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data: receipt, isLoading, error } = useQuery({
    queryKey: [`/api/quotes/${id}/receipt`],
    enabled: !!id,
  });

  const handleDownloadPDF = () => {
    if (id) {
      window.open(`/api/quotes/${id}/receipt/pdf`, '_blank');
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !receipt) {
    return (
      <div className="container mx-auto p-6">
        <BackButton />
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Recibo não encontrado</h2>
          <p className="text-gray-600 mb-4">Este recibo não existe ou não está disponível.</p>
          <Button onClick={() => setLocation('/quotes')}>
            Voltar aos Orçamentos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <BackButton />
      </div>

      {/* Header com status de pagamento */}
      <Card className="mb-6 border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-green-800">Pagamento Confirmado</h1>
                <p className="text-green-600">Recibo de pagamento gerado com sucesso</p>
              </div>
            </div>
            <Badge className="bg-green-600 text-white">
              PAGO
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Informações do recibo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Dados do orçamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Dados do Orçamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Número do Orçamento</p>
              <p className="font-semibold">{receipt.quoteNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Título</p>
              <p className="font-medium">{receipt.title}</p>
            </div>
            {receipt.description && (
              <div>
                <p className="text-sm text-gray-600">Descrição</p>
                <p className="text-gray-800">{receipt.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Data do Pagamento</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <p className="font-medium">
                  {receipt.paidAt ? new Date(receipt.paidAt).toLocaleDateString('pt-BR') : 'Data não informada'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados do cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Dados do Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Nome</p>
              <p className="font-semibold">{receipt.client?.name || 'Não informado'}</p>
            </div>
            {receipt.client?.email && (
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500" />
                  <p>{receipt.client.email}</p>
                </div>
              </div>
            )}
            {receipt.client?.phone && (
              <div>
                <p className="text-sm text-gray-600">Telefone</p>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <p>{receipt.client.phone}</p>
                </div>
              </div>
            )}
            {receipt.client?.address && (
              <div>
                <p className="text-sm text-gray-600">Endereço</p>
                <p>{receipt.client.address}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Itens do orçamento */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Itens do Orçamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {receipt.items?.map((item: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">{item.description}</h4>
                  <p className="text-sm text-gray-600">
                    Quantidade: {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">
                    {formatCurrency((item.quantity * parseFloat(item.unitPrice)).toString())}
                  </p>
                </div>
              </div>
            ))}
            
            <Separator />
            
            {/* Total */}
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-lg font-semibold text-green-800">VALOR TOTAL PAGO</span>
              </div>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(receipt.total)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              onClick={handleDownloadPDF}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar Recibo em PDF
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setLocation('/quotes')}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar aos Orçamentos
            </Button>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Este documento comprova o pagamento do orçamento aprovado.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Gerado pelo sistema Fechou! - Sistema de Orçamentos
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}