import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Map from "./pages/Map";
import Agenda from "./pages/Agenda";
import AIFeatures from "./pages/AIFeatures";
import ProTools from "./pages/ProTools";
import Login from "./pages/Login";
import { AuthProvider, useAuth } from "@/context/AuthContext";

const queryClient = new QueryClient();

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
            <Route path="/map" element={<RequireAuth><Map /></RequireAuth>} />
            <Route path="/agenda" element={<RequireAuth><Agenda /></RequireAuth>} />
            <Route path="/ai-features" element={<RequireAuth><AIFeatures /></RequireAuth>} />
            <Route path="/pro-tools" element={<RequireAuth><ProTools /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
