import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // 建設業向けブランドカラー
      colors: {
        // プライマリ：工事現場の安全色（オレンジ）
        primary: {
          DEFAULT: '#E85D04',
          50: '#FFF3E0',
          100: '#FFE0B2',
          200: '#FFCC80',
          300: '#FFB74D',
          400: '#FFA726',
          500: '#E85D04',
          600: '#C54E03',
          700: '#A34002',
          800: '#813202',
          900: '#5E2401',
          foreground: '#FFFFFF',
        },
        // セカンダリ：コンクリート・鉄骨のグレー
        secondary: {
          DEFAULT: '#455A64',
          50: '#ECEFF1',
          100: '#CFD8DC',
          200: '#B0BEC5',
          300: '#90A4AE',
          400: '#78909C',
          500: '#607D8B',
          600: '#546E7A',
          700: '#455A64',
          800: '#37474F',
          900: '#263238',
          foreground: '#FFFFFF',
        },
        // アクセント：安全確認グリーン
        accent: {
          DEFAULT: '#2E7D32',
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#4CAF50',
          600: '#43A047',
          700: '#388E3C',
          800: '#2E7D32',
          900: '#1B5E20',
          foreground: '#FFFFFF',
        },
        // 警告：危険・注意（黄色）
        warning: {
          DEFAULT: '#F59E0B',
          foreground: '#1A1A1A',
        },
        // エラー：異常・不具合（赤）
        destructive: {
          DEFAULT: '#DC2626',
          foreground: '#FFFFFF',
        },
        // 背景・ボーダー
        background: '#F5F5F0',
        foreground: '#1A1A1A',
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#1A1A1A',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#1A1A1A',
        },
        muted: {
          DEFAULT: '#F0EFEA',
          foreground: '#6B7280',
        },
        border: '#D1D5DB',
        input: '#D1D5DB',
        ring: '#E85D04',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: [
          'Noto Sans JP',
          'Hiragino Sans',
          'Hiragino Kaku Gothic ProN',
          'Meiryo',
          'sans-serif',
        ],
      },
      fontSize: {
        // モバイルファースト：最小14px
        xs: ['14px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.6' }],
        base: ['16px', { lineHeight: '1.7' }],
        lg: ['18px', { lineHeight: '1.6' }],
        xl: ['20px', { lineHeight: '1.5' }],
        '2xl': ['24px', { lineHeight: '1.4' }],
        '3xl': ['28px', { lineHeight: '1.3' }],
        '4xl': ['32px', { lineHeight: '1.2' }],
      },
      // 最小タップターゲット44x44px
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
      spacing: {
        touch: '44px',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
