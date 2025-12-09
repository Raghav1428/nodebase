import { cn } from "@/lib/utils";

export const Container = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("max-w-7xl mx-auto w-full px-4 md:px-8", className)}>
      {children}
    </div>
  );
};
