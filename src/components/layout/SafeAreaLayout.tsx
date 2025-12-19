import type { PropsWithChildren } from "react";

/**
 * Wraps the app to respect device safe areas (notches/home indicator)
 * and sets CSS variables for padding.
 */
const SafeAreaLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="safe-area bg-background text-foreground min-h-screen flex flex-col">
      {children}
    </div>
  );
};

export default SafeAreaLayout;
