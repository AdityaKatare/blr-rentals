import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  transpilePackages: ['@blr/core', '@blr/db'],
  serverExternalPackages: ['postgres'],
  headers: async () => [{ source: '/(.*)', headers: securityHeaders }],
};

export default nextConfig;
