import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import PageTransition from "@/components/PageTransition";

const ComingSoon = ({ title }: { title: string }) => (
  <div className="min-h-screen bg-background">
    <Header />
    <PageTransition>
      <main className="w-full max-w-lg mx-auto px-4 pt-44 pb-12">
        <div className="flex items-center gap-3 mb-10">
          <BackButton />
        </div>
        <div className="border-2 border-border rounded-xl p-6 text-center">
          <p className="text-xs font-extrabold lowercase">coming soon</p>
        </div>
      </main>
    </PageTransition>
  </div>
);

export const Account = () => <ComingSoon title="account" />;
export const Help = () => <ComingSoon title="help" />;
export const Settings = () => <ComingSoon title="settings" />;
