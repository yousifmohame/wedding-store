/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, // يمكنك ترك إعداداتك الأخرى هنا
  images: {
    domains: [
      "firebasestorage.googleapis.com",
      "localhost", // For local development
      // Add other domains as needed
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        port: "", // اترك المنفذ فارغًا إذا كان المنفذ الافتراضي (443 لـ https)
        pathname: "/wikipedia/commons/thumb/**", // كن أكثر تحديدًا إذا أردت، أو /** للسماح بأي مسار
      },
      {
        protocol: "https",
        hostname: "static-00.iconduck.com",
        port: "",
        pathname: "/assets.00/**",
      },
      // يمكنك إضافة نطاقات أخرى هنا إذا استخدمت صورًا من مصادر مختلفة
      // مثال لنطاق آخر:
      // {
      //   protocol: 'https',
      //   hostname: 'images.example.com',
      // },
    ],
  },
};

export default nextConfig;
