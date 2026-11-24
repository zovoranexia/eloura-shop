/** Runs once when the server starts. The Node-only work lives in instrumentation-node.ts (see the comment there). */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startJobs } = await import('./instrumentation-node');
    await startJobs();
  }
}
