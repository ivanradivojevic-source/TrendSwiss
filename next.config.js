const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'cdn.leon.rs', pathname: '/**' },
      { protocol: 'https', hostname: 'milami.rs', pathname: '/**' },
    ],
  },
};

module.exports = withNextIntl(nextConfig);
