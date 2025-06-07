import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import LoadingSpinner from "@/components/common/loading-spinner";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Star, MessageCircle, Calendar, User } from "lucide-react";
import type { ReviewWithClient } from "@/types";

export default function Reviews() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

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

  const { data: reviews, isLoading } = useQuery<ReviewWithClient[]>({
    queryKey: ["/api/reviews"],
    retry: false,
  });

  const respondToReviewMutation = useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: string; response: string }) => {
      await apiRequest("PUT", `/api/reviews/${reviewId}/response`, { response });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({
        title: "Sucesso",
        description: "Resposta enviada com sucesso!",
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
        description: "Erro ao enviar resposta. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  if (authLoading || isLoading) {
    return <LoadingSpinner />;
  }

  const calculateStats = () => {
    if (!reviews || reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingsDistribution: [0, 0, 0, 0, 0],
        responseRate: 0,
      };
    }

    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / totalReviews;
    
    const ratingsDistribution = [0, 0, 0, 0, 0];
    reviews.forEach(review => {
      ratingsDistribution[review.rating - 1]++;
    });

    const reviewsWithResponse = reviews.filter(review => review.response).length;
    const responseRate = (reviewsWithResponse / totalReviews) * 100;

    return {
      averageRating,
      totalReviews,
      ratingsDistribution,
      responseRate,
    };
  };

  const stats = calculateStats();

  const renderStars = (rating: number, large = false) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`${large ? 'w-6 h-6' : 'w-4 h-4'} ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'há 1 dia';
    if (diffDays < 7) return `há ${diffDays} dias`;
    if (diffDays < 30) return `há ${Math.ceil(diffDays / 7)} semanas`;
    return `há ${Math.ceil(diffDays / 30)} meses`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Avaliações</h1>
        <p className="text-white/70">Veja o que seus clientes dizem sobre você</p>
      </div>

      {/* Rating Overview */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Rating Card */}
        <Card className="bg-white shadow-lg">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-brand-primary mb-2">
              {stats.averageRating.toFixed(1)}
            </div>
            <div className="flex justify-center mb-2">
              {renderStars(Math.round(stats.averageRating), true)}
            </div>
            <p className="text-gray-600 mb-4">
              Baseado em <span className="font-semibold">{stats.totalReviews}</span> avaliações
            </p>
            
            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratingsDistribution[rating - 1];
                const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                
                return (
                  <div key={rating} className="flex items-center gap-2 text-sm">
                    <span className="w-8">{rating}★</span>
                    <div className="flex-1 bg-gray-200 h-2 rounded-full">
                      <div
                        className="bg-yellow-400 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-gray-600">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-6">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-brand-primary mb-2">
                {stats.totalReviews}
              </div>
              <p className="text-gray-600">Total de Avaliações</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-brand-primary mb-2">
                {stats.responseRate.toFixed(0)}%
              </div>
              <p className="text-gray-600">Taxa de Resposta</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-brand-primary mb-2">
                {reviews?.filter(r => r.createdAt && new Date(r.createdAt).getMonth() === new Date().getMonth()).length || 0}
              </div>
              <p className="text-gray-600">Este Mês</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-brand-primary mb-2">
                {reviews?.filter(r => r.rating === 5).length || 0}
              </div>
              <p className="text-gray-600">5 Estrelas</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reviews List */}
      <Card className="bg-white shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold text-gray-800">
            Avaliações Recentes
          </CardTitle>
          <Select defaultValue="recent">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="highest">Maior nota</SelectItem>
              <SelectItem value="lowest">Menor nota</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {!reviews || reviews.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                Nenhuma avaliação ainda
              </h3>
              <p className="text-gray-500">
                Complete seus primeiros projetos para receber avaliações dos clientes
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {reviews.map((review) => (
                <div key={review.id} className="py-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-brand-primary font-semibold">
                        {review.client.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-800">{review.client.name}</h4>
                        <span className="text-sm text-gray-500">
                          {getTimeAgo(review.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex">{renderStars(review.rating)}</div>
                        {review.quoteId && (
                          <span className="text-sm text-gray-600">
                            • Projeto concluído
                          </span>
                        )}
                      </div>
                      {review.comment && (
                        <p className="text-gray-700 mb-3">{review.comment}</p>
                      )}
                      
                      {/* Professional Response */}
                      {review.response ? (
                        <div className="bg-blue-50 rounded-lg p-4 mt-3">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageCircle className="w-4 h-4 text-brand-primary" />
                            <span className="text-sm font-medium text-brand-primary">
                              Sua resposta:
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{review.response}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Respondido em {formatDate(review.respondedAt)}
                          </p>
                        </div>
                      ) : (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MessageCircle className="w-4 h-4 mr-2" />
                              Responder
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Responder Avaliação</DialogTitle>
                            </DialogHeader>
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const response = formData.get('response') as string;
                                if (response.trim()) {
                                  respondToReviewMutation.mutate({
                                    reviewId: review.id,
                                    response: response.trim(),
                                  });
                                }
                              }}
                              className="space-y-4"
                            >
                              <div>
                                <label className="block text-sm font-medium mb-2">
                                  Sua resposta
                                </label>
                                <Textarea
                                  name="response"
                                  placeholder="Escreva uma resposta para o cliente..."
                                  rows={4}
                                  required
                                />
                              </div>
                              <div className="flex justify-end gap-3">
                                <DialogTrigger asChild>
                                  <Button type="button" variant="outline">
                                    Cancelar
                                  </Button>
                                </DialogTrigger>
                                <Button
                                  type="submit"
                                  className="brand-gradient text-white"
                                  disabled={respondToReviewMutation.isPending}
                                >
                                  {respondToReviewMutation.isPending ? "Enviando..." : "Enviar Resposta"}
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
