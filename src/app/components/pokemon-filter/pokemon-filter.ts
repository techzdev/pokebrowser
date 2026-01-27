import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PokemonFilterData } from '../../models/pokemon.model';
import { getTypeColor, POKEMON_TYPES } from '../../utils/pokemon-type-utils';

@Component({
  selector: 'app-pokemon-filter',
  imports: [CommonModule, FormsModule],
  templateUrl: './pokemon-filter.html',
  styleUrl: './pokemon-filter.scss'
})
export class PokemonFilter {
  @Output() filterChange = new EventEmitter<PokemonFilterData>();

  keyword = '';
  selectedTypes: string[] = [];
  selectedGeneration = 'all';

  pokemonTypes = POKEMON_TYPES;

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
    return getTypeColor(type);
  }
}
