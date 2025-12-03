"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"

import { cn } from "@/lib/utils"

export default function Label({
  htmlFor,
  className,
  children,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { htmlFor?: string }) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn("flex items-center gap-2 text-sm ...", className)}
      // allow parent to control the htmlFor attribute
      {...props}
    >
      {/* if parent passed htmlFor, it will be used by the actual <label> element */}
      {children}
    </LabelPrimitive.Root>
  );
}

export { Label }
