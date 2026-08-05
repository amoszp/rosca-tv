import withPWA from 'next-pwa'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode for catching bugs early
  reactStrictMode: true,

  // Standalone output copies only the files needed to run `node server.js`
  // This is what Stage 2 of the Dockerfile consumes from .next/standalone
  output: 'standalone',

  // Allow TMDB and OMDb image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
    ],
  },

  // Suppress webpack cache warnings in Docker/CI environments
  webpack: (config, { isServer }) => {
    // Avoid watching node_modules on Linux (inotify limit issues on NAS)
    config.watchOptions = {
      poll: false,
      ignored: /node_modules/,
    }
    return config
  },
}

const withPWAConfig = withPWA({
  dest: 'public',         // Service worker output directory
  register: true,         // Auto-register the SW
  skipWaiting: true,      // Activate new SW immediately
  disable: process.env.NODE_ENV === 'development',  // No SW in dev (avoids cache issues)
  // Cache strategies
  runtimeCaching: [
    {
      // TMDB API responses
      urlPattern: /^https:\/\/api\.themoviedb\.org\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'tmdb-api-cache',
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },  // 24 h
        networkTimeoutSeconds: 10,
      },
    },
    {
      // TMDB poster images
      urlPattern: /^https:\/\/image\.tmdb\.org\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'tmdb-image-cache',
        expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },  // 30 d
      },
    },
    {
      // OMDb API responses
      urlPattern: /^https:\/\/www\.omdbapi\.com\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'omdb-api-cache',
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },  // 24 h
        networkTimeoutSeconds: 10,
      },
    },
    {
      // Next.js static assets
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static-cache',
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
  ],
})

export default withPWAConfig(nextConfig)
