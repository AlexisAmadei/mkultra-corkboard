import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import {
  listAuthProviders,
  loginWithOAuth2,
  loginWithPassword,
  signup,
  type OAuthProvider,
} from "../lib/auth";
import { useAuth } from "../store/authStore";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Separator } from "../components/ui/separator";
import pinImage from "../assets/pin.png";

export function LoginPage() {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/boards";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [providers, setProviders] = useState<OAuthProvider[]>([]);

  useEffect(() => {
    if (user) navigate(redirect, { replace: true });
  }, [user, redirect, navigate]);

  useEffect(() => {
    listAuthProviders()
      .then(setProviders)
      .catch(() => setProviders([]));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await loginWithPassword(email, password);
      } else {
        await signup(email, password, name);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-polaroid">
        <img src={pinImage} className="pin" draggable={false} />

        <div className="auth-caption">
          <span className="eyebrow">PROJET</span>
          <span className="title">MK-ULTRA</span>
        </div>

        <div className="flex flex-col gap-5">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "signup")}>
            <TabsList className="w-full">
              <TabsTrigger value="login">Log in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={submit} className="flex flex-col gap-4">
            {mode === "signup" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={busy} className="w-full">
              {busy && <Loader2 className="animate-spin" />}
              {mode === "login" ? "Log in" : "Sign up"}
            </Button>
          </form>

          {providers.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground uppercase">or</span>
                <Separator className="flex-1" />
              </div>
              {providers.map((p) => (
                <Button
                  key={p.name}
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => void loginWithOAuth2(p.name)}
                >
                  Continue with {p.displayName}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
