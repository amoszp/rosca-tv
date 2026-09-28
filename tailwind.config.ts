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
        /* Brand — reserved strictly for primary CTAs, AVG star, active tab */
        sun:      '#F97316',
        accent:   '#F97316',
        'accent-2': '#FB7185',

        /* Aurora Noir surface family — deep indigo-black */
        stone:       '#15132A',
        'stone-2':   '#0B0A17',
        'stone-3':   '#1C1934',
        'stone-4':   '#241F42',
        bg:          '#0B0A17',
        surface:     '#15132A',
        'surface-2': '#1C1934',
        'surface-3': '#241F42',

        /* Borders */
        border:      '#3A3363',
        'border-dim':'#262047',

        /* Text */
        primary:   '#F7F5FF',
        secondary: '#948DBE',
        muted:     '#625B87',

        /* Aurora Noir status */
        'status-pending-bg':    'rgba(245,158,11,0.18)',
        'status-pending-text':  '#FBBF60',
        'status-watching-bg':   'rgba(45,212,191,0.16)',
        'status-watching-text': '#5EEAD4',
        'status-watched-bg':    'rgba(129,140,248,0.20)',
        'status-watched-text':  '#A5B4FC',

        /* Third-party critic brand colours (exact) */
        imdb: '#F5C518',
        tmdb: '#01B4E4',
        rt:   '#FA320A',
        mc:   '#6CCE23',
      },
      borderRadius: {
        sm:   '10px',
        md:   '14px',
        lg:   '20px',
        xl:   '24px',
        '2xl':'28px',
        '3xl':'32px',
      },
      boxShadow: {
        sm:      '0 2px 10px rgba(0,0,0,0.35)',
        md:      '0 8px 28px rgba(0,0,0,0.45)',
        lg:      '0 18px 44px rgba(0,0,0,0.55)',
        overlay: '0 -12px 64px rgba(0,0,0,0.65)',
        glow:    '0 6px 24px rgba(249,115,22,0.35)',
      },
      backgroundImage: {
        'accent-grad': 'linear-gradient(135deg, #F97316 0%, #FB7185 100%)',
      },
      fontFamily: {
        sans: [
          'var(--font-outfit)',
          'Outfit',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}

export default config
