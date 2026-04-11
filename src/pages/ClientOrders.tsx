import { motion } from "motion/react";
import { Package, Truck, CheckCircle2, Clock, MapPin, ChevronRight, ShoppingBag, X } from "lucide-react";
import { User } from "../types";
import { Link } from "react-router-dom";

interface Order {
  id: string;
  date: string;
  status: "processando" | "enviado" | "entregue" | "cancelado";
  total: number;
  items: {
    name: string;
    quantity: number;
    price: number;
    image: string;
    color?: string;
  }[];
  trackingCode?: string;
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

  useEffect(() => {
    if (user) {
      fetch(`/api/orders?userId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          setOrders(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Erro ao carregar pedidos", err);
          setLoading(false);
        });
    }
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

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest block mb-1">Status</span>
                      <div className={`flex items-center gap-2 text-xs font-bold ${OrderStatusConfig.color}`}>
                        <StatusIcon size={16} />
                        {OrderStatusConfig.label}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest block mb-1">Total</span>
                      <span className="text-lg font-black text-suopes-gold">R$ {Number(order.total).toFixed(2)}</span>
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
                        <span className="text-xs font-bold text-white font-mono">{order.trackingCode}</span>
                      </div>
                    </div>
                    <button className="text-[10px] font-mono text-suopes-gold hover:text-white transition-colors flex items-center gap-2 uppercase tracking-widest">
                      Rastrear Objeto <ChevronRight size={14} />
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

