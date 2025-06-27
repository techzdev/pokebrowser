import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { Subject, takeUntil } from 'rxjs';
import { PokemonService } from '../../services/pokemon.service';
import { PokemonCard } from '../pokemon-card/pokemon-card';
import { Pokemon } from '../../models/pokemon.model';

@Component({
  selector: 'app-pokemon-grid',
  imports: [CommonModule, ScrollingModule, PokemonCard],
  templateUrl: './pokemon-grid.html',
  styleUrl: './pokemon-grid.scss'
})
export class PokemonGrid implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('loadTrigger', { static: false }) loadTrigger?: ElementRef;
  
  pokemon: Pokemon[] = [];
  loading = false;
  error: string | null = null;
  isLoadingMore = false; // เปลี่ยนเป็น public
  showSkeletons = false;
  private destroy$ = new Subject<void>();
  private preloadThreshold = 800; // เพิ่มระยะโหลดล่วงหน้าเป็น 800px
  private isNearBottom = false;
  private intersectionObserver?: IntersectionObserver;
  private lastKnownCount = 0; // ติดตามจำนวน pokemon ก่อนหน้า

  constructor(private pokemonService: PokemonService) {}

  ngOnInit(): void {
    this.pokemonService.pokemon$
      .pipe(takeUntil(this.destroy$))
      .subscribe(pokemon => {
        this.pokemon = pokemon;
        console.log('Pokemon loaded:', pokemon.length, 'items');
        // อัปเดต lastKnownCount หลังจากมีข้อมูลใหม่
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
}
