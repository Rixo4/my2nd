/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          400: '#2563eb',
          500: '#1e40af',
          600: '#1e3a8a',
        },
        surface: {
          900: '#08080f',
          800: '#0d0d18',
          700: '#111120',
          600: '#16162e',
          500: '#1c1c38',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "radial-gradient(circle at 1px 1px, rgba(30,64,175,0.08) 1px, transparent 0)",
        'hero-glow': 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(30,64,175,0.15) 0%, transparent 60%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.6s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glowPulse: {
          '0%': { boxShadow: '0 0 20px rgba(30,64,175,0.2)' },
          '100%': { boxShadow: '0 0 40px rgba(30,64,175,0.5)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
