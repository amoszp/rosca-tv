import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Brand — reserved strictly for Save button, AVG star, active tab */
        sun:   '#FCDB32',

        /* Big Stone surface family */
        stone:       '#141D38',
        'stone-2':   '#0F162A',
        'stone-3':   '#1A2542',
        'stone-4':   '#1F2D52',
        bg:          '#0F162A',
        surface:     '#141D38',
        'surface-2': '#1A2542',
        'surface-3': '#1F2D52',

        /* Borders */
        border:      '#2A3A6A',
        'border-dim':'#1E2B50',

        /* Text */
        primary:   '#FFFFFF',
        secondary: '#8B9CC8',
        muted:     '#5E6D9A',

        /* Nordic Minimal status (reference values matching CSS vars) */
        'status-pending-bg':    'rgba(180,83,9,0.20)',
        'status-pending-text':  '#fca56a',
        'status-watching-bg':   'rgba(16,185,129,0.15)',
        'status-watching-text': '#34d399',
        'status-watched-bg':    'rgba(99,102,241,0.20)',
        'status-watched-text':  '#a5b4fc',

        /* Third-party critic brand colours (exact) */
        imdb: '#F5C518',
        tmdb: '#01B4E4',
        rt:   '#FA320A',
        mc:   '#6CCE23',
      },
      borderRadius: {
        sm:   '4px',
        md:   '8px',
        lg:   '12px',
        xl:   '16px',
        '2xl':'20px',
        '3xl':'24px',
      },
      boxShadow: {
        sm:      '0 1px 4px rgba(0,0,0,0.30)',
        md:      '0 4px 12px rgba(0,0,0,0.40)',
        lg:      '0 8px 24px rgba(0,0,0,0.50)',
        overlay: '0 16px 48px rgba(0,0,0,0.65)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'Segoe UI',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}

export default config
