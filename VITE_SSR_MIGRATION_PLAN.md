# Migration Plan: Client-Side Vite to Native Vite SSR

This document outlines the steps to "upgrade" the existing `lending-library-react-ts` application from a client-side SPA to a Server-Side Rendered (SSR) application, keeping Vite as the build tool.

## Phase 1: Dependencies

We need a server (Express) to handle requests and render the application HTML.

1.  **Install Server Dependencies**:
    ```bash
    npm install express compression sirv
    npm install -D @types/express @types/compression
    ```

## Phase 2: Application Entry Points

We need to split the entry point into two: one for the browser (hydration) and one for the server (rendering).

### 1. Client Entry (`src/entry-client.tsx`)
*   Clone `src/index.tsx` to `src/entry-client.tsx`.
*   Replace `createRoot(...).render(...)` with `hydrateRoot(...)`.

```tsx
import { hydrateRoot } from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

hydrateRoot(
  document.getElementById('root')!,
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

### 2. Server Entry (`src/entry-server.tsx`)
*   Create this new file. It exports a render function that the Node server will call.
*   Use `StaticRouter` instead of `BrowserRouter`.

```tsx
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import App from './App';

export function render(url: string) {
  return ReactDOMServer.renderToString(
    <React.StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </React.StrictMode>
  );
}
```

### 3. Refactor `App.tsx`
*   Remove `<Router>` (BrowserRouter) from `App.tsx` because routing context is now provided by `entry-client.tsx` (Browser) or `entry-server.tsx` (Static).
*   Ensure `App` only contains the Providers and Routes.

## Phase 3: Server Configuration

### 1. Create Server (`server.js`)
Create a `server.js` file in the project root. This file plays two roles:
*   **Dev**: Creates a Vite server in middleware mode. It intercepts requests, uses Vite to transform `src/entry-server.tsx`, and renders the HTML.
*   **Prod**: Serves the built static assets from `dist/` and renders the built server code.

**Key logic in `server.js`:**
1.  Read `index.html`.
2.  Import `render` function from `entry-server`.
3.  Inject the rendered app HTML into `<!--app-html-->` placeholder.
4.  Send response.

### 2. Update `index.html`
Add the placeholder where the React app should be injected.

```html
<div id="root"><!--app-html--></div>
<script type="module" src="/src/entry-client.tsx"></script>
<!-- Remove the old index.tsx script -->
```

## Phase 4: Build Configuration

### 1. Update `package.json`
```json
"scripts": {
  "dev": "node server.js",
  "build": "npm run build:client && npm run build:server",
  "build:client": "vite build --outDir dist/client",
  "build:server": "vite build --outDir dist/server --ssr src/entry-server.tsx",
  "serve": "cross-env NODE_ENV=production node server.js"
}
```

### 2. Data Fetching / Hydration (Handling Context)
*   **Challenge**: The current implementation uses Client-side Context with hardcoded dummy data (`AuthContext`, `BookContext`).
*   **Adaptation**: For SSR, this "just works" because the initial state matches. However, if you fetch real data, you will later need to implement **HTML Streaming** or **Initial State Injection** (sending the data in `window.__INITIAL_STATE__`).

## Phase 5: Verification

1.  Run `npm run dev`.
2.  Check View Source: logic that was previously blank in `root` should now be populated with HTML strings.
3.  Verify hydration: Buttons and interactions should work after JavaScript loads.
