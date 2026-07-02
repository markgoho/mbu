import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import './app/lib/firebase';

try {
  await bootstrapApplication(App, appConfig);
} catch (error: unknown) {
  console.error(error);
}
