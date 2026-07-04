import { type Routes } from '@angular/router';
import {
  requireAuth,
  requireOnboarded,
  requireUnauth,
  requireVerified,
} from './guards/auth-guards';

export const routes: Routes = [
  {
    path: 'e/:id',
    loadComponent: () =>
      import('./public-event/public-event').then((m) => m.PublicEvent),
  },
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
    path: 'universities',
    canActivate: [requireAuth, requireVerified, requireOnboarded],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./universities/universities-dashboard/universities-dashboard').then(
            (m) => m.UniversitiesDashboard,
          ),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./universities/university-new/university-new').then(
            (m) => m.UniversityNew,
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./universities/university-editor/university-editor').then(
            (m) => m.UniversityEditor,
          ),
      },
    ],
  },
  {
    path: '',
    canActivate: [requireAuth, requireVerified, requireOnboarded],
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
];
