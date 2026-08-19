# Frontend

Next.js web UI for the Image Caption Platform.

## Commands

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

## Environment Variables

See repository root `.env.example`: `NEXT_PUBLIC_API_BASE_URL`.

The browser calls the backend API only; it never talks to the inference service directly.
