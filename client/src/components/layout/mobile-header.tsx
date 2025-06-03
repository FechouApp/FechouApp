import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Menu,
  LayoutDashboard, 
  Users, 
  FileText, 
  Plus, 
  Star, 
  Crown,
  CheckCircle,
  Settings,
  LogOut
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clientes", href: "/clients", icon: Users },
  { name: "Orçamentos", href: "/quotes", icon: FileText },
  { name: "Novo Orçamento", href: "/new-quote", icon: Plus },
  { name: "Avaliações", href: "/reviews", icon: Star },
  { name: "Planos", href: "/plans", icon: Crown },
];

export default function MobileHeader() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  const getCurrentPageName = () => {
    const currentNav = navigation.find(nav => isActive(nav.href));
    return currentNav?.name || "Dashboard";
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user?.firstName) {
      return user.firstName;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return "Usuário";
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleNavigation = (href: string) => {
    setLocation(href);
    setIsOpen(false);
  };

  // Se não estiver na página inicial, mostrar apenas o header simples
  if (location !== "/") {
    return (
      <div className="lg:hidden bg-gradient-to-r from-blue-600 to-purple-600 border-b border-blue-500/30 p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Fechou!</h1>
            </div>
          </div>
          
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="text-white hover:bg-white/10 p-4 h-auto min-h-[56px] min-w-[56px]">
                <Menu className="w-10 h-10" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-white p-0">
              <div className="brand-gradient p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-brand-primary" />
                  </div>
                  <div>
                    <h1 className="text-white font-bold text-xl">Fechou!</h1>
                    <p className="text-white/80 text-sm">Feche negócios</p>
                  </div>
                </div>
                
                {/* User Info */}
                <div className="glassmorphism rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    {user?.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt="Foto do usuário"
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {getUserInitials()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">
                        {getUserDisplayName()}
                      </p>
                      <p className="text-white/70 text-xs">
                        {user?.profession || "Profissional"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {/* Navigation */}
                <nav className="space-y-2 mb-6">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    
                    return (
                      <button
                        key={item.name}
                        onClick={() => handleNavigation(item.href)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                          active
                            ? 'bg-brand-primary text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </nav>
                
                {/* Settings & Logout */}
                <div className="pt-6 border-t border-gray-200 space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-gray-700 hover:bg-gray-100"
                  >
                    <Settings className="w-5 h-5 mr-3" />
                    Configurações
                  </Button>
                  
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Sair
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    );
  }

  // Para a página inicial (dashboard), mostrar a versão completa
  return (
    <div className="lg:hidden bg-gradient-to-r from-blue-600 to-purple-600 border-b border-blue-500/30 p-4 shadow-lg">
      {/* Header com menu */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Fechou!</h1>
          </div>
        </div>
        
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" className="text-white hover:bg-white/10 p-4 h-auto min-h-[56px] min-w-[56px]">
              <Menu className="w-10 h-10" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 bg-white p-0">
            <div className="brand-gradient p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <h1 className="text-white font-bold text-xl">Fechou!</h1>
                  <p className="text-white/80 text-sm">Feche negócios</p>
                </div>
              </div>
              
              {/* User Info */}
              <div className="glassmorphism rounded-xl p-4">
                <div className="flex items-center gap-3">
                  {user?.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt="Foto do usuário"
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        // Fallback se a imagem falhar ao carregar
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {getUserInitials()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-white font-medium text-sm">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-white/70 text-xs">
                      {user?.profession || "Profissional"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {/* Navigation */}
              <nav className="space-y-2 mb-6">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  
                  return (
                    <button
                      key={item.name}
                      onClick={() => handleNavigation(item.href)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                        active
                          ? 'bg-brand-primary text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </nav>
              
              {/* Settings & Logout */}
              <div className="pt-6 border-t border-gray-200 space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-700 hover:bg-gray-100"
                >
                  <Settings className="w-5 h-5 mr-3" />
                  Configurações
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start text-gray-700 hover:bg-gray-100"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Sair
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Seção de Boas-vindas */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          Bem-vindo de volta, {(user as any)?.firstName || 'Usuário'}!
        </h2>
        <p className="text-blue-100">
          Gerencie seus orçamentos e acompanhe seu progresso
        </p>
      </div>

      {/* Título das Ações */}
      <div className="mb-4">
        <h3 className="text-white font-semibold text-lg">Ações Rápidas</h3>
      </div>

      {/* Ações Rápidas Mobile */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          onClick={() => handleNavigation('/new-quote')}
          className="bg-white/10 hover:bg-white/20 text-white border border-white/20 justify-start h-12 text-left"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="text-sm">Novo Orçamento</span>
        </Button>

        <Button 
          onClick={() => handleNavigation('/clients')}
          className="bg-white/10 hover:bg-white/20 text-white border border-white/20 justify-start h-12 text-left"
        >
          <Users className="w-4 h-4 mr-2" />
          <span className="text-sm">Adicionar Cliente</span>
        </Button>

        <Button 
          onClick={() => handleNavigation('/quotes')}
          className="bg-white/10 hover:bg-white/20 text-white border border-white/20 justify-start h-12 text-left"
        >
          <FileText className="w-4 h-4 mr-2" />
          <span className="text-sm">Ver Orçamentos</span>
        </Button>

        <Button 
          onClick={() => handleNavigation((user as any)?.plan === "PREMIUM" ? '/reports' : '/plans')}
          className="bg-white/10 hover:bg-white/20 text-white border border-white/20 justify-start h-12 text-left"
        >
          {(user as any)?.plan === "PREMIUM" ? (
            <>
              <Star className="w-4 h-4 mr-2" />
              <span className="text-sm">Relatórios</span>
            </>
          ) : (
            <>
              <Crown className="w-4 h-4 mr-2" />
              <span className="text-sm">Upgrade Pro</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
