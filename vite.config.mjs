export default {
  // Keep Three's ES modules intact in development. This also avoids a Windows
  // junction resolution issue in esbuild's dependency scanner.
  optimizeDeps: { noDiscovery: true, include: [] },
};
