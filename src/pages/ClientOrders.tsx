import { motion, AnimatePresence } from "motion/react";
import { Package, Truck, CheckCircle2, Clock, MapPin, ChevronRight, ShoppingBag, X } from "lucide-react";
import { User } from "../types";
import { Link } from "react-router-dom";

interface Order {
  id: string;
  date: string;
  status: "processando" | "enviado" | "entregue" | "cancelado" | "pendente";
  paymentStatus: "pending" | "approved" | "rejected" | "cancelled" | "in_process";
  total: number;
  shippingCost?: number;
  items: {
    name: string;
    quantity: number;
    price: number;
    image: string;
    color?: string;
  }[];
  trackingCode?: string;
  carrier?: string;
}

// Removido o mock estático para usar fetch dinâmico da API

const statusConfig = {
  processando: { icon: Clock, color: "text-suopes-gold", label: "PROCESSANDO" },
  enviado: { icon: Truck, color: "text-blue-400", label: "EM TRÂNSITO" },
  entregue: { icon: CheckCircle2, color: "text-green-400", label: "ENTREGUE" },
  cancelado: { icon: X, color: "text-suopes-red", label: "CANCELADO" }
};

import { useState, useEffect } from "react";

export function ClientOrders({ user }: { user: User | null }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [trackingCodeInput, setTrackingCodeInput] = useState("");

  const trackPackage = async (code: string) => {
    if (!code) return;
    setTrackingLoading(true);
    setTrackingResult(null);
    try {
      // Usando Linketrack (API Pública demo para Correios e outros)
      const userTrack = "teste";
      const tokenTrack = "1abcd";
      const res = await fetch(`https://api.linketrack.com/track/json?user=${userTrack}&token=${tokenTrack}&codigo=${code}`);
      const data = await res.json();
      if (data && data.eventos) {
        setTrackingResult(data);
      } else {
        alert("Nenhum evento encontrado para este código.");
      }
    } catch (err) {
      console.error("Erro ao rastrear", err);
      alert("Não foi possível localizar este objeto no momento. Verifique o código.");
    } finally {
      setTrackingLoading(false);
    }
  };

  useEffect(() => {
    let interval: any;
    
    const loadOrders = async () => {
      if (!user) return;
      try {
        const res = await fetch(`/api/orders`, {
          headers: { "Authorization": `Bearer ${user?.token}` }
        });
        const data = await res.json();
        setOrders(data);
        setLoading(false);
      } catch (err) {
        console.error("Erro ao carregar pedidos", err);
        setLoading(false);
      }
    };

    loadOrders();

    // POLLING: Monitorar mudanças de status a cada 10 segundos
    if (user) {
      interval = setInterval(loadOrders, 10000);
    }

    return () => clearInterval(interval);
  }, [user]);
  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6">
        <ShoppingBag size={48} className="text-suopes-gray mb-6" />
        <h1 className="text-2xl font-black mb-4">ACESSO RESTRITO</h1>
        <p className="text-suopes-muted font-mono text-xs mb-8">FAÇA LOGIN PARA VER SEUS PEDIDOS</p>
        <Link to="/login" className="btn-suopes px-8">ENTRAR</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-suopes-black pt-12 pb-24">
      <div className="max-w-4xl mx-auto px-6">
        <header className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="h-[1px] w-12 bg-suopes-gold"></div>
            <span className="text-[10px] font-mono text-suopes-gold uppercase tracking-[0.3em]">Painel do Operador</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2">
            Minhas <span className="text-suopes-gold">Compras</span>
          </h1>
          <p className="text-suopes-muted font-mono text-xs uppercase tracking-widest">
            Histórico de missões e aquisições de equipamento
          </p>
        </header>

        <div className="space-y-8">
          {/* TRACKING TOOL BOX */}
          <section id="rastreio" className="bg-suopes-gray/5 border border-suopes-gray p-8 mb-12">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Truck size={20} className="text-suopes-gold" /> RASTREIO RÁPIDO
            </h2>
            <p className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest mb-6">Insira qualquer código de rastreio para verificar o status em tempo real</p>
            
            <div className="flex flex-col md:flex-row gap-3">
              <input 
                type="text"
                placeholder="EX: AA123456789BR"
                value={trackingCodeInput}
                onChange={(e) => setTrackingCodeInput(e.target.value.toUpperCase())}
                className="flex-grow bg-suopes-black border border-suopes-gray h-12 px-4 text-sm font-mono focus:border-suopes-gold outline-none text-white uppercase placeholder:text-suopes-muted/30"
              />
              <button 
                onClick={() => trackPackage(trackingCodeInput)}
                disabled={trackingLoading || !trackingCodeInput}
                className="btn-suopes px-8 h-12 disabled:opacity-50"
              >
                {trackingLoading ? "LOCALIZANDO..." : "RASTREAR AGORA"}
              </button>
            </div>

            <AnimatePresence>
              {trackingResult && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-8 border-t border-suopes-gray pt-6 overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono text-suopes-gold uppercase tracking-[0.2em]">CÓDIGO: {trackingResult.codigo} / ÚLTIMA ATUALIZAÇÃO: {trackingResult.ultimo}</span>
                    <button onClick={() => setTrackingResult(null)} className="text-suopes-muted hover:text-white transition-colors flex items-center gap-1 text-[10px] font-mono">
                      [ FECHAR ] <X size={14} />
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {trackingResult.eventos?.map((evento: any, i: number) => (
                      <div key={i} className="flex gap-4 relative">
                        {i < trackingResult.eventos.length - 1 && (
                          <div className="absolute left-2.5 top-5 w-[1px] h-full bg-suopes-gray/30" />
                        )}
                        <div className={`w-5 h-5 rounded-full flex-shrink-0 mt-1 z-10 flex items-center justify-center ${i === 0 ? 'bg-suopes-gold text-suopes-black' : 'bg-suopes-gray/30'}`}>
                          <div className="w-1.5 h-1.5 rounded-full bg-current" />
                        </div>
                        <div className="pb-6">
                          <p className={`text-xs font-bold uppercase tracking-tight mb-1 ${i === 0 ? 'text-suopes-gold' : 'text-white'}`}>{evento.status}</p>
                          <p className="text-[10px] text-suopes-muted font-mono">{evento.data} às {evento.hora}</p>
                          {evento.local && <p className="text-[10px] text-suopes-muted font-mono mt-1 flex items-center gap-1"><MapPin size={10} /> {evento.local}</p>}
                          {evento.subStatus && evento.subStatus.map((sub: string, sidx: number) => (
                            <p key={sidx} className="text-[10px] text-suopes-muted italic mt-1">{sub}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {loading ? (
            <div className="text-center text-suopes-gold py-10 font-mono tracking-widest text-xs">
              Sincronizando banco de dados...
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center text-suopes-muted py-10 font-mono tracking-widest text-xs border border-suopes-gray p-8">
              NENHUM HISTÓRICO LOCALIZADO NO SEU REGISTRO
            </div>
          ) : (
            orders.map((order) => {
              const OrderStatusConfig = statusConfig[order.status] || statusConfig.processando;
              const StatusIcon = OrderStatusConfig.icon;
              return (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-suopes-gray/10 border border-suopes-gray p-6 md:p-8"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-6 border-b border-suopes-gray/50">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">Pedido</span>
                    <h3 className="text-lg font-black text-white">{order.id}</h3>
                    <p className="text-[10px] font-mono text-suopes-muted">{order.date}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 md:gap-8">
                    <div className="text-right min-w-[100px]">
                      <span className="text-[9px] font-mono text-suopes-muted uppercase tracking-widest block mb-1">Entrega</span>
                      <div className={`flex items-center justify-end gap-2 text-[10px] font-bold ${OrderStatusConfig.color}`}>
                        <StatusIcon size={14} />
                        {OrderStatusConfig.label}
                      </div>
                    </div>

                    <div className="text-right min-w-[120px]">
                      <span className="text-[9px] font-mono text-suopes-muted uppercase tracking-widest block mb-1">Pagamento</span>
                      {order.paymentStatus === "approved" ? (
                        <div className="flex items-center justify-end gap-1.5 text-green-400 text-[10px] font-bold">
                          <CheckCircle2 size={14} />
                          PAGO
                        </div>
                      ) : order.paymentStatus === "rejected" || order.paymentStatus === "cancelled" ? (
                        <div className="flex items-center justify-end gap-1.5 text-suopes-red text-[10px] font-bold">
                          <X size={14} />
                          NEGADO
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5 text-suopes-gold text-[10px] font-bold">
                          <Clock size={14} />
                          AGUARDANDO
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-mono text-suopes-muted uppercase tracking-widest block mb-1">Total</span>
                      <span className="text-lg font-black text-suopes-gold uppercase">R$ {Number(order.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-16 h-20 bg-suopes-gray/20 border border-suopes-gray overflow-hidden flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-grow">
                        <h4 className="text-sm font-bold text-white uppercase">{item.name}</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-[10px] font-mono text-suopes-muted">QTD: {item.quantity}</span>
                          {item.color && (
                            <span className="text-[10px] font-mono text-suopes-muted uppercase">COR: {item.color}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono text-white">R$ {Number(item.price).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {order.trackingCode && (
                  <div className="mt-8 p-4 bg-suopes-black border border-suopes-gold/20 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                      <MapPin size={18} className="text-suopes-gold" />
                      <div>
                        <span className="text-[10px] font-mono text-suopes-muted uppercase block">Código de Rastreio</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-mono">{order.trackingCode}</span>
                          {order.carrier && <span className="text-[8px] border border-suopes-gray px-1 text-suopes-muted font-mono uppercase">{order.carrier}</span>}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setTrackingCodeInput(order.trackingCode!);
                        trackPackage(order.trackingCode!);
                        document.getElementById('rastreio')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="text-[10px] font-mono text-suopes-gold hover:text-white transition-colors flex items-center gap-2 uppercase tracking-widest"
                    >
                      Ver Status Real <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </motion.div>
              );
            })
          )}
        </div>

        <div className="mt-16 text-center">
          <p className="text-[10px] font-mono text-suopes-muted mb-6 uppercase tracking-[0.2em]">Precisa de suporte tático com seu pedido?</p>
          <button className="btn-outline px-8 h-12">CONTATAR LOGÍSTICA</button>
        </div>
      </div>
    </div>
  );
}

