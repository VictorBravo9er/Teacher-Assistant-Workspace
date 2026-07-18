import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  ArrowRight,
  Loader2,
  MapPin,
  Globe2,
  GraduationCap
} from "lucide-react";
import { supabase } from "../lib/supabase";

interface AuthPageProps {
  onBack: () => void;
}

interface FuzzyAutocompleteFieldProps {
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  rpcMethod: string;
}

function FuzzyAutocompleteField({ label, icon, placeholder, value, onChange, rpcMethod }: FuzzyAutocompleteFieldProps) {
  const [results, setResults] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchResults = async () => {
      if (value.length < 2) {
        setResults([]);
        return;
      }
      const { data, error } = await supabase.rpc(rpcMethod as any, { search_term: value });
      if (!error && data) {
        setResults(data.map((r: any) => r.result));
      }
    };
    
    // Add small debounce
    const timeoutId = setTimeout(fetchResults, 300);
    return () => clearTimeout(timeoutId);
  }, [value, rpcMethod]);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-[10px] font-semibold text-muted-text mb-1 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-text flex items-center justify-center">
          {icon}
        </div>
        <input 
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => {
            if (value.length >= 2) setShowDropdown(true);
          }}
          placeholder={placeholder}
          className="w-full bg-surface border border-border-color rounded-lg py-2 pl-8 pr-3 text-xs focus:outline-none focus:border-primary transition-all"
        />
      </div>
      
      {showDropdown && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-surface border border-border-color rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-40 overflow-y-auto">
            {results.map((res, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  onChange(res);
                  setShowDropdown(false);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-primary/10 transition-colors border-b border-border-color/50 last:border-0 truncate"
              >
                {res}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuthPage({ onBack }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  
  // Institute Autocomplete State
  const [instituteSearch, setInstituteSearch] = useState("");
  const [instituteResults, setInstituteResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedInstituteId, setSelectedInstituteId] = useState<string | null>(null);
  const [selectedInstitute, setSelectedInstitute] = useState<any>(null);
  
  // New Institute State
  const [isCreatingInstitute, setIsCreatingInstitute] = useState(false);
  const [newInstitute, setNewInstitute] = useState({
    district: "",
    city: "",
    state: "",
    country: "",
    type: "K-12"
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search for institutes
  useEffect(() => {
    if (isLogin) return;
    
    const searchInstitutes = async () => {
      if (instituteSearch.length < 2) {
        setInstituteResults([]);
        return;
      }
      
      const { data, error } = await supabase
        .rpc('search_institutes', { search_term: instituteSearch });
        
      if (!error && data) {
        setInstituteResults(data);
      }
    };

    const timer = setTimeout(() => {
      searchInstitutes();
    }, 300);

    return () => clearTimeout(timer);
  }, [instituteSearch, isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        
        let finalInstituteId = selectedInstituteId;
        let finalInstituteName = instituteSearch;

        if (!isCreatingInstitute && !selectedInstituteId) {
          throw new Error("Please select an institute from the list or click 'Create' to add a new one.");
        }

        const metadata: any = {
          full_name: fullName,
          phone: phone,
          institute: finalInstituteName,
          institute_id: finalInstituteId
        };

        if (isCreatingInstitute) {
          metadata.institute_district = newInstitute.district;
          metadata.institute_city = newInstitute.city;
          metadata.institute_state = newInstitute.state;
          metadata.institute_country = newInstitute.country;
          metadata.institute_type = newInstitute.type;
          metadata.is_new_institute = true;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
          },
        });
        if (error) throw error;
        setIsSuccess(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectInstitute = (inst: any) => {
    setInstituteSearch(inst.name);
    setSelectedInstituteId(inst.id);
    setSelectedInstitute(inst);
    setShowDropdown(false);
    setIsCreatingInstitute(false);
  };

  const handleStartCreateInstitute = () => {
    setSelectedInstituteId(null);
    setSelectedInstitute(null);
    setShowDropdown(false);
    setIsCreatingInstitute(true);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden font-sans text-primary-text">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md z-10 my-8">
        <button
          onClick={onBack}
          className="text-sm font-medium text-muted-text hover:text-primary-text mb-6 flex items-center gap-1 transition-colors cursor-pointer"
        >
          &larr; Back to Home
        </button>

        <div className="bg-surface/60 backdrop-blur-2xl border border-border-color rounded-3xl p-8 shadow-2xl relative overflow-visible">
          {/* Decorative shine */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>

          {isSuccess ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-xl font-bold font-display mb-2">
                Check your email
              </h3>
              <p className="text-sm text-muted-text mb-8">
                We've sent a verification link to{" "}
                <span className="font-semibold text-primary-text">{email}</span>
                . Please verify your email address to activate your account.
              </p>
              <button
                onClick={() => {
                  setIsSuccess(false);
                  setIsLogin(true);
                  setEmail("");
                  setPassword("");
                  setInstituteSearch("");
                  setSelectedInstituteId(null);
                  setIsCreatingInstitute(false);
                }}
                className="w-full py-3 bg-elevated hover:bg-elevated/80 border border-border-color text-primary-text font-semibold rounded-xl transition-all cursor-pointer"
              >
                Return to Sign In
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold font-display text-center mb-2">
                {isLogin ? "Welcome back" : "Create an account"}
              </h2>
              <p className="text-sm text-muted-text text-center mb-6">
                {isLogin
                  ? "Enter your credentials to access your workspace"
                  : "Join to start managing your classrooms with AI"}
              </p>

              {errorMsg && (
                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-semibold text-center">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-muted-text mb-1.5 uppercase tracking-wider">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Jane Doe"
                          required
                          className="w-full bg-elevated border border-border-color rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-muted-text mb-1.5 uppercase tracking-wider">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 992-123-4567"
                          required
                          className="w-full bg-elevated border border-border-color rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                      </div>
                    </div>

                    <div className="relative" ref={dropdownRef}>
                      <label className="block text-xs font-semibold text-muted-text mb-1.5 uppercase tracking-wider">
                        Institute <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text" />
                        <input
                          type="text"
                          value={instituteSearch}
                          onChange={(e) => {
                            setInstituteSearch(e.target.value);
                            setShowDropdown(true);
                            setIsCreatingInstitute(false);
                            setSelectedInstituteId(null);
                            setSelectedInstitute(null);
                          }}
                          onFocus={() => setShowDropdown(true)}
                          placeholder="Search or enter your Institute"
                          required
                          className="w-full bg-elevated border border-border-color rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                      </div>
                      
                      {/* Autocomplete Dropdown */}
                      {showDropdown && instituteSearch.length >= 2 && !isCreatingInstitute && (
                        <div className="absolute z-50 w-full mt-2 bg-elevated border border-border-color rounded-xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                          {instituteResults.length > 0 ? (
                            <>
                              <div className="px-3 py-2 text-[10px] font-bold text-muted-text uppercase tracking-wider bg-surface/50">
                                Matching Institutes
                              </div>
                              {instituteResults.map((inst) => (
                                <button
                                  key={inst.id}
                                  type="button"
                                  onClick={() => handleSelectInstitute(inst)}
                                  className="w-full text-left px-4 py-3 hover:bg-primary/10 transition-colors border-b border-border-color/50 last:border-0 flex flex-col gap-1 cursor-pointer"
                                >
                                  <span className="font-semibold text-sm">{inst.name}</span>
                                  {(inst.district || inst.city || inst.country) && (
                                    <span className="text-xs text-muted-text">
                                      {inst.district}{inst.district && inst.city ? ', ' : ''}{inst.city}{inst.city && inst.country ? ', ' : ''}{inst.country}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </>
                          ) : (
                            <div className="px-4 py-3 text-sm text-muted-text italic">
                              No matches found.
                            </div>
                          )}
                          
                          <button
                            type="button"
                            onClick={handleStartCreateInstitute}
                            className="w-full text-left px-4 py-3 bg-primary/5 hover:bg-primary/10 text-primary transition-colors border-t border-border-color font-semibold text-sm cursor-pointer"
                          >
                            + Create "{instituteSearch}"
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Selected Institute Details */}
                    {selectedInstitute && !isCreatingInstitute && (
                      <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                            <Building2 className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-sm font-semibold text-primary">{selectedInstitute.name}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-text mt-1 pl-7">
                          {selectedInstitute.district && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {selectedInstitute.district}
                            </span>
                          )}
                          {selectedInstitute.city && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {selectedInstitute.city}{selectedInstitute.state ? `, ${selectedInstitute.state}` : ''}
                            </span>
                          )}
                          {selectedInstitute.country && (
                            <span className="flex items-center gap-1">
                              <Globe2 className="w-3 h-3" />
                              {selectedInstitute.country}
                            </span>
                          )}
                          {selectedInstitute.type && (
                            <span className="flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" />
                              {selectedInstitute.type}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* New Institute Extended Form */}
                    {isCreatingInstitute && (
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <Building2 className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <span className="text-sm font-semibold text-primary">New Institute Details</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <FuzzyAutocompleteField
                            label="District"
                            icon={<MapPin className="w-full h-full" />}
                            placeholder="District"
                            value={newInstitute.district}
                            onChange={(val) => setNewInstitute({...newInstitute, district: val})}
                            rpcMethod="search_districts"
                          />
                          <FuzzyAutocompleteField
                            label="City"
                            icon={<Building2 className="w-full h-full" />}
                            placeholder="City"
                            value={newInstitute.city}
                            onChange={(val) => setNewInstitute({...newInstitute, city: val})}
                            rpcMethod="search_cities"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <FuzzyAutocompleteField
                            label="State/Region"
                            icon={<MapPin className="w-full h-full" />}
                            placeholder="State"
                            value={newInstitute.state}
                            onChange={(val) => setNewInstitute({...newInstitute, state: val})}
                            rpcMethod="search_states"
                          />
                          <FuzzyAutocompleteField
                            label="Country"
                            icon={<Globe2 className="w-full h-full" />}
                            placeholder="Country"
                            value={newInstitute.country}
                            onChange={(val) => setNewInstitute({...newInstitute, country: val})}
                            rpcMethod="search_countries"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-muted-text mb-1 uppercase tracking-wider">Type</label>
                            <div className="relative">
                              <GraduationCap className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-text" />
                              <select 
                                value={newInstitute.type}
                                onChange={e => setNewInstitute({...newInstitute, type: e.target.value})}
                                className="w-full bg-surface border border-border-color rounded-lg py-2 pl-8 pr-3 text-xs focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                              >
                                <option value="K-12">K-12 School</option>
                                <option value="Higher Education">Higher Education</option>
                                <option value="Vocational">Vocational</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-muted-text mb-1.5 uppercase tracking-wider">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="teacher@school.edu"
                      required
                      className="w-full bg-elevated border border-border-color rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-muted-text uppercase tracking-wider">
                      Password <span className="text-red-500">*</span>
                    </label>
                    {isLogin && (
                      <a
                        href="#"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-text" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-elevated border border-border-color rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 mt-6 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {isLogin ? "Sign In" : "Create Account"}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 text-center text-sm text-muted-text">
                {isLogin
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setErrorMsg(null);
                  }}
                  className="font-semibold text-primary hover:underline focus:outline-none cursor-pointer"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
