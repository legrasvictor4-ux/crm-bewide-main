import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-neutral-700 transition-[background-color,transform,box-shadow] duration-200 ease-out data-[state=checked]:bg-[#0A84FF] data-[state=unchecked]:bg-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60 px-[2px] py-[2px] touch-manipulation after:content-[''] after:absolute after:-inset-2 after:rounded-full after:pointer-events-none",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-[27px] w-[27px] translate-x-[2px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.25)] ring-0 transition-transform duration-200 ease-out data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[2px]",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
