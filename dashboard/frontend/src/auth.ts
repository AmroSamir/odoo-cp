// Auth is handled by the Express backend via JWT cookies.
// This file provides a no-op for compatibility with the template.
export async function auth() {
    return null
}
