/** @type {import('next').NextConfig} */
const nextConfig = {
    // Other config options...
    experimental: {
        serverActions: true
    },
    async headers() {
        return [
            {
                source: '/api/:path*',
                headers: [
                    { key: 'Access-Control-Allow-Origin', value: '*' }
                ]
            }
        ];
    },
    // Add cron configuration
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
                            value: `Bearer ${process.env.CRON_SECRET}`
                        }
                    ]
                }
            ]
        };
    }
};

module.exports = nextConfig; 