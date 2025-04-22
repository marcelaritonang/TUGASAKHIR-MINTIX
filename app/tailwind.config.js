module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: '#512da8',
                secondary: '#673ab7',
                dark: '#1a1a2e',
            },
            spacing: {
                '128': '32rem',
            },
            minHeight: {
                'screen-nav': 'calc(100vh - 64px)',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}