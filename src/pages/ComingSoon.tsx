import { Sparkles } from "@/lib/icons";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";

const ComingSoon = ({ title }: { title: string }) => (
  <div className="min-h-screen">
    <main className="w-full max-w-lg md:max-w-3xl mx-auto px-[20px] md:px-[44px] pt-[80px] pb-[140px] md:flex md:flex-col md:items-center md:justify-center md:min-h-screen md:pt-0 md:pb-0">
      <div className="w-full">
        <div className="flex items-center gap-[14px] mb-14">
          <BackButton />
          <PageTitle className="mb-0">{title}</PageTitle>
        </div>
        <div className="border-[2px] border-neon-yellow rounded-[9.6px] p-8 md:p-12 text-center bg-black md:max-w-md md:mx-auto">
          <Sparkles size={20} className="mx-auto mb-3 text-neon-yellow md:w-7 md:h-7" />
          <p className="text-sm md:text-base font-extrabold lowercase text-foreground">coming soon</p>
          <p className="text-xs md:text-sm font-bold lowercase text-foreground/50 mt-2">this feature is on the way</p>
        </div>
      </div>
    </main>
  </div>
);

export const Help = () => <ComingSoon title="help" />;
