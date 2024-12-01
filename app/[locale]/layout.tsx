// Fonts and metadata
import type { Metadata, Viewport } from "next";
import { Inter } from 'next/font/google'

// i18n
import { notFound } from "next/navigation";
import { routing } from '@/i18n/routing';
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";

// Global css
import "../globals.css";

export const metadata: Metadata = {
  title: "ITBA PI - Data structure visualization",
  description: "Visualization tool for the Imperative Programming (72.31) course at ITBA",
};

export const viewport: Viewport = {
	initialScale: 1,
	minimumScale: 1,
	maximumScale: 1,
	width: "device-width",
	height: "device-height",
	userScalable: false,
};

const inter = Inter({ subsets: ['latin'] });

export default async function LocaleLayout({
	children,
	params,
  }: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
  }) {
	const { locale } = await params;
	// Ensure that the incoming `locale` is valid
	if (!routing.locales.includes(locale as any)) {
	  notFound();
	}
   
	const messages = await getMessages();

	return (
		<html lang={locale}>
			<body className={`${inter.className}`}>
				<NextIntlClientProvider messages={messages}>
					{children}
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
