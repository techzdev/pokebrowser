import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Pokemon } from '../../models/pokemon.model';

@Component({
  selector: 'app-pokemon-card',
  standalone: true,
  imports: [NgOptimizedImage],
  templateUrl: './pokemon-card.html',
  styleUrl: './pokemon-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PokemonCard {
  @Input({ required: true }) pokemon!: Pokemon;
  @Input() isPriority = false;
}
