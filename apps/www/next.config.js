/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
      return [
        {
          source: '/test/:path*',
          destination: '/:path*',
          //has: [{ type: 'host', value: 'pay.strapex.org' }],
        },
      ];
    },
  };

module.exports = nextConfig
