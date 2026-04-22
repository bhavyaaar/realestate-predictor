import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Header } from "./components/Header";
import { AuthPage } from "./components/AuthPage";
import { ProfilePage } from "./components/ProfilePage";
import { CostEstimator } from "./components/CostEstimator";
import { OpportunityCostCalculator } from "./components/OpportunityCostCalculator";

function AppContent() {
  const [currentPage, setCurrentPage] = useState<string>("estimator");
  const { user, isGuest, loading } = useAuth();

  useEffect(() => {
    const onNavigate = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail) {
        setCurrentPage(detail);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    window.addEventListener("homescope:navigate", onNavigate);
    return () => window.removeEventListener("homescope:navigate", onNavigate);
  }, []);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center">
        <div className="text-stone-500">Loading your profile...</div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <Header currentPage={currentPage} onNavigate={handleNavigate} />
      
      {currentPage === "estimator" && <CostEstimator />}
      {currentPage === "opportunity" && <OpportunityCostCalculator />}
      {currentPage === "profile" && <ProfilePage />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
