import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Menu, X, User as UserIcon, LogOut, Plus } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "../types";

interface NavbarProps {
  cartCount: number;
  onCartClick: () => void;
  user: User | null;
  onLogout: () => void;
}

export function Navbar({ cartCount, onCartClick, user, onLogout }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-40 bg-suopes-black/80 backdrop-blur-md border-b border-suopes-gray">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <button 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <Link to="/" className="text-2xl font-black tracking-tighter flex items-center gap-2">
            <img src="/favicon.png" alt="Suopes Logo" className="w-8 h-8 object-contain" />
            <span>SUOPES<span className="text-suopes-gold">TACTICAL</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-xs font-mono tracking-widest">
            <Link to="/" className="hover:text-suopes-gold transition-colors">PRODUTOS</Link>
            <Link to="/galeria" className="hover:text-suopes-gold transition-colors">GALERIA OPERACIONAL</Link>
            {user && (
              <Link to="/compras" className="hover:text-suopes-gold transition-colors">MINHAS COMPRAS</Link>
            )}
            {user?.role === "admin" && (
              <Link to="/admin" className="hover:text-suopes-gold transition-colors flex items-center gap-1">
                PAINEL ADMIN
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] font-mono text-suopes-muted uppercase tracking-widest">Operador</span>
                <span className="text-xs font-bold text-suopes-gold">{user.name}</span>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 hover:bg-suopes-red/10 hover:text-suopes-red transition-colors rounded-full text-suopes-muted"
                title="Sair"
              >
                <LogOut size={20} />
              </button>
            </div>
          ) : (
            <Link 
              to="/login"
              className="p-2 hover:bg-suopes-gray transition-colors rounded-full text-suopes-muted"
              title="Entrar"
            >
              <UserIcon size={20} />
            </Link>
          )}

          <button 
            onClick={onCartClick}
            className="relative p-2 hover:bg-suopes-gray transition-colors rounded-full"
          >
            <ShoppingBag size={20} className="text-suopes-gold" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-suopes-red text-suopes-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-0 w-full bg-suopes-black border-b border-suopes-gray p-6 md:hidden"
          >
            <div className="flex flex-col gap-6 text-sm font-mono tracking-widest">
              <Link to="/" onClick={() => setIsMenuOpen(false)}>PRODUTOS</Link>
              <Link to="/galeria" onClick={() => setIsMenuOpen(false)}>GALERIA OPERACIONAL</Link>
              {user && <Link to="/compras" onClick={() => setIsMenuOpen(false)}>MINHAS COMPRAS</Link>}
              {user?.role === "admin" && <Link to="/admin" onClick={() => setIsMenuOpen(false)}>PAINEL ADMIN</Link>}
              {!user && <Link to="/login" onClick={() => setIsMenuOpen(false)}>ENTRAR</Link>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
