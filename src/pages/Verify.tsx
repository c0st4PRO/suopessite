import { useState, FormEvent, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { KeyRound, ArrowRight, AlertCircle } from "lucide-react";

export function Verify() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailToVerify, setEmailToVerify] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.email) {
      setEmailToVerify(location.state.email);
    } else {
      // Se não tiver email no estado, manda pro login
      navigate("/login");
    }
  }, [location, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToVerify, code }),
      });

      const data = await response.json();

      if (response.ok) {
        navigate("/login");
      } else {
        setError(data.message || "Código inválido. Verifique o seu e-mail.");
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
          <h1 className="text-3xl font-black mb-2 text-suopes-gold">CÓDIGO DE SEGURANÇA</h1>
          <p className="text-xs font-mono text-suopes-muted tracking-widest uppercase mt-4">
            Um código tático foi enviado para {emailToVerify ? <span className="text-white">{emailToVerify}</span> : "seu e-mail"}. 
            Insira-o abaixo para liberar seu acesso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 text-suopes-red bg-suopes-red/10 p-3 text-xs font-mono border border-suopes-red/20">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-white/50 uppercase tracking-widest text-center block mb-4">
              Digite os 6 dígitos numéricos
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-suopes-gold" size={18} />
              <input 
                type="text" 
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-suopes-black border border-suopes-gold h-16 pl-12 pr-4 text-2xl tracking-[1em] text-center focus:border-white focus:bg-suopes-gray/20 outline-none transition-all font-mono"
                placeholder="------"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || code.length !== 6}
            className="w-full btn-suopes h-14 flex items-center justify-center gap-2 group mt-8 disabled:opacity-50"
          >
            {loading ? "VERIFICANDO..." : (
              <>
                CONFIRMAR CÓDIGO <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
