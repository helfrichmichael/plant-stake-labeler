import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export declare interface PlantList {
  plantName: string;
  url: string;
}

export const APP_CONFIG: ApplicationConfig = {
  providers: [provideAnimationsAsync()]
};

export const HOST_IP = '10.0.0.20';

export const HOST_PORT = 11180;

export const API_URL = `http://${HOST_IP}:${HOST_PORT}/api/v1/`;

export const DESIGN_NAME = 'MC_Label';

export const PRINTER_ID = 'TSC-USB-T4524231356';

export const PLANT_LIST: PlantList[] = [
  {
    plantName: `Nepenthes Alata`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Nepenthes Albomarginata`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Nepenthes 'Briggsiana' (Lowii x Ventricosa 'Red')`, 
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Nepenthes Dyeriana`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Nepenthes 'Diana''`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Nepenthes 'Lady Luck'`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Nepenthes mirabilis var. Globosa x Ampullaria 'Black Miracle'`, 
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Nepenthes Miranda`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Nepenthes 'Rebecca Soper'`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Nepenthes Sanguinea`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Nepenthes St. Gaya`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Nepenthes Ventrata`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Dionaea Muscipula 'Dente'`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Dionaea Muscipula 'Akai Ryu'`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Dionaea Muscipula 'King Henry'`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Dionaea Muscipula 'Typical'`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Drosera Aliciea`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Drosera Capensis 'Red Form'`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Drosera Capensis 'Alba'`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Drosera Capensis 'Merry Go Round'`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Drosera Capensis 'Dark Maroon'`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Drosera Spatulata`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Drosera Filiformis`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Sarracenia 'Barba Green'`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Sarracenia Farnhamii`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Sarracenia 'Maroon'`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Sarracenia Purpurea Venosa`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Sarracenia Scarlet Belle`,
    url: 'https://mikescarnivores.com'
  },
  {
    plantName: `Pinguicula Primuliflora`,
    url: 'https://mikescarnivores.com'
  },
];