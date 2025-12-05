// tailwind configuration
// zinc/void monochromatic palette - shadow dom scoped

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,ts,svelte}'],
  corePlugins: {
    // disable preflight - prevents global reset from leaking to host page
    // custom reset.css handles shadow dom resets
    preflight: false
  },
  theme: {
    extend: {
      colors: {
        zinc: {
          950: '#09090b',
          900: '#18181b',
          800: '#27272a',
          700: '#3f3f46',
          600: '#52525b',
          500: '#71717a',
          400: '#a1a1aa',
          300: '#d4d4d8',
          200: '#e4e4e7',
          100: '#f4f4f5',
          50: '#fafafa'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      backdropBlur: {
        glass: '4px'
      }
    }
  },
  plugins: []
};
