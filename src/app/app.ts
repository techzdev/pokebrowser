import { Component } from '@angular/core';
import { PokemonGrid } from './components/pokemon-grid/pokemon-grid';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PokemonGrid],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
}
