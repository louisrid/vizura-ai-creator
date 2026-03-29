import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      duration={2500}
      visibleToasts={1}
      gap={0}
      offset={0}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-black group-[.toaster]:text-white group-[.toaster]:border-0 group-[.toaster]:shadow-none group-[.toaster]:rounded-[6px] group-[.toaster]:font-[800] group-[.toaster]:lowercase group-[.toaster]:px-3.5 group-[.toaster]:py-2 group-[.toaster]:text-[0.75rem] group-[.toaster]:w-auto group-[.toaster]:min-w-0 group-[.toaster]:max-w-[200px] group-[.toaster]:leading-tight",
          description: "group-[.toast]:text-white group-[.toast]:font-[800] group-[.toast]:text-[0.7rem] group-[.toast]:lowercase",
          actionButton: "group-[.toast]:bg-white group-[.toast]:text-black",
          cancelButton: "group-[.toast]:bg-white/20 group-[.toast]:text-white",
          closeButton: "hidden",
          icon: "hidden",
        },
      }}
      icons={{
        success: null,
        error: null,
        info: null,
        warning: null,
        loading: null,
      }}
      style={{
        position: "fixed",
        top: "73px",
        right: "16px",
        left: "auto",
        bottom: "auto",
        width: "auto",
        zIndex: 9998,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
