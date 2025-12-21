type HapticType = "light" | "medium" | "success" | "warning" | "error";

const vib = (pattern: number | number[]) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
};

export const triggerHaptic = (type: HapticType = "light") => {
  switch (type) {
    case "success":
      vib([0, 8, 16]);
      break;
    case "warning":
      vib([0, 12, 20]);
      break;
    case "error":
      vib([0, 18, 30]);
      break;
    case "medium":
      vib(14);
      break;
    case "light":
    default:
      vib(10);
      break;
  }
};
