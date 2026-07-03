import { type Routes } from '@angular/router';
import {
  requireAuth,
  requireOnboarded,
  requireUnauth,
  requireVerified,
} from './guards/auth-guards';

export const routes: Routes = [
  {
    path: 'sign-in',
    canActivate: [requireUnauth],
    loadComponent: () => import('./sign-in/sign-in').then((m) => m.SignIn),
  },
  {
    path: 'verify-email',
    canActivate: [requireAuth],
    loadComponent: () =>
      import('./verify-email/verify-email').then((m) => m.VerifyEmail),
  },
  {
    path: 'onboarding',
    canActivate: [requireAuth, requireVerified],
    loadComponent: () =>
      import('./onboarding/onboarding').then((m) => m.Onboarding),
  },
  {
    path: '',
    canActivate: [requireAuth, requireVerified, requireOnboarded],
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
];
