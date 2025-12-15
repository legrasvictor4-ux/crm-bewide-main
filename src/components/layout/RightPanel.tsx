interface RightPanelProps {
  children: React.ReactNode;
}

const RightPanel = ({ children }: RightPanelProps) => (
  <aside
    className="hidden xl:flex w-80 flex-col border-l border-border bg-card/60 backdrop-blur-lg"
    aria-label="Panneau contextuel"
  >
    <div className="flex-1 overflow-y-auto p-4 space-y-3">{children}</div>
  </aside>
);

export default RightPanel;
