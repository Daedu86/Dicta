# Dicta

Dicta is a local-first dictation trainer for practicing listening and typing. It uses browser text-to-speech and adapts practice sessions by language, input mode, pace, chunking, replay support, and learner performance.

## Features

- Browser-based dictation training
- Adaptive listening and typing practice
- Support for English, Spanish, German, French, and Portuguese
- Training modes for precision, stabilization, and challenge practice
- Local progress storage with optional hosted sync
- Admin-managed access for hosted deployments

## Tech Stack

- React
- TypeScript
- Vite
- Supabase Auth/RLS
- Vercel API routes
- Browser SpeechSynthesis

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Run checks:

```bash
npm run test
npm run build
```

## Documentation

The public README intentionally stays short. Deeper technical notes live in the internal documentation:

- [Documentation index](docs/README.md)
- [Internal project notes](docs/internal-project-notes.md)
- [Architecture](docs/architecture.md)
- [Storage architecture](docs/storage-architecture.md)
- [Listening-first architecture](docs/listening-first-architecture.md)
- [Adaptive listening brain](docs/adaptive-listening-brain.md)

## Deployment

Dicta can be deployed as a Vite app with lightweight Vercel API routes. Hosted deployments require Supabase configuration and server-side environment variables for protected services.

See [Internal project notes](docs/internal-project-notes.md) and [Architecture](docs/architecture.md) before changing deployment, authentication, storage, or adaptive-training behavior.

## License

This project is licensed under the terms of the [LICENSE](LICENSE) file.
