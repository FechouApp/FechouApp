import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import LoadingSpinner from "@/components/common/loading-spinner";
import BackButton from "@/components/common/back-button";
import { Star } from "lucide-react";
import type { ReviewWithClient } from "@/types";

export default function Reviews() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

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

  if (authLoading || isLoading) {
    return <LoadingSpinner />;
  }

  const stats = {
    totalReviews: reviews?.length || 0,
    averageRating: reviews?.length ? 
      reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0,
    ratingsDistribution: [0, 0, 0, 0, 0]
  };

  if (reviews) {
    reviews.forEach(review => {
      stats.ratingsDistribution[review.rating - 1]++;
    });
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <BackButton />
      
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Avaliações</h1>
        <p className="text-gray-600">Veja o que seus clientes dizem sobre você</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="bg-white shadow-lg">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-brand-primary mb-2">
              {stats.averageRating.toFixed(1)}
            </div>
            <div className="flex justify-center mb-2">
              {renderStars(Math.round(stats.averageRating))}
            </div>
            <p className="text-gray-600 mb-4">
              Baseado em <span className="font-semibold">{stats.totalReviews}</span> avaliações
            </p>
            
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.ratingsDistribution[rating - 1];
                const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                
                return (
                  <div key={rating} className="flex items-center gap-2 text-sm">
                    <span className="w-8">{rating}★</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-400 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card className="bg-white shadow-lg">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Avaliações Recentes
              </h3>
              
              {!reviews || reviews.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">Nenhuma avaliação ainda</p>
                  <p className="text-sm text-gray-400 mt-2">
                    As avaliações dos seus clientes aparecerão aqui
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {renderStars(review.rating)}
                          </div>
                          <p className="font-medium text-gray-800">
                            {review.client?.name || 'Cliente'}
                          </p>
                        </div>
                        <span className="text-sm text-gray-500">
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString('pt-BR') : ''}
                        </span>
                      </div>
                      
                      {review.comment && (
                        <p className="text-gray-600 mt-2">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}