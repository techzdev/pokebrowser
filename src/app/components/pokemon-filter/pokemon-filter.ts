import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface PokemonFilter {
  keyword: string;
  types: string[];
  generation: string;
}

@Component({
  selector: 'app-pokemon-filter',
  imports: [CommonModule, FormsModule],
  templateUrl: './pokemon-filter.html',
  styleUrl: './pokemon-filter.scss'
})
export class PokemonFilter {
  @Output() filterChange = new EventEmitter<PokemonFilter>();

  keyword = '';
  selectedTypes: string[] = [];
  selectedGeneration = 'all';

  pokemonTypes = [
    'normal', 'fire', 'water', 'electric', 'grass', 'ice',
    'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
    'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
  ];

  generations = [
    { value: 'all', label: 'All Generations' },
    { value: '1', label: 'Gen I (Kanto)' },
    { value: '2', label: 'Gen II (Johto)' },
    { value: '3', label: 'Gen III (Hoenn)' },
    { value: '4', label: 'Gen IV (Sinnoh)' },
    { value: '5', label: 'Gen V (Unova)' },
    { value: '6', label: 'Gen VI (Kalos)' },
    { value: '7', label: 'Gen VII (Alola)' },
    { value: '8', label: 'Gen VIII (Galar)' },
    { value: '9', label: 'Gen IX (Paldea)' }
  ];

  onKeywordChange(): void {
    this.emitFilter();
  }

  toggleType(type: string): void {
    const index = this.selectedTypes.indexOf(type);
    if (index > -1) {
      this.selectedTypes.splice(index, 1);
    } else {
      this.selectedTypes.push(type);
    }
    this.emitFilter();
  }

  isTypeSelected(type: string): boolean {
    return this.selectedTypes.includes(type);
  }

  onGenerationChange(): void {
    this.emitFilter();
  }

  clearFilters(): void {
    this.keyword = '';
    this.selectedTypes = [];
    this.selectedGeneration = 'all';
    this.emitFilter();
  }

  hasActiveFilters(): boolean {
    return this.keyword !== '' || this.selectedTypes.length > 0 || this.selectedGeneration !== 'all';
  }

  private emitFilter(): void {
    this.filterChange.emit({
      keyword: this.keyword,
      types: this.selectedTypes,
      generation: this.selectedGeneration
    });
  }

  getTypeColor(type: string): string {
    const colors: { [key: string]: string } = {
      normal: '#A8A878',
      fire: '#F08030',
      water: '#6890F0',
      electric: '#F8D030',
      grass: '#78C850',
      ice: '#98D8D8',
      fighting: '#C03028',
      poison: '#A040A0',
      ground: '#E0C068',
      flying: '#A890F0',
      psychic: '#F85888',
      bug: '#A8B820',
      rock: '#B8A038',
      ghost: '#705898',
      dragon: '#7038F8',
      dark: '#705848',
      steel: '#B8B8D0',
      fairy: '#EE99AC'
    };
    return colors[type] || '#68A090';
  }
}
