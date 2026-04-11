/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import { Home } from "./pages/Home";
import { ProductDetail } from "./pages/ProductDetail";
import { OperationalGallery } from "./pages/OperationalGallery";
import { ClientOrders } from "./pages/ClientOrders";
import { LegalPages } from "./pages/LegalPages";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Verify } from "./pages/Verify";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Checkout } from "./pages/Checkout";
import { Admin } from "./pages/Admin";
import { Cart } from "./components/Cart";
import { MusicPlayer } from "./components/MusicPlayer";
import { Product, CartItem, User } from "./types";
import { Facebook, Instagram, Youtube, Linkedin, ArrowRight } from "lucide-react";

export default function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("suopes_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem("suopes_user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("suopes_user");
  };

  const addToCart = (product: Product & { selectedColor?: string; selectedSize?: string }) => {
    setCart(prev => {
      const existing = prev.find(item => 
        item.id === product.id && 
        item.selectedColor === product.selectedColor && 
        item.selectedSize === product.selectedSize
      );
      if (existing) {
        return prev.map(item => 
          (item.id === product.id && 
           item.selectedColor === product.selectedColor && 
           item.selectedSize === product.selectedSize) 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string, color?: string, size?: string) => {
    setCart(prev => prev.filter(item => 
      !(item.id === id && item.selectedColor === color && item.selectedSize === size)
    ));
  };

  const updateQuantity = (id: string, delta: number, color?: string, size?: string) => {
    setCart(prev => prev.map(item => {
      if (item.id === id && item.selectedColor === color && item.selectedSize === size) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navbar 
          cartCount={cart.reduce((acc, item) => acc + item.quantity, 0)} 
          onCartClick={() => setIsCartOpen(true)} 
          user={user}
          onLogout={handleLogout}
        />
        
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home onAddToCart={addToCart} />} />
            <Route path="/product/:id" element={<ProductDetail onAddToCart={addToCart} user={user} />} />
            <Route path="/galeria" element={<OperationalGallery user={user} />} />
            <Route path="/compras" element={<ClientOrders user={user} />} />
            <Route path="/legal" element={<LegalPages />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/checkout" element={<Checkout user={user} cart={cart} clearCart={clearCart} />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>

        <footer className="border-t border-suopes-gray py-20 px-6 mt-20 bg-suopes-black">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16">
            {/* Brand and Newsletter */}
            <div className="lg:col-span-5 space-y-8">
              <Link to="/" className="text-3xl font-black tracking-tighter block">
                SUOPES<span className="text-suopes-gold">TACTICAL</span>
              </Link>
              
              <div className="space-y-4">
                <p className="text-[10px] font-mono tracking-widest text-suopes-muted uppercase leading-relaxed max-w-sm">
                  PROMOÇÕES, NOVIDADES E CONTEÚDOS EXCLUSIVOS. ASSINE NOSSA NEWSLETTER:
                </p>
                <form 
                  className="relative max-w-sm flex flex-col gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.target as HTMLFormElement;
                    const emailInput = form.elements.namedItem('email') as HTMLInputElement;
                    const phoneInput = form.elements.namedItem('phone') as HTMLInputElement;
                    const email = emailInput.value;
                    const phone = phoneInput.value;
                    if (!email || !phone) return;

                    const btn = form.querySelector('button');
                    if (btn) btn.disabled = true;

                    try {
                      const res = await fetch("/api/newsletter", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, phone })
                      });
                      if (res.ok) {
                        emailInput.value = "";
                        phoneInput.value = "";
                        emailInput.placeholder = "INSCRITO COM SUCESSO!";
                        setTimeout(() => { emailInput.placeholder = "DIGITE SEU E-MAIL"; }, 3000);
                      }
                    } catch (err) {
                      console.error(err);
                    } finally {
                      if (btn) btn.disabled = false;
                    }
                  }}
                >
                  <input 
                    name="email"
                    type="email" 
                    required
                    placeholder="DIGITE SEU E-MAIL" 
                    className="w-full bg-suopes-gray/10 border border-suopes-gray p-4 text-[10px] font-mono outline-none focus:border-suopes-gold transition-colors"
                  />
                  <div className="relative">
                    <input 
                      name="phone"
                      type="tel" 
                      required
                      placeholder="WHATSAPP EX: (11) 99999-9999" 
                      className="w-full bg-suopes-gray/10 border border-suopes-gray p-4 pr-12 text-[10px] font-mono outline-none focus:border-suopes-gold transition-colors"
                    />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white text-black flex items-center justify-center rounded-full hover:bg-suopes-gold transition-colors disabled:opacity-50">
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </form>
              </div>

              <div className="flex gap-6 text-suopes-muted">
                <a href="#" className="hover:text-suopes-gold transition-colors"><Facebook size={18} /></a>
                <a href="#" className="hover:text-suopes-gold transition-colors"><Instagram size={18} /></a>
                <a href="#" className="hover:text-suopes-gold transition-colors"><Youtube size={18} /></a>
                <a href="#" className="hover:text-suopes-gold transition-colors"><Linkedin size={18} /></a>
              </div>
            </div>

            {/* Links Columns */}
            <div className="lg:col-span-2 lg:border-l lg:border-suopes-gray lg:pl-12">
              <h4 className="text-[10px] font-mono text-suopes-gold mb-8 tracking-[0.2em] uppercase">SOBRE</h4>
              <ul className="space-y-4 text-[10px] font-mono tracking-widest text-suopes-muted">
                <li><Link to="/galeria" className="hover:text-white transition-colors uppercase">QUEM SOMOS</Link></li>
                <li><Link to="/galeria" className="hover:text-white transition-colors uppercase">GALERIA</Link></li>
              </ul>
            </div>

            <div className="lg:col-span-5">
              <h4 className="text-[10px] font-mono text-suopes-gold mb-8 tracking-[0.2em] uppercase">ATENDIMENTO</h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-[10px] font-mono tracking-widest text-suopes-muted">
                <li><Link to="/legal#envio" className="hover:text-white transition-colors uppercase">TROCAS E DEVOLUÇÕES</Link></li>
                <li><Link to="/legal#atendimento" className="hover:text-white transition-colors uppercase">FALE CONOSCO</Link></li>
                <li><Link to="/legal#privacidade" className="hover:text-white transition-colors uppercase">POLÍTICAS</Link></li>
                <li><Link to="/legal#termos" className="hover:text-white transition-colors uppercase">TERMOS DE USO</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-suopes-gray flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-mono text-suopes-muted">
            <span>© 2024 SUOPES TACTICAL. TODOS OS DIREITOS RESERVADOS.</span>
            <div className="flex gap-8">
              <span className="text-suopes-red">EST. 2024 / PRONTO PARA A MISSÃO</span>
              <span className="hidden md:inline">LAT: 23.5505° S / LNG: 46.6333° W</span>
            </div>
          </div>
        </footer>

        <Cart 
          isOpen={isCartOpen} 
          onClose={() => setIsCartOpen(false)} 
          items={cart} 
          onRemove={removeFromCart}
          onUpdateQuantity={updateQuantity}
        />
        <MusicPlayer />

        {/* WhatsApp Floating Button */}
        <a
          id="whatsapp-btn"
          href="https://wa.me/551153047015?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20SUOPES%20Tactical%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida."
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar no WhatsApp"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            backgroundColor: '#25D366',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(37, 211, 102, 0.5)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            animation: 'whatsapp-pulse 2.5s infinite',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.12)';
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 28px rgba(37, 211, 102, 0.7)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 20px rgba(37, 211, 102, 0.5)';
          }}
        >
          {/* Pulse ring */}
          <span style={{
            position: 'absolute',
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            backgroundColor: 'rgba(37, 211, 102, 0.4)',
            animation: 'whatsapp-ring 2.5s infinite',
          }} />
          {/* WhatsApp SVG Icon */}
          <svg viewBox="0 0 32 32" width="32" height="32" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 .5C7.44.5.5 7.44.5 16c0 2.74.7 5.41 2.04 7.77L.5 31.5l7.95-2.08A15.43 15.43 0 0016 31.5C24.56 31.5 31.5 24.56 31.5 16S24.56.5 16 .5zm0 28.18a13.6 13.6 0 01-6.93-1.9l-.5-.3-5.2 1.36 1.4-5.07-.33-.52A13.65 13.65 0 0116 2.32c7.52 0 13.68 6.16 13.68 13.68 0 7.52-6.16 13.68-13.68 13.68zm7.5-10.23c-.41-.21-2.44-1.2-2.82-1.34-.38-.14-.65-.21-.93.21-.27.41-1.07 1.34-1.31 1.62-.24.27-.48.3-.89.1-.41-.21-1.74-.64-3.31-2.04-1.22-1.09-2.05-2.44-2.29-2.85-.24-.41-.03-.63.18-.84.18-.18.41-.48.62-.72.2-.24.27-.41.41-.69.14-.27.07-.51-.03-.72-.1-.21-.93-2.24-1.27-3.06-.33-.8-.67-.69-.93-.7h-.79c-.27 0-.72.1-1.1.51-.38.41-1.44 1.41-1.44 3.43 0 2.03 1.48 3.99 1.69 4.27.21.27 2.91 4.44 7.06 6.23.99.43 1.76.68 2.36.87.99.32 1.9.27 2.61.16.79-.12 2.44-.99 2.79-1.95.34-.96.34-1.79.24-1.96-.1-.17-.38-.27-.79-.48z"/>
          </svg>
          <style>{`
            @keyframes whatsapp-pulse {
              0%, 100% { box-shadow: 0 4px 20px rgba(37,211,102,0.5); }
              50% { box-shadow: 0 4px 30px rgba(37,211,102,0.8); }
            }
            @keyframes whatsapp-ring {
              0% { transform: scale(1); opacity: 0.6; }
              100% { transform: scale(1.7); opacity: 0; }
            }
          `}</style>
        </a>

      </div>
    </Router>
  );
}

