import { useCallback, useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { bootLog } from "@/lib/bootstrapLogger";
import { queryClient } from "@/lib/queryClient";
import MotionRoutes from "@/components/layout/MotionRoutes";
import SplashScreen from "@/components/layout/SplashScreen";
import { installGlobalErrorHandlers } from "@/lib/globalErrorHandler";

const Index = lazy(() => import("./pages/Index"));
const Map = lazy(() => import("./pages/Map"));
const Agenda = lazy(() => import("./pages/Agenda"));
const AIFeatures = lazy(() => import("./pages/AIFeatures"));
const ProTools = lazy(() => import("./pages/ProTools"));
const Login = lazy(() => import("./pages/Login"));
const ContactsPage = lazy(() => import("./pages/Contacts"));
const TimelinePage = lazy(() => import("./pages/Timeline"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Imports = lazy(() => import("./pages/Imports"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const UsersPage = lazy(() => import("./pages/Users"));
const LogoutPage = lazy(() => import("./pages/Logout"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Support = lazy(() => import("./pages/Support"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Scout = lazy(() => import("./pages/Scout"));

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { token, ready } = useAuth();
  // En tests, `ready` peut être `undefined` (mock partiel). On rend par défaut.
  if (ready === false) return null;
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const PublicOnly = ({ children }: { children: JSX.Element }) => {
  const { token, ready } = useAuth();
  // En tests, `ready` peut être `undefined` (mock partiel). On rend par défaut.
  if (ready === false) return null;
  if (token) return <Navigate to="/" replace />;
  return children;
};

const LayoutRoute = ({
  title,
  children,
}: {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
  children: JSX.Element;
}) => (
  <AppLayout title={title}>
    {children}
  </AppLayout>
);

const App = () => {
  bootLog("app_render_start", true);
  const isTestEnv = typeof process !== "undefined" && process.env?.NODE_ENV === "test";
  const [showSplash, setShowSplash] = useState(!isTestEnv);
  const handleSplashDone = useCallback(() => setShowSplash(false), []);
  const [errorResetKey, setErrorResetKey] = useState(0);

  // Install global error handlers once — captures all unhandled errors across the app
  useEffect(() => {
    installGlobalErrorHandlers({ source: "react" });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {showSplash && <SplashScreen onDone={handleSplashDone} />}
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <ErrorBoundary resetKey={errorResetKey}>
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-pulse text-muted-foreground">Chargement...</div></div>}>
                <MotionRoutes>
                  <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
                <Route path="/signup" element={<PublicOnly><SignUp /></PublicOnly>} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
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
                  path="/timeline"
                  element={
                    <RequireAuth>
                      <LayoutRoute
                        title="Timeline"
                        breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Timeline" }]}
                      >
                        <TimelinePage />
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
                  path="/scout"
                  element={
                    <RequireAuth>
                      <LayoutRoute title="Scout IA" breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Scout IA" }]}>
                        <Scout />
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
                </MotionRoutes>
              </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </ThemeProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
