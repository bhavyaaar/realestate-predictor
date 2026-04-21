import { Home, TrendingUp, Calculator, User, LogOut, UserCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useAuth } from "../contexts/AuthContext";

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Header({ currentPage, onNavigate }: HeaderProps) {
  const { user, isGuest, logout, exitGuestMode } = useAuth();

  const handleLogout = async () => {
    await logout();
    onNavigate("estimator");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-blue-800/50 bg-slate-900/95 backdrop-blur-md shadow-lg">
      <div className="px-6">
        <div className="flex h-16 items-center justify-between gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate("estimator")}>
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-900 to-sky-600 flex items-center justify-center">
              <Home className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl text-white font-semibold">
                HomeScope
              </h1>
              <p className="text-xs text-blue-300">Cost Estimator + Opportunity Advisor</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1 ml-auto">
            <Button
              variant={currentPage === "estimator" ? "default" : "ghost"}
              onClick={() => onNavigate("estimator")}
              className={currentPage === "estimator" ? "bg-sky-600 hover:bg-sky-500" : "text-gray-300 hover:text-white hover:bg-slate-800"}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Cost Estimator
            </Button>
            <Button
              variant={currentPage === "opportunity" ? "default" : "ghost"}
              onClick={() => onNavigate("opportunity")}
              className={currentPage === "opportunity" ? "bg-sky-600 hover:bg-sky-500" : "text-gray-300 hover:text-white hover:bg-slate-800"}
            >
              <Calculator className="h-4 w-4 mr-2" />
              Opportunity Chatbot
            </Button>
          </nav>

          {/* Profile/Auth */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 rounded-full bg-slate-800 px-3 py-2 text-white">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="leading-tight">
                  <div className="text-sm">{user.name}</div>
                  <div className="text-xs text-slate-300">Signed in</div>
                </div>
              </div>
              <Button variant="ghost" onClick={() => onNavigate("profile")} className="text-white hover:bg-slate-800">
                <UserCircle className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button variant="outline" onClick={handleLogout} className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700">
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </Button>
            </div>
          ) : isGuest ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-slate-700 text-gray-300">Guest</Badge>
              <Badge className="bg-slate-700 text-slate-100">Read-only</Badge>
              <Button variant="outline" onClick={exitGuestMode} className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700">
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </div>
          ) : (
            <div className="text-gray-300 text-sm">Not signed in</div>
          )}
        </div>
      </div>
    </header>
  );
}
