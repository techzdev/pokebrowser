import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, forkJoin, of, timer } from 'rxjs';
import { map, switchMap, catchError, delay } from 'rxjs/operators';
import { Pokemon, PokemonListResponse, PokemonDetails, PokemonSpecies, EvolutionChain } from '../models/pokemon.model';
import { generateMockPokemon } from '../models/mock-data';

@Injectable({
  providedIn: 'root'
})
export class PokemonService {
  private readonly API_URL = 'https://pokeapi.co/api/v2';
  private pokemonSubject = new BehaviorSubject<Pokemon[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private totalCount = 1008; // Total Pokemon count
  private currentOffset = 0;
  private readonly limit = 24; // เพิ่มจำนวนโหลดต่อครั้งจาก 20 เป็น 24
  private useMockData = false;

  pokemon$ = this.pokemonSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadPokemon(offset: number = 0): Observable<Pokemon[]> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    
    // If we're already using mock data or if this is a retry, use mock data
    if (this.useMockData) {
      return this.loadMockPokemon(offset);
    }
    
    return this.http.get<PokemonListResponse>(`${this.API_URL}/pokemon?limit=${this.limit}&offset=${offset}`)
      .pipe(
        switchMap(response => {
          this.totalCount = response.count;
          
          // Get detailed information for each Pokemon
          const detailRequests = response.results.map(pokemon => {
            const id = this.extractIdFromUrl(pokemon.url);
            return this.getPokemonDetails(id).pipe(
              map(details => ({
                ...pokemon,
                id: details.id,
                imageUrl: details.sprites.other['official-artwork'].front_default || 
                         details.sprites.other.dream_world.front_default ||
                         details.sprites.front_default,
                sprites: details.sprites,
                types: details.types,
                height: details.height,
                weight: details.weight
              })),
              catchError(() => of({
                ...pokemon,
                id: id,
                imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
              }))
            );
          });
          
          return forkJoin(detailRequests);
        }),
        map(pokemonWithDetails => {
          const currentPokemon = this.pokemonSubject.value;
          const updatedPokemon = offset === 0 ? pokemonWithDetails : [...currentPokemon, ...pokemonWithDetails];
          this.pokemonSubject.next(updatedPokemon);
          this.currentOffset = offset + this.limit;
          this.loadingSubject.next(false);
          return updatedPokemon;
        }),
        catchError(error => {
          console.warn('API request failed, switching to mock data:', error);
          this.useMockData = true;
          this.errorSubject.next('Using demo data - API unavailable');
          return this.loadMockPokemon(offset);
        })
      );
  }

  private loadMockPokemon(offset: number): Observable<Pokemon[]> {
    // ลด delay จาก 300ms เป็น 150ms เพื่อให้โหลดเร็วขึ้นมากกว่าเดิม
    return timer(150).pipe(
      map(() => {
        const mockPokemon = generateMockPokemon(offset, this.limit);
        const currentPokemon = this.pokemonSubject.value;
        const updatedPokemon = offset === 0 ? mockPokemon : [...currentPokemon, ...mockPokemon];
        this.pokemonSubject.next(updatedPokemon);
        this.currentOffset = offset + this.limit;
        this.loadingSubject.next(false);
        return updatedPokemon;
      })
    );
  }

  loadMorePokemon(): Observable<Pokemon[]> {
    return this.loadPokemon(this.currentOffset);
  }

  getPokemonDetails(id: number): Observable<PokemonDetails> {
    return this.http.get<PokemonDetails>(`${this.API_URL}/pokemon/${id}`);
  }

  getPokemonSpecies(id: number): Observable<PokemonSpecies> {
    return this.http.get<PokemonSpecies>(`${this.API_URL}/pokemon-species/${id}`);
  }

  getEvolutionChain(url: string): Observable<EvolutionChain> {
    return this.http.get<EvolutionChain>(url);
  }

  hasMorePokemon(): boolean {
    return this.currentOffset < this.totalCount;
  }

  loadPokemonForGeneration(minId: number, maxId: number): Observable<Pokemon[]> {
    // Check if we already have Pokemon in this range
    const currentPokemon = this.pokemonSubject.value;
    const hasDataInRange = currentPokemon.some(p => p.id >= minId && p.id <= maxId);
    
    if (hasDataInRange) {
      // Already have some data in this range, return current state
      return of(currentPokemon);
    }
    
    // Load Pokemon starting from minId
    const offset = minId - 1;
    const limit = Math.min(50, maxId - minId + 1); // Load up to 50 Pokemon from the generation
    
    this.loadingSubject.next(true);
    
    if (this.useMockData) {
      return timer(150).pipe(
        map(() => {
          const newPokemon = generateMockPokemon(offset, limit);
          const currentPokemon = this.pokemonSubject.value;
          
          // Merge new Pokemon with existing ones, avoiding duplicates
          const pokemonMap = new Map(currentPokemon.map(p => [p.id, p]));
          newPokemon.forEach(p => pokemonMap.set(p.id, p));
          
          const updatedPokemon = Array.from(pokemonMap.values()).sort((a, b) => a.id - b.id);
          this.pokemonSubject.next(updatedPokemon);
          this.loadingSubject.next(false);
          return updatedPokemon;
        })
      );
    }
    
    // Try to load from API
    return this.http.get<PokemonListResponse>(`${this.API_URL}/pokemon?limit=${limit}&offset=${offset}`)
      .pipe(
        switchMap(response => {
          const detailRequests = response.results.map(pokemon => {
            const id = this.extractIdFromUrl(pokemon.url);
            return this.getPokemonDetails(id).pipe(
              map(details => ({
                ...pokemon,
                id: details.id,
                imageUrl: details.sprites.other['official-artwork'].front_default || 
                         details.sprites.other.dream_world.front_default ||
                         details.sprites.front_default,
                sprites: details.sprites,
                types: details.types,
                height: details.height,
                weight: details.weight
              })),
              catchError(() => of({
                ...pokemon,
                id: id,
                imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
              }))
            );
          });
          
          return forkJoin(detailRequests);
        }),
        map(newPokemon => {
          const currentPokemon = this.pokemonSubject.value;
          
          // Merge new Pokemon with existing ones, avoiding duplicates
          const pokemonMap = new Map(currentPokemon.map(p => [p.id, p]));
          newPokemon.forEach(p => pokemonMap.set(p.id, p));
          
          const updatedPokemon = Array.from(pokemonMap.values()).sort((a, b) => a.id - b.id);
          this.pokemonSubject.next(updatedPokemon);
          this.loadingSubject.next(false);
          return updatedPokemon;
        }),
        catchError(error => {
          console.warn('API request failed for generation, switching to mock data:', error);
          this.useMockData = true;
          this.loadingSubject.next(false);
          return this.loadPokemonForGeneration(minId, maxId);
        })
      );
  }

  private extractIdFromUrl(url: string): number {
    const matches = url.match(/\/(\d+)\/$/);
    return matches ? parseInt(matches[1], 10) : 0;
  }

  getCurrentPokemonCount(): number {
    return this.pokemonSubject.value.length;
  }

  reset(): void {
    this.pokemonSubject.next([]);
    this.currentOffset = 0;
    this.errorSubject.next(null);
  }

  isUsingMockData(): boolean {
    return this.useMockData;
  }
}