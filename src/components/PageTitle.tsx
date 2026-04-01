import { cn } from "@/lib/utils";

const PageTitle = ({ children, className }: { children: string; className?: string }) => (
  <h1 className={cn("text-3xl font-extrabold lowercase text-foreground tracking-tight leading-[0.95] mb-10", className)}>
    {children}
  </h1>
);

export default PageTitle;
