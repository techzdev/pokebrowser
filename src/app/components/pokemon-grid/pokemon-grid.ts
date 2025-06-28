import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Subject, takeUntil } from 'rxjs';
import { PokemonService } from '../../services/pokemon.service';
import { SearchService } from '../../services/search.service';
import { PokemonCard } from '../pokemon-card/pokemon-card';
import { SearchBar } from '../search-bar/search-bar';
import { Pokemon } from '../../models/pokemon.model';

@Component({
  selector: 'app-pokemon-grid',
  imports: [CommonModule, ScrollingModule, PokemonCard, SearchBar],
  templateUrl: './pokemon-grid.html',
  styleUrl: './pokemon-grid.scss'
})
export class PokemonGrid implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('loadTrigger', { static: false }) loadTrigger?: ElementRef;
  @ViewChild(CdkVirtualScrollViewport) viewport?: CdkVirtualScrollViewport;
  
  pokemon: Pokemon[] = [];
  filteredPokemon: Pokemon[] = [];
  loading = false;
  error: string | null = null;
  isLoadingMore = false;
  showSkeletons = false;
  private destroy$ = new Subject<void>();
  private preloadThreshold = 800;
  private isNearBottom = false;
  private intersectionObserver?: IntersectionObserver;
  private lastKnownCount = 0;

  constructor(
    private pokemonService: PokemonService,
    private searchService: SearchService
  ) {}

  ngOnInit(): void {
    this.pokemonService.pokemon$
      .pipe(takeUntil(this.destroy$))
      .subscribe(pokemon => {
        this.pokemon = pokemon;
        this.searchService.updatePokemonList(pokemon);
        console.log('Pokemon loaded:', pokemon.length, 'items');
        this.lastKnownCount = pokemon.length;
      });

    // Subscribe to filtered pokemon from search service
    this.searchService.filteredPokemon$
      .pipe(takeUntil(this.destroy$))
      .subscribe(filtered => {
        this.filteredPokemon = filtered;
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

  ngAfterViewInit(): void {
    // Setup virtual scroll infinite loading
    if (this.viewport) {
      this.viewport.elementScrolled().pipe(
        takeUntil(this.destroy$)
      ).subscribe(() => {
        const end = this.viewport!.getRenderedRange().end;
        const total = this.viewport!.getDataLength();
        
        // Load more when approaching the end of virtual scroll
        if (end >= total - 10 && !this.loading && !this.isLoadingMore && this.hasMorePokemon) {
          this.loadMorePokemon();
        }
      });
    }
    
    // Fallback intersection observer for load trigger
    if (this.loadTrigger) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && 
                !this.loading && 
                !this.isLoadingMore && 
                this.pokemonService.hasMorePokemon()) {
              this.loadMorePokemon();
            }
          });
        },
        {
          rootMargin: '300px'
        }
      );
      
      this.intersectionObserver.observe(this.loadTrigger.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event: any): void {
    // Simplified scroll handling since virtual scrolling handles most performance
    const scrollPosition = window.pageYOffset;
    const documentHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;
    const distanceFromBottom = documentHeight - (scrollPosition + windowHeight);
    
    this.isNearBottom = distanceFromBottom <= this.preloadThreshold;
    this.showSkeletons = this.isNearBottom && this.hasMorePokemon && !this.isLoadingMore;
  }

  private loadMorePokemon(): void {
    this.isLoadingMore = true;
    
    this.pokemonService.loadMorePokemon()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoadingMore = false;
          setTimeout(() => {
            this.showSkeletons = false;
          }, 200);
        },
        error: () => {
          this.isLoadingMore = false;
          this.showSkeletons = false;
        }
      });
  }

  trackByPokemon(index: number, pokemon: Pokemon): number {
    return pokemon.id;
  }

  getDisplayIndex(index: number): number {
    return index % 12;
  }

  isRecentlyLoaded(index: number): boolean {
    const initialLoadCount = 24;
    return index >= Math.max(initialLoadCount, this.lastKnownCount - 24);
  }

  get isUsingMockData(): boolean {
    return this.pokemonService.isUsingMockData();
  }

  get hasMorePokemon(): boolean {
    return this.pokemonService.hasMorePokemon();
  }
}