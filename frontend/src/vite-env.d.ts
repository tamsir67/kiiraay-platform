/// <reference types="vite/client" />
declare module '*.jpg' { const src: string; export default src; }
declare module 'leaflet.heat';
declare module '@shared/referentiel.js';
declare module '@shared/generator.js';
interface ImportMetaEnv { readonly VITE_DEMO?: string; readonly VITE_TILE_URL?: string; readonly VITE_TILE_ATTRIBUTION?: string }
