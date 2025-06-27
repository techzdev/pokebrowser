import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'memoize',
  pure: true
})
export class MemoizePipe implements PipeTransform {
  private cache = new Map<string, any>();

  transform<T>(value: T, fn: (value: T) => any, ...args: any[]): any {
    const cacheKey = this.createCacheKey(value, fn, args);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const result = fn(value);
    this.cache.set(cacheKey, result);
    
    // Limit cache size to prevent memory leaks
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    return result;
  }

  private createCacheKey<T>(value: T, fn: Function, args: any[]): string {
    return JSON.stringify({
      value: typeof value === 'object' && value !== null 
        ? Object.keys(value as object).reduce((acc, key) => {
            (acc as any)[key] = (value as any)[key];
            return acc;
          }, {} as any) 
        : value,
      fnName: fn.name,
      args
    });
  }
}