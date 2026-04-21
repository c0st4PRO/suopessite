import { useParams, useNavigate, Link } from "react-router-dom";
import { useState, useEffect, useRef, MouseEvent, FormEvent } from "react";
import { Product, ProductColor, User } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Shield, Truck, RotateCcw, Plus, Minus, Edit3, Save, X, Camera, Search, Trash2, Check, ChevronRight, AlertCircle } from "lucide-react";

interface ProductDetailProps {
  onAddToCart: (product: Product & { selectedColor?: string; selectedSize?: string }) => void;
  user: User | null;
}

export function ProductDetail({ onAddToCart, user }: ProductDetailProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Product | null>(null);
  const [imageEditIndex, setImageEditIndex] = useState<number | null>(null);
  const [colorEditIndex, setColorEditIndex] = useState<number | "new" | null>(null);
  const [tempImageUrl, setTempImageUrl] = useState("");
  const [tempColor, setTempColor] = useState<ProductColor>({ name: "", hex: "#000000", inStock: true, imageIndex: 0, sizeStock: {} });
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [showNotifyForm, setShowNotifyForm] = useState(false);
  const [notifyName, setNotifyName] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyPhone, setNotifyPhone] = useState("");
  const [notifySuccess, setNotifySuccess] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>("desc");
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  
  // Zoom state
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0, show: false });
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setQuantity(1);
    setSelectedSize("");
    setActiveImageIndex(0);
    setIsEditing(false);
    window.scrollTo(0, 0);
    
    fetch("/api/products")
      .then(res => res.json())
      .then(data => {
        setAllProducts(data);
        const found = data.find((p: Product) => p.id === id);
        if (found) {
          // Ensure images array and colors exist for editing
          const productWithDefaults = {
            ...found,
            images: found.images || [found.image, found.image, found.image, found.image],
            colors: found.colors || [],
            sizes: found.sizes || [],
            hasSizes: found.hasSizes || false,
            inStock: found.inStock !== undefined ? found.inStock : true,
            stockQuantity: found.stockQuantity !== undefined ? found.stockQuantity : 0
          };
          setProduct(productWithDefaults);
          setEditForm(productWithDefaults);
          if (productWithDefaults.colors.length > 0) {
            const firstAvailable = productWithDefaults.colors.find((c: ProductColor) => c.inStock);
            setSelectedColor(firstAvailable ? firstAvailable.name : productWithDefaults.colors[0].name);
          }
          if (productWithDefaults.hasSizes && productWithDefaults.sizes.length > 0) {
            setSelectedSize(productWithDefaults.sizes[0]);
          }
        }
        setLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    if (editForm) {
      try {
        const response = await fetch(`/api/products/${id}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            ...(user?.token ? { "Authorization": `Bearer ${user.token}` } : {})
          },
          body: JSON.stringify(editForm),
        });

        if (response.ok) {
          const updated = await response.json();
          setProduct(updated);
          setIsEditing(false);
          console.log("Product updated successfully:", updated);
        } else {
          try {
            const data = await response.json();
            alert(`Erro do Servidor: ${data.message || 'Desconhecido'}`);
          } catch(e) {
            alert("Erro ao salvar as alterações no servidor.");
          }
        }
      } catch (err) {
        console.error("Error updating product:", err);
        alert("Erro de conexão ao tentar salvar.");
      }
    }
  };

  const handleAddColor = () => {
    setTempColor({ name: "", hex: "#000000", inStock: true, imageIndex: 0, sizeStock: {} });
    setColorEditIndex("new");
  };

  const handleEditColor = (index: number) => {
    if (editForm && editForm.colors) {
      setTempColor({
        ...editForm.colors[index],
        sizeStock: editForm.colors[index].sizeStock || {}
      });
      setColorEditIndex(index);
    }
  };

  const confirmColorEdit = () => {
    if (editForm && tempColor.name && tempColor.hex) {
      const newColors = [...(editForm.colors || [])];
      if (colorEditIndex === "new") {
        newColors.push(tempColor);
      } else if (typeof colorEditIndex === "number") {
        newColors[colorEditIndex] = tempColor;
      }
      setEditForm({ ...editForm, colors: newColors });
      setColorEditIndex(null);
    }
  };

  const handleRemoveColor = (index: number) => {
    if (editForm && editForm.colors) {
      const newColors = editForm.colors.filter((_, i) => i !== index);
      setEditForm({ ...editForm, colors: newColors });
    }
  };

  const toggleColorStock = (index: number) => {
    if (editForm && editForm.colors) {
      const newColors = [...editForm.colors];
      newColors[index] = { ...newColors[index], inStock: !newColors[index].inStock };
      setEditForm({ ...editForm, colors: newColors });
    }
  };

  const handleImageChange = (index: number) => {
    setImageEditIndex(index);
    setTempImageUrl(editForm?.images?.[index] || "");
  };

  const confirmImageChange = () => {
    if (tempImageUrl && editForm && imageEditIndex !== null) {
      const newImages = [...(editForm.images || [])];
      newImages[imageEditIndex] = tempImageUrl;
      setEditForm({
        ...editForm,
        images: newImages,
        image: imageEditIndex === 0 ? tempImageUrl : editForm.image
      });
      setImageEditIndex(null);
      setTempImageUrl("");
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || isEditing) return;
    const { left, top, width, height } = imageRef.current.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    setZoomPos({ x, y, show: true });
  };

  const handleNotifySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!notifyName || !notifyEmail || !notifyPhone) return;

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: product?.id,
          sku: product?.sku,
          name: product?.name,
          email: notifyEmail,
          phone: notifyPhone,
          details: `COR: ${selectedColor || 'N/A'} | TAMANHO: ${selectedSize || 'N/A'} | Solicitante: ${notifyName}`
        }),
      });

      if (response.ok) {
        setNotifySuccess(true);
        setNotifyName("");
        setNotifyEmail("");
        setNotifyPhone("");
        setTimeout(() => {
          setNotifySuccess(false);
          setShowNotifyForm(false);
        }, 3000);
      }
    } catch (err) {
      console.error("Error submitting notification request:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-suopes-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-suopes-gold border-t-transparent rounded-full animate-spin" />
          <div className="text-suopes-gold font-mono text-[10px] animate-pulse uppercase tracking-[0.3em]">
            Sincronizando Protocolo...
          </div>
        </div>
      </div>
    );
  }

  if (!product || !editForm) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-suopes-black text-center px-6">
        <div className="w-20 h-20 border border-suopes-red flex items-center justify-center mb-8 rotate-45">
          <X size={40} className="text-suopes-red -rotate-45" />
        </div>
        <h2 className="text-2xl font-black mb-4 uppercase tracking-tighter">Ativo Não Encontrado</h2>
        <p className="text-suopes-muted font-mono text-[10px] mb-8 uppercase max-w-xs mx-auto leading-relaxed">
          O identificador do produto não corresponde a nenhum registro ativo no banco de dados da SUOPES.
        </p>
        <button 
          onClick={() => navigate("/produtos")} 
          className="btn-suopes px-8 h-12 text-[10px] font-mono tracking-widest"
        >
          VOLTAR PARA O ARSENAL
        </button>
      </div>
    );
  }

  const displayProduct = isEditing ? editForm : product;

  const currentColor = product.colors?.find(c => c.name === selectedColor);
  const isSizeInStock = currentColor?.sizeStock ? currentColor.sizeStock[selectedSize] !== false : true;
  const isOutOfStock = !product.inStock || (currentColor?.inStock === false) || (product.hasSizes && !isSizeInStock);

  const relatedProduct = allProducts.find(p => p.id !== id && p.category === product.category) || allProducts.find(p => p.id !== id);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex justify-between items-center mb-12">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-mono text-suopes-muted hover:text-suopes-gold transition-colors"
        >
          <ArrowLeft size={14} /> VOLTAR PARA PRODUTOS
        </button>

        {user?.role === "admin" && (
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className={`flex items-center gap-2 px-4 py-2 text-[10px] font-mono tracking-widest border transition-all ${
              isEditing 
                ? "bg-suopes-gold border-suopes-gold text-suopes-black hover:bg-suopes-red hover:border-suopes-red hover:text-suopes-white" 
                : "border-suopes-gray text-suopes-muted hover:border-suopes-gold hover:text-suopes-gold"
            }`}
          >
            {isEditing ? (
              <><Save size={14} /> SALVAR ALTERAÇÕES</>
            ) : (
              <><Edit3 size={14} /> MODO EDIÇÃO</>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Image Gallery */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div 
            ref={imageRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setZoomPos(prev => ({ ...prev, show: false }))}
            className="relative aspect-[4/5] bg-suopes-gray overflow-hidden border border-suopes-gray group cursor-crosshair"
          >
            <img 
              src={displayProduct.images?.[activeImageIndex] || displayProduct.image} 
              alt={displayProduct.name} 
              className="w-full h-full object-cover transition-all duration-700"
              referrerPolicy="no-referrer"
            />
            
            {/* Zoom Magnifier */}
            {!isEditing && zoomPos.show && (
              <div 
                className="absolute inset-0 pointer-events-none z-10 border-2 border-suopes-gold/30"
                style={{
                  backgroundImage: `url(${displayProduct.images?.[activeImageIndex] || displayProduct.image})`,
                  backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                  backgroundSize: '250%',
                  backgroundRepeat: 'no-repeat'
                }}
              />
            )}

            {isEditing && (
              <button 
                onClick={() => handleImageChange(activeImageIndex)}
                className="absolute inset-0 bg-suopes-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
              >
                <Camera size={32} className="text-suopes-gold mb-2" />
                <span className="text-[10px] font-mono text-suopes-gold uppercase tracking-widest">Trocar Imagem Selecionada</span>
              </button>
            )}

            {!isEditing && !zoomPos.show && (
              <div className="absolute bottom-4 right-4 bg-suopes-black/50 p-2 backdrop-blur-sm border border-suopes-gray opacity-0 group-hover:opacity-100 transition-opacity">
                <Search size={16} className="text-suopes-gold" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-4">
            {(displayProduct.images || [displayProduct.image, displayProduct.image, displayProduct.image, displayProduct.image]).map((img, i) => (
              <div 
                key={i} 
                onClick={() => setActiveImageIndex(i)}
                className={`relative aspect-square bg-suopes-gray cursor-pointer border transition-all duration-300 group overflow-hidden ${
                  activeImageIndex === i ? "border-suopes-gold" : "border-suopes-gray"
                }`}
              >
                <img 
                  src={img} 
                  alt={`Thumbnail ${i}`} 
                  className={`w-full h-full object-cover transition-opacity ${
                    activeImageIndex === i ? "opacity-100" : "opacity-50 hover:opacity-100"
                  }`}
                  referrerPolicy="no-referrer"
                />
                {isEditing && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImageChange(i);
                    }}
                    className="absolute inset-0 bg-suopes-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera size={16} className="text-suopes-gold" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Product Info */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col"
        >
          <div className="mb-8 space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-grow">
                    <label className="text-[8px] font-mono text-suopes-muted uppercase tracking-widest block mb-1">Categorias</label>
                    <div className="flex flex-wrap gap-1.5">
                      {["COLETES", "MOCHILAS", "JAQUETAS", "CAMISAS", "PATCHES", "BONÉS", "CINTOS", "BANDOLEIRAS", "PORTA CARREGADORES", "EQUIPAMENTO", "VESTUÁRIO", "CALÇADOS", "PROTEÇÃO"].map(cat => {
                        const cats = (editForm.category || "").split(",").map((c: string) => c.trim()).filter(Boolean);
                        const isSelected = cats.includes(cat);
                        return (
                          <button
                            type="button"
                            key={cat}
                            onClick={() => {
                              if (isSelected) {
                                setEditForm({...editForm, category: cats.filter((c: string) => c !== cat).join(",")});
                              } else {
                                setEditForm({...editForm, category: [...cats, cat].join(",")});
                              }
                            }}
                            className={`px-2 py-0.5 text-[8px] font-mono tracking-widest border transition-all ${
                              isSelected
                                ? "bg-suopes-gold border-suopes-gold text-suopes-black font-bold"
                                : "border-suopes-gray text-suopes-muted hover:border-suopes-gold hover:text-suopes-gold"
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex-grow">
                    <label className="text-[8px] font-mono text-suopes-muted uppercase tracking-widest block mb-1">SKU</label>
                    <input 
                      type="text"
                      value={editForm.sku}
                      onChange={(e) => setEditForm({...editForm, sku: e.target.value})}
                      className="w-full bg-suopes-black border border-suopes-gray p-2 text-[10px] font-mono text-suopes-gold outline-none focus:border-suopes-gold"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[8px] font-mono text-suopes-muted uppercase tracking-widest block mb-1">Nome do Produto</label>
                  <input 
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full bg-suopes-black border border-suopes-gray p-3 text-2xl font-bold text-suopes-white outline-none focus:border-suopes-gold"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-grow">
                    <label className="text-[8px] font-mono text-suopes-muted uppercase tracking-widest block mb-1">Preço (R$)</label>
                    <input 
                      type="number"
                      value={editForm.price}
                      onChange={(e) => setEditForm({...editForm, price: parseFloat(e.target.value)})}
                      className="w-full bg-suopes-black border border-suopes-gray p-3 text-xl font-mono text-suopes-gold outline-none focus:border-suopes-gold"
                    />
                  </div>
                  <div className="flex-grow">
                    <label className="text-[8px] font-mono text-suopes-muted uppercase tracking-widest block mb-1">Qtd. Estoque</label>
                    <input 
                      type="number"
                      min="0"
                      value={editForm.stockQuantity !== undefined ? editForm.stockQuantity : 10}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setEditForm({...editForm, stockQuantity: val, inStock: val > 0});
                      }}
                      className="w-full bg-suopes-black border border-suopes-gray p-3 text-xl font-mono text-suopes-white outline-none focus:border-suopes-gold"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 py-2 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editForm.isPresale || false}
                      onChange={(e) => setEditForm({...editForm, isPresale: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-suopes-gray rounded-full peer peer-checked:bg-suopes-gold relative transition-colors">
                      <div className={`absolute top-1 left-1 w-2 h-2 bg-white rounded-full transition-transform ${editForm.isPresale ? "translate-x-4" : ""}`} />
                    </div>
                    <span className="text-[10px] font-mono text-suopes-muted uppercase">Pré-Venda</span>
                  </label>
                  
                  {editForm.isPresale && (
                    <input 
                      type="text"
                      placeholder="Data envio (Ex: 15/06)"
                      value={editForm.presaleDate || ""}
                      onChange={(e) => setEditForm({...editForm, presaleDate: e.target.value})}
                      className="bg-suopes-black border border-suopes-gray p-1 px-3 text-[10px] font-mono text-suopes-gold outline-none w-48"
                    />
                  )}

                  <div className="w-[1px] h-6 bg-suopes-gray mx-2" />

                  <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">Status Geral:</label>
                  <button
                    onClick={() => setEditForm({...editForm, inStock: !editForm.inStock})}
                    className={`px-4 py-1 text-[10px] font-mono border transition-all ${
                      editForm.inStock 
                        ? "border-suopes-gold text-suopes-gold" 
                        : "border-suopes-red text-suopes-red"
                    }`}
                  >
                    {editForm.inStock ? "EM ESTOQUE" : "ESGOTADO"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className="text-xs font-mono text-suopes-gold tracking-[0.2em] mb-2 flex flex-wrap gap-1.5">
                  {(product.category || "").split(",").map((c: string) => c.trim()).filter(Boolean).map((cat: string, i: number) => (
                    <span key={i} className="border border-suopes-gold px-2 py-0.5 text-[9px]">{cat}</span>
                  ))}
                  <span className="text-suopes-muted">/ {product.sku}</span>
                </span>
                <div className="flex flex-col gap-1 mb-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <h1 className="text-4xl md:text-5xl font-black">{product.name || "EQUIPAMENTO SEM NOME"}</h1>
                    {product.isPresale ? (
                      <span className="bg-suopes-gold text-black font-bold text-[10px] font-mono px-3 py-1 tracking-widest">PRÉ-VENDA</span>
                    ) : !product.inStock && (
                      <span className="bg-suopes-red text-white text-[10px] font-mono px-3 py-1 tracking-widest">ESGOTADO</span>
                    )}
                  </div>
                  {product.isPresale && product.presaleDate && (
                    <span className="text-[10px] font-mono text-suopes-gold tracking-widest">
                      ENVIO COLETIVO PREVISTO A PARTIR DE: {product.presaleDate}
                    </span>
                  )}
                  {product.inStock && !product.isPresale && (
                    <span className="text-[10px] font-mono text-suopes-gold tracking-widest">
                      {product.stockQuantity !== undefined ? product.stockQuantity : 10} {product.stockQuantity === 1 ? 'DISPONÍVEL' : 'DISPONÍVEIS'}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-mono text-suopes-gold">
                  R$ {Number(product.price || 0).toFixed(2)}
                </p>
              </>
            )}
          </div>

          {/* Color Selection / Editing */}
          <div className="mb-12">
            <h3 className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest mb-4">Cores Disponíveis</h3>
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {editForm.colors?.map((color, i) => (
                    <div key={i} className="flex items-center gap-2 bg-suopes-gray/20 p-2 border border-suopes-gray">
                      <div className="w-4 h-4 rounded-full border border-suopes-gray" style={{ backgroundColor: color.hex }} />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono">{color.name}</span>
                        {color.imageIndex !== undefined && (
                          <span className="text-[8px] font-mono text-suopes-gold">IMG: #{color.imageIndex + 1}</span>
                        )}
                      </div>
                      <button 
                        onClick={() => toggleColorStock(i)}
                        className={`text-[8px] font-mono px-2 py-0.5 border ${color.inStock ? "border-suopes-gold text-suopes-gold" : "border-suopes-red text-suopes-red"}`}
                      >
                        {color.inStock ? "STOCK" : "OUT"}
                      </button>
                      <button onClick={() => handleEditColor(i)} className="text-suopes-muted hover:text-suopes-gold transition-colors">
                        <Edit3 size={12} />
                      </button>
                      <button onClick={() => handleRemoveColor(i)} className="text-suopes-red hover:text-white transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={handleAddColor}
                    className="flex items-center gap-2 px-4 py-2 border border-dashed border-suopes-gray text-suopes-muted hover:border-suopes-gold hover:text-suopes-gold transition-all text-[10px] font-mono"
                  >
                    <Plus size={12} /> ADICIONAR COR
                  </button>
                </div>

                <div className="mb-8 p-4 border border-suopes-gray bg-suopes-gray/5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-mono text-suopes-gold uppercase tracking-widest">Gerenciar Tamanhos</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editForm.hasSizes}
                      onChange={(e) => setEditForm({ ...editForm, hasSizes: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-suopes-gray rounded-full peer peer-checked:bg-suopes-gold relative transition-colors">
                      <div className={`absolute top-1 left-1 w-2 h-2 bg-white rounded-full transition-transform ${editForm.hasSizes ? "translate-x-4" : ""}`} />
                    </div>
                    <span className="text-[10px] font-mono text-suopes-muted uppercase">Habilitar Tamanhos</span>
                  </label>
                </div>

                {editForm.hasSizes && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {editForm.sizes?.map((size, i) => (
                        <div key={i} className="flex items-center gap-2 bg-suopes-gray/20 px-3 py-1 border border-suopes-gray">
                          <span className="text-[10px] font-mono font-bold">{size}</span>
                          <button 
                            onClick={() => {
                              const newSizes = editForm.sizes?.filter((_, idx) => idx !== i);
                              setEditForm({ ...editForm, sizes: newSizes });
                            }}
                            className="text-suopes-red hover:text-white transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        id="new-size-input"
                        placeholder="EX: P, M, G, 42, 44"
                        className="flex-grow bg-suopes-gray/20 border border-suopes-gray h-8 px-3 text-[10px] font-mono focus:border-suopes-gold outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.currentTarget;
                            const val = input.value.trim().toUpperCase();
                            if (val && !editForm.sizes?.includes(val)) {
                              setEditForm({ ...editForm, sizes: [...(editForm.sizes || []), val] });
                              input.value = "";
                            }
                          }
                        }}
                      />
                      <button 
                        onClick={() => {
                          const input = document.getElementById('new-size-input') as HTMLInputElement;
                          const val = input.value.trim().toUpperCase();
                          if (val && !editForm.sizes?.includes(val)) {
                            setEditForm({ ...editForm, sizes: [...(editForm.sizes || []), val] });
                            input.value = "";
                          }
                        }}
                        className="px-3 h-8 bg-suopes-gold text-suopes-black text-[10px] font-mono font-bold hover:bg-white transition-colors"
                      >
                        ADD
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
              <div className="flex flex-wrap gap-4">
                {product.colors?.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => {
                      setSelectedColor(color.name);
                      if (color.imageIndex !== undefined) {
                        setActiveImageIndex(color.imageIndex);
                      }
                    }}
                    className={`group relative flex flex-col items-center gap-2 transition-all cursor-pointer ${
                      !color.inStock || !product.inStock ? "opacity-50" : ""
                    }`}
                  >
                    <div 
                      className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${
                        selectedColor === color.name 
                          ? (color.inStock && product.inStock ? "border-suopes-gold scale-110" : "border-suopes-red scale-110") 
                          : "border-suopes-gray hover:border-suopes-gold"
                      }`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {selectedColor === color.name && <Check size={16} className={color.hex === "#FFFFFF" ? "text-black" : "text-white"} />}
                    </div>
                    <span className={`text-[8px] font-mono tracking-widest ${selectedColor === color.name ? (color.inStock && product.inStock ? "text-suopes-gold" : "text-suopes-red") : "text-suopes-muted"}`}>
                      {color.name}
                      {!color.inStock && " (OFF)"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {product.hasSizes && product.sizes && product.sizes.length > 0 && !isEditing && (
            <div className="mb-12">
              <h3 className="text-[10px] font-mono text-suopes-muted uppercase tracking-[0.2em] mb-4">Selecione o Tamanho</h3>
              <div className="flex flex-wrap gap-3">
                {product.sizes.map((size) => {
                  const currentColor = product.colors?.find(c => c.name === selectedColor);
                  const isSizeInStock = currentColor?.sizeStock ? currentColor.sizeStock[size] !== false : true;
                  const isAvailable = product.inStock && (currentColor?.inStock !== false) && isSizeInStock;

                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`h-12 min-w-[3rem] px-4 flex items-center justify-center border font-mono text-xs transition-all cursor-pointer ${
                        selectedSize === size 
                          ? (isAvailable ? "bg-suopes-gold border-suopes-gold text-suopes-black font-bold" : "bg-suopes-red/20 border-suopes-red text-suopes-red font-bold")
                          : (isAvailable ? "border-suopes-gray text-suopes-muted hover:border-suopes-gold hover:text-suopes-gold" : "opacity-50 border-suopes-gray text-suopes-muted hover:border-suopes-red hover:text-suopes-red")
                      }`}
                    >
                      {size}
                      {!isAvailable && <span className="ml-2 text-[8px]">(OFF)</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isEditing ? (
            <div className="space-y-6 mb-12">
              <div>
                <label className="text-[8px] font-mono text-suopes-muted uppercase tracking-widest block mb-1">Descrição</label>
                <textarea 
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  rows={4}
                  className="w-full bg-suopes-black border border-suopes-gray p-3 text-sm text-suopes-muted outline-none focus:border-suopes-gold resize-none"
                />
              </div>
              <div>
                <label className="text-[8px] font-mono text-suopes-muted uppercase tracking-widest block mb-1">Características e Dados Técnicos</label>
                <textarea 
                  value={editForm.features || ""}
                  onChange={(e) => setEditForm({...editForm, features: e.target.value})}
                  rows={4}
                  className="w-full bg-suopes-black border border-suopes-gray p-3 text-sm text-suopes-muted outline-none focus:border-suopes-gold resize-none"
                  placeholder="• Característica 1&#10;• Característica 2..."
                />
              </div>
              <div>
                <label className="text-[8px] font-mono text-suopes-muted uppercase tracking-widest block mb-1">Cuidados</label>
                <textarea 
                  value={editForm.care || ""}
                  onChange={(e) => setEditForm({...editForm, care: e.target.value})}
                  rows={4}
                  className="w-full bg-suopes-black border border-suopes-gray p-3 text-sm text-suopes-muted outline-none focus:border-suopes-gold resize-none"
                  placeholder="• Lavar à mão&#10;• Não usar alvejante..."
                />
              </div>
            </div>
          ) : (
            <div className="mb-12 border-t border-suopes-gray">
              {/* Compre Junto */}
              {relatedProduct && (
                <div className="py-8 border-b border-suopes-gray">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-mono text-suopes-gold uppercase tracking-widest">COMPRE JUNTO</h3>
                    <div className="flex gap-2">
                      <button className="p-1 text-suopes-muted hover:text-white"><ArrowLeft size={12} /></button>
                      <button className="p-1 text-suopes-muted hover:text-white"><ChevronRight size={12} /></button>
                    </div>
                  </div>
                  <Link to={`/product/${relatedProduct.id}`} className="flex items-center gap-4 bg-suopes-gold p-1 group">
                    <div className="w-16 h-16 bg-white flex-shrink-0">
                      <img src={relatedProduct.image} alt={relatedProduct.name} className="w-full h-full object-cover transition-all" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h4 className="text-[10px] font-bold text-black uppercase leading-tight truncate">{relatedProduct.name || "S/N"}</h4>
                      <p className="text-[10px] text-black font-mono">
                        R$ {typeof relatedProduct.price === 'number' ? relatedProduct.price.toFixed(2) : Number(relatedProduct.price || 0).toFixed(2)}
                      </p>
                      <p className="text-[8px] text-black/60 font-mono">
                        ou 2x de R$ {( (typeof relatedProduct.price === 'number' ? relatedProduct.price : Number(relatedProduct.price || 0)) / 2).toFixed(2)}
                      </p>
                    </div>
                  </Link>
                </div>
              )}

              {/* Accordion Sections */}
              <div className="divide-y divide-suopes-gray">
                {/* Descrição */}
                <div className="py-4">
                  <button 
                    onClick={() => setOpenAccordion(openAccordion === "desc" ? null : "desc")}
                    className="w-full flex justify-between items-center text-xs font-bold uppercase tracking-widest hover:text-suopes-gold transition-colors"
                  >
                    Descrição
                    <Plus size={14} className={`transition-transform duration-300 ${openAccordion === "desc" ? "rotate-45" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {openAccordion === "desc" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="pt-4 text-xs text-suopes-muted leading-relaxed font-mono uppercase">
                          {product.description || "NENHUMA DESCRIÇÃO TÉCNICA FORNECIDA PARA ESTE ATIVO."}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Características */}
                <div className="py-4">
                  <button 
                    onClick={() => setOpenAccordion(openAccordion === "feat" ? null : "feat")}
                    className="w-full flex justify-between items-center text-xs font-bold uppercase tracking-widest hover:text-suopes-gold transition-colors"
                  >
                    Características e Dados Técnicos
                    <Plus size={14} className={`transition-transform duration-300 ${openAccordion === "feat" ? "rotate-45" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {openAccordion === "feat" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 text-xs text-suopes-muted leading-relaxed font-mono uppercase whitespace-pre-line">
                          {product.features || "• MISTURA DE ALGODÃO PESADO\n• COSTURA REFORÇADA\n• CORTE TÁTICO ATLÉTICO\n• PRODUZIDO NO BRASIL"}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Cuidados */}
                <div className="py-4">
                  <button 
                    onClick={() => setOpenAccordion(openAccordion === "care" ? null : "care")}
                    className="w-full flex justify-between items-center text-xs font-bold uppercase tracking-widest hover:text-suopes-gold transition-colors"
                  >
                    Cuidados
                    <Plus size={14} className={`transition-transform duration-300 ${openAccordion === "care" ? "rotate-45" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {openAccordion === "care" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 text-xs text-suopes-muted leading-relaxed font-mono uppercase whitespace-pre-line">
                          {product.care || "• LAVAR À MÃO COM ÁGUA FRIA\n• NÃO UTILIZAR ALVEJANTE\n• SECAR À SOMBRA\n• NÃO PASSAR FERRO SOBRE A ESTAMPA"}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}

          {!isEditing && product.isPresale && (
            <div className="mb-8 border border-suopes-gold bg-suopes-gold/10 p-6">
              <h3 className="text-sm font-black text-suopes-gold uppercase mb-3 flex items-center gap-2">
                <AlertCircle size={16} /> COMO FUNCIONA A PRÉ-VENDA?
              </h3>
              <p className="text-[10px] font-mono text-white/80 leading-relaxed uppercase">
                Você garante seu item de forma antecipada. A produção e envio não são imediatos. Todo o lote da pré-venda será finalizado e enviado de forma conjunta para todos os clientes a partir de: <strong>{product.presaleDate || "DATA A SER DEFINIDA"}</strong>. Com sua compra confirmada, seu equipamento já está garantido aguardando o início do período de envios.
              </p>
            </div>
          )}

          <div className="space-y-6 mb-12">
            {isOutOfStock ? (
              <div className="space-y-4">
                {!showNotifyForm ? (
                  <button 
                    onClick={() => setShowNotifyForm(true)}
                    className="w-full btn-suopes h-14 bg-suopes-red border-suopes-red hover:bg-suopes-black transition-all"
                  >
                    AVISE-ME QUANDO CHEGAR
                  </button>
                ) : (
                  <motion.form 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleNotifySubmit}
                    className="p-6 border border-suopes-gray bg-suopes-gray/5 space-y-4"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-[10px] font-mono text-suopes-gold uppercase tracking-widest">Solicitar Notificação</h4>
                      <button type="button" onClick={() => setShowNotifyForm(false)} className="text-suopes-muted hover:text-white">
                        <X size={14} />
                      </button>
                    </div>
                    {notifySuccess ? (
                      <div className="py-4 text-center">
                        <p className="text-xs font-mono text-suopes-gold">SOLICITAÇÃO ENVIADA COM SUCESSO!</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-4">
                          <input 
                            type="text"
                            placeholder="SEU NOME COMPLETO"
                            value={notifyName}
                            onChange={(e) => setNotifyName(e.target.value)}
                            required
                            className="w-full bg-suopes-black border border-suopes-gray p-3 text-[10px] font-mono text-suopes-white outline-none focus:border-suopes-gold"
                          />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input 
                              type="email"
                              placeholder="SEU E-MAIL"
                              value={notifyEmail}
                              onChange={(e) => setNotifyEmail(e.target.value)}
                              required
                              className="w-full bg-suopes-black border border-suopes-gray p-3 text-[10px] font-mono text-suopes-white outline-none focus:border-suopes-gold"
                            />
                            <input 
                              type="tel"
                              placeholder="WHATSAPP EX: (11) 99999-9999"
                              value={notifyPhone}
                              onChange={(e) => setNotifyPhone(e.target.value)}
                              required
                              className="w-full bg-suopes-black border border-suopes-gray p-3 text-[10px] font-mono text-suopes-white outline-none focus:border-suopes-gold"
                            />
                          </div>
                        </div>
                        <button 
                          type="submit"
                          className="w-full btn-suopes h-12 text-[10px]"
                        >
                          ENVIAR SOLICITAÇÃO
                        </button>
                      </>
                    )}
                  </motion.form>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="flex items-center border border-suopes-gray h-14">
                  <button 
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="px-4 h-full hover:bg-suopes-gray transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="px-6 font-mono">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(q => q + 1)}
                    className="px-4 h-full hover:bg-suopes-gray transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <button 
                  onClick={() => onAddToCart({ ...product, selectedColor, selectedSize })}
                  disabled={product.hasSizes && !selectedSize}
                  className={`flex-grow btn-suopes h-14 ${product.hasSizes && !selectedSize ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {product.hasSizes && !selectedSize ? "SELECIONE O TAMANHO" : "ADICIONAR AO CARRINHO"}
                </button>
              </div>
            )}
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-suopes-gray">
            <div className="flex flex-col items-center text-center gap-3">
              <Truck size={20} className="text-suopes-gold" />
              <span className="text-[10px] font-mono tracking-widest leading-tight">ENVIO<br />NACIONAL</span>
            </div>
            <div className="flex flex-col items-center text-center gap-3">
              <Shield size={20} className="text-suopes-red" />
              <span className="text-[10px] font-mono tracking-widest leading-tight">PAGAMENTO<br />SEGURO</span>
            </div>
            <div className="flex flex-col items-center text-center gap-3">
              <RotateCcw size={20} className="text-suopes-gold" />
              <span className="text-[10px] font-mono tracking-widest leading-tight">30 DIAS PARA<br />DEVOLUÇÃO</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Image Edit Modal */}
      <AnimatePresence>
        {imageEditIndex !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-suopes-black/90 backdrop-blur-sm"
              onClick={() => setImageEditIndex(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-suopes-black border border-suopes-gray p-8 shadow-2xl"
            >
              <h3 className="text-xl font-black mb-6 uppercase tracking-tighter">Trocar Imagem {imageEditIndex === 0 ? "Principal" : `#${imageEditIndex + 1}`}</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest block mb-2">URL da Imagem</label>
                  <input 
                    type="text"
                    value={tempImageUrl}
                    onChange={(e) => setTempImageUrl(e.target.value)}
                    className="w-full bg-suopes-black border border-suopes-gray p-3 text-xs font-mono text-suopes-gold outline-none focus:border-suopes-gold"
                    placeholder="https://exemplo.com/imagem.jpg"
                    autoFocus
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setImageEditIndex(null)}
                    className="flex-grow border border-suopes-gray h-12 text-[10px] font-mono tracking-widest hover:bg-suopes-gray transition-colors"
                  >
                    CANCELAR
                  </button>
                  <button 
                    onClick={confirmImageChange}
                    className="flex-grow btn-suopes h-12 text-[10px] font-mono tracking-widest"
                  >
                    CONFIRMAR
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Color Edit Modal */}
      <AnimatePresence>
        {colorEditIndex !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-suopes-black/90 backdrop-blur-sm"
              onClick={() => setColorEditIndex(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-suopes-black border border-suopes-gray p-8 shadow-2xl"
            >
              <h3 className="text-xl font-black mb-6 uppercase tracking-tighter">
                {colorEditIndex === "new" ? "Adicionar Nova Cor" : "Editar Cor"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest block mb-2">Nome da Cor</label>
                  <input 
                    type="text"
                    value={tempColor.name}
                    onChange={(e) => setTempColor({ ...tempColor, name: e.target.value.toUpperCase() })}
                    className="w-full bg-suopes-black border border-suopes-gray p-3 text-xs font-mono text-suopes-gold outline-none focus:border-suopes-gold"
                    placeholder="EX: RANGER GREEN"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest block mb-2">Código Hex</label>
                  <div className="flex gap-4">
                    <input 
                      type="color"
                      value={tempColor.hex}
                      onChange={(e) => setTempColor({ ...tempColor, hex: e.target.value })}
                      className="w-12 h-12 bg-transparent border-none cursor-pointer"
                    />
                    <input 
                      type="text"
                      value={tempColor.hex}
                      onChange={(e) => setTempColor({ ...tempColor, hex: e.target.value })}
                      className="flex-grow bg-suopes-black border border-suopes-gray p-3 text-xs font-mono text-suopes-gold outline-none focus:border-suopes-gold"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest block mb-2">Associar Imagem (1-4)</label>
                  <select 
                    value={tempColor.imageIndex}
                    onChange={(e) => setTempColor({ ...tempColor, imageIndex: parseInt(e.target.value) })}
                    className="w-full bg-suopes-black border border-suopes-gray p-3 text-xs font-mono text-suopes-gold outline-none focus:border-suopes-gold"
                  >
                    <option value={0}>Imagem 1 (Principal)</option>
                    <option value={1}>Imagem 2</option>
                    <option value={2}>Imagem 3</option>
                    <option value={3}>Imagem 4</option>
                  </select>
                </div>
                
                {editForm?.hasSizes && editForm.sizes && editForm.sizes.length > 0 && (
                  <div>
                    <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest block mb-2">Estoque por Tamanho</label>
                    <div className="grid grid-cols-2 gap-2">
                      {editForm.sizes.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            const currentStock = tempColor.sizeStock || {};
                            setTempColor({
                              ...tempColor,
                              sizeStock: {
                                ...currentStock,
                                [size]: currentStock[size] === false ? true : false
                              }
                            });
                          }}
                          className={`flex items-center justify-between px-3 py-2 border text-[10px] font-mono transition-all ${
                            (tempColor.sizeStock?.[size] !== false)
                              ? "border-suopes-gold text-suopes-gold bg-suopes-gold/5"
                              : "border-suopes-red text-suopes-red bg-suopes-red/5"
                          }`}
                        >
                          <span>TAMANHO {size}</span>
                          <span className="font-bold">{(tempColor.sizeStock?.[size] !== false) ? "EM ESTOQUE" : "ESGOTADO"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setColorEditIndex(null)}
                    className="flex-grow border border-suopes-gray h-12 text-[10px] font-mono tracking-widest hover:bg-suopes-gray transition-colors"
                  >
                    CANCELAR
                  </button>
                  <button 
                    onClick={confirmColorEdit}
                    className="flex-grow btn-suopes h-12 text-[10px] font-mono tracking-widest"
                  >
                    CONFIRMAR
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
