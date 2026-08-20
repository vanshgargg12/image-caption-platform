# Image Caption Platform Frontend

Functional and accessible Next.js web application for the Image Caption Platform.

---

## Technical Stack

- **Framework**: Next.js App Router (React 19, TypeScript strict mode)
- **Styling**: Tailwind CSS v4
- **State & Data Fetching**: TanStack Query (`@tanstack/react-query`)
- **Validation & Forms**: Zod, React Hook Form (`@hookform/resolvers`)
- **Testing**: Vitest, React Testing Library (`@testing-library/react`), JSDOM

---

## Page Routes

| Route | Description |
|---|---|
| `/` | **Home / Upload**: Drag-and-drop file upload, client validation, preview, SHORT mode selector, progress state, and caption result view |
| `/captions/[id]` | **Caption Details**: Direct view for loading caption request details by ID from backend |
| `/about` | **About & Model**: Model information (`Xenova/vit-gpt2-image-captioning`), ONNX pipeline details, and architecture overview |
| `/privacy` | **Privacy & Limitations**: Data privacy guarantees (no persistent image storage, preview URL revocation) and operational limitations |

---

## Environment Variables

Read from `.env.local` or environment:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

> **Note**: The frontend connects **exclusively** to the Spring Boot backend API (`/api/v1/*`). It never contacts the internal Node.js inference service directly.

---

## Key Features & Accessibility Standards (WCAG AA)

1. **Object URL Lifecycle Management**:
   - Image previews use `URL.createObjectURL(file)` and automatically revoke memory blobs via `URL.revokeObjectURL` on unmount or file reset.
2. **Keyboard Accessibility**:
   - Keyboard-operable drag-and-drop file upload zone (press `Space` or `Enter` on focusable dropzone).
   - High-contrast visible focus indicators (`focus-visible:ring-2 focus-visible:ring-blue-600`).
3. **Screen Reader Live Announcements**:
   - Status updates and loading progress announced via ARIA live regions (`aria-live="polite"`).
4. **Interactive Action Controls**:
   - **Local Caption Editing**: Edit generated text locally in a text area before export.
   - **Copy to Clipboard**: One-click copy with status notification.
   - **Download JSON**: Download JSON file containing request & caption metadata.
   - **Caption Feedback**: Submit `POSITIVE` or `NEGATIVE` ratings with optional comments to `POST /api/v1/captions/{id}/feedback`.
   - **Reduced Motion**: Full support for `prefers-reduced-motion: reduce`.

---

## Development Commands

```bash
# Install dependencies
npm install

# Start Next.js development server (http://localhost:3000)
npm run dev

# Run ESLint validation
npm run lint

# Run Vitest unit and component tests
npm run test

# Production build
npm run build
```
