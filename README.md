# Extension Foundry

> Describe an extension in plain language → get a complete Manifest V3 TypeScript/React extension as a downloadable ZIP.

Extension Foundry is a web application that transforms your extension ideas into production-ready Chrome extensions using a sophisticated 2-stage AI pipeline.

## Features

- **Natural Language Input**: Describe your extension idea in plain English
- **2-Stage AI Pipeline**:
  - Stage 1 (Prompt Architect): Refines your idea into a detailed engineering prompt
  - Stage 2 (Principal Engineer): Generates complete, production-ready code
- **Complete Output**: Get manifest.json, TypeScript/React code, tests, and documentation
- **Download as ZIP**: One-click download of your entire extension project
- **History Tracking**: Keep track of all your generated extensions
- **Privacy First**: API keys stored locally, no server-side logging

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **State Management**: Zustand
- **AI Providers**: OpenAI and Anthropic
- **Storage**: IndexedDB (local history)
- **ZIP Generation**: fflate

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key and/or Anthropic API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/extension-foundry.git
   cd extension-foundry
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file (optional):
   ```bash
   cp .env.example .env.local
   ```

   Add your API keys if you want server-side defaults:
   ```env
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### Configuration

API keys can be configured in two ways:

1. **Browser Storage** (default): Enter your API keys in the Settings page. They are stored in localStorage and never sent to the server.

2. **Environment Variables**: Set `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` in your `.env.local` file for server-side usage.

## Usage

### Basic Flow

1. **Describe Your Idea**: Go to `/builder` and describe your extension idea in plain language
2. **Review the Prompt**: The AI generates a refined engineering prompt - review and optionally edit it
3. **Build Extension**: Click "Build Extension" to generate the complete codebase
4. **Download**: Click "Download ZIP" to get your extension project

### Advanced Options

- **Extension Name**: Specify a custom name
- **Target Browsers**: Choose Chrome, Edge, and/or Firefox
- **Host Permissions**: Specify target sites
- **AI Provider**: Choose between OpenAI and Anthropic
- **Styling**: TailwindCSS, CSS Modules, or Plain CSS

## Project Structure

```
extension-foundry/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── page.tsx         # Landing page
│   │   ├── builder/         # Builder page
│   │   ├── settings/        # Settings page
│   │   ├── history/         # History page
│   │   └── api/             # API routes
│   │       ├── architect/   # Stage 1 API
│   │       └── build/       # Stage 2 API
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui components
│   │   └── builder/         # Builder-specific components
│   ├── lib/                 # Utilities
│   │   ├── prompts.ts       # AI system prompts
│   │   ├── parser.ts        # Output parsing
│   │   ├── zip.ts           # ZIP generation
│   │   ├── db.ts            # IndexedDB utilities
│   │   └── store.ts         # Zustand stores
│   └── types/               # TypeScript types
├── tests/                   # Test files
├── public/                  # Static assets
└── ...config files
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests with Vitest
- `npm run test:run` - Run tests once

## Testing

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Docker

```bash
docker build -t extension-foundry .
docker run -p 3000:3000 extension-foundry
```

## Security

- **API Keys**: Stored in browser localStorage with base64 encoding (not transmitted to server)
- **Rate Limiting**: IP-based rate limiting on API routes
- **Input Validation**: Size limits and path traversal protection
- **Minimal Permissions**: Generated extensions request only necessary permissions

## Privacy

- Extension ideas are processed by AI providers but not stored on our servers
- Generation history is stored locally in IndexedDB
- No analytics or tracking
- See Settings page for data management options

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## CI/CD Suggestions

Add these GitHub Actions workflows:

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test:run
```

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## License

MIT

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [OpenAI](https://openai.com/) and [Anthropic](https://anthropic.com/) for AI APIs
- [fflate](https://github.com/101arrowz/fflate) for ZIP generation
