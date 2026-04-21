import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Bot, MessageSquare, Plus, Send, Trash2, User } from "lucide-react";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
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

type SaveState = "idle" | "saving" | "saved" | "error";

const CHAT_STORAGE_KEY = "homescope_opportunity_chat_sessions";

const assistantIntro =
  "Hi, I am your opportunity advisor. Tell me your budget, timeline, location, and whether you are deciding between buying, waiting, or renting. I will break down tradeoffs and next best actions.";

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

    setSessions((prev) => [next, ...prev]);
    setActiveSessionId(next.id);
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

  const sendMessage = () => {
    if (!draft.trim() || !activeSession) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: draft.trim(),
      timestamp: new Date().toISOString(),
    };

    const sessionTitle = activeSession.messages.length <= 1 ? draft.slice(0, 40) : activeSession.title;

    setSessions((prev) =>
      prev.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              title: sessionTitle || session.title,
              updatedAt: new Date().toISOString(),
              messages: [...session.messages, userMessage],
            }
          : session,
      ),
    );
    setDraft("");
    setIsTyping(false);

    const placeholderReply: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Frontend note: chatbot response content is disabled in this branch. Backend integration will provide live responses.",
      timestamp: new Date().toISOString(),
    };

    // TODO: Replace this placeholder with a real backend API call during chatbot integration.
    setSessions((prev) => {
      const next = prev.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              updatedAt: new Date().toISOString(),
              messages: [...session.messages, placeholderReply],
            }
          : session,
      );
      ensureActiveSessionId(next);
      return next;
    });

    if (user && !isGuest && chatStorageMode === "supabase") {
      void (async () => {
        const nextTitle = sessionTitle || activeSession.title;
        const now = new Date().toISOString();

        const { error: updateError } = await supabase
          .from("chat_sessions")
          .update({ title: nextTitle, updated_at: now })
          .eq("id", activeSession.id)
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Failed to update chat session:", updateError.message);
          return;
        }

        const { error: insertError } = await supabase.from("chat_messages").insert([
          {
            id: userMessage.id,
            session_id: activeSession.id,
            user_id: user.id,
            role: userMessage.role,
            content: userMessage.content,
            created_at: userMessage.timestamp,
          },
          {
            id: placeholderReply.id,
            session_id: activeSession.id,
            user_id: user.id,
            role: placeholderReply.role,
            content: placeholderReply.content,
            created_at: placeholderReply.timestamp,
          },
        ]);

        if (insertError) {
          console.error("Failed to store chat messages:", insertError.message);
        }
      })();
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Card className="bg-slate-900/70 border-slate-700">
            <CardHeader className="space-y-3">
              <CardTitle className="text-white">Collin County Opportunity Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-200">County</Label>
                <div className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white">Collin County, Texas</div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">City</Label>
                <Select value={opportunityInputs.city} onValueChange={(value) => handleInputChange("city", value)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plano">Plano</SelectItem>
                    <SelectItem value="frisco">Frisco</SelectItem>
                    <SelectItem value="mckinney">McKinney</SelectItem>
                    <SelectItem value="allen">Allen</SelectItem>
                    <SelectItem value="prosper">Prosper</SelectItem>
                    <SelectItem value="wylie">Wylie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Decision Type</Label>
                <Select value={opportunityInputs.decisionType} onValueChange={(value) => handleInputChange("decisionType", value)}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy-vs-wait">Buy Now vs Wait</SelectItem>
                    <SelectItem value="buy-vs-rent">Buy vs Rent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Budget</Label>
                <Input value={opportunityInputs.budget} onChange={(e) => handleInputChange("budget", e.target.value)} className="bg-slate-800 border-slate-700 text-white" placeholder="650,000" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Target Purchase Price</Label>
                <Input value={opportunityInputs.targetPrice} onChange={(e) => handleInputChange("targetPrice", e.target.value)} className="bg-slate-800 border-slate-700 text-white" placeholder="540,000" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Monthly Rent</Label>
                <Input value={opportunityInputs.monthlyRent} onChange={(e) => handleInputChange("monthlyRent", e.target.value)} className="bg-slate-800 border-slate-700 text-white" placeholder="2,600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-slate-200">Wait Months</Label>
                  <Input value={opportunityInputs.waitMonths} onChange={(e) => handleInputChange("waitMonths", e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200">Hold Years</Label>
                  <Input value={opportunityInputs.holdYears} onChange={(e) => handleInputChange("holdYears", e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-200">Mortgage Rate (%)</Label>
                <Input value={opportunityInputs.mortgageRate} onChange={(e) => handleInputChange("mortgageRate", e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
              </div>
              {validationMessage && <p className="text-sm text-red-300">{validationMessage}</p>}
              <Button onClick={calculateOpportunityCost} className="w-full bg-sky-600 hover:bg-sky-500">Calculate Opportunity Cost</Button>
              {opportunityResult && (
                <div
                  className={`rounded-lg p-3 text-sm space-y-2 ${
                    opportunityResult.tone === "positive"
                      ? "bg-emerald-900/40 text-emerald-100 border border-emerald-700"
                      : opportunityResult.tone === "warning"
                        ? "bg-amber-900/35 text-amber-100 border border-amber-700"
                        : "bg-slate-800 text-slate-100 border border-slate-700"
                  }`}
                >
                  <p>Buy now monthly cost: ${opportunityResult.buyNowMonthlyCost.toLocaleString()}</p>
                  <p>Wait strategy cost: ${opportunityResult.waitStrategyCost.toLocaleString()}</p>
                  <p>Opportunity cost: ${opportunityResult.opportunityCost.toLocaleString()}</p>
                  <p>{opportunityResult.recommendation}</p>
                  <Button onClick={saveCurrentAnalysis} disabled={saveState === "saving"} className="w-full bg-blue-900 hover:bg-blue-800">
                    {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Save Result"}
                  </Button>
                  {saveState === "saved" && (
                    <Button variant="outline" onClick={navigateToProfile} className="w-full">View Saved Results</Button>
                  )}
                  {saveMessage && <p className="text-xs text-sky-300">{saveMessage}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-900/70 border-slate-700">
            <CardHeader className="space-y-3">
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-sky-400" />Opportunity Chats</span>
                <Badge className="bg-slate-700 text-slate-100">{sessions.length}</Badge>
              </CardTitle>
              <Button onClick={createNewChat} className="w-full bg-sky-600 hover:bg-sky-500">
                <Plus className="mr-2 h-4 w-4" />
                New Chat
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[45vh] overflow-y-auto">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`rounded-lg border p-3 transition ${activeSessionId === session.id ? "border-sky-500 bg-slate-800" : "border-slate-700 bg-slate-900"}`}
                >
                  <button className="w-full text-left" onClick={() => setActiveSessionId(session.id)}>
                    <p className="text-sm text-white font-medium truncate">{session.title}</p>
                    <p className="text-xs text-slate-400">{new Date(session.updatedAt).toLocaleString()}</p>
                  </button>
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" variant="ghost" onClick={() => deleteChat(session.id)} className="text-red-300 hover:text-red-200">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="flex h-[78vh] flex-col bg-white border-slate-200">
          <CardHeader className="border-b bg-gradient-to-r from-blue-900 to-sky-700 text-white">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Opportunity Advisor
            </CardTitle>
            <p className="text-sm text-blue-100">Use the Collin County filters for a saved result, then use chat for follow-up tradeoff analysis.</p>
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

          <CardContent ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {activeSession?.messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl p-3 ${message.role === "user" ? "bg-blue-900 text-white" : "bg-white border text-gray-800"}`}>
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

          <div className="border-t bg-white p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Example: I can buy now at $540k or wait 9 months, what is the opportunity cost?"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <Button onClick={sendMessage} disabled={!draft.trim() || isTyping} className="bg-blue-900 hover:bg-blue-800">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}