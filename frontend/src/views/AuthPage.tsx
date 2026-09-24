import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button, FormField, Input } from "@/components/ui";

type AuthMode = "signin" | "signup" | "forgot-password" | "set-password";

interface AuthPageProps {
  onBack: () => void;
  onPasswordSet?: () => void;
}

const getInitialAuthMode = (): AuthMode => {
  const search = window.location.search;
  const hash = window.location.hash;
  if (
    search.includes("mode=set-password") ||
    hash.includes("type=invite") ||
    hash.includes("type=recovery")
  ) {
    return "set-password";
  }
  if (search.includes("mode=signup")) return "signup";
  if (search.includes("mode=forgot-password")) return "forgot-password";
  return "signin";
};

export default function AuthPage({ onBack, onPasswordSet }: AuthPageProps) {
  const { user } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>(getInitialAuthMode);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"teacher" | "student">("teacher");

  // Detect URL errors on mount (e.g. expired OTP / invite links)
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    const rawParams = hash.startsWith("#")
      ? hash.slice(1)
      : search.startsWith("?")
      ? search.slice(1)
      : "";

    if (rawParams) {
      const params = new URLSearchParams(rawParams);
      const errorDescription = params.get("error_description");
      const errorCode = params.get("error_code");
      if (errorDescription || errorCode) {
        const decoded = errorDescription
          ? decodeURIComponent(errorDescription.replace(/\+/g, " "))
          : "The authentication link is invalid or has expired.";
        setUrlError(decoded);
        setAuthMode("signin");
      }
    }
  }, []);

  // Listen to Supabase PASSWORD_RECOVERY event
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("set-password");
        setUrlError(null);
        setErrorMsg(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error("Invalid login credentials.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred during sign in.";
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
      }

      const metadata: Record<string, unknown> = {
        full_name: fullName,
        phone: phone,
        role: role,
      };

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      if (error) throw new Error("Invalid registration details or account already exists.");
      setIsSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred during sign up.";
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const redirectTarget = `${window.location.origin}/auth?mode=set-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectTarget,
      });
      if (error) throw error;
      setIsSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send password reset email.";
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
      }
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match. Please verify both fields.");
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
        data: { has_password: true },
      });
      if (error) throw error;

      setPasswordSaved(true);
      setTimeout(() => {
        if (onPasswordSet) {
          onPasswordSet();
        }
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update password. Please try again.";
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  const currentEmail = user?.email || email;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden font-sans text-primary-text">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md z-10 my-8">
        <button
          id="auth-back-to-home-button"
          onClick={onBack}
          className="text-sm font-medium text-muted-text hover:text-primary-text mb-6 flex items-center gap-1 transition-colors cursor-pointer"
        >
          &larr; Back to Home
        </button>

        <div className="bg-surface/60 backdrop-blur-2xl border border-border-color rounded-3xl p-8 shadow-2xl relative overflow-visible">
          {/* Decorative shine */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

          {/* Top Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center shadow-lg shadow-primary/20">
              {authMode === "set-password" ? (
                <KeyRound className="w-6 h-6 text-white" />
              ) : authMode === "forgot-password" ? (
                <Mail className="w-6 h-6 text-white" />
              ) : (
                <Sparkles className="w-6 h-6 text-white" />
              )}
            </div>
          </div>

          {/* URL Error Banner (e.g. Expired OTP) */}
          {urlError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Link Expired or Already Used</span>
              </div>
              <p className="text-[11px] leading-relaxed text-red-400">
                {urlError}. If you previously opened your invite link but did not set a password, you can request a fresh setup link below.
              </p>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("forgot-password");
                  setUrlError(null);
                  setErrorMsg(null);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer pt-1"
              >
                <span>Request a new password link &rarr;</span>
              </button>
            </div>
          )}

          {/* Form Error Message */}
          {errorMsg && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-semibold text-center">
              {errorMsg}
            </div>
          )}

          {/* ==================== 1. SET PASSWORD MODE ==================== */}
          {authMode === "set-password" && (
            <>
              {passwordSaved ? (
                <div className="flex flex-col items-center py-6 text-center animate-fade-in">
                  <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  </div>
                  <h3 className="text-xl font-bold font-display mb-2">Password Saved!</h3>
                  <p className="text-sm text-muted-text mb-6">
                    Your password has been successfully established. Directing you to your dashboard...
                  </p>
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold font-display text-center mb-2">
                    Set Your Password
                  </h2>
                  <p className="text-sm text-muted-text text-center mb-6">
                    Welcome to Teach&amp;Learn! Please set a password to activate your account.
                  </p>

                  {currentEmail && (
                    <div className="mb-4 p-3 bg-elevated/60 border border-border-color rounded-2xl flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs font-mono">
                        {currentEmail[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-muted-text font-mono uppercase block">
                          Account Email
                        </span>
                        <span className="text-xs font-semibold text-primary-text truncate block">
                          {currentEmail}
                        </span>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSetPassword} className="space-y-4">
                    {isLoading && (
                      <div className="p-3.5 bg-primary/5 border border-primary/25 rounded-2xl space-y-2 animate-fade-in">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-primary">
                          <span>Encrypting &amp; updating credentials...</span>
                          <span className="font-mono text-[10px]">Please wait</span>
                        </div>
                        <div className="w-full h-1.5 bg-elevated rounded-full overflow-hidden">
                          <div className="h-full bg-primary animate-pulse w-4/5 rounded-full" />
                        </div>
                        <p className="text-[10px] text-muted-text">
                          Do not close or refresh this window until confirmation.
                        </p>
                      </div>
                    )}

                    <FormField label="New Password *">
                      <Input
                        id="set-password-input"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={8}
                        disabled={isLoading}
                        icon={<Lock className="w-4 h-4 text-muted-text" />}
                      />
                    </FormField>

                    <FormField label="Confirm Password *">
                      <Input
                        id="confirm-password-input"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={8}
                        disabled={isLoading}
                        icon={<Lock className="w-4 h-4 text-muted-text" />}
                      />
                    </FormField>

                    <p className="text-[11px] text-muted-text">
                      Must be at least 8 characters long.
                    </p>

                    <Button
                      id="set-password-submit-button"
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full mt-6 shadow-lg shadow-primary/25"
                      isLoading={isLoading}
                      rightIcon={!isLoading ? <ArrowRight className="w-4 h-4" /> : undefined}
                    >
                      Save Password &amp; Continue
                    </Button>
                  </form>
                </>
              )}
            </>
          )}

          {/* ==================== 2. FORGOT PASSWORD MODE ==================== */}
          {authMode === "forgot-password" && (
            <>
              {isSuccess ? (
                <div className="flex flex-col items-center py-6 text-center animate-fade-in">
                  <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
                    <Mail className="w-8 h-8 text-success" />
                  </div>
                  <h3 className="text-xl font-bold font-display mb-2">Check your email</h3>
                  <p className="text-sm text-muted-text mb-8">
                    We've sent a password reset link to{" "}
                    <span className="font-semibold text-primary-text">{email}</span>.
                    Please click the link in that email to choose a new password.
                  </p>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      setIsSuccess(false);
                      setAuthMode("signin");
                      setEmail("");
                    }}
                  >
                    Return to Sign In
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold font-display text-center mb-2">
                    Reset Password
                  </h2>
                  <p className="text-sm text-muted-text text-center mb-6">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>

                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <FormField label="Email Address *">
                      <Input
                        id="forgot-email-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@school.edu"
                        required
                        icon={<Mail className="w-4 h-4 text-muted-text" />}
                      />
                    </FormField>

                    <Button
                      id="forgot-submit-button"
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full mt-6 shadow-lg shadow-primary/25"
                      isLoading={isLoading}
                      rightIcon={!isLoading ? <ArrowRight className="w-4 h-4" /> : undefined}
                    >
                      Send Reset Link
                    </Button>
                  </form>

                  <div className="mt-8 text-center text-sm text-muted-text">
                    Remember your password?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("signin");
                        setErrorMsg(null);
                      }}
                      className="font-semibold text-primary hover:underline focus:outline-none cursor-pointer"
                    >
                      Sign in
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ==================== 3. SIGN IN & SIGN UP MODES ==================== */}
          {(authMode === "signin" || authMode === "signup") && (
            <>
              {isSuccess ? (
                <div className="flex flex-col items-center py-6 text-center animate-fade-in">
                  <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
                    <Mail className="w-8 h-8 text-success" />
                  </div>
                  <h3 className="text-xl font-bold font-display mb-2">Check your email</h3>
                  <p className="text-sm text-muted-text mb-8">
                    We've sent a verification link to{" "}
                    <span className="font-semibold text-primary-text">{email}</span>.
                    Please verify your email address to activate your account.
                  </p>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      setIsSuccess(false);
                      setAuthMode("signin");
                      setEmail("");
                      setPassword("");
                    }}
                  >
                    Return to Sign In
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold font-display text-center mb-2">
                    {authMode === "signin" ? "Welcome back" : "Create an account"}
                  </h2>
                  <p className="text-sm text-muted-text text-center mb-6">
                    {authMode === "signin"
                      ? "Enter your credentials to access your portal"
                      : "Join to start managing your classrooms with AI"}
                  </p>

                  <form
                    onSubmit={authMode === "signin" ? handleSignIn : handleSignUp}
                    className="space-y-4"
                  >
                    {authMode === "signup" && (
                      <>
                        <FormField label="Full Name *">
                          <Input
                            id="auth-fullname-input"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Jane Doe"
                            required
                            icon={<User className="w-4 h-4 text-muted-text" />}
                          />
                        </FormField>

                        <FormField label="Phone Number *">
                          <Input
                            id="auth-phone-input"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 992-123-4567"
                            required
                            icon={<Phone className="w-4 h-4 text-muted-text" />}
                          />
                        </FormField>

                        <div>
                          <label className="block text-xs font-semibold text-muted-text mb-1.5 uppercase tracking-wider">
                            Role <span className="text-red-500">*</span>
                          </label>
                          <div className="flex gap-4 p-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="role"
                                value="teacher"
                                checked={role === "teacher"}
                                onChange={() => setRole("teacher")}
                                className="accent-primary w-4 h-4"
                              />
                              <span className="text-sm font-medium">Teacher</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="role"
                                value="student"
                                checked={role === "student"}
                                onChange={() => setRole("student")}
                                className="accent-primary w-4 h-4"
                              />
                              <span className="text-sm font-medium">Student</span>
                            </label>
                          </div>
                        </div>
                      </>
                    )}

                    <FormField label="Email Address *">
                      <Input
                        id="auth-email-input"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@school.edu"
                        required
                        icon={<Mail className="w-4 h-4 text-muted-text" />}
                      />
                    </FormField>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-semibold text-muted-text uppercase tracking-wider">
                          Password <span className="text-red-500">*</span>
                        </label>
                        {authMode === "signin" && (
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode("forgot-password");
                              setErrorMsg(null);
                            }}
                            className="text-xs font-medium text-primary hover:underline cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <Input
                        id="auth-password-input"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        icon={<Lock className="w-4 h-4 text-muted-text" />}
                      />
                    </div>

                    <Button
                      id="auth-submit-button"
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full mt-6 shadow-lg shadow-primary/25"
                      isLoading={isLoading}
                      rightIcon={!isLoading ? <ArrowRight className="w-4 h-4" /> : undefined}
                    >
                      {authMode === "signin" ? "Sign In" : "Create Account"}
                    </Button>
                  </form>

                  <div className="mt-8 text-center text-sm text-muted-text">
                    {authMode === "signin"
                      ? "Don't have an account? "
                      : "Already have an account? "}
                    <button
                      id="auth-toggle-mode-button"
                      type="button"
                      onClick={() => {
                        setAuthMode(authMode === "signin" ? "signup" : "signin");
                        setErrorMsg(null);
                      }}
                      className="font-semibold text-primary hover:underline focus:outline-none cursor-pointer"
                    >
                      {authMode === "signin" ? "Sign up" : "Sign in"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
