// server.ts
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
import jwt from "jsonwebtoken";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var HQ_DATA_DIR = path.resolve(__dirname, "..", "suopes_data_HQ");
if (!fs.existsSync(HQ_DATA_DIR)) fs.mkdirSync(HQ_DATA_DIR, { recursive: true });
var PRODUCTS_FILE = path.join(HQ_DATA_DIR, "products.json");
var GALLERY_FILE = path.join(HQ_DATA_DIR, "gallery.json");
var PERSISTENT_UPLOADS_DIR = path.join(HQ_DATA_DIR, "uploads");
if (!fs.existsSync(PERSISTENT_UPLOADS_DIR)) fs.mkdirSync(PERSISTENT_UPLOADS_DIR, { recursive: true });
var db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "u177568398_admin",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "u177568398_suopes",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
var JWT_SECRET = process.env.JWT_SECRET || "suopes-super-secret-key-2026-hq";
var authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Acesso negado. Token n\xE3o fornecido." });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Token inv\xE1lido ou expirado." });
    req.user = user;
    next();
  });
};
var requireAdmin = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Acesso negado. Permiss\xF5es de administrador requeridas." });
    }
    next();
  });
};
async function initializeDatabase() {
  console.log("Tentando conectar ao banco de dados MySQL...");
  console.log(`Configura\xE7\xE3o: Host=${process.env.DB_HOST || "localhost"}, User=${process.env.DB_USER || "u177568398_admin"}, DB=${process.env.DB_NAME || "u177568398_suopes"}`);
  try {
    const connection = await db.getConnection();
    console.log("Conex\xE3o com o banco de dados estabelecida com sucesso!");
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
        mp_qr_code TEXT,
        coupon_code VARCHAR(50) DEFAULT NULL,
        coupon_discount DECIMAL(10,2) DEFAULT 0,
        tracking_code VARCHAR(100) DEFAULT NULL,
        carrier VARCHAR(100) DEFAULT NULL
      );
    `);
    try {
      await db.execute("ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50) DEFAULT NULL");
    } catch (e) {
    }
    try {
      await db.execute("ALTER TABLE orders ADD COLUMN coupon_discount DECIMAL(10,2) DEFAULT 0");
    } catch (e) {
    }
    try {
      await db.execute("ALTER TABLE orders ADD COLUMN tracking_code VARCHAR(100) DEFAULT NULL");
    } catch (e) {
    }
    try {
      await db.execute("ALTER TABLE orders ADD COLUMN carrier VARCHAR(100) DEFAULT NULL");
    } catch (e) {
    }
    try {
      await db.execute("UPDATE products SET category = REPLACE(category, 'HEADWEAR', 'BON\xC9S') WHERE category LIKE '%HEADWEAR%'");
      const oldCats = ["LINHA ESPECIAL", "PATCHES", "CAMISAS", "ACESS\xD3RIOS", "EQUIPAMENTO", "VESTU\xC1RIO", "CAL\xC7ADOS", "PROTE\xC7\xC3O"];
      for (const cat of oldCats) {
        await db.execute(`UPDATE products SET category = TRIM(BOTH ',' FROM REPLACE(REPLACE(category, ?, ''), ',,', ',')) WHERE category LIKE ?`, [cat, `%${cat}%`]);
      }
      console.log("[MIGRATION] Limpeza de categorias conclu\xEDda.");
    } catch (e) {
      console.error("[MIGRATION_ERROR]", e);
    }
    await db.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id VARCHAR(255) NOT NULL,
        product_id VARCHAR(255),
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
        stock_quantity INT DEFAULT 10,
        featured TINYINT(1) DEFAULT 0,
        is_presale TINYINT(1) DEFAULT 0,
        presale_date VARCHAR(255) DEFAULT NULL,
        recommended_product_id VARCHAR(255) DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    const newColumns = [
      "ALTER TABLE products ADD COLUMN sku VARCHAR(100)",
      "ALTER TABLE products ADD COLUMN sizes JSON",
      "ALTER TABLE products ADD COLUMN has_sizes TINYINT(1) DEFAULT 0",
      "ALTER TABLE products ADD COLUMN features TEXT",
      "ALTER TABLE products ADD COLUMN care TEXT",
      "ALTER TABLE products ADD COLUMN stock_quantity INT DEFAULT 10",
      "ALTER TABLE products ADD COLUMN is_presale TINYINT(1) DEFAULT 0",
      "ALTER TABLE products ADD COLUMN presale_date VARCHAR(255) DEFAULT NULL",
      "ALTER TABLE order_items ADD COLUMN product_id VARCHAR(255)",
      "ALTER TABLE products ADD COLUMN recommended_product_id VARCHAR(255) DEFAULT NULL"
    ];
    for (const sql of newColumns) {
      try {
        await db.execute(sql);
      } catch (e) {
      }
    }
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
    try {
      await db.execute("ALTER TABLE gallery ADD COLUMN sort_order INT DEFAULT 0");
    } catch (e) {
    }
    try {
      await db.execute("ALTER TABLE coupons ADD COLUMN free_shipping TINYINT(1) DEFAULT 0");
    } catch (e) {
    }
    try {
      await db.execute("ALTER TABLE orders ADD COLUMN mp_payment_url TEXT DEFAULT NULL");
    } catch (e) {
    }
    await db.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INT PRIMARY KEY AUTO_INCREMENT,
        code VARCHAR(50) NOT NULL UNIQUE,
        type ENUM('percentage', 'fixed', 'free_shipping') NOT NULL DEFAULT 'percentage',
        value DECIMAL(10,2) NOT NULL DEFAULT 0,
        min_purchase DECIMAL(10,2) DEFAULT 0,
        max_discount DECIMAL(10,2) DEFAULT NULL,
        max_uses INT DEFAULT NULL,
        current_uses INT DEFAULT 0,
        max_uses_per_user INT DEFAULT NULL,
        applies_to VARCHAR(255) DEFAULT NULL,
        active TINYINT(1) DEFAULT 1,
        starts_at DATETIME DEFAULT NULL,
        expires_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS coupon_uses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        coupon_id INT NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        order_id VARCHAR(255),
        used_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    try {
      await db.execute("ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50) DEFAULT NULL");
    } catch (e) {
    }
    try {
      await db.execute("ALTER TABLE orders ADD COLUMN coupon_discount DECIMAL(10,2) DEFAULT 0");
    } catch (e) {
    }
    const mpActivated = process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN !== "APP_USR-SEU_TOKEN_DE_TESTE_OU_PRODUCAO_AQUI";
    try {
      await db.query("ALTER TABLE orders ADD COLUMN customer_cpf VARCHAR(20)");
    } catch (e) {
    }
    try {
      await db.query("ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(50)");
    } catch (e) {
    }
    console.log(`MODO MERCADO PAGO: ${mpActivated ? "REAL (ATIVADO)" : "MOCK (SIMULADO)"}`);
    console.log(`APP_URL: ${process.env.APP_URL || "N\xC3O CONFIGURADO (Webhook pode falhar)"}`);
    console.log("Banco de dados MySQL inicializado e tabelas verificadas.");
    const admins = ["samuelcpaulino@gmail.com", "habnadabeh@gmail.com", "fabinparafal762@gmail.com"];
    for (const adminEmail of admins) {
      await db.execute("UPDATE users SET role = 'admin' WHERE email = ?", [adminEmail]);
      console.log(`Permiss\xE3o de administrador verificada para: ${adminEmail}`);
    }
    const [existingProducts] = await db.execute("SELECT COUNT(*) as count FROM products");
    if (existingProducts[0].count === 0 && fs.existsSync(PRODUCTS_FILE)) {
      console.log("[MIGRA\xC7\xC3O] Iniciando transfer\xEAncia de produtos para o Banco de Dados...");
      try {
        const jsonData = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));
        for (const p of jsonData) {
          await db.execute(
            "INSERT INTO products (id, name, description, price, category, image, images, colors, in_stock, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [p.id, p.name, p.description, p.price, p.category, p.image, JSON.stringify(p.images || []), JSON.stringify(p.colors || []), p.inStock ? 1 : 0, p.featured ? 1 : 0]
          );
        }
        console.log("[MIGRA\xC7\xC3O] Produtos transferidos com sucesso!");
      } catch (e) {
        console.error("[MIGRA\xC7\xC3O] Erro ao migrar produtos:", e);
      }
    }
    const [existingGallery] = await db.execute("SELECT COUNT(*) as count FROM gallery");
    if (existingGallery[0].count === 0 && fs.existsSync(GALLERY_FILE)) {
      console.log("[MIGRA\xC7\xC3O] Iniciando transfer\xEAncia da galeria para o Banco de Dados...");
      try {
        const jsonData = JSON.parse(fs.readFileSync(GALLERY_FILE, "utf-8"));
        for (const g of jsonData) {
          await db.execute(
            "INSERT INTO gallery (image, title, context, location, date_string) VALUES (?, ?, ?, ?, ?)",
            [g.image, g.title, g.context, g.location, g.date]
          );
        }
        console.log("[MIGRA\xC7\xC3O] Galeria transferida com sucesso!");
      } catch (e) {
        console.error("[MIGRA\xC7\xC3O] Erro ao migrar galeria:", e);
      }
    }
  } catch (err) {
    console.error("ERRO CR\xCDTICO NO BANCO DE DADOS:");
    console.error(`Mensagem: ${err.message}`);
    console.error(`C\xF3digo Erro: ${err.code}`);
    console.error(`Stack: ${err.stack}`);
  }
}
initializeDatabase();
var genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
async function getAssistantContext() {
  try {
    const [products] = await db.execute("SELECT id, image, name, description, price, category, features, in_stock, stock_quantity, colors, sizes, has_sizes FROM products");
    const [gallery] = await db.execute("SELECT title, context, location FROM gallery LIMIT 10");
    let context = "INFORMA\xC7\xD5ES DO CAT\xC1LOGO SUOPES (CONTEXTO):\n\n";
    context += "--- PRODUTOS DISPON\xCDVEIS E ESGOTADOS ---\n";
    products.forEach((p) => {
      let colorsText = "Padr\xE3o";
      try {
        if (p.colors) {
          const cArr = typeof p.colors === "string" ? JSON.parse(p.colors) : p.colors;
          if (Array.isArray(cArr) && cArr.length > 0) {
            colorsText = cArr.map((color) => `${color.name} (${color.inStock !== false ? "Em Estoque" : "Fora de Estoque"})`).join(", ");
          }
        }
      } catch (e) {
      }
      let sizesText = "Tamanho \xDAnico";
      try {
        if (p.has_sizes || p.has_sizes === 1) {
          if (p.sizes) {
            const sArr = typeof p.sizes === "string" ? JSON.parse(p.sizes) : p.sizes;
            if (Array.isArray(sArr) && sArr.length > 0) sizesText = sArr.join(", ");
          }
        }
      } catch (e) {
      }
      const stockStatus = p.stock_quantity > 0 || p.in_stock === 1 ? "EM ESTOQUE" : "ESGOTADO / INDISPON\xCDVEL";
      const availableQty = p.stock_quantity !== void 0 ? p.stock_quantity : 10;
      context += `- ID: ${p.id} | Nome: ${p.name} | Status Geral: ${stockStatus} (${availableQty} unid.) | Pre\xE7o: R$ ${p.price}
`;
      context += `  Categoria: ${p.category} | Cores: ${colorsText} | Tamanhos: ${sizesText}
`;
      if (p.description) context += `  Descri\xE7\xE3o: ${p.description}
`;
      if (p.features) context += `  Caracter\xEDsticas: ${p.features}
`;
    });
    context += "\n--- GALERIA OPERACIONAL (MISS\xD5ES) ---\n";
    gallery.forEach((g) => {
      context += `- ${g.title}: ${g.context || ""} (Local: ${g.location || "N/A"})
`;
    });
    return context;
  } catch (error) {
    console.error("Erro ao buscar contexto para o assistente:", error);
    return "Erro ao carregar dados do cat\xE1logo.";
  }
}
var transporter;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    // true para porta 465, false para outras portas
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
      // Ajuda em ambientes de hospedagem restritos
    }
  });
  console.log("Transporter SMTP configurado para Gmail.");
} else {
  nodemailer.createTestAccount().then((account) => {
    transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: {
        user: account.user,
        pass: account.pass
      }
    });
    console.log("Ethereal test account ready. Check emails at https://ethereal.email");
  }).catch((err) => console.error("Falha ao criar conta de teste SMTP:", err));
}
var SITE_URL = process.env.APP_URL || "https://suopes.com";
function generateOrderEmailHTML(options) {
  const { type, customerName, orderId, items, subtotal, shippingCost, total, couponCode, couponDiscount, shippingAddress, paymentMethod, paymentUrl } = options;
  const isApproved = type === "approved";
  const headline = isApproved ? "PAGAMENTO CONFIRMADO" : "PEDIDO RECEBIDO";
  const subheadline = isApproved ? "Excelente! Seu pagamento foi confirmado com sucesso. Estamos preparando seu equipamento para envio." : "Seu pedido foi registrado com sucesso! Assim que o pagamento for confirmado, iniciaremos a prepara\xE7\xE3o.";
  const statusColor = isApproved ? "#22c55e" : "#d4a843";
  const statusLabel = isApproved ? "APROVADO" : "AGUARDANDO PAGAMENTO";
  const itemsHtml = items.map((item) => {
    const imgSrc = item.image ? item.image.startsWith("http") ? item.image : `${SITE_URL}${item.image}` : "";
    const details = [item.color, item.size].filter(Boolean).join(" / ");
    return `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #2a2a2a;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              ${imgSrc ? `<td width="80" style="vertical-align: top; padding-right: 16px;">
                <img src="${imgSrc}" alt="${item.name}" width="80" height="80" style="display: block; border: 1px solid #333; object-fit: cover;" />
              </td>` : ""}
              <td style="vertical-align: top;">
                <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: #ffffff; font-family: monospace;">${item.name}</p>
                ${details ? `<p style="margin: 0 0 4px 0; font-size: 11px; color: #888; font-family: monospace; text-transform: uppercase;">${details}</p>` : ""}
                <p style="margin: 0; font-size: 12px; color: #888; font-family: monospace;">Qtd: ${item.quantity}</p>
              </td>
              <td style="vertical-align: top; text-align: right; white-space: nowrap;">
                <p style="margin: 0; font-size: 14px; font-weight: bold; color: #d4a843; font-family: monospace;">R$ ${(item.price * item.quantity).toFixed(2)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }).join("");
  let addressHtml = "";
  if (shippingAddress) {
    const addr = typeof shippingAddress === "string" ? JSON.parse(shippingAddress) : shippingAddress;
    addressHtml = `
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 24px; background: #1a1a1a; border: 1px solid #2a2a2a;">
        <tr>
          <td style="padding: 20px;">
            <p style="margin: 0 0 12px 0; font-size: 11px; font-weight: bold; color: #d4a843; font-family: monospace; letter-spacing: 2px;">ENDERE\xC7O DE ENVIO</p>
            <p style="margin: 0; font-size: 13px; color: #ccc; font-family: monospace; line-height: 1.8;">
              ${addr.address || ""}${addr.number ? `, ${addr.number}` : ""}<br/>
              ${addr.neighborhood || ""}<br/>
              ${addr.city || ""} - ${addr.state || ""}<br/>
              CEP: ${addr.cep || ""}
            </p>
          </td>
        </tr>
      </table>`;
  }
  const paymentLabel = paymentMethod === "pix" ? "PIX" : paymentMethod === "credit_card" ? "Cart\xE3o de Cr\xE9dito" : (paymentMethod || "").toUpperCase();
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Helvetica Neue', Arial, sans-serif; color: #ffffff;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #111111; border: 1px solid #2a2a2a;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background: linear-gradient(135deg, #1a1a0a 0%, #111111 100%); border-bottom: 2px solid #d4a843; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 10px; letter-spacing: 4px; color: #d4a843; font-family: monospace;">SUOPES TACTICAL</p>
              <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: 2px;">${headline}</h1>
            </td>
          </tr>

          <!-- Status Badge -->
          <tr>
            <td style="padding: 24px 40px 0 40px; text-align: center;">
              <table cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="background: ${statusColor}15; border: 1px solid ${statusColor}50; padding: 8px 24px; font-size: 10px; font-weight: bold; color: ${statusColor}; font-family: monospace; letter-spacing: 3px;">
                    \u25CF ${statusLabel}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 28px 40px 16px 40px;">
              <p style="margin: 0 0 8px 0; font-size: 16px; color: #ffffff;">Ol\xE1, <strong>${customerName || "Operador"}</strong>!</p>
              <p style="margin: 0; font-size: 14px; color: #999; line-height: 1.6;">${subheadline}</p>
            </td>
          </tr>

          <!-- Order ID -->
          <tr>
            <td style="padding: 0 40px 16px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #1a1a1a; border: 1px solid #2a2a2a;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 11px; color: #888; font-family: monospace; letter-spacing: 2px;">PEDIDO</p>
                    <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: bold; color: #d4a843; font-family: monospace;">${orderId}</p>
                  </td>
                  <td style="padding: 16px 20px; text-align: right;">
                    <p style="margin: 0; font-size: 11px; color: #888; font-family: monospace; letter-spacing: 2px;">PAGAMENTO</p>
                    <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: bold; color: #ffffff; font-family: monospace;">${paymentLabel}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items -->
          <tr>
            <td style="padding: 0 40px;">
              <p style="margin: 0 0 12px 0; font-size: 11px; font-weight: bold; color: #d4a843; font-family: monospace; letter-spacing: 2px;">ITENS DO PEDIDO</p>
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${itemsHtml}
              </table>
            </td>
          </tr>

          <!-- Totals -->
          <tr>
            <td style="padding: 24px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #1a1a1a; border: 1px solid #2a2a2a;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 4px 0; font-size: 12px; color: #888; font-family: monospace;">Subtotal</td>
                        <td style="padding: 4px 0; font-size: 12px; color: #fff; font-family: monospace; text-align: right;">R$ ${subtotal.toFixed(2)}</td>
                      </tr>
                      ${couponCode && couponDiscount && couponDiscount > 0 ? `
                      <tr>
                        <td style="padding: 4px 0; font-size: 12px; color: #22c55e; font-family: monospace;">Cupom (${couponCode})</td>
                        <td style="padding: 4px 0; font-size: 12px; color: #22c55e; font-family: monospace; text-align: right;">- R$ ${couponDiscount.toFixed(2)}</td>
                      </tr>` : ""}
                      <tr>
                        <td style="padding: 4px 0; font-size: 12px; color: #888; font-family: monospace;">Frete</td>
                        <td style="padding: 4px 0; font-size: 12px; color: #fff; font-family: monospace; text-align: right;">${shippingCost === 0 ? '<span style="color: #22c55e; font-weight: bold;">GR\xC1TIS</span>' : `R$ ${shippingCost.toFixed(2)}`}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 8px 0 0 0; border-top: 1px solid #333;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 8px 0; font-size: 16px; font-weight: bold; color: #d4a843; font-family: monospace;">TOTAL</td>
                              <td style="padding: 8px 0; font-size: 16px; font-weight: bold; color: #d4a843; font-family: monospace; text-align: right;">R$ ${total.toFixed(2)}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping Address -->
          <tr>
            <td style="padding: 0 40px;">${addressHtml}</td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 32px 40px; text-align: center;">
              ${!isApproved && paymentUrl ? `
              <p style="margin: 0 0 16px 0; font-size: 13px; color: #999; font-family: monospace;">Se precisar acessar seu pagamento novamente, clique abaixo:</p>
              <a href="${paymentUrl}" style="display: inline-block; padding: 14px 40px; background-color: #d4a843; color: #0a0a0a; text-decoration: none; font-size: 12px; font-weight: bold; letter-spacing: 3px; font-family: monospace; margin-bottom: 12px;">ACESSAR MEU PAGAMENTO</a>
              <br/><br/>
              ` : ""}
              <a href="${SITE_URL}/compras" style="display: inline-block; padding: 14px 40px; background-color: ${isApproved ? "#22c55e" : "#1a1a1a"}; color: ${isApproved ? "#000" : "#d4a843"}; border: 1px solid ${isApproved ? "#22c55e" : "#d4a843"}; text-decoration: none; font-size: 12px; font-weight: bold; letter-spacing: 3px; font-family: monospace;">ACOMPANHAR PEDIDO</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background: #0a0a0a; border-top: 1px solid #2a2a2a; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 10px; color: #555; font-family: monospace; letter-spacing: 2px;">SUOPES TACTICAL \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()}</p>
              <p style="margin: 0; font-size: 10px; color: #444; font-family: monospace;">Equipamento t\xE1tico para o operador moderno.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
async function sendOrderEmail(type, orderId) {
  if (!transporter) {
    console.log("[EMAIL] Transporter n\xE3o configurado, pulando envio.");
    return;
  }
  try {
    const [orders] = await db.execute(
      "SELECT id, customer_name, customer_email, total, shipping_cost, shipping_address, payment_method, coupon_code, coupon_discount, mp_payment_url, mp_qr_code FROM orders WHERE id = ?",
      [orderId]
    );
    if (orders.length === 0) {
      console.log(`[EMAIL] Pedido ${orderId} n\xE3o encontrado.`);
      return;
    }
    const order = orders[0];
    if (!order.customer_email || order.customer_email === "N\xE3o informado") {
      console.log(`[EMAIL] Pedido ${orderId} sem e-mail v\xE1lido.`);
      return;
    }
    const [items] = await db.execute(
      "SELECT product_name, quantity, price, image, color, size FROM order_items WHERE order_id = ?",
      [orderId]
    );
    const emailItems = items.map((item) => ({
      name: item.product_name,
      quantity: item.quantity,
      price: parseFloat(item.price),
      image: item.image || void 0,
      color: item.color || void 0,
      size: item.size || void 0
    }));
    const subtotal = emailItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shippingCost = parseFloat(order.shipping_cost) || 0;
    let paymentUrl = null;
    if (type === "confirmation") {
      if (order.mp_payment_url) {
        paymentUrl = order.mp_payment_url;
      } else if (order.payment_method === "pix" && order.mp_qr_code) {
        paymentUrl = `${SITE_URL}/compras`;
      }
    }
    const html = generateOrderEmailHTML({
      type,
      customerName: order.customer_name,
      orderId: order.id,
      items: emailItems,
      subtotal,
      shippingCost,
      total: parseFloat(order.total),
      couponCode: order.coupon_code,
      couponDiscount: parseFloat(order.coupon_discount) || 0,
      shippingAddress: order.shipping_address,
      paymentMethod: order.payment_method,
      paymentUrl
    });
    const subject = type === "approved" ? `\u2705 Pagamento Confirmado - Pedido ${orderId} | SUOPES TACTICAL` : `\u{1F4E6} Pedido Recebido - ${orderId} | SUOPES TACTICAL`;
    await transporter.sendMail({
      from: `"SUOPES TACTICAL" <${process.env.SMTP_USER || "noreply@suopes.com"}>`,
      to: order.customer_email,
      subject,
      html
    });
    console.log(`[EMAIL] ${type === "approved" ? "Confirma\xE7\xE3o de pagamento" : "Confirma\xE7\xE3o de pedido"} enviado para ${order.customer_email} (Pedido: ${orderId})`);
  } catch (err) {
    console.error(`[EMAIL] Erro ao enviar e-mail para pedido ${orderId}:`, err);
  }
}
var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, PERSISTENT_UPLOADS_DIR);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const cleanExt = path.extname(file.originalname).replace(/[^.a-zA-Z0-9]/g, "");
    cb(null, uniqueSuffix + cleanExt);
  }
});
var fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Tipo de arquivo inv\xE1lido. Apenas JPEG, PNG, WEBP e GIF s\xE3o permitidos."), false);
  }
};
var upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  // 5MB limit
  fileFilter
});
async function startServer() {
  const app = express();
  const PORT = 3e3;
  app.use(express.json({ limit: "1mb" }));
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    // 15 minutes
    max: 1e3,
    // limit each IP to 1000 requests per windowMs
    message: { message: "Muitas requisi\xE7\xF5es deste IP, tente novamente em 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    // 15 minutos
    max: 15,
    // max 15 tentativas de auth/recuperação por janela
    message: { message: "Muitas tentativas de autentica\xE7\xE3o detectadas. Aguarde 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(globalLimiter);
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://http2.mlstatic.com", "https://sdk.mercadopago.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://picsum.photos", "https://http2.mlstatic.com"],
        connectSrc: ["'self'", "https://api.mercadopago.com", "https://generativelanguage.googleapis.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"]
        // Substitui o X-Frame-Options para browsers modernos garantindo que não soframos clickjacking
      }
    },
    crossOriginEmbedderPolicy: false
  }));
  app.use((req, res, next) => {
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=(self)");
    res.removeHeader("X-Powered-By");
    next();
  });
  app.use(cors({
    origin: process.env.APP_URL || "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true
  }));
  app.use("/uploads", express.static(PERSISTENT_UPLOADS_DIR, {
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
    }
  }));
  app.post("/api/register", authLimiter, async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: "Todos os campos s\xE3o obrigat\xF3rios" });
    }
    try {
      const [users] = await db.execute("SELECT id FROM users WHERE email = ?", [email]);
      if (users.length > 0) {
        return res.status(400).json({ message: "E-mail j\xE1 est\xE1 em uso" });
      }
      const password_hash = await bcrypt.hash(password, 10);
      const verification_code = Math.floor(1e5 + Math.random() * 9e5).toString();
      const id = Date.now().toString() + "-" + Math.round(Math.random() * 1e3);
      await db.execute(`
        INSERT INTO users (id, name, email, password_hash, verification_code, role, verified)
        VALUES (?, ?, ?, ?, ?, 'user', 0)
      `, [id, name, email, password_hash, verification_code]);
      const logoPath = path.join(__dirname, "public/suopes-text-logo.png");
      const attachments = [];
      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: "suopes-text-logo.png",
          path: logoPath,
          cid: "suopeslogo"
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
                  VERIFICA\xC7\xC3O DE IDENTIDADE
                </p>
                <div style="color: #555555; margin: 0 0 25px 0; font-size: 14px; line-height: 1.6; text-align: center; white-space: pre-wrap;">Para acessar o arsenal, valide sua credencial t\xE1tica utilizando o c\xF3digo abaixo.</div>
                <div style="background-color: #1a1a1a; color: #ffd700; border: 1px dashed #ffd700; padding: 20px; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                  ${verification_code}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="background-color: #eeeeee; padding: 20px;">
                <p style="color: #999999; margin: 0; font-size: 10px; font-family: monospace; text-transform: uppercase;">
                  N\xE3o responda a este e-mail. Gerado pelo sistema HQ Suopes.
                </p>
              </td>
            </tr>
          </table>
        </div>
      `;
      try {
        await transporter.sendMail({
          from: `"SUOPES TACTICAL" <${process.env.SMTP_USER || "suopestactical@gmail.com"}>`,
          to: email,
          subject: "Seu c\xF3digo de verifica\xE7\xE3o SUOPES",
          html: htmlBody,
          attachments
        });
        console.log(`C\xF3digo de verifica\xE7\xE3o enviado para: ${email}`);
      } catch (e) {
        console.error("ERRO CR\xCDTICO AO ENVIAR E-MAIL DE VERIFICA\xC7\xC3O:", e.message);
        if (e.code === "EAUTH") {
          console.error("Dica: Verifique se a 'Senha de Aplicativo' no Gmail ainda \xE9 v\xE1lida.");
        }
      }
      res.status(201).json({ message: "Usu\xE1rio criado. Verifique seu e-mail.", email });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro interno no servidor" });
    }
  });
  app.post("/api/verify", authLimiter, async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: "E-mail e c\xF3digo s\xE3o necess\xE1rios" });
    try {
      const [users] = await db.execute("SELECT id, verification_code FROM users WHERE email = ?", [email]);
      const user = users[0];
      if (!user) {
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
      }
      if (user.verification_code === code) {
        await db.execute("UPDATE users SET verified = 1, verification_code = NULL WHERE id = ?", [user.id]);
        res.json({ message: "E-mail verificado com sucesso!" });
      } else {
        res.status(400).json({ message: "C\xF3digo inv\xE1lido" });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao verificar e-mail" });
    }
  });
  app.post("/api/resend-code", authLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "E-mail \xE9 necess\xE1rio" });
    try {
      const [users] = await db.execute("SELECT id, verified FROM users WHERE email = ?", [email]);
      const user = users[0];
      if (!user) {
        return res.status(404).json({ message: "Usu\xE1rio n\xE3o encontrado" });
      }
      if (user.verified) {
        return res.status(400).json({ message: "Este usu\xE1rio j\xE1 est\xE1 verificado." });
      }
      const new_code = Math.floor(1e5 + Math.random() * 9e5).toString();
      await db.execute("UPDATE users SET verification_code = ? WHERE id = ?", [new_code, user.id]);
      const logoPath = path.join(__dirname, "public/suopes-text-logo.png");
      const attachments = [];
      if (fs.existsSync(logoPath)) {
        attachments.push({ filename: "suopes-text-logo.png", path: logoPath, cid: "suopeslogo" });
      }
      const htmlBody = `
        <div style="background-color: #f4f5f6; padding: 40px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-collapse: collapse;">
            <tr><td align="center" style="background-color: #0d0d0d; padding: 30px 20px;"><img src="cid:suopeslogo" alt="SUOPES TACTICAL" width="280" style="display: block; margin: 0 auto;" /></td></tr>
            <tr>
              <td align="center" style="background-color: #fdfdfd; padding: 40px 30px;">
                <p style="color: #333333; margin: 0 0 15px 0; font-size: 16px; font-weight: bold; text-transform: uppercase;"> NOVO C\xD3DIGO DE VERIFICA\xC7\xC3O </p>
                <div style="color: #555555; margin: 0 0 25px 0; font-size: 14px; line-height: 1.6; text-align: center;">Utilize o novo c\xF3digo abaixo para validar sua credencial t\xE1tica.</div>
                <div style="background-color: #1a1a1a; color: #ffd700; border: 1px dashed #ffd700; padding: 20px; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;"> ${new_code} </div>
              </td>
            </tr>
          </table>
        </div>
      `;
      await transporter.sendMail({
        from: `"SUOPES TACTICAL" <${process.env.SMTP_USER || "suopestactical@gmail.com"}>`,
        to: email,
        subject: "Novo c\xF3digo de verifica\xE7\xE3o SUOPES",
        html: htmlBody,
        attachments
      });
      res.json({ message: "Novo c\xF3digo enviado com sucesso!" });
    } catch (err) {
      console.error("Erro ao reenviar c\xF3digo:", err.message);
      res.status(500).json({ message: "Erro ao reenviar c\xF3digo." });
    }
  });
  app.post("/api/forgot-password", authLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "E-mail \xE9 necess\xE1rio" });
    try {
      const [users] = await db.execute("SELECT id FROM users WHERE email = ?", [email]);
      const user = users[0];
      if (!user) {
        return res.json({ message: "Se o e-mail existir, um c\xF3digo foi enviado." });
      }
      const reset_code = Math.floor(1e5 + Math.random() * 9e5).toString();
      const expires = new Date(Date.now() + 15 * 6e4);
      await db.execute("UPDATE users SET reset_code = ?, reset_expires = ? WHERE id = ?", [reset_code, expires, user.id]);
      const logoPath = path.join(__dirname, "public/suopes-text-logo.png");
      const attachments = [];
      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: "suopes-text-logo.png",
          path: logoPath,
          cid: "suopeslogo"
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
                   RECUPERA\xC7\xC3O DE ACESSO
                </p>
                <div style="color: #555555; margin: 0 0 25px 0; font-size: 14px; line-height: 1.6; text-align: center; white-space: pre-wrap;">Voc\xEA solicitou a recupera\xE7\xE3o da sua credencial. Utilize o c\xF3digo de acesso abaixo para redefinir sua senha. Este c\xF3digo expira em 15 minutos.</div>
                <div style="background-color: #1a1a1a; color: #ffd700; border: 1px dashed #ffd700; padding: 20px; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                  ${reset_code}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="background-color: #eeeeee; padding: 20px;">
                <p style="color: #999999; margin: 0; font-size: 10px; font-family: monospace; text-transform: uppercase;">
                  N\xE3o responda a este e-mail. Gerado pelo sistema HQ Suopes.
                </p>
              </td>
            </tr>
          </table>
        </div>
      `;
      try {
        await transporter.sendMail({
          from: `"SUOPES TACTICAL" <${process.env.SMTP_USER || "suopestactical@gmail.com"}>`,
          to: email,
          subject: "Recupera\xE7\xE3o de Acesso SUOPES",
          html: htmlBody,
          attachments
        });
        console.log(`E-mail de recupera\xE7\xE3o enviado para: ${email}`);
      } catch (e) {
        console.error("ERRO CR\xCDTICO AO ENVIAR E-MAIL DE RECUPERA\xC7\xC3O:", e.message);
      }
      res.json({ message: "Se o e-mail existir, um c\xF3digo foi enviado." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro interno no servidor" });
    }
  });
  app.post("/api/reset-password", authLimiter, async (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ message: "Preencha todos os campos" });
    try {
      const [users] = await db.execute("SELECT id, reset_code, reset_expires FROM users WHERE email = ?", [email]);
      const user = users[0];
      if (!user || user.reset_code !== code) {
        return res.status(400).json({ message: "C\xF3digo inv\xE1lido" });
      }
      if (new Date(user.reset_expires) < /* @__PURE__ */ new Date()) {
        return res.status(400).json({ message: "C\xF3digo expirado" });
      }
      const password_hash = await bcrypt.hash(newPassword, 10);
      await db.execute("UPDATE users SET password_hash = ?, reset_code = NULL, reset_expires = NULL WHERE id = ?", [password_hash, user.id]);
      res.json({ message: "Senha alterada com sucesso." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro interno no servidor" });
    }
  });
  app.post("/api/login", authLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "E-mail e senha s\xE3o obrigat\xF3rios" });
    try {
      const [users] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
      const user = users[0];
      if (!user) {
        return res.status(401).json({ message: "Credenciais inv\xE1lidas" });
      }
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ message: "Credenciais inv\xE1lidas" });
      }
      if (!user.verified) {
        return res.status(403).json({ message: "Por favor, verifique seu e-mail antes de fazer login", unverified: true });
      }
      const role = ["samuelcpaulino@gmail.com", "habnadabeh@gmail.com", "fabinparafal762@gmail.com"].includes(user.email) ? "admin" : user.role;
      const token = jwt.sign({ id: user.id, email: user.email, role }, JWT_SECRET, { expiresIn: "24h" });
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role,
        token
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro interno no servidor" });
    }
  });
  app.get("/api/products", async (req, res) => {
    try {
      const [rows] = await db.execute("SELECT * FROM products ORDER BY created_at DESC");
      const mappedProducts = rows.map((p) => {
        let images = [p.image, p.image, p.image, p.image];
        let colors = [];
        let sizes = [];
        try {
          if (p.images) images = typeof p.images === "string" ? JSON.parse(p.images) : p.images;
        } catch (e) {
          console.error("Erro parse imagens:", e);
        }
        try {
          if (p.colors) colors = typeof p.colors === "string" ? JSON.parse(p.colors) : p.colors;
        } catch (e) {
          console.error("Erro parse cores:", e);
        }
        try {
          if (p.sizes) sizes = typeof p.sizes === "string" ? JSON.parse(p.sizes) : p.sizes;
        } catch (e) {
          console.error("Erro parse sizes:", e);
        }
        return {
          ...p,
          inStock: p.in_stock === 1,
          images: Array.isArray(images) ? images : [p.image, p.image, p.image, p.image],
          colors: Array.isArray(colors) ? colors : [],
          sizes: Array.isArray(sizes) ? sizes : [],
          hasSizes: p.has_sizes === 1,
          features: p.features || null,
          care: p.care || null,
          stockQuantity: p.stock_quantity !== null && p.stock_quantity !== void 0 ? p.stock_quantity : 0,
          isPresale: p.is_presale === 1,
          presaleDate: p.presale_date || null,
          featured: p.featured === 1,
          recommendedProductId: p.recommended_product_id || null
        };
      });
      res.json(mappedProducts);
    } catch (err) {
      console.error("Erro ao buscar produtos:", err);
      res.status(500).json({ message: "Erro ao buscar produtos" });
    }
  });
  app.post("/api/products", requireAdmin, async (req, res) => {
    try {
      const { name, description, price, category, image, featured, inStock, sku, sizes, hasSizes, features, care, stockQuantity, isPresale, presaleDate, recommendedProductId } = req.body;
      const id = Date.now().toString();
      const defaultImages = JSON.stringify([image, image, image, image]);
      const defaultColors = JSON.stringify([]);
      const sizesJson = sizes ? JSON.stringify(sizes) : JSON.stringify([]);
      const finalStockQuantity = stockQuantity !== void 0 && stockQuantity !== null ? Number(stockQuantity) : 0;
      const finalInStock = finalStockQuantity > 0 ? 1 : 0;
      let autoCategory = category ? category.split(",")[0].substring(0, 3).toUpperCase() : "GER";
      const autoSku = sku && sku.trim() !== "" ? sku : `SUO-${autoCategory}-${id.slice(-6)}`;
      await db.execute(
        "INSERT INTO products (id, name, description, price, category, image, images, colors, sizes, has_sizes, features, care, featured, in_stock, stock_quantity, sku, is_presale, presale_date, recommended_product_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id, name, description, price, category, image, defaultImages, defaultColors, sizesJson, hasSizes ? 1 : 0, features || null, care || null, featured ? 1 : 0, finalInStock, finalStockQuantity, autoSku, isPresale ? 1 : 0, presaleDate || null, recommendedProductId || null]
      );
      res.json({ id, sku: autoSku, ...req.body, stockQuantity: finalStockQuantity, inStock: finalInStock === 1 });
    } catch (err) {
      console.error("Erro ao criar produto:", err);
      res.status(500).json({ message: "Erro ao criar produto" });
    }
  });
  app.put("/api/products/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, price, category, image, featured, inStock, images, colors, sizes, hasSizes, features, care, sku, stockQuantity, isPresale, presaleDate, recommendedProductId } = req.body;
      const imagesJson = images ? JSON.stringify(images) : JSON.stringify([image, image, image, image]);
      const colorsJson = colors ? JSON.stringify(colors) : JSON.stringify([]);
      const sizesJson = sizes ? JSON.stringify(sizes) : JSON.stringify([]);
      const finalStockQuantity = stockQuantity !== void 0 && stockQuantity !== null ? Number(stockQuantity) : 0;
      const finalInStock = finalStockQuantity > 0 ? 1 : 0;
      await db.execute(
        "UPDATE products SET name = ?, description = ?, price = ?, category = ?, image = ?, featured = ?, in_stock = ?, stock_quantity = ?, images = ?, colors = ?, sizes = ?, has_sizes = ?, features = ?, care = ?, sku = ?, is_presale = ?, presale_date = ?, recommended_product_id = ? WHERE id = ?",
        [name, description, price, category, image, featured ? 1 : 0, finalInStock, finalStockQuantity, imagesJson, colorsJson, sizesJson, hasSizes ? 1 : 0, features || null, care || null, sku || null, isPresale ? 1 : 0, presaleDate || null, recommendedProductId || null, id]
      );
      const [rows] = await db.execute("SELECT * FROM products WHERE id = ?", [id]);
      if (rows.length > 0) {
        const p = rows[0];
        let parsedImages = [p.image, p.image, p.image, p.image];
        let parsedColors = [];
        let parsedSizes = [];
        try {
          if (p.images) parsedImages = JSON.parse(p.images);
        } catch (e) {
        }
        try {
          if (p.colors) parsedColors = JSON.parse(p.colors);
        } catch (e) {
        }
        try {
          if (p.sizes) parsedSizes = JSON.parse(p.sizes);
        } catch (e) {
        }
        res.json({
          ...p,
          inStock: p.in_stock === 1,
          images: Array.isArray(parsedImages) ? parsedImages : [p.image, p.image, p.image, p.image],
          colors: Array.isArray(parsedColors) ? parsedColors : [],
          sizes: Array.isArray(parsedSizes) ? parsedSizes : [],
          hasSizes: p.has_sizes === 1,
          stockQuantity: p.stock_quantity !== null && p.stock_quantity !== void 0 ? p.stock_quantity : 0,
          isPresale: p.is_presale === 1,
          presaleDate: p.presale_date || null,
          featured: p.featured === 1,
          recommendedProductId: p.recommended_product_id || null
        });
      } else {
        res.json({ success: true });
      }
    } catch (err) {
      console.error("Erro ao atualizar produto:", err);
      res.status(500).json({ message: "Erro ao atualizar produto" });
    }
  });
  app.post("/api/upload", requireAdmin, upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Nenhum arquivo enviado" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });
  app.delete("/api/products/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await db.execute("DELETE FROM products WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao deletar produto" });
    }
  });
  app.post("/api/notify", (req, res) => {
    res.redirect(307, "/api/waitlist");
  });
  app.get("/api/gallery", async (req, res) => {
    try {
      const [rows] = await db.execute("SELECT *, date_string as date FROM gallery ORDER BY sort_order ASC, id DESC");
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao buscar galeria" });
    }
  });
  app.put("/api/gallery/reorder", async (req, res) => {
    try {
      const { orderedIds } = req.body;
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
  app.get("/api/admin/coupons", requireAdmin, async (req, res) => {
    try {
      const [rows] = await db.execute("SELECT * FROM coupons ORDER BY created_at DESC");
      res.json(rows);
    } catch (err) {
      console.error("Erro ao buscar cupons:", err);
      res.status(500).json({ message: "Erro ao buscar cupons" });
    }
  });
  app.post("/api/admin/coupons", requireAdmin, async (req, res) => {
    try {
      const { code, type, value, minPurchase, maxDiscount, maxUses, maxUsesPerUser, appliesTo, startsAt, expiresAt, freeShipping } = req.body;
      if (!code || !type) {
        return res.status(400).json({ message: "C\xF3digo e tipo s\xE3o obrigat\xF3rios." });
      }
      const [existing] = await db.execute("SELECT id FROM coupons WHERE code = ?", [code.toUpperCase().trim()]);
      if (existing.length > 0) {
        return res.status(409).json({ message: "J\xE1 existe um cupom com este c\xF3digo." });
      }
      await db.execute(
        `INSERT INTO coupons (code, type, value, min_purchase, max_discount, max_uses, max_uses_per_user, applies_to, starts_at, expires_at, free_shipping)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          code.toUpperCase().trim(),
          type,
          value || 0,
          minPurchase || 0,
          maxDiscount || null,
          maxUses || null,
          maxUsesPerUser || null,
          appliesTo || null,
          startsAt || null,
          expiresAt || null,
          freeShipping ? 1 : 0
        ]
      );
      res.status(201).json({ success: true, message: "Cupom criado com sucesso." });
    } catch (err) {
      console.error("Erro ao criar cupom:", err);
      res.status(500).json({ message: "Erro ao criar cupom" });
    }
  });
  app.patch("/api/admin/coupons/:id/toggle", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await db.execute("UPDATE coupons SET active = NOT active WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Erro ao alternar cupom:", err);
      res.status(500).json({ message: "Erro ao alternar cupom" });
    }
  });
  app.delete("/api/admin/coupons/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await db.execute("DELETE FROM coupon_uses WHERE coupon_id = ?", [id]);
      await db.execute("DELETE FROM coupons WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Erro ao deletar cupom:", err);
      res.status(500).json({ message: "Erro ao deletar cupom" });
    }
  });
  app.post("/api/coupons/validate", authenticateToken, async (req, res) => {
    try {
      const { code, subtotal } = req.body;
      const userId = req.user.id;
      if (!code) return res.status(400).json({ message: "C\xF3digo do cupom \xE9 obrigat\xF3rio." });
      const [rows] = await db.execute("SELECT * FROM coupons WHERE code = ?", [code.toUpperCase().trim()]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Cupom n\xE3o encontrado." });
      }
      const coupon = rows[0];
      if (!coupon.active) {
        return res.status(400).json({ message: "Este cupom est\xE1 desativado." });
      }
      if (coupon.starts_at && new Date(coupon.starts_at) > /* @__PURE__ */ new Date()) {
        return res.status(400).json({ message: "Este cupom ainda n\xE3o est\xE1 v\xE1lido." });
      }
      if (coupon.expires_at && new Date(coupon.expires_at) < /* @__PURE__ */ new Date()) {
        return res.status(400).json({ message: "Este cupom j\xE1 expirou." });
      }
      if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
        return res.status(400).json({ message: "Este cupom atingiu o limite m\xE1ximo de usos." });
      }
      if (coupon.max_uses_per_user !== null) {
        const [userUses] = await db.execute(
          "SELECT COUNT(*) as count FROM coupon_uses WHERE coupon_id = ? AND user_id = ?",
          [coupon.id, userId]
        );
        if (userUses[0].count >= coupon.max_uses_per_user) {
          return res.status(400).json({ message: "Voc\xEA j\xE1 utilizou este cupom o m\xE1ximo de vezes permitido." });
        }
      }
      const minPurchase = parseFloat(coupon.min_purchase) || 0;
      if (subtotal < minPurchase) {
        return res.status(400).json({ message: `Compra m\xEDnima de R$ ${minPurchase.toFixed(2)} necess\xE1ria para este cupom.` });
      }
      let discount = 0;
      let freeShipping = coupon.free_shipping === 1 || coupon.type === "free_shipping";
      if (coupon.type === "percentage") {
        discount = subtotal * parseFloat(coupon.value) / 100;
        if (coupon.max_discount !== null) {
          discount = Math.min(discount, parseFloat(coupon.max_discount));
        }
      } else if (coupon.type === "fixed") {
        discount = parseFloat(coupon.value);
        discount = Math.min(discount, subtotal);
      } else if (coupon.type === "free_shipping") {
        freeShipping = true;
        discount = 0;
      }
      let description = "";
      if (coupon.type === "percentage") description = `${coupon.value}% OFF`;
      else if (coupon.type === "fixed") description = `R$ ${parseFloat(coupon.value).toFixed(2)} OFF`;
      else description = "FRETE GR\xC1TIS";
      if (freeShipping && coupon.type !== "free_shipping") description += " + FRETE GR\xC1TIS";
      res.json({
        valid: true,
        couponId: coupon.id,
        code: coupon.code,
        type: coupon.type,
        discount: parseFloat(discount.toFixed(2)),
        freeShipping,
        description
      });
    } catch (err) {
      console.error("Erro ao validar cupom:", err);
      res.status(500).json({ message: "Erro ao validar cupom." });
    }
  });
  app.post("/api/shipping", (req, res) => {
    const { cep, totalAmount } = req.body;
    if (!cep) return res.status(400).json({ message: "CEP obrigat\xF3rio" });
    const options = [
      { id: "pac", name: "PAC Correios", cost: 30, time: "7 a 10 dias \xFAteis" },
      { id: "sedex", name: "SEDEX Correios", cost: 50, time: "2 a 3 dias \xFAteis" }
    ];
    if (totalAmount && totalAmount >= 399) {
      options.unshift({
        id: "free",
        name: "FRETE GR\xC1TIS (Acima de R$399)",
        cost: 0,
        time: "7 a 14 dias \xFAteis"
      });
    }
    res.json({ options });
  });
  app.post("/api/chat", async (req, res) => {
    const { messages } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ message: "Assistente temporariamente fora de servi\xE7o (Chave n\xE3o configurada)." });
    }
    try {
      const context = await getAssistantContext();
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: `Voc\xEA \xE9 uma Intelig\xEAncia Artificial de atendimento da loja SUOPES TACTICAL.
        Sua miss\xE3o \xE9 ajudar os clientes a encontrarem produtos, esclarecer especifica\xE7\xF5es t\xE9cnicas e dar as melhores recomenda\xE7\xF5es com base no seu cat\xE1logo.
        
        REGRAS DE CONDUTA:
        1. Fale de maneira natural, educada, clara e objetiva. NUNCA crie listas enumeradas, t\xF3picos, marcadores (*, -) ou frases soltas terminadas em ponto (.). Escreva SEMPRE em par\xE1grafos normais, diretos e cont\xEDnuos. N\xC3O use encena\xE7\xF5es ou jarg\xF5es for\xE7ados.
        2. POSI\xC7\xC3O DE BOT\xD5ES E LINKS: OBRIGAT\xD3RIO: NUNCA, SOB NENHUMA HIP\xD3TESE, coloque tags [PRODUTO:id] ou links markdown no MEIO do seu par\xE1grafo ou frase. Voc\xEA DEVE primeiro concluir TODO o seu texto e explica\xE7\xE3o e apenas colocar as Tags e Links isolados na \xDALTIMA LINHA da sua resposta.
        3. PRODUTOS: Sempre que sugerir produtos, coloque a tag literal EXATAMENTE ASSIM: [PRODUTO:id] isolada no fim da resposta. Exemplo: [PRODUTO:suo-001]. IMPORTANTE: Nunca envolva a tag em negritos (**[PRODUTO:id]**) e nunca envie mais de dois produtos de uma vez.
        4. CAT\xC1LOGO: N\xC3O fique mandando o usu\xE1rio ver o cat\xE1logo a toda hora. S\xF3 mande se o contexto for de busca estritamente gen\xE9rica. Caso precise, envie APENAS O LINK LITERAL no fim da mensagem: [Ver Cat\xE1logo](/#catalogo).
        5. ATENDIMENTO HUMANO: Ofere\xE7a o humano EXCLUSIVAMENTE para problemas t\xE9cnicos, cancelamentos, ou d\xFAvidas de FABRICA\xC7\xC3O E ORIGEM DOS PRODUTOS (Voc\xEA N\xC3O DEVE responder sobre fabrica\xE7\xE3o, passe para um humano). Pergunte antes, e se o cliente aceitar, mande o link no fim: [Falar com Humano](https://wa.me/551153047015).
        6. ESTOQUE E TAMANHOS: Voc\xEA tem acesso aos produtos ativos E esgotados. Se um cliente perguntar sobre algo esgotado, avise pacientemente que ele est\xE1 indispon\xEDvel momentaneamente. NUNCA diga que n\xE3o temos um produto apenas por ele estar esgotado.
        7. PAGAMENTO E HIST\xD3RICO: Nosso checkout \xE9 via MERCADO PAGO, 100% seguro. Aceitamos Cart\xE3o, PIX e Boleto. Se perguntarem sobre acompanhar um pedido, oriente o cliente a fazer Login e acessar o menu "Minhas Compras" e jogue o bot\xE3o l\xE1 embaixo: [Acessar Pedidos](/compras).
        8. MAPA DO SITE E ROTAS: Se precisar direcionar, coloque o link sempre no final do texto: Login: [Entrar na Conta](/login). Cadastrar: [Criar Conta](/register). Galeria de Opera\xE7\xF5es: [Ver Galeria](/galeria). Legal: [P\xE1gina Legal](/legal).
        9. Utilize apenas as informa\xE7\xF5es de cat\xE1logo fornecidas abaixo. Nunca invente informa\xE7\xF5es.

        CAT\xC1LOGO E INFORMA\xC7\xD5ES:
        ${context}`
      });
      let formattedHistory = messages.slice(0, -1).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }]
      }));
      if (formattedHistory.length > 0 && formattedHistory[0].role === "model") {
        formattedHistory.shift();
      }
      const chat = model.startChat({
        history: formattedHistory
      });
      const lastMessage = messages[messages.length - 1].content;
      const result = await chat.sendMessage(lastMessage);
      const response = await result.response;
      const text = response.text();
      res.json({ content: text });
    } catch (error) {
      console.error("Erro no chat do assistente:", error);
      res.status(500).json({ message: "Desculpe operador, houve uma falha na comunica\xE7\xE3o t\xE1tica.", error: error.message });
    }
  });
  async function restoreStockForOrder(orderId) {
    try {
      const [items] = await db.execute(
        "SELECT product_id, quantity FROM order_items WHERE order_id = ? AND product_id IS NOT NULL",
        [orderId]
      );
      for (const item of items) {
        await db.execute(
          "UPDATE products SET stock_quantity = stock_quantity + ?, in_stock = 1 WHERE id = ?",
          [item.quantity, item.product_id]
        );
        console.log(`[ESTOQUE RESTAURADO] Produto ${item.product_id}: +${item.quantity} unidade(s) devolvida(s) (Pedido ${orderId} cancelado)`);
      }
    } catch (err) {
      console.error(`[ESTOQUE] Erro ao restaurar estoque do pedido ${orderId}:`, err);
    }
  }
  app.post("/api/checkout", authenticateToken, async (req, res) => {
    const { payerEmail, payerName, cpf, phone, items, shippingAddress, paymentMethod, shippingCost, couponCode, couponDiscount, couponFreeShipping } = req.body;
    const userId = req.user.id;
    if (!items || !items.length) {
      return res.status(400).json({ message: "Carrinho vazio ou inv\xE1lido" });
    }
    if (!cpf || !phone) {
      return res.status(400).json({ message: "CPF e Telefone s\xE3o obrigat\xF3rios para checkout." });
    }
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      let calculatedTotal = 0;
      const secureItems = [];
      for (const item of items) {
        const itemQuantity = parseInt(item.quantity) || 1;
        const [rows] = await connection.execute(
          "SELECT id, name, price, stock_quantity, in_stock FROM products WHERE id = ? FOR UPDATE",
          [item.id]
        );
        if (rows.length === 0) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({ message: `Produto ${item.id} n\xE3o encontrado no banco de dados.` });
        }
        const dbProduct = rows[0];
        const realPrice = parseFloat(dbProduct.price);
        const currentStock = dbProduct.stock_quantity !== void 0 ? dbProduct.stock_quantity : 10;
        if (currentStock < itemQuantity) {
          await connection.rollback();
          connection.release();
          return res.status(409).json({
            message: `Estoque insuficiente para "${dbProduct.name}". Dispon\xEDvel: ${currentStock}, Solicitado: ${itemQuantity}.`,
            productId: item.id,
            available: currentStock
          });
        }
        const newStock = currentStock - itemQuantity;
        const newInStock = newStock > 0 ? 1 : 0;
        await connection.execute(
          "UPDATE products SET stock_quantity = ?, in_stock = ? WHERE id = ?",
          [newStock, newInStock, item.id]
        );
        console.log(`[ESTOQUE] Produto ${dbProduct.name}: ${currentStock} -> ${newStock} (Reservado: ${itemQuantity})`);
        calculatedTotal += realPrice * itemQuantity;
        secureItems.push({
          ...item,
          price: realPrice
        });
      }
      const appliedDiscount = parseFloat(couponDiscount || 0);
      if (appliedDiscount > 0) {
        calculatedTotal = Math.max(0, calculatedTotal - appliedDiscount);
      }
      const finalShippingCost = couponFreeShipping ? 0 : parseFloat(shippingCost || 0);
      calculatedTotal += finalShippingCost;
      const orderId = "ORD-" + (/* @__PURE__ */ new Date()).getFullYear() + "-" + Math.floor(1e3 + Math.random() * 9e3);
      let mp_id = null;
      let mp_qr_code_base64 = null;
      let mp_qr_code = null;
      let redirectUrl = null;
      if (process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN !== "APP_USR-SEU_TOKEN_DE_TESTE_OU_PRODUCAO_AQUI") {
        const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
        if (paymentMethod === "pix") {
          const payment = new Payment(client);
          const result = await payment.create({
            body: {
              transaction_amount: calculatedTotal,
              description: `SUOPES TACTICAL - Pedido ${orderId}`,
              payment_method_id: "pix",
              external_reference: orderId,
              payer: { email: payerEmail || userId || "cliente@suopes.com" },
              notification_url: process.env.APP_URL ? `${process.env.APP_URL}/api/mp/webhook` : void 0
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
                  unit_price: calculatedTotal
                }
              ],
              external_reference: orderId,
              payer: { email: payerEmail || userId || "cliente@suopes.com" },
              back_urls: {
                success: process.env.APP_URL ? `${process.env.APP_URL}/compras` : "http://localhost:3000/compras",
                failure: process.env.APP_URL ? `${process.env.APP_URL}/checkout` : "http://localhost:3000/checkout"
              },
              auto_return: "approved",
              notification_url: process.env.APP_URL ? `${process.env.APP_URL}/api/mp/webhook` : void 0
            }
          });
          redirectUrl = result.init_point;
          mp_id = result.id?.toString() || null;
        }
      } else {
        if (paymentMethod === "pix") {
          mp_id = "MOCK-" + Math.floor(Math.random() * 1e6);
          mp_qr_code_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
          mp_qr_code = "00020126440014BR.GOV.BCB.PIX0122suopestactical@gmail.com5204000053039865802BR5915SUOPES TACTICAL6009SAO PAULO62140510ORD" + Math.floor(1e3 + Math.random() * 9e3) + "6304XXXX";
        } else if (paymentMethod === "credit_card") {
          mp_id = "MOCK-PREF-" + Math.floor(Math.random() * 1e6);
          redirectUrl = "/compras";
        }
      }
      const mp_payment_url = paymentMethod === "credit_card" && redirectUrl && !redirectUrl.startsWith("/") ? redirectUrl : null;
      const query = `
        INSERT INTO orders (id, user_id, customer_name, customer_email, total, shipping_cost, shipping_address, payment_method, customer_cpf, customer_phone, mp_id, mp_qr_code_base64, mp_qr_code, coupon_code, coupon_discount, mp_payment_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await connection.execute(query, [
        orderId,
        userId || "anonymous",
        payerName || "N\xE3o informado",
        payerEmail || "N\xE3o informado",
        calculatedTotal,
        finalShippingCost,
        JSON.stringify(shippingAddress),
        paymentMethod,
        cpf,
        phone,
        mp_id,
        mp_qr_code_base64,
        mp_qr_code,
        couponCode || null,
        appliedDiscount,
        mp_payment_url
      ]);
      const itemQuery = `
        INSERT INTO order_items (order_id, product_id, product_name, quantity, price, image, color, size)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      for (const item of secureItems) {
        await connection.execute(itemQuery, [orderId, item.id, item.name, item.quantity, item.price, item.image, item.selectedColor || null, item.selectedSize || null]);
      }
      await connection.commit();
      connection.release();
      if (couponCode) {
        try {
          const [couponRows] = await db.execute("SELECT id FROM coupons WHERE code = ?", [couponCode.toUpperCase().trim()]);
          if (couponRows.length > 0) {
            const couponId = couponRows[0].id;
            await db.execute("INSERT INTO coupon_uses (coupon_id, user_id, order_id) VALUES (?, ?, ?)", [couponId, userId, orderId]);
            await db.execute("UPDATE coupons SET current_uses = current_uses + 1 WHERE id = ?", [couponId]);
            console.log(`[CUPOM] Cupom ${couponCode} utilizado no pedido ${orderId}`);
          }
        } catch (couponErr) {
          console.error("[CUPOM] Erro ao registrar uso do cupom (pedido j\xE1 criado):", couponErr);
        }
      }
      console.log(`[CHECKOUT] Pedido ${orderId} criado com sucesso. Estoque reservado.`);
      sendOrderEmail("confirmation", orderId);
      res.status(201).json({
        success: true,
        orderId,
        pix: mp_qr_code ? { qr_code: mp_qr_code, qr_code_base64: mp_qr_code_base64 } : null,
        redirectUrl
      });
    } catch (err) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
      }
      connection.release();
      console.error("Erro no checkout:", err);
      res.status(500).json({ message: "Erro processando pedido de checkout", error: err.message });
    }
  });
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
          const orderId = paymentData.external_reference;
          console.log(`[MP WEBHOOK] Pagamento ${mpPaymentId} => Status: ${mpStatus}, Order: ${orderId}`);
          const [prevOrders] = await db.execute("SELECT id, payment_status FROM orders WHERE id = ?", [orderId]);
          const prevStatus = prevOrders.length > 0 ? prevOrders[0].payment_status : null;
          await db.execute("UPDATE orders SET payment_status = ?, mp_id = ? WHERE id = ?", [mpStatus, mpPaymentId, orderId]);
          if (mpStatus === "approved") {
            await db.execute("UPDATE orders SET status = 'processando' WHERE id = ? AND status = 'pendente'", [orderId]);
            if (prevStatus !== "approved" && orderId) {
              sendOrderEmail("approved", orderId);
            }
          }
          if ((mpStatus === "cancelled" || mpStatus === "rejected") && prevStatus !== "cancelled" && prevStatus !== "rejected") {
            await db.execute("UPDATE orders SET status = 'cancelado' WHERE id = ?", [orderId]);
            if (orderId) {
              await restoreStockForOrder(orderId);
            }
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
      const [orders] = await db.execute("SELECT payment_status, status, mp_id, date FROM orders WHERE id = ?", [id]);
      if (orders.length === 0) return res.status(404).json({ message: "Pedido n\xE3o encontrado." });
      let order = orders[0];
      let currentStatus = order.payment_status;
      if (currentStatus === "pending" && order.mp_id && order.mp_id.startsWith("MOCK")) {
      } else if (currentStatus === "pending" && process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN !== "APP_USR-SEU_TOKEN_DE_TESTE_OU_PRODUCAO_AQUI") {
        try {
          const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
          const payment = new Payment(client);
          const searchResult = await payment.search({ options: { external_reference: id, limit: 1 } });
          const realPayment = searchResult?.results?.[0];
          if (realPayment) {
            const mpStatus = realPayment.status;
            await db.execute("UPDATE orders SET mp_id = ? WHERE id = ? AND mp_id != ?", [realPayment.id?.toString() || order.mp_id, id, realPayment.id?.toString() || order.mp_id]);
            if (mpStatus === "approved") {
              await db.execute("UPDATE orders SET payment_status = 'approved', status = 'processando' WHERE id = ?", [id]);
              currentStatus = "approved";
              if (order.payment_status !== "approved") {
                sendOrderEmail("approved", id);
              }
            } else if (mpStatus === "rejected" || mpStatus === "cancelled") {
              await db.execute("UPDATE orders SET payment_status = ?, status = 'cancelado' WHERE id = ?", [mpStatus, id]);
              currentStatus = mpStatus;
              if (order.payment_status !== "cancelled" && order.payment_status !== "rejected") {
                await restoreStockForOrder(id);
              }
            }
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
  app.post("/api/admin/orders/:id/check-payment", requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const [orders] = await db.execute("SELECT id, mp_id, payment_method, payment_status FROM orders WHERE id = ?", [id]);
      const order = orders[0];
      if (!order) return res.status(404).json({ message: "Pedido n\xE3o encontrado." });
      if (!order.mp_id) return res.status(400).json({ message: "Pedido sem ID do Mercado Pago." });
      if (order.mp_id.startsWith("MOCK")) {
        await db.execute("UPDATE orders SET payment_status = 'approved' WHERE id = ?", [id]);
        return res.json({ success: true, paymentStatus: "approved", message: "Pagamento simulado como APROVADO (ambiente de teste)." });
      }
      const accessToken = process.env.MP_ACCESS_TOKEN;
      if (!accessToken || accessToken === "APP_USR-SEU_TOKEN_DE_TESTE_OU_PRODUCAO_AQUI") {
        return res.status(400).json({ message: "Token do MP n\xE3o configurado." });
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
    } catch (err) {
      console.error("Erro ao consultar pagamento:", err);
      res.status(500).json({ message: `Erro ao consultar: ${err.message}` });
    }
  });
  app.get("/api/orders", authenticateToken, async (req, res) => {
    const userId = req.user.id;
    if (!userId) return res.status(401).json({ message: "N\xE3o autenticado" });
    try {
      const [orders] = await db.execute("SELECT * FROM orders WHERE user_id = ? ORDER BY date DESC", [userId]);
      const ordersWithItems = [];
      for (const order of orders) {
        const [items] = await db.execute("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
        const mappedItems = items.map((i) => ({
          name: i.product_name,
          quantity: i.quantity,
          price: i.price,
          image: i.image,
          color: i.color,
          size: i.size
        }));
        let formattedDate = new Date(order.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
        ordersWithItems.push({
          id: order.id,
          date: formattedDate,
          status: order.status,
          paymentStatus: order.payment_status,
          shippingCost: order.shipping_cost,
          items: mappedItems,
          trackingCode: order.tracking_code,
          carrier: order.carrier
        });
      }
      res.json(ordersWithItems);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao buscar pedidos" });
    }
  });
  app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
      const [orders] = await db.execute("SELECT * FROM orders ORDER BY date DESC");
      const ordersWithItems = [];
      for (const order of orders) {
        const [items] = await db.execute("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
        let parsedAddress = null;
        try {
          parsedAddress = JSON.parse(order.shipping_address);
        } catch (e) {
        }
        ordersWithItems.push({
          id: order.id,
          date: order.date,
          status: order.status,
          paymentStatus: order.payment_status || "pending",
          total: order.total,
          shippingCost: order.shipping_cost,
          paymentMethod: order.payment_method,
          mpId: order.mp_id,
          customer: {
            name: order.customer_name || "N\xE3o informado",
            email: order.customer_email || order.user_id || "N\xE3o informado",
            cpf: order.customer_cpf || "N\xE3o informado",
            phone: order.customer_phone || "N\xE3o informado"
          },
          address: parsedAddress,
          items: items.map((i) => ({
            name: i.product_name,
            quantity: i.quantity,
            price: i.price,
            image: i.image,
            color: i.color,
            size: i.size
          })),
          trackingCode: order.tracking_code,
          carrier: order.carrier
        });
      }
      res.json(ordersWithItems);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao buscar pedidos." });
    }
  });
  app.patch("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status, trackingCode, carrier } = req.body;
    const validStatuses = ["pendente", "processando", "enviado", "concluido", "cancelado"];
    try {
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ message: `Status inv\xE1lido. Use: ${validStatuses.join(", ")}` });
      }
      let query = "UPDATE orders SET ";
      let params = [];
      let updates = [];
      if (status) {
        updates.push("status = ?");
        params.push(status);
      }
      if (trackingCode !== void 0) {
        updates.push("tracking_code = ?");
        params.push(trackingCode);
      }
      if (carrier !== void 0) {
        updates.push("carrier = ?");
        params.push(carrier);
      }
      if (updates.length === 0) return res.status(400).json({ message: "Nenhum campo para atualizar." });
      query += updates.join(", ") + " WHERE id = ?";
      params.push(id);
      const [result] = await db.execute(query, params);
      if (result.affectedRows === 0) return res.status(404).json({ message: "Pedido n\xE3o encontrado." });
      res.json({ success: true, message: `Pedido ${id} atualizado com sucesso.` });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao atualizar pedido." });
    }
  });
  app.post("/api/newsletter", async (req, res) => {
    const { email, phone } = req.body;
    if (!email) return res.status(400).json({ message: "E-mail \xE9 obrigat\xF3rio." });
    try {
      await db.execute("REPLACE INTO newsletter_subscribers (email, phone) VALUES (?, ?)", [email, phone || null]);
      res.json({ success: true, message: "Cadastro realizado com sucesso!" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao se inscrever na newsletter." });
    }
  });
  app.post("/api/waitlist", async (req, res) => {
    const { id, sku, name, email, phone, details } = req.body;
    const productIdentifier = sku || id;
    if (!productIdentifier || !name || !email) {
      return res.status(400).json({ message: "Dados incompletos (ID/SKU, Nome e E-mail s\xE3o obrigat\xF3rios)." });
    }
    try {
      await db.execute(
        "INSERT INTO waitlist (product_id, product_name, email, phone, details) VALUES (?, ?, ?, ?, ?)",
        [productIdentifier, name, email, phone || null, details || null]
      );
      await db.execute("INSERT IGNORE INTO newsletter_subscribers (email, phone) VALUES (?, ?)", [email, phone || null]);
      res.json({ success: true, message: "Voc\xEA ser\xE1 avisado quando o produto chegar!" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao entrar na lista de espera." });
    }
  });
  app.get("/api/admin/newsletter", requireAdmin, async (req, res) => {
    try {
      const [subscribers] = await db.execute("SELECT * FROM newsletter_subscribers ORDER BY created_at DESC");
      res.json(subscribers);
    } catch (err) {
      res.status(500).json({ message: "Erro ao buscar inscritos." });
    }
  });
  app.get("/api/admin/waitlist", requireAdmin, async (req, res) => {
    try {
      const [rows] = await db.execute("SELECT * FROM waitlist ORDER BY created_at DESC");
      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Erro ao buscar lista de espera." });
    }
  });
  app.post("/api/admin/notify-stock", requireAdmin, async (req, res) => {
    const { waitlistId, email, productName, details, imageUrl } = req.body;
    try {
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
                  Sua requisi\xE7\xE3o<br>est\xE1 te esperando.
                </h2>
              </td>
            </tr>
            <tr>
              <td align="center" style="background-color: #fdfdfd; padding: 40px 30px;">
                <p style="color: #333333; margin: 0 0 15px 0; font-size: 14px; line-height: 1.6; font-weight: bold;">
                  Voc\xEA solicitou um aviso e a miss\xE3o foi cumprida.
                </p>
                <p style="color: #555555; margin: 0 0 25px 0; font-size: 14px; line-height: 1.6;">
                  O equipamento que voc\xEA aguardava retornou ao nosso arsenal e est\xE1 pronto para o envio.
                </p>
              </td>
            </tr>
          </table>
        </div>
      `;
      const logoPath = path.join(__dirname, "public/suopes-text-logo.png");
      const attachments = [];
      if (fs.existsSync(logoPath)) {
        attachments.push({
          filename: "suopes-text-logo.png",
          path: logoPath,
          cid: "suopeslogo"
        });
      }
      await transporter.sendMail({
        from: `"SUOPES TACTICAL" <${process.env.SMTP_USER || "suopestactical@gmail.com"}>`,
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
  app.post("/api/admin/broadcast", requireAdmin, async (req, res) => {
    const { subject, message, testEmail, mode } = req.body;
    if (!subject || !message) return res.status(400).json({ message: "Assunto e mensagem s\xE3o obrigat\xF3rios." });
    try {
      let targets = [];
      if (mode === "test") {
        if (!testEmail) return res.status(400).json({ message: "E-mail de teste n\xE3o fornecido." });
        targets = [testEmail];
      } else {
        const [subscribers] = await db.execute("SELECT email FROM newsletter_subscribers");
        targets = subscribers.map((s) => s.email);
      }
      if (targets.length === 0) return res.status(400).json({ message: "Nenhum destinat\xE1rio encontrado." });
      let userSmtp = process.env.SMTP_USER;
      let passSmtp = process.env.SMTP_PASS;
      try {
        const envContent = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
        const smtpUserMatch = envContent.match(/SMTP_USER="([^"]+)"/);
        const smtpPassMatch = envContent.match(/SMTP_PASS="([^"]+)"/);
        if (smtpUserMatch) userSmtp = smtpUserMatch[1];
        if (smtpPassMatch) passSmtp = smtpPassMatch[1];
      } catch (e) {
      }
      const dynamicTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: userSmtp, pass: passSmtp }
      });
      let successCount = 0;
      for (const target of targets) {
        try {
          await dynamicTransporter.sendMail({
            from: '"SUOPES TACTICAL" <suopestactical@gmail.com>',
            to: target,
            subject,
            html: message,
            // Simplificado para fins de refatoração rápida
            attachments: [{
              filename: "suopes-text-logo.png",
              path: path.join(__dirname, "public/suopes-text-logo.png"),
              cid: "suopeslogo"
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
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
//# sourceMappingURL=server.js.map
