import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { PokemonService } from '../../services/pokemon.service';
import { PokemonCard } from '../pokemon-card/pokemon-card';
import { PokemonFilter } from '../pokemon-filter/pokemon-filter';
import { PokemonDetail } from '../pokemon-detail/pokemon-detail';
import { Pokemon, PokemonFilterData } from '../../models/pokemon.model';
import { GENERATION_RANGES } from '../../utils/pokemon-type-utils';

@Component({
  selector: 'app-pokemon-grid',
  imports: [CommonModule, PokemonCard, PokemonFilter, PokemonDetail],
  templateUrl: './pokemon-grid.html',
  styleUrl: './pokemon-grid.scss'
})
export class PokemonGrid implements OnInit, OnDestroy {
  pokemon: Pokemon[] = [];
  filteredPokemon: Pokemon[] = [];
  loading = false;
  error: string | null = null;
  selectedPokemonId: number | null = null;
  activeFilter: PokemonFilterData = { keyword: '', types: [], generation: 'all' };
  isSidebarOpen = false;
  
  // Pan properties with momentum
  panX = 0;
  panY = 0;
  isPanning = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private destroy$ = new Subject<void>();
  private loadingTimeoutId?: number;
  
  // Momentum scrolling properties
  private velocityX = 0;
  private velocityY = 0;
  private momentumAnimation?: number;
  private readonly FRICTION = 0.92; // Friction coefficient for momentum
  private readonly MIN_VELOCITY = 0.1; // Minimum velocity before stopping
  
  // Constants for positioning (grid layout)
  private readonly CARD_SPACING = 350;
  private readonly COLUMNS = 6;
  private readonly MAX_POKEMON = 500;
  
  // Tile offsets for seamless infinite scrolling (3x3 grid of tiles)
  tileOffsets: { x: number, y: number }[] = [];
  private gridWidth = 0;
  private gridHeight = 0;

  constructor(private pokemonService: PokemonService) {}

  ngOnInit(): void {
    this.pokemonService.pokemon$
      .pipe(takeUntil(this.destroy$))
      .subscribe(pokemon => {
        this.pokemon = pokemon;
        this.applyFilters();
        this.updateTileOffsets();
        console.log('Pokemon loaded:', pokemon.length, 'items');
      });

    this.pokemonService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.loading = loading;
      });

    this.pokemonService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.error = error;
      });

    // Load all Pokemon at once for infinite canvas view
    this.loadAllPokemon();
  }
  
  private updateTileOffsets(): void {
    const totalCards = this.filteredPokemon.length;
    if (totalCards === 0) {
      this.tileOffsets = [];
      return;
    }
    
    const rows = Math.ceil(totalCards / this.COLUMNS);
    this.gridWidth = this.COLUMNS * this.CARD_SPACING;
    this.gridHeight = rows * this.CARD_SPACING;
    
    // Create 3x3 grid of tiles for seamless infinite scrolling
    this.tileOffsets = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        this.tileOffsets.push({
          x: x * this.gridWidth,
          y: y * this.gridHeight
        });
      }
    }
  }

  private loadAllPokemon(): void {
    // Load pokemon in batches until we have enough
    const loadBatch = () => {
      if (this.pokemonService.hasMorePokemon() && this.pokemon.length < this.MAX_POKEMON) {
        this.pokemonService.loadMorePokemon()
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.loadingTimeoutId = window.setTimeout(() => loadBatch(), 100);
          });
      }
    };
    
    this.pokemonService.loadPokemon().subscribe(() => {
      loadBatch();
    });
  }

  ngOnDestroy(): void {
    // Clear any pending timeout to prevent memory leaks
    if (this.loadingTimeoutId) {
      clearTimeout(this.loadingTimeoutId);
    }
    
    // Clear momentum animation
    if (this.momentumAnimation) {
      cancelAnimationFrame(this.momentumAnimation);
    }
    
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Pan and Mouse Methods
  onMouseDown(event: MouseEvent): void {
    if (event.button === 0 && !(event.target as HTMLElement).closest('.positioned-card')) {
      this.isPanning = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      
      // Stop any existing momentum
      this.velocityX = 0;
      this.velocityY = 0;
      if (this.momentumAnimation) {
        cancelAnimationFrame(this.momentumAnimation);
        this.momentumAnimation = undefined;
      }
      
      event.preventDefault();
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isPanning) {
      const deltaX = event.clientX - this.lastMouseX;
      const deltaY = event.clientY - this.lastMouseY;
      
      this.panX += deltaX;
      this.panY += deltaY;
      
      // Store velocity for momentum when released (godly.website style)
      this.velocityX = deltaX * 0.8;
      this.velocityY = deltaY * 0.8;
      
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      
      // Apply wrapping during drag
      this.wrapCoordinates();
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (this.isPanning) {
      this.isPanning = false;
      
      // Start momentum animation on release if there's significant velocity
      if (Math.abs(this.velocityX) > this.MIN_VELOCITY || 
          Math.abs(this.velocityY) > this.MIN_VELOCITY) {
        this.startMomentumScroll();
      }
    }
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    
    // Add velocity from wheel input (godly.website style smooth scrolling)
    this.velocityX += event.deltaX * 0.5;
    this.velocityY += event.deltaY * 0.5;
    
    // Start momentum animation if not already running
    if (!this.momentumAnimation) {
      this.startMomentumScroll();
    }
  }
  
  private startMomentumScroll(): void {
    const animate = () => {
      // Apply velocity to position
      this.panX -= this.velocityX;
      this.panY -= this.velocityY;
      
      // Apply friction (godly.website uses similar momentum decay)
      this.velocityX *= this.FRICTION;
      this.velocityY *= this.FRICTION;
      
      // Seamless wrapping when crossing tile boundaries
      this.wrapCoordinates();
      
      // Continue animation if velocity is significant
      if (Math.abs(this.velocityX) > this.MIN_VELOCITY || 
          Math.abs(this.velocityY) > this.MIN_VELOCITY) {
        this.momentumAnimation = requestAnimationFrame(animate);
      } else {
        // Stop animation when velocity is too low
        this.velocityX = 0;
        this.velocityY = 0;
        this.momentumAnimation = undefined;
      }
    };
    
    this.momentumAnimation = requestAnimationFrame(animate);
  }
  
  private wrapCoordinates(): void {
    if (this.gridWidth > 0) {
      // Modulo wrapping for truly infinite coordinates
      while (this.panX > this.gridWidth) {
        this.panX -= this.gridWidth;
      }
      while (this.panX < 0) {
        this.panX += this.gridWidth;
      }
    }
    
    if (this.gridHeight > 0) {
      while (this.panY > this.gridHeight) {
        this.panY -= this.gridHeight;
      }
      while (this.panY < 0) {
        this.panY += this.gridHeight;
      }
    }
  }

  getTransform(): string {
    return `translate(${this.panX}px, ${this.panY}px)`;
  }

  // Position Pokemon at specific coordinates in a grid
  getPokemonX(index: number): number {
    const col = index % this.COLUMNS;
    return col * this.CARD_SPACING + 50;
  }

  getPokemonY(index: number): number {
    const row = Math.floor(index / this.COLUMNS);
    return row * this.CARD_SPACING + 50;
  }

  trackByPokemon(index: number, pokemon: Pokemon): number {
    return pokemon.id;
  }

  getDisplayIndex(index: number): number {
    // Reset animation index every 12 items for staggered animation
    return index % 12;
  }

  onFilterChange(filter: PokemonFilterData): void {
    this.activeFilter = filter;
    
    // If generation filter is changed and not 'all', preload that generation's Pokemon
    if (filter.generation !== 'all') {
      const [minId, maxId] = GENERATION_RANGES[filter.generation];
      
      // Load Pokemon for this generation if not already loaded
      this.pokemonService.loadPokemonForGeneration(minId, maxId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.applyFilters();
        });
    } else {
      this.applyFilters();
    }
  }

  applyFilters(): void {
    let result = [...this.pokemon];

    // Filter by keyword (name or id)
    if (this.activeFilter.keyword) {
      const keyword = this.activeFilter.keyword.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(keyword) || 
        p.id.toString().includes(keyword)
      );
    }

    // Filter by types
    if (this.activeFilter.types.length > 0) {
      result = result.filter(p => 
        p.types?.some(t => this.activeFilter.types.includes(t.type.name))
      );
    }

    // Filter by generation (based on pokemon ID ranges)
    if (this.activeFilter.generation !== 'all') {
      const [min, max] = GENERATION_RANGES[this.activeFilter.generation] || [1, 1008];
      result = result.filter(p => p.id >= min && p.id <= max);
    }

    this.filteredPokemon = result;
    this.updateTileOffsets();
  }

  onPokemonClick(pokemonId: number): void {
    this.selectedPokemonId = pokemonId;
  }

  onCloseDetail(): void {
    this.selectedPokemonId = null;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }
}
