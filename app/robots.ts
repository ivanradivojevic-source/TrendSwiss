import type { MetadataRoute } from 'next';

/**
 * Allow real search engines; block common scrapers/AI crawlers that burn Origin Transfer.
 * Admin/API/cart/checkout stay disallowed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/*/cart', '/*/checkout/'],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'CCBot',
          'Google-Extended',
          'Bytespider',
          'DataForSeoBot',
          'AhrefsBot',
          'SemrushBot',
          'DotBot',
          'MJ12bot',
          'PetalBot',
          'Amazonbot',
          'ClaudeBot',
          'anthropic-ai',
        ],
        disallow: '/',
      },
    ],
    host: 'https://www.trendswiss.ch',
  };
}
