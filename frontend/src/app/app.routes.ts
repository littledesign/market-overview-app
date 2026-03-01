import { Routes } from '@angular/router';
import { HubPageComponent } from './components/hub-page/hub-page.component';

export const routes: Routes = [
  { path: 'hub', component: HubPageComponent },
  { path: '', redirectTo: 'hub', pathMatch: 'full' },
  { path: '**', redirectTo: 'hub' },
];
