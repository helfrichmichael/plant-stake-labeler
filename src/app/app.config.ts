import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), provideAnimationsAsync()]
};

export const HOST_IP = 'localhost';

export const HOST_PORT = 11180;

export const API_URL = `http://${HOST_IP}:${HOST_PORT}/api/v1/`;

export const DESIGN_NAME = 'test';

//vhttp://localhost:11180/api/v1/print?design=test&variables={"PLANT_NAME":"<b>$PLANT_NAME</b>"}&printer=System-\\Windows-10-vm\tsc ttp-247&window=show&copies=1