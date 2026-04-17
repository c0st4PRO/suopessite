import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'u177568398_admin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'u177568398_suopes',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function run() {
  try {
    const [rows] = await db.execute("SELECT * FROM products LIMIT 1");
    if (rows.length === 0) {
      console.log("No products");
      return;
    }
    const p = rows[0];
    console.log("Testing update on:", p.id);
    
    await db.execute(
        "UPDATE products SET name = ?, description = ?, price = ?, category = ?, image = ?, featured = ?, in_stock = ?, images = ?, colors = ?, sizes = ?, has_sizes = ?, features = ?, care = ?, sku = ? WHERE id = ?",
        [
          p.name, p.description, p.price, p.category, p.image, p.featured, p.in_stock, 
          p.images, p.colors, p.sizes, p.has_sizes, p.features, p.care, p.sku, 
          p.id
        ]
    );
    console.log("Update SUCCESSFUL!");
  } catch (err) {
    console.error("UPDATE ERROR:", err);
  } finally {
    process.exit(0);
  }
}
run();
