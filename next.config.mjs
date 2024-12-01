import createNextIntlPlugin from 'next-intl/plugin';


const cspHeader = `
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data:;
font-src 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
frame-src 'self' https://tomaspietravallo.com;
frame-ancestors https://tomaspietravallo.com;
`

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
export default withNextIntl({
    pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'mdx'],
	async headers() {
		return [
		{
			source: "/(.*)",
			headers: [
			{ key: 'Content-Security-Policy', value: cspHeader.replace(/\n/g, '') },
			{ key: "X-Frame-Options", value: "SAMEORIGIN" },
			]
		}
		];
	},
	devIndicators: {
		appIsrStatus: false
	}
})
