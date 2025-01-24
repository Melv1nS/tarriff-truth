import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  optimizeFonts: true,
  images: {
    domains: ['api.tradingeconomics.com'],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/cron/update-trade-data',
          destination: '/api/cron/update-trade-data',
          has: [
            {
              type: 'header',
              key: 'Authorization',
              value: `Bearer ${process.env.CRON_SECRET}`,
            },
          ],
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  webpack: (config) => {
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
    };
    return config;
  },
};

export default nextConfig;
