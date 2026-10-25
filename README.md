# Kage AI

Kage is a dark-themed AI chat application with a browser frontend and Cloudflare backend.

## Frontend files

- index.html: application structure
- style.css: interface design
- app.js: chat interactions and API communication
- manifest.json: app metadata
- icon.svg: application icon
- sw.js: offline application-shell caching

## Backend files

- worker.js: authenticated API, AI chat, search, and image generation
- schema.sql: D1 database tables
- wrangler.toml: optional deployment configuration
- .gitignore: ignores local secret files

## Architecture

- GitHub Pages hosts the frontend.
- Cloudflare Workers runs the backend.
- Cloudflare D1 stores conversations and messages.
- Cloudflare Workers AI provides text and image model access.

## Setup

1. Create a Cloudflare D1 database named kage-db.
2. Execute schema.sql in the D1 SQL console.
3. Create a Cloudflare Worker named kage-api.
4. Replace the Worker starter code with worker.js.
5. Bind D1 to the Worker using the variable name DB.
6. Bind Workers AI to the Worker using the variable name AI.
7. Add a Worker secret named KAGE_ACCESS_KEY.
8. Deploy the Worker.
9. Publish the frontend through GitHub Pages.
10. Open Kage Settings and enter the Worker URL and the same access key.

## Important

AI services can have usage limits and costs. Availability depends on your account and the models enabled for your account.

Search uses Wikipedia's public search API. It is not a general-purpose web search engine.

Image generation returns a generated image in a separate browser tab. Generated images are not automatically saved in chat history.

Offline caching makes the app shell available. It does not provide offline AI inference.

Keep independent backups of important conversations. Soft deletion and browser caching are not guarantees against permanent data loss.

Add stronger authentication, request throttling, and abuse protection before making the backend available to a wider audience.
