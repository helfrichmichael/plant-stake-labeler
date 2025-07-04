import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), provideAnimationsAsync()]
};

export const HOST_IP = '10.0.0.20';

export const HOST_PORT = 11180;

export const API_URL = `http://${HOST_IP}:${HOST_PORT}/api/v1/`;

export const DESIGN_NAME = 'MC_Label';

export const PRINTER_ID = 'TSC-USB-T4524231356';