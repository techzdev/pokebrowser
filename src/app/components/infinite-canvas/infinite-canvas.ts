import { 
  Component, 
  OnInit, 
  OnDestroy, 
  HostListener, 
  signal,
  computed,
  effect,
  ElementRef
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
  private readonly TOTAL_POKEMON_COUNT = 1025; // Total number of Pokémon in the Pokédex
  
  private destroy$ = new Subject<void>();
  private isPanning = false;
  private lastTouchX = 0;
  private lastTouchY = 0;
  private boundHandleWheel: (event: WheelEvent) => void;

  // Expose signals to template
  currentOffsetX = computed(() => this.offsetX());
  currentOffsetY = computed(() => this.offsetY());
  loading = computed(() => this.isLoading());
  error = computed(() => this.errorMessage());

  constructor(private http: HttpClient, private elementRef: ElementRef) {
    // Track position changes for reactive updates
    // Bind the wheel handler once in constructor to ensure same reference for add/remove
    this.boundHandleWheel = this.handleWheel.bind(this);
  }

  ngOnInit(): void {
    this.loadPokemon();
    
    // Add wheel event listener with passive: false to allow preventDefault()
    this.elementRef.nativeElement.addEventListener('wheel', this.boundHandleWheel, { passive: false });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Remove wheel event listener using the same bound reference
    this.elementRef.nativeElement.removeEventListener('wheel', this.boundHandleWheel);
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

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    this.isPanning = true;
    this.lastTouchX = event.clientX;
    this.lastTouchY = event.clientY;
    event.preventDefault();
  }

  private handleWheel(event: WheelEvent): void {
    event.preventDefault();
    
    // Get delta values from wheel event
    const deltaX = event.deltaX;
    const deltaY = event.deltaY;
    
    // Update offset with inverted values for natural scrolling
    this.offsetX.update(x => x - deltaX);
    this.offsetY.update(y => y - deltaY);
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
    
    // Calculate card + gap size
    const cellWidth = this.CARD_WIDTH + this.CARD_GAP;
    const cellHeight = this.CARD_HEIGHT + this.CARD_GAP;
    
    // Calculate which grid cells are visible based on offset
    // Determine the top-left grid position in viewport
    const startCol = Math.floor(-offsetX / cellWidth);
    const startRow = Math.floor(-offsetY / cellHeight);
    
    // Calculate how many columns and rows we need to fill the viewport
    const numCols = Math.ceil(viewportWidth / cellWidth) + 2; // +2 for partial cells
    const numRows = Math.ceil(viewportHeight / cellHeight) + 2;
    
    const visibleCards: PokemonCardData[] = [];
    
    // Generate visible cards based on grid position
    for (let row = startRow; row < startRow + numRows; row++) {
      for (let col = startCol; col < startCol + numCols; col++) {
        // Calculate grid index (infinite grid)
        const gridIndex = row * this.COLUMNS + col;
        
        // Use modulo to wrap the index to valid Pokémon IDs (1-1025)
        // Add TOTAL_POKEMON_COUNT before modulo to handle negative numbers correctly
        const pokemonId = ((gridIndex % this.TOTAL_POKEMON_COUNT) + this.TOTAL_POKEMON_COUNT) % this.TOTAL_POKEMON_COUNT + 1;
        
        // Get Pokémon data (or create placeholder if not in loaded set)
        const pokemonData = this.getPokemonById(pokemonId);
        
        // Calculate screen position
        const screenX = col * cellWidth + offsetX;
        const screenY = row * cellHeight + offsetY;
        
        // Only add if within viewport bounds (with small buffer)
        if (
          screenX + this.CARD_WIDTH >= -this.CARD_GAP &&
          screenX <= viewportWidth + this.CARD_GAP &&
          screenY + this.CARD_HEIGHT >= -this.CARD_GAP &&
          screenY <= viewportHeight + this.CARD_GAP
        ) {
          visibleCards.push({
            pokemon: pokemonData,
            gridPos: { row, col },
            screenX,
            screenY
          });
        }
      }
    }
    
    return visibleCards;
  }

  private getPokemonById(id: number): Pokemon {
    // Check if we have this Pokémon in our loaded set
    const loaded = this.allPokemon().find(p => p.id === id);
    if (loaded) {
      return loaded;
    }
    
    // Return a placeholder Pokémon with the calculated ID
    return {
      name: `pokemon-${id}`,
      url: `https://pokeapi.co/api/v2/pokemon/${id}/`,
      id: id,
      imageUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
    };
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
