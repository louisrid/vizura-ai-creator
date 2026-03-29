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
      duration={2800}
      style={{ top: "5rem", right: "1rem" }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-black group-[.toaster]:text-white group-[.toaster]:border-0 group-[.toaster]:shadow-lg group-[.toaster]:rounded-full group-[.toaster]:font-extrabold group-[.toaster]:lowercase group-[.toaster]:px-5 group-[.toaster]:py-2.5 group-[.toaster]:text-xs group-[.toaster]:w-auto group-[.toaster]:min-w-0 group-[.toaster]:max-w-[14rem]",
          description: "group-[.toast]:text-white group-[.toast]:font-extrabold group-[.toast]:text-xs group-[.toast]:lowercase",
          actionButton: "group-[.toast]:bg-white group-[.toast]:text-black",
          cancelButton: "group-[.toast]:bg-white/20 group-[.toast]:text-white",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
