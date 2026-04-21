import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { Search, X, Clock, ArrowRight, Flame } from "lucide-react";
import { Product } from "../types";

interface SmartSearchProps {
  products: Product[];
  onSearch: (query: string) => void;
  onCategorySelect?: (category: string) => void;
}

// Fuzzy match: tolerante a erros de digitação
function fuzzyMatch(text: string, query: string): { match: boolean; score: number } {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  
  // Exact match = highest score
  if (t.includes(q)) return { match: true, score: 100 };
  
  // Word-start match
  const words = t.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(q)) return { match: true, score: 90 };
  }
  
  // Fuzzy: allow 1 character difference for every 3 chars typed
  const allowedErrors = Math.floor(q.length / 3);
  let errors = 0;
  let ti = 0;
  for (let qi = 0; qi < q.length && ti < t.length; qi++) {
    if (t[ti] === q[qi]) {
      ti++;
    } else {
      errors++;
      // Try skipping a char in text
      if (ti + 1 < t.length && t[ti + 1] === q[qi]) {
        ti += 2;
      } else {
        ti++;
      }
    }
    if (errors > allowedErrors) return { match: false, score: 0 };
  }
  
  const score = Math.max(0, 70 - errors * 15);
  return { match: errors <= allowedErrors, score };
}

function searchProducts(products: Product[], query: string): (Product & { score: number })[] {
  if (!query || query.length < 2) return [];
  
  const results: (Product & { score: number })[] = [];
  
  for (const product of products) {
    if (!product) continue;
    const name = product.name || "";
    const description = product.description || "";
    const category = product.category || "";
    const sku = product.sku || "";
    
    const nameMatch = fuzzyMatch(name, query);
    const descMatch = fuzzyMatch(description, query);
    const catMatch = fuzzyMatch(category, query);
    const skuMatch = fuzzyMatch(sku, query);
    
    const bestScore = Math.max(
      nameMatch.score * 1.5, // Name matches are more valuable
      descMatch.score,
      catMatch.score * 1.2,
      skuMatch.score
    );
    
    if (nameMatch.match || descMatch.match || catMatch.match || skuMatch.match) {
      results.push({ ...product, score: bestScore });
    }
  }
  
  return results.sort((a, b) => b.score - a.score).slice(0, 6);
}

const RECENT_KEY = "suopes_recent_searches";

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function addRecentSearch(query: string) {
  const recent = getRecentSearches().filter(s => s !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 5)));
}

export function SmartSearch({ products, onSearch, onCategorySelect }: SmartSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const results = searchProducts(products, query);
  const showRecent = isOpen && query.length < 2 && recentSearches.length > 0;
  const showResults = isOpen && query.length >= 2;
  
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = showResults ? results : (showRecent ? recentSearches.map((s, i) => ({ id: `recent-${i}` })) : []);
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showResults && selectedIndex >= 0 && selectedIndex < results.length) {
        // Navigate to product
        addRecentSearch(query);
        window.location.href = `/product/${results[selectedIndex].id}`;
      } else if (showRecent && selectedIndex >= 0 && selectedIndex < recentSearches.length) {
        const selected = recentSearches[selectedIndex];
        setQuery(selected);
        onSearch(selected);
      } else if (query.length >= 2) {
        addRecentSearch(query);
        onSearch(query);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
      onSearch("");
      inputRef.current?.blur();
    }
  }, [showResults, showRecent, results, recentSearches, selectedIndex, query, onSearch]);

  const handleChange = (value: string) => {
    setQuery(value);
    setSelectedIndex(-1);
    onSearch(value);
    if (value.length > 0) setIsOpen(true);
  };

  // Highlight matched text
  function highlight(text: string, q: string) {
    if (!q || q.length < 2) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-suopes-gold font-bold">{text.slice(idx, idx + q.length)}</span>
        {text.slice(idx + q.length)}
      </>
    );
  }

  // Popular categories for quick search
  const quickTags = ["COLETES", "BONÉS", "CINTOS", "BANDOLEIRAS", "MOCHILAS"];

  return (
    <div ref={containerRef} className="relative w-full md:max-w-md">
      {/* Search Input */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className={`transition-colors ${isOpen ? "text-suopes-gold" : "text-suopes-muted group-focus-within:text-suopes-gold"}`} />
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="PROCURAR EQUIPAMENTO..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full bg-suopes-gray/30 border border-suopes-gray py-3 pl-10 pr-16 text-xs font-mono tracking-widest text-suopes-white placeholder:text-suopes-muted/50 focus:outline-none focus:border-suopes-gold focus:ring-1 focus:ring-suopes-gold transition-all"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
          {query && (
            <button 
              onClick={() => { setQuery(""); onSearch(""); setSelectedIndex(-1); }}
              className="text-suopes-muted hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <span className="text-[8px] font-mono border border-suopes-muted/40 px-1 rounded text-suopes-muted/40 pointer-events-none">/</span>
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {(showResults || showRecent) && (
          <motion.div
            initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1 bg-suopes-black/95 backdrop-blur-xl border border-suopes-gray shadow-2xl shadow-black/50 z-50 max-h-[420px] overflow-y-auto origin-top"
          >
            {/* Recent Searches */}
            {showRecent && (
              <div className="p-3">
                <p className="text-[8px] font-mono text-suopes-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Clock size={10} /> BUSCAS RECENTES
                </p>
                {recentSearches.map((search, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuery(search); onSearch(search); addRecentSearch(search); }}
                    className={`w-full text-left px-3 py-2 text-xs font-mono tracking-widest flex items-center gap-3 transition-all ${
                      selectedIndex === i ? "bg-suopes-gold/10 text-suopes-gold" : "text-suopes-muted hover:text-white hover:bg-suopes-gray/20"
                    }`}
                  >
                    <Clock size={12} className="opacity-40 shrink-0" />
                    {search}
                  </button>
                ))}
                <div className="border-t border-suopes-gray/30 mt-3 pt-3">
                  <p className="text-[8px] font-mono text-suopes-muted uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Flame size={10} className="text-suopes-red" /> CATEGORIAS POPULARES
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {quickTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => { 
                          if (onCategorySelect) onCategorySelect(tag);
                          setIsOpen(false);
                        }}
                        className="px-2 py-1 border border-suopes-gray/40 text-[9px] font-mono tracking-widest text-suopes-muted hover:border-suopes-gold hover:text-suopes-gold transition-all"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Search Results */}
            {showResults && (
              <div>
                {results.length > 0 ? (
                  <>
                    <div className="px-3 pt-3 pb-1">
                      <p className="text-[8px] font-mono text-suopes-muted uppercase tracking-widest">
                        {results.length} RESULTADO{results.length !== 1 ? "S" : ""} ENCONTRADO{results.length !== 1 ? "S" : ""}
                      </p>
                    </div>
                    {results.map((product, i) => (
                      <Link
                        key={product.id}
                        to={`/product/${product.id}`}
                        onClick={() => { addRecentSearch(query); setIsOpen(false); }}
                        className={`flex items-center gap-3 px-3 py-2.5 transition-all ${
                          selectedIndex === i ? "bg-suopes-gold/10" : "hover:bg-suopes-gray/20"
                        }`}
                      >
                        {/* Product Thumb */}
                        <div className="w-12 h-12 bg-suopes-gray flex-shrink-0 overflow-hidden">
                          <img 
                            src={product.image} 
                            alt={product.name || ""} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        {/* Product Info */}
                        <div className="flex-grow min-w-0">
                          <p className="text-xs font-bold uppercase truncate">
                            {highlight(product.name || "S/N", query)}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-mono text-suopes-gold">
                              R$ {Number(product.price || 0).toFixed(2)}
                            </span>
                            <span className="text-[8px] font-mono text-suopes-muted border border-suopes-gray/40 px-1">
                              {product.category || "GERAL"}
                            </span>
                            {!product.inStock && (
                              <span className="text-[8px] font-mono text-suopes-red">ESGOTADO</span>
                            )}
                          </div>
                        </div>
                        <ArrowRight size={14} className={`shrink-0 transition-colors ${
                          selectedIndex === i ? "text-suopes-gold" : "text-suopes-muted"
                        }`} />
                      </Link>
                    ))}
                    <div className="border-t border-suopes-gray/30 px-3 py-2">
                      <button
                        onClick={() => { addRecentSearch(query); setIsOpen(false); }}
                        className="w-full text-center text-[9px] font-mono tracking-widest text-suopes-muted hover:text-suopes-gold transition-colors py-1"
                      >
                        VER TODOS OS RESULTADOS NO CATÁLOGO ↓
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-xs font-mono text-suopes-muted tracking-widest mb-3">
                      NENHUM EQUIPAMENTO ENCONTRADO
                    </p>
                    <p className="text-[9px] font-mono text-suopes-muted/60">
                      Tente buscar por: colete, mochila, jaqueta...
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                      {quickTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => { handleChange(tag); }}
                          className="px-2 py-1 border border-suopes-gray/40 text-[9px] font-mono tracking-widest text-suopes-muted hover:border-suopes-gold hover:text-suopes-gold transition-all"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
