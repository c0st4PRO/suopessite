import { Link } from "react-router-dom";
import { Product } from "../types";
import { motion } from "motion/react";
import { Plus } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onAddToCart: () => void;
  key?: string | number;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group"
    >
      <Link to={`/product/${product.id}`} className="block relative aspect-[4/5] overflow-hidden bg-suopes-gray mb-4">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4 flex flex-wrap gap-1">
          {(product.category || "").split(",").map(c => c.trim()).filter(Boolean).map((cat, i) => (
            <span key={i} className="bg-suopes-black/80 backdrop-blur-sm px-2 py-1 text-[8px] font-mono tracking-widest border border-suopes-gold text-suopes-gold">
              {cat}
            </span>
          ))}
        </div>
        {!product.inStock && (
          <div className="absolute top-4 right-4 bg-suopes-red px-2 py-1 text-[8px] font-mono tracking-widest text-white border border-suopes-red/50">
            ESGOTADO
          </div>
        )}
        <div className="absolute inset-0 bg-suopes-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {product.inStock ? (
            <button 
              onClick={(e) => {
                e.preventDefault();
                onAddToCart();
              }}
              className="btn-suopes scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 flex items-center gap-2"
            >
              <Plus size={16} /> ADICIONAR AO CARRINHO
            </button>
          ) : (
            <span 
              className="px-4 py-3 border border-suopes-red text-suopes-red bg-suopes-red/10 scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 font-mono text-[10px] tracking-widest uppercase cursor-pointer text-center"
            >
              AVISE-ME QUANDO CHEGAR
            </span>
          )}
        </div>
      </Link>
      
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0 pr-2">
          <Link to={`/product/${product.id}`} className="block text-sm font-bold hover:text-suopes-gold transition-colors truncate uppercase">
            {product.name || "EQUIPAMENTO SEM NOME"}
          </Link>
          <p className="text-[10px] font-mono text-suopes-muted mt-1 truncate">{product.sku || "SKU-PENDENTE"}</p>
        </div>
        <span className="text-sm font-mono text-suopes-gold whitespace-nowrap">
          R$ {typeof product.price === 'number' ? product.price.toFixed(2) : Number(product.price || 0).toFixed(2)}
        </span>
      </div>
    </motion.div>
  );
}
