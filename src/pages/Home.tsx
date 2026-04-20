import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { ProductCard } from "../components/ProductCard";
import { SmartSearch } from "../components/SmartSearch";
import { Product } from "../types";
import { ChevronRight, Shield, Target, Zap, SlidersHorizontal } from "lucide-react";

interface HomeProps {
  onAddToCart: (product: Product) => void;
}

export function Home({ onAddToCart }: HomeProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [booting, setBooting] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("TODOS");
  
  // New Filters
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [sortPrice, setSortPrice] = useState(""); // "" | "asc" | "desc"
  const [stockFilter, setStockFilter] = useState(""); // "" | "mais" | "menos" | "esgotados" | "presale"

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetch("/api/products")
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      });
  }, []);

  const [currentSlide, setCurrentSlide] = useState(0);
  const heroImages = [
    "https://i.ibb.co/Gf4MZ4dy/54197843104-2961547df3-k.jpg",
    "https://i.ibb.co/5hsRq1JN/53816135914-32bb240ec9-k.jpg",
    "https://i.ibb.co/WNxjMPw0/53053166273-ddf136d521-k.jpg",
    "https://i.ibb.co/sv6rStXP/53816243400-40874e46f9-k.jpg",
    "https://i.ibb.co/jPXdh3Mm/54367525929-786d15a8ac-k.jpg"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const categories = [
    "TODOS", 
    "COLETES", 
    "MOCHILAS", 
    "JAQUETAS", 
    "CAMISAS", 
    "PATCHES", 
    "HEADWEAR", 
    "ACESSÓRIOS",
    "LINHA ESPECIAL",
    "PRÉ-VENDA"
  ];

  const allColors = Array.from(new Set(products.flatMap(p => p.colors?.map(c => c.name) || []))).filter(Boolean) as string[];
  const allSizes = Array.from(new Set(products.flatMap(p => p.sizes || []))).filter(Boolean) as string[];

  let filteredProducts = products.filter(p => {
    if (!p) return false;
    const productCategories = (p.category || "").split(",").map(c => c.trim()).filter(Boolean);
    const name = p.name || "S/N";
    const description = p.description || "";

    let matchesCategory = selectedCategory === "TODOS" || productCategories.includes(selectedCategory);
    
    // Tratamento especial para a "categoria" virtual Pré-Venda
    if (selectedCategory === "PRÉ-VENDA") {
      matchesCategory = p.isPresale === true;
    }

    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesColor = selectedColor === "" || (p.colors && p.colors.some(c => c.name === selectedColor));
    const matchesSize = selectedSize === "" || (p.sizes && p.sizes.includes(selectedSize));

    let matchesStock = true;
    if (stockFilter === "esgotados") {
      matchesStock = !p.inStock;
    } else if (stockFilter === "mais" || stockFilter === "menos") {
      // both means it must be in stock
      matchesStock = p.inStock;
    } else if (stockFilter === "presale") {
      matchesStock = p.isPresale === true;
    }

    return matchesCategory && matchesSearch && matchesColor && matchesSize && matchesStock;
  });

  // Sort logic
  filteredProducts = filteredProducts.sort((a, b) => {
    if (sortPrice === "asc") return (Number(a.price) || 0) - (Number(b.price) || 0);
    if (sortPrice === "desc") return (Number(b.price) || 0) - (Number(a.price) || 0);
    
    if (stockFilter === "mais") return (b.stockQuantity || 0) - (a.stockQuantity || 0);
    if (stockFilter === "menos") return (a.stockQuantity || 0) - (b.stockQuantity || 0);

    return 0;
  });
  const [showFilters, setShowFilters] = useState(false);

  if (booting) {
    return (
      <div className="fixed inset-0 bg-suopes-black z-[100] flex flex-col items-center justify-center font-mono text-[10px] tracking-widest text-suopes-muted">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-1"
        >
          <p>INICIALIZANDO_SISTEMA_SUOPES...</p>
          <p>CARREGANDO_EQUIPAMENTO_HQ...</p>
          <p>ESTABELECENDO_CONEXAO_SEGURA...</p>
          <p>STATUS: <span className="text-suopes-gold">[OPERACIONAL]</span></p>
          <div className="w-48 h-[1px] bg-suopes-gray mt-4 relative overflow-hidden">
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-suopes-gold w-1/3"
            />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="wait">
            <motion.img 
              key={currentSlide}
              src={heroImages[currentSlide]} 
              alt={`Hero ${currentSlide + 1}`}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 0.4, scale: 1.05 }}
              exit={{ opacity: 0, scale: 1 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-suopes-black via-transparent to-transparent" />
        </div>
        
        <div className="relative z-10 text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="font-mono text-xs tracking-[0.3em] text-suopes-gold mb-4 block">
              FUNDADA EM 2024 / SUOPES TACTICAL
            </span>
            <h1 className="text-6xl md:text-8xl font-black mb-8 leading-none">
              PRONTO PARA<br /><span className="text-suopes-red">A MISSÃO</span>
            </h1>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button 
                onClick={() => {
                  const catalog = document.getElementById('catalogo');
                  catalog?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn-suopes flex items-center justify-center gap-2"
              >
                VER PRODUTOS <ChevronRight size={16} />
              </button>
              <Link to="/galeria" className="btn-outline flex items-center justify-center">
                VER GALERIA
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Carousel Indicators */}
        <div className="absolute bottom-10 right-10 flex gap-2 z-20">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-12 h-[2px] transition-all duration-300 ${
                currentSlide === index ? "bg-suopes-gold" : "bg-suopes-gray"
              }`}
            />
          ))}
        </div>

        {/* Technical Accents */}
        <div className="absolute bottom-10 left-10 hidden lg:block">
          <div className="font-mono text-[10px] text-suopes-muted space-y-1">
            <p>LAT: 23.5505° S</p>
            <p>LNG: 46.6333° W</p>
            <p>STATUS: OPERACIONAL</p>
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <section className="border-y border-suopes-gray py-8 bg-suopes-gray/20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-suopes-gold" />
            <span className="text-[10px] font-mono tracking-widest">TESTADO EM CAMPO</span>
          </div>
          <div className="flex items-center gap-3">
            <Target size={20} className="text-suopes-red" />
            <span className="text-[10px] font-mono tracking-widest">DESIGN DE PRECISÃO</span>
          </div>
          <div className="flex items-center gap-3">
            <Zap size={20} className="text-suopes-gold" />
            <span className="text-[10px] font-mono tracking-widest">ENVIO RÁPIDO</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border border-suopes-gold rounded-full flex items-center justify-center text-[8px] font-mono text-suopes-gold">BR</div>
            <span className="text-[10px] font-mono tracking-widest">ENVIO NACIONAL</span>
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section id="catalogo" className="max-w-7xl mx-auto px-6 py-20">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 gap-8">
          <div className="w-full lg:w-auto">
            <h2 className="text-4xl font-black mb-2 tracking-tighter">CATÁLOGO</h2>
            <p className="text-suopes-muted text-sm font-mono flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-suopes-gold" /> 
              SISTEMA_DE_FILTRAGEM / v2.0
            </p>
          </div>

          <div className="flex flex-col md:flex-row w-full lg:w-3/4 gap-4 items-center">
            {/* Smart Search */}
            <SmartSearch 
              products={products} 
              onSearch={setSearchQuery}
              onCategorySelect={setSelectedCategory}
            />

            {/* Category Filter Sliders */}
            <div className="flex flex-wrap gap-2 w-full">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-2 text-[10px] font-mono tracking-widest border transition-all duration-300 relative overflow-hidden group ${
                    selectedCategory === cat
                      ? "bg-suopes-gold border-suopes-gold text-suopes-black"
                      : "border-suopes-gray text-suopes-muted hover:border-suopes-gold hover:text-suopes-gold"
                  }`}
                >
                  {selectedCategory === cat && (
                    <motion.div 
                      layoutId="activeCategory"
                      className="absolute inset-0 bg-suopes-gold -z-10"
                    />
                  )}
                  <span className="relative z-10">{cat}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full lg:w-1/4 flex flex-col gap-4">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-[10px] font-mono tracking-[0.3em] text-suopes-muted hover:text-suopes-gold transition-colors group mb-2"
            >
              <SlidersHorizontal size={12} className={showFilters ? "text-suopes-gold" : "text-suopes-muted group-hover:text-suopes-gold"} />
              {showFilters ? "[ OCULTAR_FILTROS ]" : "[ FILTRAGEM_AVANÇADA ]"}
            </button>

            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, overflow: "hidden" }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="bg-suopes-gray/10 border border-suopes-gray p-6 mb-4"
                >
                  <h3 className="text-xl font-bold mb-4 border-b border-suopes-gray pb-2 uppercase text-[14px] tracking-tight">Filtros Avançados</h3>
                  
                  {/* Preço */}
                  <div className="mb-6">
                    <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest block mb-1">ORDENAR POR PREÇO</label>
                    <select 
                      value={sortPrice} 
                      onChange={(e) => setSortPrice(e.target.value)}
                      className="w-full bg-suopes-black border border-suopes-gray p-2 text-sm text-suopes-white outline-none focus:border-suopes-gold font-mono"
                    >
                      <option value="">Padrão</option>
                      <option value="asc">Menor ao Maior</option>
                      <option value="desc">Maior ao Menor</option>
                    </select>
                  </div>

                  {/* Estoque */}
                  <div className="mb-6">
                    <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest block mb-1">SITUAÇÃO DE ESTOQUE</label>
                    <select 
                      value={stockFilter} 
                      onChange={(e) => setStockFilter(e.target.value)}
                      className="w-full bg-suopes-black border border-suopes-gray p-2 text-sm text-suopes-white outline-none focus:border-suopes-gold font-mono"
                    >
                      <option value="">Todos</option>
                      <option value="mais">Mais Estoque</option>
                      <option value="menos">Menos Estoque</option>
                      <option value="esgotados">Esgotados</option>
                      <option value="presale">Pré-Venda</option>
                    </select>
                  </div>

                  {/* Cor */}
                  {allColors.length > 0 && (
                    <div className="mb-6">
                      <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest block mb-1">COR</label>
                      <select 
                        value={selectedColor} 
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="w-full bg-suopes-black border border-suopes-gray p-2 text-sm text-suopes-white outline-none focus:border-suopes-gold font-mono"
                      >
                        <option value="">Qualquer Cor</option>
                        {allColors.map(color => (
                          <option key={color} value={color}>{color.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Tamanho */}
                  {allSizes.length > 0 && (
                    <div className="mb-6">
                      <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest block mb-1">TAMANHO</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setSelectedSize("")}
                          className={`px-3 py-1 text-xs font-mono tracking-widest border transition-all ${
                            selectedSize === "" ? "bg-suopes-gold border-suopes-gold text-suopes-black" : "border-suopes-gray text-suopes-muted hover:border-suopes-gold"
                          }`}
                        >
                          TD
                        </button>
                        {allSizes.map(size => (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`px-3 py-1 text-xs font-mono tracking-widest border transition-all ${
                              selectedSize === size ? "bg-suopes-gold border-suopes-gold text-suopes-black" : "border-suopes-gray text-suopes-muted hover:border-suopes-gold"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reset Button */}
                  {(sortPrice || stockFilter || selectedColor || selectedSize) && (
                    <button 
                      onClick={() => {
                        setSortPrice("");
                        setStockFilter("");
                        setSelectedColor("");
                        setSelectedSize("");
                      }}
                      className="w-full py-2 bg-suopes-red/10 border border-suopes-red/30 text-suopes-red text-[10px] font-mono uppercase tracking-[0.2em] hover:bg-suopes-red hover:text-white transition-all mt-2"
                    >
                      LIMPAR_FILTROS
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Grid de Produtos */}
          <div className="w-full lg:w-3/4">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-[4/5] bg-suopes-gray animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onAddToCart={() => onAddToCart(product)} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-suopes-muted font-mono border border-suopes-gray bg-suopes-gray/5">
                NENHUM EQUIPAMENTO ENCONTRADO COM ESTES FILTROS.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="bg-suopes-gray/10 py-32 px-6 border-y border-suopes-gray">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl mb-8 text-suopes-gold">A MISSÃO</h2>
          <p className="text-xl text-suopes-muted leading-relaxed italic font-serif">
            "SUOPES é uma marca de estilo de vida nascida da necessidade de equipamentos duráveis e de alta qualidade para aqueles que operam nos ambientes mais exigentes. Não vendemos apenas equipamentos; fornecemos as ferramentas para o operador moderno."
          </p>
          <div className="mt-12 flex justify-center gap-4">
            <div className="w-12 h-[1px] bg-suopes-gold self-center" />
            <span className="font-mono text-xs tracking-widest text-suopes-gold">SUO_HQ</span>
            <div className="w-12 h-[1px] bg-suopes-gold self-center" />
          </div>
        </div>
      </section>
    </div>
  );
}
