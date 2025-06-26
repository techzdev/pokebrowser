import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Pokemon, PokemonListResponse, PokemonDetails } from '../models/pokemon.model';

@Injectable({
  providedIn: 'root'
})
export class PokemonService {
  private readonly API_URL = 'https://pokeapi.co/api/v2';
  private pokemonSubject = new BehaviorSubject<Pokemon[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private totalCount = 0;
  private currentOffset = 0;
  private readonly limit = 20;

  pokemon$ = this.pokemonSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadPokemon(offset: number = 0): Observable<Pokemon[]> {
    this.loadingSubject.next(true);
    
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
          console.error('Error loading Pokemon:', error);
          this.loadingSubject.next(false);
          return of([]);
        })
      );
  }

  loadMorePokemon(): Observable<Pokemon[]> {
    return this.loadPokemon(this.currentOffset);
  }

  getPokemonDetails(id: number): Observable<PokemonDetails> {
    return this.http.get<PokemonDetails>(`${this.API_URL}/pokemon/${id}`);
  }

  hasMorePokemon(): boolean {
    return this.currentOffset < this.totalCount;
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
  }
}