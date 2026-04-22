import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Home, UserPlus, LogIn, UserCircle } from "lucide-react";

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login, signup, continueAsGuest, resetAuthState } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let success = false;

      if (mode === "login") {
        success = await login(email, password);
      } else {
        if (!name || !age) {
          alert("Please fill in all fields");
          setLoading(false);
          return;
        }
        success = await signup(email, password, name, parseInt(age, 10), isFirstTimeBuyer);
      }

      if (success) {
        setEmail("");
        setPassword("");
        setName("");
        setAge("");
      }
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white border border-stone-300 shadow-xl">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center justify-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-stone-700 to-amber-800 flex items-center justify-center">
              <Home className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl text-stone-900">
              {mode === "login" ? "Real Estate Analyzer" : "Create Account"}
            </CardTitle>
          </div>
          <p className="text-center text-stone-500 text-sm border-t border-stone-100 pt-3">
            {mode === "login"
              ? "Sign in to access Price Predictor and Opportunity Chatbot"
              : "Create your account to save estimates and personal notes"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-stone-300 bg-stone-50"
                required
              />
            </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="25"
                    min="18"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="border-stone-300 bg-stone-50"
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-stone-300 bg-stone-50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-stone-300 bg-stone-50"
                required
              />
            </div>

            {mode === "signup" && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="firsttime"
                  checked={isFirstTimeBuyer}
                  onCheckedChange={(checked) => setIsFirstTimeBuyer(checked as boolean)}
                />
                <Label htmlFor="firsttime" className="text-sm font-normal cursor-pointer">
                  I am a first-time home buyer
                </Label>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-stone-800 hover:bg-stone-700"
              disabled={loading}
            >
              {loading ? (
                "Loading..."
              ) : mode === "login" ? (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm text-slate-600"
              onClick={async () => {
                setLoading(false);
                await resetAuthState();
              }}
            >
              Having trouble? Reset local session
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full border-stone-300 hover:bg-stone-50"
            onClick={continueAsGuest}
          >
            <UserCircle className="h-4 w-4 mr-2" />
            Continue as Guest
          </Button>

          <div className="text-center text-sm">
            {mode === "login" ? (
              <p className="text-stone-500">
                Do not have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-stone-700 hover:underline font-semibold"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p className="text-stone-500">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-stone-700 hover:underline font-semibold"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
