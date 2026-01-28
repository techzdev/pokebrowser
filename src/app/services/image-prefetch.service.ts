import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ImagePrefetchService {
  private imageCache = new Map<string, HTMLImageElement>();
  private pendingLoads = new Map<string, Promise<void>>();

  /**
   * Pre-fetch an image and store it in the cache
   */
  prefetchImage(url: string): Promise<void> {
    // Return existing promise if already loading
    if (this.pendingLoads.has(url)) {
      return this.pendingLoads.get(url)!;
    }

    // Return immediately if already cached
    if (this.imageCache.has(url)) {
      return Promise.resolve();
    }

    // Start loading the image
    const loadPromise = new Promise<void>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.imageCache.set(url, img);
        this.pendingLoads.delete(url);
        resolve();
      };
      
      img.onerror = () => {
        this.pendingLoads.delete(url);
        reject(new Error(`Failed to load image: ${url}`));
      };
      
      img.src = url;
    });

    this.pendingLoads.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Pre-fetch multiple images in parallel
   */
  prefetchImages(urls: string[]): Promise<void[]> {
    return Promise.all(urls.map(url => this.prefetchImage(url)));
  }

  /**
   * Check if an image is already cached
   */
  isCached(url: string): boolean {
    return this.imageCache.has(url);
  }

  /**
   * Clear the cache (useful for memory management)
   */
  clearCache(): void {
    this.imageCache.clear();
    this.pendingLoads.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.imageCache.size;
  }
}
