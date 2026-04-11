// server.js - Ponto de entrada para produção (Hostinger)
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Registra tsx para suportar TypeScript
register('tsx', pathToFileURL('./'));

// Importa e inicia o servidor
await import('./server.ts');
