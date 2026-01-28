import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Subject, takeUntil } from 'rxjs';
import { PokemonService } from '../../services/pokemon.service';
import { PokemonCard } from '../pokemon-card/pokemon-card';
import { PokemonFilter } from '../pokemon-filter/pokemon-filter';
import { PokemonDetail } from '../pokemon-detail/pokemon-detail';
import { Pokemon, PokemonFilterData } from '../../models/pokemon.model';
import { GENERATION_RANGES } from '../../utils/pokemon-type-utils';

@Component({
  selector: 'app-pokemon-grid',
  imports: [CommonModule, ScrollingModule, PokemonCard, PokemonFilter, PokemonDetail],
  templateUrl: './pokemon-grid.html',
  styleUrl: './pokemon-grid.scss'
})
export class PokemonGrid implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: false }) canvas?: ElementRef;
  
  pokemon: Pokemon[] = [];
  filteredPokemon: Pokemon[] = [];
  loading = false;
  error: string | null = null;
  selectedPokemonId: number | null = null;
  activeFilter: PokemonFilterData = { keyword: '', types: [], generation: 'all' };
  isSidebarOpen = false;
  
  // Pan and Zoom properties
  panX = 0;
  panY = 0;
  zoom = 1;
  isPanning = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private destroy$ = new Subject<void>();

  constructor(private pokemonService: PokemonService) {}

  ngOnInit(): void {
    this.pokemonService.pokemon$
      .pipe(takeUntil(this.destroy$))
      .subscribe(pokemon => {
        this.pokemon = pokemon;
        this.applyFilters();
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

  private loadAllPokemon(): void {
    // Load pokemon in batches until we have enough
    const loadBatch = () => {
      if (this.pokemonService.hasMorePokemon() && this.pokemon.length < 500) {
        this.pokemonService.loadMorePokemon()
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            setTimeout(() => loadBatch(), 100);
          });
      }
    };
    
    this.pokemonService.loadPokemon().subscribe(() => {
      loadBatch();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Pan and Zoom Methods
  onMouseDown(event: MouseEvent): void {
    if (event.button === 0 && !(event.target as HTMLElement).closest('.positioned-card')) {
      this.isPanning = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
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
      
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isPanning = false;
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    
    // Check if it's a pinch-to-zoom gesture (ctrlKey is set for trackpad pinch)
    if (event.ctrlKey) {
      // Zoom
      const zoomDelta = -event.deltaY * 0.001;
      const newZoom = Math.max(0.3, Math.min(3, this.zoom + zoomDelta));
      
      // Zoom towards cursor position
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const dx = x - rect.width / 2;
      const dy = y - rect.height / 2;
      
      this.panX += dx * (1 - newZoom / this.zoom);
      this.panY += dy * (1 - newZoom / this.zoom);
      this.zoom = newZoom;
    } else {
      // Pan with trackpad (2-finger scroll)
      this.panX -= event.deltaX;
      this.panY -= event.deltaY;
    }
  }

  getTransform(): string {
    return `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
  }

  zoomIn(): void {
    this.zoom = Math.min(3, this.zoom + 0.2);
  }

  zoomOut(): void {
    this.zoom = Math.max(0.3, this.zoom - 0.2);
  }

  resetZoom(): void {
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
  }

  // Position Pokemon at specific coordinates
  getPokemonX(index: number): number {
    // Create a non-linear layout pattern
    const col = index % 8;
    const row = Math.floor(index / 8);
    const baseX = col * 350;
    const offsetX = (row % 3) * 100; // Stagger every 3 rows
    return baseX + offsetX + 50;
  }

  getPokemonY(index: number): number {
    const row = Math.floor(index / 8);
    const baseY = row * 350;
    const col = index % 8;
    const offsetY = (col % 2) * 50; // Alternate columns
    return baseY + offsetY + 50;
  }

  trackByPokemon(index: number, pokemon: Pokemon): number {
    return pokemon.id;
  }

  getDisplayIndex(index: number): number {
    // Reset animation index every 12 items สำหรับ staggered animation
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
