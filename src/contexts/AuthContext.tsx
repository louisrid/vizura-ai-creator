import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  autoSignIn: () => Promise<void>;
}

const STARTER_CHARACTER = {
  name: "ava",
  country: "pale",
  age: "22",
  hair: "blonde",
  eye: "blue",
  body: "slim",
  style: "natural",
  description: "medium chest, straight hair.",
  generation_prompt: "photorealistic portrait, 22 year old woman, pale skin, slim body type, medium chest, straight blonde hair, blue eyes, natural makeup, professional photography, natural lighting, shallow depth of field, hyperdetailed",
  face_image_url: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<ReturnType<typeof supabase.auth.onAuthStateChange>["data"]["subscription"] | null>(null);
  const starterProvisionedRef = useRef<Set<string>>(new Set());

  const ensureStarterCharacter = useCallback(async (userId: string) => {
    if (starterProvisionedRef.current.has(userId)) return;
    starterProvisionedRef.current.add(userId);
    try {
      const { count } = await supabase
        .from("characters")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if ((count ?? 0) > 0) return;
      await supabase.from("characters").insert({ user_id: userId, ...STARTER_CHARACTER });
    } catch (err) {
      console.error("Starter character error:", err);
      starterProvisionedRef.current.delete(userId);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (cancelled) return;
        const currentUser = data.session?.user ?? null;
        setUser(currentUser);
        if (currentUser) void ensureStarterCharacter(currentUser.id);
      } finally {
        if (cancelled) return;
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_OUT") {
            setUser(null);
            return;
          }
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
            const nextUser = session?.user ?? null;
            setUser(nextUser);
            if (nextUser) void ensureStarterCharacter(nextUser.id);
          }
        });
        subscriptionRef.current = sub.subscription;
        setLoading(false);
      }
    };

    void initializeAuth();

    return () => {
      cancelled = true;
      subscriptionRef.current?.unsubscribe();
    };
  }, [ensureStarterCharacter]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const autoSignIn = async () => {
    const id = crypto.randomUUID().slice(0, 8);
    const email = `user-${id}@vizura.app`;
    const password = crypto.randomUUID();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword, autoSignIn }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
