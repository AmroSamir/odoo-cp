// Middleware is not supported with static export (output: 'export').
// Auth protection is handled client-side and by the Express backend.
// This file is kept as a no-op for compatibility.

export default function middleware() {
    // no-op
}

export const config = {
    matcher: [],
}
