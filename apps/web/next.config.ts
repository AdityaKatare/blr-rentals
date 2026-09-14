import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages are consumed as TypeScript source.
  transpilePackages: ['@blr/core', '@blr/db'],
  // postgres-js must stay a native Node module on the server.
  serverExternalPackages: ['postgres'],
};

export default nextConfig;
