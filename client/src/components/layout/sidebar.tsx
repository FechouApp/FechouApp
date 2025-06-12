import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Plus, 
  Star, 
  Crown, 
  Settings, 
  LogOut,
  Share2
} from "lucide-react";
import Logo from "@/components/ui/logo";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clientes", href: "/clients", icon: Users },
  { name: "Orçamentos", href: "/quotes", icon: FileText },
  { name: "Novo Orçamento", href: "/new-quote", icon: Plus },
  { name: "Avaliações", href: "/reviews", icon: Star },
  { name: "Indicações", href: "/referrals", icon: Share2 },
  { name: "Planos", href: "/plans", icon: Crown },
  { name: "Configurações", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  const getUserDisplayName = () => {
    const userData = user as any;
    if (userData?.firstName && userData?.lastName) {
      return `${userData.firstName} ${userData.lastName}`;
    }
    if (userData?.firstName) {
      return userData.firstName;
    }
    if (userData?.email) {
      return userData.email.split('@')[0];
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

  return (
    <aside className="w-64 bg-gradient-to-b from-blue-600 to-purple-600 border-r border-blue-500/30 hidden lg:block">
      <div className="p-6 h-full flex flex-col">
        {/* Logo/Brand Section */}
        <div className="mb-8">
          <Logo size="md" className="text-white" showSlogan={true} />
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-2 flex-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <button
                key={item.name}
                onClick={() => setLocation(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium hidden lg:block">{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="mt-8 pt-6 border-t border-white/20">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              {(user as any)?.profileImageUrl ? (
                <img
                  src={(user as any).profileImageUrl}
                  alt="Foto do usuário"
                  className="w-12 h-12 rounded-full object-cover"
                  onError={(e) => {
                    // Fallback se a imagem falhar ao carregar
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {getUserInitials()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">
                  {getUserDisplayName()}
                </p>
                <p className="text-blue-100 text-xs truncate">
                  {(user as any)?.profession || "Profissional"}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-blue-100 hover:text-white hover:bg-white/10 h-8"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}