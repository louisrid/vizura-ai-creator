import { Sparkles } from "lucide-react";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";

const ComingSoon = ({ title }: { title: string }) => (
  <div className="min-h-screen bg-background">
    <main className="w-full max-w-lg mx-auto px-4 pt-1 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <BackButton />
        <PageTitle className="mb-0">{title}</PageTitle>
      </div>
      <div className="border-[2px] border-neon-yellow rounded-2xl p-8 text-center bg-card">
        <Sparkles size={20} className="mx-auto mb-3 text-neon-yellow" />
        <p className="text-sm font-extrabold lowercase text-foreground">coming soon</p>
        <p className="text-xs font-bold lowercase text-foreground/50 mt-2">this feature is on the way</p>
      </div>
    </main>
  </div>
);

export const Help = () => <ComingSoon title="help" />;
