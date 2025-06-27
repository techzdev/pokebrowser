import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Pokemon } from '../models/pokemon.model';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private searchTermSubject = new BehaviorSubject<string>('');
  private allPokemonSubject = new BehaviorSubject<Pokemon[]>([]);
  
  searchTerm$ = this.searchTermSubject.asObservable().pipe(
    debounceTime(300),
    distinctUntilChanged()
  );
  
  filteredPokemon$: Observable<Pokemon[]> = combineLatest([
    this.allPokemonSubject.asObservable(),
    this.searchTerm$
  ]).pipe(
    map(([pokemon, searchTerm]) => {
      if (!searchTerm.trim()) {
        return pokemon;
      }
      
      const term = searchTerm.toLowerCase().trim();
      return pokemon.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.id.toString().includes(term) ||
        p.types?.some(t => t.type.name.toLowerCase().includes(term))
      );
    })
  );

  constructor() {}

  updateSearchTerm(term: string): void {
    this.searchTermSubject.next(term);
  }

  updatePokemonList(pokemon: Pokemon[]): void {
    this.allPokemonSubject.next(pokemon);
  }

  getSearchSuggestions(term: string): Observable<string[]> {
    return this.allPokemonSubject.asObservable().pipe(
      map(pokemon => {
        if (!term.trim()) return [];
        
        const searchTerm = term.toLowerCase();
        const suggestions = new Set<string>();
        
        // Add matching Pokemon names
        pokemon.forEach(p => {
          if (p.name.toLowerCase().includes(searchTerm)) {
            suggestions.add(p.name);
          }
          
          // Add matching types
          p.types?.forEach(t => {
            if (t.type.name.toLowerCase().includes(searchTerm)) {
              suggestions.add(t.type.name);
            }
          });
        });
        
        return Array.from(suggestions).slice(0, 5);
      })
    );
  }

  reset(): void {
    this.searchTermSubject.next('');
  }
}