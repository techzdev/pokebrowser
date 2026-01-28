import { Component, Input, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pokemon } from '../../models/pokemon.model';
import { getTypeColor } from '../../utils/pokemon-type-utils';

@Component({
  selector: 'app-pokemon-card',
  imports: [CommonModule],
  templateUrl: './pokemon-card.html',
  styleUrl: './pokemon-card.scss'
})
export class PokemonCard implements OnInit, AfterViewInit {
  @Input() pokemon!: Pokemon;
  @Input() index: number = 0;
  imageLoaded = false;
  imageError = false;

  constructor() {}

  ngOnInit(): void {
    // Simplified preloading - just check if image exists
    if (this.pokemon.imageUrl) {
      this.preloadImage();
    }
  }

  ngAfterViewInit(): void {
    // No longer needed - using CSS custom properties directly in template
  }

  private preloadImage(): void {
    if (!this.pokemon.imageUrl) return;
    
    const img = new Image();
    img.onload = () => {
      this.imageLoaded = true;
    };
    img.onerror = () => {
      this.imageError = true;
      // Try fallback image
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        this.imageLoaded = true;
      };
      fallbackImg.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${this.pokemon.id}.png`;
    };
    img.src = this.pokemon.imageUrl;
  }

  getTypeColor(type: string): string {
    return getTypeColor(type);
  }

  onImageError(event: any): void {
    this.imageError = true;
    event.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${this.pokemon.id}.png`;
  }

  onImageLoad(): void {
    this.imageLoaded = true;
  }

  // Removed getPokemonBgUrl() method - now using direct CSS custom property binding in template
}
