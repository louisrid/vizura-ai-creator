import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group !fixed !top-[73px] !right-4 !left-auto !bottom-auto !transform-none"
      position="top-right"
      duration={2800}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-black group-[.toaster]:text-white group-[.toaster]:border-0 group-[.toaster]:shadow-md group-[.toaster]:rounded-lg group-[.toaster]:font-[800] group-[.toaster]:lowercase group-[.toaster]:px-4 group-[.toaster]:py-2.5 group-[.toaster]:text-[0.8rem] group-[.toaster]:w-auto group-[.toaster]:min-w-0 group-[.toaster]:max-w-[15rem]",
          description: "group-[.toast]:text-white group-[.toast]:font-[800] group-[.toast]:text-xs group-[.toast]:lowercase",
          actionButton: "group-[.toast]:bg-white group-[.toast]:text-black",
          cancelButton: "group-[.toast]:bg-white/20 group-[.toast]:text-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
