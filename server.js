"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
var express_1 = __importDefault(require("express"));
var vite_1 = require("vite");
var path_1 = __importDefault(require("path"));
var url_1 = require("url");
var fs_1 = __importDefault(require("fs"));
var multer_1 = __importDefault(require("multer"));
var mercadopago_1 = require("mercadopago");
var promise_1 = __importDefault(require("mysql2/promise"));
var bcryptjs_1 = __importDefault(require("bcryptjs"));
var nodemailer_1 = __importDefault(require("nodemailer"));
var generative_ai_1 = require("@google/generative-ai");
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var helmet_1 = __importDefault(require("helmet"));
var cors_1 = __importDefault(require("cors"));
var express_rate_limit_1 = __importDefault(require("express-rate-limit"));
var __filename = (0, url_1.fileURLToPath)(import.meta.url);
var __dirname = path_1.default.dirname(__filename);
// ZONA SEGURA: Armazenamento persistente fora da pasta de deploy
var HQ_DATA_DIR = path_1.default.resolve(__dirname, "..", "suopes_data_HQ");
if (!fs_1.default.existsSync(HQ_DATA_DIR))
    fs_1.default.mkdirSync(HQ_DATA_DIR, { recursive: true });
var PRODUCTS_FILE = path_1.default.join(HQ_DATA_DIR, "products.json");
var GALLERY_FILE = path_1.default.join(HQ_DATA_DIR, "gallery.json");
var PERSISTENT_UPLOADS_DIR = path_1.default.join(HQ_DATA_DIR, "uploads");
if (!fs_1.default.existsSync(PERSISTENT_UPLOADS_DIR))
    fs_1.default.mkdirSync(PERSISTENT_UPLOADS_DIR, { recursive: true });
// Configuração do Banco de Dados MySQL (Hostinger)
var db = promise_1.default.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'u177568398_admin',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'u177568398_suopes',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
var JWT_SECRET = process.env.JWT_SECRET || "suopes-super-secret-key-2026-hq";
// Middleware de Autenticação JWT
var authenticateToken = function (req, res, next) {
    var authHeader = req.headers['authorization'];
    var token = authHeader && authHeader.split(' ')[1];
    if (!token)
        return res.status(401).json({ message: "Acesso negado. Token não fornecido." });
    jsonwebtoken_1.default.verify(token, JWT_SECRET, function (err, user) {
        if (err)
            return res.status(403).json({ message: "Token inválido ou expirado." });
        req.user = user;
        next();
    });
};
var requireAdmin = function (req, res, next) {
    authenticateToken(req, res, function () {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Acesso negado. Permissões de administrador requeridas." });
        }
        next();
    });
};
function initializeDatabase() {
    return __awaiter(this, void 0, void 0, function () {
        var connection, e_1, e_2, e_3, e_4, oldCats, _i, oldCats_1, cat, e_5, newColumns, _a, newColumns_1, sql, e_6, e_7, e_8, e_9, mpActivated, e_10, e_11, admins, _b, admins_1, adminEmail, existingProducts, jsonData, _c, jsonData_1, p, e_12, existingGallery, jsonData, _d, jsonData_2, g, e_13, err_1;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    console.log("Tentando conectar ao banco de dados MySQL...");
                    console.log("Configura\u00E7\u00E3o: Host=".concat(process.env.DB_HOST || 'localhost', ", User=").concat(process.env.DB_USER || 'u177568398_admin', ", DB=").concat(process.env.DB_NAME || 'u177568398_suopes'));
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 76, , 77]);
                    return [4 /*yield*/, db.getConnection()];
                case 2:
                    connection = _e.sent();
                    console.log("Conexão com o banco de dados estabelecida com sucesso!");
                    connection.release();
                    return [4 /*yield*/, db.query("\n      CREATE TABLE IF NOT EXISTS users (\n        id VARCHAR(255) PRIMARY KEY,\n        name VARCHAR(255) NOT NULL,\n        email VARCHAR(255) UNIQUE NOT NULL,\n        password_hash VARCHAR(255) NOT NULL,\n        role VARCHAR(50) DEFAULT 'user',\n        verified TINYINT(1) DEFAULT 0,\n        verification_code VARCHAR(255),\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n        reset_code VARCHAR(255),\n        reset_expires DATETIME\n      );\n    ")];
                case 3:
                    _e.sent();
                    return [4 /*yield*/, db.query("\n      CREATE TABLE IF NOT EXISTS orders (\n        id VARCHAR(255) PRIMARY KEY,\n        user_id VARCHAR(255),\n        customer_name VARCHAR(255),\n        customer_email VARCHAR(255),\n        date DATETIME DEFAULT CURRENT_TIMESTAMP,\n        status VARCHAR(50) DEFAULT 'processando',\n        payment_status VARCHAR(50) DEFAULT 'pending',\n        total DECIMAL(10,2) NOT NULL,\n        shipping_cost DECIMAL(10,2) DEFAULT 0,\n        shipping_address TEXT,\n        payment_method VARCHAR(50),\n        customer_cpf VARCHAR(20),\n        customer_phone VARCHAR(50),\n        mp_id VARCHAR(255),\n        mp_qr_code_base64 LONGTEXT,\n        mp_qr_code TEXT,\n        coupon_code VARCHAR(50) DEFAULT NULL,\n        coupon_discount DECIMAL(10,2) DEFAULT 0,\n        tracking_code VARCHAR(100) DEFAULT NULL,\n        carrier VARCHAR(100) DEFAULT NULL\n      );\n    ")];
                case 4:
                    _e.sent();
                    _e.label = 5;
                case 5:
                    _e.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, db.execute("ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50) DEFAULT NULL")];
                case 6:
                    _e.sent();
                    return [3 /*break*/, 8];
                case 7:
                    e_1 = _e.sent();
                    return [3 /*break*/, 8];
                case 8:
                    _e.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, db.execute("ALTER TABLE orders ADD COLUMN coupon_discount DECIMAL(10,2) DEFAULT 0")];
                case 9:
                    _e.sent();
                    return [3 /*break*/, 11];
                case 10:
                    e_2 = _e.sent();
                    return [3 /*break*/, 11];
                case 11:
                    _e.trys.push([11, 13, , 14]);
                    return [4 /*yield*/, db.execute("ALTER TABLE orders ADD COLUMN tracking_code VARCHAR(100) DEFAULT NULL")];
                case 12:
                    _e.sent();
                    return [3 /*break*/, 14];
                case 13:
                    e_3 = _e.sent();
                    return [3 /*break*/, 14];
                case 14:
                    _e.trys.push([14, 16, , 17]);
                    return [4 /*yield*/, db.execute("ALTER TABLE orders ADD COLUMN carrier VARCHAR(100) DEFAULT NULL")];
                case 15:
                    _e.sent();
                    return [3 /*break*/, 17];
                case 16:
                    e_4 = _e.sent();
                    return [3 /*break*/, 17];
                case 17:
                    _e.trys.push([17, 23, , 24]);
                    return [4 /*yield*/, db.execute("UPDATE products SET category = REPLACE(category, 'HEADWEAR', 'BONÉS') WHERE category LIKE '%HEADWEAR%'")];
                case 18:
                    _e.sent();
                    oldCats = ['LINHA ESPECIAL', 'PATCHES', 'CAMISAS', 'ACESSÓRIOS', 'EQUIPAMENTO', 'VESTUÁRIO', 'CALÇADOS', 'PROTEÇÃO'];
                    _i = 0, oldCats_1 = oldCats;
                    _e.label = 19;
                case 19:
                    if (!(_i < oldCats_1.length)) return [3 /*break*/, 22];
                    cat = oldCats_1[_i];
                    return [4 /*yield*/, db.execute("UPDATE products SET category = TRIM(BOTH ',' FROM REPLACE(REPLACE(category, ?, ''), ',,', ',')) WHERE category LIKE ?", [cat, "%".concat(cat, "%")])];
                case 20:
                    _e.sent();
                    _e.label = 21;
                case 21:
                    _i++;
                    return [3 /*break*/, 19];
                case 22:
                    console.log("[MIGRATION] Limpeza de categorias concluída.");
                    return [3 /*break*/, 24];
                case 23:
                    e_5 = _e.sent();
                    console.error("[MIGRATION_ERROR]", e_5);
                    return [3 /*break*/, 24];
                case 24: return [4 /*yield*/, db.query("\n      CREATE TABLE IF NOT EXISTS order_items (\n        id INT PRIMARY KEY AUTO_INCREMENT,\n        order_id VARCHAR(255) NOT NULL,\n        product_id VARCHAR(255),\n        product_name VARCHAR(255) NOT NULL,\n        quantity INT NOT NULL,\n        price DECIMAL(10,2) NOT NULL,\n        image TEXT,\n        color VARCHAR(50),\n        size VARCHAR(20),\n        FOREIGN KEY(order_id) REFERENCES orders(id)\n      );\n    ")];
                case 25:
                    _e.sent();
                    return [4 /*yield*/, db.query("\n      CREATE TABLE IF NOT EXISTS newsletter_subscribers (\n        email VARCHAR(255) PRIMARY KEY,\n        phone VARCHAR(50),\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      );\n    ")];
                case 26:
                    _e.sent();
                    return [4 /*yield*/, db.query("\n      CREATE TABLE IF NOT EXISTS waitlist (\n        id INT PRIMARY KEY AUTO_INCREMENT,\n        product_id VARCHAR(255) NOT NULL,\n        product_name VARCHAR(255) NOT NULL,\n        email VARCHAR(255) NOT NULL,\n        phone VARCHAR(50),\n        details TEXT,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      );\n    ")];
                case 27:
                    _e.sent();
                    // TABELA DE PRODUTOS PERSISTENTE
                    return [4 /*yield*/, db.query("\n      CREATE TABLE IF NOT EXISTS products (\n        id VARCHAR(255) PRIMARY KEY,\n        name VARCHAR(255) NOT NULL,\n        description TEXT,\n        price DECIMAL(10,2) NOT NULL,\n        category VARCHAR(100),\n        sku VARCHAR(100),\n        image TEXT,\n        images JSON,\n        colors JSON,\n        sizes JSON,\n        has_sizes TINYINT(1) DEFAULT 0,\n        features TEXT,\n        care TEXT,\n        in_stock TINYINT(1) DEFAULT 1,\n        stock_quantity INT DEFAULT 10,\n        featured TINYINT(1) DEFAULT 0,\n        is_presale TINYINT(1) DEFAULT 0,\n        presale_date VARCHAR(255) DEFAULT NULL,\n        recommended_product_id VARCHAR(255) DEFAULT NULL,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      );\n    ")];
                case 28:
                    // TABELA DE PRODUTOS PERSISTENTE
                    _e.sent();
                    newColumns = [
                        "ALTER TABLE products ADD COLUMN sku VARCHAR(100)",
                        "ALTER TABLE products ADD COLUMN sizes JSON",
                        "ALTER TABLE products ADD COLUMN has_sizes TINYINT(1) DEFAULT 0",
                        "ALTER TABLE products ADD COLUMN features TEXT",
                        "ALTER TABLE products ADD COLUMN care TEXT",
                        "ALTER TABLE products ADD COLUMN stock_quantity INT DEFAULT 10",
                        "ALTER TABLE products ADD COLUMN is_presale TINYINT(1) DEFAULT 0",
                        "ALTER TABLE products ADD COLUMN presale_date VARCHAR(255) DEFAULT NULL",
                        "ALTER TABLE order_items ADD COLUMN product_id VARCHAR(255)",
                        "ALTER TABLE products ADD COLUMN recommended_product_id VARCHAR(255) DEFAULT NULL",
                    ];
                    _a = 0, newColumns_1 = newColumns;
                    _e.label = 29;
                case 29:
                    if (!(_a < newColumns_1.length)) return [3 /*break*/, 34];
                    sql = newColumns_1[_a];
                    _e.label = 30;
                case 30:
                    _e.trys.push([30, 32, , 33]);
                    return [4 /*yield*/, db.execute(sql)];
                case 31:
                    _e.sent();
                    return [3 /*break*/, 33];
                case 32:
                    e_6 = _e.sent();
                    return [3 /*break*/, 33];
                case 33:
                    _a++;
                    return [3 /*break*/, 29];
                case 34: 
                // TABELA DE GALERIA PERSISTENTE
                return [4 /*yield*/, db.query("\n      CREATE TABLE IF NOT EXISTS gallery (\n        id INT PRIMARY KEY AUTO_INCREMENT,\n        image TEXT NOT NULL,\n        title VARCHAR(255),\n        context TEXT,\n        location VARCHAR(255),\n        date_string VARCHAR(100),\n        sort_order INT DEFAULT 0,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      );\n    ")];
                case 35:
                    // TABELA DE GALERIA PERSISTENTE
                    _e.sent();
                    _e.label = 36;
                case 36:
                    _e.trys.push([36, 38, , 39]);
                    return [4 /*yield*/, db.execute("ALTER TABLE gallery ADD COLUMN sort_order INT DEFAULT 0")];
                case 37:
                    _e.sent();
                    return [3 /*break*/, 39];
                case 38:
                    e_7 = _e.sent();
                    return [3 /*break*/, 39];
                case 39: 
                // TABELA DE CUPONS
                return [4 /*yield*/, db.query("\n      CREATE TABLE IF NOT EXISTS coupons (\n        id INT PRIMARY KEY AUTO_INCREMENT,\n        code VARCHAR(50) NOT NULL UNIQUE,\n        type ENUM('percentage', 'fixed', 'free_shipping') NOT NULL DEFAULT 'percentage',\n        value DECIMAL(10,2) NOT NULL DEFAULT 0,\n        min_purchase DECIMAL(10,2) DEFAULT 0,\n        max_discount DECIMAL(10,2) DEFAULT NULL,\n        max_uses INT DEFAULT NULL,\n        current_uses INT DEFAULT 0,\n        max_uses_per_user INT DEFAULT NULL,\n        applies_to VARCHAR(255) DEFAULT NULL,\n        active TINYINT(1) DEFAULT 1,\n        starts_at DATETIME DEFAULT NULL,\n        expires_at DATETIME DEFAULT NULL,\n        created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      );\n    ")];
                case 40:
                    // TABELA DE CUPONS
                    _e.sent();
                    // TABELA DE USOS DE CUPONS POR USUÁRIO
                    return [4 /*yield*/, db.query("\n      CREATE TABLE IF NOT EXISTS coupon_uses (\n        id INT PRIMARY KEY AUTO_INCREMENT,\n        coupon_id INT NOT NULL,\n        user_id VARCHAR(255) NOT NULL,\n        order_id VARCHAR(255),\n        used_at DATETIME DEFAULT CURRENT_TIMESTAMP\n      );\n    ")];
                case 41:
                    // TABELA DE USOS DE CUPONS POR USUÁRIO
                    _e.sent();
                    _e.label = 42;
                case 42:
                    _e.trys.push([42, 44, , 45]);
                    return [4 /*yield*/, db.execute("ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50) DEFAULT NULL")];
                case 43:
                    _e.sent();
                    return [3 /*break*/, 45];
                case 44:
                    e_8 = _e.sent();
                    return [3 /*break*/, 45];
                case 45:
                    _e.trys.push([45, 47, , 48]);
                    return [4 /*yield*/, db.execute("ALTER TABLE orders ADD COLUMN coupon_discount DECIMAL(10,2) DEFAULT 0")];
                case 46:
                    _e.sent();
                    return [3 /*break*/, 48];
                case 47:
                    e_9 = _e.sent();
                    return [3 /*break*/, 48];
                case 48:
                    mpActivated = process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN !== "APP_USR-SEU_TOKEN_DE_TESTE_OU_PRODUCAO_AQUI";
                    _e.label = 49;
                case 49:
                    _e.trys.push([49, 51, , 52]);
                    return [4 /*yield*/, db.query("ALTER TABLE orders ADD COLUMN customer_cpf VARCHAR(20)")];
                case 50:
                    _e.sent();
                    return [3 /*break*/, 52];
                case 51:
                    e_10 = _e.sent();
                    return [3 /*break*/, 52];
                case 52:
                    _e.trys.push([52, 54, , 55]);
                    return [4 /*yield*/, db.query("ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(50)")];
                case 53:
                    _e.sent();
                    return [3 /*break*/, 55];
                case 54:
                    e_11 = _e.sent();
                    return [3 /*break*/, 55];
                case 55:
                    console.log("MODO MERCADO PAGO: ".concat(mpActivated ? 'REAL (ATIVADO)' : 'MOCK (SIMULADO)'));
                    console.log("APP_URL: ".concat(process.env.APP_URL || 'NÃO CONFIGURADO (Webhook pode falhar)'));
                    console.log("Banco de dados MySQL inicializado e tabelas verificadas.");
                    admins = ['samuelcpaulino@gmail.com', 'habnadabeh@gmail.com', 'fabinparafal762@gmail.com'];
                    _b = 0, admins_1 = admins;
                    _e.label = 56;
                case 56:
                    if (!(_b < admins_1.length)) return [3 /*break*/, 59];
                    adminEmail = admins_1[_b];
                    return [4 /*yield*/, db.execute("UPDATE users SET role = 'admin' WHERE email = ?", [adminEmail])];
                case 57:
                    _e.sent();
                    console.log("Permiss\u00E3o de administrador verificada para: ".concat(adminEmail));
                    _e.label = 58;
                case 58:
                    _b++;
                    return [3 /*break*/, 56];
                case 59: return [4 /*yield*/, db.execute("SELECT COUNT(*) as count FROM products")];
                case 60:
                    existingProducts = (_e.sent())[0];
                    if (!(existingProducts[0].count === 0 && fs_1.default.existsSync(PRODUCTS_FILE))) return [3 /*break*/, 67];
                    console.log("[MIGRAÇÃO] Iniciando transferência de produtos para o Banco de Dados...");
                    _e.label = 61;
                case 61:
                    _e.trys.push([61, 66, , 67]);
                    jsonData = JSON.parse(fs_1.default.readFileSync(PRODUCTS_FILE, "utf-8"));
                    _c = 0, jsonData_1 = jsonData;
                    _e.label = 62;
                case 62:
                    if (!(_c < jsonData_1.length)) return [3 /*break*/, 65];
                    p = jsonData_1[_c];
                    return [4 /*yield*/, db.execute("INSERT INTO products (id, name, description, price, category, image, images, colors, in_stock, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [p.id, p.name, p.description, p.price, p.category, p.image, JSON.stringify(p.images || []), JSON.stringify(p.colors || []), p.inStock ? 1 : 0, p.featured ? 1 : 0])];
                case 63:
                    _e.sent();
                    _e.label = 64;
                case 64:
                    _c++;
                    return [3 /*break*/, 62];
                case 65:
                    console.log("[MIGRAÇÃO] Produtos transferidos com sucesso!");
                    return [3 /*break*/, 67];
                case 66:
                    e_12 = _e.sent();
                    console.error("[MIGRAÇÃO] Erro ao migrar produtos:", e_12);
                    return [3 /*break*/, 67];
                case 67: return [4 /*yield*/, db.execute("SELECT COUNT(*) as count FROM gallery")];
                case 68:
                    existingGallery = (_e.sent())[0];
                    if (!(existingGallery[0].count === 0 && fs_1.default.existsSync(GALLERY_FILE))) return [3 /*break*/, 75];
                    console.log("[MIGRAÇÃO] Iniciando transferência da galeria para o Banco de Dados...");
                    _e.label = 69;
                case 69:
                    _e.trys.push([69, 74, , 75]);
                    jsonData = JSON.parse(fs_1.default.readFileSync(GALLERY_FILE, "utf-8"));
                    _d = 0, jsonData_2 = jsonData;
                    _e.label = 70;
                case 70:
                    if (!(_d < jsonData_2.length)) return [3 /*break*/, 73];
                    g = jsonData_2[_d];
                    return [4 /*yield*/, db.execute("INSERT INTO gallery (image, title, context, location, date_string) VALUES (?, ?, ?, ?, ?)", [g.image, g.title, g.context, g.location, g.date])];
                case 71:
                    _e.sent();
                    _e.label = 72;
                case 72:
                    _d++;
                    return [3 /*break*/, 70];
                case 73:
                    console.log("[MIGRAÇÃO] Galeria transferida com sucesso!");
                    return [3 /*break*/, 75];
                case 74:
                    e_13 = _e.sent();
                    console.error("[MIGRAÇÃO] Erro ao migrar galeria:", e_13);
                    return [3 /*break*/, 75];
                case 75: return [3 /*break*/, 77];
                case 76:
                    err_1 = _e.sent();
                    console.error("ERRO CRÍTICO NO BANCO DE DADOS:");
                    console.error("Mensagem: ".concat(err_1.message));
                    console.error("C\u00F3digo Erro: ".concat(err_1.code));
                    console.error("Stack: ".concat(err_1.stack));
                    return [3 /*break*/, 77];
                case 77: return [2 /*return*/];
            }
        });
    });
}
// Chamar inicialização
initializeDatabase();
// Configuração do Assistente SUOPES (Google Gemini)
var genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
function getAssistantContext() {
    return __awaiter(this, void 0, void 0, function () {
        var products, gallery, context_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, db.execute("SELECT id, image, name, description, price, category, features, in_stock, stock_quantity, colors, sizes, has_sizes FROM products")];
                case 1:
                    products = (_a.sent())[0];
                    return [4 /*yield*/, db.execute("SELECT title, context, location FROM gallery LIMIT 10")];
                case 2:
                    gallery = (_a.sent())[0];
                    context_1 = "INFORMAÇÕES DO CATÁLOGO SUOPES (CONTEXTO):\n\n";
                    context_1 += "--- PRODUTOS DISPONÍVEIS E ESGOTADOS ---\n";
                    products.forEach(function (p) {
                        var colorsText = "Padrão";
                        try {
                            if (p.colors) {
                                var cArr = typeof p.colors === 'string' ? JSON.parse(p.colors) : p.colors;
                                if (Array.isArray(cArr) && cArr.length > 0) {
                                    colorsText = cArr.map(function (color) { return "".concat(color.name, " (").concat(color.inStock !== false ? 'Em Estoque' : 'Fora de Estoque', ")"); }).join(', ');
                                }
                            }
                        }
                        catch (e) { }
                        var sizesText = "Tamanho Único";
                        try {
                            if (p.has_sizes || p.has_sizes === 1) {
                                if (p.sizes) {
                                    var sArr = typeof p.sizes === 'string' ? JSON.parse(p.sizes) : p.sizes;
                                    if (Array.isArray(sArr) && sArr.length > 0)
                                        sizesText = sArr.join(', ');
                                }
                            }
                        }
                        catch (e) { }
                        var stockStatus = (p.stock_quantity > 0 || p.in_stock === 1) ? 'EM ESTOQUE' : 'ESGOTADO / INDISPONÍVEL';
                        var availableQty = p.stock_quantity !== undefined ? p.stock_quantity : 10;
                        context_1 += "- ID: ".concat(p.id, " | Nome: ").concat(p.name, " | Status Geral: ").concat(stockStatus, " (").concat(availableQty, " unid.) | Pre\u00E7o: R$ ").concat(p.price, "\n");
                        context_1 += "  Categoria: ".concat(p.category, " | Cores: ").concat(colorsText, " | Tamanhos: ").concat(sizesText, "\n");
                        if (p.description)
                            context_1 += "  Descri\u00E7\u00E3o: ".concat(p.description, "\n");
                        if (p.features)
                            context_1 += "  Caracter\u00EDsticas: ".concat(p.features, "\n");
                    });
                    context_1 += "\n--- GALERIA OPERACIONAL (MISSÕES) ---\n";
                    gallery.forEach(function (g) {
                        context_1 += "- ".concat(g.title, ": ").concat(g.context || '', " (Local: ").concat(g.location || 'N/A', ")\n");
                    });
                    return [2 /*return*/, context_1];
                case 3:
                    error_1 = _a.sent();
                    console.error("Erro ao buscar contexto para o assistente:", error_1);
                    return [2 /*return*/, "Erro ao carregar dados do catálogo."];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Configuração do Transportador de E-mail (SMTP)
var transporter;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer_1.default.createTransport({
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
}
else {
    nodemailer_1.default.createTestAccount().then(function (account) {
        transporter = nodemailer_1.default.createTransport({
            host: account.smtp.host,
            port: account.smtp.port,
            secure: account.smtp.secure,
            auth: {
                user: account.user,
                pass: account.pass,
            },
        });
        console.log("Ethereal test account ready. Check emails at https://ethereal.email");
    }).catch(function (err) { return console.error("Falha ao criar conta de teste SMTP:", err); });
}
// ============================================
// GERADOR DE E-MAILS TRANSACIONAIS (SUOPES)
// ============================================
var SITE_URL = process.env.APP_URL || "https://suopes.com";
function generateOrderEmailHTML(options) {
    var type = options.type, customerName = options.customerName, orderId = options.orderId, items = options.items, subtotal = options.subtotal, shippingCost = options.shippingCost, total = options.total, couponCode = options.couponCode, couponDiscount = options.couponDiscount, shippingAddress = options.shippingAddress, paymentMethod = options.paymentMethod;
    var isApproved = type === "approved";
    var headline = isApproved
        ? "PAGAMENTO CONFIRMADO"
        : "PEDIDO RECEBIDO";
    var subheadline = isApproved
        ? "Excelente! Seu pagamento foi confirmado com sucesso. Estamos preparando seu equipamento para envio."
        : "Seu pedido foi registrado com sucesso! Assim que o pagamento for confirmado, iniciaremos a preparação.";
    var statusColor = isApproved ? "#22c55e" : "#d4a843";
    var statusLabel = isApproved ? "APROVADO" : "AGUARDANDO PAGAMENTO";
    var itemsHtml = items.map(function (item) {
        var imgSrc = item.image
            ? (item.image.startsWith("http") ? item.image : "".concat(SITE_URL).concat(item.image))
            : "";
        var details = [item.color, item.size].filter(Boolean).join(" / ");
        return "\n      <tr>\n        <td style=\"padding: 16px 0; border-bottom: 1px solid #2a2a2a;\">\n          <table cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\">\n            <tr>\n              ".concat(imgSrc ? "<td width=\"80\" style=\"vertical-align: top; padding-right: 16px;\">\n                <img src=\"".concat(imgSrc, "\" alt=\"").concat(item.name, "\" width=\"80\" height=\"80\" style=\"display: block; border: 1px solid #333; object-fit: cover;\" />\n              </td>") : "", "\n              <td style=\"vertical-align: top;\">\n                <p style=\"margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: #ffffff; font-family: monospace;\">").concat(item.name, "</p>\n                ").concat(details ? "<p style=\"margin: 0 0 4px 0; font-size: 11px; color: #888; font-family: monospace; text-transform: uppercase;\">".concat(details, "</p>") : "", "\n                <p style=\"margin: 0; font-size: 12px; color: #888; font-family: monospace;\">Qtd: ").concat(item.quantity, "</p>\n              </td>\n              <td style=\"vertical-align: top; text-align: right; white-space: nowrap;\">\n                <p style=\"margin: 0; font-size: 14px; font-weight: bold; color: #d4a843; font-family: monospace;\">R$ ").concat((item.price * item.quantity).toFixed(2), "</p>\n              </td>\n            </tr>\n          </table>\n        </td>\n      </tr>");
    }).join("");
    var addressHtml = "";
    if (shippingAddress) {
        var addr = typeof shippingAddress === "string" ? JSON.parse(shippingAddress) : shippingAddress;
        addressHtml = "\n      <table cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"margin-top: 24px; background: #1a1a1a; border: 1px solid #2a2a2a;\">\n        <tr>\n          <td style=\"padding: 20px;\">\n            <p style=\"margin: 0 0 12px 0; font-size: 11px; font-weight: bold; color: #d4a843; font-family: monospace; letter-spacing: 2px;\">ENDERE\u00C7O DE ENVIO</p>\n            <p style=\"margin: 0; font-size: 13px; color: #ccc; font-family: monospace; line-height: 1.8;\">\n              ".concat(addr.address || "").concat(addr.number ? ", ".concat(addr.number) : "", "<br/>\n              ").concat(addr.neighborhood || "", "<br/>\n              ").concat(addr.city || "", " - ").concat(addr.state || "", "<br/>\n              CEP: ").concat(addr.cep || "", "\n            </p>\n          </td>\n        </tr>\n      </table>");
    }
    var paymentLabel = paymentMethod === "pix" ? "PIX" : paymentMethod === "credit_card" ? "Cartão de Crédito" : (paymentMethod || "").toUpperCase();
    return "\n<!DOCTYPE html>\n<html>\n<head><meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" /></head>\n<body style=\"margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Helvetica Neue', Arial, sans-serif; color: #ffffff;\">\n  <table cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"background-color: #0a0a0a;\">\n    <tr>\n      <td align=\"center\" style=\"padding: 40px 16px;\">\n        <table cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"600\" style=\"max-width: 600px; background-color: #111111; border: 1px solid #2a2a2a;\">\n          \n          <!-- Header -->\n          <tr>\n            <td style=\"padding: 32px 40px; background: linear-gradient(135deg, #1a1a0a 0%, #111111 100%); border-bottom: 2px solid #d4a843; text-align: center;\">\n              <p style=\"margin: 0 0 8px 0; font-size: 10px; letter-spacing: 4px; color: #d4a843; font-family: monospace;\">SUOPES TACTICAL</p>\n              <h1 style=\"margin: 0; font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: 2px;\">".concat(headline, "</h1>\n            </td>\n          </tr>\n\n          <!-- Status Badge -->\n          <tr>\n            <td style=\"padding: 24px 40px 0 40px; text-align: center;\">\n              <table cellpadding=\"0\" cellspacing=\"0\" border=\"0\" align=\"center\">\n                <tr>\n                  <td style=\"background: ").concat(statusColor, "15; border: 1px solid ").concat(statusColor, "50; padding: 8px 24px; font-size: 10px; font-weight: bold; color: ").concat(statusColor, "; font-family: monospace; letter-spacing: 3px;\">\n                    \u25CF ").concat(statusLabel, "\n                  </td>\n                </tr>\n              </table>\n            </td>\n          </tr>\n\n          <!-- Greeting -->\n          <tr>\n            <td style=\"padding: 28px 40px 16px 40px;\">\n              <p style=\"margin: 0 0 8px 0; font-size: 16px; color: #ffffff;\">Ol\u00E1, <strong>").concat(customerName || "Operador", "</strong>!</p>\n              <p style=\"margin: 0; font-size: 14px; color: #999; line-height: 1.6;\">").concat(subheadline, "</p>\n            </td>\n          </tr>\n\n          <!-- Order ID -->\n          <tr>\n            <td style=\"padding: 0 40px 16px 40px;\">\n              <table cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"background: #1a1a1a; border: 1px solid #2a2a2a;\">\n                <tr>\n                  <td style=\"padding: 16px 20px;\">\n                    <p style=\"margin: 0; font-size: 11px; color: #888; font-family: monospace; letter-spacing: 2px;\">PEDIDO</p>\n                    <p style=\"margin: 4px 0 0 0; font-size: 20px; font-weight: bold; color: #d4a843; font-family: monospace;\">").concat(orderId, "</p>\n                  </td>\n                  <td style=\"padding: 16px 20px; text-align: right;\">\n                    <p style=\"margin: 0; font-size: 11px; color: #888; font-family: monospace; letter-spacing: 2px;\">PAGAMENTO</p>\n                    <p style=\"margin: 4px 0 0 0; font-size: 14px; font-weight: bold; color: #ffffff; font-family: monospace;\">").concat(paymentLabel, "</p>\n                  </td>\n                </tr>\n              </table>\n            </td>\n          </tr>\n\n          <!-- Items -->\n          <tr>\n            <td style=\"padding: 0 40px;\">\n              <p style=\"margin: 0 0 12px 0; font-size: 11px; font-weight: bold; color: #d4a843; font-family: monospace; letter-spacing: 2px;\">ITENS DO PEDIDO</p>\n              <table cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\">\n                ").concat(itemsHtml, "\n              </table>\n            </td>\n          </tr>\n\n          <!-- Totals -->\n          <tr>\n            <td style=\"padding: 24px 40px;\">\n              <table cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"background: #1a1a1a; border: 1px solid #2a2a2a;\">\n                <tr>\n                  <td style=\"padding: 16px 20px;\">\n                    <table cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\">\n                      <tr>\n                        <td style=\"padding: 4px 0; font-size: 12px; color: #888; font-family: monospace;\">Subtotal</td>\n                        <td style=\"padding: 4px 0; font-size: 12px; color: #fff; font-family: monospace; text-align: right;\">R$ ").concat(subtotal.toFixed(2), "</td>\n                      </tr>\n                      ").concat(couponCode && couponDiscount && couponDiscount > 0 ? "\n                      <tr>\n                        <td style=\"padding: 4px 0; font-size: 12px; color: #22c55e; font-family: monospace;\">Cupom (".concat(couponCode, ")</td>\n                        <td style=\"padding: 4px 0; font-size: 12px; color: #22c55e; font-family: monospace; text-align: right;\">- R$ ").concat(couponDiscount.toFixed(2), "</td>\n                      </tr>") : "", "\n                      <tr>\n                        <td style=\"padding: 4px 0; font-size: 12px; color: #888; font-family: monospace;\">Frete</td>\n                        <td style=\"padding: 4px 0; font-size: 12px; color: #fff; font-family: monospace; text-align: right;\">").concat(shippingCost === 0 ? '<span style="color: #22c55e; font-weight: bold;">GRÁTIS</span>' : "R$ ".concat(shippingCost.toFixed(2)), "</td>\n                      </tr>\n                      <tr>\n                        <td colspan=\"2\" style=\"padding: 8px 0 0 0; border-top: 1px solid #333;\">\n                          <table cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\">\n                            <tr>\n                              <td style=\"padding: 8px 0; font-size: 16px; font-weight: bold; color: #d4a843; font-family: monospace;\">TOTAL</td>\n                              <td style=\"padding: 8px 0; font-size: 16px; font-weight: bold; color: #d4a843; font-family: monospace; text-align: right;\">R$ ").concat(total.toFixed(2), "</td>\n                            </tr>\n                          </table>\n                        </td>\n                      </tr>\n                    </table>\n                  </td>\n                </tr>\n              </table>\n            </td>\n          </tr>\n\n          <!-- Shipping Address -->\n          <tr>\n            <td style=\"padding: 0 40px;\">").concat(addressHtml, "</td>\n          </tr>\n\n          <!-- CTA -->\n          <tr>\n            <td style=\"padding: 32px 40px; text-align: center;\">\n              <a href=\"").concat(SITE_URL, "/compras\" style=\"display: inline-block; padding: 14px 40px; background-color: #d4a843; color: #0a0a0a; text-decoration: none; font-size: 12px; font-weight: bold; letter-spacing: 3px; font-family: monospace;\">ACOMPANHAR PEDIDO</a>\n            </td>\n          </tr>\n\n          <!-- Footer -->\n          <tr>\n            <td style=\"padding: 24px 40px; background: #0a0a0a; border-top: 1px solid #2a2a2a; text-align: center;\">\n              <p style=\"margin: 0 0 8px 0; font-size: 10px; color: #555; font-family: monospace; letter-spacing: 2px;\">SUOPES TACTICAL \u00A9 ").concat(new Date().getFullYear(), "</p>\n              <p style=\"margin: 0; font-size: 10px; color: #444; font-family: monospace;\">Equipamento t\u00E1tico para o operador moderno.</p>\n            </td>\n          </tr>\n\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>");
}
function sendOrderEmail(type, orderId) {
    return __awaiter(this, void 0, void 0, function () {
        var orders, order, items, emailItems, subtotal, shippingCost, html, subject, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!transporter) {
                        console.log("[EMAIL] Transporter não configurado, pulando envio.");
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, db.execute("SELECT id, customer_name, customer_email, total, shipping_cost, shipping_address, payment_method, coupon_code, coupon_discount FROM orders WHERE id = ?", [orderId])];
                case 2:
                    orders = (_a.sent())[0];
                    if (orders.length === 0) {
                        console.log("[EMAIL] Pedido ".concat(orderId, " n\u00E3o encontrado."));
                        return [2 /*return*/];
                    }
                    order = orders[0];
                    if (!order.customer_email || order.customer_email === "Não informado") {
                        console.log("[EMAIL] Pedido ".concat(orderId, " sem e-mail v\u00E1lido."));
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, db.execute("SELECT product_name, quantity, price, image, color, size FROM order_items WHERE order_id = ?", [orderId])];
                case 3:
                    items = (_a.sent())[0];
                    emailItems = items.map(function (item) { return ({
                        name: item.product_name,
                        quantity: item.quantity,
                        price: parseFloat(item.price),
                        image: item.image || undefined,
                        color: item.color || undefined,
                        size: item.size || undefined
                    }); });
                    subtotal = emailItems.reduce(function (sum, i) { return sum + i.price * i.quantity; }, 0);
                    shippingCost = parseFloat(order.shipping_cost) || 0;
                    html = generateOrderEmailHTML({
                        type: type,
                        customerName: order.customer_name,
                        orderId: order.id,
                        items: emailItems,
                        subtotal: subtotal,
                        shippingCost: shippingCost,
                        total: parseFloat(order.total),
                        couponCode: order.coupon_code,
                        couponDiscount: parseFloat(order.coupon_discount) || 0,
                        shippingAddress: order.shipping_address,
                        paymentMethod: order.payment_method
                    });
                    subject = type === "approved"
                        ? "\u2705 Pagamento Confirmado - Pedido ".concat(orderId, " | SUOPES TACTICAL")
                        : "\uD83D\uDCE6 Pedido Recebido - ".concat(orderId, " | SUOPES TACTICAL");
                    return [4 /*yield*/, transporter.sendMail({
                            from: "\"SUOPES TACTICAL\" <".concat(process.env.SMTP_USER || "noreply@suopes.com", ">"),
                            to: order.customer_email,
                            subject: subject,
                            html: html
                        })];
                case 4:
                    _a.sent();
                    console.log("[EMAIL] ".concat(type === "approved" ? "Confirmação de pagamento" : "Confirmação de pedido", " enviado para ").concat(order.customer_email, " (Pedido: ").concat(orderId, ")"));
                    return [3 /*break*/, 6];
                case 5:
                    err_2 = _a.sent();
                    console.error("[EMAIL] Erro ao enviar e-mail para pedido ".concat(orderId, ":"), err_2);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
// Configure Multer for secure image uploads
var storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, PERSISTENT_UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        var uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        // Remover caracteres perigosos do nome e usar extensão original limpa
        var cleanExt = path_1.default.extname(file.originalname).replace(/[^.a-zA-Z0-9]/g, '');
        cb(null, uniqueSuffix + cleanExt);
    }
});
var fileFilter = function (req, file, cb) {
    var allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error("Tipo de arquivo inválido. Apenas JPEG, PNG, WEBP e GIF são permitidos."), false);
    }
};
var upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});
function startServer() {
    return __awaiter(this, void 0, void 0, function () {
        // Restante das rotas...
        // ============================================
        // 🔄 FUNÇÃO DE RESTAURAÇÃO DE ESTOQUE
        // Chamada quando um pedido é cancelado/rejeitado
        // para devolver as unidades reservadas ao estoque.
        // ============================================
        function restoreStockForOrder(orderId) {
            return __awaiter(this, void 0, void 0, function () {
                var items, _i, items_1, item, err_3;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 6, , 7]);
                            return [4 /*yield*/, db.execute("SELECT product_id, quantity FROM order_items WHERE order_id = ? AND product_id IS NOT NULL", [orderId])];
                        case 1:
                            items = (_a.sent())[0];
                            _i = 0, items_1 = items;
                            _a.label = 2;
                        case 2:
                            if (!(_i < items_1.length)) return [3 /*break*/, 5];
                            item = items_1[_i];
                            return [4 /*yield*/, db.execute("UPDATE products SET stock_quantity = stock_quantity + ?, in_stock = 1 WHERE id = ?", [item.quantity, item.product_id])];
                        case 3:
                            _a.sent();
                            console.log("[ESTOQUE RESTAURADO] Produto ".concat(item.product_id, ": +").concat(item.quantity, " unidade(s) devolvida(s) (Pedido ").concat(orderId, " cancelado)"));
                            _a.label = 4;
                        case 4:
                            _i++;
                            return [3 /*break*/, 2];
                        case 5: return [3 /*break*/, 7];
                        case 6:
                            err_3 = _a.sent();
                            console.error("[ESTOQUE] Erro ao restaurar estoque do pedido ".concat(orderId, ":"), err_3);
                            return [3 /*break*/, 7];
                        case 7: return [2 /*return*/];
                    }
                });
            });
        }
        var app, PORT, globalLimiter, authLimiter, vite;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    app = (0, express_1.default)();
                    PORT = 3000;
                    app.use(express_1.default.json({ limit: "1mb" })); // Limitação de payload contra DoS
                    globalLimiter = (0, express_rate_limit_1.default)({
                        windowMs: 15 * 60 * 1000, // 15 minutes
                        max: 1000, // limit each IP to 1000 requests per windowMs
                        message: { message: "Muitas requisições deste IP, tente novamente em 15 minutos." },
                        standardHeaders: true,
                        legacyHeaders: false,
                    });
                    authLimiter = (0, express_rate_limit_1.default)({
                        windowMs: 15 * 60 * 1000, // 15 minutos
                        max: 15, // max 15 tentativas de auth/recuperação por janela
                        message: { message: "Muitas tentativas de autenticação detectadas. Aguarde 15 minutos." },
                        standardHeaders: true,
                        legacyHeaders: false,
                    });
                    // Security Middlewares Hardening
                    app.use(globalLimiter);
                    app.use((0, helmet_1.default)({
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
                                frameAncestors: ["'none'"], // Substitui o X-Frame-Options para browsers modernos garantindo que não soframos clickjacking
                            },
                        },
                        crossOriginEmbedderPolicy: false
                    }));
                    // Hardening: Permissions-Policy moderno para barrar sensores
                    app.use(function (req, res, next) {
                        res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=(self)");
                        // Informa explicitamente que a origem remove o header Express, mesmo que o Helmet já o faça
                        res.removeHeader("X-Powered-By");
                        next();
                    });
                    app.use((0, cors_1.default)({
                        origin: process.env.APP_URL || "*",
                        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
                        credentials: true
                    }));
                    // REDIRECIONAMENTO DE SEGURANÇA: Servir uploads da Zona Segura (Persistente)
                    app.use("/uploads", express_1.default.static(PERSISTENT_UPLOADS_DIR, {
                        setHeaders: function (res) {
                            res.setHeader("X-Content-Type-Options", "nosniff");
                        }
                    }));
                    // Auth API
                    app.post("/api/register", authLimiter, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, email, password, name, users, password_hash, verification_code, id, logoPath, attachments, htmlBody, e_14, err_4;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _a = req.body, email = _a.email, password = _a.password, name = _a.name;
                                    if (!email || !password || !name) {
                                        return [2 /*return*/, res.status(400).json({ message: "Todos os campos são obrigatórios" })];
                                    }
                                    _b.label = 1;
                                case 1:
                                    _b.trys.push([1, 9, , 10]);
                                    return [4 /*yield*/, db.execute('SELECT id FROM users WHERE email = ?', [email])];
                                case 2:
                                    users = (_b.sent())[0];
                                    if (users.length > 0) {
                                        return [2 /*return*/, res.status(400).json({ message: "E-mail já está em uso" })];
                                    }
                                    return [4 /*yield*/, bcryptjs_1.default.hash(password, 10)];
                                case 3:
                                    password_hash = _b.sent();
                                    verification_code = Math.floor(100000 + Math.random() * 900000).toString();
                                    id = Date.now().toString() + "-" + Math.round(Math.random() * 1000);
                                    return [4 /*yield*/, db.execute("\n        INSERT INTO users (id, name, email, password_hash, verification_code, role, verified)\n        VALUES (?, ?, ?, ?, ?, 'user', 0)\n      ", [id, name, email, password_hash, verification_code])];
                                case 4:
                                    _b.sent();
                                    logoPath = path_1.default.join(__dirname, 'public/suopes-text-logo.png');
                                    attachments = [];
                                    if (fs_1.default.existsSync(logoPath)) {
                                        attachments.push({
                                            filename: 'suopes-text-logo.png',
                                            path: logoPath,
                                            cid: 'suopeslogo'
                                        });
                                    }
                                    htmlBody = "\n        <div style=\"background-color: #f4f5f6; padding: 40px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;\">\n          <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"max-width: 600px; background-color: #ffffff; border-collapse: collapse;\">\n            <tr>\n              <td align=\"center\" style=\"background-color: #0d0d0d; padding: 30px 20px;\">\n                <img src=\"cid:suopeslogo\" alt=\"SUOPES TACTICAL\" width=\"280\" style=\"display: block; margin: 0 auto;\" />\n              </td>\n            </tr>\n            <tr>\n              <td align=\"center\" style=\"background-color: #fdfdfd; padding: 40px 30px;\">\n                <p style=\"color: #333333; margin: 0 0 15px 0; font-size: 16px; font-weight: bold; text-transform: uppercase;\">\n                  VERIFICA\u00C7\u00C3O DE IDENTIDADE\n                </p>\n                <div style=\"color: #555555; margin: 0 0 25px 0; font-size: 14px; line-height: 1.6; text-align: center; white-space: pre-wrap;\">Para acessar o arsenal, valide sua credencial t\u00E1tica utilizando o c\u00F3digo abaixo.</div>\n                <div style=\"background-color: #1a1a1a; color: #ffd700; border: 1px dashed #ffd700; padding: 20px; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;\">\n                  ".concat(verification_code, "\n                </div>\n              </td>\n            </tr>\n            <tr>\n              <td align=\"center\" style=\"background-color: #eeeeee; padding: 20px;\">\n                <p style=\"color: #999999; margin: 0; font-size: 10px; font-family: monospace; text-transform: uppercase;\">\n                  N\u00E3o responda a este e-mail. Gerado pelo sistema HQ Suopes.\n                </p>\n              </td>\n            </tr>\n          </table>\n        </div>\n      ");
                                    _b.label = 5;
                                case 5:
                                    _b.trys.push([5, 7, , 8]);
                                    return [4 /*yield*/, transporter.sendMail({
                                            from: "\"SUOPES TACTICAL\" <".concat(process.env.SMTP_USER || 'suopestactical@gmail.com', ">"),
                                            to: email,
                                            subject: "Seu código de verificação SUOPES",
                                            html: htmlBody,
                                            attachments: attachments
                                        })];
                                case 6:
                                    _b.sent();
                                    console.log("C\u00F3digo de verifica\u00E7\u00E3o enviado para: ".concat(email));
                                    return [3 /*break*/, 8];
                                case 7:
                                    e_14 = _b.sent();
                                    console.error("ERRO CRÍTICO AO ENVIAR E-MAIL DE VERIFICAÇÃO:", e_14.message);
                                    if (e_14.code === 'EAUTH') {
                                        console.error("Dica: Verifique se a 'Senha de Aplicativo' no Gmail ainda é válida.");
                                    }
                                    return [3 /*break*/, 8];
                                case 8:
                                    res.status(201).json({ message: "Usuário criado. Verifique seu e-mail.", email: email });
                                    return [3 /*break*/, 10];
                                case 9:
                                    err_4 = _b.sent();
                                    console.error(err_4);
                                    res.status(500).json({ message: "Erro interno no servidor" });
                                    return [3 /*break*/, 10];
                                case 10: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.post("/api/verify", authLimiter, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, email, code, users, user, err_5;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _a = req.body, email = _a.email, code = _a.code;
                                    if (!email || !code)
                                        return [2 /*return*/, res.status(400).json({ message: "E-mail e código são necessários" })];
                                    _b.label = 1;
                                case 1:
                                    _b.trys.push([1, 6, , 7]);
                                    return [4 /*yield*/, db.execute('SELECT id, verification_code FROM users WHERE email = ?', [email])];
                                case 2:
                                    users = (_b.sent())[0];
                                    user = users[0];
                                    if (!user) {
                                        return [2 /*return*/, res.status(404).json({ message: "Usuário não encontrado" })];
                                    }
                                    if (!(user.verification_code === code)) return [3 /*break*/, 4];
                                    return [4 /*yield*/, db.execute('UPDATE users SET verified = 1, verification_code = NULL WHERE id = ?', [user.id])];
                                case 3:
                                    _b.sent();
                                    res.json({ message: "E-mail verificado com sucesso!" });
                                    return [3 /*break*/, 5];
                                case 4:
                                    res.status(400).json({ message: "Código inválido" });
                                    _b.label = 5;
                                case 5: return [3 /*break*/, 7];
                                case 6:
                                    err_5 = _b.sent();
                                    console.error(err_5);
                                    res.status(500).json({ message: "Erro ao verificar e-mail" });
                                    return [3 /*break*/, 7];
                                case 7: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.post("/api/resend-code", authLimiter, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var email, users, user, new_code, logoPath, attachments, htmlBody, err_6;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    email = req.body.email;
                                    if (!email)
                                        return [2 /*return*/, res.status(400).json({ message: "E-mail é necessário" })];
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 5, , 6]);
                                    return [4 /*yield*/, db.execute('SELECT id, verified FROM users WHERE email = ?', [email])];
                                case 2:
                                    users = (_a.sent())[0];
                                    user = users[0];
                                    if (!user) {
                                        return [2 /*return*/, res.status(404).json({ message: "Usuário não encontrado" })];
                                    }
                                    if (user.verified) {
                                        return [2 /*return*/, res.status(400).json({ message: "Este usuário já está verificado." })];
                                    }
                                    new_code = Math.floor(100000 + Math.random() * 900000).toString();
                                    return [4 /*yield*/, db.execute('UPDATE users SET verification_code = ? WHERE id = ?', [new_code, user.id])];
                                case 3:
                                    _a.sent();
                                    logoPath = path_1.default.join(__dirname, 'public/suopes-text-logo.png');
                                    attachments = [];
                                    if (fs_1.default.existsSync(logoPath)) {
                                        attachments.push({ filename: 'suopes-text-logo.png', path: logoPath, cid: 'suopeslogo' });
                                    }
                                    htmlBody = "\n        <div style=\"background-color: #f4f5f6; padding: 40px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;\">\n          <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"max-width: 600px; background-color: #ffffff; border-collapse: collapse;\">\n            <tr><td align=\"center\" style=\"background-color: #0d0d0d; padding: 30px 20px;\"><img src=\"cid:suopeslogo\" alt=\"SUOPES TACTICAL\" width=\"280\" style=\"display: block; margin: 0 auto;\" /></td></tr>\n            <tr>\n              <td align=\"center\" style=\"background-color: #fdfdfd; padding: 40px 30px;\">\n                <p style=\"color: #333333; margin: 0 0 15px 0; font-size: 16px; font-weight: bold; text-transform: uppercase;\"> NOVO C\u00D3DIGO DE VERIFICA\u00C7\u00C3O </p>\n                <div style=\"color: #555555; margin: 0 0 25px 0; font-size: 14px; line-height: 1.6; text-align: center;\">Utilize o novo c\u00F3digo abaixo para validar sua credencial t\u00E1tica.</div>\n                <div style=\"background-color: #1a1a1a; color: #ffd700; border: 1px dashed #ffd700; padding: 20px; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;\"> ".concat(new_code, " </div>\n              </td>\n            </tr>\n          </table>\n        </div>\n      ");
                                    return [4 /*yield*/, transporter.sendMail({
                                            from: "\"SUOPES TACTICAL\" <".concat(process.env.SMTP_USER || 'suopestactical@gmail.com', ">"),
                                            to: email,
                                            subject: "Novo código de verificação SUOPES",
                                            html: htmlBody,
                                            attachments: attachments
                                        })];
                                case 4:
                                    _a.sent();
                                    res.json({ message: "Novo código enviado com sucesso!" });
                                    return [3 /*break*/, 6];
                                case 5:
                                    err_6 = _a.sent();
                                    console.error("Erro ao reenviar código:", err_6.message);
                                    res.status(500).json({ message: "Erro ao reenviar código." });
                                    return [3 /*break*/, 6];
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.post("/api/forgot-password", authLimiter, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var email, users, user, reset_code, expires, logoPath, attachments, htmlBody, e_15, err_7;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    email = req.body.email;
                                    if (!email)
                                        return [2 /*return*/, res.status(400).json({ message: "E-mail é necessário" })];
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 8, , 9]);
                                    return [4 /*yield*/, db.execute('SELECT id FROM users WHERE email = ?', [email])];
                                case 2:
                                    users = (_a.sent())[0];
                                    user = users[0];
                                    if (!user) {
                                        return [2 /*return*/, res.json({ message: "Se o e-mail existir, um código foi enviado." })];
                                    }
                                    reset_code = Math.floor(100000 + Math.random() * 900000).toString();
                                    expires = new Date(Date.now() + 15 * 60000);
                                    return [4 /*yield*/, db.execute('UPDATE users SET reset_code = ?, reset_expires = ? WHERE id = ?', [reset_code, expires, user.id])];
                                case 3:
                                    _a.sent();
                                    logoPath = path_1.default.join(__dirname, 'public/suopes-text-logo.png');
                                    attachments = [];
                                    if (fs_1.default.existsSync(logoPath)) {
                                        attachments.push({
                                            filename: 'suopes-text-logo.png',
                                            path: logoPath,
                                            cid: 'suopeslogo'
                                        });
                                    }
                                    htmlBody = "\n        <div style=\"background-color: #f4f5f6; padding: 40px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;\">\n          <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"max-width: 600px; background-color: #ffffff; border-collapse: collapse;\">\n            <tr>\n              <td align=\"center\" style=\"background-color: #0d0d0d; padding: 30px 20px;\">\n                <img src=\"cid:suopeslogo\" alt=\"SUOPES TACTICAL\" width=\"280\" style=\"display: block; margin: 0 auto;\" />\n              </td>\n            </tr>\n            <tr>\n              <td align=\"center\" style=\"background-color: #fdfdfd; padding: 40px 30px;\">\n                <p style=\"color: #333333; margin: 0 0 15px 0; font-size: 16px; font-weight: bold; text-transform: uppercase;\">\n                   RECUPERA\u00C7\u00C3O DE ACESSO\n                </p>\n                <div style=\"color: #555555; margin: 0 0 25px 0; font-size: 14px; line-height: 1.6; text-align: center; white-space: pre-wrap;\">Voc\u00EA solicitou a recupera\u00E7\u00E3o da sua credencial. Utilize o c\u00F3digo de acesso abaixo para redefinir sua senha. Este c\u00F3digo expira em 15 minutos.</div>\n                <div style=\"background-color: #1a1a1a; color: #ffd700; border: 1px dashed #ffd700; padding: 20px; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;\">\n                  ".concat(reset_code, "\n                </div>\n              </td>\n            </tr>\n            <tr>\n              <td align=\"center\" style=\"background-color: #eeeeee; padding: 20px;\">\n                <p style=\"color: #999999; margin: 0; font-size: 10px; font-family: monospace; text-transform: uppercase;\">\n                  N\u00E3o responda a este e-mail. Gerado pelo sistema HQ Suopes.\n                </p>\n              </td>\n            </tr>\n          </table>\n        </div>\n      ");
                                    _a.label = 4;
                                case 4:
                                    _a.trys.push([4, 6, , 7]);
                                    return [4 /*yield*/, transporter.sendMail({
                                            from: "\"SUOPES TACTICAL\" <".concat(process.env.SMTP_USER || 'suopestactical@gmail.com', ">"),
                                            to: email,
                                            subject: "Recuperação de Acesso SUOPES",
                                            html: htmlBody,
                                            attachments: attachments
                                        })];
                                case 5:
                                    _a.sent();
                                    console.log("E-mail de recupera\u00E7\u00E3o enviado para: ".concat(email));
                                    return [3 /*break*/, 7];
                                case 6:
                                    e_15 = _a.sent();
                                    console.error("ERRO CRÍTICO AO ENVIAR E-MAIL DE RECUPERAÇÃO:", e_15.message);
                                    return [3 /*break*/, 7];
                                case 7:
                                    res.json({ message: "Se o e-mail existir, um código foi enviado." });
                                    return [3 /*break*/, 9];
                                case 8:
                                    err_7 = _a.sent();
                                    console.error(err_7);
                                    res.status(500).json({ message: "Erro interno no servidor" });
                                    return [3 /*break*/, 9];
                                case 9: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.post("/api/reset-password", authLimiter, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, email, code, newPassword, users, user, password_hash, err_8;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _a = req.body, email = _a.email, code = _a.code, newPassword = _a.newPassword;
                                    if (!email || !code || !newPassword)
                                        return [2 /*return*/, res.status(400).json({ message: "Preencha todos os campos" })];
                                    _b.label = 1;
                                case 1:
                                    _b.trys.push([1, 5, , 6]);
                                    return [4 /*yield*/, db.execute('SELECT id, reset_code, reset_expires FROM users WHERE email = ?', [email])];
                                case 2:
                                    users = (_b.sent())[0];
                                    user = users[0];
                                    if (!user || user.reset_code !== code) {
                                        return [2 /*return*/, res.status(400).json({ message: "Código inválido" })];
                                    }
                                    if (new Date(user.reset_expires) < new Date()) {
                                        return [2 /*return*/, res.status(400).json({ message: "Código expirado" })];
                                    }
                                    return [4 /*yield*/, bcryptjs_1.default.hash(newPassword, 10)];
                                case 3:
                                    password_hash = _b.sent();
                                    return [4 /*yield*/, db.execute('UPDATE users SET password_hash = ?, reset_code = NULL, reset_expires = NULL WHERE id = ?', [password_hash, user.id])];
                                case 4:
                                    _b.sent();
                                    res.json({ message: "Senha alterada com sucesso." });
                                    return [3 /*break*/, 6];
                                case 5:
                                    err_8 = _b.sent();
                                    console.error(err_8);
                                    res.status(500).json({ message: "Erro interno no servidor" });
                                    return [3 /*break*/, 6];
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.post("/api/login", authLimiter, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, email, password, users, user, isMatch, role, token, err_9;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _a = req.body, email = _a.email, password = _a.password;
                                    if (!email || !password)
                                        return [2 /*return*/, res.status(400).json({ message: "E-mail e senha são obrigatórios" })];
                                    _b.label = 1;
                                case 1:
                                    _b.trys.push([1, 4, , 5]);
                                    return [4 /*yield*/, db.execute('SELECT * FROM users WHERE email = ?', [email])];
                                case 2:
                                    users = (_b.sent())[0];
                                    user = users[0];
                                    if (!user) {
                                        return [2 /*return*/, res.status(401).json({ message: "Credenciais inválidas" })];
                                    }
                                    return [4 /*yield*/, bcryptjs_1.default.compare(password, user.password_hash)];
                                case 3:
                                    isMatch = _b.sent();
                                    if (!isMatch) {
                                        return [2 /*return*/, res.status(401).json({ message: "Credenciais inválidas" })];
                                    }
                                    if (!user.verified) {
                                        return [2 /*return*/, res.status(403).json({ message: "Por favor, verifique seu e-mail antes de fazer login", unverified: true })];
                                    }
                                    role = ['samuelcpaulino@gmail.com', 'habnadabeh@gmail.com', 'fabinparafal762@gmail.com'].includes(user.email) ? 'admin' : user.role;
                                    token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: role }, JWT_SECRET, { expiresIn: "24h" });
                                    res.json({
                                        id: user.id,
                                        name: user.name,
                                        email: user.email,
                                        role: role,
                                        token: token
                                    });
                                    return [3 /*break*/, 5];
                                case 4:
                                    err_9 = _b.sent();
                                    console.error(err_9);
                                    res.status(500).json({ message: "Erro interno no servidor" });
                                    return [3 /*break*/, 5];
                                case 5: return [2 /*return*/];
                            }
                        });
                    }); });
                    // API PARA PRODUTOS (MYSQL PERSISTENTE)
                    app.get("/api/products", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var rows, mappedProducts, err_10;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, db.execute("SELECT * FROM products ORDER BY created_at DESC")];
                                case 1:
                                    rows = (_a.sent())[0];
                                    mappedProducts = rows.map(function (p) {
                                        var images = [p.image, p.image, p.image, p.image];
                                        var colors = [];
                                        var sizes = [];
                                        try {
                                            if (p.images)
                                                images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
                                        }
                                        catch (e) {
                                            console.error("Erro parse imagens:", e);
                                        }
                                        try {
                                            if (p.colors)
                                                colors = typeof p.colors === 'string' ? JSON.parse(p.colors) : p.colors;
                                        }
                                        catch (e) {
                                            console.error("Erro parse cores:", e);
                                        }
                                        try {
                                            if (p.sizes)
                                                sizes = typeof p.sizes === 'string' ? JSON.parse(p.sizes) : p.sizes;
                                        }
                                        catch (e) {
                                            console.error("Erro parse sizes:", e);
                                        }
                                        return __assign(__assign({}, p), { inStock: p.in_stock === 1, images: Array.isArray(images) ? images : [p.image, p.image, p.image, p.image], colors: Array.isArray(colors) ? colors : [], sizes: Array.isArray(sizes) ? sizes : [], hasSizes: p.has_sizes === 1, features: p.features || null, care: p.care || null, stockQuantity: (p.stock_quantity !== null && p.stock_quantity !== undefined) ? p.stock_quantity : 0, isPresale: p.is_presale === 1, presaleDate: p.presale_date || null, featured: p.featured === 1, recommendedProductId: p.recommended_product_id || null });
                                    });
                                    res.json(mappedProducts);
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_10 = _a.sent();
                                    console.error("Erro ao buscar produtos:", err_10);
                                    res.status(500).json({ message: "Erro ao buscar produtos" });
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.post("/api/products", requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, name_1, description, price, category, image, featured, inStock, sku, sizes, hasSizes, features, care, stockQuantity, isPresale, presaleDate, recommendedProductId, id, defaultImages, defaultColors, sizesJson, finalStockQuantity, finalInStock, autoCategory, autoSku, err_11;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 2, , 3]);
                                    _a = req.body, name_1 = _a.name, description = _a.description, price = _a.price, category = _a.category, image = _a.image, featured = _a.featured, inStock = _a.inStock, sku = _a.sku, sizes = _a.sizes, hasSizes = _a.hasSizes, features = _a.features, care = _a.care, stockQuantity = _a.stockQuantity, isPresale = _a.isPresale, presaleDate = _a.presaleDate, recommendedProductId = _a.recommendedProductId;
                                    id = Date.now().toString();
                                    defaultImages = JSON.stringify([image, image, image, image]);
                                    defaultColors = JSON.stringify([]);
                                    sizesJson = sizes ? JSON.stringify(sizes) : JSON.stringify([]);
                                    finalStockQuantity = (stockQuantity !== undefined && stockQuantity !== null) ? Number(stockQuantity) : 0;
                                    finalInStock = finalStockQuantity > 0 ? 1 : 0;
                                    autoCategory = category ? category.split(',')[0].substring(0, 3).toUpperCase() : 'GER';
                                    autoSku = sku && sku.trim() !== '' ? sku : "SUO-".concat(autoCategory, "-").concat(id.slice(-6));
                                    return [4 /*yield*/, db.execute("INSERT INTO products (id, name, description, price, category, image, images, colors, sizes, has_sizes, features, care, featured, in_stock, stock_quantity, sku, is_presale, presale_date, recommended_product_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [id, name_1, description, price, category, image, defaultImages, defaultColors, sizesJson, hasSizes ? 1 : 0, features || null, care || null, featured ? 1 : 0, finalInStock, finalStockQuantity, autoSku, isPresale ? 1 : 0, presaleDate || null, recommendedProductId || null])];
                                case 1:
                                    _b.sent();
                                    res.json(__assign(__assign({ id: id, sku: autoSku }, req.body), { stockQuantity: finalStockQuantity, inStock: finalInStock === 1 }));
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_11 = _b.sent();
                                    console.error("Erro ao criar produto:", err_11);
                                    res.status(500).json({ message: "Erro ao criar produto" });
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.put("/api/products/:id", requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var id, _a, name_2, description, price, category, image, featured, inStock, images, colors, sizes, hasSizes, features, care, sku, stockQuantity, isPresale, presaleDate, recommendedProductId, imagesJson, colorsJson, sizesJson, finalStockQuantity, finalInStock, rows, p, parsedImages, parsedColors, parsedSizes, err_12;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 3, , 4]);
                                    id = req.params.id;
                                    _a = req.body, name_2 = _a.name, description = _a.description, price = _a.price, category = _a.category, image = _a.image, featured = _a.featured, inStock = _a.inStock, images = _a.images, colors = _a.colors, sizes = _a.sizes, hasSizes = _a.hasSizes, features = _a.features, care = _a.care, sku = _a.sku, stockQuantity = _a.stockQuantity, isPresale = _a.isPresale, presaleDate = _a.presaleDate, recommendedProductId = _a.recommendedProductId;
                                    imagesJson = images ? JSON.stringify(images) : JSON.stringify([image, image, image, image]);
                                    colorsJson = colors ? JSON.stringify(colors) : JSON.stringify([]);
                                    sizesJson = sizes ? JSON.stringify(sizes) : JSON.stringify([]);
                                    finalStockQuantity = (stockQuantity !== undefined && stockQuantity !== null) ? Number(stockQuantity) : 0;
                                    finalInStock = finalStockQuantity > 0 ? 1 : 0;
                                    return [4 /*yield*/, db.execute("UPDATE products SET name = ?, description = ?, price = ?, category = ?, image = ?, featured = ?, in_stock = ?, stock_quantity = ?, images = ?, colors = ?, sizes = ?, has_sizes = ?, features = ?, care = ?, sku = ?, is_presale = ?, presale_date = ?, recommended_product_id = ? WHERE id = ?", [name_2, description, price, category, image, featured ? 1 : 0, finalInStock, finalStockQuantity, imagesJson, colorsJson, sizesJson, hasSizes ? 1 : 0, features || null, care || null, sku || null, isPresale ? 1 : 0, presaleDate || null, recommendedProductId || null, id])];
                                case 1:
                                    _b.sent();
                                    return [4 /*yield*/, db.execute("SELECT * FROM products WHERE id = ?", [id])];
                                case 2:
                                    rows = (_b.sent())[0];
                                    if (rows.length > 0) {
                                        p = rows[0];
                                        parsedImages = [p.image, p.image, p.image, p.image];
                                        parsedColors = [];
                                        parsedSizes = [];
                                        try {
                                            if (p.images)
                                                parsedImages = JSON.parse(p.images);
                                        }
                                        catch (e) { }
                                        try {
                                            if (p.colors)
                                                parsedColors = JSON.parse(p.colors);
                                        }
                                        catch (e) { }
                                        try {
                                            if (p.sizes)
                                                parsedSizes = JSON.parse(p.sizes);
                                        }
                                        catch (e) { }
                                        res.json(__assign(__assign({}, p), { inStock: p.in_stock === 1, images: Array.isArray(parsedImages) ? parsedImages : [p.image, p.image, p.image, p.image], colors: Array.isArray(parsedColors) ? parsedColors : [], sizes: Array.isArray(parsedSizes) ? parsedSizes : [], hasSizes: p.has_sizes === 1, stockQuantity: (p.stock_quantity !== null && p.stock_quantity !== undefined) ? p.stock_quantity : 0, isPresale: p.is_presale === 1, presaleDate: p.presale_date || null, featured: p.featured === 1, recommendedProductId: p.recommended_product_id || null }));
                                    }
                                    else {
                                        res.json({ success: true });
                                    }
                                    return [3 /*break*/, 4];
                                case 3:
                                    err_12 = _b.sent();
                                    console.error("Erro ao atualizar produto:", err_12);
                                    res.status(500).json({ message: "Erro ao atualizar produto" });
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.post("/api/upload", requireAdmin, upload.single("image"), function (req, res) {
                        if (!req.file) {
                            return res.status(400).json({ message: "Nenhum arquivo enviado" });
                        }
                        var imageUrl = "/uploads/".concat(req.file.filename);
                        res.json({ imageUrl: imageUrl });
                    });
                    app.delete("/api/products/:id", requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var id, err_13;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    id = req.params.id;
                                    return [4 /*yield*/, db.execute("DELETE FROM products WHERE id = ?", [id])];
                                case 1:
                                    _a.sent();
                                    res.json({ success: true });
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_13 = _a.sent();
                                    console.error(err_13);
                                    res.status(500).json({ message: "Erro ao deletar produto" });
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    // Redirecionamento legado para o novo sistema de lista de espera
                    app.post("/api/notify", function (req, res) {
                        res.redirect(307, "/api/waitlist");
                    });
                    // Gallery API
                    app.get("/api/gallery", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var rows, err_14;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, db.execute("SELECT *, date_string as date FROM gallery ORDER BY sort_order ASC, id DESC")];
                                case 1:
                                    rows = (_a.sent())[0];
                                    res.json(rows);
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_14 = _a.sent();
                                    console.error(err_14);
                                    res.status(500).json({ message: "Erro ao buscar galeria" });
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    // Reorder gallery items
                    app.put("/api/gallery/reorder", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var orderedIds, i, err_15;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 5, , 6]);
                                    orderedIds = req.body.orderedIds;
                                    if (!Array.isArray(orderedIds))
                                        return [2 /*return*/, res.status(400).json({ message: "orderedIds deve ser um array" })];
                                    i = 0;
                                    _a.label = 1;
                                case 1:
                                    if (!(i < orderedIds.length)) return [3 /*break*/, 4];
                                    return [4 /*yield*/, db.execute("UPDATE gallery SET sort_order = ? WHERE id = ?", [i, orderedIds[i]])];
                                case 2:
                                    _a.sent();
                                    _a.label = 3;
                                case 3:
                                    i++;
                                    return [3 /*break*/, 1];
                                case 4:
                                    res.json({ success: true });
                                    return [3 /*break*/, 6];
                                case 5:
                                    err_15 = _a.sent();
                                    console.error("Erro ao reordenar galeria:", err_15);
                                    res.status(500).json({ message: "Erro ao reordenar galeria" });
                                    return [3 /*break*/, 6];
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.post("/api/gallery", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, image, title, context, location_1, date, err_16;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 2, , 3]);
                                    _a = req.body, image = _a.image, title = _a.title, context = _a.context, location_1 = _a.location, date = _a.date;
                                    return [4 /*yield*/, db.execute("INSERT INTO gallery (image, title, context, location, date_string) VALUES (?, ?, ?, ?, ?)", [image, title, context, location_1, date])];
                                case 1:
                                    _b.sent();
                                    res.json(__assign({ success: true }, req.body));
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_16 = _b.sent();
                                    console.error(err_16);
                                    res.status(500).json({ message: "Erro ao criar item na galeria" });
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.put("/api/gallery/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var id, _a, image, title, context, location_2, date, err_17;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 2, , 3]);
                                    id = req.params.id;
                                    _a = req.body, image = _a.image, title = _a.title, context = _a.context, location_2 = _a.location, date = _a.date;
                                    return [4 /*yield*/, db.execute("UPDATE gallery SET image = ?, title = ?, context = ?, location = ?, date_string = ? WHERE id = ?", [image, title, context, location_2, date, id])];
                                case 1:
                                    _b.sent();
                                    res.json({ success: true });
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_17 = _b.sent();
                                    console.error(err_17);
                                    res.status(500).json({ message: "Erro ao atualizar item da galeria" });
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.delete("/api/gallery/:id", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var id, err_18;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    id = req.params.id;
                                    return [4 /*yield*/, db.execute("DELETE FROM gallery WHERE id = ?", [id])];
                                case 1:
                                    _a.sent();
                                    res.json({ success: true });
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_18 = _a.sent();
                                    console.error(err_18);
                                    res.status(500).json({ message: "Erro ao deletar item da galeria" });
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    // ============================================
                    // SISTEMA DE CUPONS
                    // ============================================
                    // Admin: Listar todos os cupons
                    app.get("/api/admin/coupons", requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var rows, err_19;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, db.execute("SELECT * FROM coupons ORDER BY created_at DESC")];
                                case 1:
                                    rows = (_a.sent())[0];
                                    res.json(rows);
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_19 = _a.sent();
                                    console.error("Erro ao buscar cupons:", err_19);
                                    res.status(500).json({ message: "Erro ao buscar cupons" });
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    // Admin: Criar cupom
                    app.post("/api/admin/coupons", requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, code, type, value, minPurchase, maxDiscount, maxUses, maxUsesPerUser, appliesTo, startsAt, expiresAt, existing, err_20;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 3, , 4]);
                                    _a = req.body, code = _a.code, type = _a.type, value = _a.value, minPurchase = _a.minPurchase, maxDiscount = _a.maxDiscount, maxUses = _a.maxUses, maxUsesPerUser = _a.maxUsesPerUser, appliesTo = _a.appliesTo, startsAt = _a.startsAt, expiresAt = _a.expiresAt;
                                    if (!code || !type) {
                                        return [2 /*return*/, res.status(400).json({ message: "Código e tipo são obrigatórios." })];
                                    }
                                    return [4 /*yield*/, db.execute("SELECT id FROM coupons WHERE code = ?", [code.toUpperCase().trim()])];
                                case 1:
                                    existing = (_b.sent())[0];
                                    if (existing.length > 0) {
                                        return [2 /*return*/, res.status(409).json({ message: "Já existe um cupom com este código." })];
                                    }
                                    return [4 /*yield*/, db.execute("INSERT INTO coupons (code, type, value, min_purchase, max_discount, max_uses, max_uses_per_user, applies_to, starts_at, expires_at)\n         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
                                            code.toUpperCase().trim(),
                                            type,
                                            value || 0,
                                            minPurchase || 0,
                                            maxDiscount || null,
                                            maxUses || null,
                                            maxUsesPerUser || null,
                                            appliesTo || null,
                                            startsAt || null,
                                            expiresAt || null
                                        ])];
                                case 2:
                                    _b.sent();
                                    res.status(201).json({ success: true, message: "Cupom criado com sucesso." });
                                    return [3 /*break*/, 4];
                                case 3:
                                    err_20 = _b.sent();
                                    console.error("Erro ao criar cupom:", err_20);
                                    res.status(500).json({ message: "Erro ao criar cupom" });
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); });
                    // Admin: Ativar/Desativar cupom
                    app.patch("/api/admin/coupons/:id/toggle", requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var id, err_21;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    id = req.params.id;
                                    return [4 /*yield*/, db.execute("UPDATE coupons SET active = NOT active WHERE id = ?", [id])];
                                case 1:
                                    _a.sent();
                                    res.json({ success: true });
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_21 = _a.sent();
                                    console.error("Erro ao alternar cupom:", err_21);
                                    res.status(500).json({ message: "Erro ao alternar cupom" });
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    // Admin: Deletar cupom
                    app.delete("/api/admin/coupons/:id", requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var id, err_22;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 3, , 4]);
                                    id = req.params.id;
                                    return [4 /*yield*/, db.execute("DELETE FROM coupon_uses WHERE coupon_id = ?", [id])];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, db.execute("DELETE FROM coupons WHERE id = ?", [id])];
                                case 2:
                                    _a.sent();
                                    res.json({ success: true });
                                    return [3 /*break*/, 4];
                                case 3:
                                    err_22 = _a.sent();
                                    console.error("Erro ao deletar cupom:", err_22);
                                    res.status(500).json({ message: "Erro ao deletar cupom" });
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); });
                    // Público: Validar cupom no checkout
                    app.post("/api/coupons/validate", authenticateToken, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, code, subtotal, userId, rows, coupon, userUses, minPurchase, discount, freeShipping, err_23;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 4, , 5]);
                                    _a = req.body, code = _a.code, subtotal = _a.subtotal;
                                    userId = req.user.id;
                                    if (!code)
                                        return [2 /*return*/, res.status(400).json({ message: "Código do cupom é obrigatório." })];
                                    return [4 /*yield*/, db.execute("SELECT * FROM coupons WHERE code = ?", [code.toUpperCase().trim()])];
                                case 1:
                                    rows = (_b.sent())[0];
                                    if (rows.length === 0) {
                                        return [2 /*return*/, res.status(404).json({ message: "Cupom não encontrado." })];
                                    }
                                    coupon = rows[0];
                                    // Verificar se está ativo
                                    if (!coupon.active) {
                                        return [2 /*return*/, res.status(400).json({ message: "Este cupom está desativado." })];
                                    }
                                    // Verificar data de início
                                    if (coupon.starts_at && new Date(coupon.starts_at) > new Date()) {
                                        return [2 /*return*/, res.status(400).json({ message: "Este cupom ainda não está válido." })];
                                    }
                                    // Verificar expiração
                                    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
                                        return [2 /*return*/, res.status(400).json({ message: "Este cupom já expirou." })];
                                    }
                                    // Verificar limite global de usos
                                    if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
                                        return [2 /*return*/, res.status(400).json({ message: "Este cupom atingiu o limite máximo de usos." })];
                                    }
                                    if (!(coupon.max_uses_per_user !== null)) return [3 /*break*/, 3];
                                    return [4 /*yield*/, db.execute("SELECT COUNT(*) as count FROM coupon_uses WHERE coupon_id = ? AND user_id = ?", [coupon.id, userId])];
                                case 2:
                                    userUses = (_b.sent())[0];
                                    if (userUses[0].count >= coupon.max_uses_per_user) {
                                        return [2 /*return*/, res.status(400).json({ message: "Você já utilizou este cupom o máximo de vezes permitido." })];
                                    }
                                    _b.label = 3;
                                case 3:
                                    minPurchase = parseFloat(coupon.min_purchase) || 0;
                                    if (subtotal < minPurchase) {
                                        return [2 /*return*/, res.status(400).json({ message: "Compra m\u00EDnima de R$ ".concat(minPurchase.toFixed(2), " necess\u00E1ria para este cupom.") })];
                                    }
                                    discount = 0;
                                    freeShipping = false;
                                    if (coupon.type === "percentage") {
                                        discount = (subtotal * parseFloat(coupon.value)) / 100;
                                        if (coupon.max_discount !== null) {
                                            discount = Math.min(discount, parseFloat(coupon.max_discount));
                                        }
                                    }
                                    else if (coupon.type === "fixed") {
                                        discount = parseFloat(coupon.value);
                                        discount = Math.min(discount, subtotal); // Não pode exceder o subtotal
                                    }
                                    else if (coupon.type === "free_shipping") {
                                        freeShipping = true;
                                        discount = 0;
                                    }
                                    res.json({
                                        valid: true,
                                        couponId: coupon.id,
                                        code: coupon.code,
                                        type: coupon.type,
                                        discount: parseFloat(discount.toFixed(2)),
                                        freeShipping: freeShipping,
                                        description: coupon.type === "percentage"
                                            ? "".concat(coupon.value, "% OFF")
                                            : coupon.type === "fixed"
                                                ? "R$ ".concat(parseFloat(coupon.value).toFixed(2), " OFF")
                                                : "FRETE GRÁTIS"
                                    });
                                    return [3 /*break*/, 5];
                                case 4:
                                    err_23 = _b.sent();
                                    console.error("Erro ao validar cupom:", err_23);
                                    res.status(500).json({ message: "Erro ao validar cupom." });
                                    return [3 /*break*/, 5];
                                case 5: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.post("/api/shipping", function (req, res) {
                        var _a = req.body, cep = _a.cep, totalAmount = _a.totalAmount;
                        if (!cep)
                            return res.status(400).json({ message: "CEP obrigatório" });
                        // Simulador mock de frete
                        var options = [
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
                        res.json({ options: options });
                    });
                    // ASSISTENTE SUOPES AI API
                    app.post("/api/chat", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var messages, context, model, formattedHistory, chat, lastMessage, result, response, text, error_2;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    messages = req.body.messages;
                                    if (!process.env.GEMINI_API_KEY) {
                                        return [2 /*return*/, res.status(500).json({ message: "Assistente temporariamente fora de serviço (Chave não configurada)." })];
                                    }
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 5, , 6]);
                                    return [4 /*yield*/, getAssistantContext()];
                                case 2:
                                    context = _a.sent();
                                    model = genAI.getGenerativeModel({
                                        model: "gemini-2.5-flash",
                                        systemInstruction: "Voc\u00EA \u00E9 uma Intelig\u00EAncia Artificial de atendimento da loja SUOPES TACTICAL.\n        Sua miss\u00E3o \u00E9 ajudar os clientes a encontrarem produtos, esclarecer especifica\u00E7\u00F5es t\u00E9cnicas e dar as melhores recomenda\u00E7\u00F5es com base no seu cat\u00E1logo.\n        \n        REGRAS DE CONDUTA:\n        1. Fale de maneira natural, educada, clara e objetiva. NUNCA crie listas enumeradas, t\u00F3picos, marcadores (*, -) ou frases soltas terminadas em ponto (.). Escreva SEMPRE em par\u00E1grafos normais, diretos e cont\u00EDnuos. N\u00C3O use encena\u00E7\u00F5es ou jarg\u00F5es for\u00E7ados.\n        2. POSI\u00C7\u00C3O DE BOT\u00D5ES E LINKS: OBRIGAT\u00D3RIO: NUNCA, SOB NENHUMA HIP\u00D3TESE, coloque tags [PRODUTO:id] ou links markdown no MEIO do seu par\u00E1grafo ou frase. Voc\u00EA DEVE primeiro concluir TODO o seu texto e explica\u00E7\u00E3o e apenas colocar as Tags e Links isolados na \u00DALTIMA LINHA da sua resposta.\n        3. PRODUTOS: Sempre que sugerir produtos, coloque a tag literal EXATAMENTE ASSIM: [PRODUTO:id] isolada no fim da resposta. Exemplo: [PRODUTO:suo-001]. IMPORTANTE: Nunca envolva a tag em negritos (**[PRODUTO:id]**) e nunca envie mais de dois produtos de uma vez.\n        4. CAT\u00C1LOGO: N\u00C3O fique mandando o usu\u00E1rio ver o cat\u00E1logo a toda hora. S\u00F3 mande se o contexto for de busca estritamente gen\u00E9rica. Caso precise, envie APENAS O LINK LITERAL no fim da mensagem: [Ver Cat\u00E1logo](/#catalogo).\n        5. ATENDIMENTO HUMANO: Ofere\u00E7a o humano EXCLUSIVAMENTE para problemas t\u00E9cnicos, cancelamentos, ou d\u00FAvidas de FABRICA\u00C7\u00C3O E ORIGEM DOS PRODUTOS (Voc\u00EA N\u00C3O DEVE responder sobre fabrica\u00E7\u00E3o, passe para um humano). Pergunte antes, e se o cliente aceitar, mande o link no fim: [Falar com Humano](https://wa.me/551153047015).\n        6. ESTOQUE E TAMANHOS: Voc\u00EA tem acesso aos produtos ativos E esgotados. Se um cliente perguntar sobre algo esgotado, avise pacientemente que ele est\u00E1 indispon\u00EDvel momentaneamente. NUNCA diga que n\u00E3o temos um produto apenas por ele estar esgotado.\n        7. PAGAMENTO E HIST\u00D3RICO: Nosso checkout \u00E9 via MERCADO PAGO, 100% seguro. Aceitamos Cart\u00E3o, PIX e Boleto. Se perguntarem sobre acompanhar um pedido, oriente o cliente a fazer Login e acessar o menu \"Minhas Compras\" e jogue o bot\u00E3o l\u00E1 embaixo: [Acessar Pedidos](/compras).\n        8. MAPA DO SITE E ROTAS: Se precisar direcionar, coloque o link sempre no final do texto: Login: [Entrar na Conta](/login). Cadastrar: [Criar Conta](/register). Galeria de Opera\u00E7\u00F5es: [Ver Galeria](/galeria). Legal: [P\u00E1gina Legal](/legal).\n        9. Utilize apenas as informa\u00E7\u00F5es de cat\u00E1logo fornecidas abaixo. Nunca invente informa\u00E7\u00F5es.\n\n        CAT\u00C1LOGO E INFORMA\u00C7\u00D5ES:\n        ".concat(context)
                                    });
                                    formattedHistory = messages.slice(0, -1).map(function (m) { return ({
                                        role: m.role === "user" ? "user" : "model",
                                        parts: [{ text: m.content }],
                                    }); });
                                    // Gemini exige que a primeira mensagem do history seja do 'user'.
                                    // Como o Assistant manda uma saudação inicial (model), removemos ela.
                                    if (formattedHistory.length > 0 && formattedHistory[0].role === "model") {
                                        formattedHistory.shift();
                                    }
                                    chat = model.startChat({
                                        history: formattedHistory,
                                    });
                                    lastMessage = messages[messages.length - 1].content;
                                    return [4 /*yield*/, chat.sendMessage(lastMessage)];
                                case 3:
                                    result = _a.sent();
                                    return [4 /*yield*/, result.response];
                                case 4:
                                    response = _a.sent();
                                    text = response.text();
                                    res.json({ content: text });
                                    return [3 /*break*/, 6];
                                case 5:
                                    error_2 = _a.sent();
                                    console.error("Erro no chat do assistente:", error_2);
                                    res.status(500).json({ message: "Desculpe operador, houve uma falha na comunicação tática.", error: error_2.message });
                                    return [3 /*break*/, 6];
                                case 6: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.post("/api/checkout", authenticateToken, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, payerEmail, payerName, cpf, phone, items, shippingAddress, paymentMethod, shippingCost, couponCode, couponDiscount, couponFreeShipping, userId, connection, calculatedTotal, secureItems, _i, items_2, item, itemQuantity, rows, dbProduct, realPrice, currentStock, newStock, newInStock, appliedDiscount, finalShippingCost, orderId, mp_id, mp_qr_code_base64, mp_qr_code, redirectUrl, client, payment, result, preference, result, query, itemQuery, _b, secureItems_1, item, couponRows, couponId, couponErr_1, err_24, rollbackErr_1;
                        var _c, _d, _e, _f, _g, _h;
                        return __generator(this, function (_j) {
                            switch (_j.label) {
                                case 0:
                                    _a = req.body, payerEmail = _a.payerEmail, payerName = _a.payerName, cpf = _a.cpf, phone = _a.phone, items = _a.items, shippingAddress = _a.shippingAddress, paymentMethod = _a.paymentMethod, shippingCost = _a.shippingCost, couponCode = _a.couponCode, couponDiscount = _a.couponDiscount, couponFreeShipping = _a.couponFreeShipping;
                                    userId = req.user.id;
                                    if (!items || !items.length) {
                                        return [2 /*return*/, res.status(400).json({ message: "Carrinho vazio ou inválido" })];
                                    }
                                    if (!cpf || !phone) {
                                        return [2 /*return*/, res.status(400).json({ message: "CPF e Telefone são obrigatórios para checkout." })];
                                    }
                                    return [4 /*yield*/, db.getConnection()];
                                case 1:
                                    connection = _j.sent();
                                    _j.label = 2;
                                case 2:
                                    _j.trys.push([2, 32, , 37]);
                                    return [4 /*yield*/, connection.beginTransaction()];
                                case 3:
                                    _j.sent();
                                    calculatedTotal = 0;
                                    secureItems = [];
                                    _i = 0, items_2 = items;
                                    _j.label = 4;
                                case 4:
                                    if (!(_i < items_2.length)) return [3 /*break*/, 12];
                                    item = items_2[_i];
                                    itemQuantity = parseInt(item.quantity) || 1;
                                    return [4 /*yield*/, connection.execute("SELECT id, name, price, stock_quantity, in_stock FROM products WHERE id = ? FOR UPDATE", [item.id])];
                                case 5:
                                    rows = (_j.sent())[0];
                                    if (!(rows.length === 0)) return [3 /*break*/, 7];
                                    return [4 /*yield*/, connection.rollback()];
                                case 6:
                                    _j.sent();
                                    connection.release();
                                    return [2 /*return*/, res.status(400).json({ message: "Produto ".concat(item.id, " n\u00E3o encontrado no banco de dados.") })];
                                case 7:
                                    dbProduct = rows[0];
                                    realPrice = parseFloat(dbProduct.price);
                                    currentStock = dbProduct.stock_quantity !== undefined ? dbProduct.stock_quantity : 10;
                                    if (!(currentStock < itemQuantity)) return [3 /*break*/, 9];
                                    return [4 /*yield*/, connection.rollback()];
                                case 8:
                                    _j.sent();
                                    connection.release();
                                    return [2 /*return*/, res.status(409).json({
                                            message: "Estoque insuficiente para \"".concat(dbProduct.name, "\". Dispon\u00EDvel: ").concat(currentStock, ", Solicitado: ").concat(itemQuantity, "."),
                                            productId: item.id,
                                            available: currentStock
                                        })];
                                case 9:
                                    newStock = currentStock - itemQuantity;
                                    newInStock = newStock > 0 ? 1 : 0;
                                    return [4 /*yield*/, connection.execute("UPDATE products SET stock_quantity = ?, in_stock = ? WHERE id = ?", [newStock, newInStock, item.id])];
                                case 10:
                                    _j.sent();
                                    console.log("[ESTOQUE] Produto ".concat(dbProduct.name, ": ").concat(currentStock, " -> ").concat(newStock, " (Reservado: ").concat(itemQuantity, ")"));
                                    calculatedTotal += (realPrice * itemQuantity);
                                    secureItems.push(__assign(__assign({}, item), { price: realPrice }));
                                    _j.label = 11;
                                case 11:
                                    _i++;
                                    return [3 /*break*/, 4];
                                case 12:
                                    appliedDiscount = parseFloat(couponDiscount || 0);
                                    if (appliedDiscount > 0) {
                                        calculatedTotal = Math.max(0, calculatedTotal - appliedDiscount);
                                    }
                                    finalShippingCost = couponFreeShipping ? 0 : parseFloat(shippingCost || 0);
                                    calculatedTotal += finalShippingCost;
                                    orderId = "ORD-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
                                    mp_id = null;
                                    mp_qr_code_base64 = null;
                                    mp_qr_code = null;
                                    redirectUrl = null;
                                    if (!(process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN !== "APP_USR-SEU_TOKEN_DE_TESTE_OU_PRODUCAO_AQUI")) return [3 /*break*/, 17];
                                    client = new mercadopago_1.MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
                                    if (!(paymentMethod === "pix")) return [3 /*break*/, 14];
                                    payment = new mercadopago_1.Payment(client);
                                    return [4 /*yield*/, payment.create({
                                            body: {
                                                transaction_amount: calculatedTotal,
                                                description: "SUOPES TACTICAL - Pedido ".concat(orderId),
                                                payment_method_id: "pix",
                                                external_reference: orderId,
                                                payer: { email: payerEmail || userId || "cliente@suopes.com" },
                                                notification_url: process.env.APP_URL ? "".concat(process.env.APP_URL, "/api/mp/webhook") : undefined
                                            }
                                        })];
                                case 13:
                                    result = _j.sent();
                                    mp_id = ((_c = result.id) === null || _c === void 0 ? void 0 : _c.toString()) || null;
                                    mp_qr_code_base64 = ((_e = (_d = result.point_of_interaction) === null || _d === void 0 ? void 0 : _d.transaction_data) === null || _e === void 0 ? void 0 : _e.qr_code_base64) || null;
                                    mp_qr_code = ((_g = (_f = result.point_of_interaction) === null || _f === void 0 ? void 0 : _f.transaction_data) === null || _g === void 0 ? void 0 : _g.qr_code) || null;
                                    return [3 /*break*/, 16];
                                case 14:
                                    if (!(paymentMethod === "credit_card")) return [3 /*break*/, 16];
                                    preference = new mercadopago_1.Preference(client);
                                    return [4 /*yield*/, preference.create({
                                            body: {
                                                items: [
                                                    {
                                                        id: orderId,
                                                        title: "SUOPES TACTICAL - Pedido ".concat(orderId),
                                                        quantity: 1,
                                                        unit_price: calculatedTotal
                                                    }
                                                ],
                                                external_reference: orderId,
                                                payer: { email: payerEmail || userId || "cliente@suopes.com" },
                                                back_urls: {
                                                    success: process.env.APP_URL ? "".concat(process.env.APP_URL, "/compras") : "http://localhost:3000/compras",
                                                    failure: process.env.APP_URL ? "".concat(process.env.APP_URL, "/checkout") : "http://localhost:3000/checkout"
                                                },
                                                auto_return: "approved",
                                                notification_url: process.env.APP_URL ? "".concat(process.env.APP_URL, "/api/mp/webhook") : undefined
                                            }
                                        })];
                                case 15:
                                    result = _j.sent();
                                    redirectUrl = result.init_point;
                                    mp_id = ((_h = result.id) === null || _h === void 0 ? void 0 : _h.toString()) || null;
                                    _j.label = 16;
                                case 16: return [3 /*break*/, 18];
                                case 17:
                                    // MOCK PARA TESTES QUANDO NÃO TEM TOKEN REAL
                                    if (paymentMethod === "pix") {
                                        mp_id = "MOCK-" + Math.floor(Math.random() * 1000000);
                                        mp_qr_code_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
                                        mp_qr_code = "00020126440014BR.GOV.BCB.PIX0122suopestactical@gmail.com5204000053039865802BR5915SUOPES TACTICAL6009SAO PAULO62140510ORD" + Math.floor(1000 + Math.random() * 9000) + "6304XXXX";
                                    }
                                    else if (paymentMethod === "credit_card") {
                                        mp_id = "MOCK-PREF-" + Math.floor(Math.random() * 1000000);
                                        redirectUrl = "/compras";
                                    }
                                    _j.label = 18;
                                case 18:
                                    query = "\n        INSERT INTO orders (id, user_id, customer_name, customer_email, total, shipping_cost, shipping_address, payment_method, customer_cpf, customer_phone, mp_id, mp_qr_code_base64, mp_qr_code, coupon_code, coupon_discount)\n        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n      ";
                                    return [4 /*yield*/, connection.execute(query, [
                                            orderId,
                                            userId || "anonymous",
                                            payerName || "Não informado",
                                            payerEmail || "Não informado",
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
                                            appliedDiscount
                                        ])];
                                case 19:
                                    _j.sent();
                                    itemQuery = "\n        INSERT INTO order_items (order_id, product_id, product_name, quantity, price, image, color, size)\n        VALUES (?, ?, ?, ?, ?, ?, ?, ?)\n      ";
                                    _b = 0, secureItems_1 = secureItems;
                                    _j.label = 20;
                                case 20:
                                    if (!(_b < secureItems_1.length)) return [3 /*break*/, 23];
                                    item = secureItems_1[_b];
                                    return [4 /*yield*/, connection.execute(itemQuery, [orderId, item.id, item.name, item.quantity, item.price, item.image, item.selectedColor || null, item.selectedSize || null])];
                                case 21:
                                    _j.sent();
                                    _j.label = 22;
                                case 22:
                                    _b++;
                                    return [3 /*break*/, 20];
                                case 23: 
                                // ✅ COMMIT: Tudo deu certo, confirma a transação (estoque + pedido)
                                return [4 /*yield*/, connection.commit()];
                                case 24:
                                    // ✅ COMMIT: Tudo deu certo, confirma a transação (estoque + pedido)
                                    _j.sent();
                                    connection.release();
                                    if (!couponCode) return [3 /*break*/, 31];
                                    _j.label = 25;
                                case 25:
                                    _j.trys.push([25, 30, , 31]);
                                    return [4 /*yield*/, db.execute("SELECT id FROM coupons WHERE code = ?", [couponCode.toUpperCase().trim()])];
                                case 26:
                                    couponRows = (_j.sent())[0];
                                    if (!(couponRows.length > 0)) return [3 /*break*/, 29];
                                    couponId = couponRows[0].id;
                                    return [4 /*yield*/, db.execute("INSERT INTO coupon_uses (coupon_id, user_id, order_id) VALUES (?, ?, ?)", [couponId, userId, orderId])];
                                case 27:
                                    _j.sent();
                                    return [4 /*yield*/, db.execute("UPDATE coupons SET current_uses = current_uses + 1 WHERE id = ?", [couponId])];
                                case 28:
                                    _j.sent();
                                    console.log("[CUPOM] Cupom ".concat(couponCode, " utilizado no pedido ").concat(orderId));
                                    _j.label = 29;
                                case 29: return [3 /*break*/, 31];
                                case 30:
                                    couponErr_1 = _j.sent();
                                    console.error("[CUPOM] Erro ao registrar uso do cupom (pedido já criado):", couponErr_1);
                                    return [3 /*break*/, 31];
                                case 31:
                                    console.log("[CHECKOUT] Pedido ".concat(orderId, " criado com sucesso. Estoque reservado."));
                                    // 📧 Enviar e-mail de confirmação de pedido (fire-and-forget)
                                    sendOrderEmail("confirmation", orderId);
                                    res.status(201).json({
                                        success: true,
                                        orderId: orderId,
                                        pix: mp_qr_code ? { qr_code: mp_qr_code, qr_code_base64: mp_qr_code_base64 } : null,
                                        redirectUrl: redirectUrl
                                    });
                                    return [3 /*break*/, 37];
                                case 32:
                                    err_24 = _j.sent();
                                    _j.label = 33;
                                case 33:
                                    _j.trys.push([33, 35, , 36]);
                                    return [4 /*yield*/, connection.rollback()];
                                case 34:
                                    _j.sent();
                                    return [3 /*break*/, 36];
                                case 35:
                                    rollbackErr_1 = _j.sent();
                                    return [3 /*break*/, 36];
                                case 36:
                                    connection.release();
                                    console.error("Erro no checkout:", err_24);
                                    res.status(500).json({ message: "Erro processando pedido de checkout", error: err_24.message });
                                    return [3 /*break*/, 37];
                                case 37: return [2 /*return*/];
                            }
                        });
                    }); });
                    // ============================
                    // MERCADO PAGO WEBHOOK (IPN)
                    // ============================
                    // O MP envia notificações automáticas para esta rota quando o pagamento muda de status.
                    // No painel do MP: Seu Negócio -> Configurações -> Webhooks -> URL: https://seudominio.com/api/mp/webhook
                    app.post("/api/mp/webhook", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, type, data, mpPaymentId, client, payment, paymentData, mpStatus, prevOrders, prevStatus, orderId, err_25;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 9, , 10]);
                                    _a = req.body, type = _a.type, data = _a.data;
                                    console.log("[MP WEBHOOK] Recebido:", type, data);
                                    if (!(type === "payment" && (data === null || data === void 0 ? void 0 : data.id))) return [3 /*break*/, 8];
                                    mpPaymentId = data.id.toString();
                                    if (!(process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN !== "APP_USR-SEU_TOKEN_DE_TESTE_OU_PRODUCAO_AQUI")) return [3 /*break*/, 8];
                                    client = new mercadopago_1.MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
                                    payment = new mercadopago_1.Payment(client);
                                    return [4 /*yield*/, payment.get({ id: mpPaymentId })];
                                case 1:
                                    paymentData = _b.sent();
                                    mpStatus = paymentData.status;
                                    console.log("[MP WEBHOOK] Pagamento ".concat(mpPaymentId, " => Status: ").concat(mpStatus));
                                    return [4 /*yield*/, db.execute("SELECT id, payment_status FROM orders WHERE mp_id = ?", [mpPaymentId])];
                                case 2:
                                    prevOrders = (_b.sent())[0];
                                    prevStatus = prevOrders.length > 0 ? prevOrders[0].payment_status : null;
                                    orderId = prevOrders.length > 0 ? prevOrders[0].id : null;
                                    return [4 /*yield*/, db.execute("UPDATE orders SET payment_status = ? WHERE mp_id = ?", [mpStatus, mpPaymentId])];
                                case 3:
                                    _b.sent();
                                    if (!(mpStatus === "approved")) return [3 /*break*/, 5];
                                    return [4 /*yield*/, db.execute("UPDATE orders SET status = 'processando' WHERE mp_id = ? AND status = 'pendente'", [mpPaymentId])];
                                case 4:
                                    _b.sent();
                                    // 📧 Enviar e-mail de pagamento confirmado (apenas se status anterior era diferente)
                                    if (prevStatus !== "approved" && orderId) {
                                        sendOrderEmail("approved", orderId);
                                    }
                                    _b.label = 5;
                                case 5:
                                    if (!((mpStatus === "cancelled" || mpStatus === "rejected") && prevStatus !== "cancelled" && prevStatus !== "rejected")) return [3 /*break*/, 8];
                                    return [4 /*yield*/, db.execute("UPDATE orders SET status = 'cancelado' WHERE mp_id = ?", [mpPaymentId])];
                                case 6:
                                    _b.sent();
                                    if (!orderId) return [3 /*break*/, 8];
                                    return [4 /*yield*/, restoreStockForOrder(orderId)];
                                case 7:
                                    _b.sent();
                                    _b.label = 8;
                                case 8:
                                    res.status(200).send("OK");
                                    return [3 /*break*/, 10];
                                case 9:
                                    err_25 = _b.sent();
                                    console.error("[MP WEBHOOK] Erro:", err_25);
                                    res.status(200).send("OK");
                                    return [3 /*break*/, 10];
                                case 10: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.get("/api/orders/:id/status", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var id, orders, order, currentStatus, client, payment, paymentData, mpErr_1, err_26;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    id = req.params.id;
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 13, , 14]);
                                    return [4 /*yield*/, db.execute("SELECT payment_status, status, mp_id, date FROM orders WHERE id = ?", [id])];
                                case 2:
                                    orders = (_a.sent())[0];
                                    if (orders.length === 0)
                                        return [2 /*return*/, res.status(404).json({ message: "Pedido não encontrado." })];
                                    order = orders[0];
                                    currentStatus = order.payment_status;
                                    if (!(currentStatus === 'pending' && order.mp_id && order.mp_id.startsWith('MOCK'))) return [3 /*break*/, 3];
                                    return [3 /*break*/, 12];
                                case 3:
                                    if (!(currentStatus === 'pending' && order.mp_id && process.env.MP_ACCESS_TOKEN && process.env.MP_ACCESS_TOKEN !== "APP_USR-SEU_TOKEN_DE_TESTE_OU_PRODUCAO_AQUI")) return [3 /*break*/, 12];
                                    _a.label = 4;
                                case 4:
                                    _a.trys.push([4, 11, , 12]);
                                    client = new mercadopago_1.MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
                                    payment = new mercadopago_1.Payment(client);
                                    return [4 /*yield*/, payment.get({ id: order.mp_id })];
                                case 5:
                                    paymentData = _a.sent();
                                    if (!(paymentData.status === 'approved')) return [3 /*break*/, 7];
                                    return [4 /*yield*/, db.execute("UPDATE orders SET payment_status = 'approved', status = 'processando' WHERE id = ?", [id])];
                                case 6:
                                    _a.sent();
                                    currentStatus = 'approved';
                                    // 📧 Enviar e-mail de pagamento confirmado (apenas se não era approved antes)
                                    if (order.payment_status !== 'approved') {
                                        sendOrderEmail("approved", id);
                                    }
                                    return [3 /*break*/, 10];
                                case 7:
                                    if (!(paymentData.status === 'rejected' || paymentData.status === 'cancelled')) return [3 /*break*/, 10];
                                    return [4 /*yield*/, db.execute("UPDATE orders SET payment_status = ?, status = 'cancelado' WHERE id = ?", [paymentData.status, id])];
                                case 8:
                                    _a.sent();
                                    currentStatus = paymentData.status;
                                    if (!(order.payment_status !== 'cancelled' && order.payment_status !== 'rejected')) return [3 /*break*/, 10];
                                    return [4 /*yield*/, restoreStockForOrder(id)];
                                case 9:
                                    _a.sent();
                                    _a.label = 10;
                                case 10: return [3 /*break*/, 12];
                                case 11:
                                    mpErr_1 = _a.sent();
                                    console.error("Erro ao verificar status MP em tempo real:", mpErr_1);
                                    return [3 /*break*/, 12];
                                case 12:
                                    res.json({ success: true, paymentStatus: currentStatus, status: order.status });
                                    return [3 /*break*/, 14];
                                case 13:
                                    err_26 = _a.sent();
                                    res.status(500).json({ message: "Erro ao consultar status." });
                                    return [3 /*break*/, 14];
                                case 14: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.post("/api/admin/orders/:id/check-payment", requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var id, orders, order, accessToken, client, payment, paymentData, mpStatus, err_27;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    id = req.params.id;
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 9, , 10]);
                                    return [4 /*yield*/, db.execute("SELECT id, mp_id, payment_method, payment_status FROM orders WHERE id = ?", [id])];
                                case 2:
                                    orders = (_a.sent())[0];
                                    order = orders[0];
                                    if (!order)
                                        return [2 /*return*/, res.status(404).json({ message: "Pedido não encontrado." })];
                                    if (!order.mp_id)
                                        return [2 /*return*/, res.status(400).json({ message: "Pedido sem ID do Mercado Pago." })];
                                    if (!order.mp_id.startsWith("MOCK")) return [3 /*break*/, 4];
                                    return [4 /*yield*/, db.execute("UPDATE orders SET payment_status = 'approved' WHERE id = ?", [id])];
                                case 3:
                                    _a.sent();
                                    return [2 /*return*/, res.json({ success: true, paymentStatus: "approved", message: "Pagamento simulado como APROVADO (ambiente de teste)." })];
                                case 4:
                                    accessToken = process.env.MP_ACCESS_TOKEN;
                                    if (!accessToken || accessToken === "APP_USR-SEU_TOKEN_DE_TESTE_OU_PRODUCAO_AQUI") {
                                        return [2 /*return*/, res.status(400).json({ message: "Token do MP não configurado." })];
                                    }
                                    client = new mercadopago_1.MercadoPagoConfig({ accessToken: accessToken });
                                    payment = new mercadopago_1.Payment(client);
                                    return [4 /*yield*/, payment.get({ id: order.mp_id })];
                                case 5:
                                    paymentData = _a.sent();
                                    mpStatus = paymentData.status;
                                    return [4 /*yield*/, db.execute("UPDATE orders SET payment_status = ? WHERE id = ?", [mpStatus, id])];
                                case 6:
                                    _a.sent();
                                    if (!(mpStatus === "approved")) return [3 /*break*/, 8];
                                    return [4 /*yield*/, db.execute("UPDATE orders SET status = 'processando' WHERE id = ? AND status = 'pendente'", [id])];
                                case 7:
                                    _a.sent();
                                    _a.label = 8;
                                case 8:
                                    res.json({ success: true, paymentStatus: mpStatus });
                                    return [3 /*break*/, 10];
                                case 9:
                                    err_27 = _a.sent();
                                    console.error("Erro ao consultar pagamento:", err_27);
                                    res.status(500).json({ message: "Erro ao consultar: ".concat(err_27.message) });
                                    return [3 /*break*/, 10];
                                case 10: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.get("/api/orders", authenticateToken, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var userId, orders, ordersWithItems, _i, orders_1, order, items, mappedItems, formattedDate, err_28;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    userId = req.user.id;
                                    if (!userId)
                                        return [2 /*return*/, res.status(401).json({ message: "Não autenticado" })];
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 7, , 8]);
                                    return [4 /*yield*/, db.execute("SELECT * FROM orders WHERE user_id = ? ORDER BY date DESC", [userId])];
                                case 2:
                                    orders = (_a.sent())[0];
                                    ordersWithItems = [];
                                    _i = 0, orders_1 = orders;
                                    _a.label = 3;
                                case 3:
                                    if (!(_i < orders_1.length)) return [3 /*break*/, 6];
                                    order = orders_1[_i];
                                    return [4 /*yield*/, db.execute("SELECT * FROM order_items WHERE order_id = ?", [order.id])];
                                case 4:
                                    items = (_a.sent())[0];
                                    mappedItems = items.map(function (i) { return ({
                                        name: i.product_name,
                                        quantity: i.quantity,
                                        price: i.price,
                                        image: i.image,
                                        color: i.color,
                                        size: i.size
                                    }); });
                                    formattedDate = new Date(order.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
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
                                    _a.label = 5;
                                case 5:
                                    _i++;
                                    return [3 /*break*/, 3];
                                case 6:
                                    res.json(ordersWithItems);
                                    return [3 /*break*/, 8];
                                case 7:
                                    err_28 = _a.sent();
                                    console.error(err_28);
                                    res.status(500).json({ message: "Erro ao buscar pedidos" });
                                    return [3 /*break*/, 8];
                                case 8: return [2 /*return*/];
                            }
                        });
                    }); });
                    // ADMIN - GESTÃO DE PEDIDOS (LOGÍSTICA)
                    app.get("/api/admin/orders", requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var orders, ordersWithItems, _i, orders_2, order, items, parsedAddress, err_29;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 6, , 7]);
                                    return [4 /*yield*/, db.execute("SELECT * FROM orders ORDER BY date DESC")];
                                case 1:
                                    orders = (_a.sent())[0];
                                    ordersWithItems = [];
                                    _i = 0, orders_2 = orders;
                                    _a.label = 2;
                                case 2:
                                    if (!(_i < orders_2.length)) return [3 /*break*/, 5];
                                    order = orders_2[_i];
                                    return [4 /*yield*/, db.execute("SELECT * FROM order_items WHERE order_id = ?", [order.id])];
                                case 3:
                                    items = (_a.sent())[0];
                                    parsedAddress = null;
                                    try {
                                        parsedAddress = JSON.parse(order.shipping_address);
                                    }
                                    catch (e) { }
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
                                        items: items.map(function (i) { return ({
                                            name: i.product_name,
                                            quantity: i.quantity,
                                            price: i.price,
                                            image: i.image,
                                            color: i.color,
                                            size: i.size
                                        }); }),
                                        trackingCode: order.tracking_code,
                                        carrier: order.carrier
                                    });
                                    _a.label = 4;
                                case 4:
                                    _i++;
                                    return [3 /*break*/, 2];
                                case 5:
                                    res.json(ordersWithItems);
                                    return [3 /*break*/, 7];
                                case 6:
                                    err_29 = _a.sent();
                                    console.error(err_29);
                                    res.status(500).json({ message: "Erro ao buscar pedidos." });
                                    return [3 /*break*/, 7];
                                case 7: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.patch("/api/admin/orders/:id/status", requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var id, _a, status, trackingCode, carrier, validStatuses, query, params, updates, result, err_30;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    id = req.params.id;
                                    _a = req.body, status = _a.status, trackingCode = _a.trackingCode, carrier = _a.carrier;
                                    validStatuses = ["pendente", "processando", "enviado", "concluido", "cancelado"];
                                    _b.label = 1;
                                case 1:
                                    _b.trys.push([1, 3, , 4]);
                                    if (status && !validStatuses.includes(status)) {
                                        return [2 /*return*/, res.status(400).json({ message: "Status inv\u00E1lido. Use: ".concat(validStatuses.join(", ")) })];
                                    }
                                    query = "UPDATE orders SET ";
                                    params = [];
                                    updates = [];
                                    if (status) {
                                        updates.push("status = ?");
                                        params.push(status);
                                    }
                                    if (trackingCode !== undefined) {
                                        updates.push("tracking_code = ?");
                                        params.push(trackingCode);
                                    }
                                    if (carrier !== undefined) {
                                        updates.push("carrier = ?");
                                        params.push(carrier);
                                    }
                                    if (updates.length === 0)
                                        return [2 /*return*/, res.status(400).json({ message: "Nenhum campo para atualizar." })];
                                    query += updates.join(", ") + " WHERE id = ?";
                                    params.push(id);
                                    return [4 /*yield*/, db.execute(query, params)];
                                case 2:
                                    result = (_b.sent())[0];
                                    if (result.affectedRows === 0)
                                        return [2 /*return*/, res.status(404).json({ message: "Pedido não encontrado." })];
                                    res.json({ success: true, message: "Pedido ".concat(id, " atualizado com sucesso.") });
                                    return [3 /*break*/, 4];
                                case 3:
                                    err_30 = _b.sent();
                                    console.error(err_30);
                                    res.status(500).json({ message: "Erro ao atualizar pedido." });
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); });
                    // MKT & ENGAGEMENT ENDPOINTS
                    app.post("/api/newsletter", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, email, phone, err_31;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _a = req.body, email = _a.email, phone = _a.phone;
                                    if (!email)
                                        return [2 /*return*/, res.status(400).json({ message: "E-mail é obrigatório." })];
                                    _b.label = 1;
                                case 1:
                                    _b.trys.push([1, 3, , 4]);
                                    // MySQL Equivalent of INSERT OR REPLACE
                                    return [4 /*yield*/, db.execute("REPLACE INTO newsletter_subscribers (email, phone) VALUES (?, ?)", [email, phone || null])];
                                case 2:
                                    // MySQL Equivalent of INSERT OR REPLACE
                                    _b.sent();
                                    res.json({ success: true, message: "Cadastro realizado com sucesso!" });
                                    return [3 /*break*/, 4];
                                case 3:
                                    err_31 = _b.sent();
                                    console.error(err_31);
                                    res.status(500).json({ message: "Erro ao se inscrever na newsletter." });
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.post("/api/waitlist", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, id, sku, name, email, phone, details, productIdentifier, err_32;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _a = req.body, id = _a.id, sku = _a.sku, name = _a.name, email = _a.email, phone = _a.phone, details = _a.details;
                                    productIdentifier = sku || id;
                                    if (!productIdentifier || !name || !email) {
                                        return [2 /*return*/, res.status(400).json({ message: "Dados incompletos (ID/SKU, Nome e E-mail são obrigatórios)." })];
                                    }
                                    _b.label = 1;
                                case 1:
                                    _b.trys.push([1, 4, , 5]);
                                    // Registrar na Fila
                                    return [4 /*yield*/, db.execute("INSERT INTO waitlist (product_id, product_name, email, phone, details) VALUES (?, ?, ?, ?, ?)", [productIdentifier, name, email, phone || null, details || null])];
                                case 2:
                                    // Registrar na Fila
                                    _b.sent();
                                    // Auto-inscrever no Broadcast (MySQL Ignore)
                                    return [4 /*yield*/, db.execute("INSERT IGNORE INTO newsletter_subscribers (email, phone) VALUES (?, ?)", [email, phone || null])];
                                case 3:
                                    // Auto-inscrever no Broadcast (MySQL Ignore)
                                    _b.sent();
                                    res.json({ success: true, message: "Você será avisado quando o produto chegar!" });
                                    return [3 /*break*/, 5];
                                case 4:
                                    err_32 = _b.sent();
                                    console.error(err_32);
                                    res.status(500).json({ message: "Erro ao entrar na lista de espera." });
                                    return [3 /*break*/, 5];
                                case 5: return [2 /*return*/];
                            }
                        });
                    }); });
                    // ADMIN MKT ENDPOINTS
                    app.get("/api/admin/newsletter", requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var subscribers, err_33;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, db.execute("SELECT * FROM newsletter_subscribers ORDER BY created_at DESC")];
                                case 1:
                                    subscribers = (_a.sent())[0];
                                    res.json(subscribers);
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_33 = _a.sent();
                                    res.status(500).json({ message: "Erro ao buscar inscritos." });
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.get("/api/admin/waitlist", requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var rows, err_34;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, db.execute("SELECT * FROM waitlist ORDER BY created_at DESC")];
                                case 1:
                                    rows = (_a.sent())[0];
                                    res.json(rows);
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_34 = _a.sent();
                                    console.error(err_34);
                                    res.status(500).json({ message: "Erro ao buscar lista de espera." });
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.post("/api/admin/notify-stock", requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, waitlistId, email, productName, details, imageUrl, emailSubject, htmlBody, logoPath, attachments, e_16;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _a = req.body, waitlistId = _a.waitlistId, email = _a.email, productName = _a.productName, details = _a.details, imageUrl = _a.imageUrl;
                                    _b.label = 1;
                                case 1:
                                    _b.trys.push([1, 4, , 5]);
                                    emailSubject = "SUOPES TACTICAL | ESTOQUE RENOVADO: ".concat(productName);
                                    htmlBody = "\n        <div style=\"background-color: #f4f5f6; padding: 40px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;\">\n          <table align=\"center\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"max-width: 600px; background-color: #ffffff; border-collapse: collapse;\">\n            <tr>\n              <td align=\"center\" style=\"background-color: #0d0d0d; padding: 30px 20px;\">\n                <img src=\"cid:suopeslogo\" alt=\"SUOPES TACTICAL\" width=\"280\" style=\"display: block; margin: 0 auto;\" />\n              </td>\n            </tr>\n            <tr>\n              <td align=\"center\" style=\"background-color: #1a1a1a; padding: 60px 40px; background-image: linear-gradient(to bottom, #111, #222);\">\n                <h2 style=\"color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;\">\n                  Sua requisi\u00E7\u00E3o<br>est\u00E1 te esperando.\n                </h2>\n              </td>\n            </tr>\n            <tr>\n              <td align=\"center\" style=\"background-color: #fdfdfd; padding: 40px 30px;\">\n                <p style=\"color: #333333; margin: 0 0 15px 0; font-size: 14px; line-height: 1.6; font-weight: bold;\">\n                  Voc\u00EA solicitou um aviso e a miss\u00E3o foi cumprida.\n                </p>\n                <p style=\"color: #555555; margin: 0 0 25px 0; font-size: 14px; line-height: 1.6;\">\n                  O equipamento que voc\u00EA aguardava retornou ao nosso arsenal e est\u00E1 pronto para o envio.\n                </p>\n              </td>\n            </tr>\n          </table>\n        </div>\n      ";
                                    logoPath = path_1.default.join(__dirname, 'public/suopes-text-logo.png');
                                    attachments = [];
                                    if (fs_1.default.existsSync(logoPath)) {
                                        attachments.push({
                                            filename: 'suopes-text-logo.png',
                                            path: logoPath,
                                            cid: 'suopeslogo'
                                        });
                                    }
                                    return [4 /*yield*/, transporter.sendMail({
                                            from: "\"SUOPES TACTICAL\" <".concat(process.env.SMTP_USER || 'suopestactical@gmail.com', ">"),
                                            to: email,
                                            subject: emailSubject,
                                            html: htmlBody,
                                            attachments: attachments
                                        })];
                                case 2:
                                    _b.sent();
                                    return [4 /*yield*/, db.execute("DELETE FROM waitlist WHERE id = ?", [waitlistId])];
                                case 3:
                                    _b.sent();
                                    res.json({ success: true, message: "Cliente notificado e removido da fila." });
                                    return [3 /*break*/, 5];
                                case 4:
                                    e_16 = _b.sent();
                                    console.error(e_16);
                                    res.status(500).json({ message: "Falha ao notificar o cliente via e-mail." });
                                    return [3 /*break*/, 5];
                                case 5: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.get("/api/admin/waitlist", function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var list, err_35;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, db.execute("SELECT * FROM waitlist ORDER BY created_at DESC")];
                                case 1:
                                    list = (_a.sent())[0];
                                    res.json(list);
                                    return [3 /*break*/, 3];
                                case 2:
                                    err_35 = _a.sent();
                                    res.status(500).json({ message: "Erro ao buscar fila de espera." });
                                    return [3 /*break*/, 3];
                                case 3: return [2 /*return*/];
                            }
                        });
                    }); });
                    app.post("/api/admin/broadcast", requireAdmin, function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, subject, message, testEmail, mode, targets, subscribers, userSmtp, passSmtp, envContent, smtpUserMatch, smtpPassMatch, dynamicTransporter, successCount, _i, targets_1, target, e_17, err_36;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _a = req.body, subject = _a.subject, message = _a.message, testEmail = _a.testEmail, mode = _a.mode;
                                    if (!subject || !message)
                                        return [2 /*return*/, res.status(400).json({ message: "Assunto e mensagem são obrigatórios." })];
                                    _b.label = 1;
                                case 1:
                                    _b.trys.push([1, 11, , 12]);
                                    targets = [];
                                    if (!(mode === 'test')) return [3 /*break*/, 2];
                                    if (!testEmail)
                                        return [2 /*return*/, res.status(400).json({ message: "E-mail de teste não fornecido." })];
                                    targets = [testEmail];
                                    return [3 /*break*/, 4];
                                case 2: return [4 /*yield*/, db.execute("SELECT email FROM newsletter_subscribers")];
                                case 3:
                                    subscribers = (_b.sent())[0];
                                    targets = subscribers.map(function (s) { return s.email; });
                                    _b.label = 4;
                                case 4:
                                    if (targets.length === 0)
                                        return [2 /*return*/, res.status(400).json({ message: "Nenhum destinatário encontrado." })];
                                    userSmtp = process.env.SMTP_USER;
                                    passSmtp = process.env.SMTP_PASS;
                                    try {
                                        envContent = fs_1.default.readFileSync(path_1.default.join(__dirname, '.env'), 'utf8');
                                        smtpUserMatch = envContent.match(/SMTP_USER="([^"]+)"/);
                                        smtpPassMatch = envContent.match(/SMTP_PASS="([^"]+)"/);
                                        if (smtpUserMatch)
                                            userSmtp = smtpUserMatch[1];
                                        if (smtpPassMatch)
                                            passSmtp = smtpPassMatch[1];
                                    }
                                    catch (e) { }
                                    dynamicTransporter = nodemailer_1.default.createTransport({
                                        service: "gmail",
                                        auth: { user: userSmtp, pass: passSmtp },
                                    });
                                    successCount = 0;
                                    _i = 0, targets_1 = targets;
                                    _b.label = 5;
                                case 5:
                                    if (!(_i < targets_1.length)) return [3 /*break*/, 10];
                                    target = targets_1[_i];
                                    _b.label = 6;
                                case 6:
                                    _b.trys.push([6, 8, , 9]);
                                    return [4 /*yield*/, dynamicTransporter.sendMail({
                                            from: '"SUOPES TACTICAL" <suopestactical@gmail.com>',
                                            to: target,
                                            subject: subject,
                                            html: message, // Simplificado para fins de refatoração rápida
                                            attachments: [{
                                                    filename: 'suopes-text-logo.png',
                                                    path: path_1.default.join(__dirname, 'public/suopes-text-logo.png'),
                                                    cid: 'suopeslogo'
                                                }]
                                        })];
                                case 7:
                                    _b.sent();
                                    successCount++;
                                    return [3 /*break*/, 9];
                                case 8:
                                    e_17 = _b.sent();
                                    console.error("Failed to send to", target, e_17);
                                    return [3 /*break*/, 9];
                                case 9:
                                    _i++;
                                    return [3 /*break*/, 5];
                                case 10:
                                    res.json({ success: true, sent: successCount, total: targets.length });
                                    return [3 /*break*/, 12];
                                case 11:
                                    err_36 = _b.sent();
                                    console.error(err_36);
                                    res.status(500).json({ message: "Erro interno no broadcast." });
                                    return [3 /*break*/, 12];
                                case 12: return [2 /*return*/];
                            }
                        });
                    }); });
                    if (!(process.env.NODE_ENV !== "production")) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, vite_1.createServer)({
                            server: { middlewareMode: true },
                            appType: "spa",
                        })];
                case 1:
                    vite = _a.sent();
                    app.use(vite.middlewares);
                    return [3 /*break*/, 3];
                case 2:
                    app.use(express_1.default.static(path_1.default.join(__dirname, "dist")));
                    app.get("*", function (req, res) {
                        res.sendFile(path_1.default.join(__dirname, "dist", "index.html"));
                    });
                    _a.label = 3;
                case 3:
                    app.listen(PORT, "0.0.0.0", function () {
                        console.log("Server running on http://localhost:".concat(PORT));
                    });
                    return [2 /*return*/];
            }
        });
    });
}
startServer();
