import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";

export interface User {
  id: string;
  email: string;
  name: string;
  age: number;
  isFirstTimeBuyer: boolean;
  createdAt: string;
}

export interface SavedHouse {
  id: string;
  propertyId: string;
  image: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  location: string;
  prediction: number;
  investmentScore?: number;
  createdAt: string;
}

export interface SavedInfo {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
}

export interface SaveHouseInput {
  propertyId: string;
  image: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  location: string;
  prediction: number;
  investmentScore?: number;
}

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  savedHouses: SavedHouse[];
  savedInfo: SavedInfo[];
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string, age: number, isFirstTimeBuyer: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  resetAuthState: () => Promise<void>;
  continueAsGuest: () => void;
  exitGuestMode: () => void;
  updateProfile: (updates: Partial<User>) => Promise<boolean>;
  saveHouse: (house: SaveHouseInput) => Promise<boolean>;
  removeHouse: (propertyId: string) => Promise<void>;
  isHouseSaved: (propertyId: string) => boolean;
  saveInfo: (title: string, content: string, category?: string) => Promise<boolean>;
  deleteInfo: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapProfileToUser(profile: any, emailFallback = ""): User {
  return {
    id: profile.id,
    email: profile.email || emailFallback,
    name: profile.name || "",
    age: profile.age || 0,
    isFirstTimeBuyer: Boolean(profile.is_first_time_buyer),
    createdAt: profile.created_at || new Date().toISOString(),
  };
}

function mapHouseRow(row: any): SavedHouse {
  return {
    id: row.id,
    propertyId: row.property_id,
    image: row.image,
    price: row.price,
    beds: row.beds,
    baths: row.baths,
    sqft: row.sqft,
    location: row.location,
    prediction: row.prediction,
    investmentScore: row.investment_score ?? undefined,
    createdAt: row.created_at,
  };
}

function mapInfoRow(row: any): SavedInfo {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    createdAt: row.created_at,
  };
}

function mapSessionUserToUser(sessionUser: { id: string; email?: string; user_metadata?: Record<string, unknown> | null }): User {
  return {
    id: sessionUser.id,
    email: sessionUser.email || "",
    name: typeof sessionUser.user_metadata?.name === "string" ? sessionUser.user_metadata.name : "",
    age: typeof sessionUser.user_metadata?.age === "number" ? sessionUser.user_metadata.age : 18,
    isFirstTimeBuyer: Boolean(sessionUser.user_metadata?.is_first_time_buyer),
    createdAt: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [savedHouses, setSavedHouses] = useState<SavedHouse[]>([]);
  const [savedInfo, setSavedInfo] = useState<SavedInfo[]>([]);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      return result as T;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  const clearSupabaseLocalKeys = () => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("sb-") || key.includes("supabase")) {
        localStorage.removeItem(key);
      }
    }
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith("sb-") || key.includes("supabase")) {
        sessionStorage.removeItem(key);
      }
    }
  };

  const fetchProfile = async (userId: string, emailFallback = "") => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error) {
      console.error("Failed to load profile:", error.message);
      return null;
    }
    return mapProfileToUser(data, emailFallback);
  };

  const fetchSavedHouses = async (userId: string) => {
    const { data, error } = await supabase
      .from("saved_houses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load saved houses:", error.message);
      setSavedHouses([]);
      return;
    }

    setSavedHouses((data || []).map(mapHouseRow));
  };

  const fetchSavedInfo = async (userId: string) => {
    const { data, error } = await supabase
      .from("saved_user_info")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load saved info:", error.message);
      setSavedInfo([]);
      return;
    }

    setSavedInfo((data || []).map(mapInfoRow));
  };

  const ensureProfile = async (sessionUser: { id: string; email?: string; user_metadata?: Record<string, unknown> | null }) => {
    const existingProfile = await fetchProfile(sessionUser.id, sessionUser.email || "");
    if (existingProfile) {
      return existingProfile;
    }

    const fallbackUser = mapSessionUserToUser(sessionUser);
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: fallbackUser.id,
          email: fallbackUser.email,
          name: fallbackUser.name,
          age: fallbackUser.age,
          is_first_time_buyer: fallbackUser.isFirstTimeBuyer,
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();

    if (error) {
      console.error("Failed to backfill profile:", error.message);
      return fallbackUser;
    }

    return mapProfileToUser(data, fallbackUser.email);
  };

  const loadUserData = async (userId: string) => {
    await Promise.allSettled([fetchSavedHouses(userId), fetchSavedInfo(userId)]);
  };

  const hydrateFromSession = async () => {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.getSession(),
        10000,
        "Session check timed out.",
      );
      if (error) {
        throw error;
      }

      const sessionUser = data.session?.user;

      if (!sessionUser) {
        setUser(null);
        setSavedHouses([]);
        setSavedInfo([]);
        return;
      }

      const profile = await ensureProfile(sessionUser);
      setUser(profile);
      setIsGuest(false);
      localStorage.removeItem("collin_county_guest");
      setLoading(false);
      void loadUserData(sessionUser.id);
    } catch (error) {
      console.error("Failed to hydrate auth session:", error);
      setUser(null);
      setSavedHouses([]);
      setSavedInfo([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadingWatchdog = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("Auth loading watchdog triggered; proceeding without blocking UI.");
        }
        return false;
      });
    }, 6000);

    const guestMode = localStorage.getItem("collin_county_guest");
    if (guestMode === "true") {
      setIsGuest(true);
      setLoading(false);
    }

    hydrateFromSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === "SIGNED_OUT") {
          setUser(null);
          setSavedHouses([]);
          setSavedInfo([]);
          setLoading(false);
          return;
        }

        if (session?.user) {
          const profile = await ensureProfile(session.user);
          setUser(profile);
          setIsGuest(false);
          setLoading(false);
          void loadUserData(session.user.id);
        }
      } catch (error) {
        console.error("Failed during auth state change:", error);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(loadingWatchdog);
      subscription.unsubscribe();
    };
  }, []);

  const signup = async (
    email: string,
    password: string,
    name: string,
    age: number,
    isFirstTimeBuyer: boolean,
  ): Promise<boolean> => {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            age,
            is_first_time_buyer: isFirstTimeBuyer,
          },
        },
        }),
        12000,
        "Sign up timed out. Please try again.",
      );

      if (error) {
        alert(error.message);
        return false;
      }

      if (!data.user) {
        return false;
      }

      // Profile row is created automatically by the database trigger on_auth_user_created.
      // No client-side insert needed — avoids RLS timing issues during signup.

      if (!data.session) {
        alert("Account created. Please check your email to confirm your account before logging in.");
        return true;
      }

      await hydrateFromSession();
      return true;
    } catch (error) {
      console.error("Signup error:", error);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const signInAttempt = async () => {
      return withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        12000,
        "Sign in timed out. Please reset local session and try again.",
      );
    };

    try {
      let result = await signInAttempt();
      let data = result.data;
      let error = result.error;

      if (error && error.message.toLowerCase().includes("refresh token")) {
        clearSupabaseLocalKeys();
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignore sign-out failures during local recovery.
        }
        result = await signInAttempt();
        data = result.data;
        error = result.error;
      }

      if (error) {
        alert(error.message);
        return false;
      }

      if (!data.user) {
        return false;
      }

      const profile = await ensureProfile(data.user);
      setUser(profile);
      setIsGuest(false);
      localStorage.removeItem("collin_county_guest");
      setLoading(false);
      void loadUserData(data.user.id);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      const message = error instanceof Error ? error.message : "Login failed. Please try again.";
      if (message.toLowerCase().includes("timed out")) {
        try {
          clearSupabaseLocalKeys();
          await supabase.auth.signOut();
          const retry = await signInAttempt();
          if (retry.error) {
            alert("Sign in is still timing out in this browser profile. Try disabling extensions for localhost or clear site data for localhost and retry.");
            return false;
          }

          if (!retry.data.user) {
            alert("Sign in failed. Please try again.");
            return false;
          }

          const profile = await ensureProfile(retry.data.user);
          setUser(profile);
          setIsGuest(false);
          localStorage.removeItem("collin_county_guest");
          setLoading(false);
          void loadUserData(retry.data.user.id);
          return true;
        } catch (retryError) {
          console.error("Login retry error:", retryError);
          alert("Sign in is still timing out in this browser profile. Try disabling extensions for localhost or clear site data for localhost and retry.");
          return false;
        }
      }
      if (error instanceof Error) {
        alert(error.message);
      }
      return false;
    }
  };

  const logout = async () => {
    localStorage.removeItem("collin_county_guest");
    setUser(null);
    setSavedHouses([]);
    setSavedInfo([]);
    setIsGuest(false);

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const resetAuthState = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore network errors; local cleanup below is enough to recover UI.
    }
    clearSupabaseLocalKeys();
    localStorage.removeItem("collin_county_guest");
    setUser(null);
    setSavedHouses([]);
    setSavedInfo([]);
    setIsGuest(false);
    setLoading(false);
  };

  const continueAsGuest = () => {
    localStorage.setItem("collin_county_guest", "true");
    setUser(null);
    setSavedHouses([]);
    setSavedInfo([]);
    setIsGuest(true);
  };

  const exitGuestMode = () => {
    localStorage.removeItem("collin_county_guest");
    setUser(null);
    setSavedHouses([]);
    setSavedInfo([]);
    setIsGuest(false);
    setLoading(false);
  };

  const updateProfile = async (updates: Partial<User>): Promise<boolean> => {
    if (!user) return false;

    const nextAge =
      typeof updates.age === "number" && Number.isFinite(updates.age)
        ? Math.max(18, Math.min(120, updates.age))
        : user.age;

    const payload = {
      name: updates.name ?? user.name,
      age: nextAge,
      is_first_time_buyer: updates.isFirstTimeBuyer ?? user.isFirstTimeBuyer,
    };

    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id)
      .select("*")
      .maybeSingle();

    if (!error && data) {
      setUser(mapProfileToUser(data, user.email));
      return true;
    }

    const { data: upsertedData, error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email,
          ...payload,
        },
        { onConflict: "id" },
      )
      .select("*")
      .maybeSingle();

    if (upsertError || !upsertedData) {
      alert(upsertError?.message || error?.message || "Could not save your profile.");
      return false;
    }

    setUser(mapProfileToUser(upsertedData, user.email));
    return true;
  };

  const saveHouse = async (house: SaveHouseInput): Promise<boolean> => {
    if (!user) {
      alert("Please sign in to save houses.");
      return false;
    }

    const { error } = await supabase.from("saved_houses").upsert(
      {
        user_id: user.id,
        property_id: house.propertyId,
        image: house.image,
        price: house.price,
        beds: house.beds,
        baths: house.baths,
        sqft: house.sqft,
        location: house.location,
        prediction: house.prediction,
        investment_score: house.investmentScore ?? null,
      },
      { onConflict: "user_id,property_id" },
    );

    if (error) {
      alert(error.message);
      return false;
    }

    await fetchSavedHouses(user.id);
    return true;
  };

  const removeHouse = async (propertyId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("saved_houses")
      .delete()
      .eq("user_id", user.id)
      .eq("property_id", propertyId);

    if (error) {
      alert(error.message);
      return;
    }

    await fetchSavedHouses(user.id);
  };

  const isHouseSaved = (propertyId: string) => savedHouses.some((house) => house.propertyId === propertyId);

  const saveInfo = async (title: string, content: string, category = "general"): Promise<boolean> => {
    if (!user) {
      alert("Please sign in to save information.");
      return false;
    }

    const { error } = await supabase.from("saved_user_info").insert({
      user_id: user.id,
      title,
      content,
      category,
    });

    if (error) {
      alert(error.message);
      return false;
    }

    await fetchSavedInfo(user.id);
    return true;
  };

  const deleteInfo = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("saved_user_info")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      alert(error.message);
      return;
    }

    await fetchSavedInfo(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isGuest,
        loading,
        savedHouses,
        savedInfo,
        login,
        signup,
        logout,
        resetAuthState,
        continueAsGuest,
        exitGuestMode,
        updateProfile,
        saveHouse,
        removeHouse,
        isHouseSaved,
        saveInfo,
        deleteInfo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
