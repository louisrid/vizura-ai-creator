import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global app data cache with localStorage persistence.
 * - On mount: hydrate from localStorage instantly → pages render cached content with zero delay.
 * - Background fetch updates cache + localStorage; UI only re-renders if data actually changed.
 * - Pages never need their own fetch logic.
 */

export interface CachedCharacter {
  id: string;
  name: string;
  age: string;
  country: string;
  hair: string;
  eye: string;
  body: string;
  style: string;
  description: string;
  bust_size: string;
  face_image_url: string | null;
  face_angle_url: string | null;
  body_anchor_url: string | null;
  generation_prompt: string | null;
  created_at: string;
  updated_at: string;
}

export interface CachedGeneration {
  id: string;
  image_urls: string[];
  prompt: string;
  character_id: string | null;
  created_at: string;
}

interface AppDataContextValue {
  characters: CachedCharacter[];
  generations: CachedGeneration[];
  /** true once we have *some* data (cached or fetched) — pages can render immediately */
  charactersReady: boolean;
  generationsReady: boolean;
  refreshCharacters: () => Promise<void>;
  refreshGenerations: () => Promise<void>;
  refreshAll: () => Promise<void>;
  /** Re-query characters and generations from Supabase. Alias for refreshAll. */
  refetch: () => Promise<void>;
}

const CHARS_KEY = "facefox_cached_characters";
const GENS_KEY = "facefox_cached_generations";
const CACHE_USER_KEY = "facefox_cached_user_id";

const readLocal = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch { return null; }
};

const writeLocal = (key: string, data: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
};

const clearLocal = () => {
  try {
    localStorage.removeItem(CHARS_KEY);
    localStorage.removeItem(GENS_KEY);
    localStorage.removeItem(CACHE_USER_KEY);
  } catch {}
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export const useAppData = () => {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be inside AppDataProvider");
  return ctx;
};

export const AppDataProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();

  // Hydrate from localStorage on first render if same user
  const [characters, setCharacters] = useState<CachedCharacter[]>(() => {
    if (typeof window === "undefined") return [];
    const cachedUserId = localStorage.getItem(CACHE_USER_KEY);
    // We don't know user yet during SSR/init, but check if cache exists
    const cached = readLocal<CachedCharacter[]>(CHARS_KEY);
    return cached && cachedUserId ? cached : [];
  });

  const [generations, setGenerations] = useState<CachedGeneration[]>(() => {
    if (typeof window === "undefined") return [];
    const cachedUserId = localStorage.getItem(CACHE_USER_KEY);
    const cached = readLocal<CachedGeneration[]>(GENS_KEY);
    return cached && cachedUserId ? cached : [];
  });

  // "ready" = we have some data to show (cached OR fetched). True immediately if localStorage had data.
  const [charactersReady, setCharactersReady] = useState(() => {
    if (typeof window === "undefined") return false;
    const hasUser = !!localStorage.getItem(CACHE_USER_KEY) || !!localStorage.getItem("facefox_cached_user");
    return !!localStorage.getItem(CHARS_KEY) && hasUser;
  });
  const [generationsReady, setGenerationsReady] = useState(() => {
    if (typeof window === "undefined") return false;
    const hasUser = !!localStorage.getItem(CACHE_USER_KEY) || !!localStorage.getItem("facefox_cached_user");
    return !!localStorage.getItem(GENS_KEY) && hasUser;
  });

  const fetchIdRef = useRef(0);

  const refreshCharacters = useCallback(async () => {
    if (!user) {
      setCharacters([]);
      setCharactersReady(true);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (!error && data) {
        setCharacters(data as CachedCharacter[]);
        writeLocal(CHARS_KEY, data);
        writeLocal(CACHE_USER_KEY, user.id);
      }
    } catch (err) {
      console.error("refreshCharacters failed:", err);
    } finally {
      // Always flip ready, even on error — otherwise blocking loaders never release
      // and the yellow splash hangs forever on a silent network failure.
      setCharactersReady(true);
    }
  }, [user]);

  const refreshGenerations = useCallback(async () => {
    if (!user) {
      setGenerations([]);
      setGenerationsReady(true);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("generations")
        .select("id, image_urls, prompt, character_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!error && data) {
        setGenerations(data as CachedGeneration[]);
        writeLocal(GENS_KEY, data);
        writeLocal(CACHE_USER_KEY, user.id);
      }
    } catch (err) {
      console.error("refreshGenerations failed:", err);
    } finally {
      setGenerationsReady(true);
    }
  }, [user]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshCharacters(), refreshGenerations()]);
  }, [refreshCharacters, refreshGenerations]);

  // Kick off parallel fetch on mount if we have a cached user — saves time on return visits
  useEffect(() => {
    const cachedUserId = localStorage.getItem(CACHE_USER_KEY);
    if (!cachedUserId) return;
    void Promise.all([refreshCharacters(), refreshGenerations()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On user change: hydrate from cache instantly, then background refresh
  useEffect(() => {
    if (authLoading) return;
    if (user) writeLocal(CACHE_USER_KEY, user.id);
    const id = ++fetchIdRef.current;

    if (!user) {
      setCharacters([]);
      setGenerations([]);
      setCharactersReady(true);
      setGenerationsReady(true);
      clearLocal();
      return;
    }

    // Check if localStorage cache belongs to this user
    const cachedUserId = localStorage.getItem(CACHE_USER_KEY);
    if (cachedUserId === user.id) {
      // Hydrate instantly — pages render cached content with no loading state
      const cachedChars = readLocal<CachedCharacter[]>(CHARS_KEY);
      const cachedGens = readLocal<CachedGeneration[]>(GENS_KEY);
      if (cachedChars) { setCharacters(cachedChars); setCharactersReady(true); }
      if (cachedGens) { setGenerations(cachedGens); setGenerationsReady(true); }
    } else {
      // Different user — clear stale cache
      clearLocal();
      setCharacters([]);
      setGenerations([]);
      setCharactersReady(false);
      setGenerationsReady(false);
    }

    // Background refresh — silently update if data changed
    void Promise.all([refreshCharacters(), refreshGenerations()]);

    return () => { fetchIdRef.current = id + 1; };
  }, [authLoading, user?.id]);

  // Listen for data-changed events
  useEffect(() => {
    const handleCharsChanged = () => { void refreshCharacters(); };
    const handleGensChanged = () => { void refreshGenerations(); };
    window.addEventListener("facefox:characters-changed", handleCharsChanged);
    window.addEventListener("facefox:generations-changed", handleGensChanged);
    return () => {
      window.removeEventListener("facefox:characters-changed", handleCharsChanged);
      window.removeEventListener("facefox:generations-changed", handleGensChanged);
    };
  }, [refreshCharacters, refreshGenerations]);

  return (
    <AppDataContext.Provider
      value={{
        characters,
        generations,
        charactersReady,
        generationsReady,
        refreshCharacters,
        refreshGenerations,
        refreshAll,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};
