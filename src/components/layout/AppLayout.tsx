import { useState } from "react";
import TopNav from "./TopNav";
import SidebarNav from "./SidebarNav";
import RightPanel from "./RightPanel";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface AppLayoutProps {
  title?: string;
  breadcrumbs?: Breadcrumb[];
  rightPanel?: React.ReactNode;
  children: React.ReactNode;
}

const AppLayout = ({ title, breadcrumbs = [], rightPanel, children }: AppLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <TopNav
        title={title}
        breadcrumbs={breadcrumbs}
        onToggleSidebar={() => setIsSidebarOpen((s) => !s)}
        onToggleMobileMenu={() => setIsMobileMenuOpen((s) => !s)}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      <div className="flex flex-1 overflow-hidden">
        <SidebarNav
          isOpen={isSidebarOpen}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
        <main
          className="flex-1 overflow-y-auto"
          role="main"
          aria-label={title || "Contenu principal"}
          tabIndex={0}
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">{children}</div>
        </main>
        {rightPanel && <RightPanel>{rightPanel}</RightPanel>}
      </div>
    </div>
  );
};

export default AppLayout;
