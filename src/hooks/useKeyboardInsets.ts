import { useEffect } from "react";

/**
 * Syncs CSS variable --kb-offset with the visual viewport height delta.
 * Helps avoid layout jumps when keyboard opens on mobile.
 */
export function useKeyboardInsets() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handler = () => {
      const offset = Math.max(0, (window.innerHeight - viewport.height) || 0);
      document.documentElement.style.setProperty("--kb-offset", `${offset}px`);
    };

    handler();
    viewport.addEventListener("resize", handler);
    viewport.addEventListener("scroll", handler);
    return () => {
      viewport.removeEventListener("resize", handler);
      viewport.removeEventListener("scroll", handler);
      document.documentElement.style.removeProperty("--kb-offset");
    };
  }, []);
}

/**
 * Utility className for sticky submit bars that account for keyboard offset.
 */
export const keyboardSafeSticky = "sticky bottom-0 pb-[max(env(safe-area-inset-bottom),var(--kb-offset,0px))]";
