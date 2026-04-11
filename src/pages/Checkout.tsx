import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { User, CartItem } from "../types";
import { CreditCard, QrCode, Truck, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";

interface CheckoutProps {
  user: User | null;
  cart: CartItem[];
  clearCart: () => void;
}

export function Checkout({ user, cart, clearCart }: CheckoutProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"checkout" | "success">("checkout");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Checkout Form State
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState(user?.name || "");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [number, setNumber] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"credit_card" | "pix">("pix");
  
  // Pix QR Response
  const [pixData, setPixData] = useState<{qr_code: string; qr_code_base64: string} | null>(null);
  const [copied, setCopied] = useState(false);
  const [dbOrderId, setDbOrderId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");

  // Polling para verificar pagamento PIX em tempo real
  useEffect(() => {
    let interval: any;
    if (step === "success" && dbOrderId && paymentMethod === "pix" && paymentStatus !== "approved") {
      console.log(`[POLLING] Iniciando vigilância do pedido ${dbOrderId}...`);
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/orders/${dbOrderId}/status`);
          if (res.ok) {
            const data = await res.json();
            console.log(`[POLLING] Status do pagamento: ${data.paymentStatus}`);
            if (data.paymentStatus === "approved") {
              console.log("[POLLING] CONFIRMADO! Atualizando tela...");
              setPaymentStatus("approved");
              clearInterval(interval);
            }
          } else {
            console.warn(`[POLLING] Servidor respondeu com erro: ${res.status}`);
          }
        } catch (e) {
          console.error("[POLLING] Falha na conexão de rede:", e);
        }
      }, 5000); // Verifica a cada 5 segundos
    }
    return () => clearInterval(interval);
  }, [step, dbOrderId, paymentMethod, paymentStatus]);

  useEffect(() => {
    if (cart.length === 0 && step !== "success") {
      navigate("/");
    }
  }, [cart]);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const total = subtotal + (selectedShipping ? selectedShipping.cost : 0);

  const fetchShipping = async (searchCep: string) => {
    if (searchCep.length < 8) return;
    try {
      const res = await fetch("/api/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: searchCep, totalAmount: subtotal })
      });
      if (res.ok) {
        const data = await res.json();
        setShippingOptions(data.options);
        if (data.options.length > 0) setSelectedShipping(data.options[0]);
      }
    } catch (e) {
      console.error("Erro frete:", e);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    setCep(val);
    if (val.length === 8) {
      fetchShipping(val);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipping) {
      if (shippingOptions.length === 0) {
        setError("Por favor, digite seu CEP completo (8 dígitos) para carregar as opções de frete.");
      } else {
        setError("Por favor, selecione uma opção de frete disponível.");
      }
      return;
    }
    
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id || email,
          payerEmail: email,
          payerName: name,
          items: cart,
          shippingAddress: { cep, address, number, city, state },
          paymentMethod,
          shippingCost: selectedShipping.cost,
          totalAmount: total
        })
      });

      const data = await res.json();
      if (res.ok) {
        clearCart();
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
          return; // Para a execução para não ir para a tela de sucesso local
        }
        if (data.orderId) {
          setDbOrderId(data.orderId);
        }
        if (data.pix) {
          setPixData(data.pix);
        }
        setStep("success");
      } else {
        setError(data.message || "Erro ao processar pagamento.");
      }
    } catch (e) {
      setError("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const currentOrderId = `ORD-${new Date().getFullYear()}-${Math.floor(1000+Math.random()*9000)}`;

  if (step === "success") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center pt-20 px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl w-full bg-suopes-black border border-suopes-gray p-10 text-center"
        >
          {paymentStatus === "approved" ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-20 h-20 bg-green-500/20 flex items-center justify-center rounded-full mx-auto mb-6">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              <h1 className="text-3xl font-black mb-4 uppercase text-green-500">Pagamento Aprovado!</h1>
              <div className="bg-suopes-gray/10 border border-suopes-gray p-6 mb-8 rounded-sm">
                <p className="text-white font-bold mb-2 uppercase">Missão Cumprida!</p>
                <p className="text-suopes-muted font-mono text-sm">
                  Recebemos seu pagamento com sucesso. Seu equipamento já está sendo preparado pela nossa logística.
                  Muito obrigado por confiar na SUOPES TACTICAL!
                </p>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="w-20 h-20 bg-suopes-gold/20 flex items-center justify-center rounded-full mx-auto mb-6">
                <CheckCircle2 size={40} className="text-suopes-gold" />
              </div>
              <h1 className="text-2xl font-black mb-2 uppercase">Pedido Registrado!</h1>
              <p className="text-suopes-muted font-mono text-sm mb-8">
                Sua solicitação de suprimento foi registrada e aguarda confirmação de pagamento.
              </p>

              {pixData && (
                <div className="mb-8 p-6 bg-suopes-gray/10 border border-suopes-gold rounded-sm">
                  <h3 className="text-sm font-bold uppercase text-suopes-gold mb-4 flex items-center justify-center gap-2">
                    <QrCode size={18} /> PGTO VIA PIX
                  </h3>
                  <img 
                    src={`data:image/jpeg;base64,${pixData.qr_code_base64}`} 
                    alt="QR Code PIX" 
                    className="w-48 h-48 mx-auto mb-4 border-2 border-white p-2 bg-white"
                  />
                  <p className="text-[10px] font-mono text-suopes-muted mb-2">Pix Copia e Cola:</p>
                  <div className="flex bg-suopes-black border border-suopes-gray p-2">
                    <input 
                      type="text" 
                      value={pixData.qr_code} 
                      readOnly 
                      className="w-full bg-transparent text-xs text-white outline-none font-mono tracking-tighter"
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(pixData.qr_code);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="px-4 text-suopes-gold hover:text-white transition-colors flex-shrink-0"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-suopes-gold rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-mono text-suopes-gold uppercase tracking-widest">Aguardando Aprovação Instantânea...</span>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="space-y-4">
            <button onClick={() => navigate("/compras")} className="w-full btn-suopes">
              VER MEUS PEDIDOS
            </button>
            <button onClick={() => navigate("/")} className="w-full btn-outline">
              VOLTAR AO ARSENAL
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-suopes-black pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="flex items-center gap-4 mb-10">
          <div className="h-[1px] w-12 bg-suopes-gold"></div>
          <span className="text-[10px] font-mono text-suopes-gold uppercase tracking-[0.3em]">Checkout</span>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Coluna Esquerda: Formulários */}
          <div className="lg:w-3/5">
            <form id="checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-10">
              
              {/* Contato */}
              <section>
                <h2 className="text-xl font-black uppercase mb-4 tracking-tight">Contato</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="email" 
                    required 
                    placeholder="E-mail Operacional" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-suopes-gray/10 border border-suopes-gray h-12 px-4 text-sm focus:border-suopes-gold outline-none transition-colors font-mono"
                  />
                  <input 
                    type="text" 
                    required 
                    placeholder="Nome Completo / Callsign" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-suopes-gray/10 border border-suopes-gray h-12 px-4 text-sm focus:border-suopes-gold outline-none transition-colors font-mono"
                  />
                </div>
              </section>

              {/* Endereço */}
              <section>
                <h2 className="text-xl font-black uppercase mb-4 tracking-tight">Zona de Entrega</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <input 
                    type="text" 
                    required 
                    placeholder="CEP" 
                    maxLength={8}
                    value={cep}
                    onChange={handleCepChange}
                    className="w-full md:col-span-1 bg-suopes-gray/10 border border-suopes-gray h-12 px-4 text-sm focus:border-suopes-gold outline-none transition-colors font-mono"
                  />
                  <input 
                    type="text" 
                    required 
                    placeholder="Rua / Avenida" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full md:col-span-2 bg-suopes-gray/10 border border-suopes-gray h-12 px-4 text-sm focus:border-suopes-gold outline-none transition-colors font-mono"
                  />
                  <input 
                    type="text" 
                    required 
                    placeholder="Nº" 
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full md:col-span-1 bg-suopes-gray/10 border border-suopes-gray h-12 px-4 text-sm focus:border-suopes-gold outline-none transition-colors font-mono"
                  />
                  <input 
                    type="text" 
                    required 
                    placeholder="Cidade" 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full md:col-span-3 bg-suopes-gray/10 border border-suopes-gray h-12 px-4 text-sm focus:border-suopes-gold outline-none transition-colors font-mono"
                  />
                  <input 
                    type="text" 
                    required 
                    placeholder="UF" 
                    maxLength={2}
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="w-full md:col-span-1 bg-suopes-gray/10 border border-suopes-gray h-12 px-4 text-sm focus:border-suopes-gold outline-none transition-colors font-mono uppercase"
                  />
                </div>
              </section>

              {/* Frete */}
              <section>
                <h2 className="text-xl font-black uppercase mb-4 tracking-tight">Método de Transporte</h2>
                {shippingOptions.length === 0 ? (
                  <div className="p-4 border border-suopes-gray bg-suopes-gray/5 text-sm font-mono text-suopes-muted">
                    Aguardando CEP com 8 dígitos para calcular...
                  </div>
                ) : (
                    <div className="space-y-3">
                    {shippingOptions.map(opt => (
                      <label 
                        key={opt.id} 
                        className={`flex items-center justify-between p-4 border transition-colors cursor-pointer ${selectedShipping?.id === opt.id ? 'border-suopes-gold bg-suopes-gold/5' : 'border-suopes-gray bg-suopes-gray/10 hover:border-gray-400'}`}
                        onClick={() => setSelectedShipping(opt)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedShipping?.id === opt.id ? 'border-suopes-gold' : 'border-gray-500'}`}>
                            {selectedShipping?.id === opt.id && <div className="w-2 h-2 bg-suopes-gold rounded-full" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold flex items-center gap-2"><Truck size={16}/> {opt.name}</p>
                            <p className="text-[10px] font-mono text-suopes-muted">{opt.time}</p>
                          </div>
                        </div>
                        {opt.cost === 0 ? (
                          <span className="font-mono text-green-500 font-bold uppercase">Grátis</span>
                        ) : (
                          <span className="font-mono text-suopes-gold font-bold">R$ {opt.cost.toFixed(2)}</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </section>
              {/* Pagamento */}
              <section>
                <h2 className="text-xl font-black uppercase mb-4 tracking-tight">Pagamento via Mercado Pago</h2>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button"
                    onClick={() => setPaymentMethod("pix")}
                    className={`h-20 border flex flex-col items-center justify-center gap-2 transition-colors ${paymentMethod === 'pix' ? 'border-suopes-gold bg-suopes-gold/5 text-suopes-gold' : 'border-suopes-gray text-suopes-muted hover:border-gray-400'}`}
                  >
                    <QrCode size={24} />
                    <span className="text-xs font-bold uppercase tracking-widest">PIX</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setPaymentMethod("credit_card")}
                    className={`h-20 border flex flex-col items-center justify-center gap-2 transition-colors ${paymentMethod === 'credit_card' ? 'border-suopes-gold bg-suopes-gold/5 text-suopes-gold' : 'border-suopes-gray text-suopes-muted hover:border-gray-400'}`}
                  >
                    <CreditCard size={24} />
                    <span className="text-xs font-bold uppercase tracking-widest">Cartão de Crédito</span>
                  </button>
                </div>
                
                {paymentMethod === 'credit_card' && (
                  <div className="mt-4 p-6 border border-suopes-gray bg-suopes-gray/5 space-y-4">
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      <CreditCard size={32} className="text-suopes-gold mb-2" />
                      <p className="text-sm font-bold uppercase mb-1">Check-out Seguro</p>
                      <p className="text-xs text-suopes-muted font-mono max-w-xs mx-auto">Você será redirecionado para o ambiente criptografado do Mercado Pago para inserir os dados do seu cartão com segurança.</p>
                    </div>
                  </div>
                )}
              </section>

              {error && (
                <div className="flex items-center gap-2 text-suopes-red font-mono text-xs p-3 bg-suopes-red/10 border border-suopes-red/20">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
            </form>
          </div>

          {/* Coluna Direita: Resumo do Pedido */}
          <div className="lg:w-2/5">
            <div className="sticky top-24 bg-suopes-gray/10 border border-suopes-gray p-6 md:p-8">
              <h2 className="text-xl font-black uppercase mb-6 tracking-tight border-b border-suopes-gray/50 pb-4">Resumo da Aquisição</h2>
              
              <div className="space-y-6 max-h-[40vh] overflow-y-auto mb-6 pr-2 custom-scrollbar">
                {cart.map((item, id) => (
                  <div key={id} className="flex gap-4">
                    <div className="w-16 h-20 bg-suopes-black border border-suopes-gray flex-shrink-0 relative">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-suopes-gold text-black rounded-full text-[10px] flex items-center justify-center font-bold">{item.quantity}</span>
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-xs font-bold uppercase">{item.name}</h4>
                      {item.selectedColor && <p className="text-[10px] font-mono text-suopes-muted uppercase mt-1">COR: {item.selectedColor}</p>}
                      {item.selectedSize && <p className="text-[10px] font-mono text-suopes-muted uppercase">TAMANHO: {item.selectedSize}</p>}
                    </div>
                    <div>
                      <p className="text-sm font-mono text-white">R$ {(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mb-6">
                <input type="text" placeholder="Código de desconto" className="flex-grow bg-suopes-black border border-suopes-gray h-12 px-4 font-mono text-sm uppercase outline-none focus:border-suopes-gold" />
                <button type="button" className="btn-outline px-6 whitespace-nowrap">Aplicar</button>
              </div>

              <div className="space-y-3 font-mono text-xs border-t border-b border-suopes-gray/50 py-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-suopes-muted">SUBTOTAL</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-suopes-muted">FRETE</span>
                  <span>{selectedShipping ? (selectedShipping.cost === 0 ? <span className="text-green-500 font-bold">GRÁTIS</span> : `R$ ${selectedShipping.cost.toFixed(2)}`) : "A calcular"}</span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-8">
                <span className="text-sm font-bold uppercase">TOTAL ENCARGOS</span>
                <span className="text-2xl font-mono text-suopes-gold">R$ {total.toFixed(2)}</span>
              </div>

              <button 
                type="submit" 
                form="checkout-form"
                disabled={loading}
                className="w-full btn-suopes flex justify-center h-14 items-center group disabled:opacity-50"
              >
                {loading ? "PROCESSANDO VIA MERCADO PAGO..." : "CONFIRMAR E PAGAR"}
              </button>
              <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-suopes-muted font-mono uppercase">
                <CheckCircle2 size={12} className="text-green-500" />
                Transação 100% Segura e Criptografada
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
