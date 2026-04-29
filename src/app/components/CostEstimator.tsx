import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Bookmark, Bot, MessageSquare, Plus, Send, Trash2, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  image?: string;
};

type PredictionSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

const CHAT_STORAGE_KEY = "homescope_price_predictor_sessions";

const assistantIntro =
  "Welcome to Price Predictor Chatbot!";

const fallbackPrompts = [
  "Example: 4 bedroom home, 3 bath, 2600 sq ft in Frisco, built 2018",
  "Example: townhouse, 2 bed, 2 bath, 1450 sq ft in McKinney",
  "Example: fixer upper, 3 bed, 2 bath, 1800 sq ft in Allen",
];

const createSession = (): PredictionSession => ({
  id: crypto.randomUUID(),
  title: "New Price Prediction",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content: assistantIntro,
      createdAt: new Date().toISOString(),
    },
  ],
});



export function CostEstimator() {
  const { saveInfo, user, isGuest } = useAuth();
  const canSave = !!user && !isGuest;

  const [sessions, setSessions] = useState<PredictionSession[]>(() => {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) {
      return [createSession()];
    }

    try {
      const parsed = JSON.parse(raw) as PredictionSession[];
      return parsed.length > 0 ? parsed : [createSession()];
    } catch {
      return [createSession()];
    }
  });
  const [activeSessionId, setActiveSessionId] = useState<string>(() => sessions[0]?.id || "");
  const [draft, setDraft] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId],
  );

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [activeSession?.messages]);

  const createNewChat = () => {
    const next = createSession();
    setSessions((prev) => [next, ...prev]);
    setActiveSessionId(next.id);
    setDraft("");
  };

  const deleteChat = (id: string) => {
    const remaining = sessions.filter((session) => session.id !== id);
    if (remaining.length === 0) {
      const fallback = createSession();
      setSessions([fallback]);
      setActiveSessionId(fallback.id);
      return;
    }

    setSessions(remaining);
    if (activeSessionId === id) {
      setActiveSessionId(remaining[0].id);
    }
  };

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed || !activeSession) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    const title = activeSession.messages.length <= 1 ? trimmed.slice(0, 40) : activeSession.title;
    const updatedAt = new Date().toISOString();
    const sessionId = activeSession.id;

    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              title: title || session.title,
              updatedAt,
              messages: [...session.messages, userMessage],
            }
          : session,
      ),
    );

    setDraft("");
    setIsTyping(true);

    void (async () => {
       try {
        const currentMessages = sessions.find(s => s.id === sessionId)?.messages ?? [];
        const history = currentMessages.map(m => ({ role: m.role, content: m.content }));

    const res = await fetch("/api/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmed, history }),
    });

    const contentType = res.headers.get("content-type");

    let assistantReply: ChatMessage;

    if (contentType?.includes("image/png")) {
      const blob = await res.blob();
      const imageUrl = URL.createObjectURL(blob);

      assistantReply = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        image: imageUrl,
        createdAt: new Date().toISOString(),
      };
    } else {
      const data = await res.json();

      assistantReply = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        createdAt: new Date().toISOString(),
      };
    }

    setIsTyping(false);

    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? { ...session, messages: [...session.messages, assistantReply] }
          : session,
      ),
    );
  } catch (err) {
    setIsTyping(false);

    const errorReply: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Backend error — check if FastAPI server is running.",
      createdAt: new Date().toISOString(),
    };

    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? { ...session, messages: [...session.messages, errorReply] }
          : session,
      ),
    );
  }
    })();
  };

  const submitDraftMessage = () => {
    handleSend();
  };

  const placeholderHint = useMemo(() => {
    const index = (activeSession?.messages.length || 0) % fallbackPrompts.length;
    return fallbackPrompts[index];
  }, [activeSession?.messages.length]);

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4 self-start">
          <Card className="bg-white border border-stone-300 shadow-md">
            <CardHeader className="space-y-3">
              <CardTitle className="text-stone-800 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-amber-700" />
                  Price Predictor History
                </span>
                <Badge className="bg-stone-200 text-stone-700">{sessions.length}</Badge>
              </CardTitle>
              <Button onClick={createNewChat} className="w-full bg-stone-800 hover:bg-stone-700">
                <Plus className="mr-2 h-4 w-4" />
                New Chat
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`rounded-lg border p-3 transition ${activeSessionId === session.id ? "border-amber-700 bg-amber-50" : "border-stone-200 bg-stone-50"}`}
                >
                  <button className="w-full text-left" onClick={() => setActiveSessionId(session.id)}>
                    <p className="text-sm text-stone-800 font-medium truncate">{session.title}</p>
                    <p className="text-xs text-stone-500">{new Date(session.updatedAt).toLocaleString()}</p>
                  </button>
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" variant="ghost" onClick={() => deleteChat(session.id)} className="text-red-500 hover:text-red-400">
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
              Price Predictor Chatbot
            </CardTitle>
            <p className="mt-2 text-sm leading-relaxed text-stone-300">Enter a city and property details to get a predicted price range.</p>
          </CardHeader>

          <CardContent ref={scrollerRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#faf6f0]">
            {activeSession?.messages.map((message) => {
              const isSaveable = message.role === "assistant" && !!message.content && message.content !== assistantIntro;
              return (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl p-3 ${message.role === "user" ? "bg-stone-800 text-white" : "bg-white border text-stone-800"}`}>
                  <div className="mb-1 flex items-center gap-2 text-xs opacity-80">
                    {message.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                    <span>{message.role === "user" ? "You" : "Predictor"}</span>
                    <span>•</span>
                    <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {message.content && (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                  {message.image && (
                    <img src={message.image} className="mt-2 rounded-lg border max-w-full" />
                  )}
                  {isSaveable && canSave && (
                    <button
                      onClick={() => void saveInfo(activeSession.title || "Price prediction", message.content, "price-prediction")}
                      className="mt-2 flex items-center gap-1 text-xs text-stone-500 hover:text-amber-700 transition-colors"
                    >
                      <Bookmark className="h-3 w-3" />
                      Save to profile
                    </button>
                  )}
                </div>
              </div>
              );
            })}
            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-xl border bg-white px-3 py-2 text-sm text-gray-600">Predictor is typing...</div>
              </div>
            )}
          </CardContent>

          <div className="border-t bg-white p-5">
            <div className="flex gap-2">
              <Input
                placeholder={placeholderHint}
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
    </div>
  );
}
