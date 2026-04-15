import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global app data cache — fetched once at startup, shared across all pages.
 * Pages read from this cache instead of fetching independently.
 * Call refresh functions only when data actually changes (new character, new photo, deletion).
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
  charactersLoaded: boolean;
  generationsLoaded: boolean;
  refreshCharacters: () => Promise<void>;
  refreshGenerations: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export const useAppData = () => {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be inside AppDataProvider");
  return ctx;
};

export const AppDataProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [characters, setCharacters] = useState<CachedCharacter[]>([]);
  const [generations, setGenerations] = useState<CachedGeneration[]>([]);
  const [charactersLoaded, setCharactersLoaded] = useState(false);
  const [generationsLoaded, setGenerationsLoaded] = useState(false);
  const fetchIdRef = useRef(0);

  const refreshCharacters = useCallback(async () => {
    if (!user) {
      setCharacters([]);
      setCharactersLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("characters")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      setCharacters(data as CachedCharacter[]);
    }
    setCharactersLoaded(true);
  }, [user]);

  const refreshGenerations = useCallback(async () => {
    if (!user) {
      setGenerations([]);
      setGenerationsLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("generations")
      .select("id, image_urls, prompt, character_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      setGenerations(data as CachedGeneration[]);
    }
    setGenerationsLoaded(true);
  }, [user]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshCharacters(), refreshGenerations()]);
  }, [refreshCharacters, refreshGenerations]);

  // Fetch everything once when user is known
  useEffect(() => {
    if (authLoading) return;
    const id = ++fetchIdRef.current;

    if (!user) {
      setCharacters([]);
      setGenerations([]);
      setCharactersLoaded(true);
      setGenerationsLoaded(true);
      return;
    }

    // Reset loaded flags so pages show skeletons on user change
    setCharactersLoaded(false);
    setGenerationsLoaded(false);

    void Promise.all([refreshCharacters(), refreshGenerations()]);

    return () => { fetchIdRef.current = id + 1; };
  }, [authLoading, user?.id]);

  // Listen for test-reset events
  useEffect(() => {
    const handler = () => { void refreshAll(); };
    window.addEventListener("facefox:test-reset-complete", handler);
    return () => window.removeEventListener("facefox:test-reset-complete", handler);
  }, [refreshAll]);

  return (
    <AppDataContext.Provider
      value={{
        characters,
        generations,
        charactersLoaded,
        generationsLoaded,
        refreshCharacters,
        refreshGenerations,
        refreshAll,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};
