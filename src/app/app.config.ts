import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const APP_CONFIG: ApplicationConfig = {
  providers: [provideAnimationsAsync(), provideHttpClient()]
};

export const DEFAULT_URL = "mikescarnivores.com"

export const HOST_IP = '10.0.0.20';

export const HOST_PORT = 11180;

export const REMOTE_API_URL = 'http://labellive.mikescarnivores.com/api/v1/'

export const API_URL = `http://${HOST_IP}:${HOST_PORT}/api/v1/`;

export const DESIGN_NAME = 'MC_Label';

export const PRINTER_ID = 'System-TSC TX310';
