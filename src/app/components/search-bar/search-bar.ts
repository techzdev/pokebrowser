import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SearchService } from '../../services/search.service';

@Component({
  selector: 'app-search-bar',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="search-container">
      <div class="search-input-wrapper">
        <input 
          #searchInput
          type="text" 
          class="search-input"
          placeholder="Search Pokemon by name, type, or ID..."
          [(ngModel)]="searchTerm"
          (input)="onSearchInput($event)"
          (focus)="showSuggestions = true"
          (blur)="hideSuggestions()"
          [attr.aria-label]="'Search Pokemon'"
          autocomplete="off">
        
        <div class="search-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>
        
        <button 
          *ngIf="searchTerm" 
          class="clear-button"
          (click)="clearSearch()"
          [attr.aria-label]="'Clear search'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div 
        class="suggestions-dropdown" 
        *ngIf="showSuggestions && suggestions.length > 0">
        <div 
          *ngFor="let suggestion of suggestions; let i = index"
          class="suggestion-item"
          (mousedown)="selectSuggestion(suggestion)"
          [attr.tabindex]="0"
          [attr.aria-label]="'Select ' + suggestion">
          {{ suggestion | titlecase }}
        </div>
      </div>
    </div>
  `,
  styleUrl: './search-bar.scss'
})
export class SearchBar implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  
  searchTerm = '';
  suggestions: string[] = [];
  showSuggestions = false;
  private destroy$ = new Subject<void>();

  constructor(private searchService: SearchService) {}

  ngOnInit(): void {
    // No additional initialization needed
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    
    this.searchService.updateSearchTerm(value);
    
    // Get suggestions for autocomplete
    if (value.trim()) {
      this.searchService.getSearchSuggestions(value).pipe(
        takeUntil(this.destroy$)
      ).subscribe(suggestions => {
        this.suggestions = suggestions;
        this.showSuggestions = suggestions.length > 0;
      });
    } else {
      this.suggestions = [];
      this.showSuggestions = false;
    }
  }

  selectSuggestion(suggestion: string): void {
    this.searchTerm = suggestion;
    this.searchService.updateSearchTerm(suggestion);
    this.showSuggestions = false;
    this.suggestions = [];
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchService.reset();
    this.suggestions = [];
    this.showSuggestions = false;
    this.searchInput?.nativeElement.focus();
  }

  hideSuggestions(): void {
    // Small delay to allow click events on suggestions to fire
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }
}