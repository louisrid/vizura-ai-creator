import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { registerBlockingLoader } from "@/lib/startupSplash";

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
const CACHE_TIMESTAMP_KEY = "facefox_cache_timestamp";
const CACHE_STALE_MS = 30_000;
const QUERY_TIMEOUT_MS = 8_000;

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

  // "ready" = pages can render from cache instantly without grey placeholders.
  // Mark ready as soon as a cached array exists in any form — do not gate on a
  // strict user-id match, which fails on auth refresh / cache-key-shape mismatches
  // and would otherwise force pages back into a grey-skeleton state on every reload.
  const [charactersReady, setCharactersReady] = useState(() => {
    if (typeof window === "undefined") return false;
    const cached = readLocal<CachedCharacter[]>(CHARS_KEY);
    return Array.isArray(cached);
  });
  const [generationsReady, setGenerationsReady] = useState(() => {
    if (typeof window === "undefined") return false;
    const cached = readLocal<CachedGeneration[]>(GENS_KEY);
    return Array.isArray(cached);
  });

  const fetchIdRef = useRef(0);

  const refreshCharacters = useCallback(async () => {
    if (!user) {
      setCharacters([]);
      setCharactersReady(true);
      return;
    }

    let releasedReady = false;
    const readyTimer = window.setTimeout(() => {
      releasedReady = true;
      setCharactersReady(true);
    }, QUERY_TIMEOUT_MS);

    try {
      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("[AppData] characters fetch error:", error.message, error);
      } else if (data) {
        setCharacters(data as CachedCharacter[]);
        writeLocal(CHARS_KEY, data);
        writeLocal(CACHE_USER_KEY, user.id);
        try { localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now())); } catch {}
      }
    } catch (err) {
      console.error("[AppData] refreshCharacters threw:", err);
    } finally {
      window.clearTimeout(readyTimer);
      // Always flip ready, even on error — otherwise blocking loaders never release
      // and the yellow splash hangs forever on a silent network failure.
      if (!releasedReady) setCharactersReady(true);
    }
  }, [user]);

  const refreshGenerations = useCallback(async () => {
    if (!user) {
      setGenerations([]);
      setGenerationsReady(true);
      return;
    }

    let releasedReady = false;
    const readyTimer = window.setTimeout(() => {
      releasedReady = true;
      setGenerationsReady(true);
    }, QUERY_TIMEOUT_MS);

    try {
      const { data, error } = await supabase
        .from("generations")
        .select("id, image_urls, prompt, character_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("[AppData] generations fetch error:", error.message, error);
      } else if (data) {
        setGenerations(data as CachedGeneration[]);
        writeLocal(GENS_KEY, data);
        writeLocal(CACHE_USER_KEY, user.id);
        try { localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now())); } catch {}
      }
    } catch (err) {
      console.error("[AppData] refreshGenerations threw:", err);
    } finally {
      window.clearTimeout(readyTimer);
      if (!releasedReady) setGenerationsReady(true);
    }
  }, [user]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshCharacters(), refreshGenerations()]);
  }, [refreshCharacters, refreshGenerations]);

  // Initial data loading is handled by the user-change effect below.
  // It hydrates from cache instantly and refetches in background if stale.

  // On user change: hydrate from cache instantly, then background refresh
  useEffect(() => {
    if (authLoading) return;
    if (user) writeLocal(CACHE_USER_KEY, user.id);
    const id = ++fetchIdRef.current;

    if (!user) {
      const hasCachedUser = !!localStorage.getItem("facefox_cached_user");
      if (hasCachedUser) {
        // Auth token is refreshing — keep cache intact.
        // When auth resolves, the effect re-runs with the real user.
        return;
      }
      setCharacters([]);
      setGenerations([]);
      setCharactersReady(true);
      setGenerationsReady(true);
      clearLocal();
      return;
    }

    // Check if localStorage cache belongs to this user
    const rawCached = localStorage.getItem("facefox_cached_user");
    const parsedId = rawCached ? ((): string | null => { try { return JSON.parse(rawCached)?.id ?? null; } catch { return null; } })() : null;
    const cachedUserId = localStorage.getItem(CACHE_USER_KEY) || parsedId;
    if (cachedUserId === user.id) {
      // Hydrate instantly — pages render cached content with no loading state
      const cachedChars = readLocal<CachedCharacter[]>(CHARS_KEY);
      const cachedGens = readLocal<CachedGeneration[]>(GENS_KEY);
      if (cachedChars) setCharacters(cachedChars);
      if (cachedGens) setGenerations(cachedGens);
      // Cache exists for this user → mark ready immediately so the yellow
      // load bar does NOT re-appear on tab refocus / auth refresh / remount.
      // Background refetch still runs but never blocks the UI.
      setCharactersReady(true);
      setGenerationsReady(true);
    } else {
      // User-id mismatch (e.g. cache-key-shape skew, auth refresh race). Do NOT
      // wipe the cache — keep showing the old data so the UI never falls back to
      // grey skeletons. The background refresh below will overwrite with fresh data.
      // If it turns out to truly be a different user, the next fetch will update
      // characters/generations to the correct set.
      const cachedChars = readLocal<CachedCharacter[]>(CHARS_KEY);
      const cachedGens = readLocal<CachedGeneration[]>(GENS_KEY);
      if (cachedChars) setCharacters(cachedChars);
      if (cachedGens) setGenerations(cachedGens);
      setCharactersReady(true);
      setGenerationsReady(true);
    }

    // Check cache staleness — if older than 30s, refetch immediately in background
    const tsRaw = (() => { try { return localStorage.getItem(CACHE_TIMESTAMP_KEY); } catch { return null; } })();
    const ts = tsRaw ? Number(tsRaw) : 0;
    const isStale = !ts || Date.now() - ts > CACHE_STALE_MS;
    if (isStale || cachedUserId !== user.id) {
      void Promise.all([refreshCharacters(), refreshGenerations()]);
    } else {
      // Cache is fresh — still kick off a quiet refresh but it's non-urgent
      void Promise.all([refreshCharacters(), refreshGenerations()]);
    }

    return () => { fetchIdRef.current = id + 1; };
  }, [authLoading, user?.id]);

  // Preload all Storage page images during the INITIAL site load so that
  // navigating to /storage never shows the yellow load bar. Once finished,
  // sets a window flag the Storage page reads to skip its own blocker.
  const storagePreloadStartedRef = useRef(false);
  useEffect(() => {
    if (!generationsReady) return;
    if (storagePreloadStartedRef.current) return;
    if (typeof window === "undefined") return;
    if ((window as any).__facefox_storage_preloaded) return;
    storagePreloadStartedRef.current = true;

    // Mirror Storage.tsx filter
    const urls: string[] = [];
    generations.forEach((gen) => {
      if (gen.prompt === "character references" || gen.prompt === "face generation") return;
      (gen.image_urls || []).forEach((url: string) => {
        if (!url || url.trim() === "" || url.startsWith("data:image/svg") || url.includes("imgen.x.ai") || url.includes("xai-tmp-imgen")) return;
        urls.push(url);
      });
    });

    if (urls.length === 0) {
      (window as any).__facefox_storage_preloaded = true;
      return;
    }

    const release = registerBlockingLoader();
    let remaining = urls.length;
    let released = false;
    const finish = () => {
      if (released) return;
      released = true;
      (window as any).__facefox_storage_preloaded = true;
      release();
    };
    const safety = window.setTimeout(finish, 8000);
    urls.forEach((url) => {
      const img = new Image();
      const done = () => {
        remaining -= 1;
        if (remaining <= 0) { window.clearTimeout(safety); finish(); }
      };
      img.onload = done;
      img.onerror = done;
      img.src = url;
    });
  }, [generationsReady, generations]);


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

  // Self-heal cache: refetch on supabase auth events (SIGNED_IN, TOKEN_REFRESHED)
  // and on window focus / tab visibility — covers cases where the initial fetch
  // raced an unauthenticated session and silently returned nothing.
  useEffect(() => {
    if (!user) return;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        void refreshAll();
      }
    });

    const handleFocus = () => { void refreshAll(); };
    const handleVisibility = () => { if (document.visibilityState === "visible") void refreshAll(); };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user?.id, refreshAll]);

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
        refetch: refreshAll,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};
