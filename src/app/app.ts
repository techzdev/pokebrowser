import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { InfiniteCanvas } from './components/infinite-canvas/infinite-canvas';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, InfiniteCanvas],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'Pokémon Browser';
}
