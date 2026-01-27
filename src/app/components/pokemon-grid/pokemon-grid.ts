import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Subject, takeUntil } from 'rxjs';
import { PokemonService } from '../../services/pokemon.service';
import { PokemonCard } from '../pokemon-card/pokemon-card';
import { PokemonFilter } from '../pokemon-filter/pokemon-filter';
import { PokemonDetail } from '../pokemon-detail/pokemon-detail';
import { Pokemon, PokemonFilterData } from '../../models/pokemon.model';

@Component({
  selector: 'app-pokemon-grid',
  imports: [CommonModule, ScrollingModule, PokemonCard, PokemonFilter, PokemonDetail],
  templateUrl: './pokemon-grid.html',
  styleUrl: './pokemon-grid.scss'
})
export class PokemonGrid implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('loadTrigger', { static: false }) loadTrigger?: ElementRef;
  
  pokemon: Pokemon[] = [];
  filteredPokemon: Pokemon[] = [];
  loading = false;
  error: string | null = null;
  isLoadingMore = false; // Changed to public
  showSkeletons = false;
  selectedPokemonId: number | null = null;
  activeFilter: PokemonFilterData = { keyword: '', types: [], generation: 'all' };
  isSidebarOpen = false;
  private destroy$ = new Subject<void>();
  private preloadThreshold = 800; // Increased preload distance to 800px
  private isNearBottom = false;
  private intersectionObserver?: IntersectionObserver;
  private lastKnownCount = 0; // Track previous pokemon count

  constructor(private pokemonService: PokemonService) {}

  ngOnInit(): void {
    this.pokemonService.pokemon$
      .pipe(takeUntil(this.destroy$))
      .subscribe(pokemon => {
        this.pokemon = pokemon;
        this.applyFilters();
        console.log('Pokemon loaded:', pokemon.length, 'items');
        // Update lastKnownCount after new data arrives
        this.lastKnownCount = pokemon.length;
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

    // Load initial Pokemon
    this.pokemonService.loadPokemon().subscribe();
  }

  ngAfterViewInit(): void {
    // ตั้งค่า Intersection Observer สำหรับการโหลดข้อมูลแบบ lazy loading
    if (this.loadTrigger) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && 
                !this.loading && 
                !this.isLoadingMore && 
                this.pokemonService.hasMorePokemon()) {
              this.loadMorePokemon();
            }
          });
        },
        {
          rootMargin: '300px' // โหลดล่วงหน้า 300px
        }
      );
      
      this.intersectionObserver.observe(this.loadTrigger.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // ทำความสะอาด Intersection Observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(event: any): void {
    const scrollPosition = window.pageYOffset;
    const documentHeight = document.documentElement.scrollHeight;
    const windowHeight = window.innerHeight;
    const distanceFromBottom = documentHeight - (scrollPosition + windowHeight);
    
    // แสดง skeleton เมื่อใกล้ threshold (สำหรับ UX ที่ดีขึ้น)
    this.isNearBottom = distanceFromBottom <= this.preloadThreshold;
    this.showSkeletons = this.isNearBottom && this.hasMorePokemon && !this.isLoadingMore;
    
    // Fallback loading หากไม่มี Intersection Observer
    if (distanceFromBottom <= 200 && 
        !this.loading && 
        !this.isLoadingMore && 
        this.hasMorePokemon) {
      this.loadMorePokemon();
    }
  }

  private loadMorePokemon(): void {
    this.isLoadingMore = true;
    
    this.pokemonService.loadMorePokemon()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isLoadingMore = false;
          // ซ่อน skeleton หลังจากโหลดเสร็จ
          setTimeout(() => {
            this.showSkeletons = false;
          }, 200);
        },
        error: () => {
          this.isLoadingMore = false;
          this.showSkeletons = false;
        }
      });
  }

  trackByPokemon(index: number, pokemon: Pokemon): number {
    return pokemon.id;
  }

  getDisplayIndex(index: number): number {
    // Reset animation index every 12 items สำหรับ staggered animation
    return index % 12;
  }

  isRecentlyLoaded(index: number): boolean {
    // Cards ที่โหลดใหม่จะแสดงเร็วขึ้น โดยเปรียบเทียบกับ lastKnownCount
    const initialLoadCount = 24; // จำนวน cards ที่โหลดครั้งแรก
    return index >= Math.max(initialLoadCount, this.lastKnownCount - 24);
  }

  get isUsingMockData(): boolean {
    return this.pokemonService.isUsingMockData();
  }

  get hasMorePokemon(): boolean {
    return this.pokemonService.hasMorePokemon();
  }

  onFilterChange(filter: PokemonFilterData): void {
    this.activeFilter = filter;
    
    // If generation filter is changed and not 'all', preload that generation's Pokemon
    if (filter.generation !== 'all') {
      const genRanges: { [key: string]: [number, number] } = {
        '1': [1, 151],
        '2': [152, 251],
        '3': [252, 386],
        '4': [387, 493],
        '5': [494, 649],
        '6': [650, 721],
        '7': [722, 809],
        '8': [810, 905],
        '9': [906, 1008]
      };
      
      const [minId, maxId] = genRanges[filter.generation];
      
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
      const genRanges: { [key: string]: [number, number] } = {
        '1': [1, 151],
        '2': [152, 251],
        '3': [252, 386],
        '4': [387, 493],
        '5': [494, 649],
        '6': [650, 721],
        '7': [722, 809],
        '8': [810, 905],
        '9': [906, 1008]
      };
      const [min, max] = genRanges[this.activeFilter.generation] || [1, 1008];
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
