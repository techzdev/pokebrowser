import { 
  Component, 
  OnInit, 
  OnDestroy, 
  HostListener, 
  signal,
  computed,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';

interface Pokemon {
  name: string;
  url: string;
  id: number;
  imageUrl: string;
}

interface GridPosition {
  row: number;
  col: number;
}

interface CanvasCoordinate {
  x: number;
  y: number;
}

interface PokemonCardData {
  pokemon: Pokemon;
  gridPos: GridPosition;
  screenX: number;
  screenY: number;
}

@Component({
  selector: 'app-infinite-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './infinite-canvas.html',
  styleUrl: './infinite-canvas.scss'
})
export class InfiniteCanvas implements OnInit, OnDestroy {
  // Signals for state management
  private offsetX = signal(0);
  private offsetY = signal(0);
  private allPokemon = signal<Pokemon[]>([]);
  private isLoading = signal(false);
  private errorMessage = signal<string | null>(null);
  
  // Computed signal for visible Pokemon
  visiblePokemon = computed(() => {
    const pokemon = this.allPokemon();
    const x = this.offsetX();
    const y = this.offsetY();
    
    if (pokemon.length === 0) return [];
    
    return this.calculateVisiblePokemon(pokemon, x, y);
  });

  // Configuration
  private readonly COLUMNS = 5;
  private readonly CARD_WIDTH = 280;
  private readonly CARD_HEIGHT = 380;
  private readonly CARD_GAP = 32;
  private readonly POKEMON_LIMIT = 20;
  private readonly API_URL = 'https://pokeapi.co/api/v2/pokemon';
  private readonly GRID_CELL_SIZE = 40;
  
  private destroy$ = new Subject<void>();
  private isPanning = false;
  private lastTouchX = 0;
  private lastTouchY = 0;

  // Expose signals to template
  currentOffsetX = computed(() => this.offsetX());
  currentOffsetY = computed(() => this.offsetY());
  loading = computed(() => this.isLoading());
  error = computed(() => this.errorMessage());

  constructor(private http: HttpClient) {
    // Track position changes for reactive updates
  }

  ngOnInit(): void {
    this.loadPokemon();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPokemon(): void {
    this.isLoading.set(true);
    
    this.http.get<{ results: { name: string; url: string }[] }>(
      `${this.API_URL}?limit=${this.POKEMON_LIMIT}&offset=0`
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        const pokemon = response.results.map((p, index) => {
          const id = index + 1;
          return {
            name: p.name,
            url: p.url,
            id,
            imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
          };
        });
        this.allPokemon.set(pokemon);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load Pokemon:', error);
        this.errorMessage.set('Using demo data - API unavailable');
        this.isLoading.set(false);
        // Fallback to mock data
        this.loadMockPokemon();
      }
    });
  }

  private loadMockPokemon(): void {
    const mockPokemon: Pokemon[] = [];
    for (let i = 1; i <= this.POKEMON_LIMIT; i++) {
      mockPokemon.push({
        name: `pokemon-${i}`,
        url: '',
        id: i,
        imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${i}.png`
      });
    }
    this.allPokemon.set(mockPokemon);
  }

  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent): void {
    event.preventDefault();
    
    // Get delta values from wheel event
    const deltaX = event.deltaX;
    const deltaY = event.deltaY;
    
    // Update offset with inverted values for natural scrolling
    this.offsetX.update(x => x - deltaX);
    this.offsetY.update(y => y - deltaY);
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    this.isPanning = true;
    this.lastTouchX = event.clientX;
    this.lastTouchY = event.clientY;
    event.preventDefault();
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.isPanning) return;
    
    const deltaX = event.clientX - this.lastTouchX;
    const deltaY = event.clientY - this.lastTouchY;
    
    this.offsetX.update(x => x + deltaX);
    this.offsetY.update(y => y + deltaY);
    
    this.lastTouchX = event.clientX;
    this.lastTouchY = event.clientY;
  }

  @HostListener('mouseup')
  onMouseUp(): void {
    this.isPanning = false;
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.isPanning = false;
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      event.preventDefault();
      this.isPanning = true;
      this.lastTouchX = event.touches[0].clientX;
      this.lastTouchY = event.touches[0].clientY;
    }
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (!this.isPanning || event.touches.length !== 1) return;
    
    event.preventDefault();
    
    const deltaX = event.touches[0].clientX - this.lastTouchX;
    const deltaY = event.touches[0].clientY - this.lastTouchY;
    
    this.offsetX.update(x => x + deltaX);
    this.offsetY.update(y => y + deltaY);
    
    this.lastTouchX = event.touches[0].clientX;
    this.lastTouchY = event.touches[0].clientY;
  }

  @HostListener('touchend')
  onTouchEnd(): void {
    this.isPanning = false;
  }

  private calculateVisiblePokemon(
    pokemon: Pokemon[], 
    offsetX: number, 
    offsetY: number
  ): PokemonCardData[] {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate total grid dimensions
    const totalWidth = this.COLUMNS * (this.CARD_WIDTH + this.CARD_GAP);
    const totalRows = Math.ceil(pokemon.length / this.COLUMNS);
    const totalHeight = totalRows * (this.CARD_HEIGHT + this.CARD_GAP);
    
    // Normalize offsets for seamless wrapping
    const normalizedX = ((offsetX % totalWidth) + totalWidth) % totalWidth;
    const normalizedY = ((offsetY % totalHeight) + totalHeight) % totalHeight;
    
    const visibleCards: PokemonCardData[] = [];
    
    // Check multiple wrapped instances to fill viewport
    for (let wrapY = -1; wrapY <= 1; wrapY++) {
      for (let wrapX = -1; wrapX <= 1; wrapX++) {
        pokemon.forEach((poke, index) => {
          const row = Math.floor(index / this.COLUMNS);
          const col = index % this.COLUMNS;
          
          // Calculate base position
          const baseX = col * (this.CARD_WIDTH + this.CARD_GAP);
          const baseY = row * (this.CARD_HEIGHT + this.CARD_GAP);
          
          // Apply wrapping
          const wrappedX = baseX + (wrapX * totalWidth);
          const wrappedY = baseY + (wrapY * totalHeight);
          
          // Calculate screen position
          const screenX = wrappedX + normalizedX;
          const screenY = wrappedY + normalizedY;
          
          // Check if card is visible
          if (
            screenX + this.CARD_WIDTH >= -this.CARD_GAP &&
            screenX <= viewportWidth + this.CARD_GAP &&
            screenY + this.CARD_HEIGHT >= -this.CARD_GAP &&
            screenY <= viewportHeight + this.CARD_GAP
          ) {
            visibleCards.push({
              pokemon: poke,
              gridPos: { row, col },
              screenX,
              screenY
            });
          }
        });
      }
    }
    
    return visibleCards;
  }

  getTransform(card: PokemonCardData): string {
    return `translate3d(${card.screenX}px, ${card.screenY}px, 0)`;
  }

  trackByPokemon(index: number, card: PokemonCardData): number {
    return card.pokemon.id;
  }

  formatPokemonName(name: string): string {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getBackgroundOffset(): string {
    const x = this.offsetX();
    const y = this.offsetY();
    return `${x % this.GRID_CELL_SIZE}px ${y % this.GRID_CELL_SIZE}px`;
  }
}
