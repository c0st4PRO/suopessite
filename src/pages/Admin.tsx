import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, Plus, CheckCircle, AlertCircle, Package, Trash2, Search, ChevronDown, ChevronUp, MapPin, CreditCard, User, Mail, Truck } from "lucide-react";
import { Product } from "../types";

export function Admin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("VESTUÁRIO");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");
  const [care, setCare] = useState("");
  const [hasSizes, setHasSizes] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [activeTab, setActiveTab] = useState<"inventory" | "marketing" | "demanda" | "logistica">("inventory");

  // LOGÍSTICA STATE
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<string>("todos");

  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastTestEmail, setBroadcastTestEmail] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
    if (activeTab === "marketing") fetchSubscribers();
    if (activeTab === "demanda") fetchWaitlist();
    if (activeTab === "logistica") fetchAdminOrders();
  }, [activeTab]);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const res = await fetch("/api/admin/newsletter");
      if (res.ok) setSubscribers(await res.json());
    } catch (err) {}
  };

  const fetchWaitlist = async () => {
    try {
      const res = await fetch("/api/admin/waitlist");
      if (res.ok) setWaitlist(await res.json());
    } catch (err) {}
  };

  const fetchAdminOrders = async () => {
    try {
      const res = await fetch("/api/admin/orders");
      if (res.ok) setAdminOrders(await res.json());
    } catch (err) {
      console.error("Erro ao buscar pedidos:", err);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchAdminOrders();
      } else {
        const data = await res.json();
        alert(`Erro: ${data.message}`);
      }
    } catch (e) {
      alert("Falha de comunicação ao atualizar status.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'processando': return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
      case 'enviado': return 'text-purple-400 bg-purple-400/10 border-purple-400/30';
      case 'concluido': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'cancelado': return 'text-red-400 bg-red-400/10 border-red-400/30';
      default: return 'text-suopes-muted bg-suopes-gray/10 border-suopes-gray';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente': return 'PENDENTE';
      case 'processando': return 'PROCESSANDO';
      case 'enviado': return 'ENVIADO';
      case 'concluido': return 'CONCLUÍDO';
      case 'cancelado': return 'CANCELADO';
      default: return status.toUpperCase();
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'pending': case 'in_process': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'rejected': case 'cancelled': return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'refunded': case 'charged_back': return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
      default: return 'text-suopes-muted bg-suopes-gray/10 border-suopes-gray';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return '✅ PAGO';
      case 'pending': return '⏳ PENDENTE';
      case 'in_process': return '⏳ EM ANÁLISE';
      case 'rejected': return '❌ REJEITADO';
      case 'cancelled': return '❌ CANCELADO';
      case 'refunded': return '↩️ REEMBOLSADO';
      case 'charged_back': return '⚠️ CHARGEBACK';
      default: return '❓ ' + status.toUpperCase();
    }
  };

  const handleCheckPayment = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/check-payment`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        alert(`${data.message}`);
        fetchAdminOrders();
      } else {
        alert(`Erro: ${data.message}`);
      }
    } catch (e) {
      alert("Falha de comunicação ao consultar pagamento.");
    }
  };

  const filteredOrders = orderFilter === 'todos' 
    ? adminOrders 
    : adminOrders.filter(o => o.status === orderFilter);

  const handleBroadcast = async (mode: 'test' | 'all') => {
    setBroadcasting(true);
    setBroadcastResult("");
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: broadcastSubject,
          message: broadcastMessage,
          testEmail: broadcastTestEmail,
          mode
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBroadcastResult(`Sucesso! E-mails enviados: ${data.sent} de ${data.total}`);
        if(mode==='all') { setBroadcastSubject(""); setBroadcastMessage(""); }
      } else {
        setBroadcastResult(`Erro: ${data.message}`);
      }
    } catch (e) {
      setBroadcastResult("Falha na comunicação com o servidor.");
    } finally {
      setBroadcasting(false);
    }
  };

  const handleNotifyStock = async (item: any) => {
    if (!confirm(`Deseja notificar ${item.email} sobre a chegada de ${item.product_name}?`)) return;
    
    try {
      const relatedProduct = products.find(p => p.sku === item.product_id);
      
      const res = await fetch("/api/admin/notify-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waitlistId: item.id,
          email: item.email,
          productName: item.product_name,
          details: item.details,
          imageUrl: relatedProduct?.image
        })
      });
      if (res.ok) {
        alert("Cliente notificado com sucesso!");
        fetchWaitlist(); // Atualiza a lista após deletar
      } else {
        const textData = await res.text();
        try {
          const jsonData = JSON.parse(textData);
          alert(`Erro ao notificar: ${jsonData.message}`);
        } catch (parseError) {
          alert(`O servidor retornou erro e o texto foi: ${textData.slice(0, 50)}`);
        }
      }
    } catch (e: any) {
      alert(`Falha de comunicação: ${e.message}`);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // 1. Upload Image
      let imageUrl = "";
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.message || "Erro no upload");
        imageUrl = uploadData.imageUrl;
      }

      // 2. Save Product
      const productData = {
        name,
        price: parseFloat(price),
        category,
        sku,
        description,
        features,
        care,
        hasSizes,
        sizes: hasSizes ? ["P", "M", "G", "GG"] : [], 
        image: imageUrl || "https://picsum.photos/seed/default/800/1000",
      };

      const productRes = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      if (productRes.ok) {
        setSuccess(true);
        setName("");
        setPrice("");
        setSku("");
        setDescription("");
        setFeatures("");
        setCare("");
        setImageFile(null);
        setImagePreview(null);
        fetchProducts();
      } else {
        throw new Error("Erro ao salvar produto");
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchProducts();
        setDeleteId(null);
      } else {
        setError("ERRO AO EXCLUIR PRODUTO NO SERVIDOR");
      }
    } catch (err) {
      console.error("Error deleting product:", err);
      setError("FALHA NA COMUNICAÇÃO COM O QUARTEL GENERAL");
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <div className="mb-12">
        <h1 className="text-4xl font-black mb-6 uppercase">Quartel General</h1>
        
        <div className="flex border-b border-suopes-gray uppercase text-[10px] font-mono tracking-widest overflow-x-auto">
          <button 
            className={`px-8 py-4 whitespace-nowrap border-b-2 transition-all ${activeTab === 'inventory' ? 'border-suopes-gold text-suopes-gold font-bold' : 'border-transparent text-suopes-muted hover:text-white'}`}
            onClick={() => setActiveTab('inventory')}
          >
            INVENTÁRIO
          </button>
          <button 
            className={`px-8 py-4 whitespace-nowrap border-b-2 transition-all ${activeTab === 'marketing' ? 'border-suopes-gold text-suopes-gold font-bold' : 'border-transparent text-suopes-muted hover:text-white'}`}
            onClick={() => setActiveTab('marketing')}
          >
            NEWSLETTER / BROADCAST
          </button>
          <button 
            className={`px-8 py-4 whitespace-nowrap border-b-2 transition-all ${activeTab === 'demanda' ? 'border-suopes-gold text-suopes-gold font-bold' : 'border-transparent text-suopes-muted hover:text-white'}`}
            onClick={() => setActiveTab('demanda')}
          >
            DEMANDA
          </button>
          <button 
            className={`px-8 py-4 whitespace-nowrap border-b-2 transition-all ${activeTab === 'logistica' ? 'border-suopes-gold text-suopes-gold font-bold' : 'border-transparent text-suopes-muted hover:text-white'}`}
            onClick={() => setActiveTab('logistica')}
          >
            LOGÍSTICA / PEDIDOS
          </button>
        </div>
      </div>

      {activeTab === 'inventory' && (
        <>
          <div className="mb-12">
            <h2 className="text-2xl font-black mb-2 uppercase">Criar Produto</h2>
            <p className="text-suopes-muted font-mono text-xs uppercase tracking-widest">Novo Registro de Estoque</p>
          </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-32">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">Nome do Produto</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-suopes-black border border-suopes-gray h-12 px-4 text-sm focus:border-suopes-gold outline-none transition-colors font-mono"
              placeholder="EX: COLETE PLATE CARRIER"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">Preço (R$)</label>
              <input 
                type="number" 
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-suopes-black border border-suopes-gray h-12 px-4 text-sm focus:border-suopes-gold outline-none transition-colors font-mono"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">SKU</label>
              <input 
                type="text" 
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-suopes-black border border-suopes-gray h-12 px-4 text-sm focus:border-suopes-gold outline-none transition-colors font-mono"
                placeholder="SUO-XXX-YYY"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">Categoria</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-suopes-black border border-suopes-gray h-12 px-4 text-sm focus:border-suopes-gold outline-none transition-colors font-mono appearance-none"
            >
              <option value="VESTUÁRIO">VESTUÁRIO</option>
              <option value="HEADWEAR">HEADWEAR</option>
              <option value="EQUIPAMENTO">EQUIPAMENTO</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">Descrição</label>
            <textarea 
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-suopes-black border border-suopes-gray p-4 text-sm focus:border-suopes-gold outline-none transition-colors font-mono resize-none"
              placeholder="Detalhes técnicos do produto..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">Características e Dados Técnicos</label>
            <textarea 
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              rows={4}
              className="w-full bg-suopes-black border border-suopes-gray p-4 text-sm focus:border-suopes-gold outline-none transition-colors font-mono resize-none"
              placeholder="• Característica 1&#10;• Característica 2..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">Cuidados</label>
            <textarea 
              value={care}
              onChange={(e) => setCare(e.target.value)}
              rows={4}
              className="w-full bg-suopes-black border border-suopes-gray p-4 text-sm focus:border-suopes-gold outline-none transition-colors font-mono resize-none"
              placeholder="• Lavar à mão&#10;• Não usar alvejante..."
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-suopes-gray bg-suopes-gray/5">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-suopes-gold uppercase tracking-widest">Grade de Tamanhos</span>
              <span className="text-[8px] font-mono text-suopes-muted uppercase">Habilitar seleção de tamanho para este item</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={hasSizes}
                onChange={(e) => setHasSizes(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-suopes-gray rounded-full peer peer-checked:bg-suopes-gold relative transition-colors">
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${hasSizes ? "translate-x-5" : ""}`} />
              </div>
            </label>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-suopes h-14 flex items-center justify-center gap-2 group"
          >
            {loading ? "PROCESSANDO..." : (
              <>
                ADICIONAR PRODUTO <Plus size={18} />
              </>
            )}
          </button>

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-green-500 bg-green-500/10 p-4 border border-green-500/20 text-xs font-mono"
            >
              <CheckCircle size={16} />
              <span>PRODUTO ADICIONADO COM SUCESSO AO SISTEMA.</span>
            </motion.div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-suopes-red bg-suopes-red/10 p-4 border border-suopes-red/20 text-xs font-mono"
            >
              <AlertCircle size={16} />
              <span>ERRO: {error}</span>
            </motion.div>
          )}
        </form>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">Imagem do Produto</label>
            <div 
              className={`aspect-[4/5] border-2 border-dashed border-suopes-gray flex flex-col items-center justify-center relative overflow-hidden group transition-colors ${!imagePreview && "hover:border-suopes-gold"}`}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-suopes-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="text-xs font-mono text-suopes-gold border border-suopes-gold px-4 py-2"
                    >
                      REMOVER
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Upload size={32} className="text-suopes-muted mb-4" />
                  <p className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest mb-4">Arraste ou clique para upar</p>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <button type="button" className="text-[10px] font-mono text-suopes-gold border border-suopes-gold px-4 py-2">
                    SELECIONAR ARQUIVO
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="bg-suopes-gray/10 border border-suopes-gray p-6 space-y-4">
            <div className="flex items-center gap-2 text-suopes-gold mb-2">
              <Package size={18} />
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest">Status do Sistema</h3>
            </div>
            <div className="space-y-2 text-[10px] font-mono text-suopes-muted uppercase">
              <p>Conexão: <span className="text-green-500">ESTÁVEL</span></p>
              <p>Diretório: /public/uploads</p>
              <p>Formato: JPG, PNG, WEBP</p>
              <p>Limite: 5MB por arquivo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Product List Section */}
      <div className="border-t border-suopes-gray pt-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h2 className="text-3xl font-black uppercase">Inventário Atual</h2>
            <p className="text-suopes-muted font-mono text-xs uppercase tracking-widest mt-1">Gerenciar Ativos Existentes</p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-suopes-muted" size={16} />
            <input 
              type="text" 
              placeholder="BUSCAR POR NOME OU SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-suopes-gray/10 border border-suopes-gray h-12 pl-12 pr-4 text-[10px] font-mono outline-none focus:border-suopes-gold transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredProducts.map((product) => (
              <motion.div 
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-suopes-gray/5 border border-suopes-gray p-4 flex gap-4 group hover:border-suopes-gold transition-colors"
              >
                <div className="w-20 h-24 bg-suopes-gray flex-shrink-0 overflow-hidden">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-grow flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase leading-tight line-clamp-2">{product.name}</h4>
                    <p className="text-[8px] font-mono text-suopes-muted mt-1">{product.sku}</p>
                    <p className="text-[10px] font-mono text-suopes-gold mt-1">R$ {product.price.toFixed(2)}</p>
                  </div>
                  <button 
                    onClick={() => setDeleteId(product.id)}
                    className="flex items-center gap-2 text-[8px] font-mono text-suopes-red hover:text-white transition-colors uppercase mt-2"
                  >
                    <Trash2 size={12} /> Eliminar Ativo
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Custom Confirmation Modal */}
        <AnimatePresence>
          {deleteId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeleteId(null)}
                className="absolute inset-0 bg-suopes-black/90 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-suopes-black border border-suopes-red p-8 text-center"
              >
                <div className="w-16 h-16 border border-suopes-red flex items-center justify-center mx-auto mb-6 rotate-45">
                  <AlertCircle size={32} className="text-suopes-red -rotate-45" />
                </div>
                <h3 className="text-xl font-black uppercase mb-4 tracking-tighter">Confirmar Eliminação</h3>
                <p className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest mb-8 leading-relaxed">
                  ESTA AÇÃO É IRREVERSÍVEL. O ATIVO SERÁ REMOVIDO PERMANENTEMENTE DO BANCO DE DADOS DA SUOPES. DESEJA PROSSEGUIR?
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setDeleteId(null)}
                    className="flex-1 h-12 border border-suopes-gray text-[10px] font-mono tracking-widest hover:bg-white hover:text-black transition-all"
                  >
                    ABORTAR
                  </button>
                  <button 
                    onClick={() => handleDelete(deleteId)}
                    className="flex-1 h-12 bg-suopes-red text-white text-[10px] font-mono tracking-widest hover:bg-red-700 transition-all"
                  >
                    CONFIRMAR
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {filteredProducts.length === 0 && (
          <div className="text-center py-20 border border-dashed border-suopes-gray">
            <p className="text-suopes-muted font-mono text-xs uppercase tracking-widest">Nenhum ativo encontrado para os critérios de busca.</p>
          </div>
        )}
      </div>
      </>
      )}

      {activeTab === 'marketing' && (
        <div className="space-y-12">
          <div className="mb-12">
            <h2 className="text-2xl font-black mb-2 uppercase">Central de Engajamento</h2>
            <p className="text-suopes-muted font-mono text-xs uppercase tracking-widest">Disparos de E-mail e Assinantes ({subscribers.length})</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-6 bg-suopes-gray/5 border border-suopes-gray p-8">
              <h3 className="text-xl font-bold uppercase mb-4 text-suopes-gold">Novo Disparo (Broadcast)</h3>
              
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">Assunto do E-mail</label>
                <input 
                  type="text" 
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  className="w-full bg-suopes-black border border-suopes-gray h-12 px-4 text-sm focus:border-suopes-gold outline-none font-mono text-white"
                  placeholder="EX: NOVO DROP LIBERADO!"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">Mensagem</label>
                <textarea 
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={6}
                  className="w-full bg-suopes-black border border-suopes-gray p-4 text-sm focus:border-suopes-gold outline-none font-mono resize-none text-white"
                  placeholder="DIGITE A MENSAGEM DO E-MAIL AQUI..."
                />
              </div>

              <div className="space-y-2 border-t border-suopes-gray pt-6">
                <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">E-mail de Teste</label>
                <div className="flex gap-4">
                  <input 
                    type="email" 
                    value={broadcastTestEmail}
                    onChange={(e) => setBroadcastTestEmail(e.target.value)}
                    className="flex-grow bg-suopes-black border border-suopes-gray h-12 px-4 text-sm focus:border-suopes-gold outline-none font-mono text-white"
                    placeholder="seuemail@teste.com"
                  />
                  <button 
                    disabled={broadcasting}
                    onClick={() => handleBroadcast('test')}
                    className="px-6 border border-suopes-gray text-[10px] font-mono uppercase hover:bg-white hover:text-black transition-colors disabled:opacity-50"
                  >
                    Mandar Teste
                  </button>
                </div>
              </div>

              <button 
                onClick={() => handleBroadcast('all')}
                disabled={broadcasting}
                className="w-full btn-suopes h-14 mt-4 bg-suopes-gold text-black hover:bg-white transition-colors disabled:opacity-50"
              >
                {broadcasting ? "ENVIANDO..." : "DISPARAR PARA TODOS OS ASSINANTES"}
              </button>

              {broadcastResult && (
                <div className="p-4 border border-suopes-gold bg-suopes-gold/10 text-suopes-gold text-xs font-mono uppercase text-center mt-4">
                  {broadcastResult}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold uppercase mb-4">Inscritos ({subscribers.length})</h3>
              <div className="border border-suopes-gray bg-suopes-gray/5 h-[600px] overflow-y-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-suopes-gray/20 sticky top-0">
                    <tr>
                      <th className="p-4 text-suopes-muted font-normal uppercase tracking-widest">E-mail</th>
                      <th className="p-4 text-suopes-muted font-normal uppercase tracking-widest">WhatsApp</th>
                      <th className="p-4 text-suopes-muted font-normal uppercase tracking-widest">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((sub, i) => (
                      <tr key={i} className="border-t border-suopes-gray/50 hover:bg-suopes-gray/10">
                        <td className="p-4">{sub.email}</td>
                        <td className="p-4 text-suopes-gold">{sub.phone || "--"}</td>
                        <td className="p-4 text-suopes-muted">{new Date(sub.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {subscribers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-suopes-muted">NENHUM INSCRITO AINDA.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logistica' && (
        <div className="space-y-8">
          <div className="mb-8">
            <h2 className="text-2xl font-black mb-2 uppercase">Central de Logística</h2>
            <p className="text-suopes-muted font-mono text-xs uppercase tracking-widest">Gestão Completa de Pedidos ({adminOrders.length} total)</p>
          </div>

          {/* FILTROS DE STATUS */}
          <div className="flex flex-wrap gap-2 mb-6">
            {['todos', 'pendente', 'processando', 'enviado', 'concluido', 'cancelado'].map(f => (
              <button
                key={f}
                onClick={() => setOrderFilter(f)}
                className={`px-4 py-2 text-[10px] font-mono uppercase tracking-widest border transition-all ${
                  orderFilter === f 
                    ? 'border-suopes-gold bg-suopes-gold/10 text-suopes-gold' 
                    : 'border-suopes-gray text-suopes-muted hover:text-white hover:border-white'
                }`}
              >
                {f === 'todos' ? `TODOS (${adminOrders.length})` : `${f.toUpperCase()} (${adminOrders.filter(o => o.status === f).length})`}
              </button>
            ))}
          </div>

          {/* LISTA DE PEDIDOS */}
          <div className="space-y-3">
            {filteredOrders.length === 0 && (
              <div className="text-center py-20 border border-dashed border-suopes-gray">
                <p className="text-suopes-muted font-mono text-xs uppercase tracking-widest">
                  {orderFilter === 'todos' ? 'NENHUM PEDIDO REGISTRADO.' : `NENHUM PEDIDO COM STATUS "${orderFilter.toUpperCase()}".`}
                </p>
              </div>
            )}

            {filteredOrders.map((order) => (
              <motion.div
                key={order.id}
                layout
                className="border border-suopes-gray bg-suopes-gray/5 overflow-hidden"
              >
                {/* HEADER DO PEDIDO - Colapsável */}
                <div 
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  className="flex flex-wrap items-center justify-between p-4 cursor-pointer hover:bg-suopes-gray/10 transition-colors gap-4"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      {expandedOrder === order.id ? <ChevronUp size={16} className="text-suopes-gold" /> : <ChevronDown size={16} className="text-suopes-muted" />}
                      <span className="font-mono text-sm font-bold text-suopes-gold">{order.id}</span>
                    </div>
                    <span className={`px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <span className={`px-3 py-1 text-[9px] font-mono font-bold uppercase tracking-widest border ${getPaymentStatusColor(order.paymentStatus)}`}>
                      {getPaymentStatusLabel(order.paymentStatus)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-6 text-xs font-mono">
                    <div className="flex items-center gap-2 text-suopes-muted">
                      <User size={12} />
                      <span>{order.customer?.name || 'N/A'}</span>
                    </div>
                    <span className="text-suopes-muted">
                      {new Date(order.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}
                    </span>
                    <span className="text-suopes-gold font-bold">R$ {order.total?.toFixed(2)}</span>
                  </div>
                </div>

                {/* CORPO EXPANDIDO */}
                <AnimatePresence>
                  {expandedOrder === order.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-suopes-gray p-6 space-y-6">
                        
                        {/* GRID DE INFORMAÇÕES */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          
                          {/* CLIENTE */}
                          <div className="space-y-3 bg-suopes-gray/10 p-4 border border-suopes-gray">
                            <h4 className="text-[10px] font-mono text-suopes-gold uppercase tracking-widest flex items-center gap-2">
                              <User size={12} /> DADOS DO CLIENTE
                            </h4>
                            <div className="space-y-2 text-xs font-mono">
                              <p><span className="text-suopes-muted">NOME:</span> <span className="text-white">{order.customer?.name}</span></p>
                              <p className="flex items-center gap-1"><Mail size={10} className="text-suopes-muted" /> <span className="text-white">{order.customer?.email}</span></p>
                            </div>
                          </div>

                          {/* ENDEREÇO */}
                          <div className="space-y-3 bg-suopes-gray/10 p-4 border border-suopes-gray">
                            <h4 className="text-[10px] font-mono text-suopes-gold uppercase tracking-widest flex items-center gap-2">
                              <MapPin size={12} /> ZONA DE ENTREGA
                            </h4>
                            {order.address ? (
                              <div className="space-y-1 text-xs font-mono">
                                <p className="text-white">{order.address.address}, {order.address.number}</p>
                                <p className="text-white">{order.address.city} - {order.address.state}</p>
                                <p className="text-suopes-muted">CEP: {order.address.cep}</p>
                              </div>
                            ) : (
                              <p className="text-xs font-mono text-suopes-muted">Endereço não registrado</p>
                            )}
                          </div>

                          {/* PAGAMENTO */}
                          <div className="space-y-3 bg-suopes-gray/10 p-4 border border-suopes-gray">
                            <h4 className="text-[10px] font-mono text-suopes-gold uppercase tracking-widest flex items-center gap-2">
                              <CreditCard size={12} /> PAGAMENTO
                            </h4>
                            <div className="space-y-2 text-xs font-mono">
                              <p><span className="text-suopes-muted">MÉTODO:</span> <span className="text-white uppercase">{order.paymentMethod === 'pix' ? 'PIX' : 'CARTÃO DE CRÉDITO'}</span></p>
                              <p>
                                <span className="text-suopes-muted">STATUS PGTO:</span>{' '}
                                <span className={`inline-block px-2 py-0.5 text-[9px] border ${getPaymentStatusColor(order.paymentStatus)}`}>
                                  {getPaymentStatusLabel(order.paymentStatus)}
                                </span>
                              </p>
                              <p><span className="text-suopes-muted">SUBTOTAL:</span> <span className="text-white">R$ {(order.total - (order.shippingCost || 0)).toFixed(2)}</span></p>
                              <p><span className="text-suopes-muted">FRETE:</span> <span className="text-white">R$ {(order.shippingCost || 0).toFixed(2)}</span></p>
                              <p className="border-t border-suopes-gray pt-2 mt-2"><span className="text-suopes-gold font-bold">TOTAL: R$ {order.total?.toFixed(2)}</span></p>
                              {order.mpId && <p><span className="text-suopes-muted">MP ID:</span> <span className="text-suopes-muted">{order.mpId}</span></p>}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCheckPayment(order.id); }}
                                className="mt-2 w-full px-4 py-2 text-[9px] font-mono uppercase tracking-widest border border-suopes-gold text-suopes-gold hover:bg-suopes-gold hover:text-black transition-all"
                              >
                                🔍 VERIFICAR PAGAMENTO NO MP
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* ITENS DO PEDIDO */}
                        <div>
                          <h4 className="text-[10px] font-mono text-suopes-gold uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Package size={12} /> ITENS DO PEDIDO ({order.items?.length || 0})
                          </h4>
                          <div className="border border-suopes-gray">
                            <table className="w-full text-left font-mono text-xs">
                              <thead className="bg-suopes-gray/20">
                                <tr>
                                  <th className="p-3 text-suopes-muted font-normal uppercase tracking-widest">ITEM</th>
                                  <th className="p-3 text-suopes-muted font-normal uppercase tracking-widest">VARIANTE</th>
                                  <th className="p-3 text-suopes-muted font-normal uppercase tracking-widest text-center">QTD</th>
                                  <th className="p-3 text-suopes-muted font-normal uppercase tracking-widest text-right">PREÇO</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items?.map((item: any, idx: number) => (
                                  <tr key={idx} className="border-t border-suopes-gray/50 hover:bg-suopes-gray/10">
                                    <td className="p-3">
                                      <div className="flex items-center gap-3">
                                        {item.image && (
                                          <div className="w-10 h-12 bg-suopes-gray flex-shrink-0 overflow-hidden">
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                          </div>
                                        )}
                                        <span className="font-bold text-white uppercase">{item.name}</span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-suopes-muted">
                                      {item.color && <span>COR: {item.color}</span>}
                                      {item.color && item.size && <span> / </span>}
                                      {item.size && <span>TAM: {item.size}</span>}
                                      {!item.color && !item.size && '--'}
                                    </td>
                                    <td className="p-3 text-center text-white">{item.quantity}x</td>
                                    <td className="p-3 text-right text-suopes-gold">R$ {(item.price * item.quantity).toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* CONTROLE DE STATUS */}
                        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-suopes-gray">
                          <h4 className="text-[10px] font-mono text-suopes-gold uppercase tracking-widest flex items-center gap-2">
                            <Truck size={12} /> ATUALIZAR STATUS:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {['pendente', 'processando', 'enviado', 'concluido', 'cancelado'].map(s => (
                              <button
                                key={s}
                                onClick={() => handleStatusChange(order.id, s)}
                                disabled={order.status === s}
                                className={`px-4 py-2 text-[9px] font-mono uppercase tracking-widest border transition-all ${
                                  order.status === s 
                                    ? `${getStatusColor(s)} font-bold cursor-default` 
                                    : 'border-suopes-gray text-suopes-muted hover:text-white hover:border-white'
                                }`}
                              >
                                {getStatusLabel(s)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'demanda' && (
        <div className="space-y-12">
          <div className="mb-12">
            <h2 className="text-2xl font-black mb-2 uppercase">Fila de Demanda</h2>
            <p className="text-suopes-muted font-mono text-xs uppercase tracking-widest">Alerta de Estoque: Quem quer comprar o que não tem?</p>
          </div>

          <div className="border border-suopes-gray bg-suopes-gray/5">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-suopes-gray/20">
                <tr>
                  <th className="p-4 text-suopes-muted font-normal uppercase tracking-widest">Data</th>
                  <th className="p-4 text-suopes-muted font-normal uppercase tracking-widest">Produto / Variante</th>
                  <th className="p-4 text-suopes-muted font-normal uppercase tracking-widest">Cliente</th>
                  <th className="p-4 text-suopes-muted font-normal uppercase tracking-widest">Ação</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.map((item, i) => (
                  <tr key={i} className="border-t border-suopes-gray/50 hover:bg-suopes-gray/10">
                    <td className="p-4 text-suopes-muted">{new Date(item.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <p className="font-bold text-suopes-gold">{item.product_name} <span className="text-suopes-muted text-[10px]">({item.product_id})</span></p>
                      {item.details && <p className="text-[10px] text-suopes-muted mt-1">{item.details}</p>}
                    </td>
                    <td className="p-4 block">
                      <p className="text-white">{item.email}</p>
                      {item.phone && <p className="text-[10px] text-suopes-gold mt-1">WPP: {item.phone}</p>}
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => handleNotifyStock(item)}
                        className="btn-suopes px-4 py-2 text-[10px]"
                      >
                        [ NOTIFICAR ]
                      </button>
                    </td>
                  </tr>
                ))}
                {waitlist.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-suopes-muted uppercase">FILA VAZIA.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
