import type { NextConfig } from 'next';

const nextConfig: NextConfig = { serverExternalPackages: ['sharp', '@resvg/resvg-js', 'satori'] };

export default nextConfig;
