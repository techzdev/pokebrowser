import { Component, OnInit, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { PokemonService } from '../../services/pokemon.service';
import { PokemonCard } from '../pokemon-card/pokemon-card';
import { Pokemon } from '../../models/pokemon.model';

@Component({
  selector: 'app-pokemon-grid',
  standalone: true,
  imports: [ScrollingModule, PokemonCard],
  templateUrl: './pokemon-grid.html',
  styleUrl: './pokemon-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PokemonGrid implements OnInit {
  // Inject service
  private pokemonService = inject(PokemonService);

  // Local signal for tracking load trigger
  private isLoadingMore = signal(false);

  // Signals from service (accessed after initialization)
  pokemonList = this.pokemonService.pokemonList;
  loading = this.pokemonService.loading;
  hasMore = this.pokemonService.hasMore;

  ngOnInit(): void {
    // Load initial Pokemon
    this.pokemonService.loadInitialPokemon().subscribe();
  }

  /**
   * Track Pokemon by ID for performance
   */
  trackByPokemonId(index: number, pokemon: Pokemon): number {
    return pokemon.id;
  }

  /**
   * Check if this is one of the first 10 items (for priority loading)
   */
  isPriorityItem(index: number): boolean {
    return index < 10;
  }

  /**
   * Handle scroll to load more Pokemon
   */
  onScrollIndexChange(index: number): void {
    const totalItems = this.pokemonList().length;
    
    // Trigger load more when approaching end (within last 10 items)
    if (
      index > totalItems - 10 && 
      this.hasMore() && 
      !this.loading() &&
      !this.isLoadingMore()
    ) {
      this.isLoadingMore.set(true);
      this.pokemonService.loadMore().subscribe({
        next: () => {
          this.isLoadingMore.set(false);
        },
        error: () => {
          this.isLoadingMore.set(false);
        }
      });
    }
  }
}
