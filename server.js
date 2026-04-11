// server.js - Ponto de entrada para produção (Hostinger)
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Registra o loader TypeScript
register('tsx/esm', pathToFileURL('./'));

// Força produção
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Importa e inicia o servidor
try {
  await import('./server.ts');
} catch (err) {
  console.error('FATAL: Falha ao iniciar servidor:', err);
  process.exit(1);
}
