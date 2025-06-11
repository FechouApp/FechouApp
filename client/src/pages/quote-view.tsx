import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, CheckCircle, XCircle, Calendar, Phone, Mail, MapPin, ArrowLeft, Download, MessageCircle, Copy, Eye, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { QuoteWithDetails } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { generateQuotePDF, downloadPDF } from "@/lib/pdfGenerator";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/common/loading-spinner";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatPhone, formatCPF, formatCEP } from "@/lib/utils";
import Logo from "@/components/ui/logo";

export default function QuoteView() {
  const { quoteNumber, quoteId } = useParams<{ quoteNumber?: string; quoteId?: string }>();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);
  const [showPhotosDialog, setShowPhotosDialog] = useState(false);

  // Check if this is a public view based on URL pattern
  const isPublicView = window.location.pathname.startsWith('/quote/');

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

  // Mutation to update quote status from draft to pending
  const updateStatusToPendingMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/quotes/${quote?.id}/status`, {
        body: { status: "pending" }
      });
    },
    onSuccess: () => {
      // Reload to show updated status
      window.location.reload();
    },
    onError: () => {
      // Silent error - don't show toast as this is background action
      console.error("Failed to update quote status to pending");
    },
  });

  // Funções do WhatsApp
  const generateWhatsAppLink = () => {
    if (!quote || !quote.client.phone) return "";

    const cleanPhone = quote.client.phone.replace(/\D/g, '');
    const phoneNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    // Always use public URL for clients
    const publicUrl = `${window.location.origin}/quote/${quote.quoteNumber}`;

    const profesionalName = user ? (user as any)?.businessName || (user as any)?.email?.split('@')[0] || 'Profissional' : 'Profissional';
    const message = `Olá, ${quote.client.name}! Aqui está o seu orçamento gerado via *Fechou!*.
✅ Profissional: ${profesionalName}
📄 Orçamento válido até: ${format(new Date(quote.validUntil), 'dd/MM/yyyy', { locale: ptBR })}
🔗 Acesse os detalhes aqui: ${publicUrl}

_Gerado pelo Fechou! - www.meufechou.com.br_`;

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
  }

  const copyPixKey = async () => {
    if (!quote) return;

    try {
      // Fetch user data to get the real PIX key
      const userResponse = await fetch(`/api/users/${quote.userId}`);
      const userData = await userResponse.json();
      const pixKey = userData.pixKey || "13981116464"; // Use the PIX key from user data

      await navigator.clipboard.writeText(pixKey);
      toast({
        title: "Chave PIX copiada!",
        description: "A chave PIX foi copiada para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar a chave PIX.",
        variant: "destructive",
      });
    }
  };

  const sendViaWhatsApp = () => {
    const link = generateWhatsAppLink();
    if (link) {
      // Update status to pending if it's currently draft
      if (quote?.status === 'draft') {
        updateStatusToPendingMutation.mutate();
      }
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

  // Determine query based on route type
  const isPublicRoute = window.location.pathname.startsWith('/quote/');
  const queryKey = isPublicRoute ? `/api/quotes/public/${quoteNumber}` : `/api/quotes/${quoteId}`;
  const queryEnabled = isPublicRoute ? !!quoteNumber : !!quoteId;

  console.log('Debug Quote View:', {
    pathname: window.location.pathname,
    isPublicRoute,
    quoteNumber,
    quoteId,
    queryKey,
    queryEnabled
  });

  const { data: quote, isLoading, error } = useQuery<QuoteWithDetails>({
    queryKey: [queryKey],
    enabled: queryEnabled,
    retry: false,
  });

  // Check for existing review when quote loads (only for public view)
  useEffect(() => {
    const checkExistingReview = async () => {
      if (quote && isPublicView && quote.clientId) {
        try {
          const response = await fetch(`/api/reviews/check/${quote.id}/${quote.clientId}`);
          if (response.ok) {
            const existingReviewData = await response.json();
            if (existingReviewData) {
              setExistingReview(existingReviewData);
              setReviewSubmitted(true);
            }
          }
        } catch (error) {
          console.error('Error checking existing review:', error);
        }
      }
    };

    if (quote) {
      checkExistingReview();
    }
  }, [quote, isPublicView]);

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
    onError: (error: any) => {
      const message = error?.message || "Não foi possível enviar a avaliação.";
      toast({
        title: "Erro",
        description: message,
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
      
      // Update status to pending if it's currently draft
      if (quote.status === 'draft') {
        updateStatusToPendingMutation.mutate();
      }
      
      const isUserPremium = (user as any)?.plan === 'PREMIUM';
      console.log('User plan:', (user as any)?.plan, 'isUserPremium:', isUserPremium);

      const pdfBlob = await generateQuotePDF({
        quote,
        user: user as any,
        isUserPremium
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
      <div className="container mx-auto px-4 py-6 max-w-md sm:max-w-2xl lg:max-w-4xl">

        {/* Botão de Voltar - Show only in internal view */}
        {!isPublicView && (
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
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
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
                    <span>{formatPhone(quote.client.phone)}</span>
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
                    <div>
                      <div>{quote.client.address}</div>
                      <div>
                        {quote.client.city && `${quote.client.city}`}
                        {quote.client.state && `, ${quote.client.state}`}
                        {quote.client.zipCode && ` - CEP: ${formatCEP(quote.client.zipCode)}`}
                      </div>
                    </div>
                  </div>
                )}
                {quote.client?.cpf && (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 text-center text-xs font-bold">ID</span>
                    <span>CPF: {formatCPF(quote.client.cpf)}</span>
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

            {/* Photos */}
            {quote.photos && Array.isArray(quote.photos) && quote.photos.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-4">Fotos do Orçamento</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-blue-900">
                        {quote.photos.length} foto{quote.photos.length > 1 ? 's' : ''} anexada{quote.photos.length > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-blue-700">
                        Clique para visualizar as fotos do orçamento
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPhotosDialog(true)}
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Fotos
                    </Button>
                  </div>
                </div>
              </div>
            )}

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
            <div className="mb-4 space-y-2">
              <Button 
                onClick={handleDownloadPDF}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF do Orçamento
              </Button>

              {/* PIX Button - Only for public view (clients) */}
              {isPublicView && (
                <Button 
                  onClick={copyPixKey}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Chave PIX para Pagamento
                </Button>
              )}
            </div>

            {/* Action buttons for quote owner - side by side */}
            {user && quote.userId === (user as any)?.id && (
              <div className="mb-4">
                <div className="flex gap-2">
                  {/* WhatsApp button - Show only if client has phone */}
                  {quote.client?.phone && (
                    <Button 
                      onClick={sendViaWhatsApp}
                      disabled={markAsSentMutation.isPending}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Enviar por WhatsApp
                    </Button>
                  )}

                  {/* Manual Approve button - Show only for pending quotes */}
                  {quote.status === "pending" && (
                    <Button 
                      onClick={() => approveMutation.mutate()}
                      disabled={approveMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {approveMutation.isPending ? "Aprovando..." : "Aprovar"}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Approve/Reject buttons - Only for pending quotes in public view */}
            {isPublicView && canApprove && (
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


      </div>

      {/* Photos Dialog */}
      <Dialog open={showPhotosDialog} onOpenChange={setShowPhotosDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]" aria-describedby="photos-description">
          <DialogHeader>
            <DialogTitle>Fotos do Orçamento</DialogTitle>
            <p id="photos-description" className="text-sm text-muted-foreground">
              Visualize e amplie as fotos anexadas ao orçamento. Clique em uma foto para abrir em nova aba.
            </p>
          </DialogHeader>
          
          {quote?.photos && Array.isArray(quote.photos) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
              {quote.photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo.url}
                    alt={`Foto ${index + 1} - ${photo.name || 'Imagem'}`}
                    className="w-full h-64 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(photo.url, '_blank')}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Criar uma nova janela com a imagem centralizada
                          const newWindow = window.open('', '_blank');
                          if (newWindow) {
                            newWindow.document.write(`
                              <!DOCTYPE html>
                              <html>
                                <head>
                                  <title>Foto - ${photo.name || `Imagem ${index + 1}`}</title>
                                  <style>
                                    body { 
                                      margin: 0; 
                                      padding: 20px; 
                                      background: #000; 
                                      display: flex; 
                                      justify-content: center; 
                                      align-items: center; 
                                      min-height: 100vh;
                                      font-family: Arial, sans-serif;
                                    }
                                    img { 
                                      max-width: 100%; 
                                      max-height: 100vh; 
                                      object-fit: contain;
                                      border-radius: 8px;
                                      box-shadow: 0 4px 20px rgba(255,255,255,0.1);
                                    }
                                    .container {
                                      text-align: center;
                                    }
                                    .title {
                                      color: white;
                                      margin-bottom: 20px;
                                      font-size: 18px;
                                    }
                                  </style>
                                </head>
                                <body>
                                  <div class="container">
                                    <div class="title">${photo.name || `Foto ${index + 1}`}</div>
                                    <img src="${photo.url}" alt="${photo.name || `Foto ${index + 1}`}" />
                                  </div>
                                </body>
                              </html>
                            `);
                            newWindow.document.close();
                          }
                        }}
                        className="bg-white/90 text-black hover:bg-white"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ampliar
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          const link = document.createElement('a');
                          link.href = photo.url;
                          link.download = photo.name || `foto-${index + 1}.jpg`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="bg-white/90 text-black hover:bg-white"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Salvar
                      </Button>
                    </div>
                  </div>
                  {photo.name && (
                    <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
                      {photo.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowPhotosDialog(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}