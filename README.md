# Genshin API

A modern, type-safe TypeScript API for Genshin Impact character data.

## Features

- 🔧 **Type-safe**: Full TypeScript support with comprehensive type definitions
- 🚀 **Modern**: Built with modern JavaScript/TypeScript features
- 🛡️ **Robust**: Comprehensive linting, formatting, and quality checks
- 🔄 **Automated**: GitHub Actions for CI/CD and automated data updates
- 📱 **Static**: Served as static JSON files for maximum performance
- 🔍 **Clean**: No unused code detection with knip

## Tech Stack

- **TypeScript**: Type-safe JavaScript
- **Puppeteer**: Web scraping with Chrome automation
- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **knip**: Unused code detection
- **lefthook**: Git hooks for quality control
- **GitHub Actions**: CI/CD pipeline

## API Endpoints

- `GET /api/index.json` - Get all characters list
- `GET /api/characters/{id}.json` - Get character by ID

## Development

### Prerequisites

- Node.js 18+
- pnpm (recommended)

### Setup

```bash
# Install dependencies
pnpm install

# Run quality checks
pnpm check-all

# Build the project
pnpm build

# Run the scraper
pnpm scrape
```

### Scripts

- `pnpm dev` - Run in development mode
- `pnpm build` - Build for production
- `pnpm scrape` - Run the scraper
- `pnpm lint` - Run ESLint
- `pnpm format` - Format code with Prettier
- `pnpm type-check` - Type check with TypeScript
- `pnpm knip` - Check for unused code
- `pnpm check-all` - Run all quality checks

### Git Hooks

This project uses lefthook for git hooks:

- **pre-commit**: Runs linting, formatting, type checking, and unused code detection
- **pre-push**: Runs all quality checks
- **commit-msg**: Validates commit messages

## Data Source

Data is scraped from [ambr.top](https://ambr.top/jp/archive/avatar), a comprehensive Genshin Impact database.

## API Response Format

```typescript
interface Character {
  id: string;
  name: string;
  nameJa: string;
  element: ElementType;
  weaponType: WeaponType;
  rarity: 4 | 5;
  region: Region;
  // ... more fields
}
```

## Deployment

The project automatically deploys to GitHub Pages via GitHub Actions:

1. **Quality Check**: Runs linting, formatting, type checking, and unused code detection
2. **Scraping**: Fetches latest character data
3. **Build**: Compiles TypeScript and generates static files
4. **Deploy**: Deploys to GitHub Pages

## Legacy Migration

This project replaces the previous Python-based image generation system with a modern, lightweight TypeScript solution focused on providing clean JSON data rather than generated images.

## License

MIT
