import type { NextConfig } from "next";

// Env comes from the shared source/.env one level up: docker-compose passes it to
// the container via `env_file`, so it is already in the environment by the time
// Next starts. `standalone` makes `next build` emit a self-contained server
// for the production Dockerfile; it does not affect `next dev`.
const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
