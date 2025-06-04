import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import LoadingSpinner from "@/components/common/loading-spinner";
import QuoteForm from "@/components/quotes/quote-form";
import QuickSetup from "@/components/quick-setup";
import Header from "@/components/layout/header";
import SavedItemsSection from "@/components/quotes/saved-items-section";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Eye, Send } from "lucide-react";
import type { Client, CreateQuoteRequest, QuoteWithDetails } from "@/types";

export default function NewQuote() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  
  // Extract quote ID from URL for editing
  const quoteId = location.includes('/edit') ? location.split('/')[2] : null;
  const isEditing = !!quoteId;

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

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    retry: false,
  });

  // Check plan limits
  const { data: planLimits } = useQuery({
    queryKey: ["/api/user/plan-limits"],
    retry: false,
  });

  // Load quote data for editing
  const { data: quoteData, isLoading: quoteLoading } = useQuery<QuoteWithDetails>({
    queryKey: [`/api/quotes/${quoteId}`],
    enabled: !!quoteId,
    retry: false,
  });

  const createQuoteMutation = useMutation({
    mutationFn: async (quoteData: CreateQuoteRequest) => {
      if (isEditing) {
        // Para edição, usar PUT
        await apiRequest("PUT", `/api/quotes/${quoteId}`, quoteData);
      } else {
        // Verificar limite de orçamentos mensais apenas para plano gratuito
        if (planLimits && !planLimits.isPremium && !planLimits.canCreateQuote) {
          throw new Error(`Limite de ${planLimits.monthlyQuoteLimit} orçamentos por mês atingido. Faça upgrade para Premium.`);
        }
        await apiRequest("POST", "/api/quotes", quoteData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: [`/api/quotes/${quoteId}`] });
      }
      toast({
        title: "Sucesso",
        description: isEditing ? "Orçamento atualizado com sucesso!" : "Orçamento criado com sucesso!",
      });
      setLocation("/quotes");
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
        description: isEditing ? "Erro ao atualizar orçamento. Tente novamente." : "Erro ao criar orçamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleBack = () => {
    setLocation("/quotes");
  };

  if (authLoading || clientsLoading || (isEditing && quoteLoading)) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header 
        title={isEditing ? "Editar Orçamento" : "Novo Orçamento"}
        subtitle={isEditing ? "Edite os dados do seu orçamento" : "Crie um novo orçamento para seu cliente"}
        backTo="/quotes"
      />

      {/* Main Content Container */}
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 pb-6 md:pb-8">
        <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
          {/* Step Indicator - Hidden on small mobile */}
          <div className="hidden sm:flex items-center justify-center mb-4 md:mb-6">
            <div className="flex items-center">
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-base font-medium ${
                step >= 1 ? 'bg-white text-brand-primary' : 'bg-white/20 text-white/60'
              }`}>
                1
              </div>
              <div className={`w-12 md:w-16 h-1 ${step > 1 ? 'bg-white' : 'bg-white/20'}`}></div>
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-base font-medium ${
                step >= 2 ? 'bg-white text-brand-primary' : 'bg-white/20 text-white/60'
              }`}>
                2
              </div>
              <div className={`w-12 md:w-16 h-1 ${step > 2 ? 'bg-white' : 'bg-white/20'}`}></div>
              <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm md:text-base font-medium ${
                step >= 3 ? 'bg-white text-brand-primary' : 'bg-white/20 text-white/60'
              }`}>
                3
              </div>
            </div>
          </div>

          {/* Plan limit warning */}
          {planLimits && !planLimits.isPremium && !planLimits.canCreateQuote && (
            <div className="p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg mx-0">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-amber-600 font-bold text-sm">!</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-amber-800 text-sm">Limite mensal atingido</h3>
                  <p className="text-xs text-amber-700 mt-1 break-words">
                    Você atingiu o limite de {planLimits.monthlyQuoteLimit} orçamentos por mês do plano gratuito.
                    Faça upgrade para Premium e tenha orçamentos ilimitados.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Show quick setup if no clients */}
          {(!clients || clients.length === 0) && (
            <div className="mb-4 md:mb-6">
              <QuickSetup />
            </div>
          )}

          {/* Quote Form */}
          <QuoteForm
            clients={clients || []}
            onSubmit={(data) => createQuoteMutation.mutate(data)}
            isSubmitting={createQuoteMutation.isPending}
            step={step}
            onStepChange={setStep}
            existingQuote={quoteData}
          />
        </div>
      </div>
    </div>
  );
}
