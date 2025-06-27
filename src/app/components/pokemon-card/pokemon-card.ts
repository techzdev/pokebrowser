import { Component, Input, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pokemon } from '../../models/pokemon.model';

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

  onImageError(event: any): void {
    this.imageError = true;
    event.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${this.pokemon.id}.png`;
  }

  onImageLoad(): void {
    this.imageLoaded = true;
  }

  // Removed getPokemonBgUrl() method - now using direct CSS custom property binding in template
}
