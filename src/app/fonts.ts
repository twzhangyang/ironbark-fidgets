import { Inter, Space_Grotesk } from "next/font/google";

const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"] });
const body = Inter({ variable: "--font-body", subsets: ["latin"] });

export const fontClasses = `${display.variable} ${body.variable} h-full antialiased`;
