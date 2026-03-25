import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  // If already signed in, redirect home
  if (user) {
    navigate("/", { replace: true });
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signIn(email, password);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="w-full max-w-lg mx-auto px-4 pt-16 pb-12">
        <div className="flex items-center gap-3 mb-10">
          <BackButton />
        </div>

        <h1 className="text-4xl font-extrabold lowercase tracking-tight text-foreground mb-10">sign in</h1>

        <div className="border-[5px] border-border rounded-2xl p-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <span className="block text-xs font-extrabold lowercase text-foreground mb-2">email</span>
              <div className="relative">
                <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border-[5px] border-border bg-background text-foreground pl-10 pr-4 py-3.5 text-xs font-extrabold lowercase placeholder:text-foreground focus:outline-none focus:border-foreground rounded-2xl transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-extrabold lowercase text-foreground mb-2">password</span>
              <div className="relative">
                <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border-[5px] border-border bg-background text-foreground pl-10 pr-4 py-3.5 text-xs font-extrabold lowercase placeholder:text-foreground focus:outline-none focus:border-foreground rounded-2xl transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button className="w-full h-16 text-sm">
              sign in <ArrowRight size={14} />
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Auth;
