import { Pokemon } from './pokemon.model';

/**
 * Generate mock Pokemon data for fallback when API is unavailable
 */
export function generateMockPokemon(offset: number, limit: number): Pokemon[] {
  const mockPokemon: Pokemon[] = [];
  
  // Common type combinations
  const typeOptions = [
    [{ slot: 1, type: { name: 'grass', url: '' } }],
    [{ slot: 1, type: { name: 'fire', url: '' } }],
    [{ slot: 1, type: { name: 'water', url: '' } }],
    [{ slot: 1, type: { name: 'electric', url: '' } }],
    [{ slot: 1, type: { name: 'normal', url: '' } }],
    [{ slot: 1, type: { name: 'bug', url: '' } }, { slot: 2, type: { name: 'poison', url: '' } }],
    [{ slot: 1, type: { name: 'flying', url: '' } }],
    [{ slot: 1, type: { name: 'psychic', url: '' } }],
  ];
  
  for (let i = 0; i < limit; i++) {
    const id = offset + i + 1;
    if (id > 1025) break; // Max Pokemon
    
    const name = `pokemon-${id}`;
    mockPokemon.push({
      id,
      name,
      url: `https://pokeapi.co/api/v2/pokemon/${id}/`,
      imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`,
      sprites: {
        front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
        other: {
          'official-artwork': {
            front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
          },
          dream_world: {
            front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/${id}.svg`
          },
          home: {
            front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`
          }
        }
      },
      types: typeOptions[id % typeOptions.length],
      height: 10 + (id % 20),
      weight: 60 + (id % 100)
    });
  }
  
  return mockPokemon;
}
