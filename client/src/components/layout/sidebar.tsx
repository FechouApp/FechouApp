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
  CheckCircle
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clientes", href: "/clients", icon: Users },
  { name: "Orçamentos", href: "/quotes", icon: FileText },
  { name: "Novo Orçamento", href: "/new-quote", icon: Plus },
  { name: "Avaliações", href: "/reviews", icon: Star },
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
    <aside className="w-64 bg-gray-900 border-r border-gray-700 hidden lg:block">
      <div className="p-6 h-full flex flex-col">
        {/* Logo/Brand Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white">Fechou!</h2>
          <p className="text-gray-400 text-sm">Gerencie seus orçamentos</p>
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
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              {(user as any)?.profileImageUrl ? (
                <img
                  src={(user as any).profileImageUrl}
                  alt="Foto do usuário"
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {getUserInitials()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">
                  {getUserDisplayName()}
                </p>
                <p className="text-gray-400 text-xs truncate">
                  {(user as any)?.profession || "Profissional"}
                </p>
              </div>
            </div>
            
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/settings")}
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700 h-8"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700 h-8"
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
