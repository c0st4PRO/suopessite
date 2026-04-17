import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User, Sparkles, Minus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function Assistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carregar histórico do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('suopes_chat_history');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao carregar histórico:', e);
      }
    } else {
      // Mensagem inicial
      setMessages([{
        role: 'assistant',
        content: 'Olá Operador! Sou o **ASSISTENTE SUOPES**. Como posso ajudar na sua missão hoje? Procuro equipamentos ou tiro dúvidas táticas?',
        timestamp: Date.now()
      }]);
    }
  }, []);

  // Salvar no localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('suopes_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll automático para o fim
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMessage].map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Falha desconhecida na comunicação tática');
      }
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Erro no assistente:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `**SYSTEM ERROR:** ${error.message}`,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessage = (content: string) => {
    // Regex simples para negrito **texto**
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-suopes-gold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="fixed bottom-6 left-6 z-[9999] flex flex-col items-start">
      {/* Janela de Chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[350px] md:w-[400px] h-[500px] bg-suopes-black/90 backdrop-blur-xl border border-suopes-gray rounded-2xl shadow-2xl flex flex-col overflow-hidden origin-bottom-left"
          >
            {/* Header */}
            <div className="p-4 border-b border-suopes-gray bg-suopes-gray/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-suopes-gold/20 flex items-center justify-center text-suopes-gold border border-suopes-gold/30">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold tracking-widest text-white uppercase">Assistente Suopes</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] text-suopes-muted uppercase font-mono tracking-tighter">Status: Operacional</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-suopes-muted hover:text-white transition-colors"
                >
                  <Minus size={18} />
                </button>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    m.role === 'user' ? "ml-auto items-end" : "items-start"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-2xl text-[11px] leading-relaxed font-mono",
                    m.role === 'user' 
                      ? "bg-suopes-gold text-black rounded-tr-none" 
                      : "bg-suopes-gray/20 text-white border border-suopes-gray/50 rounded-tl-none"
                  )}>
                    {formatMessage(m.content)}
                  </div>
                  <span className="text-[8px] text-suopes-muted mt-1 uppercase">
                    {m.role === 'user' ? 'Você' : 'Suopes Bot'} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {isLoading && (
                <div className="flex flex-col items-start max-w-[85%]">
                  <div className="bg-suopes-gray/20 text-white border border-suopes-gray/50 p-3 rounded-2xl rounded-tl-none flex gap-1">
                    <span className="w-1 h-1 bg-suopes-gold rounded-full animate-bounce"></span>
                    <span className="w-1 h-1 bg-suopes-gold rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1 h-1 bg-suopes-gold rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-suopes-gray bg-suopes-black">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="DIGITE SUA MENSAGEM..."
                  className="w-full bg-suopes-gray/10 border border-suopes-gray p-3 pr-12 text-[10px] font-mono outline-none focus:border-suopes-gold transition-colors text-white"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-suopes-gold text-black flex items-center justify-center rounded-lg hover:bg-white transition-colors disabled:opacity-50"
                >
                  <Send size={14} />
                </button>
              </div>
              <p className="text-[8px] text-suopes-muted text-center mt-2 font-mono tracking-widest">
                SUOPES HQ • CONEXÃO CRIPTOGRAFADA
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão Flutuante */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative",
          isOpen ? "bg-suopes-red text-white rotate-90" : "bg-black text-suopes-gold border border-suopes-gray"
        )}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90 }} animate={{ rotate: 0 }} exit={{ rotate: 90 }}>
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="relative">
              <MessageSquare size={24} />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-suopes-red rounded-full border-2 border-black"></div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Glow effect */}
        {!isOpen && (
          <div className="absolute inset-0 rounded-full bg-suopes-gold/20 animate-ping pointer-events-none"></div>
        )}
      </motion.button>
    </div>
  );
}
