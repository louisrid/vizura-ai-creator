import { Sparkles } from "lucide-react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";

const ComingSoon = ({ title }: { title: string }) => (
  <div className="min-h-screen bg-background">
    <Header />
    <main className="w-full max-w-lg mx-auto px-4 pt-12 pb-12">
      <div className="flex items-center gap-3 mb-10">
        <BackButton />
      </div>
      <PageTitle>{title}</PageTitle>
      <div className="border-gradient-purple rounded-2xl p-8 text-center bg-card">
        <Sparkles size={20} className="mx-auto mb-3" style={{ stroke: "url(#icon-gradient-purple)" }} />
        <p className="text-sm font-extrabold lowercase text-foreground">coming soon</p>
        <p className="text-xs font-bold lowercase text-foreground mt-2">this feature is on the way</p>
      </div>
    </main>
  </div>
);

export const Help = () => <ComingSoon title="help" />;
