/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // De pdf-bouwer draait op de server en leest lettertypes, logo's en de infobrochure van schijf.
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: {
    "/contract/**": [
      "./public/img/logo-*.png",
      "./node_modules/@fontsource/figtree/files/figtree-latin-*-normal.woff",
      "./node_modules/@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-*-normal.woff",
    ],
    "/rooster/**": [
      "./public/img/logo-*.png",
      "./node_modules/@fontsource/figtree/files/figtree-latin-*-normal.woff",
      "./node_modules/@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-*-normal.woff",
    ],
    "/portaal/**": [
      "./public/img/logo-*.png",
      "./node_modules/@fontsource/figtree/files/figtree-latin-*-normal.woff",
      "./node_modules/@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-*-normal.woff",
    ],
    "/handleiding/**": [
      "./public/img/logo-*.png",
      "./node_modules/@fontsource/figtree/files/figtree-latin-*-normal.woff",
      "./node_modules/@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-*-normal.woff",
    ],
    "/beheer/**": [
      "./public/img/logo-*.png",
      "./public/docs/*.pdf",
      "./node_modules/@fontsource/figtree/files/figtree-latin-*-normal.woff",
      "./node_modules/@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-*-normal.woff",
    ],
  },
};

export default nextConfig;
