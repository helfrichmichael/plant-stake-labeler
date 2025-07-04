import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const APP_CONFIG: ApplicationConfig = {
  providers: [provideAnimationsAsync()]
};

export const HOST_IP = '10.0.0.20';

export const HOST_PORT = 11180;

export const API_URL = `http://${HOST_IP}:${HOST_PORT}/api/v1/`;

export const DESIGN_NAME = 'MC_Label';

export const PRINTER_ID = 'TSC-USB-T4524231356';

export const PLANT_LIST: { plantName: string, url: string }[] = [
  {
    plantName: `Nepenthes mirabilis var. Globosa x Ampullaria 'Black Miracle'`, 
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Nepenthes 'Briggsiana' (Lowii x Ventricosa Red)`, 
    url: 'https://mikescarnivores.com'
  },

];