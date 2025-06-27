export interface Pokemon {
  id: number;
  name: string;
  url: string;
  imageUrl?: string;
  sprites?: PokemonSprites;
  types?: PokemonType[];
  height?: number;
  weight?: number;
  base_experience?: number;
  stats?: PokemonStat[];
}

export interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Pokemon[];
}

export interface PokemonSprites {
  front_default: string;
  other: {
    'official-artwork': {
      front_default: string;
    };
    dream_world: {
      front_default: string;
    };
  };
}

export interface PokemonType {
  slot: number;
  type: {
    name: string;
    url: string;
  };
}

export interface PokemonStat {
  base_stat: number;
  effort: number;
  stat: {
    name: string;
    url: string;
  };
}

export interface PokemonDetails {
  id: number;
  name: string;
  sprites: PokemonSprites;
  types: PokemonType[];
  height: number;
  weight: number;
  base_experience: number;
  stats: PokemonStat[];
}

// New interfaces for enhanced features
export interface SearchOptions {
  term: string;
  types?: string[];
  minId?: number;
  maxId?: number;
}

export interface FavoritePokemon {
  id: number;
  name: string;
  imageUrl: string;
  addedAt: Date;
}

export interface ComparisonPokemon {
  pokemon: Pokemon;
  selected: boolean;
}

export type SortOption = 'id' | 'name' | 'type' | 'height' | 'weight';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  option: SortOption;
  direction: SortDirection;
}