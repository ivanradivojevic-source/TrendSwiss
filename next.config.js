const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin();

const isStaticExport = process.env.STATIC_EXPORT === '1';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isStaticExport
    ? {
        output: 'export',
        trailingSlash: true,
        images: { unoptimized: true },
        ...(basePath
          ? {
              basePath,
              assetPrefix: basePath,
            }
          : {}),
      }
    : {
        images: {
          remotePatterns: [
            { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
            { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
            { protocol: 'https', hostname: 'cdn.leon.rs', pathname: '/**' },
            { protocol: 'https', hostname: 'milami.rs', pathname: '/**' },
          ],
        },
      }),
};

module.exports = withNextIntl(nextConfig);
