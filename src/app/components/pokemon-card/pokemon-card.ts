import { Component, Input, OnInit, AfterViewInit, HostListener, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pokemon } from '../../models/pokemon.model';
import { FavoritesService } from '../../services/favorites.service';
import { TypeColorPipe } from '../../pipes/type-color.pipe';

@Component({
  selector: 'app-pokemon-card',
  imports: [CommonModule, TypeColorPipe],
  templateUrl: './pokemon-card.html',
  styleUrl: './pokemon-card.scss'
})
export class PokemonCard implements OnInit, AfterViewInit {
  @Input() pokemon!: Pokemon;
  @Input() index: number = 0;
  @Input() isSelectable: boolean = false;
  @Input() isSelected: boolean = false;
  
  @Output() cardClick = new EventEmitter<Pokemon>();
  @Output() favoriteToggle = new EventEmitter<Pokemon>();
  
  imageLoaded = false;
  imageError = false;
  isHovered = false;
  isFavorite = false;

  constructor(private favoritesService: FavoritesService) {}

  ngOnInit(): void {
    if (this.pokemon.imageUrl) {
      this.preloadImage();
    }
    
    // Check if this Pokemon is in favorites
    this.isFavorite = this.favoritesService.isFavorite(this.pokemon.id);
  }

  ngAfterViewInit(): void {
    // Enhanced component is ready
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.isHovered = true;
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.isHovered = false;
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onCardClick();
    }
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

  onImageError(event: Event): void {
    this.imageError = true;
    const target = event.target as HTMLImageElement;
    target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${this.pokemon.id}.png`;
  }

  onImageLoad(): void {
    this.imageLoaded = true;
  }

  onCardClick(): void {
    this.cardClick.emit(this.pokemon);
  }

  onFavoriteClick(event: Event): void {
    event.stopPropagation(); // Prevent card click
    this.favoritesService.toggleFavorite(this.pokemon);
    this.isFavorite = !this.isFavorite;
    this.favoriteToggle.emit(this.pokemon);
  }

  get pokemonName(): string {
    return this.pokemon.name.charAt(0).toUpperCase() + this.pokemon.name.slice(1);
  }

  get pokemonId(): string {
    return `#${this.pokemon.id.toString().padStart(3, '0')}`;
  }

  get primaryType(): string {
    return this.pokemon.types?.[0]?.type.name || 'unknown';
  }

  get cardAriaLabel(): string {
    const types = this.pokemon.types?.map(t => t.type.name).join(', ') || 'unknown type';
    return `${this.pokemonName}, ${this.pokemonId}, ${types} type Pokemon`;
  }
}
