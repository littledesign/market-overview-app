import { Component } from '@angular/core';
import { MarketStripComponent } from './components/market-strip/market-strip.component';

/**
 * Root component of the app.
 * Simply displays the market strip at the top of the page.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MarketStripComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'Market Data';
}
