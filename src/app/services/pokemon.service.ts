import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, BehaviorSubject, forkJoin, of, timer } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { Pokemon, PokemonListResponse, PokemonDetails } from '../models/pokemon.model';
import { generateMockPokemon } from '../models/mock-data';

@Injectable({
  providedIn: 'root'
})
export class PokemonService {
  private readonly API_URL = 'https://pokeapi.co/api/v2';
  private readonly LIMIT = 20; // Items per page
  private readonly PREFETCH_PAGES = 2; // Prefetch 2 pages ahead

  // Signals for state management
  private pokemonListSignal = signal<Pokemon[]>([]);
  private loadingSignal = signal<boolean>(false);
  private currentPageSignal = signal<number>(0);
  private totalCountSignal = signal<number>(1025); // Total Pokemon

  // Public computed signals
  readonly pokemonList = this.pokemonListSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly currentPage = this.currentPageSignal.asReadonly();
  readonly hasMore = computed(() => 
    this.pokemonListSignal().length < this.totalCountSignal()
  );

  // Cache for prefetched data
  private prefetchCache = new Map<number, Pokemon[]>();
  private prefetchingPages = new Set<number>();
  private useMockData = false; // Flag to use mock data if API fails

  constructor(private http: HttpClient) {}

  /**
   * Load initial Pokemon
   */
  loadInitialPokemon(): Observable<Pokemon[]> {
    this.loadingSignal.set(true);
    return this.loadPage(0).pipe(
      tap(() => {
        // Start prefetching next pages
        this.prefetchNextPages(1);
      })
    );
  }

  /**
   * Load more Pokemon (triggered by scrolling)
   */
  loadMore(): Observable<Pokemon[]> {
    const nextPage = this.currentPageSignal() + 1;
    
    // Check if already in cache
    if (this.prefetchCache.has(nextPage)) {
      const cachedData = this.prefetchCache.get(nextPage)!;
      this.appendPokemon(cachedData);
      this.currentPageSignal.set(nextPage);
      this.prefetchCache.delete(nextPage);
      
      // Prefetch further ahead
      this.prefetchNextPages(nextPage + 1);
      
      return of(this.pokemonListSignal());
    }

    // Load from API if not cached
    this.loadingSignal.set(true);
    return this.loadPage(nextPage).pipe(
      tap(() => {
        this.prefetchNextPages(nextPage + 1);
      })
    );
  }

  /**
   * Prefetch next 2-3 pages ahead
   */
  private prefetchNextPages(startPage: number): void {
    for (let i = 0; i < this.PREFETCH_PAGES; i++) {
      const pageToFetch = startPage + i;
      const offset = pageToFetch * this.LIMIT;
      
      // Don't prefetch if already loading, cached, or beyond total count
      if (
        this.prefetchingPages.has(pageToFetch) ||
        this.prefetchCache.has(pageToFetch) ||
        offset >= this.totalCountSignal()
      ) {
        continue;
      }

      this.prefetchingPages.add(pageToFetch);
      
      this.loadPokemonData(offset).subscribe({
        next: (pokemon) => {
          this.prefetchCache.set(pageToFetch, pokemon);
          this.prefetchingPages.delete(pageToFetch);
        },
        error: () => {
          this.prefetchingPages.delete(pageToFetch);
        }
      });
    }
  }

  /**
   * Load a specific page
   */
  private loadPage(page: number): Observable<Pokemon[]> {
    const offset = page * this.LIMIT;
    
    return this.loadPokemonData(offset).pipe(
      tap((pokemon) => {
        if (page === 0) {
          this.pokemonListSignal.set(pokemon);
        } else {
          this.appendPokemon(pokemon);
        }
        this.currentPageSignal.set(page);
        this.loadingSignal.set(false);
      })
    );
  }

  /**
   * Load Pokemon data from API
   */
  private loadPokemonData(offset: number): Observable<Pokemon[]> {
    // If we're using mock data, skip API call
    if (this.useMockData) {
      return this.loadMockData(offset);
    }

    return this.http.get<PokemonListResponse>(
      `${this.API_URL}/pokemon?limit=${this.LIMIT}&offset=${offset}`
    ).pipe(
      tap(response => this.totalCountSignal.set(response.count)),
      switchMap(response => {
        const detailRequests = response.results.map(pokemon => {
          const id = this.extractIdFromUrl(pokemon.url);
          return this.getPokemonDetails(id).pipe(
            map(details => this.mapToPokemon(pokemon, details)),
            catchError(() => of(this.createFallbackPokemon(pokemon, id)))
          );
        });
        return forkJoin(detailRequests);
      }),
      catchError(error => {
        console.error('Failed to load Pokemon, switching to mock data:', error);
        this.useMockData = true;
        return this.loadMockData(offset);
      })
    );
  }

  /**
   * Load mock data as fallback
   */
  private loadMockData(offset: number): Observable<Pokemon[]> {
    return timer(300).pipe(
      map(() => generateMockPokemon(offset, this.LIMIT))
    );
  }

  /**
   * Get detailed Pokemon information
   */
  private getPokemonDetails(id: number): Observable<PokemonDetails> {
    return this.http.get<PokemonDetails>(`${this.API_URL}/pokemon/${id}`);
  }

  /**
   * Map API response to Pokemon model with 3D home sprite
   */
  private mapToPokemon(basicInfo: Pokemon, details: PokemonDetails): Pokemon {
    // Priority: home sprite (3D) > official artwork > dream world > front default
    const imageUrl = 
      details.sprites.other?.home?.front_default ||
      details.sprites.other?.['official-artwork']?.front_default ||
      details.sprites.other?.dream_world?.front_default ||
      details.sprites.front_default ||
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${details.id}.png`;

    return {
      ...basicInfo,
      id: details.id,
      imageUrl,
      sprites: details.sprites,
      types: details.types,
      height: details.height,
      weight: details.weight
    };
  }

  /**
   * Create fallback Pokemon object
   */
  private createFallbackPokemon(basicInfo: Pokemon, id: number): Pokemon {
    return {
      ...basicInfo,
      id,
      imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`
    };
  }

  /**
   * Append Pokemon to the list
   */
  private appendPokemon(newPokemon: Pokemon[]): void {
    this.pokemonListSignal.update(current => [...current, ...newPokemon]);
  }

  /**
   * Extract Pokemon ID from URL
   */
  private extractIdFromUrl(url: string): number {
    const matches = url.match(/\/(\d+)\/$/);
    return matches ? parseInt(matches[1], 10) : 0;
  }

  /**
   * Reset service state
   */
  reset(): void {
    this.pokemonListSignal.set([]);
    this.currentPageSignal.set(0);
    this.loadingSignal.set(false);
    this.prefetchCache.clear();
    this.prefetchingPages.clear();
  }
}
