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
  CheckCircle,
  MessageCircle
} from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import BackButton from "@/components/common/back-button";
import LoadingSpinner from "@/components/common/loading-spinner";
import type { Quote, QuoteItem, Client } from "@shared/schema";

type QuoteWithDetails = Quote & {
  items: QuoteItem[];
  client: Client;
};
import { useToast } from "@/hooks/use-toast";

export default function PublicReceipt() {
  const { quoteNumber } = useParams<{ quoteNumber: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: receipt, isLoading, error } = useQuery({
    queryKey: [`/api/public-quotes/${quoteNumber}/receipt`],
    enabled: !!quoteNumber,
  }) as { data: QuoteWithDetails | undefined, isLoading: boolean, error: any };

  const handleDownloadPDF = async () => {
    if (!receipt) return;
    
    try {
      // Fetch user data first
      const userResponse = await fetch(`/api/public-users/${receipt.userId}`);
      const userData = await userResponse.json();
      
      if (!userResponse.ok) {
        throw new Error('Erro ao buscar dados do usuário');
      }

      const isUserPremium = userData.plan === 'PREMIUM' || userData.plan === 'PREMIUM_CORTESIA';
      
      const { generateReceiptPDF, downloadPDF } = await import('@/lib/pdfGenerator');
      
      const pdfBlob = await generateReceiptPDF({
        quote: receipt,
        user: userData,
        isUserPremium
      });

      downloadPDF(pdfBlob, `Recibo_${receipt.quoteNumber}.pdf`);
      
      toast({
        title: "PDF gerado!",
        description: "O recibo foi baixado com sucesso.",
      });
    } catch (error) {
      console.error('Error generating receipt PDF:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PDF do recibo.",
        variant: "destructive",
      });
    }
  };

  const handleShareWhatsApp = async () => {
    if (!receipt?.client?.phone) {
      toast({
        title: "Erro",
        description: "Número do cliente não encontrado.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const pdfUrl = `${window.location.origin}/api/public-quotes/${receipt.quoteNumber}/receipt/pdf`;
      const message = `Olá ${receipt.client.name}! Segue o recibo do pagamento do seu orçamento.
      
📄 Recibo Nº: ${receipt.quoteNumber}
💰 Valor: R$ ${parseFloat(receipt.total).toFixed(2)}
📅 Data: ${new Date().toLocaleDateString('pt-BR')}

🔗 Baixar recibo: ${pdfUrl}

Obrigado pela confiança!`;

      const cleanPhone = receipt.client.phone.replace(/\D/g, '');
      const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      
      window.open(whatsappLink, '_blank');
      
      toast({
        title: "WhatsApp aberto",
        description: "Link do recibo compartilhado no WhatsApp!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao compartilhar recibo via WhatsApp",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num);
  };

  const numberToWords = (value: string) => {
    const num = parseFloat(value);
    // Implementação básica para converter número em extenso
    const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
    
    if (num === 100) return 'cem reais';
    if (num < 1000) {
      const h = Math.floor(num / 100);
      const t = Math.floor((num % 100) / 10);
      const u = num % 10;
      
      let result = '';
      if (h > 0) result += hundreds[h];
      if (t > 1) {
        if (result) result += ' e ';
        result += tens[t];
      } else if (t === 1) {
        if (result) result += ' e ';
        result += teens[u];
        return result + ' reais';
      }
      if (u > 0 && t !== 1) {
        if (result) result += ' e ';
        result += units[u];
      }
      return result + ' reais';
    }
    
    return `${num.toFixed(2)} reais`; // Fallback para valores maiores
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Recibo não encontrado
            </h2>
            <p className="text-gray-500 mb-6">
              Este recibo não existe ou não está disponível.
            </p>
            <Button 
              onClick={() => setLocation("/")}
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BackButton />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Recibo de Pagamento
                </h1>
                <p className="text-sm text-gray-600">
                  Recibo #{receipt.quoteNumber}
                </p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700 border-green-300">
              <CheckCircle className="w-4 h-4 mr-1" />
              Pago
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Receipt Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detalhes do Recibo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Informações do Pagamento</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Data do Pagamento:</span>
                    <span className="font-medium">
                      {receipt.paidAt ? format(new Date(receipt.paidAt), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Serviço:</span>
                    <span className="font-medium">{receipt.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Descrição:</span>
                    <span className="font-medium">{receipt.description || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Cliente</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{receipt.client?.name}</span>
                  </div>
                  {receipt.client?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{receipt.client.email}</span>
                    </div>
                  )}
                  {receipt.client?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{receipt.client.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Itens do Serviço</h3>
              <div className="space-y-3">
                {receipt.items?.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-gray-600">
                        Qtd: {item.quantity} × {formatCurrency(item.price)}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {formatCurrency((item.quantity * parseFloat(item.price)).toString())}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Total */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-green-800">Total Pago:</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-green-800">
                    {formatCurrency(receipt.total)}
                  </span>
                  <p className="text-sm text-green-600 mt-1">
                    ({numberToWords(receipt.total)})
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Ações</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Button 
                onClick={handleDownloadPDF}
                className="w-full"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Recibo em PDF
              </Button>
              
              <Button 
                onClick={handleShareWhatsApp}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Compartilhar via WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">
            Este documento comprova o pagamento do serviço prestado.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Gerado pelo Fechou! - Sistema de Orçamentos
          </p>
        </div>
      </div>
    </div>
  );
}