<div align="center">
  <img src="public/images/favicon.svg" alt="MCP Assistant Logo" width="120" height="120">
  <h1>MCP Assistant</h1>
  <p>A Web Based MCP Client to access remote MCP's</p>
</div>

## Features

- **Server Management** - Connect, configure, and manage MCP servers
- **AI Chat Interface** - Interactive chat powered by CopilotKit
- **OAuth2 Support** - Secure authentication for MCP servers
- **Category Organization** - Organize servers with custom categories
- **Real-time Status** - Monitor server connection status
- **Tool Discovery** - Browse and interact with MCP server tools

## Tech Stack

- Next.js 15 with App Router
- React 19 & TypeScript
- Tailwind CSS 4
- shadcn/ui components
- NextAuth.js authentication
- CopilotKit for AI chat
- GraphQL API integration

## Quick Start

### Prerequisites

- Node.js 18+
- Backend API running (default: `http://localhost:8000`)

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env.local` file:

```env
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
DJANGO_API_URL=http://localhost:8000
BACKEND_URL=http://localhost:8000
```

### Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
mcp-client/
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── ui/          # shadcn/ui components
│   ├── mcp-client/  # MCP-specific components
│   └── playground/  # Chat interface components
├── hooks/           # Custom React hooks
├── types/           # TypeScript type definitions
└── lib/             # Utility functions
```

## License

MIT
