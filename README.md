# Her Space Connect

Her Space Connect is a comprehensive web application designed to support women through various health journeys, with a particular focus on pregnancy tracking, planning, and knowledge sharing. 

## Features

- **Health & Pregnancy Tracking**: Comprehensive tracking tools for different stages.
- **Companion & Journey**: Tools to map out and navigate the pregnancy journey.
- **Knowledge Hub**: Access to curated information and resources.
- **Planning & Stage Setup**: Structured planning components.
- **Modern UI**: Built with Radix UI primitives and styled with Tailwind CSS for a beautiful, accessible experience.

## Tech Stack

This project is built using a modern, type-safe stack:

- **Framework**: [TanStack Start](https://tanstack.com/start) & [React 19](https://react.dev/)
- **Routing**: [TanStack Router](https://tanstack.com/router)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Components**: [Radix UI](https://www.radix-ui.com/) & [shadcn/ui](https://ui.shadcn.com/) patterns
- **Data Fetching**: [TanStack Query](https://tanstack.com/query)
- **Backend & Auth**: [Supabase](https://supabase.com/)
- **AI Integration**: Vercel AI SDK
- **Forms & Validation**: React Hook Form & Zod
- **Build Tool**: [Vite](https://vitejs.dev/)

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open your browser and navigate to the local development URL provided in the terminal (usually `http://localhost:5173`).

## Available Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the app for production.
- `npm run preview`: Locally preview the production build.
- `npm run lint`: Lints the codebase using ESLint.
- `npm run format`: Formats the codebase using Prettier.

## Project Structure

The application follows a standard TanStack Start structure:
- `src/components/`: Reusable UI components organized by feature (e.g., `pregnancy/`, `health/`).
- `src/routes/`: File-based routing handled by TanStack Router.
- `src/hooks/`: Custom React hooks for business logic.
- `src/lib/`: Utility functions and shared logic.
- `src/integrations/`: Third-party service integrations (like Supabase).

## License

This project is proprietary and confidential.
