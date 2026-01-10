# Dandori

<div align="center">
  <img src="docs/demo.png" alt="Dandori Calendar Application Demo" />
</div>

Dandori is an AI-powered calendar assistant that helps you manage your schedule through natural conversation, making calendar management effortless and intelligent.

## The Problem

Traditional calendar applications suffer from two fundamental limitations:

1. **Reactive, Not Adaptive** -> When unexpected changes happen—you're running late, a meeting goes long, or plans shift—conventional calendars can't absorb these disruptions and intelligently ripple them through the rest of your schedule. You're left manually rearranging everything yourself.
2. **Passive, Not Proactive** -> Standard calendars are merely display tools. They can't help you think through what an ideal arrangement looks like, whether you're planning your own week or coordinating with others. They wait for you to figure it out.

## The Solution

- **Conversational calendar management** -> Tell the assistant what you want in plain language and it turns intent into proposed calendar updates.
- **Human-in-the-loop approval** -> Review an explicit diff of changes and approve/decline so you stay in control.
- **Intelligent scheduling** -> Finds availability, detects conflicts, and suggests times that fit your existing calendar.

## Features

- **Calendar Views**: Day, week, month, and year views with smooth navigation
- **Drag & Drop**: Reschedule events by dragging, resize by pulling edges
- **AI Chat Panel**: Collapsible sidebar with streaming responses
- **Proposal Cards**: Visual diff of proposed changes with accept/decline actions
- **Google OAuth**: Sign in with Google for secure authentication
- **Real-time Updates**: Changes reflect immediately across the interface

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.3.4 or later
- PostgreSQL database
- Google Cloud project with OAuth credentials
- Google AI (Gemini) API key

### Installation

Clone the repository:

```bash
git clone https://github.com/your-username/dandori-ai.git
cd dandori-ai
```

Install dependencies:

```bash
bun install
```

Set up environment variables:

**Server** (`apps/server/.env`):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/dandori
BETTER_AUTH_SECRET=your-auth-secret
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
```

**Web** (`apps/web/.env`):

```env
VITE_SERVER_URL=http://localhost:3000
```

Start the database (if using Docker):

```bash
bun db:start
```

Run database migrations:

```bash
bun db:migrate
```

Start the development servers:

```bash
bun dev
```

The web application will be available at [http://localhost:3001](http://localhost:3001) and the API at [http://localhost:3000](http://localhost:3000).

### Available Scripts

| Command | Description |
| ------- | ----------- |
| `bun dev` | Start all applications in development mode |
| `bun dev:web` | Start only the web application |
| `bun dev:server` | Start only the server |
| `bun build` | Build all applications |
| `bun check-types` | Run TypeScript type checking |
| `bun check` | Run Biome linting and formatting |
| `bun db:start` | Start the PostgreSQL container |
| `bun db:migrate` | Run database migrations |
| `bun db:studio` | Open Drizzle Studio for database management |

## Project Structure

```text
dandori-ai/
├── apps/
│   ├── web/              # React frontend (TanStack Router, shadcn/ui)
│   └── server/           # Elysia backend with AI agent
│       └── modules/
│           ├── chat/     # AI chat with calendar tools
│           └── events/   # Calendar event CRUD
├── packages/
│   ├── auth/             # Better-Auth configuration
│   ├── db/               # Drizzle ORM schema & migrations
│   ├── env/              # Type-safe environment variables
│   └── config/           # Shared TypeScript configuration
```

## Deployment

Dandori is deployed using **Dokploy**, a self-hosted platform for managing containerized applications.

### Architecture

The application is split into two separate Dokploy applications:

1. **Web Application** - The React frontend, built and served as static files
2. **Server Application** - The Elysia backend API with the AI agent

### Build Process

Both applications use **Railpack** for builds, which automatically detects the project structure and creates optimized Docker images.

### Database

PostgreSQL is hosted as a separate service on Dokploy, providing persistent storage for user data, authentication, and calendar events.

### Environment Configuration

Environment variables are configured directly in Dokploy for each application:

- **Server**: Database connection, Google OAuth credentials, Gemini API key, CORS settings
- **Web**: Server URL for API communication

### Deployment Steps

1. Connect your Git repository to Dokploy
1. Create two applications: one for `apps/web`, one for `apps/server`
1. Configure environment variables for each application
1. Set up a PostgreSQL database service
1. Deploy—Railpack handles the build process automatically

The server runs migrations on startup via the `server#start` task, ensuring the database schema is always up to date.

## Tech Stack

- **Frontend**: React, TanStack Router, TailwindCSS, shadcn/ui
- **Backend**: Elysia, Bun
- **Database**: PostgreSQL, Drizzle ORM
- **AI**: Google Gemini 2.5 Pro via Vercel AI SDK
- **Auth**: Better-Auth with Google OAuth
- **Build**: Turborepo, Railpack
- **Deployment**: Dokploy
