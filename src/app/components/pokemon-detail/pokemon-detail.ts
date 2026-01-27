import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PokemonService } from '../../services/pokemon.service';
import { PokemonDetails, PokemonSpecies, EvolutionChain, ChainLink } from '../../models/pokemon.model';
import { getTypeColor } from '../../utils/pokemon-type-utils';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface EvolutionStage {
  name: string;
  id: number;
  imageUrl: string;
  minLevel: number | null;
}

@Component({
  selector: 'app-pokemon-detail',
  imports: [CommonModule],
  templateUrl: './pokemon-detail.html',
  styleUrl: './pokemon-detail.scss'
})
export class PokemonDetail implements OnInit {
  @Input() pokemonId!: number;
  @Output() close = new EventEmitter<void>();

  pokemonDetails?: PokemonDetails;
  pokemonSpecies?: PokemonSpecies;
  evolutionChain: EvolutionStage[] = [];
  loading = true;
  error = false;

  private readonly MAX_STAT_VALUE = 255;

  constructor(private pokemonService: PokemonService) {}

  ngOnInit(): void {
    this.loadPokemonData();
  }

  loadPokemonData(): void {
    this.loading = true;
    this.error = false;

    // Fetch both pokemon details and species data
    forkJoin({
      details: this.pokemonService.getPokemonDetails(this.pokemonId),
      species: this.pokemonService.getPokemonSpecies(this.pokemonId)
    }).pipe(
      catchError(error => {
        console.error('Error loading pokemon data:', error);
        this.error = true;
        this.loading = false;
        return of(null);
      })
    ).subscribe(result => {
      if (result) {
        this.pokemonDetails = result.details;
        this.pokemonSpecies = result.species;

        // Load evolution chain
        if (result.species.evolution_chain) {
          this.loadEvolutionChain(result.species.evolution_chain.url);
        } else {
          this.loading = false;
        }
      }
    });
  }

  loadEvolutionChain(url: string): void {
    this.pokemonService.getEvolutionChain(url).pipe(
      catchError(error => {
        console.error('Error loading evolution chain:', error);
        this.loading = false;
        return of(null);
      })
    ).subscribe(chain => {
      if (chain) {
        this.evolutionChain = this.parseEvolutionChain(chain.chain);
      }
      this.loading = false;
    });
  }

  parseEvolutionChain(chain: ChainLink): EvolutionStage[] {
    const stages: EvolutionStage[] = [];
    
    const extractStages = (link: ChainLink) => {
      const id = this.extractIdFromUrl(link.species.url);
      stages.push({
        name: link.species.name,
        id: id,
        imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
        minLevel: link.evolution_details.length > 0 ? link.evolution_details[0].min_level : null
      });

      // Process next evolution
      if (link.evolves_to.length > 0) {
        extractStages(link.evolves_to[0]);
      }
    };

    extractStages(chain);
    return stages;
  }

  private extractIdFromUrl(url: string): number {
    const matches = url.match(/\/(\d+)\/$/);
    return matches ? parseInt(matches[1], 10) : 0;
  }

  onClose(): void {
    this.close.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.onClose();
    }
  }

  getTypeColor(type: string): string {
    return getTypeColor(type);
  }

  getPrimaryType(): string {
    return this.pokemonDetails?.types?.[0]?.type.name || 'normal';
  }

  getFlavorText(): string {
    if (!this.pokemonSpecies?.flavor_text_entries) return '';
    
    // Get English flavor text from the most recent game
    const englishEntries = this.pokemonSpecies.flavor_text_entries.filter(
      entry => entry.language.name === 'en'
    );
    
    if (englishEntries.length === 0) return '';
    
    // Get the latest entry
    const latestEntry = englishEntries[englishEntries.length - 1];
    return latestEntry.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ');
  }

  getGenus(): string {
    if (!this.pokemonSpecies?.genera) return '';
    
    const englishGenus = this.pokemonSpecies.genera.find(
      genus => genus.language.name === 'en'
    );
    
    return englishGenus?.genus || '';
  }

  getGeneration(): string {
    if (!this.pokemonSpecies?.generation) return 'Unknown';
    
    const genMap: { [key: string]: string } = {
      'generation-i': 'Generation I',
      'generation-ii': 'Generation II',
      'generation-iii': 'Generation III',
      'generation-iv': 'Generation IV',
      'generation-v': 'Generation V',
      'generation-vi': 'Generation VI',
      'generation-vii': 'Generation VII',
      'generation-viii': 'Generation VIII',
      'generation-ix': 'Generation IX'
    };
    
    return genMap[this.pokemonSpecies.generation.name] || this.pokemonSpecies.generation.name;
  }

  getStatName(stat: string): string {
    const statMap: { [key: string]: string } = {
      'hp': 'HP',
      'attack': 'Attack',
      'defense': 'Defense',
      'special-attack': 'Sp. Atk',
      'special-defense': 'Sp. Def',
      'speed': 'Speed'
    };
    return statMap[stat] || stat;
  }

  getStatBarColor(statName: string): string {
    const colorMap: { [key: string]: string } = {
      'hp': '#FF5959',
      'attack': '#F5AC78',
      'defense': '#FAE078',
      'special-attack': '#9DB7F5',
      'special-defense': '#A7DB8D',
      'speed': '#FA92B2'
    };
    return colorMap[statName] || '#68A090';
  }

  getStatPercentage(value: number): number {
    return Math.min((value / this.MAX_STAT_VALUE) * 100, 100);
  }

  getEggGroups(): string {
    if (!this.pokemonSpecies?.egg_groups) return '';
    return this.pokemonSpecies.egg_groups.map(eg => eg.name).join(', ');
  }
}
