import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Map from "./pages/Map";
import Agenda from "./pages/Agenda";
import AIFeatures from "./pages/AIFeatures";
import ProTools from "./pages/ProTools";
import Login from "./pages/Login";
import ContactsPage from "./pages/Contacts";
import Analytics from "./pages/Analytics";
import Imports from "./pages/Imports";
import SettingsPage from "./pages/Settings";
import UsersPage from "./pages/Users";
import LogoutPage from "./pages/Logout";
import SignUp from "./pages/SignUp";
import Support from "./pages/Support";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { queryClient } from "@/lib/queryClient";

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const LayoutRoute = ({
  title,
  breadcrumbs,
  children,
}: {
  title: string;
  breadcrumbs: { label: string; href?: string }[];
  children: JSX.Element;
}) => (
  <AppLayout title={title} breadcrumbs={breadcrumbs}>
    {children}
  </AppLayout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <BrowserRouter>
            <ErrorBoundary>
              <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/support" element={<Support />} />
            <Route
              path="/contacts"
              element={
                <RequireAuth>
                  <LayoutRoute
                    title="Contacts"
                    breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Contacts" }]}
                  >
                    <ContactsPage />
                  </LayoutRoute>
                </RequireAuth>
              }
            />
            <Route
              path="/prospection"
              element={
                <RequireAuth>
                  <LayoutRoute
                    title="Prospection"
                    breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Prospection" }]}
                  >
                    <ContactsPage />
                  </LayoutRoute>
                </RequireAuth>
              }
            />
            <Route
              path="/"
              element={
                <RequireAuth>
                    <LayoutRoute title="Dashboard" breadcrumbs={[{ label: "Dashboard" }]}>
                      <Index />
                    </LayoutRoute>
                  </RequireAuth>
                }
              />
              <Route
                path="/map"
                element={
                  <RequireAuth>
                    <LayoutRoute title="Carte" breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Carte" }]}>
                      <Map />
                    </LayoutRoute>
                  </RequireAuth>
                }
              />
              <Route
                path="/agenda"
                element={
                  <RequireAuth>
                    <LayoutRoute
                      title="Agenda"
                      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Agenda" }]}
                    >
                      <Agenda />
                    </LayoutRoute>
                  </RequireAuth>
                }
              />
              <Route
                path="/ai-features"
              element={
                <RequireAuth>
                  <LayoutRoute
                    title="AI Features"
                    breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "AI Features" }]}
                    >
                      <AIFeatures />
                    </LayoutRoute>
                  </RequireAuth>
                }
              />
              <Route
                path="/pro-tools"
                element={
                  <RequireAuth>
                    <LayoutRoute
                      title="Pro Tools"
                      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Pro Tools" }]}
                    >
                      <ProTools />
                    </LayoutRoute>
                  </RequireAuth>
                }
              />
              <Route
                path="/analytics"
                element={
                  <RequireAuth>
                    <LayoutRoute
                      title="Analytics"
                      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Analytics" }]}
                    >
                      <Analytics />
                    </LayoutRoute>
                  </RequireAuth>
                }
              />
              <Route
                path="/imports"
                element={
                  <RequireAuth>
                    <LayoutRoute
                      title="Imports"
                      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Imports" }]}
                    >
                      <Imports />
                    </LayoutRoute>
                  </RequireAuth>
                }
              />
              <Route
                path="/settings"
                element={
                  <RequireAuth>
                    <LayoutRoute
                      title="Settings"
                      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Settings" }]}
                    >
                      <SettingsPage />
                    </LayoutRoute>
                  </RequireAuth>
                }
              />
              <Route
                path="/users"
                element={
                  <RequireAuth>
                    <LayoutRoute
                      title="User management"
                      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "User management" }]}
                    >
                      <UsersPage />
                    </LayoutRoute>
                  </RequireAuth>
                }
              />
              <Route
                path="/logout"
                element={
                  <RequireAuth>
                    <LogoutPage />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
