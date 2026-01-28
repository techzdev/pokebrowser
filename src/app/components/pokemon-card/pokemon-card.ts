import { Component, Input, ChangeDetectionStrategy, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Pokemon } from '../../models/pokemon.model';

@Component({
  selector: 'app-pokemon-card',
  standalone: true,
  imports: [NgOptimizedImage],
  templateUrl: './pokemon-card.html',
  styleUrl: './pokemon-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PokemonCard {
  @Input({ required: true }) pokemon!: Pokemon;
  @Input() isPriority = false;
  
  imageError = signal(false);

  onImageError(): void {
    this.imageError.set(true);
  }

  getImageUrl(): string {
    if (this.imageError()) {
      // Fallback to basic sprite
      return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${this.pokemon.id}.png`;
    }
    return this.pokemon.imageUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${this.pokemon.id}.png`;
  }
}
