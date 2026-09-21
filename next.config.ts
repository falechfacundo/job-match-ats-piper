import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native N-API addon — can't be bundled by Turbopack, must stay a real require().
  serverExternalPackages: ["@myriaddreamin/typst-ts-node-compiler"],
};

export default nextConfig;
