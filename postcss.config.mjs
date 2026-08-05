/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},   // was missing — needed for cross-browser vendor prefixes
  },
}

export default config
