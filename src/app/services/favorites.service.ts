import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Pokemon, FavoritePokemon } from '../models/pokemon.model';

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private readonly STORAGE_KEY = 'pokemon-favorites';
  private favoritesSubject = new BehaviorSubject<FavoritePokemon[]>([]);
  
  favorites$ = this.favoritesSubject.asObservable();

  constructor() {
    this.loadFavoritesFromStorage();
  }

  private loadFavoritesFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const favorites = JSON.parse(stored).map((fav: any) => ({
          ...fav,
          addedAt: new Date(fav.addedAt)
        }));
        this.favoritesSubject.next(favorites);
      }
    } catch (error) {
      console.warn('Error loading favorites from storage:', error);
    }
  }

  private saveFavoritesToStorage(): void {
    try {
      const favorites = this.favoritesSubject.value;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.warn('Error saving favorites to storage:', error);
    }
  }

  addToFavorites(pokemon: Pokemon): void {
    const currentFavorites = this.favoritesSubject.value;
    
    if (!this.isFavorite(pokemon.id)) {
      const favorite: FavoritePokemon = {
        id: pokemon.id,
        name: pokemon.name,
        imageUrl: pokemon.imageUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`,
        addedAt: new Date()
      };
      
      const updatedFavorites = [...currentFavorites, favorite];
      this.favoritesSubject.next(updatedFavorites);
      this.saveFavoritesToStorage();
    }
  }

  removeFromFavorites(pokemonId: number): void {
    const currentFavorites = this.favoritesSubject.value;
    const updatedFavorites = currentFavorites.filter(fav => fav.id !== pokemonId);
    this.favoritesSubject.next(updatedFavorites);
    this.saveFavoritesToStorage();
  }

  toggleFavorite(pokemon: Pokemon): void {
    if (this.isFavorite(pokemon.id)) {
      this.removeFromFavorites(pokemon.id);
    } else {
      this.addToFavorites(pokemon);
    }
  }

  isFavorite(pokemonId: number): boolean {
    return this.favoritesSubject.value.some(fav => fav.id === pokemonId);
  }

  getFavoriteCount(): number {
    return this.favoritesSubject.value.length;
  }

  clearAllFavorites(): void {
    this.favoritesSubject.next([]);
    this.saveFavoritesToStorage();
  }

  getFavoriteById(pokemonId: number): FavoritePokemon | undefined {
    return this.favoritesSubject.value.find(fav => fav.id === pokemonId);
  }

  getFavoritesSorted(sortBy: 'name' | 'id' | 'addedAt' = 'addedAt'): Observable<FavoritePokemon[]> {
    return new Observable(observer => {
      this.favorites$.subscribe(favorites => {
        const sorted = [...favorites].sort((a, b) => {
          switch (sortBy) {
            case 'name':
              return a.name.localeCompare(b.name);
            case 'id':
              return a.id - b.id;
            case 'addedAt':
            default:
              return b.addedAt.getTime() - a.addedAt.getTime(); // Most recent first
          }
        });
        observer.next(sorted);
      });
    });
  }
}