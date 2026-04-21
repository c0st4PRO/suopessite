import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Product } from "../types";
import { motion } from "motion/react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onAddToCart: () => void;
  key?: string | number;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const images = product.images && product.images.length > 1
    ? product.images.filter(Boolean)
    : [product.image];
  
  const hasMultipleImages = images.length > 1;
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Touch/swipe support
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const goToNext = useCallback((e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setCurrentIndex(prev => (prev + 1) % images.length);
  }, [images.length]);

  const goToPrev = useCallback((e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  }, [goToNext, goToPrev]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group"
    >
      <div 
        ref={containerRef}
        className="block relative aspect-[4/5] overflow-hidden bg-suopes-gray mb-4"
        onTouchStart={hasMultipleImages ? handleTouchStart : undefined}
        onTouchMove={hasMultipleImages ? handleTouchMove : undefined}
        onTouchEnd={hasMultipleImages ? handleTouchEnd : undefined}
      >
        <Link to={`/product/${product.id}`} className="block w-full h-full">
          {/* Images Stack */}
          {images.map((img, i) => (
            <img 
              key={i}
              src={img} 
              alt={`${product.name} ${i + 1}`}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                i === currentIndex 
                  ? "opacity-100 scale-100" 
                  : "opacity-0 scale-105"
              }`}
              referrerPolicy="no-referrer"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          ))}

          {/* Category Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-1 z-10">
            {(product.category || "").split(",").map(c => c.trim()).filter(Boolean)
              .filter(cat => ["COLETES", "MOCHILAS", "JAQUETAS", "BONÉS", "CINTOS", "BANDOLEIRAS", "PORTA CARREGADORES", "PRÉ-VENDA"].includes(cat))
              .map((cat, i) => (
              <span key={i} className="bg-suopes-black/80 backdrop-blur-sm px-2 py-1 text-[8px] font-mono tracking-widest border border-suopes-gold text-suopes-gold shadow-lg shadow-black/20">
                {cat}
              </span>
            ))}
          </div>

          {/* Stock/Presale Badge */}
          {product.isPresale ? (
            <div className="absolute top-4 right-4 bg-suopes-gold px-2 py-1 text-[8px] font-mono tracking-widest text-suopes-black font-bold z-10 shadow-lg shadow-black/20">
              PRÉ-VENDA
            </div>
          ) : !product.inStock && (
            <div className="absolute top-4 right-4 bg-suopes-red px-2 py-1 text-[8px] font-mono tracking-widest text-white border border-suopes-red/50 z-10 shadow-lg shadow-black/20">
              ESGOTADO
            </div>
          )}

          {/* Floating Action Button - Bottom Right corner of image */}
          <div className="absolute bottom-4 right-4 z-40 pointer-events-auto">
            {product.inStock ? (
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddToCart();
                }}
                className="w-12 h-12 bg-suopes-gold text-suopes-black rounded-full flex items-center justify-center shadow-2xl shadow-black/50 scale-0 group-hover:scale-100 transition-all duration-300 hover:bg-white hover:scale-110 active:scale-95"
                title="Adicionar ao Carrinho"
              >
                <Plus size={24} />
              </button>
            ) : (
              <div className="w-12 h-12 bg-suopes-red text-white rounded-full flex items-center justify-center shadow-2xl shadow-black/50 scale-0 group-hover:scale-100 transition-all duration-300 opacity-80">
                <span className="text-[8px] font-bold leading-none text-center">OFF<br/>STOCK</span>
              </div>
            )}
          </div>
        </Link>

        {/* Navigation Arrows (Desktop) - Outside the Link to prevent navigation */}
        {hasMultipleImages && (
          <>
            <button
              onClick={goToPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 flex items-center justify-center bg-suopes-black/60 backdrop-blur-sm border border-suopes-gray/40 text-white/70 hover:text-white hover:border-suopes-gold hover:bg-suopes-black/80 transition-all opacity-0 group-hover:opacity-100"
              aria-label="Foto anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 flex items-center justify-center bg-suopes-black/60 backdrop-blur-sm border border-suopes-gray/40 text-white/70 hover:text-white hover:border-suopes-gold hover:bg-suopes-black/80 transition-all opacity-0 group-hover:opacity-100"
              aria-label="Próxima foto"
            >
              <ChevronRight size={14} />
            </button>

            {/* Dot Indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentIndex(i); }}
                  className={`transition-all duration-300 rounded-full ${
                    i === currentIndex 
                      ? "w-4 h-1.5 bg-suopes-gold" 
                      : "w-1.5 h-1.5 bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Foto ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      
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
