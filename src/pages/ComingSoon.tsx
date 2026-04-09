import { Sparkles } from "lucide-react";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";

const ComingSoon = ({ title }: { title: string }) => (
  <div className="min-h-screen bg-background">
    <main className="w-full max-w-lg md:max-w-3xl mx-auto px-4 md:px-10 pt-10 pb-[280px] md:flex md:flex-col md:items-center md:justify-center md:min-h-screen md:pt-0 md:pb-0">
      <div className="w-full">
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
          <PageTitle className="mb-0">{title}</PageTitle>
        </div>
        <div className="border-[2px] border-neon-yellow rounded-2xl p-8 md:p-12 text-center bg-card md:max-w-md md:mx-auto">
          <Sparkles size={20} className="mx-auto mb-3 text-neon-yellow md:w-7 md:h-7" />
          <p className="text-sm md:text-base font-extrabold lowercase text-foreground">coming soon</p>
          <p className="text-xs md:text-sm font-bold lowercase text-foreground/50 mt-2">this feature is on the way</p>
        </div>
      </div>
    </main>
  </div>
);

export const Help = () => <ComingSoon title="help" />;
