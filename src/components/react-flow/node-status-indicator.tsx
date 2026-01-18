import { type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type NodeStatus = "loading" | "success" | "error" | "initial";

export type NodeStatusVariant = "overlay" | "border";

export type NodeStatusIndicatorProps = {
  status?: NodeStatus;
  variant?: NodeStatusVariant;
  rounded?: "default" | "full";
  children: ReactNode;
  className?: string;
};

export const SpinnerLoadingIndicator = ({
  children,
  rounded = "default",
}: {
  children: ReactNode;
  rounded?: "default" | "full";
}) => {
  const roundedClass = rounded === "full" ? "rounded-full" : "rounded-[7px]";
  
  return (
    <div className="relative">
      <StatusBorder className="border-blue-700/40 dark:border-blue-400/40" rounded={rounded}>{children}</StatusBorder>

      <div className={cn("absolute inset-0 z-50 bg-background/50 backdrop-blur-sm", roundedClass)} />
      <div className="absolute inset-0 z-50">
        <span className="absolute left-[calc(50%-1.25rem)] top-[calc(50%-1.25rem)] inline-block h-10 w-10 animate-ping rounded-full bg-blue-700/20 dark:bg-blue-400/20" />

        <LoaderCircle className="absolute left-[calc(50%-0.75rem)] top-[calc(50%-0.75rem)] size-6 animate-spin text-blue-700 dark:text-blue-400" />
      </div>
    </div>
  );
};

export const BorderLoadingIndicator = ({
  children,
  className,
  rounded = "default",
}: {
  children: ReactNode;
  className?: string;
  rounded?: "default" | "full";
}) => {
  const containerRoundedClass = rounded === "full" ? "rounded-full" : "rounded-sm";
  
  return (
    <>
      <div className="absolute -left-[2px] -top-[2px] h-[calc(100%+4px)] w-[calc(100%+4px)]">
        <style>
          {`
        @keyframes spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .spinner {
          animation: spin 2s linear infinite;
          position: absolute;
          left: 50%;
          top: 50%;
          width: 140%;
          aspect-ratio: 1;
          transform-origin: center;
        }
      `}
        </style>
        <div className={cn("absolute inset-0 overflow-hidden", containerRoundedClass, className,)}>
          <div className="spinner rounded-full bg-[conic-gradient(from_0deg_at_50%_50%,_rgba(42,67,233,0.5)_0deg,_rgba(42,138,246,0)_360deg)]" />
        </div>
      </div>
      {children}
    </>
  );
};

const StatusBorder = ({
  children,
  className,
  rounded = "default",
}: {
  children: ReactNode;
  className?: string;
  rounded?: "default" | "full";
}) => {
  const roundedClass = rounded === "full" ? "rounded-full" : "rounded-md";
  
  return (
    <>
      <div
        className={cn(
          "absolute -left-[2px] -top-[2px] h-[calc(100%+4px)] w-[calc(100%+4px)] border-3",
          roundedClass,
          className,
        )}
      />
      {children}
    </>
  );
};

export const NodeStatusIndicator = ({
  status,
  variant = "border",
  rounded = "default",
  children,
  className,
}: NodeStatusIndicatorProps) => {
  switch (status) {
    case "loading":
      switch (variant) {
        case "overlay":
          return <SpinnerLoadingIndicator rounded={rounded}>{children}</SpinnerLoadingIndicator>;
        case "border":
          return <BorderLoadingIndicator className={className} rounded={rounded}>{children}</BorderLoadingIndicator>;
        default:
          return <>{children}</>;
      }
    case "success":
      return (
        <StatusBorder className={cn("border-green-700/50 dark:border-green-400/50", className)} rounded={rounded}>{children}</StatusBorder>
      );
    case "error":
      return <StatusBorder className={cn("border-red-700/50 dark:border-red-400/50", className)} rounded={rounded}>{children}</StatusBorder>;
    default:
      return <>{children}</>;
  }
};
