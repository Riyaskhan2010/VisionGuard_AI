import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Shield, Eye, EyeOff, AlertCircle, CheckCircle,
  ArrowLeft, UserPlus, LogIn, Cpu, Zap,
  BarChart3, FileText, Lock,
} from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";

/* ── constants ─────────────────────────────────────────────────────── */
const REG_STEPS = ["Admin Verify", "Worker Info", "Success"];

const ROLES = [
  {
    id: "Admin", emoji: "👑", desc: "Manage team & view analytics",
    grad: "from-purple-600 to-indigo-600",
    sel: "border-purple-500/70 bg-purple-900/20 ring-1 ring-purple-500/30",
  },
  {
    id: "Worker", emoji: "⚙️", desc: "Inspect products & upload images",
    grad: "from-blue-600 to-cyan-600",
    sel: "border-blue-500/70 bg-blue-900/20 ring-1 ring-blue-500/30",
  },
];

const FEATURES = [
  { icon: Cpu,       label: "YOLOv8 AI",     sub: "6 defect types"   },
  { icon: Zap,       label: "Fast Detection", sub: "Under 2 seconds"  },
  { icon: BarChart3, label: "Live Analytics", sub: "Real-time charts" },
  { icon: FileText,  label: "PDF Reports",    sub: "Auto-generated"   },
];

/* ── tiny helpers ──────────────────────────────────────────────────── */
function ErrBox({ msg }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
      <p className="text-red-300 text-sm">{msg}</p>
    </div>
  );
}

function PwdInput({ id, label, value, onChange, show, onToggle }) {
  return (
    <div>
      {label && <label className="label" htmlFor={id}>{label}</label>}
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          className="input pr-10"
          placeholder="••••••••"
          value={value}
          onChange={onChange}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

/* ── left branding panel ───────────────────────────────────────────── */
function LeftPanel() {
  return (
    <div className="bg-gradient-to-br from-[#0d1b4b] via-[#0f2060] to-[#091540]
                    p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden">
      {/* Decorative rings */}
      <div className="absolute -top-16 -right-16 w-72 h-72 border border-blue-400/8 rounded-full pointer-events-none" />
      <div className="absolute -top-6 -right-6 w-52 h-52 border border-blue-400/8 rounded-full pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-72 h-72 border border-purple-400/8 rounded-full pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center gap-3 relative z-10">
        <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl
                        flex items-center justify-center shadow-lg shadow-blue-900/60">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-black text-white text-base tracking-tight">VisionGuard AI</p>
          <p className="text-blue-400 text-xs">Industrial Quality Intelligence</p>
        </div>
      </div>

      {/* Hero */}
      <div className="relative z-10 my-8">
        <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20
                        rounded-full px-3 py-1 mb-5">
          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
          <span className="text-blue-400 text-xs font-semibold">Powered by YOLOv8 + OpenCV</span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-black text-white leading-tight mb-4">
          Smart Quality<br />
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
            Control Platform
          </span>
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
          Detect cracks, scratches, dents and burn marks instantly.
          Approve results. Track every inspection end-to-end.
        </p>
      </div>

      {/* Feature grid */}
      <div className="relative z-10 grid grid-cols-2 gap-2.5 mb-8">
        {FEATURES.map(({ icon: Icon, label, sub }) => (
          <div key={label}
            className="bg-white/4 border border-white/8 rounded-xl p-3.5 hover:bg-white/7 transition-colors">
            <div className="w-7 h-7 bg-blue-500/15 rounded-lg flex items-center justify-center mb-2">
              <Icon className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <p className="text-white text-xs font-bold">{label}</p>
            <p className="text-slate-500 text-[11px] mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center gap-2">
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <p className="text-slate-500 text-xs">Edge AI · Works 100% Offline · SQLite</p>
      </div>
    </div>
  );
}

/* ── login form ────────────────────────────────────────────────────── */
function LoginForm({ role, setRole, form, setForm, showPwd, setShowPwd, loading, error, onSubmit }) {
  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h2 className="text-2xl font-black text-white mb-1">Welcome back</h2>
        <p className="text-slate-400 text-sm">Choose your role and sign in to continue</p>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-2 gap-3">
        {ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRole(r.id)}
            className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200
                        ${role === r.id
                          ? r.sel
                          : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60"}`}
          >
            {role === r.id && (
              <div className="absolute top-2.5 right-2.5 w-5 h-5 bg-blue-600 rounded-full
                              flex items-center justify-center shadow-md">
                <CheckCircle className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5
                              rounded-lg bg-gradient-to-r ${r.grad} text-white mb-2.5`}>
              {r.emoji} {r.id}
            </span>
            <p className="text-white text-sm font-bold">{r.id} Login</p>
            <p className="text-slate-500 text-[11px] mt-0.5 leading-tight">{r.desc}</p>
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="lemail">Email Address</label>
          <input
            id="lemail" type="email" className="input"
            placeholder="you@company.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required autoComplete="email"
          />
        </div>
        <PwdInput
          id="lpwd" label="Password"
          value={form.password} show={showPwd}
          onToggle={() => setShowPwd(!showPwd)}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <ErrBox msg={error} />}
        <button
          type="submit"
          disabled={loading || !role}
          className="w-full h-12 rounded-xl font-bold text-white transition-all duration-200
                     bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
                     disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30
                     flex items-center justify-center gap-2 text-sm"
        >
          {loading
            ? <><LoadingSpinner size="sm" />Signing in…</>
            : <><LogIn className="w-4 h-4" />Sign in as {role || "…"}</>}
        </button>
      </form>

      {/* Demo creds */}
      <div className="p-3 bg-slate-800/50 border border-slate-700/40 rounded-xl">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
          <Lock className="w-3 h-3" /> Demo Credentials
        </p>
        <p className="text-xs text-slate-500">
          <span className="text-purple-400 font-semibold">Admin</span> — admin@visionguard.com / admin123
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          <span className="text-blue-400 font-semibold">Worker</span> — worker@visionguard.com / worker123
        </p>
      </div>
    </div>
  );
}

/* ── step progress bar ─────────────────────────────────────────────── */
function StepBar({ current }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {REG_STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className={`flex items-center gap-1.5 ${i <= current ? "text-blue-400" : "text-slate-600"}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                             transition-all duration-300
                             ${i < current  ? "bg-blue-600 text-white"
                               : i === current ? "bg-blue-600/20 border-2 border-blue-500 text-blue-400"
                               : "bg-slate-800 border-2 border-slate-700 text-slate-600"}`}>
              {i < current ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span className="text-xs hidden sm:block font-medium">{s}</span>
          </div>
          {i < REG_STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 rounded-full transition-colors duration-300
                             ${i < current ? "bg-blue-600" : "bg-slate-700"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ── register flow ─────────────────────────────────────────────────── */
function RegisterFlow({
  step, aForm, setAForm, wForm, setWForm,
  showPwd, setShowPwd, loading, error, created,
  onAdminVerify, onCreateWorker, onBack, onReset, onGoLogin,
}) {
  return (
    <div className="animate-fade-in space-y-4">
      <div>
        <h2 className="text-2xl font-black text-white mb-1">Register Worker</h2>
        <p className="text-slate-400 text-sm">Admin authorization required to create accounts</p>
      </div>

      <StepBar current={step} />

      {/* step 0 — admin verify */}
      {step === 0 && (
        <form onSubmit={onAdminVerify} className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-purple-500/8 border border-purple-500/20 rounded-2xl">
            <div className="w-9 h-9 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl">👑</span>
            </div>
            <div>
              <p className="text-purple-300 font-bold text-sm">Admin Authorization</p>
              <p className="text-purple-400/70 text-xs mt-0.5">
                Enter admin credentials to authorize this registration.
              </p>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="aemail">Admin Email</label>
            <input
              id="aemail" type="email" className="input"
              placeholder="admin@visionguard.com"
              value={aForm.email}
              onChange={(e) => setAForm({ ...aForm, email: e.target.value })}
              required
            />
          </div>
          <PwdInput
            id="apwd" label="Admin Password"
            value={aForm.password} show={showPwd}
            onToggle={() => setShowPwd(!showPwd)}
            onChange={(e) => setAForm({ ...aForm, password: e.target.value })}
          />
          {error && <ErrBox msg={error} />}
          <button
            type="submit" disabled={loading}
            className="w-full h-12 rounded-xl font-bold text-white transition-all
                       bg-gradient-to-r from-purple-600 to-indigo-600
                       hover:from-purple-500 hover:to-indigo-500
                       disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {loading ? <><LoadingSpinner size="sm" />Verifying…</> : "Verify Admin & Continue →"}
          </button>
        </form>
      )}

      {/* step 1 — worker info */}
      {step === 1 && (
        <form onSubmit={onCreateWorker} className="space-y-3">
          <div className="flex items-center gap-2 p-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="text-emerald-300 text-xs font-semibold">Admin verified — fill in worker details</p>
          </div>

          {[
            { id:"wname",  label:"Full Name *",     type:"text",  key:"name",       ph:"John Smith"        },
            { id:"wemail", label:"Email Address *", type:"email", key:"email",      ph:"john@company.com"  },
            { id:"wdept",  label:"Department",      type:"text",  key:"department", ph:"Assembly Line A"   },
          ].map(({ id, label, type, key, ph }) => (
            <div key={id}>
              <label className="label" htmlFor={id}>{label}</label>
              <input
                id={id} type={type} className="input" placeholder={ph}
                value={wForm[key]}
                onChange={(e) => setWForm({ ...wForm, [key]: e.target.value })}
                required={key !== "department"}
              />
            </div>
          ))}

          <PwdInput
            id="wpwd" label="Password * (min 6 chars)"
            value={wForm.password} show={showPwd}
            onToggle={() => setShowPwd(!showPwd)}
            onChange={(e) => setWForm({ ...wForm, password: e.target.value })}
          />

          <div>
            <label className="label" htmlFor="wcpwd">Confirm Password *</label>
            <input
              id="wcpwd"
              type={showPwd ? "text" : "password"}
              className={`input ${wForm.confirm && wForm.password !== wForm.confirm ? "border-red-500/60" : ""}`}
              placeholder="••••••••"
              value={wForm.confirm}
              onChange={(e) => setWForm({ ...wForm, confirm: e.target.value })}
              required
            />
            {wForm.confirm && wForm.password !== wForm.confirm && (
              <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
            )}
          </div>

          {error && <ErrBox msg={error} />}

          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onBack}
              className="w-11 h-11 bg-slate-700/80 hover:bg-slate-600 rounded-xl
                         flex items-center justify-center transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 h-11 rounded-xl font-bold text-white transition-all
                         bg-gradient-to-r from-blue-600 to-blue-500
                         hover:from-blue-500 hover:to-blue-400
                         disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {loading
                ? <><LoadingSpinner size="sm" />Creating…</>
                : <><UserPlus className="w-4 h-4" />Create Worker Account</>}
            </button>
          </div>
        </form>
      )}

      {/* step 2 — success */}
      {step === 2 && created && (
        <div className="animate-fade-in space-y-5">
          <div className="flex flex-col items-center py-4 gap-3">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20
                            border-2 border-emerald-500/50 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black text-white">Account Created!</h3>
              <p className="text-slate-400 text-sm mt-1">Worker registered successfully</p>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4 space-y-3">
            {[
              { l: "Name",       v: created.name },
              { l: "Email",      v: created.email },
              { l: "Department", v: created.department || "—" },
              { l: "Role",       v: created.role },
            ].map(({ l, v }) => (
              <div key={l} className="flex justify-between items-center border-b border-slate-700/40 pb-2 last:border-0 last:pb-0">
                <span className="text-slate-500 text-sm">{l}</span>
                <span className="text-white text-sm font-semibold">{v}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onReset}
              className="h-11 rounded-xl border border-slate-600/60 text-slate-300
                         hover:bg-slate-700/60 text-sm font-semibold
                         flex items-center justify-center gap-2 transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Add Another
            </button>
            <button
              onClick={onGoLogin}
              className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500
                         hover:from-blue-500 hover:to-blue-400 text-white text-sm font-bold
                         flex items-center justify-center gap-2 transition-all"
            >
              <LogIn className="w-4 h-4" /> Go to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── main export ───────────────────────────────────────────────────── */
export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [tab, setTab]         = useState("login");
  const [showPwd, setShowPwd] = useState(false);

  // login state
  const [role, setRole]   = useState(null);
  const [lForm, setLForm] = useState({ email: "", password: "" });
  const [lLoad, setLLoad] = useState(false);
  const [lErr,  setLErr]  = useState("");

  // register state
  const [regStep, setRegStep] = useState(0);
  const [admTok, setAdmTok]   = useState("");
  const [aForm, setAForm]     = useState({ email: "", password: "" });
  const [wForm, setWForm]     = useState({ name:"", email:"", password:"", confirm:"", department:"" });
  const [rLoad, setRLoad]     = useState(false);
  const [rErr,  setRErr]      = useState("");
  const [created, setCreated] = useState(null);

  const resetReg = () => {
    setRegStep(0); setAdmTok("");
    setAForm({ email:"", password:"" });
    setWForm({ name:"", email:"", password:"", confirm:"", department:"" });
    setRErr(""); setCreated(null);
  };

  const switchTab = (t) => {
    setTab(t); setLErr(""); resetReg(); setShowPwd(false);
  };

  // login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!role) { setLErr("Please select Admin or Worker."); return; }
    setLLoad(true); setLErr("");
    try {
      const user = await login(lForm.email, lForm.password, role);
      navigate(user.role === "Admin" ? "/admin/dashboard" : "/worker/dashboard", { replace: true });
    } catch (err) {
      setLErr(err.response?.data?.message || "Invalid credentials.");
    } finally { setLLoad(false); }
  };

  // register step 1 — verify admin
  const handleAdminVerify = async (e) => {
    e.preventDefault();
    setRLoad(true); setRErr("");
    try {
      const res  = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: aForm.email, password: aForm.password, role: "Admin" }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Admin verification failed.");
      setAdmTok(data.data.token);
      setRegStep(1);
    } catch (err) { setRErr(err.message); }
    finally { setRLoad(false); }
  };

  // register step 2 — create worker
  const handleCreateWorker = async (e) => {
    e.preventDefault(); setRErr("");
    if (!wForm.name.trim())        { setRErr("Full name is required."); return; }
    if (!wForm.email.trim())       { setRErr("Email is required."); return; }
    if (wForm.password.length < 6) { setRErr("Password must be at least 6 characters."); return; }
    if (wForm.password !== wForm.confirm) { setRErr("Passwords do not match."); return; }
    setRLoad(true);
    try {
      const res  = await fetch("/api/admin/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${admTok}` },
        body: JSON.stringify({
          name: wForm.name.trim(),
          email: wForm.email.trim().toLowerCase(),
          password: wForm.password,
          department: wForm.department.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Failed to create worker.");
      setCreated(data.data);
      setRegStep(2);
    } catch (err) { setRErr(err.message); }
    finally { setRLoad(false); }
  };

  return (
    <div className="min-h-screen bg-[#07091a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-[30%] w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-700/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl
                      border border-white/8 grid grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
        {/* left */}
        <LeftPanel />

        {/* right */}
        <div className="bg-[#0e1322]/95 backdrop-blur-xl p-8 lg:p-10 flex flex-col justify-center min-h-[580px]">
          {/* tab switcher */}
          <div className="flex rounded-2xl bg-slate-800/70 border border-slate-700/40 p-1 mb-8 gap-1">
            {[
              { id: "login",    icon: LogIn,    label: "Sign In" },
              { id: "register", icon: UserPlus, label: "Register Worker" },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => switchTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                            text-sm font-bold transition-all duration-300
                            ${tab === id
                              ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/40"
                              : "text-slate-500 hover:text-white hover:bg-slate-700/50"}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <LoginForm
              role={role} setRole={setRole}
              form={lForm} setForm={setLForm}
              showPwd={showPwd} setShowPwd={setShowPwd}
              loading={lLoad} error={lErr}
              onSubmit={handleLogin}
            />
          ) : (
            <RegisterFlow
              step={regStep}
              aForm={aForm} setAForm={setAForm}
              wForm={wForm} setWForm={setWForm}
              showPwd={showPwd} setShowPwd={setShowPwd}
              loading={rLoad} error={rErr} created={created}
              onAdminVerify={handleAdminVerify}
              onCreateWorker={handleCreateWorker}
              onBack={() => { setRegStep(0); setRErr(""); }}
              onReset={resetReg}
              onGoLogin={() => switchTab("login")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
