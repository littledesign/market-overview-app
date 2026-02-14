import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketService } from '../../services/market.service';
import { MarketQuote, CompanyProfile } from '../../models/market.model';

/**
 * MarketDetailModalComponent — a slide-up modal showing detailed info about a stock.
 *
 * Receives a stock symbol as input, fetches both the quote and company profile,
 * and displays everything in a clean overlay.
 */
@Component({
  selector: 'app-market-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './market-detail-modal.component.html',
  styleUrl: './market-detail-modal.component.css',
})
export class MarketDetailModalComponent implements OnInit, OnChanges {
  // The stock symbol to show details for (passed in from the parent)
  @Input() symbol!: string;

  // Event that fires when the user wants to close the modal
  @Output() closeModal = new EventEmitter<void>();

  // Data loaded from the API
  quote: MarketQuote | null = null;
  profile: CompanyProfile | null = null;

  // Loading and error states
  isLoading = true;
  hasError = false;

  constructor(private marketService: MarketService) {}

  ngOnInit(): void {
    this.loadData();
  }

  /**
   * If the symbol input changes while the modal is open, reload data.
   */
  ngOnChanges(): void {
    this.loadData();
  }

  /**
   * Fetches both the quote and profile data for the current symbol.
   */
  private loadData(): void {
    if (!this.symbol) return;

    this.isLoading = true;
    this.hasError = false;

    // Fetch quote data
    this.marketService.getQuote(this.symbol).subscribe({
      next: (data) => {
        this.quote = data;
        this.checkLoadingComplete();
      },
      error: () => {
        this.hasError = true;
        this.isLoading = false;
      },
    });

    // Fetch profile data
    this.marketService.getProfile(this.symbol).subscribe({
      next: (data) => {
        this.profile = data;
        this.checkLoadingComplete();
      },
      error: () => {
        // Profile errors are non-critical — we can still show quote data
        this.checkLoadingComplete();
      },
    });
  }

  /**
   * Only mark loading as done when both requests have completed.
   */
  private checkLoadingComplete(): void {
    if (this.quote) {
      this.isLoading = false;
    }
  }

  /**
   * Closes the modal when user clicks the backdrop or close button.
   */
  close(): void {
    this.closeModal.emit();
  }

  /**
   * Prevents clicks inside the modal from closing it
   * (only backdrop clicks should close).
   */
  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  /**
   * Returns 'up', 'down', or 'neutral' based on the price change direction.
   */
  getDirection(): 'up' | 'down' | 'neutral' {
    if (!this.quote) return 'neutral';
    if (this.quote.change > 0) return 'up';
    if (this.quote.change < 0) return 'down';
    return 'neutral';
  }

  /**
   * Formats large numbers like market cap into readable strings.
   * Example: 2500000 → "2.50T" (trillions), 150000 → "150.00B" (billions)
   */
  formatMarketCap(value: number | undefined): string {
    if (!value) return 'N/A';
    // Finnhub returns market cap in millions
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'T';
    if (value >= 1_000) return (value / 1_000).toFixed(2) + 'B';
    return value.toFixed(2) + 'M';
  }
}
