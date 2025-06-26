import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PokemonGrid } from './components/pokemon-grid/pokemon-grid';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PokemonGrid],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'Pokémon Browser';
}
