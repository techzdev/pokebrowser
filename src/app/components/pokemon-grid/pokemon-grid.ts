import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Subject, takeUntil } from 'rxjs';
import { PokemonService } from '../../services/pokemon.service';
import { PokemonCard } from '../pokemon-card/pokemon-card';
import { Pokemon } from '../../models/pokemon.model';

@Component({
  selector: 'app-pokemon-grid',
  imports: [CommonModule, ScrollingModule, PokemonCard],
  templateUrl: './pokemon-grid.html',
  styleUrl: './pokemon-grid.scss'
})
export class PokemonGrid implements OnInit, OnDestroy {
  pokemon: Pokemon[] = [];
  loading = false;
  error: string | null = null;
  private destroy$ = new Subject<void>();
  private isLoadingMore = false;

  constructor(private pokemonService: PokemonService) {}

  ngOnInit(): void {
    this.pokemonService.pokemon$
      .pipe(takeUntil(this.destroy$))
      .subscribe(pokemon => {
        this.pokemon = pokemon;
      });

    this.pokemonService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.loading = loading;
      });

    this.pokemonService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.error = error;
      });

    // Load initial Pokemon
    this.pokemonService.loadPokemon().subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event: any): void {
    const scrollPosition = window.pageYOffset;
    const documentHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;
    
    // Load more when user scrolls to bottom
    if (scrollPosition + windowHeight >= documentHeight - 100 && 
        !this.loading && 
        !this.isLoadingMore && 
        this.pokemonService.hasMorePokemon()) {
      this.loadMorePokemon();
    }
  }

  private loadMorePokemon(): void {
    this.isLoadingMore = true;
    this.pokemonService.loadMorePokemon()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isLoadingMore = false;
      });
  }

  trackByPokemon(index: number, pokemon: Pokemon): number {
    return pokemon.id;
  }

  get isUsingMockData(): boolean {
    return this.pokemonService.isUsingMockData();
  }
}
