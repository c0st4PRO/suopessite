import { motion, AnimatePresence } from "motion/react";
import { X, Trash2, Minus, Plus, ArrowRight } from "lucide-react";
import { CartItem } from "../types";
import { useNavigate } from "react-router-dom";

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemove: (id: string, color?: string, size?: string) => void;
  onUpdateQuantity: (id: string, delta: number, color?: string, size?: string) => void;
}

export function Cart({ isOpen, onClose, items, onRemove, onUpdateQuantity }: CartProps) {
  const navigate = useNavigate();
  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-tactical-black/80 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-suopes-black border-l border-suopes-gray z-50 flex flex-col"
          >
            <div className="p-6 border-b border-suopes-gray flex justify-between items-center">
              <h2 className="text-xl font-black">SEU CARRINHO</h2>
              <button onClick={onClose} className="p-2 hover:bg-suopes-gray transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <p className="text-suopes-muted font-mono text-sm mb-6">CARRINHO_VAZIO</p>
                  <button onClick={onClose} className="btn-outline text-xs">CONTINUAR COMPRANDO</button>
                </div>
              ) : (
                <div className="space-y-8">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-24 h-32 bg-suopes-gray flex-shrink-0">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="flex-grow flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <h3 className="text-sm font-bold uppercase">{item.name}</h3>
                            <button 
                              onClick={() => onRemove(item.id, item.selectedColor, item.selectedSize)}
                              className="text-suopes-muted hover:text-suopes-red transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <p className="text-[10px] font-mono text-suopes-muted mt-1">{item.sku}</p>
                          {item.selectedColor && (
                            <p className="text-[10px] font-mono text-suopes-gold mt-1 tracking-widest">COR: {item.selectedColor}</p>
                          )}
                          {item.selectedSize && (
                            <p className="text-[10px] font-mono text-suopes-gold mt-1 tracking-widest">TAMANHO: {item.selectedSize}</p>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-end">
                          <div className="flex items-center border border-suopes-gray">
                            <button 
                              onClick={() => onUpdateQuantity(item.id, -1, item.selectedColor, item.selectedSize)}
                              className="p-1 hover:bg-suopes-gray transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="px-3 text-xs font-mono">{item.quantity}</span>
                            <button 
                              onClick={() => onUpdateQuantity(item.id, 1, item.selectedColor, item.selectedSize)}
                              className="p-1 hover:bg-suopes-gray transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <span className="text-sm font-mono text-suopes-gold">R$ {(Number(item.price || 0) * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 border-t border-suopes-gray bg-suopes-gray/10">
                <div className="pt-6 border-t border-suopes-gray space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-suopes-muted uppercase tracking-widest">Subtotal Estimado</span>
                    <span className="text-xl font-mono text-suopes-gold uppercase tracking-tighter">R$ {Number(total || 0).toFixed(2)}</span>
                  </div>
                <button 
                  onClick={() => {
                    onClose();
                    navigate("/checkout");
                  }}
                  className="w-full btn-suopes flex items-center justify-center gap-2"
                >
                  FINALIZAR COMPRA <ArrowRight size={18} />
                </button>
                <p className="text-[10px] text-center text-suopes-muted mt-4 font-mono">
                  FRETE E TAXAS CALCULADOS NO CHECKOUT
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
