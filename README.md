# Pokémon Browser

A modern web application built with Angular 20 that allows users to discover and explore Pokémon data in an interactive grid layout.

## Features

🎮 **Game-like Interface**
- Pokémon grid layout with staggered animations similar to Pokémon game character selection screens
- Hover effects and smooth transitions
- Beautiful gradient backgrounds and visual effects

🚀 **Performance Optimized**
- Infinite scroll loading for seamless browsing
- Lazy loading of Pokémon data
- Responsive design that works on all devices

🎨 **Visual Design**
- Color-coded type badges for each Pokémon
- High-quality Pokémon artwork from official sources  
- Animated loading states with Pokéball spinner
- Gradient card backgrounds with varied colors

📱 **Responsive Design**
- Mobile-first approach
- Adaptive grid layout
- Touch-friendly interface

## Technical Features

- **Angular 20** with standalone components
- **HTTP Client** with error handling and fallback data
- **Observable-based** state management
- **TypeScript** models for type safety
- **SCSS** for advanced styling
- **Animations** with CSS keyframes and transitions
- **PokéAPI Integration** with mock data fallback

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Development
Run the development server:
```bash
npm start
```
Navigate to `http://localhost:4200/`

### Build
Build the project:
```bash
npm run build
```

### Testing
Run tests:
```bash
npm test
```

## API Integration

The app uses the [PokéAPI](https://pokeapi.co/) to fetch Pokémon data. If the API is unavailable, the app automatically falls back to demo data to ensure functionality.

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── pokemon-card/     # Individual Pokémon card component
│   │   └── pokemon-grid/     # Main grid layout component
│   ├── models/
│   │   ├── pokemon.model.ts  # TypeScript interfaces
│   │   └── mock-data.ts      # Fallback demo data
│   ├── services/
│   │   └── pokemon.service.ts # Data fetching service
│   └── app component files
└── styles/                   # Global styles
```

## Angular CLI Information

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.0.4.

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Contributing

Feel free to contribute to this project by submitting issues or pull requests.

## License

This project is open source and available under the [MIT License](LICENSE).