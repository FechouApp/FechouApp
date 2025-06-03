import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, CheckCircle, XCircle, Calendar, Phone, Mail, MapPin, ArrowLeft, Download, MessageCircle, Copy } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { QuoteWithDetails } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { generateQuotePDF, downloadPDF } from "@/lib/pdfGenerator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/common/loading-spinner";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function QuoteView() {
  const { quoteNumber } = useParams<{ quoteNumber: string }>();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  
  // Check if this is a public view based on URL pattern
  const isPublicView = window.location.pathname.includes('/quote/');

  // Mutations
  const markAsSentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/quotes/${quote?.id}/mark-sent`);
    },
    onSuccess: () => {
      toast({
        title: "Enviado!",
        description: "O orçamento foi marcado como enviado via WhatsApp.",
      });
      window.location.reload();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível registrar o envio.",
        variant: "destructive",
      });
    },
  });

  // Funções do WhatsApp
  const generateWhatsAppLink = () => {
    if (!quote || !quote.client.phone) return "";
    
    const cleanPhone = quote.client.phone.replace(/\D/g, '');
    const phoneNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const currentUrl = window.location.href;
    
    const profesionalName = user ? (user as any)?.businessName || (user as any)?.email?.split('@')[0] || 'Profissional' : 'Profissional';
    const message = `Olá, ${quote.client.name}! Aqui está o seu orçamento gerado via *Fechou!*.
✅ Profissional: ${profesionalName}
📄 Orçamento válido até: ${format(new Date(quote.validUntil), 'dd/MM/yyyy', { locale: ptBR })}
🔗 Acesse os detalhes aqui: ${currentUrl}`;
    
    return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  };

  const copyWhatsAppLink = async () => {
    const link = generateWhatsAppLink();
    if (link) {
      try {
        await navigator.clipboard.writeText(link);
        toast({
          title: "Link copiado!",
          description: "O link do WhatsApp foi copiado para a área de transferência.",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível copiar o link.",
          variant: "destructive",
        });
      }
    }
  };

  const sendViaWhatsApp = () => {
    const link = generateWhatsAppLink();
    if (link) {
      window.open(link, '_blank');
      markAsSentMutation.mutate();
    } else {
      toast({
        title: "Erro",
        description: "Número do WhatsApp não encontrado para este cliente.",
        variant: "destructive",
      });
    }
  };

  // Only redirect to login if this is not a public quote view
  // Public quotes don't require authentication
  useEffect(() => {
    // Don't require authentication for public quote viewing
    const isPublicView = window.location.pathname.includes('/quote/');
    if (!authLoading && !isAuthenticated && !isPublicView) {
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

  const { data: quote, isLoading, error } = useQuery<QuoteWithDetails>({
    queryKey: [`/api/quotes/public/${quoteNumber}`],
    enabled: !!quoteNumber,
    retry: false,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/quotes/${quote?.id}/approve`);
    },
    onSuccess: () => {
      toast({
        title: "Orçamento aprovado!",
        description: "O profissional foi notificado da sua aprovação.",
      });
      window.location.reload();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível aprovar o orçamento.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/quotes/${quote?.id}/reject`);
    },
    onSuccess: () => {
      toast({
        title: "Orçamento rejeitado",
        description: "O profissional foi notificado.",
      });
      window.location.reload();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar o orçamento.",
        variant: "destructive",
      });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/reviews", {
        userId: quote?.userId,
        clientId: quote?.clientId,
        quoteId: quote?.id,
        rating,
        comment: comment.trim() || null,
        isPublic: true,
      });
    },
    onSuccess: () => {
      toast({
        title: "Avaliação enviada!",
        description: "Obrigado pelo seu feedback.",
      });
      setReviewSubmitted(true);
      setRating(0);
      setComment("");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a avaliação.",
        variant: "destructive",
      });
    },
  });

  const handleDownloadPDF = async () => {
    if (!quote || !user) {
      console.error('Quote or user not available:', { quote: !!quote, user: !!user });
      return;
    }
    
    try {
      console.log('Starting PDF generation...', { quote: quote.quoteNumber, user: (user as any).id });
      const isPaidPlan = (user as any)?.plan === 'premium' || (user as any)?.plan === 'paid';
      console.log('User plan:', (user as any)?.plan, 'isPaidPlan:', isPaidPlan);
      
      const pdfBlob = await generateQuotePDF({
        quote,
        user: user as any,
        isPaidPlan
      });
      
      console.log('PDF generated successfully, blob size:', pdfBlob.size);
      downloadPDF(pdfBlob, `Orçamento_${quote.quoteNumber}.pdf`);
      
      toast({
        title: "PDF gerado!",
        description: "O arquivo foi baixado com sucesso.",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Erro",
        description: `Não foi possível gerar o PDF: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  };

  if (authLoading || isLoading) {
    return <LoadingSpinner />;
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Botão de Voltar */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>

          <div className="flex items-center justify-center">
            <Card className="max-w-md">
              <CardContent className="p-8 text-center">
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Orçamento não encontrado</h2>
                <p className="text-gray-600">
                  O orçamento que você está procurando não existe ou expirou.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = new Date(quote.validUntil) < new Date();
  const canApprove = quote.status === "pending" && !isExpired;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 max-w-sm sm:max-w-2xl lg:max-w-4xl">


        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">Fechou!</h1>
          </div>
          <p className="text-gray-600">
            {quote.client ? 
              `Orçamento da ${(user as any)?.businessName || 'Marcenaria Estrela'}` : 
              'Você recebeu um orçamento'
            }
          </p>
        </div>

        {/* Quote Details */}
        <Card className="mb-6">
          <CardHeader className="brand-gradient text-white rounded-t-lg">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl mb-2">{quote.title}</CardTitle>
                <p className="text-white/90">Orçamento #{quote.quoteNumber}</p>
              </div>
              <Badge 
                variant={quote.status === "approved" ? "default" : quote.status === "rejected" ? "destructive" : "secondary"}
                className="text-white"
              >
                {quote.status === "pending" && "Aguardando"}
                {quote.status === "approved" && "Aprovado"}
                {quote.status === "rejected" && "Rejeitado"}
                {quote.status === "paid" && "Pago"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {quote.description && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Descrição</h3>
                <p className="text-gray-700">{quote.description}</p>
              </div>
            )}

            {/* Client Info */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Informações do Cliente</h3>
              <div className="space-y-2 text-sm text-gray-600">
                {quote.client?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{quote.client.phone}</span>
                  </div>
                )}
                {quote.client?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{quote.client.email}</span>
                  </div>
                )}
                {quote.client?.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {quote.client.address}
                      {quote.client.city && `, ${quote.client.city}`}
                      {quote.client.state && ` - ${quote.client.state}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Itens do Orçamento</h3>
              <div className="space-y-3">
                {quote.items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-gray-600">Quantidade: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        R$ {parseFloat(item.unitPrice).toFixed(2)} x {item.quantity}
                      </p>
                      <p className="font-bold">R$ {parseFloat(item.total).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Total */}
            <div className="text-right">
              <div className="flex justify-between items-center mb-2">
                <span>Subtotal:</span>
                <span>R$ {parseFloat(quote.subtotal).toFixed(2)}</span>
              </div>
              {parseFloat(quote.discount) > 0 && (
                <div className="flex justify-between items-center mb-2 text-green-600">
                  <span>Desconto:</span>
                  <span>- R$ {parseFloat(quote.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total:</span>
                <span>R$ {parseFloat(quote.total).toFixed(2)}</span>
              </div>
            </div>

            {/* Validity */}
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">
                  Válido até: {format(new Date(quote.validUntil), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
              {isExpired && (
                <p className="text-red-600 text-sm mt-2">
                  ⚠️ Este orçamento expirou
                </p>
              )}
            </div>

            {/* Observations */}
            {quote.observations && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Observações</h3>
                <p className="text-gray-700 text-sm">{quote.observations}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Ações</h3>
            
            {/* Download PDF Button - Always visible */}
            <div className="mb-4">
              <Button 
                onClick={handleDownloadPDF}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF do Orçamento
              </Button>
            </div>

            {/* WhatsApp Buttons - Never show in public view (/quote/ URL) */}
            {!isPublicView && user && isAuthenticated && quote.userId === (user as any)?.id && quote.client?.phone && (
              <div className="mb-4 space-y-2">
                <Button 
                  onClick={sendViaWhatsApp}
                  disabled={markAsSentMutation.isPending}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar por WhatsApp
                </Button>
                <Button 
                  onClick={copyWhatsAppLink}
                  variant="outline"
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Link do WhatsApp
                </Button>
              </div>
            )}
            
            {/* Approve/Reject buttons - Only for pending quotes */}
            {canApprove && (
              <div className="flex gap-4">
                <Button 
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprovar Orçamento
                </Button>
                <Button 
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending}
                  variant="outline"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rejeitar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Section */}
        <Card>
          <CardContent className="p-6">
            {reviewSubmitted ? (
              <div className="text-center py-8">
                <div className="mb-4">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Obrigado pela sua avaliação!</h3>
                <p className="text-gray-600">
                  Seu feedback é muito importante para nós e ajuda outros clientes.
                </p>
              </div>
            ) : (
              <>
                <h3 className="font-semibold mb-4">Avaliar Profissional</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Sua avaliação (1-5 estrelas)
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className={`w-8 h-8 ${
                            star <= rating ? "text-yellow-500" : "text-gray-300"
                          } hover:text-yellow-400 transition-colors`}
                        >
                          <Star className="w-6 h-6 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Comentário (opcional)
                    </label>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Conte como foi sua experiência..."
                      rows={3}
                    />
                  </div>
                  
                  <Button 
                    onClick={() => reviewMutation.mutate()}
                    disabled={rating === 0 || reviewMutation.isPending}
                    className="w-full"
                  >
                    {reviewMutation.isPending ? "Enviando..." : "Enviar Avaliação"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}