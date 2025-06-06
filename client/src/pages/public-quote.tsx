import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, CheckCircle, XCircle, Calendar, Phone, Mail, MapPin, Download, Copy, Eye, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { QuoteWithDetails } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { generateQuotePDF, downloadPDF } from "@/lib/pdfGenerator";
import { useToast } from "@/hooks/use-toast";
import { formatPhone, formatCPF, formatCEP } from "@/lib/utils";

export default function PublicQuote() {
  const { quoteNumber } = useParams<{ quoteNumber: string }>();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);
  const [showPhotosDialog, setShowPhotosDialog] = useState(false);

  const { data: quote, isLoading, error } = useQuery<QuoteWithDetails>({
    queryKey: [`/api/quotes/public/${quoteNumber}`],
    enabled: !!quoteNumber,
    retry: 1,
    retryDelay: 500,
    staleTime: 5 * 60 * 1000,
  });

  // Check for existing review when quote loads
  useEffect(() => {
    const checkExistingReview = async () => {
      if (quote && quote.clientId) {
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
  }, [quote]);

  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/quotes/${quote?.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao aprovar orçamento");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Orçamento aprovado!",
        description: "O profissional será notificado da sua aprovação.",
      });
      // Reload page to update status
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível aprovar o orçamento.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason?: string) => {
      const response = await fetch(`/api/quotes/${quote?.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao rejeitar orçamento");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Orçamento rejeitado",
        description: "O profissional será notificado da sua decisão.",
      });
      // Reload page to update status
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível rejeitar o orçamento.",
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

  const copyPixKey = async () => {
    if (!quote) return;
    
    try {
      // Fetch user data to get the real PIX key
      const userResponse = await fetch(`/api/users/${quote.userId}`);
      const userData = await userResponse.json();
      const pixKey = userData.pixKey || "13981116464";
      
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

  const handleDownloadPDF = async () => {
    if (!quote) return;
    
    try {
      // Fetch real user data for PDF generation
      const userResponse = await fetch(`/api/users/${quote.userId}`);
      const userData = await userResponse.json();
      
      const pdfBlob = await generateQuotePDF({
        quote,
        user: userData,
        isUserPremium: userData.plan === "PREMIUM",
      });
      
      downloadPDF(pdfBlob, `orcamento-${quote.quoteNumber}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o PDF.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando orçamento...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    );
  }

  const isExpired = new Date(quote.validUntil) < new Date();
  const canApprove = quote.status === "pending" && !isExpired;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-md sm:max-w-2xl lg:max-w-4xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Fechou!</h1>
          </div>
          <p className="text-gray-600">Orçamento da Marcenaria Estrela</p>
        </div>

        {/* Quote Details */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="brand-gradient text-white rounded-t-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div>
                <CardTitle className="text-lg sm:text-xl lg:text-2xl mb-2">{quote.title}</CardTitle>
                <p className="text-white/90 text-sm sm:text-base">Orçamento #{quote.quoteNumber}</p>
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

            {/* Items */}
            <div className="mb-6">
              <h3 className="font-semibold mb-4">Itens do Orçamento</h3>
              <div className="space-y-3">
                {quote.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-gray-600">
                        Qtd: {item.quantity} x R$ {item.unitPrice}
                      </p>
                    </div>
                    <div className="font-semibold">
                      R$ {item.total}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Total */}
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span className="text-2xl text-green-600">R$ {quote.total}</span>
            </div>

            {/* Validity */}
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-800">
                  Válido até: {format(new Date(quote.validUntil), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
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
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Observações</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {quote.observations}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Info */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Informações do Cliente</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {quote.client.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="font-medium">{quote.client.name}</span>
              </div>
              
              {quote.client.email && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{quote.client.email}</span>
                </div>
              )}
              
              {quote.client.phone && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{formatPhone(quote.client.phone)}</span>
                </div>
              )}
              
              {quote.client.address && (
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <div>
                    <div>{quote.client.address}</div>
                    {quote.client.city && quote.client.state && quote.client.zipCode && (
                      <div className="text-sm">
                        {quote.client.city}, {quote.client.state} - CEP: {formatCEP(quote.client.zipCode)}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {quote.client.cpf && (
                <div className="flex items-center gap-3 text-gray-600">
                  <span className="w-4 h-4 text-center text-xs font-bold">ID</span>
                  <span>CPF: {formatCPF(quote.client.cpf)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Ações</h3>
            
            <div className="mb-4 space-y-2">
              <Button 
                onClick={handleDownloadPDF}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar PDF do Orçamento
              </Button>
              
              <Button 
                onClick={copyPixKey}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Chave PIX para Pagamento
              </Button>
            </div>
            
            {/* Approve/Reject buttons - Show only for pending quotes that are not expired */}
            {quote.status === "pending" && !isExpired && (
              <div className="flex gap-4">
                <Button 
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {approveMutation.isPending ? "Aprovando..." : "Aprovar Orçamento"}
                </Button>
                <Button 
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending}
                  variant="destructive"
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {rejectMutation.isPending ? "Rejeitando..." : "Rejeitar"}
                </Button>
              </div>
            )}

            {/* Status message for non-pending quotes */}
            {quote.status !== "pending" && (
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-600">
                  {quote.status === "approved" && "✅ Este orçamento já foi aprovado"}
                  {quote.status === "rejected" && "❌ Este orçamento foi rejeitado"}
                  {quote.status === "paid" && "💰 Este orçamento foi pago"}
                </p>
              </div>
            )}

            {/* Expiry message */}
            {isExpired && quote.status === "pending" && (
              <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">⏰ Este orçamento expirou e não pode mais ser aprovado.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Section */}
        <Card>
          <CardContent className="p-6">
            {reviewSubmitted || existingReview ? (
              <div className="text-center py-8">
                <div className="mb-4">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Obrigado pela sua avaliação!</h3>
                <p className="text-gray-600 mb-4">
                  Seu feedback é muito importante para nós e ajuda outros clientes.
                </p>
                {existingReview && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-center items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= existingReview.rating ? "text-yellow-500 fill-current" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    {existingReview.comment && (
                      <p className="text-gray-700 text-sm italic">"{existingReview.comment}"</p>
                    )}
                  </div>
                )}
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
                          window.open(photo.url, '_blank');
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