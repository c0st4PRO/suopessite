import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { User, Lock, ArrowRight, AlertCircle } from "lucide-react";

interface LoginProps {
  onLogin: (user: any) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin(data);
        navigate("/");
      } else {
        if (data.unverified) {
          navigate("/verify", { state: { email } });
        } else {
          setError(data.message || "E-mail ou senha incorretos.");
        }
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-suopes-gray/20 border border-suopes-gray p-8 backdrop-blur-sm"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-2">ACESSO OPERACIONAL</h1>
          <p className="text-xs font-mono text-suopes-muted tracking-widest uppercase">Identifique-se para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 text-suopes-red bg-suopes-red/10 p-3 text-xs font-mono border border-suopes-red/20">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">E-mail</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-suopes-muted" size={18} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-suopes-black border border-suopes-gray h-12 pl-10 pr-4 text-sm focus:border-suopes-gold outline-none transition-colors font-mono"
                placeholder="operador@suopes.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">Senha</label>
              <Link to="/forgot-password" className="text-[10px] font-mono text-suopes-gold hover:text-white transition-colors uppercase tracking-widest">
                Esqueceu a senha?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-suopes-muted" size={18} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-suopes-black border border-suopes-gray h-12 pl-10 pr-4 text-sm focus:border-suopes-gold outline-none transition-colors font-mono"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-suopes h-14 flex items-center justify-center gap-2 group"
          >
            {loading ? "AUTENTICANDO..." : (
              <>
                ENTRAR <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-suopes-gray text-center">
          <p className="text-[10px] font-mono text-suopes-muted mb-4 uppercase">Ainda não tem acesso?</p>
          <Link to="/register" className="text-xs font-bold text-suopes-gold hover:text-suopes-red transition-colors uppercase tracking-widest block">
            Solicitar Credenciais
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
