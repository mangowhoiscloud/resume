import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // GitHub Pages 배포 시 basePath 설정
  // mangowhoiscloud.github.io/resume/portfolio 로 배포할 경우:
  // basePath: "/resume/portfolio",
  // assetPrefix: "/resume/portfolio",
  images: {
    unoptimized: true,
  },
  // Trailing slash for static export
  trailingSlash: true,
};

export default nextConfig;
