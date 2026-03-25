import { Sparkles } from "lucide-react";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import PageTransition from "@/components/PageTransition";
import PageTitle from "@/components/PageTitle";

const ComingSoon = ({ title }: { title: string }) => (
  <div className="min-h-screen bg-background">
    <Header />
    <PageTransition>
      <main className="w-full max-w-lg mx-auto px-4 pt-12 pb-12">
        <div className="flex items-center gap-3 mb-10">
          <BackButton />
        </div>
        <PageTitle>{title}</PageTitle>
        <div className="border-2 border-accent-purple/20 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-xl gradient-purple mx-auto mb-4 flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <p className="text-sm font-extrabold lowercase gradient-purple-text">coming soon</p>
          <p className="text-xs font-bold lowercase text-muted-foreground mt-2">this feature is on the way</p>
        </div>
      </main>
    </PageTransition>
  </div>
);

export const Account = () => <ComingSoon title="account" />;
export const Help = () => <ComingSoon title="help" />;
export const Settings = () => <ComingSoon title="settings" />;
export const CreatePhoto = () => <ComingSoon title="create photo" />;
export const MyCharactersPage = () => <ComingSoon title="my characters" />;
export const StoragePage = () => <ComingSoon title="storage" />;