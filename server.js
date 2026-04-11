// server.js - Ponto de entrada para produção (Hostinger)
// Carrega o suporte a TypeScript e inicia o server.ts
import { register } from 'tsx/esm/api';
register();
await import('./server.ts');
