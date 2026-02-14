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
  @Input() symbol!: string;
  @Output() closeModal = new EventEmitter<void>();

  quote: MarketQuote | null = null;
  profile: CompanyProfile | null = null;
  isLoading = true;
  hasError = false;

  constructor(private marketService: MarketService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnChanges(): void {
    this.loadData();
  }

  private loadData(): void {
    if (!this.symbol) return;

    this.isLoading = true;
    this.hasError = false;

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

    this.marketService.getProfile(this.symbol).subscribe({
      next: (data) => {
        this.profile = data;
        this.checkLoadingComplete();
      },
      error: () => {
        this.checkLoadingComplete();
      },
    });
  }

  private checkLoadingComplete(): void {
    if (this.quote) {
      this.isLoading = false;
    }
  }

  close(): void {
    this.closeModal.emit();
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  getDirection(): 'up' | 'down' | 'neutral' {
    if (!this.quote) return 'neutral';
    if (this.quote.change > 0) return 'up';
    if (this.quote.change < 0) return 'down';
    return 'neutral';
  }

  formatMarketCap(value: number | undefined): string {
    if (!value) return 'N/A';
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'T';
    if (value >= 1_000) return (value / 1_000).toFixed(2) + 'B';
    return value.toFixed(2) + 'M';
  }
}
