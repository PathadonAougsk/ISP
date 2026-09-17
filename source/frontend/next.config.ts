import type { NextConfig } from "next";

// Env comes from the shared source/.env one level up: docker-compose passes it to
// the container via `env_file`, so it is already in the environment by the time
// Next starts. Nothing app-specific is configured here.
const nextConfig: NextConfig = {};

export default nextConfig;
