import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { PokemonService } from '../../services/pokemon.service';
import { PokemonCard } from '../pokemon-card/pokemon-card';
import { Pokemon } from '../../models/pokemon.model';

@Component({
  selector: 'app-pokemon-grid',
  standalone: true,
  imports: [PokemonCard],
  templateUrl: './pokemon-grid.html',
  styleUrl: './pokemon-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PokemonGrid implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('loadTrigger') loadTrigger?: ElementRef;
  
  // Inject service
  private pokemonService = inject(PokemonService);

  // Local signal for tracking load trigger
  private isLoadingMore = signal(false);
  private observer?: IntersectionObserver;

  // Signals from service (accessed after initialization)
  pokemonList = this.pokemonService.pokemonList;
  loading = this.pokemonService.loading;
  hasMore = this.pokemonService.hasMore;

  ngOnInit(): void {
    // Load initial Pokemon
    this.pokemonService.loadInitialPokemon().subscribe();
  }

  ngAfterViewInit(): void {
    // Set up intersection observer for infinite scroll
    if (this.loadTrigger) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (
              entry.isIntersecting &&
              this.hasMore() &&
              !this.loading() &&
              !this.isLoadingMore()
            ) {
              this.loadMore();
            }
          });
        },
        {
          // Trigger 1500px before reaching the element (proactive loading)
          rootMargin: '1500px'
        }
      );
      
      this.observer.observe(this.loadTrigger.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
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
   * Load more Pokemon
   */
  private loadMore(): void {
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
