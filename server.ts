import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ZONA SEGURA: Armazenamento persistente fora da pasta de deploy
const HQ_DATA_DIR = path.resolve(__dirname, "..", "suopes_data_HQ");
if (!fs.existsSync(HQ_DATA_DIR)) fs.mkdirSync(HQ_DATA_DIR, { recursive: true });

const PRODUCTS_FILE = path.join(HQ_DATA_DIR, "products.json");
const GALLERY_FILE = path.join(HQ_DATA_DIR, "gallery.json");
const PERSISTENT_UPLOADS_DIR = path.join(HQ_DATA_DIR, "uploads");
if (!fs.existsSync(PERSISTENT_UPLOADS_DIR)) fs.mkdirSync(PERSISTENT_UPLOADS_DIR, { recursive: true });

// Configuração do Banco de Dados MySQL (Hostinger)
const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'u177568398_admin',
  password: process.env.DB_PASSWORD || '88179501Sa@',
  database: process.env.DB_NAME || 'u177568398_suopes',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initializeDatabase() {
  console.log("Tentando conectar ao banco de dados MySQL...");
  console.log(`Configuração: Host=${process.env.DB_HOST || 'localhost'}, User=${process.env.DB_USER || 'u177568398_admin'}, DB=${process.env.DB_NAME || 'u177568398_suopes'}`);
  
  try {
    // Testar conexão
    const connection = await db.getConnection();
    console.log("Conexão com o banco de dados estabelecida com sucesso!");
    connection.release();

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        verified TINYINT(1) DEFAULT 0,
        verification_code VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reset_code VARCHAR(255),
        reset_expires DATETIME
      );
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT 'processando',
        payment_status VARCHAR(50) DEFAULT 'pending',
        total DECIMAL(10,2) NOT NULL,
        shipping_cost DECIMAL(10,2) DEFAULT 0,
        shipping_address TEXT,
        payment_method VARCHAR(50),
        customer_cpf VARCHAR(20),
        customer_phone VARCHAR(50),
        mp_id VARCHAR(255),
        mp_qr_code_base64 LONGTEXT,
        mp_qr_code TEXT
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        image TEXT,
        color VARCHAR(50),
        size VARCHAR(20),
        FOREIGN KEY(order_id) REFERENCES orders(id)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        email VARCHAR(255) PRIMARY KEY,
        phone VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id VARCHAR(255) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // TABELA DE PRODUTOS PERSISTENTE
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100),
        sku VARCHAR(100),
        image TEXT,
        images JSON,
        colors JSON,
        sizes JSON,
        has_sizes TINYINT(1) DEFAULT 0,
        features TEXT,
        care TEXT,
        in_stock TINYINT(1) DEFAULT 1,
        featured TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Adicionar colunas novas em bancos existentes (ignora se já existem)
    const newColumns = [
      "ALTER TABLE products ADD COLUMN sku VARCHAR(100)",
      "ALTER TABLE products ADD COLUMN sizes JSON",
      "ALTER TABLE products ADD COLUMN has_sizes TINYINT(1) DEFAULT 0",
      "ALTER TABLE products ADD COLUMN features TEXT",
      "ALTER TABLE products ADD COLUMN care TEXT",
    ];
    for (const sql of newColumns) {
      try { await db.execute(sql); } catch(e) { /* coluna já existe */ }
    }

    // TABELA DE GALERIA PERSISTENTE
    await db.query(`
      CREATE TABLE IF NOT EXISTS gallery (
        id INT PRIMARY KEY AUTO_INCREMENT,
        image TEXT NOT NULL,
        title VARCHAR(255),
        context TEXT,
        location VARCHAR(255),
        date_string VARCHAR(100),
        sort_order INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Adicionar sort_order em bancos existentes
    try { await db.execute("ALTER TABLE gallery ADD COLUMN sort_order INT DEFAULT 0"); } catch(e) { /* já existe */ }

    const mpActivated = process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN !== "APP_USR-SEU_TOKEN_DE_TESTE_OU_PRODUCAO_AQUI";
    // Migração: Adicionar colunas caso não existam (para sites já em produção)
    try { await db.query("ALTER TABLE orders ADD COLUMN customer_cpf VARCHAR(20)"); } catch (e) {}
    try { await db.query("ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(50)"); } catch (e) {}

    console.log(`MODO MERCADO PAGO: ${mpActivated ? 'REAL (ATIVADO)' : 'MOCK (SIMULADO)'}`);
    console.log(`APP_URL: ${process.env.APP_URL || 'NÃO CONFIGURADO (Webhook pode falhar)'}`);
    
    console.log("Banco de dados MySQL inicializado e tabelas verificadas.");

    // Garantir permissão de Administrador para os e-mails solicitados
    const admins = ['samuelcpaulino@gmail.com', 'habnadabeh@gmail.com', 'fabinparafal762@gmail.com'];
    for (const adminEmail of admins) {
      await db.execute("UPDATE users SET role = 'admin' WHERE email = ?", [adminEmail]);
      console.log(`Permissão de administrador verificada para: ${adminEmail}`);
    }

    // ==========================================
    // MIGRAÇÃO TÁTICA: JSON -> MYSQL
    // ==========================================
    
    // Migrar Produtos
    const [existingProducts]: any = await db.execute("SELECT COUNT(*) as count FROM products");
    if (existingProducts[0].count === 0 && fs.existsSync(PRODUCTS_FILE)) {
      console.log("[MIGRAÇÃO] Iniciando transferência de produtos para o Banco de Dados...");
      try {
        const jsonData = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));
        for (const p of jsonData) {
          await db.execute(
            "INSERT INTO products (id, name, description, price, category, image, images, colors, in_stock, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [p.id, p.name, p.description, p.price, p.category, p.image, JSON.stringify(p.images || []), JSON.stringify(p.colors || []), p.inStock ? 1 : 0, p.featured ? 1 : 0]
          );
        }
        console.log("[MIGRAÇÃO] Produtos transferidos com sucesso!");
      } catch (e) {
        console.error("[MIGRAÇÃO] Erro ao migrar produtos:", e);
      }
    }

    // Migrar Galeria
    const [existingGallery]: any = await db.execute("SELECT COUNT(*) as count FROM gallery");
    if (existingGallery[0].count === 0 && fs.existsSync(GALLERY_FILE)) {
      console.log("[MIGRAÇÃO] Iniciando transferência da galeria para o Banco de Dados...");
      try {
        const jsonData = JSON.parse(fs.readFileSync(GALLERY_FILE, "utf-8"));
        for (const g of jsonData) {
          await db.execute(
            "INSERT INTO gallery (image, title, context, location, date_string) VALUES (?, ?, ?, ?, ?)",
            [g.image, g.title, g.context, g.location, g.date]
          );
        }
        console.log("[MIGRAÇÃO] Galeria transferida com sucesso!");
      } catch (e) {
        console.error("[MIGRAÇÃO] Erro ao migrar galeria:", e);
      }
    }

  } catch (err: any) {
    console.error("ERRO CRÍTICO NO BANCO DE DADOS:");
    console.error(`Mensagem: ${err.message}`);
    console.error(`Código Erro: ${err.code}`);
    console.error(`Stack: ${err.stack}`);
  }
}

// Chamar inicialização
initializeDatabase();

// Configuração do Assistente SUOPES (Google Gemini)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function getAssistantContext() {
  try {
    const [products]: any = await db.execute("SELECT id, image, name, description, price, category, features FROM products WHERE in_stock = 1");
    const [gallery]: any = await db.execute("SELECT title, context, location FROM gallery LIMIT 10");
    
    let context = "INFORMAÇÕES DO CATÁLOGO SUOPES (CONTEXTO):\n\n";
    
    context += "--- PRODUTOS DISPONÍVEIS ---\n";
    products.forEach((p: any) => {
      context += `- ID: ${p.id} | Nome: ${p.name} | Categoria: ${p.category} | Preço: R$ ${p.price}\n`;
      if (p.description) context += `  Descrição: ${p.description}\n`;
      if (p.features) context += `  Características: ${p.features}\n`;
    });
    
    context += "\n--- GALERIA OPERACIONAL (MISSÕES) ---\n";
    gallery.forEach((g: any) => {
      context += `- ${g.title}: ${g.context || ''} (Local: ${g.location || 'N/A'})\n`;
    });
    
    return context;
  } catch (error) {
    console.error("Erro ao buscar contexto para o assistente:", error);
    return "Erro ao carregar dados do catálogo.";
  }
}

// Configuração do Transportador de E-mail (SMTP)
let transporter: nodemailer.Transporter;

if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true para porta 465, false para outras portas
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false // Ajuda em ambientes de hospedagem restritos
    }
  });
  console.log("Transporter SMTP configurado para Gmail.");
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
  }).catch(err => console.error("Falha ao criar conta de teste SMTP:", err));
}

// Configure Multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, PERSISTENT_UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  // REDIRECIONAMENTO DE SEGURANÇA: Servir uploads da Zona Segura (Persistente)
  app.use("/uploads", express.static(PERSISTENT_UPLOADS_DIR));

  // Auth API
  app.post("/api/register", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios" });
    }

    try {
      const [users]: any = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (users.length > 0) {
        return res.status(400).json({ message: "E-mail já está em uso" });
      }

      const password_hash = await bcrypt.hash(password, 10);
      const verification_code = Math.floor(100000 + Math.random() * 900000).toString();
      const id = Date.now().toString() + "-" + Math.round(Math.random() * 1000);

      await db.execute(`
        INSERT INTO users (id, name, email, password_hash, verification_code, role, verified)
        VALUES (?, ?, ?, ?, ?, 'user', 0)
      `, [id, name, email, password_hash, verification_code]);

      // O transporter global já está configurado com as credenciais do .env
      const logoPath = path.join(__dirname, 'public/suopes-text-logo.png');
      const attachments = [];
      
      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'suopes-text-logo.png',
          path: logoPath,
          cid: 'suopeslogo'
        });
      }

      const htmlBody = `
        <div style="background-color: #f4f5f6; padding: 40px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-collapse: collapse;">
            <tr>
              <td align="center" style="background-color: #0d0d0d; padding: 30px 20px;">
                <img src="cid:suopeslogo" alt="SUOPES TACTICAL" width="280" style="display: block; margin: 0 auto;" />
              </td>
            </tr>
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
        await transporter.sendMail({
          from: `"SUOPES TACTICAL" <${process.env.SMTP_USER || 'suopestactical@gmail.com'}>`,
          to: email,
          subject: "Seu código de verificação SUOPES",
          html: htmlBody,
          attachments
        });
        console.log(`Código de verificação enviado para: ${email}`);
      } catch (e: any) {
        console.error("ERRO CRÍTICO AO ENVIAR E-MAIL DE VERIFICAÇÃO:", e.message);
        if (e.code === 'EAUTH') {
          console.error("Dica: Verifique se a 'Senha de Aplicativo' no Gmail ainda é válida.");
        }
      }

      res.status(201).json({ message: "Usuário criado. Verifique seu e-mail.", email });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro interno no servidor" });
    }
  });

  app.post("/api/verify", async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: "E-mail e código são necessários" });
    
    try {
      const [users]: any = await db.execute('SELECT id, verification_code FROM users WHERE email = ?', [email]);
      const user = users[0];
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      if (user.verification_code === code) {
        await db.execute('UPDATE users SET verified = 1, verification_code = NULL WHERE id = ?', [user.id]);
        res.json({ message: "E-mail verificado com sucesso!" });
      } else {
        res.status(400).json({ message: "Código inválido" });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao verificar e-mail" });
    }
  });

  app.post("/api/resend-code", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "E-mail é necessário" });

    try {
      const [users]: any = await db.execute('SELECT id, verified FROM users WHERE email = ?', [email]);
      const user = users[0];

      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      if (user.verified) {
        return res.status(400).json({ message: "Este usuário já está verificado." });
      }

      const new_code = Math.floor(100000 + Math.random() * 900000).toString();
      await db.execute('UPDATE users SET verification_code = ? WHERE id = ?', [new_code, user.id]);

      const logoPath = path.join(__dirname, 'public/suopes-text-logo.png');
      const attachments = [];
      if (fs.existsSync(logoPath)) {
        attachments.push({ filename: 'suopes-text-logo.png', path: logoPath, cid: 'suopeslogo' });
      }

      const htmlBody = `
        <div style="background-color: #f4f5f6; padding: 40px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-collapse: collapse;">
            <tr><td align="center" style="background-color: #0d0d0d; padding: 30px 20px;"><img src="cid:suopeslogo" alt="SUOPES TACTICAL" width="280" style="display: block; margin: 0 auto;" /></td></tr>
            <tr>
              <td align="center" style="background-color: #fdfdfd; padding: 40px 30px;">
                <p style="color: #333333; margin: 0 0 15px 0; font-size: 16px; font-weight: bold; text-transform: uppercase;"> NOVO CÓDIGO DE VERIFICAÇÃO </p>
                <div style="color: #555555; margin: 0 0 25px 0; font-size: 14px; line-height: 1.6; text-align: center;">Utilize o novo código abaixo para validar sua credencial tática.</div>
                <div style="background-color: #1a1a1a; color: #ffd700; border: 1px dashed #ffd700; padding: 20px; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;"> ${new_code} </div>
              </td>
            </tr>
          </table>
        </div>
      `;

      await transporter.sendMail({
        from: `"SUOPES TACTICAL" <${process.env.SMTP_USER || 'suopestactical@gmail.com'}>`,
        to: email,
        subject: "Novo código de verificação SUOPES",
        html: htmlBody,
        attachments
      });

      res.json({ message: "Novo código enviado com sucesso!" });
    } catch (err: any) {
      console.error("Erro ao reenviar código:", err.message);
      res.status(500).json({ message: "Erro ao reenviar código." });
    }
  });

  app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "E-mail é necessário" });

    try {
      const [users]: any = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
      const user = users[0];
      if (!user) {
        return res.json({ message: "Se o e-mail existir, um código foi enviado." });
      }

      const reset_code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 15 * 60000);

      await db.execute('UPDATE users SET reset_code = ?, reset_expires = ? WHERE id = ?', [reset_code, expires, user.id]);

      const logoPath = path.join(__dirname, 'public/suopes-text-logo.png');
      const attachments = [];
      
      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'suopes-text-logo.png',
          path: logoPath,
          cid: 'suopeslogo'
        });
      }

      const htmlBody = `
        <div style="background-color: #f4f5f6; padding: 40px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-collapse: collapse;">
            <tr>
              <td align="center" style="background-color: #0d0d0d; padding: 30px 20px;">
                <img src="cid:suopeslogo" alt="SUOPES TACTICAL" width="280" style="display: block; margin: 0 auto;" />
              </td>
            </tr>
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
        await transporter.sendMail({
          from: `"SUOPES TACTICAL" <${process.env.SMTP_USER || 'suopestactical@gmail.com'}>`,
          to: email,
          subject: "Recuperação de Acesso SUOPES",
          html: htmlBody,
          attachments
        });
        console.log(`E-mail de recuperação enviado para: ${email}`);
      } catch (e: any) {
        console.error("ERRO CRÍTICO AO ENVIAR E-MAIL DE RECUPERAÇÃO:", e.message);
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
      const [users]: any = await db.execute('SELECT id, reset_code, reset_expires FROM users WHERE email = ?', [email]);
      const user = users[0];
      if (!user || user.reset_code !== code) {
        return res.status(400).json({ message: "Código inválido" });
      }

      if (new Date(user.reset_expires) < new Date()) {
        return res.status(400).json({ message: "Código expirado" });
      }

      const password_hash = await bcrypt.hash(newPassword, 10);
      await db.execute('UPDATE users SET password_hash = ?, reset_code = NULL, reset_expires = NULL WHERE id = ?', [password_hash, user.id]);

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
      const [users]: any = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
      const user = users[0];
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
        role: ['samuelcpaulino@gmail.com', 'habnadabeh@gmail.com', 'fabinparafal762@gmail.com'].includes(user.email) ? 'admin' : user.role
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro interno no servidor" });
    }
  });

  // API PARA PRODUTOS (MYSQL PERSISTENTE)
  app.get("/api/products", async (req, res) => {
    try {
      const [rows]: any = await db.execute("SELECT * FROM products ORDER BY created_at DESC");
      const mappedProducts = rows.map((p: any) => {
        let images = [p.image, p.image, p.image, p.image];
        let colors: any[] = [];
        let sizes: any[] = [];
        
        try {
          if (p.images) images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
        } catch (e) { console.error("Erro parse imagens:", e); }
        
        try {
          if (p.colors) colors = typeof p.colors === 'string' ? JSON.parse(p.colors) : p.colors;
        } catch (e) { console.error("Erro parse cores:", e); }

        try {
          if (p.sizes) sizes = typeof p.sizes === 'string' ? JSON.parse(p.sizes) : p.sizes;
        } catch (e) { console.error("Erro parse sizes:", e); }

        return {
          ...p,
          inStock: p.in_stock === 1,
          images: Array.isArray(images) ? images : [p.image, p.image, p.image, p.image],
          colors: Array.isArray(colors) ? colors : [],
          sizes: Array.isArray(sizes) ? sizes : [],
          hasSizes: p.has_sizes === 1,
          features: p.features || null,
          care: p.care || null,
          featured: p.featured === 1
        };
      });
      res.json(mappedProducts);
    } catch (err) {
      console.error("Erro ao buscar produtos:", err);
      res.status(500).json({ message: "Erro ao buscar produtos" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const { name, description, price, category, image, featured, inStock } = req.body;
      const id = Date.now().toString();
      const defaultImages = JSON.stringify([image, image, image, image]);
      const defaultColors = JSON.stringify([]);

      await db.execute(
        "INSERT INTO products (id, name, description, price, category, image, images, colors, featured, in_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id, name, description, price, category, image, defaultImages, defaultColors, featured ? 1 : 0, inStock ? 1 : 0]
      );
      res.json({ id, ...req.body });
    } catch (err) {
      console.error("Erro ao criar produto:", err);
      res.status(500).json({ message: "Erro ao criar produto" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, price, category, image, featured, inStock, images, colors, sizes, hasSizes, features, care } = req.body;
      
      const imagesJson = images ? JSON.stringify(images) : JSON.stringify([image, image, image, image]);
      const colorsJson = colors ? JSON.stringify(colors) : JSON.stringify([]);
      const sizesJson = sizes ? JSON.stringify(sizes) : JSON.stringify([]);
      
      await db.execute(
        "UPDATE products SET name = ?, description = ?, price = ?, category = ?, image = ?, featured = ?, in_stock = ?, images = ?, colors = ?, sizes = ?, has_sizes = ?, features = ?, care = ? WHERE id = ?",
        [name, description, price, category, image, featured ? 1 : 0, inStock ? 1 : 0, imagesJson, colorsJson, sizesJson, hasSizes ? 1 : 0, features || null, care || null, id]
      );

      // Retorna o produto atualizado para o frontend
      const [rows]: any = await db.execute("SELECT * FROM products WHERE id = ?", [id]);
      if (rows.length > 0) {
        const p = rows[0];
        let parsedImages = [p.image, p.image, p.image, p.image];
        let parsedColors: any[] = [];
        let parsedSizes: any[] = [];
        try { if (p.images) parsedImages = JSON.parse(p.images); } catch(e) {}
        try { if (p.colors) parsedColors = JSON.parse(p.colors); } catch(e) {}
        try { if (p.sizes) parsedSizes = JSON.parse(p.sizes); } catch(e) {}
        
        res.json({
          ...p,
          inStock: p.in_stock === 1,
          images: Array.isArray(parsedImages) ? parsedImages : [p.image, p.image, p.image, p.image],
          colors: Array.isArray(parsedColors) ? parsedColors : [],
          sizes: Array.isArray(parsedSizes) ? parsedSizes : [],
          hasSizes: p.has_sizes === 1,
          featured: p.featured === 1
        });
      } else {
        res.json({ success: true });
      }
    } catch (err) {
      console.error("Erro ao atualizar produto:", err);
      res.status(500).json({ message: "Erro ao atualizar produto" });
    }
  });

  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Nenhum arquivo enviado" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.execute("DELETE FROM products WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao deletar produto" });
    }
  });

  // Redirecionamento legado para o novo sistema de lista de espera
  app.post("/api/notify", (req, res) => {
    res.redirect(307, "/api/waitlist");
  });

  // Gallery API
  app.get("/api/gallery", async (req, res) => {
    try {
      const [rows] = await db.execute("SELECT * FROM gallery ORDER BY sort_order ASC, id DESC");
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao buscar galeria" });
    }
  });

  // Reorder gallery items
  app.put("/api/gallery/reorder", async (req, res) => {
    try {
      const { orderedIds } = req.body; // array of IDs in the new order
      if (!Array.isArray(orderedIds)) return res.status(400).json({ message: "orderedIds deve ser um array" });
      
      for (let i = 0; i < orderedIds.length; i++) {
        await db.execute("UPDATE gallery SET sort_order = ? WHERE id = ?", [i, orderedIds[i]]);
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Erro ao reordenar galeria:", err);
      res.status(500).json({ message: "Erro ao reordenar galeria" });
    }
  });

  app.post("/api/gallery", async (req, res) => {
    try {
      const { image, title, context, location, date } = req.body;
      await db.execute(
        "INSERT INTO gallery (image, title, context, location, date_string) VALUES (?, ?, ?, ?, ?)",
        [image, title, context, location, date]
      );
      res.json({ success: true, ...req.body });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao criar item na galeria" });
    }
  });

  app.put("/api/gallery/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { image, title, context, location, date } = req.body;
      await db.execute(
        "UPDATE gallery SET image = ?, title = ?, context = ?, location = ?, date_string = ? WHERE id = ?",
        [image, title, context, location, date, id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao atualizar item da galeria" });
    }
  });

  app.delete("/api/gallery/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.execute("DELETE FROM gallery WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao deletar item da galeria" });
    }
  });

  app.post("/api/shipping", (req, res) => {
    const { cep, totalAmount } = req.body;
    if (!cep) return res.status(400).json({ message: "CEP obrigatório" });
    
    // Simulador mock de frete
    const options = [
      { id: "pac", name: "PAC Correios (PROMOÇÃO TESTE)", cost: 0.00, time: "7 a 10 dias úteis" },
      { id: "sedex", name: "SEDEX Míssil (PROMOÇÃO TESTE)", cost: 0.00, time: "2 a 3 dias úteis" }
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

  // ASSISTENTE SUOPES AI API
  app.post("/api/chat", async (req, res) => {
    const { messages } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: "Assistente temporariamente fora de serviço (Chave não configurada)." });
    }

    try {
      const context = await getAssistantContext();
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: `Você é uma Inteligência Artificial de atendimento da loja SUOPES TACTICAL.
        Sua missão é ajudar os clientes a encontrarem produtos, esclarecer especificações técnicas e dar as melhores recomendações com base no seu catálogo.
        
        REGRAS DE CONDUTA:
        1. Fale de maneira natural, educada, clara e objetiva. NUNCA crie listas com marcadores (* ou -), escreva sempre em parágrafos normais contínuos. NÃO use encenações, evite jargões de forma forçada.
        2. OBRIGATÓRIO (PRODUTOS): Sempre que sugerir produtos, insira a tag literal na linha EXATAMENTE ASSIM: [PRODUTO:id]. Exemplo: [PRODUTO:suo-001]. IMPORTANTE: Nunca envolva a tag em negritos (**[PRODUTO:id]**). Deixe-a isolada.
        3. OBRIGATÓRIO (CATEGORIAS E LINKS): Se precisar convidar o cliente a olhar todo o catálogo ou "Ver Categorias", VOCÊ NÃO PODE INVENTAR URLs (ex: nunca envie /category/...). Envie EXATAMENTE E APENAS o link: [Ver Catálogo](/#catalogo). IMPORTANTE: Nunca envolva o hiperlink markdown em negrito e não repita o link duas vezes seguidas.
        4. OBRIGATÓRIO (ATENDIMENTO HUMANO): Se não souber algo, houver um erro, a requisição for muito complexa ou o cliente desejar falar com um humano, pergunte se ele quer ajuda de um humano e envie o link direto do WhatsApp isolado: [Falar com Atendimento Humanizado](https://wa.me/551153047015).
        5. Utilize apenas as informações de catálogo fornecidas abaixo. Nunca invente preços, tamanhos ou detalhes não listados.

        CATÁLOGO E INFORMAÇÕES:
        ${context}`
      });

      // Formatar histórico para o Gemini
      let formattedHistory = messages.slice(0, -1).map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      }));

      // Gemini exige que a primeira mensagem do history seja do 'user'.
      // Como o Assistant manda uma saudação inicial (model), removemos ela.
      if (formattedHistory.length > 0 && formattedHistory[0].role === "model") {
        formattedHistory.shift();
      }

      const chat = model.startChat({
        history: formattedHistory,
      });

      const lastMessage = messages[messages.length - 1].content;
      const result = await chat.sendMessage(lastMessage);
      const response = await result.response;
      const text = response.text();

      res.json({ content: text });
    } catch (error: any) {
      console.error("Erro no chat do assistente:", error);
      res.status(500).json({ message: "Desculpe operador, houve uma falha na comunicação tática.", error: error.message });
    }
  });

  // Restante das rotas...

  app.post("/api/checkout", async (req, res) => {
    const { userId, payerEmail, payerName, cpf, phone, items, shippingAddress, paymentMethod, totalAmount, shippingCost } = req.body;
    
    if (!items || !items.length || !totalAmount) {
      return res.status(400).json({ message: "Carrinho vazio ou inválido" });
    }

    if (!cpf || !phone) {
      return res.status(400).json({ message: "CPF e Telefone são obrigatórios para checkout." });
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
              payer: { email: payerEmail || userId || "cliente@suopes.com" },
              notification_url: process.env.APP_URL ? `${process.env.APP_URL}/api/mp/webhook` : undefined
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

      const query = `
        INSERT INTO orders (id, user_id, customer_name, customer_email, total, shipping_cost, shipping_address, payment_method, customer_cpf, customer_phone, mp_id, mp_qr_code_base64, mp_qr_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await db.execute(query, [
        orderId, 
        userId || "anonymous",
        payerName || "Não informado",
        payerEmail || "Não informado",
        totalAmount, 
        shippingCost || 0,
        JSON.stringify(shippingAddress),
        paymentMethod,
        cpf,
        phone,
        mp_id,
        mp_qr_code_base64,
        mp_qr_code
      ]);

      const itemQuery = `
        INSERT INTO order_items (order_id, product_name, quantity, price, image, color, size)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      for (const item of items) {
        await db.execute(itemQuery, [orderId, item.name, item.quantity, item.price, item.image, item.selectedColor || null, item.selectedSize || null]);
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

      if (type === "payment" && data?.id) {
        const mpPaymentId = data.id.toString();
        
        if (process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN !== "APP_USR-SEU_TOKEN_DE_TESTE_OU_PRODUCAO_AQUI") {
          const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
          const payment = new Payment(client);
          const paymentData = await payment.get({ id: mpPaymentId });
          
          const mpStatus = paymentData.status;
          console.log(`[MP WEBHOOK] Pagamento ${mpPaymentId} => Status: ${mpStatus}`);

          await db.execute("UPDATE orders SET payment_status = ? WHERE mp_id = ?", [mpStatus, mpPaymentId]);
          
          if (mpStatus === "approved") {
            await db.execute("UPDATE orders SET status = 'processando' WHERE mp_id = ? AND status = 'pendente'", [mpPaymentId]);
          }
          if (mpStatus === "cancelled" || mpStatus === "rejected") {
            await db.execute("UPDATE orders SET status = 'cancelado' WHERE mp_id = ?", [mpPaymentId]);
          }
        }
      }

      res.status(200).send("OK");
    } catch (err) {
      console.error("[MP WEBHOOK] Erro:", err);
      res.status(200).send("OK");
    }
  });

  app.get("/api/orders/:id/status", async (req, res) => {
    const { id } = req.params;
    try {
      const [orders]: any = await db.execute("SELECT payment_status, status, mp_id, date FROM orders WHERE id = ?", [id]);
      if (orders.length === 0) return res.status(404).json({ message: "Pedido não encontrado." });
      
      let order = orders[0];
      let currentStatus = order.payment_status;

      // SIMULADOR DE APROVAÇÃO PARA TESTES (MOCK) - REMOVIDO PARA MODO REAL
      if (currentStatus === 'pending' && order.mp_id && order.mp_id.startsWith('MOCK')) {
         // Apenas mantém o status pendente no modo mock se não quisermos simulador
      } else if (currentStatus === 'pending' && order.mp_id && process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN !== "APP_USR-SEU_TOKEN_DE_TESTE_OU_PRODUCAO_AQUI") {
        // Se for um pedido real e tivermos token, tenta verificar no Mercado Pago agora mesmo
        try {
          const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
          const payment = new Payment(client);
          const paymentData = await payment.get({ id: order.mp_id });
          if (paymentData.status === 'approved') {
            await db.execute("UPDATE orders SET payment_status = 'approved', status = 'processando' WHERE id = ?", [id]);
            currentStatus = 'approved';
          } else if (paymentData.status === 'rejected' || paymentData.status === 'cancelled') {
             await db.execute("UPDATE orders SET payment_status = ?, status = 'cancelado' WHERE id = ?", [paymentData.status, id]);
             currentStatus = paymentData.status;
          }
        } catch (mpErr) {
          console.error("Erro ao verificar status MP em tempo real:", mpErr);
        }
      }

      res.json({ success: true, paymentStatus: currentStatus, status: order.status });
    } catch (err) {
      res.status(500).json({ message: "Erro ao consultar status." });
    }
  });

  app.post("/api/admin/orders/:id/check-payment", async (req, res) => {
    const { id } = req.params;
    
    try {
      const [orders]: any = await db.execute("SELECT id, mp_id, payment_method, payment_status FROM orders WHERE id = ?", [id]);
      const order = orders[0];
      if (!order) return res.status(404).json({ message: "Pedido não encontrado." });
      if (!order.mp_id) return res.status(400).json({ message: "Pedido sem ID do Mercado Pago." });

      if (order.mp_id.startsWith("MOCK")) {
        await db.execute("UPDATE orders SET payment_status = 'approved' WHERE id = ?", [id]);
        return res.json({ success: true, paymentStatus: "approved", message: "Pagamento simulado como APROVADO (ambiente de teste)." });
      }

      const accessToken = process.env.MP_ACCESS_TOKEN;
      if (!accessToken || accessToken === "APP_USR-SEU_TOKEN_DE_TESTE_OU_PRODUCAO_AQUI") {
        return res.status(400).json({ message: "Token do MP não configurado." });
      }

      const client = new MercadoPagoConfig({ accessToken });
      const payment = new Payment(client);
      
      const paymentData = await payment.get({ id: order.mp_id });
      const mpStatus = paymentData.status;

      await db.execute("UPDATE orders SET payment_status = ? WHERE id = ?", [mpStatus, id]);
      
      if (mpStatus === "approved") {
        await db.execute("UPDATE orders SET status = 'processando' WHERE id = ? AND status = 'pendente'", [id]);
      }

      res.json({ success: true, paymentStatus: mpStatus });
    } catch (err: any) {
      console.error("Erro ao consultar pagamento:", err);
      res.status(500).json({ message: `Erro ao consultar: ${err.message}` });
    }
  });


  app.get("/api/orders", async (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(401).json({ message: "Não autenticado" });

    try {
      const [orders]: any = await db.execute("SELECT * FROM orders WHERE user_id = ? ORDER BY date DESC", [userId]);
      
      const ordersWithItems = [];
      for (const order of orders) {
        const [items]: any = await db.execute("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
        const mappedItems = items.map((i: any) => ({
          name: i.product_name,
          quantity: i.quantity,
          price: i.price,
          image: i.image,
          color: i.color,
          size: i.size
        }));

        let formattedDate = new Date(order.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
        
        ordersWithItems.push({
          id: order.id,
          date: formattedDate,
          status: order.status,
          paymentStatus: order.payment_status,
          total: order.total,
          shippingCost: order.shipping_cost,
          items: mappedItems,
          trackingCode: null
        });
      }

      res.json(ordersWithItems);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao buscar pedidos" });
    }
  });

  // ADMIN - GESTÃO DE PEDIDOS (LOGÍSTICA)
  app.get("/api/admin/orders", async (req, res) => {
    try {
      const [orders]: any = await db.execute("SELECT * FROM orders ORDER BY date DESC");
      
      const ordersWithItems = [];
      for (const order of orders) {
        const [items]: any = await db.execute("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
        let parsedAddress = null;
        try { parsedAddress = JSON.parse(order.shipping_address); } catch (e) {}
        
        ordersWithItems.push({
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
            email: order.customer_email || order.user_id || "Não informado",
            cpf: order.customer_cpf || "Não informado",
            phone: order.customer_phone || "Não informado"
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
        });
      }
      res.json(ordersWithItems);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao buscar pedidos." });
    }
  });


  app.patch("/api/admin/orders/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ["pendente", "processando", "enviado", "concluido", "cancelado"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Status inválido. Use: ${validStatuses.join(", ")}` });
    }
    try {
      const [result]: any = await db.execute("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
      if (result.affectedRows === 0) return res.status(404).json({ message: "Pedido não encontrado." });
      res.json({ success: true, message: `Status do pedido ${id} atualizado para: ${status.toUpperCase()}` });
    } catch (err) {
      res.status(500).json({ message: "Erro ao atualizar status." });
    }
  });

  // MKT & ENGAGEMENT ENDPOINTS
  app.post("/api/newsletter", async (req, res) => {
    const { email, phone } = req.body;
    if (!email) return res.status(400).json({ message: "E-mail é obrigatório." });
    try {
      // MySQL Equivalent of INSERT OR REPLACE
      await db.execute("REPLACE INTO newsletter_subscribers (email, phone) VALUES (?, ?)", [email, phone || null]);
      res.json({ success: true, message: "Cadastro realizado com sucesso!" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao se inscrever na newsletter." });
    }
  });

  app.post("/api/waitlist", async (req, res) => {
    const { id, sku, name, email, phone, details } = req.body;
    
    // Identificador primário é o SKU, mas usamos o ID como redundância
    const productIdentifier = sku || id;
    
    if (!productIdentifier || !name || !email) {
      return res.status(400).json({ message: "Dados incompletos (ID/SKU, Nome e E-mail são obrigatórios)." });
    }
    try {
      // Registrar na Fila
      await db.execute(
        "INSERT INTO waitlist (product_id, product_name, email, phone, details) VALUES (?, ?, ?, ?, ?)", 
        [productIdentifier, name, email, phone || null, details || null]
      );
      // Auto-inscrever no Broadcast (MySQL Ignore)
      await db.execute("INSERT IGNORE INTO newsletter_subscribers (email, phone) VALUES (?, ?)", [email, phone || null]);
      
      res.json({ success: true, message: "Você será avisado quando o produto chegar!" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao entrar na lista de espera." });
    }
  });

  // ADMIN MKT ENDPOINTS
  app.get("/api/admin/newsletter", async (req, res) => {
    try {
      const [subscribers] = await db.execute("SELECT * FROM newsletter_subscribers ORDER BY created_at DESC");
      res.json(subscribers);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar inscritos." });
    }
  });

  app.get("/api/admin/waitlist", async (req, res) => {
    try {
      const [rows] = await db.execute("SELECT * FROM waitlist ORDER BY created_at DESC");
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao buscar lista de espera." });
    }
  });

  app.post("/api/admin/notify-stock", async (req, res) => {
    const { waitlistId, email, productName, details, imageUrl } = req.body;
    
    try {
      // O transporter global já está configurado no topo do arquivo
      const emailSubject = `SUOPES TACTICAL | ESTOQUE RENOVADO: ${productName}`;
      const htmlBody = `
        <div style="background-color: #f4f5f6; padding: 40px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-collapse: collapse;">
            <tr>
              <td align="center" style="background-color: #0d0d0d; padding: 30px 20px;">
                <img src="cid:suopeslogo" alt="SUOPES TACTICAL" width="280" style="display: block; margin: 0 auto;" />
              </td>
            </tr>
            <tr>
              <td align="center" style="background-color: #1a1a1a; padding: 60px 40px; background-image: linear-gradient(to bottom, #111, #222);">
                <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                  Sua requisição<br>está te esperando.
                </h2>
              </td>
            </tr>
            <tr>
              <td align="center" style="background-color: #fdfdfd; padding: 40px 30px;">
                <p style="color: #333333; margin: 0 0 15px 0; font-size: 14px; line-height: 1.6; font-weight: bold;">
                  Você solicitou um aviso e a missão foi cumprida.
                </p>
                <p style="color: #555555; margin: 0 0 25px 0; font-size: 14px; line-height: 1.6;">
                  O equipamento que você aguardava retornou ao nosso arsenal e está pronto para o envio.
                </p>
              </td>
            </tr>
          </table>
        </div>
      `;

      const logoPath = path.join(__dirname, 'public/suopes-text-logo.png');
      const attachments = [];
      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: 'suopes-text-logo.png',
          path: logoPath,
          cid: 'suopeslogo'
        });
      }

      await transporter.sendMail({
        from: `"SUOPES TACTICAL" <${process.env.SMTP_USER || 'suopestactical@gmail.com'}>`,
        to: email,
        subject: emailSubject,
        html: htmlBody,
        attachments
      });

      await db.execute("DELETE FROM waitlist WHERE id = ?", [waitlistId]);
      res.json({ success: true, message: "Cliente notificado e removido da fila." });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Falha ao notificar o cliente via e-mail." });
    }
  });

  app.get("/api/admin/waitlist", async (req, res) => {
    try {
      const [list] = await db.execute("SELECT * FROM waitlist ORDER BY created_at DESC");
      res.json(list);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar fila de espera." });
    }
  });

  app.post("/api/admin/broadcast", async (req, res) => {
    const { subject, message, testEmail, mode } = req.body;
    if (!subject || !message) return res.status(400).json({ message: "Assunto e mensagem são obrigatórios." });
    
    try {
      let targets: string[] = [];
      if (mode === 'test') {
        if (!testEmail) return res.status(400).json({ message: "E-mail de teste não fornecido." });
        targets = [testEmail];
      } else {
        const [subscribers]: any = await db.execute("SELECT email FROM newsletter_subscribers");
        targets = subscribers.map((s: any) => s.email);
      }

      if (targets.length === 0) return res.status(400).json({ message: "Nenhum destinatário encontrado." });

      let userSmtp = process.env.SMTP_USER;
      let passSmtp = process.env.SMTP_PASS;
      try {
        const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
        const smtpUserMatch = envContent.match(/SMTP_USER="([^"]+)"/);
        const smtpPassMatch = envContent.match(/SMTP_PASS="([^"]+)"/);
        if (smtpUserMatch) userSmtp = smtpUserMatch[1];
        if (smtpPassMatch) passSmtp = smtpPassMatch[1];
      } catch (e) {}

      const dynamicTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: userSmtp, pass: passSmtp },
      });

      let successCount = 0;
      for (const target of targets) {
        try {
          await dynamicTransporter.sendMail({
            from: '"SUOPES TACTICAL" <suopestactical@gmail.com>',
            to: target,
            subject: subject,
            html: message, // Simplificado para fins de refatoração rápida
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
