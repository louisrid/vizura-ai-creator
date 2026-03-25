import Header from "@/components/Header";

const ComingSoon = ({ title }: { title: string }) => (
  <div className="min-h-screen bg-background">
    <Header />
    <main className="w-full max-w-lg mx-auto px-4 pt-20 pb-10">
      <div className="text-center">
        <p className="text-xs font-bold lowercase text-muted-foreground mb-2">{title}</p>
        <p className="text-lg font-extrabold lowercase">coming soon</p>
      </div>
    </main>
  </div>
);

export const Account = () => <ComingSoon title="account" />;
export const Help = () => <ComingSoon title="help" />;
export const Settings = () => <ComingSoon title="settings" />;
