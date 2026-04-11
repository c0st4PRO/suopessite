import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Mail, KeyRound, Lock, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export function ForgotPassword() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestCode = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSuccess("Se o e-mail existir na nossa base, um código de verificação foi enviado.");
        setStep(2);
      } else {
        const data = await response.json();
        setError(data.message || "Erro ao solicitar o código.");
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess("Nova senha configurada com sucesso. Redirecionando...");
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setError(data.message || "Código inválido ou expirado.");
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
        className="w-full max-w-md bg-suopes-gray/20 border border-suopes-gray p-8 backdrop-blur-sm relative overflow-hidden"
      >
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-2 text-suopes-gold">RECUPERAÇÃO</h1>
          <p className="text-xs font-mono text-suopes-muted tracking-widest uppercase">
            {step === 1 ? "Reestabelecer credenciais" : "Confirmar novo código de acesso"}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-suopes-red bg-suopes-red/10 p-3 text-xs font-mono border border-suopes-red/20 mb-6">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-green-500 bg-green-500/10 p-3 text-xs font-mono border border-green-500/20 mb-6">
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        <div className="relative">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleRequestCode} 
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest block text-center mb-2">E-mail Operacional</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-suopes-muted" size={18} />
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-suopes-black border border-suopes-gray h-12 pl-10 pr-4 text-sm focus:border-suopes-gold outline-none transition-colors font-mono text-center"
                      placeholder="operador@suopes.com"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !email}
                  className="w-full btn-suopes h-14 flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {loading ? "SOLICITANDO..." : (
                    <>
                      SOLICITAR CÓDIGO <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {step === 2 && (
              <motion.form 
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleResetPassword} 
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest block text-center mb-2">Código de 6 dígitos</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-suopes-gold" size={18} />
                    <input 
                      type="text" 
                      maxLength={6}
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-suopes-black border border-suopes-gold h-14 pl-10 pr-4 text-xl tracking-[0.5em] text-center focus:border-white focus:bg-suopes-gray/20 outline-none transition-all font-mono"
                      placeholder="------"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest block text-center mb-2">Nova Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-suopes-muted" size={18} />
                    <input 
                      type="password" 
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-suopes-black border border-suopes-gray h-12 pl-10 pr-4 text-sm focus:border-suopes-gold outline-none transition-colors font-mono text-center"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || code.length !== 6 || newPassword.length < 6}
                  className="w-full btn-suopes h-14 flex items-center justify-center gap-2 group disabled:opacity-50"
                >
                  {loading ? "PROCESSANDO..." : (
                    <>
                      CONFIRMAR NOVA SENHA <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 pt-6 border-t border-suopes-gray text-center">
          <Link to="/login" className="text-[10px] font-bold text-suopes-muted hover:text-suopes-gold transition-colors uppercase tracking-widest">
            Voltar para o Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
