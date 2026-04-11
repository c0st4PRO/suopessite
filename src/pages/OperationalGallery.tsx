import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, Shield, Target, Map, Edit3, Save, X, Plus, Trash2, Image as ImageIcon, AlertCircle } from "lucide-react";
import { User } from "../types";

interface GalleryItem {
  id: number;
  image: string;
  title: string;
  context: string;
  location: string;
  date: string;
}

interface OperationalGalleryProps {
  user: User | null;
}

export function OperationalGallery({ user }: OperationalGalleryProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<GalleryItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      const response = await fetch("/api/gallery");
      const data = await response.json();
      setItems(data);
    } catch (err) {
      console.error("Error fetching gallery:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    const method = editItem.id ? "PUT" : "POST";
    const url = editItem.id ? `/api/gallery/${editItem.id}` : "/api/gallery";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editItem),
      });

      if (response.ok) {
        await fetchGallery();
        setShowModal(false);
        setEditItem(null);
      }
    } catch (err) {
      console.error("Error saving gallery item:", err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/gallery/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchGallery();
        setDeleteId(null);
      }
    } catch (err) {
      console.error("Error deleting gallery item:", err);
    }
  };

  const openEditModal = (item: GalleryItem | null) => {
    setEditItem(item || { id: 0, image: "", title: "", context: "", location: "", date: "" });
    setShowModal(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-mono text-suopes-gold">CARREGANDO_ARQUIVO...</div>;

  return (
    <div className="min-h-screen bg-suopes-black pt-12 pb-24">
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-16 flex justify-between items-end">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 mb-4"
            >
              <div className="h-[1px] w-12 bg-suopes-gold"></div>
              <span className="text-[10px] font-mono text-suopes-gold uppercase tracking-[0.3em]">Arquivo de Campo</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6"
            >
              Galeria <span className="text-suopes-gold">Operacional</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-suopes-muted max-w-2xl font-mono text-xs leading-relaxed uppercase tracking-widest"
            >
              Documentação visual de nossos equipamentos em uso real por operadores em diversas condições e teatros de operação. 
              Cada imagem representa o compromisso da SUOPES com a excelência tática.
            </motion.p>
          </div>

          {user?.role === "admin" && (
            <div className="flex gap-4">
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-2 px-4 py-2 text-[10px] font-mono tracking-widest border transition-all ${
                  isEditing 
                    ? "bg-suopes-gold border-suopes-gold text-suopes-black" 
                    : "border-suopes-gray text-suopes-muted hover:border-suopes-gold hover:text-suopes-gold"
                }`}
              >
                {isEditing ? <><X size={14} /> SAIR DA EDIÇÃO</> : <><Edit3 size={14} /> MODO EDIÇÃO</>}
              </button>
              {isEditing && (
                <button 
                  onClick={() => openEditModal(null)}
                  className="flex items-center gap-2 px-4 py-2 text-[10px] font-mono tracking-widest bg-suopes-gold border border-suopes-gold text-suopes-black hover:bg-white hover:border-white transition-all"
                >
                  <Plus size={14} /> NOVO REGISTRO
                </button>
              )}
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative"
            >
              <div className="relative aspect-[3/4] overflow-hidden border border-suopes-gray bg-suopes-gray/20">
                <img 
                  src={item.image} 
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-suopes-black via-transparent to-transparent opacity-80"></div>
                
                <div className="absolute bottom-0 left-0 w-full p-6 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={12} className="text-suopes-gold" />
                    <span className="text-[10px] font-mono text-suopes-gold uppercase tracking-widest">{item.title}</span>
                  </div>
                  <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">{item.title}</h3>
                  <p className="text-[10px] font-mono text-suopes-muted leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    {item.context}
                  </p>
                </div>

                <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                  <div className="bg-suopes-black/50 backdrop-blur-sm border border-suopes-gray px-2 py-1 flex items-center gap-2">
                    <Map size={10} className="text-suopes-gold" />
                    <span className="text-[8px] font-mono text-white uppercase">{item.location}</span>
                  </div>
                  <div className="bg-suopes-black/50 backdrop-blur-sm border border-suopes-gray px-2 py-1">
                    <span className="text-[8px] font-mono text-suopes-gold uppercase">{item.date}</span>
                  </div>
                </div>

                {isEditing && (
                  <div className="absolute inset-0 bg-suopes-black/60 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openEditModal(item)}
                      className="p-3 bg-suopes-gold text-suopes-black rounded-full hover:bg-white transition-colors"
                    >
                      <Edit3 size={20} />
                    </button>
                    <button 
                      onClick={() => setDeleteId(item.id)}
                      className="p-3 bg-suopes-red text-white rounded-full hover:bg-white hover:text-suopes-red transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-24 pt-12 border-t border-suopes-gray flex flex-col md:flex-row justify-between items-center gap-8"
        >
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[8px] font-mono text-suopes-muted uppercase tracking-widest">Total de Registros</span>
              <span className="text-2xl font-black text-suopes-gold">{items.length.toString().padStart(3, '0')} / 150</span>
            </div>
            <div className="h-12 w-[1px] bg-suopes-gray"></div>
            <div className="flex flex-col">
              <span className="text-[8px] font-mono text-suopes-muted uppercase tracking-widest">Status do Arquivo</span>
              <span className="text-2xl font-black text-suopes-gold">OPERACIONAL</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Camera size={24} className="text-suopes-muted" />
            <Shield size={24} className="text-suopes-muted" />
            <Target size={24} className="text-suopes-muted" />
          </div>
        </motion.div>
      </div>

      {/* Modal de Edição */}
      <AnimatePresence>
        {showModal && editItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-suopes-black/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-suopes-black border border-suopes-gray p-8 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tighter">
                  {editItem.id ? "Editar Registro" : "Novo Registro"}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-suopes-muted hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">Título da Operação</label>
                    <input 
                      type="text"
                      required
                      value={editItem.title}
                      onChange={(e) => setEditItem({...editItem, title: e.target.value.toUpperCase()})}
                      className="w-full bg-suopes-gray/20 border border-suopes-gray h-12 px-4 text-sm focus:border-suopes-gold outline-none font-mono"
                      placeholder="EX: OPERAÇÃO SOMBRA"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">Localização</label>
                    <input 
                      type="text"
                      required
                      value={editItem.location}
                      onChange={(e) => setEditItem({...editItem, location: e.target.value.toUpperCase()})}
                      className="w-full bg-suopes-gray/20 border border-suopes-gray h-12 px-4 text-sm focus:border-suopes-gold outline-none font-mono"
                      placeholder="EX: SÃO PAULO, BRASIL"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">Data (MÊS ANO)</label>
                    <input 
                      type="text"
                      required
                      value={editItem.date}
                      onChange={(e) => setEditItem({...editItem, date: e.target.value.toUpperCase()})}
                      className="w-full bg-suopes-gray/20 border border-suopes-gray h-12 px-4 text-sm focus:border-suopes-gold outline-none font-mono"
                      placeholder="EX: MAR 2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">URL da Imagem</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-suopes-muted" size={18} />
                      <input 
                        type="url"
                        required
                        value={editItem.image}
                        onChange={(e) => setEditItem({...editItem, image: e.target.value})}
                        className="w-full bg-suopes-gray/20 border border-suopes-gray h-12 pl-10 pr-4 text-sm focus:border-suopes-gold outline-none font-mono"
                        placeholder="https://images.unsplash.com/..."
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">Contexto Operacional</label>
                  <textarea 
                    required
                    value={editItem.context}
                    onChange={(e) => setEditItem({...editItem, context: e.target.value})}
                    rows={4}
                    className="w-full bg-suopes-gray/20 border border-suopes-gray p-4 text-sm focus:border-suopes-gold outline-none font-mono resize-none"
                    placeholder="Descreva o contexto da operação e o equipamento utilizado..."
                  />
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full btn-suopes h-14 flex items-center justify-center gap-2">
                    <Save size={18} /> SALVAR REGISTRO NO ARQUIVO
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                ESTA AÇÃO É IRREVERSÍVEL. O REGISTRO OPERACIONAL SERÁ REMOVIDO PERMANENTEMENTE DO ARQUIVO. DESEJA PROSSEGUIR?
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
    </div>
  );
}
