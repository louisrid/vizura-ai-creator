import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      duration={2500}
      visibleToasts={1}
      expand={false}
      closeButton={false}
      offset={{ top: 73, right: 16 }}
      icons={{
        success: null,
        error: null,
        info: null,
        warning: null,
        loading: null,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "bg-black text-white rounded-[6px] w-[250px] min-w-[250px] max-w-[250px] h-10 min-h-10 px-3 py-0 flex items-center justify-start shadow-none border-0 whitespace-nowrap overflow-hidden text-ellipsis text-sm font-extrabold lowercase leading-none",
          title: "m-0 p-0 text-sm font-extrabold lowercase leading-none whitespace-nowrap overflow-hidden text-ellipsis text-white",
          description: "m-0 p-0 text-sm font-extrabold lowercase leading-none whitespace-nowrap overflow-hidden text-ellipsis text-white",
          content: "flex items-center justify-start w-full min-w-0 overflow-hidden",
          actionButton: "hidden",
          cancelButton: "hidden",
          closeButton: "hidden",
          icon: "hidden",
        },
      }}
      style={{
        position: "fixed",
        top: "73px",
        right: "16px",
        left: "auto",
        bottom: "auto",
        width: "250px",
        zIndex: 9999,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
