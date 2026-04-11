import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRODUCTS_FILE = path.join(__dirname, "products.json");
const GALLERY_FILE = path.join(__dirname, "gallery.json");

const db = new Database(path.join(__dirname, "suopes.db"));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    verified INTEGER DEFAULT 0,
    verification_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    customer_name TEXT,
    customer_email TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'processando',
    payment_status TEXT DEFAULT 'pending',
    total REAL NOT NULL,
    shipping_cost REAL DEFAULT 0,
    shipping_address TEXT,
    payment_method TEXT,
    mp_id TEXT,
    mp_qr_code_base64 TEXT,
    mp_qr_code TEXT
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    image TEXT,
    color TEXT,
    size TEXT,
    FOREIGN KEY(order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    email TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

try {
  db.exec("ALTER TABLE users ADD COLUMN reset_code TEXT;");
  db.exec("ALTER TABLE users ADD COLUMN reset_expires DATETIME;");
  console.log("Colunas de reset adicionadas ao banco de dados.");
} catch (err: any) {
  if (!err.message.includes("duplicate column name")) {
    console.error("Erro ao alterar tabela:", err);
  }
}

try {
  db.exec("ALTER TABLE newsletter_subscribers ADD COLUMN phone TEXT;");
} catch (e: any) {}

try {
  db.exec("ALTER TABLE waitlist ADD COLUMN phone TEXT;");
  db.exec("ALTER TABLE waitlist ADD COLUMN details TEXT;");
} catch (e: any) {}

try {
  db.exec("ALTER TABLE orders ADD COLUMN customer_name TEXT;");
  db.exec("ALTER TABLE orders ADD COLUMN customer_email TEXT;");
} catch (e: any) {}

try {
  db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending';");
} catch (e: any) {}

let transporter: nodemailer.Transporter;

if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log("Transporter configurado com Gmail real.");
} else {
  nodemailer.createTestAccount().then(account => {
    transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: {
        user: account.user,
        pass: account.pass,
      },
    });
    console.log("Ethereal test account ready. Check emails at https://ethereal.email");
  }).catch(err => console.error("Failed to create Ethereal account:", err));
}

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

function readProducts() {
  try {
    const data = fs.readFileSync(PRODUCTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading products file:", err);
    return [];
  }
}

function saveProducts(products: any) {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
  } catch (err) {
    console.error("Error saving products file:", err);
  }
}

function readGallery() {
  try {
    if (!fs.existsSync(GALLERY_FILE)) {
      return [
        {
          id: 1,
          image: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?q=80&w=2070&auto=format&fit=crop",
          title: "OPERAÇÃO SOMBRA",
          context: "Treinamento de infiltração noturna em ambiente urbano. O uso do Moletom Recce V2 permitiu baixa assinatura térmica e mobilidade total.",
          location: "SÃO PAULO, BRASIL",
          date: "MAR 2024"
        },
        {
          id: 2,
          image: "https://images.unsplash.com/photo-1508197149814-0cc02e8b7f74?q=80&w=1974&auto=format&fit=crop",
          title: "RECONHECIMENTO ALFA",
          context: "Patrulha de longo alcance em terreno de mata fechada. Equipamento testado sob condições extremas de umidade.",
          location: "AMAZÔNIA, BRASIL",
          date: "JAN 2024"
        },
        {
          id: 3,
          image: "https://images.unsplash.com/photo-1584386161274-91d1fcb0080c?q=80&w=1974&auto=format&fit=crop",
          title: "EXTRAÇÃO URBANA",
          context: "Simulação de resgate de reféns. Foco em agilidade e proteção modular com o Colete Multi-Mission.",
          location: "RIO DE JANEIRO, BRASIL",
          date: "FEV 2024"
        },
        {
          id: 4,
          image: "https://images.unsplash.com/photo-1542332213-31f87348057f?q=80&w=2070&auto=format&fit=crop",
          title: "VIGILÂNCIA ESTÁTICA",
          context: "Ponto de observação avançado. Conforto térmico essencial para longos períodos de inatividade em climas frios.",
          location: "CURITIBA, BRASIL",
          date: "JUL 2023"
        },
        {
          id: 5,
          image: "https://images.unsplash.com/photo-1579803815615-1203fb5a2e9d?q=80&w=2070&auto=format&fit=crop",
          title: "TREINAMENTO CQB",
          context: "Exercícios de combate em ambientes confinados. A ergonomia do vestuário SUOPES garante que o operador não tenha restrições de movimento.",
          location: "CENTRO DE TREINAMENTO TÁTICO",
          date: "DEZ 2023"
        },
        {
          id: 6,
          image: "https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1972&auto=format&fit=crop",
          title: "MISSÃO DESERTO",
          context: "Teste de durabilidade em ambiente árido e abrasivo. Resistência superior contra rasgos e desgaste.",
          location: "NORDESTE, BRASIL",
          date: "OUT 2023"
        }
      ];
    }
    const data = fs.readFileSync(GALLERY_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading gallery file:", err);
    return [];
  }
}

function saveGallery(items: any) {
  try {
    fs.writeFileSync(GALLERY_FILE, JSON.stringify(items, null, 2));
  } catch (err) {
    console.error("Error saving gallery file:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

  // Initial products load
  let products = readProducts();

  // Auth API
  app.post("/api/register", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios" });
    }

    try {
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingUser) {
        return res.status(400).json({ message: "E-mail já está em uso" });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const verification_code = Math.floor(100000 + Math.random() * 900000).toString();
      const id = Date.now().toString() + "-" + Math.round(Math.random() * 1000);

      const stmt = db.prepare(`
        INSERT INTO users (id, name, email, password_hash, verification_code, role, verified)
        VALUES (?, ?, ?, ?, ?, 'user', 0)
      `);
      stmt.run(id, name, email, password_hash, verification_code);

      // Transporter Dinâmico
      const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
      const smtpUserMatch = envContent.match(/SMTP_USER="([^"]+)"/);
      const smtpPassMatch = envContent.match(/SMTP_PASS="([^"]+)"/);
      const user = smtpUserMatch ? smtpUserMatch[1] : process.env.SMTP_USER;
      const pass = smtpPassMatch ? smtpPassMatch[1] : process.env.SMTP_PASS;

      const dynamicTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: user,
          pass: pass,
        },
      });

      const htmlBody = `
        <div style="background-color: #f4f5f6; padding: 40px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-collapse: collapse;">
            <!-- HEADER -->
            <tr>
              <td align="center" style="background-color: #0d0d0d; padding: 30px 20px;">
                <img src="cid:suopeslogo" alt="SUOPES TACTICAL" width="280" style="display: block; margin: 0 auto;" />
              </td>
            </tr>
            <!-- TEXT SECTION -->
            <tr>
              <td align="center" style="background-color: #fdfdfd; padding: 40px 30px;">
                <p style="color: #333333; margin: 0 0 15px 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">
                  VERIFICAÇÃO DE IDENTIDADE
                </p>
                <div style="color: #555555; margin: 0 0 25px 0; font-size: 14px; line-height: 1.6; text-align: center; white-space: pre-wrap;">Para acessar o arsenal, valide sua credencial tática utilizando o código abaixo.</div>
                
                <div style="background-color: #1a1a1a; color: #ffd700; border: 1px dashed #ffd700; padding: 20px; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                  ${verification_code}
                </div>
              </td>
            </tr>
            <!-- FOOTER -->
            <tr>
              <td align="center" style="background-color: #eeeeee; padding: 20px;">
                <p style="color: #999999; margin: 0; font-size: 10px; font-family: monospace; text-transform: uppercase;">
                  Não responda a este e-mail. Gerado pelo sistema HQ Suopes.
                </p>
              </td>
            </tr>
          </table>
        </div>
      `;

      try {
        await dynamicTransporter.sendMail({
          from: '"SUOPES TACTICAL" <suopestactical@gmail.com>',
          to: email,
          subject: "Seu código de verificação SUOPES",
          html: htmlBody,
          attachments: [{
            filename: 'suopes-text-logo.png',
            path: path.join(__dirname, 'public/suopes-text-logo.png'),
            cid: 'suopeslogo'
          }]
        });
      } catch (e) {
        console.error("Erro ao enviar email de verificacao:", e);
      }

      res.status(201).json({ message: "Usuário criado. Verifique seu e-mail.", email });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro interno no servidor" });
    }
  });

  app.post("/api/verify", (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: "E-mail e código são necessários" });
    
    try {
      const user: any = db.prepare('SELECT id, verification_code FROM users WHERE email = ?').get(email);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      if (user.verification_code === code) {
        db.prepare('UPDATE users SET verified = 1, verification_code = NULL WHERE id = ?').run(user.id);
        res.json({ message: "E-mail verificado com sucesso!" });
      } else {
        res.status(400).json({ message: "Código inválido" });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao verificar e-mail" });
    }
  });

  app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "E-mail é necessário" });

    try {
      const user: any = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (!user) {
        // Retornamos OK mesmo se não achar para evitar enumerar usuários (security info-leak)
        return res.json({ message: "Se o e-mail existir, um código foi enviado." });
      }

      const reset_code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 15 * 60000).toISOString(); // 15 minutos

      db.prepare('UPDATE users SET reset_code = ?, reset_expires = ? WHERE id = ?').run(reset_code, expires, user.id);

      // Transporter Dinâmico
      const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
      const smtpUserMatch = envContent.match(/SMTP_USER="([^"]+)"/);
      const smtpPassMatch = envContent.match(/SMTP_PASS="([^"]+)"/);
      const smtpUser = smtpUserMatch ? smtpUserMatch[1] : process.env.SMTP_USER;
      const smtpPass = smtpPassMatch ? smtpPassMatch[1] : process.env.SMTP_PASS;

      const dynamicTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const htmlBody = `
        <div style="background-color: #f4f5f6; padding: 40px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-collapse: collapse;">
            <!-- HEADER -->
            <tr>
              <td align="center" style="background-color: #0d0d0d; padding: 30px 20px;">
                <img src="cid:suopeslogo" alt="SUOPES TACTICAL" width="280" style="display: block; margin: 0 auto;" />
              </td>
            </tr>
            <!-- TEXT SECTION -->
            <tr>
              <td align="center" style="background-color: #fdfdfd; padding: 40px 30px;">
                <p style="color: #333333; margin: 0 0 15px 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">
                  RECUPERAÇÃO DE ACESSO
                </p>
                <div style="color: #555555; margin: 0 0 25px 0; font-size: 14px; line-height: 1.6; text-align: center; white-space: pre-wrap;">Você solicitou a recuperação da sua credencial. Utilize o código de acesso abaixo para redefinir sua senha. Este código expira em 15 minutos.</div>
                
                <div style="background-color: #1a1a1a; color: #ffd700; border: 1px dashed #ffd700; padding: 20px; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                  ${reset_code}
                </div>
              </td>
            </tr>
            <!-- FOOTER -->
            <tr>
              <td align="center" style="background-color: #eeeeee; padding: 20px;">
                <p style="color: #999999; margin: 0; font-size: 10px; font-family: monospace; text-transform: uppercase;">
                  Não responda a este e-mail. Gerado pelo sistema HQ Suopes.
                </p>
              </td>
            </tr>
          </table>
        </div>
      `;

      try {
        await dynamicTransporter.sendMail({
          from: '"SUOPES TACTICAL" <suopestactical@gmail.com>',
          to: email,
          subject: "Recuperação de Acesso SUOPES",
          html: htmlBody,
          attachments: [{
            filename: 'suopes-text-logo.png',
            path: path.join(__dirname, 'public/suopes-text-logo.png'),
            cid: 'suopeslogo'
          }]
        });
      } catch (e) {
        console.error("Erro ao enviar email de recuperacao:", e);
      }

      res.json({ message: "Se o e-mail existir, um código foi enviado." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro interno no servidor" });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ message: "Preencha todos os campos" });

    try {
      const user: any = db.prepare('SELECT id, reset_code, reset_expires FROM users WHERE email = ?').get(email);
      if (!user || user.reset_code !== code) {
        return res.status(400).json({ message: "Código inválido" });
      }

      if (new Date(user.reset_expires) < new Date()) {
        return res.status(400).json({ message: "Código expirado" });
      }

      const password_hash = await bcrypt.hash(newPassword, 10);
      db.prepare('UPDATE users SET password_hash = ?, reset_code = NULL, reset_expires = NULL WHERE id = ?').run(password_hash, user.id);

      res.json({ message: "Senha alterada com sucesso." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro interno no servidor" });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "E-mail e senha são obrigatórios" });

    try {
      const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      if (!user.verified) {
        return res.status(403).json({ message: "Por favor, verifique seu e-mail antes de fazer login", unverified: true });
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro interno no servidor" });
    }
  });

  // Mock API for products
  app.get("/api/products", (req, res) => {
    res.json(products);
  });

  app.post("/api/products", (req, res) => {
    const newProduct = { 
      ...req.body, 
      id: Date.now().toString(),
      images: [req.body.image, req.body.image, req.body.image, req.body.image],
      colors: [],
      inStock: true
    };
    products.push(newProduct);
    saveProducts(products);
    res.json(newProduct);
  });

  app.put("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const updatedProduct = req.body;
    const index = products.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      products[index] = { ...products[index], ...updatedProduct };
      saveProducts(products);
      res.json(products[index]);
    } else {
      res.status(404).json({ message: "Produto não encontrado" });
    }
  });

  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Nenhum arquivo enviado" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });

  app.delete("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const initialLength = products.length;
    products = products.filter((p: any) => p.id !== id);
    
    if (products.length < initialLength) {
      saveProducts(products);
      res.json({ success: true });
    } else {
      res.status(404).json({ message: "Produto não encontrado" });
    }
  });

  app.post("/api/notify", (req, res) => {
    const { productId, productName, color, name, email } = req.body;
    console.log(`Notification request for ${productName} (${color}) from ${name} <${email}>`);
    res.json({ success: true });
  });

  // Gallery API
  let gallery = readGallery();

  app.get("/api/gallery", (req, res) => {
    res.json(gallery);
  });

  app.post("/api/gallery", (req, res) => {
    const newItem = { ...req.body, id: Date.now() };
    gallery.push(newItem);
    saveGallery(gallery);
    res.json(newItem);
  });

  app.put("/api/gallery/:id", (req, res) => {
    const { id } = req.params;
    const updatedItem = req.body;
    const index = gallery.findIndex((item: any) => item.id.toString() === id);
    if (index !== -1) {
      gallery[index] = { ...gallery[index], ...updatedItem };
      saveGallery(gallery);
      res.json(gallery[index]);
    } else {
      res.status(404).json({ message: "Item não encontrado" });
    }
  });

  app.delete("/api/gallery/:id", (req, res) => {
    const { id } = req.params;
    gallery = gallery.filter((item: any) => item.id.toString() !== id);
    saveGallery(gallery);
    res.json({ success: true });
  });

  app.post("/api/shipping", (req, res) => {
    const { cep, totalAmount } = req.body;
    if (!cep) return res.status(400).json({ message: "CEP obrigatório" });
    
    // Simulador mock de frete
    const options = [
      { id: "pac", name: "PAC Correios", cost: 35.00, time: "7 a 10 dias úteis" },
      { id: "sedex", name: "SEDEX Míssil", cost: 65.00, time: "2 a 3 dias úteis" }
    ];

    if (totalAmount && totalAmount >= 399) {
      options.unshift({ 
        id: "free", 
        name: "FRETE GRÁTIS (Transportadora Própria)", 
        cost: 0.00, 
        time: "7 a 14 dias úteis" 
      });
    }

    res.json({ options });
  });

  app.post("/api/checkout", async (req, res) => {
    const { userId, payerEmail, payerName, items, shippingAddress, paymentMethod, totalAmount, shippingCost } = req.body;
    
    if (!items || !items.length || !totalAmount) {
      return res.status(400).json({ message: "Carrinho vazio ou inválido" });
    }

    try {
      const orderId = "ORD-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
      
      let mp_id = null;
      let mp_qr_code_base64 = null;
      let mp_qr_code = null;
      let redirectUrl = null;

      // Integração com Mercado Pago
      if (process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN !== "APP_USR-SEU_TOKEN_DE_TESTE_OU_PRODUCAO_AQUI") {
        const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
        
        if (paymentMethod === "pix") {
          const payment = new Payment(client);
          const result = await payment.create({
            body: {
              transaction_amount: totalAmount,
              description: `SUOPES TACTICAL - Pedido ${orderId}`,
              payment_method_id: "pix",
              external_reference: orderId,
              payer: { email: payerEmail || userId || "cliente@suopes.com" }
            }
          });
          
          mp_id = result.id?.toString() || null;
          mp_qr_code_base64 = result.point_of_interaction?.transaction_data?.qr_code_base64 || null;
          mp_qr_code = result.point_of_interaction?.transaction_data?.qr_code || null;
        } else if (paymentMethod === "credit_card") {
          const preference = new Preference(client);
          const result = await preference.create({
            body: {
              items: [
                {
                  id: orderId,
                  title: `SUOPES TACTICAL - Pedido ${orderId}`,
                  quantity: 1,
                  unit_price: totalAmount
                }
              ],
              external_reference: orderId,
              payer: { email: payerEmail || userId || "cliente@suopes.com" },
              back_urls: {
                success: process.env.APP_URL ? `${process.env.APP_URL}/compras` : "http://localhost:3000/compras",
                failure: process.env.APP_URL ? `${process.env.APP_URL}/checkout` : "http://localhost:3000/checkout"
              },
              auto_return: "approved",
              notification_url: process.env.APP_URL ? `${process.env.APP_URL}/api/mp/webhook` : undefined
            }
          });
          redirectUrl = result.init_point;
          mp_id = result.id?.toString() || null;
        }
      } else {
        // MOCK PARA TESTES QUANDO NÃO TEM TOKEN REAL
        if (paymentMethod === "pix") {
          mp_id = "MOCK-" + Math.floor(Math.random() * 1000000);
          mp_qr_code_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
          mp_qr_code = "00020126440014BR.GOV.BCB.PIX0122suopestactical@gmail.com5204000053039865802BR5915SUOPES TACTICAL6009SAO PAULO62140510ORD" + Math.floor(1000+Math.random()*9000) + "6304XXXX";
        } else if (paymentMethod === "credit_card") {
          mp_id = "MOCK-PREF-" + Math.floor(Math.random() * 1000000);
          redirectUrl = "/compras";
        }
      }

      const stmt = db.prepare(`
        INSERT INTO orders (id, user_id, customer_name, customer_email, total, shipping_cost, shipping_address, payment_method, mp_id, mp_qr_code_base64, mp_qr_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        orderId, 
        userId || "anonymous",
        payerName || "Não informado",
        payerEmail || "Não informado",
        totalAmount, 
        shippingCost || 0,
        JSON.stringify(shippingAddress),
        paymentMethod,
        mp_id,
        mp_qr_code_base64,
        mp_qr_code
      );

      const itemStmt = db.prepare(`
        INSERT INTO order_items (order_id, product_name, quantity, price, image, color, size)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of items) {
        itemStmt.run(orderId, item.name, item.quantity, item.price, item.image, item.selectedColor || null, item.selectedSize || null);
      }

      res.status(201).json({ 
        success: true, 
        orderId, 
        pix: mp_qr_code ? { qr_code: mp_qr_code, qr_code_base64: mp_qr_code_base64 } : null,
        redirectUrl
      });

    } catch (err: any) {
      console.error("Erro no checkout:", err);
      res.status(500).json({ message: "Erro processando pedido de checkout", error: err.message });
    }
  });

  // ============================
  // MERCADO PAGO WEBHOOK (IPN)
  // ============================
  // O MP envia notificações automáticas para esta rota quando o pagamento muda de status.
  // No painel do MP: Seu Negócio -> Configurações -> Webhooks -> URL: https://seudominio.com/api/mp/webhook
  app.post("/api/mp/webhook", async (req, res) => {
    try {
      const { type, data } = req.body;
      console.log("[MP WEBHOOK] Recebido:", type, data);

      // O MP envia o tipo 'payment' quando o status de pagamento muda
      if (type === "payment" && data?.id) {
        const mpPaymentId = data.id.toString();
        
        // Consultar o MP para pegar o status atualizado
        if (process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN !== "APP_USR-SEU_TOKEN_DE_TESTE_OU_PRODUCAO_AQUI") {
          const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
          const payment = new Payment(client);
          const paymentData = await payment.get({ id: mpPaymentId });
          
          const mpStatus = paymentData.status; // approved, pending, rejected, refunded, cancelled, in_process, charged_back
          console.log(`[MP WEBHOOK] Pagamento ${mpPaymentId} => Status: ${mpStatus}`);

          // Atualizar no banco de dados
          const result = db.prepare("UPDATE orders SET payment_status = ? WHERE mp_id = ?").run(mpStatus, mpPaymentId);
          
          // Se aprovado, atualizar o status do pedido para 'processando'
          if (mpStatus === "approved") {
            db.prepare("UPDATE orders SET status = 'processando' WHERE mp_id = ? AND status = 'pendente'").run(mpPaymentId);
          }
          // Se cancelado/rejeitado, marcar o pedido
          if (mpStatus === "cancelled" || mpStatus === "rejected") {
            db.prepare("UPDATE orders SET status = 'cancelado' WHERE mp_id = ?").run(mpPaymentId);
          }

          console.log(`[MP WEBHOOK] Banco atualizado. Linhas afetadas: ${result.changes}`);
        }
      }

      // O MP espera resposta 200 para não reenviar
      res.status(200).send("OK");
    } catch (err) {
      console.error("[MP WEBHOOK] Erro:", err);
      res.status(200).send("OK"); // Sempre retorna 200 para o MP não reenviar
    }
  });

  // CONSULTA MANUAL DE PAGAMENTO (Admin pode verificar status a qualquer momento)
  app.post("/api/admin/orders/:id/check-payment", async (req, res) => {
    const { id } = req.params;
    
    try {
      const order: any = db.prepare("SELECT id, mp_id, payment_method, payment_status FROM orders WHERE id = ?").get(id);
      if (!order) return res.status(404).json({ message: "Pedido não encontrado." });
      if (!order.mp_id) return res.status(400).json({ message: "Pedido sem ID do Mercado Pago." });

      // Se for MOCK, simular status
      if (order.mp_id.startsWith("MOCK")) {
        db.prepare("UPDATE orders SET payment_status = 'approved' WHERE id = ?").run(id);
        return res.json({ success: true, paymentStatus: "approved", message: "Pagamento simulado como APROVADO (ambiente de teste)." });
      }

      const accessToken = process.env.MP_ACCESS_TOKEN;
      if (!accessToken || accessToken === "APP_USR-SEU_TOKEN_DE_TESTE_OU_PRODUCAO_AQUI") {
        return res.status(400).json({ message: "Token do MP não configurado." });
      }

      // Estratégia: Buscar pagamentos pelo external_reference (ID do pedido)
      // Isso funciona tanto para PIX quanto para Cartão de Crédito
      const searchUrl = `https://api.mercadopago.com/v1/payments/search?external_reference=${order.id}&sort=date_created&criteria=desc`;
      const searchRes = await fetch(searchUrl, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        
        if (searchData.results && searchData.results.length > 0) {
          // Pegar o pagamento mais recente
          const latestPayment = searchData.results[0];
          const mpStatus = latestPayment.status || "unknown";
          const statusDetail = latestPayment.status_detail || "";
          
          db.prepare("UPDATE orders SET payment_status = ? WHERE id = ?").run(mpStatus, id);
          
          const statusMap: Record<string, string> = {
            'approved': '✅ PAGO - Pagamento confirmado',
            'pending': '⏳ PENDENTE - Aguardando pagamento',
            'in_process': '⏳ EM ANÁLISE - Pagamento em processamento',
            'rejected': '❌ REJEITADO - Pagamento não aprovado',
            'cancelled': '❌ CANCELADO - Pagamento cancelado',
            'refunded': '↩️ REEMBOLSADO - Valor devolvido ao cliente',
            'charged_back': '⚠️ CHARGEBACK - Contestado pelo cliente'
          };

          return res.json({ 
            success: true, 
            paymentStatus: mpStatus, 
            message: statusMap[mpStatus] || `Status: ${mpStatus.toUpperCase()} (${statusDetail})`
          });
        } else {
          // Nenhum pagamento encontrado para este pedido
          return res.json({ 
            success: true, 
            paymentStatus: "pending", 
            message: "⏳ Nenhum pagamento encontrado ainda para este pedido. O cliente pode não ter finalizado o pagamento."
          });
        }
      } else {
        // Tentar busca direta pelo ID (caso seja um payment ID de PIX)
        try {
          const directUrl = `https://api.mercadopago.com/v1/payments/${order.mp_id}`;
          const directRes = await fetch(directUrl, {
            headers: { "Authorization": `Bearer ${accessToken}` }
          });
          
          if (directRes.ok) {
            const paymentData = await directRes.json();
            const mpStatus = paymentData.status || "unknown";
            db.prepare("UPDATE orders SET payment_status = ? WHERE id = ?").run(mpStatus, id);
            return res.json({ success: true, paymentStatus: mpStatus, message: `Status: ${mpStatus.toUpperCase()}` });
          }
        } catch (e) {}
        
        return res.json({ 
          success: true, 
          paymentStatus: order.payment_status || "pending", 
          message: "Não foi possível consultar o MP agora. Status atual mantido." 
        });
      }
    } catch (err: any) {
      console.error("Erro ao consultar pagamento:", err);
      res.status(500).json({ message: `Erro ao consultar: ${err.message}` });
    }
  });

  app.get("/api/orders", (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    try {
      const orders = db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY date DESC").all(userId);
      const ordersWithItems = orders.map((order: any) => {
        const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
        const mappedItems = items.map((i: any) => ({
          name: i.product_name,
          quantity: i.quantity,
          price: i.price,
          image: i.image,
          color: i.color,
          size: i.size
        }));

        let formattedDate = new Date(order.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
        
        return {
          id: order.id,
          date: formattedDate,
          status: order.status,
          total: order.total,
          items: mappedItems,
          trackingCode: null
        };
      });

      res.json(ordersWithItems);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar pedidos" });
    }
  });

  // ADMIN - GESTÃO DE PEDIDOS (LOGÍSTICA)
  app.get("/api/admin/orders", (req, res) => {
    try {
      const orders: any[] = db.prepare("SELECT * FROM orders ORDER BY date DESC").all();
      const ordersWithItems = orders.map((order: any) => {
        const items: any[] = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
        let parsedAddress = null;
        try { parsedAddress = JSON.parse(order.shipping_address); } catch (e) {}
        
        return {
          id: order.id,
          date: order.date,
          status: order.status,
          paymentStatus: order.payment_status || 'pending',
          total: order.total,
          shippingCost: order.shipping_cost,
          paymentMethod: order.payment_method,
          mpId: order.mp_id,
          customer: {
            name: order.customer_name || "Não informado",
            email: order.customer_email || order.user_id || "Não informado"
          },
          address: parsedAddress,
          items: items.map((i: any) => ({
            name: i.product_name,
            quantity: i.quantity,
            price: i.price,
            image: i.image,
            color: i.color,
            size: i.size
          }))
        };
      });
      res.json(ordersWithItems);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao buscar pedidos." });
    }
  });

  app.patch("/api/admin/orders/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ["pendente", "processando", "enviado", "concluido", "cancelado"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status inválido. Use: ${validStatuses.join(", ")}` });
    }
    try {
      const result = db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
      if (result.changes === 0) return res.status(404).json({ message: "Pedido não encontrado." });
      res.json({ success: true, message: `Status do pedido ${id} atualizado para: ${status.toUpperCase()}` });
    } catch (err) {
      res.status(500).json({ message: "Erro ao atualizar status." });
    }
  });

  // MKT & ENGAGEMENT ENDPOINTS
  app.post("/api/newsletter", (req, res) => {
    const { email, phone } = req.body;
    if (!email) return res.status(400).json({ message: "E-mail é obrigatório." });
    try {
      db.prepare("INSERT OR REPLACE INTO newsletter_subscribers (email, phone) VALUES (?, COALESCE(?, (SELECT phone FROM newsletter_subscribers WHERE email = ?)))").run(email, phone || null, email);
      res.json({ success: true, message: "Cadastro realizado com sucesso!" });
    } catch (err) {
      res.status(500).json({ message: "Erro ao se inscrever na newsletter." });
    }
  });

  app.post("/api/waitlist", (req, res) => {
    const { sku, name, email, phone, details } = req.body;
    if (!sku || !name || !email) return res.status(400).json({ message: "Dados incompletos." });
    try {
      // Registrar na Fila
      db.prepare("INSERT INTO waitlist (product_id, product_name, email, phone, details) VALUES (?, ?, ?, ?, ?)").run(sku, name, email, phone || null, details || null);
      // Auto-inscrever no Broadcast
      db.prepare("INSERT OR IGNORE INTO newsletter_subscribers (email, phone) VALUES (?, ?)").run(email, phone || null);
      
      res.json({ success: true, message: "Você será avisado quando o produto chegar!" });
    } catch (err) {
      res.status(500).json({ message: "Erro ao entrar na lista de espera." });
    }
  });

  // ADMIN MKT ENDPOINTS
  app.get("/api/admin/newsletter", (req, res) => {
    try {
      const subscribers = db.prepare("SELECT * FROM newsletter_subscribers ORDER BY created_at DESC").all();
      res.json(subscribers);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar inscritos." });
    }
  });

  app.post("/api/admin/notify-stock", async (req, res) => {
    const { waitlistId, email, productName, details, imageUrl } = req.body;
    
    try {
      // Forçar leitura direta do disco para driblar o cache do process.env do Node
      const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
      const smtpUserMatch = envContent.match(/SMTP_USER="([^"]+)"/);
      const smtpPassMatch = envContent.match(/SMTP_PASS="([^"]+)"/);
      const user = smtpUserMatch ? smtpUserMatch[1] : process.env.SMTP_USER;
      const pass = smtpPassMatch ? smtpPassMatch[1] : process.env.SMTP_PASS;

      const dynamicTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: user,
          pass: pass,
        },
      });

      const emailSubject = `SUOPES TACTICAL | ESTOQUE RENOVADO: ${productName}`;
      const htmlBody = `
        <div style="background-color: #f4f5f6; padding: 40px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-collapse: collapse;">
            <!-- HEADER -->
            <tr>
              <td align="center" style="background-color: #0d0d0d; padding: 30px 20px;">
                <img src="cid:suopeslogo" alt="SUOPES TACTICAL" width="280" style="display: block; margin: 0 auto;" />
              </td>
            </tr>
            <!-- HERO SECTION -->
            <tr>
              <td align="center" style="background-color: #1a1a1a; padding: 60px 40px; background-image: linear-gradient(to bottom, #111, #222);">
                <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                  Sua requisição<br>está te esperando.
                </h2>
              </td>
            </tr>
            <!-- TEXT SECTION -->
            <tr>
              <td align="center" style="background-color: #fdfdfd; padding: 40px 30px;">
                <p style="color: #333333; margin: 0 0 15px 0; font-size: 14px; line-height: 1.6; font-weight: bold;">
                  Você solicitou um aviso e a missão foi cumprida.
                </p>
                <p style="color: #555555; margin: 0 0 25px 0; font-size: 14px; line-height: 1.6;">
                  O equipamento que você aguardava retornou ao nosso arsenal e está pronto para o envio.<br>Mas a demanda é constante e pode esgotar a qualquer momento.
                </p>
                <p style="color: #333333; margin: 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">
                  Garanta o seu antes que zere!
                </p>
              </td>
            </tr>
            <!-- HIGHLIGHT SECTION WITH IMAGE -->
            <tr>
              <td align="center" style="padding: 0 30px 40px 30px; background-color: #fdfdfd;">
                <div style="background-color: #0d0d0d; border-radius: 4px; padding: 30px;">
                  <p style="color: #ffd700; margin: 0 0 15px 0; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">EQUIPAMENTO DISPONÍVEL</p>
                  
                  ${imageUrl ? `
                    <div style="margin-bottom: 20px; background-color: #ffffff; padding: 10px; display: inline-block; border-radius: 2px;">
                      <img src="${imageUrl}" alt="${productName}" style="max-width: 100%; height: auto; max-height: 250px; display: block; border-radius: 2px;" />
                    </div>
                  ` : ''}

                  <p style="color: #ffffff; margin: 0 0 10px 0; font-size: 18px; font-weight: bold; text-transform: uppercase;">${productName}</p>
                  ${details ? `<p style="color: #aaaaaa; margin: 0 0 20px 0; font-size: 12px; font-family: monospace;">${details}</p>` : ''}
                  <a href="http://localhost:5173" style="display: inline-block; background-color: #ff5722; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; padding: 15px 40px; border-radius: 3px; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;">
                    ACESSAR ARSENAL
                  </a>
                </div>
              </td>
            </tr>
            <!-- FOOTER -->
            <tr>
              <td align="center" style="background-color: #eeeeee; padding: 20px;">
                <p style="color: #999999; margin: 0; font-size: 10px; font-family: monospace; text-transform: uppercase;">
                  Não responda a este e-mail. Gerado pelo sistema HQ Suopes.
                </p>
              </td>
            </tr>
          </table>
        </div>
      `;

      await dynamicTransporter.sendMail({
        from: '"SUOPES TACTICAL" <suopestactical@gmail.com>',
        to: email,
        subject: emailSubject,
        html: htmlBody,
        attachments: [{
          filename: 'suopes-text-logo.png',
          path: path.join(__dirname, 'public/suopes-text-logo.png'),
          cid: 'suopeslogo'
        }]
      });

      // Se enviou o e-mail, exclui da waitlist
      db.prepare("DELETE FROM waitlist WHERE id = ?").run(waitlistId);

      res.json({ success: true, message: "Cliente notificado e removido da fila." });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Falha ao notificar o cliente via e-mail." });
    }
  });

  app.get("/api/admin/waitlist", (req, res) => {
    try {
      const list = db.prepare("SELECT * FROM waitlist ORDER BY created_at DESC").all();
      res.json(list);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar fila de espera." });
    }
  });

  app.post("/api/admin/broadcast", async (req, res) => {
    const { subject, message, testEmail, mode } = req.body;
    // mode: 'test' ou 'all'
    if (!subject || !message) return res.status(400).json({ message: "Assunto e mensagem são obrigatórios." });
    
    try {
      let targets: string[] = [];
      if (mode === 'test') {
        if (!testEmail) return res.status(400).json({ message: "E-mail de teste não fornecido." });
        targets = [testEmail];
      } else {
        const subscribers: any[] = db.prepare("SELECT email FROM newsletter_subscribers").all();
        targets = subscribers.map(s => s.email);
      }

      if (targets.length === 0) return res.status(400).json({ message: "Nenhum destinatário encontrado." });

      // Transporter Dinâmico para o Broadcast também
      const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
      const smtpUserMatch = envContent.match(/SMTP_USER="([^"]+)"/);
      const smtpPassMatch = envContent.match(/SMTP_PASS="([^"]+)"/);
      const user = smtpUserMatch ? smtpUserMatch[1] : process.env.SMTP_USER;
      const pass = smtpPassMatch ? smtpPassMatch[1] : process.env.SMTP_PASS;

      const dynamicTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: user,
          pass: pass,
        },
      });

      const emailSubject = subject;
      const htmlBody = `
        <div style="background-color: #f4f5f6; padding: 40px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-collapse: collapse;">
            <!-- HEADER -->
            <tr>
              <td align="center" style="background-color: #0d0d0d; padding: 30px 20px;">
                <img src="cid:suopeslogo" alt="SUOPES TACTICAL" width="280" style="display: block; margin: 0 auto;" />
              </td>
            </tr>
            <!-- TEXT SECTION -->
            <tr>
              <td align="center" style="background-color: #fdfdfd; padding: 40px 30px;">
                <p style="color: #333333; margin: 0 0 15px 0; font-size: 16px; font-weight: bold; text-transform: uppercase;">
                  ${subject}
                </p>
                <div style="color: #555555; margin: 0 0 25px 0; font-size: 14px; line-height: 1.6; text-align: left; white-space: pre-wrap;">
                  ${message}
                </div>
                <a href="http://localhost:5173" style="display: inline-block; background-color: #ff5722; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; padding: 15px 40px; border-radius: 3px; text-transform: uppercase; letter-spacing: 1px; margin-top: 15px;">
                  ACESSAR O ARSENAL
                </a>
              </td>
            </tr>
            <!-- FOOTER -->
            <tr>
              <td align="center" style="background-color: #eeeeee; padding: 20px;">
                <p style="color: #999999; margin: 0; font-size: 10px; font-family: monospace; text-transform: uppercase;">
                  Não responda a este e-mail. Gerado pelo sistema HQ Suopes.
                </p>
              </td>
            </tr>
          </table>
        </div>
      `;

      let successCount = 0;
      for (const target of targets) {
        try {
          await dynamicTransporter.sendMail({
            from: '"SUOPES TACTICAL" <suopestactical@gmail.com>',
            to: target,
            subject: emailSubject,
            html: htmlBody,
            attachments: [{
              filename: 'suopes-text-logo.png',
              path: path.join(__dirname, 'public/suopes-text-logo.png'),
              cid: 'suopeslogo'
            }]
          });
          successCount++;
        } catch (e) {
          console.error("Failed to send to", target, e);
        }
      }

      res.json({ success: true, sent: successCount, total: targets.length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro interno no broadcast." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
