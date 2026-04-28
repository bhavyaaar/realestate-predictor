import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Bot, MessageSquare, Plus, Send, Trash2, User } from "lucide-react";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

type OpportunityInputs = {
  city: string;
  decisionType: string;
  budget: string;
  targetPrice: string;
  monthlyRent: string;
  waitMonths: string;
  mortgageRate: string;
  holdYears: string;
};

type OpportunityResult = {
  buyNowMonthlyCost: number;
  waitStrategyCost: number;
  opportunityCost: number;
  recommendation: string;
  tone: "positive" | "warning" | "neutral";
};

type PriorityKey = "schoolQuality" | "safety" | "affordability";

type PriorityWeights = Record<PriorityKey, number>;

type SaveState = "idle" | "saving" | "saved" | "error";

const CHAT_STORAGE_KEY = "homescope_opportunity_chat_sessions";

const assistantIntro =
  "Welcome to Oppurtunity Cost Chatbot!";

const priorityKeys: PriorityKey[] = ["schoolQuality", "safety", "affordability"];

const priorityDetails: Record<PriorityKey, { label: string }> = {
  schoolQuality: {
    label: "School quality",
  },
  safety: {
    label: "Safety (low crime)",
  },
  affordability: {
    label: "Home affordability",
  },
};

const districtOptions = [
  "Frisco",
  "Plano",
  "McKinney",
  "Allen",
  "Prosper",
  "Wylie",
  "Anna",
  "Melissa",
  "Celina",
  "Princeton",



];

const defaultPriorityWeights: PriorityWeights = {
  schoolQuality: 40,
  safety: 35,
  affordability: 25,
};

const createSession = (): ChatSession => ({
  id: crypto.randomUUID(),
  title: "New Opportunity Chat",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content: assistantIntro,
      timestamp: new Date().toISOString(),
    },
  ],
});

const defaultOpportunityInputs: OpportunityInputs = {
  city: "plano",
  decisionType: "buy-vs-wait",
  budget: "650,000",
  targetPrice: "540,000",
  monthlyRent: "2,600",
  waitMonths: "9",
  mortgageRate: "6.5",
  holdYears: "5",
};

const formatCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString();
};

const parseCurrency = (value: string) => parseInt(value.replace(/,/g, ""), 10) || 0;

function rebalancePriorityWeights(
  previous: PriorityWeights,
  changedKey: PriorityKey,
  nextValue: number,
): PriorityWeights {
  const clamped = Math.max(0, Math.min(100, Math.round(nextValue)));
  const otherKeys = priorityKeys.filter((key) => key !== changedKey);
  const remaining = 100 - clamped;
  const otherTotal = otherKeys.reduce((sum, key) => sum + previous[key], 0);

  const next: PriorityWeights = {
    ...previous,
    [changedKey]: clamped,
  };

  if (otherTotal === 0) {
    const baseShare = Math.floor(remaining / otherKeys.length);
    let assigned = 0;

    otherKeys.forEach((key, index) => {
      const share = index === otherKeys.length - 1 ? remaining - assigned : baseShare;
      next[key] = share;
      assigned += share;
    });

    return next;
  }

  let assigned = 0;
  otherKeys.forEach((key, index) => {
    const scaledValue = index === otherKeys.length - 1
      ? remaining - assigned
      : Math.max(0, Math.round((previous[key] / otherTotal) * remaining));
    next[key] = scaledValue;
    assigned += scaledValue;
  });

  const total = priorityKeys.reduce((sum, key) => sum + next[key], 0);
  if (total !== 100) {
    const adjustmentKey = otherKeys[otherKeys.length - 1] ?? changedKey;
    next[adjustmentKey] += 100 - total;
  }

  return next;
}

export function OpportunityCostCalculator() {
  const { saveInfo, user, isGuest } = useAuth();
  const [chatStorageMode, setChatStorageMode] = useState<"supabase" | "local">("local");
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) {
      return [createSession()];
    }
    try {
      const parsed = JSON.parse(raw) as ChatSession[];
      return parsed.length > 0 ? parsed : [createSession()];
    } catch {
      return [createSession()];
    }
  });
  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id || "");
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [opportunityInputs, setOpportunityInputs] = useState<OpportunityInputs>(defaultOpportunityInputs);
  const [opportunityResult, setOpportunityResult] = useState<OpportunityResult | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [validationMessage, setValidationMessage] = useState("");
  const [priorityWeights, setPriorityWeights] = useState<PriorityWeights>(defaultPriorityWeights);
  const [primaryDistrict, setPrimaryDistrict] = useState("Frisco");
  const [secondaryDistrict, setSecondaryDistrict] = useState("Plano");
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const cityPremiums: Record<string, number> = {
    plano: 1,
    frisco: 1.04,
    mckinney: 0.97,
    allen: 0.99,
    prosper: 1.08,
    wylie: 0.94,
  };

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId],
  );

  const ensureActiveSessionId = (nextSessions: ChatSession[]) => {
    if (nextSessions.length === 0) return;
    if (!nextSessions.some((session) => session.id === activeSessionId)) {
      setActiveSessionId(nextSessions[0].id);
    }
  };

  useEffect(() => {
    if (chatStorageMode === "supabase") return;
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions, user, isGuest, chatStorageMode]);

  useEffect(() => {
    const hydrateChat = async () => {
      const hydrateLocal = () => {
        const raw = localStorage.getItem(CHAT_STORAGE_KEY);
        if (!raw) {
          const fallback = [createSession()];
          setSessions(fallback);
          setActiveSessionId(fallback[0].id);
          return;
        }
        try {
          const parsed = JSON.parse(raw) as ChatSession[];
          const next = parsed.length > 0 ? parsed : [createSession()];
          setSessions(next);
          setActiveSessionId(next[0].id);
        } catch {
          const fallback = [createSession()];
          setSessions(fallback);
          setActiveSessionId(fallback[0].id);
        }
      };

      if (!user || isGuest) {
        setChatStorageMode("local");
        hydrateLocal();
        return;
      }

      setChatStorageMode("supabase");
      const { data: sessionRows, error: sessionError } = await supabase
        .from("chat_sessions")
        .select("id,title,created_at,updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (sessionError) {
        console.warn("Falling back to local chat storage:", sessionError.message);
        setChatStorageMode("local");
        hydrateLocal();
        return;
      }

      if (!sessionRows || sessionRows.length === 0) {
        const seed = createSession();
        const { error: createSessionError } = await supabase.from("chat_sessions").insert({
          id: seed.id,
          user_id: user.id,
          title: seed.title,
          created_at: seed.createdAt,
          updated_at: seed.updatedAt,
        });

        if (createSessionError) {
          console.error("Failed to create initial chat session:", createSessionError.message);
          return;
        }

        const intro = seed.messages[0];
        const { error: introError } = await supabase.from("chat_messages").insert({
          id: intro.id,
          session_id: seed.id,
          user_id: user.id,
          role: intro.role,
          content: intro.content,
          created_at: intro.timestamp,
        });

        if (introError) {
          console.error("Failed to create initial chat message:", introError.message);
        }

        setSessions([seed]);
        setActiveSessionId(seed.id);
        return;
      }

      const sessionIds = sessionRows.map((row) => row.id);
      const { data: messageRows, error: messageError } = await supabase
        .from("chat_messages")
        .select("id,session_id,role,content,created_at")
        .eq("user_id", user.id)
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true });

      if (messageError) {
        console.warn("Falling back to local chat storage:", messageError.message);
        setChatStorageMode("local");
        hydrateLocal();
        return;
      }

      const bySession = new Map<string, ChatMessage[]>();
      for (const row of messageRows || []) {
        const existing = bySession.get(row.session_id) || [];
        existing.push({
          id: row.id,
          role: row.role,
          content: row.content,
          timestamp: row.created_at,
        });
        bySession.set(row.session_id, existing);
      }

      const normalized: ChatSession[] = sessionRows.map((row) => {
        const messages = bySession.get(row.id) || [];
        return {
          id: row.id,
          title: row.title,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          messages: messages.length > 0
            ? messages
            : [
                {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: assistantIntro,
                  timestamp: row.created_at,
                },
              ],
        };
      });

      setSessions(normalized);
      setActiveSessionId(normalized[0].id);
    };

    void hydrateChat();
  }, [user, isGuest]);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [activeSession?.messages, isTyping]);

  const createNewChat = async () => {
    const next = createSession();

    setSessions((prev) => [next, ...prev]);
    setActiveSessionId(next.id);
    setDraft("");

    if (user && !isGuest && chatStorageMode === "supabase") {
      const { error: sessionError } = await supabase.from("chat_sessions").insert({
        id: next.id,
        user_id: user.id,
        title: next.title,
        created_at: next.createdAt,
        updated_at: next.updatedAt,
      });

      if (sessionError) {
        console.warn("Switching chat storage to local:", sessionError.message);
        setChatStorageMode("local");
      }

      const intro = next.messages[0];
      if (!sessionError) {
        const { error: introError } = await supabase.from("chat_messages").insert({
          id: intro.id,
          session_id: next.id,
          user_id: user.id,
          role: intro.role,
          content: intro.content,
          created_at: intro.timestamp,
        });

        if (introError) {
          console.warn("Switching chat storage to local:", introError.message);
          setChatStorageMode("local");
        }
      }
    }
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setDraft("");
  };

  const deleteChat = async (id: string) => {
    if (user && !isGuest && chatStorageMode === "supabase") {
      const { error } = await supabase.from("chat_sessions").delete().eq("id", id).eq("user_id", user.id);
      if (error) {
        console.warn("Switching chat storage to local:", error.message);
        setChatStorageMode("local");
      }
    }

    const remaining = sessions.filter((session) => session.id !== id);
    if (remaining.length === 0) {
      const fallback = createSession();

      if (user && !isGuest && chatStorageMode === "supabase") {
        const { error: sessionError } = await supabase.from("chat_sessions").insert({
          id: fallback.id,
          user_id: user.id,
          title: fallback.title,
          created_at: fallback.createdAt,
          updated_at: fallback.updatedAt,
        });
        if (!sessionError) {
          const intro = fallback.messages[0];
          await supabase.from("chat_messages").insert({
            id: intro.id,
            session_id: fallback.id,
            user_id: user.id,
            role: intro.role,
            content: intro.content,
            created_at: intro.timestamp,
          });
        }
      }

      setSessions([fallback]);
      setActiveSessionId(fallback.id);
      return;
    }
    setSessions(remaining);
    if (activeSessionId === id) {
      setActiveSessionId(remaining[0].id);
    }
  };

  const handleInputChange = (field: keyof OpportunityInputs, value: string) => {
    setValidationMessage("");
    setSaveMessage("");
    setSaveState("idle");
    if (field === "budget" || field === "targetPrice" || field === "monthlyRent") {
      setOpportunityInputs((prev) => ({ ...prev, [field]: formatCurrencyInput(value) }));
      return;
    }
    setOpportunityInputs((prev) => ({ ...prev, [field]: value }));
  };

  const calculateOpportunityCost = () => {
    const budget = parseCurrency(opportunityInputs.budget);
    const targetPrice = parseCurrency(opportunityInputs.targetPrice);
    const monthlyRent = parseCurrency(opportunityInputs.monthlyRent);
    const waitMonths = parseInt(opportunityInputs.waitMonths, 10) || 0;
    const mortgageRate = (parseFloat(opportunityInputs.mortgageRate) || 6.5) / 100;
    const holdYears = parseInt(opportunityInputs.holdYears, 10) || 5;

    if (budget < 150000 || budget > 2000000) {
      setValidationMessage("Budget should be between $150,000 and $2,000,000.");
      return;
    }
    if (targetPrice < 100000 || targetPrice > budget * 1.2) {
      setValidationMessage("Target price should be realistic relative to your budget.");
      return;
    }
    if (monthlyRent < 800 || monthlyRent > 12000) {
      setValidationMessage("Monthly rent should be between $800 and $12,000.");
      return;
    }
    if (waitMonths < 1 || waitMonths > 36) {
      setValidationMessage("Wait months should be between 1 and 36.");
      return;
    }
    if (holdYears < 1 || holdYears > 15) {
      setValidationMessage("Hold years should be between 1 and 15.");
      return;
    }

    setValidationMessage("");
    const cityPremium = cityPremiums[opportunityInputs.city] || 1;
    const adjustedPrice = Math.round(targetPrice * cityPremium);
    const monthlyOwnershipCost = Math.round((adjustedPrice * (0.8 * mortgageRate / 12)) + adjustedPrice * 0.0025);
    const projectedPriceIfWait = Math.round(adjustedPrice * (1 + 0.045 * (waitMonths / 12)));
    const waitCost = monthlyRent * waitMonths + (projectedPriceIfWait - adjustedPrice);
    const shortHoldPenalty = holdYears < 5 ? 12000 : 0;
    const opportunityCost = Math.max(0, waitCost - shortHoldPenalty);

    const recommendation =
      opportunityInputs.decisionType === "buy-vs-rent"
        ? monthlyOwnershipCost <= monthlyRent + 400
          ? "Buying is competitive with renting if you expect to stay at least 5 years."
          : "Renting stays cheaper near term. Wait for either lower rates or a lower entry price."
        : opportunityCost > 15000
          ? "Buying sooner looks stronger. Waiting creates a meaningful opportunity cost in this scenario."
          : "Waiting is still reasonable if flexibility matters more than locking in today."
;

    const tone: OpportunityResult["tone"] =
      recommendation.includes("stronger") || recommendation.includes("competitive")
        ? "positive"
        : recommendation.includes("cheaper") || recommendation.includes("reasonable")
          ? "warning"
          : "neutral";

    setOpportunityResult({
      buyNowMonthlyCost: monthlyOwnershipCost,
      waitStrategyCost: waitCost,
      opportunityCost,
      recommendation,
      tone,
    });
  };

  const saveCurrentAnalysis = async () => {
    if (!opportunityResult) return;
    setSaveState("saving");
    setSaveMessage("");

    const cityLabel = opportunityInputs.city.replace("-", " ");
    const title = `Opportunity ${cityLabel} ${opportunityInputs.decisionType}`;
    const content = [
      `City: ${cityLabel}`,
      `Decision: ${opportunityInputs.decisionType}`,
      `Budget: $${parseCurrency(opportunityInputs.budget).toLocaleString()}`,
      `Target price: $${parseCurrency(opportunityInputs.targetPrice).toLocaleString()}`,
      `Monthly rent: $${parseCurrency(opportunityInputs.monthlyRent).toLocaleString()}`,
      `Wait months: ${opportunityInputs.waitMonths}`,
      `Monthly buy now cost: $${opportunityResult.buyNowMonthlyCost.toLocaleString()}`,
      `Wait strategy cost: $${opportunityResult.waitStrategyCost.toLocaleString()}`,
      `Opportunity cost: $${opportunityResult.opportunityCost.toLocaleString()}`,
      `Recommendation: ${opportunityResult.recommendation}`,
    ].join("\n");

    const success = await saveInfo(title, content, "opportunity-cost");
    setSaveState(success ? "saved" : "error");
    setSaveMessage(success ? "Opportunity result saved to your profile." : "Could not save this opportunity result.");
  };

  const navigateToProfile = () => {
    window.dispatchEvent(new CustomEvent("homescope:navigate", { detail: "profile" }));
  };

  const totalPriorityWeight = useMemo(
    () => priorityKeys.reduce((sum, key) => sum + priorityWeights[key], 0),
    [priorityWeights],
  );

  const handlePriorityChange = (key: PriorityKey, nextValue: number[]) => {
    const value = nextValue[0] ?? priorityWeights[key];
    setPriorityWeights((previous) => rebalancePriorityWeights(previous, key, value));
  };

  const sendMessage = (messageText = draft) => {
    const trimmed = messageText.trim();
    const targetSessionId = activeSessionId || sessions[0]?.id;
    if (!trimmed || !targetSessionId) return;

    const currentSession = sessions.find((session) => session.id === targetSessionId) || sessions[0];
    if (!currentSession) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const sessionTitle = currentSession.messages.length <= 1 ? trimmed.slice(0, 40) : currentSession.title;

    // Optimistically add the user message and show the typing indicator
    setSessions((prev) => {
      const now = new Date().toISOString();
      const next = prev.map((session) =>
        session.id === targetSessionId
          ? {
              ...session,
              title: sessionTitle || session.title,
              updatedAt: now,
              messages: [...session.messages, userMessage],
            }
          : session,
      );
      ensureActiveSessionId(next);
      return next;
    });
    setDraft("");
    setIsTyping(true);

    void (async () => {
      let assistantContent = "Sorry, I couldn't reach the analysis backend. Please make sure the server is running.";

      try {
        const res = await fetch("/api/opportunity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            school_weight: priorityWeights.schoolQuality,
            crime_weight: priorityWeights.safety,
            price_weight: priorityWeights.affordability,
            district_a: primaryDistrict || undefined,
            district_b: secondaryDistrict || undefined,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          assistantContent = data.response || assistantContent;
        }
      } catch {
        // network error — fallback message already set
      }

      const assistantReply: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantContent,
        timestamp: new Date().toISOString(),
      };

      setIsTyping(false);

      setSessions((prev) => {
        const now = new Date().toISOString();
        return prev.map((session) =>
          session.id === targetSessionId
            ? {
                ...session,
                updatedAt: now,
                messages: [...session.messages, assistantReply],
              }
            : session,
        );
      });

      if (user && !isGuest && chatStorageMode === "supabase") {
        const nextTitle = sessionTitle || activeSession.title;
        const now = new Date().toISOString();

        const { error: updateError } = await supabase
          .from("chat_sessions")
          .update({ title: nextTitle, updated_at: now })
          .eq("id", targetSessionId)
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Failed to update chat session:", updateError.message);
          return;
        }

        const { error: insertError } = await supabase.from("chat_messages").insert([
          {
            id: userMessage.id,
            session_id: targetSessionId,
            user_id: user.id,
            role: userMessage.role,
            content: userMessage.content,
            created_at: userMessage.timestamp,
          },
          {
            id: assistantReply.id,
            session_id: targetSessionId,
            user_id: user.id,
            role: assistantReply.role,
            content: assistantReply.content,
            created_at: assistantReply.timestamp,
          },
        ]);

        if (insertError) {
          console.error("Failed to store chat messages:", insertError.message);
        }
      }
    })();
  };

  const submitDraftMessage = () => {
    sendMessage(draft);
  };

  const handleCompareDistricts = () => {
    const comparePrompt = [
      `Compare ${primaryDistrict} vs ${secondaryDistrict}.`,
      `School quality ${priorityWeights.schoolQuality}%.`,
      `Safety ${priorityWeights.safety}%.`,
      `Affordability ${priorityWeights.affordability}%.`,
      "This is a frontend configuration request; backend scoring will be connected later.",
    ].join(" ");

    sendMessage(comparePrompt);
  };

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4 self-start">
          <Card className="rounded-[24px] bg-white border border-stone-300 shadow-md">
            <CardHeader className="space-y-2 pb-3">
              <CardTitle className="text-stone-700 text-sm font-semibold tracking-wide uppercase">
                Your Priorities (must = 100%)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {priorityKeys.map((key) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-base font-medium text-stone-800">{priorityDetails[key].label}</Label>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{priorityWeights[key]}%</Badge>
                  </div>
                  <Slider
                    value={[priorityWeights[key]]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(value) => handlePriorityChange(key, value)}
                    className="[&_[data-slot=slider-range]]:bg-stone-300 [&_[data-slot=slider-thumb]]:border-stone-300 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-track]]:bg-stone-100"
                  />
                </div>
              ))}

              <div className="border-t border-stone-200 pt-3">
                <div className="flex items-center justify-between text-stone-700">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-2xl font-semibold text-stone-800">{totalPriorityWeight}%</span>
                </div>
              </div>

            </CardContent>
          </Card>

          <Card className="rounded-[24px] bg-white border border-stone-300 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-stone-700 text-sm font-semibold tracking-wide uppercase">
                Compare Districts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="space-y-2">
                  <Label htmlFor="primary-district" className="text-xs text-stone-500">District A</Label>
                  <Select value={primaryDistrict} onValueChange={setPrimaryDistrict}>
                    <SelectTrigger id="primary-district" className="border-stone-300 bg-stone-50 text-stone-800">
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent>
                      {districtOptions.map((district) => (
                        <SelectItem key={district} value={district}>{district}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <span className="pt-6 text-sm font-semibold text-stone-500">vs</span>

                <div className="space-y-2">
                  <Label htmlFor="secondary-district" className="text-xs text-stone-500">District B</Label>
                  <Select value={secondaryDistrict} onValueChange={setSecondaryDistrict}>
                    <SelectTrigger id="secondary-district" className="border-stone-300 bg-stone-50 text-stone-800">
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent>
                      {districtOptions.map((district) => (
                        <SelectItem key={district} value={district}>{district}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleCompareDistricts}
                disabled={primaryDistrict === secondaryDistrict || isTyping}
                className="w-full bg-white text-stone-900 border border-stone-300 hover:bg-stone-50"
              >
                Compare districts
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] bg-white border border-stone-300 shadow-md">
            <CardHeader className="space-y-3">
              <CardTitle className="text-stone-800 flex items-center justify-between">
                <span className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-amber-700" />Opportunity Chat History</span>
                <Badge className="bg-stone-200 text-stone-700">{sessions.length}</Badge>
              </CardTitle>
              <Button type="button" onClick={createNewChat} className="w-full bg-stone-800 hover:bg-stone-700">
                <Plus className="mr-2 h-4 w-4" />
                New Chat
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[20vh] overflow-y-auto pt-0">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`rounded-lg border p-3 transition cursor-pointer ${activeSessionId === session.id ? "border-amber-700 bg-amber-50" : "border-stone-200 bg-stone-50"}`}
                  onClick={() => handleSelectSession(session.id)}
                >
                  <button type="button" className="w-full text-left" onClick={() => handleSelectSession(session.id)}>
                    <p className="text-sm text-stone-800 font-medium truncate">{session.title}</p>
                    <p className="text-xs text-stone-500">{new Date(session.updatedAt).toLocaleString()}</p>
                  </button>
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" type="button" variant="ghost" onClick={(event) => {
                      event.stopPropagation();
                      void deleteChat(session.id);
                    }} className="text-red-500 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="flex h-[84vh] flex-col rounded-[28px] overflow-hidden bg-white border border-stone-300 shadow-md self-start">
          <CardHeader className="border-b bg-gradient-to-r from-stone-800 to-stone-600 text-white">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Bot className="h-5 w-5" />
              Oppurtunity Cost Chatbot
            </CardTitle>
            <p className="mt-2 text-sm leading-relaxed text-stone-300">Describe your situation and our backend will return an opportunity cost analysis.</p>
            {opportunityResult && (
              <div className="rounded-md bg-white/15 p-3 text-sm backdrop-blur">
                <div className="grid grid-cols-1 gap-1 md:grid-cols-3">
                  <div>Opportunity Cost: <span className="font-semibold">${opportunityResult.opportunityCost.toLocaleString()}</span></div>
                  <div>Buy Now: <span className="font-semibold">${opportunityResult.buyNowMonthlyCost.toLocaleString()}/mo</span></div>
                  <div>Wait Strategy: <span className="font-semibold">${opportunityResult.waitStrategyCost.toLocaleString()}</span></div>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent ref={scrollerRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#faf6f0]">
            {activeSession?.messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl p-3 ${message.role === "user" ? "bg-stone-800 text-white" : "bg-white border text-stone-800"}`}>
                  <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                    {message.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    <span>{message.role === "user" ? "You" : "Advisor"}</span>
                    <span>•</span>
                    <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-xl border bg-white px-3 py-2 text-sm text-gray-600">Advisor is typing...</div>
              </div>
            )}
          </CardContent>

          <div className="border-t bg-white p-5">
            <div className="flex gap-2">
              <Input
                placeholder="Example: compare Frisco ISD vs Plano ISD with school quality weighted highest"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitDraftMessage();
                  }
                }}
              />
              <Button type="button" onClick={submitDraftMessage} disabled={!draft.trim() || isTyping} className="bg-stone-800 hover:bg-stone-700">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}