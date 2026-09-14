import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@blr/core', '@blr/db'],
  serverExternalPackages: ['postgres'],
};

export default nextConfig;
