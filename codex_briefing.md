# Project: The Blondes CRM (Jade) - VTO Issue Briefing

## Status
The Virtual Try-On (VTO) is experiencing a **400 Bad Request** error on the initial `/api/vto/analyze` call. 
Additionally, there were Firebase permission errors which have been partially addressed.

## Architecture
- **Frontend**: React (Vite) + Tailwind + Framer Motion.
- **Backend**: Express server running as a Netlify Function (`netlify/functions/api.ts` -> `src/api.server.ts`).
- **Flow**:
  1. Frontend sends User Image (File) + Product Metadata to `/api/vto/analyze`.
  2. Server uses **Gemini 2.0 Flash** to analyze the person and the product, returning a descriptive prompt.
  3. Frontend sends that prompt to `/api/vto/generate`.
  4. Server uses **Flux Schnell** to generate the final image and returns the URL.

## Current Problems for Codex to solve:

### 1. The 400 Error on `/api/vto/analyze`
The server returns 400 before even starting the AI analysis.
- **Potential Cause A**: `multer` might not be parsing the fields correctly in the Netlify environment if the `FormData` ordering is wrong or if some headers are missing.
- **Potential Cause B**: The `productImageUrl` might be sent as absolute or relative, and the construction of the absolute URL on the server might be failing or resulting in an invalid fetch.
- **Potential Cause C**: Body size limits or timeout during the initial upload.

### 2. Firestore Permissions
A `permission-denied` error was seen when listening to `user_favorites/{uid}`.
- I just updated the rules to allow `read, write` if `request.auth.uid == userId`.
- Verify if the client-side `onSnapshot` listener is correctly handling unauthenticated states.

### 3. Netlify 10s Timeout
The split into two steps (Analyze + Generate) was done to stay under the 10-second limit. However, if the analysis takes too long, it still fails.
- Needs more aggressive timeouts or a queue system (if possible on Netlify).

## Files for Context:
- `src/pages/Product.tsx`: Handles the UI and the 2-step fetch.
- `src/api.server.ts`: Contains the Express routes for VTO.
- `netlify/functions/api.ts`: Entry point for the Netlify function.
- `firestore.rules`: Security rules.

## Question for Codex:
How can we make the `/api/vto/analyze` endpoint more resilient to the Netlify environment and ensure `multer` correctly captures the `productImageUrl` from the multipart body every time?
