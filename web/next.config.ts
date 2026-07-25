import type { NextConfig } from "next";

const backendOrigin = process.env.BACKEND_API_URL || "http://localhost:3030";

const nextConfig: NextConfig = {
  // The production Express server this app replaces serves the public view
  // entry point at the trailing-slash path `/view/` (see index.js), and
  // every existing caller — the portal's share-link generator
  // (public/portal/js/galaxy.js), the marketing page's demo iframe
  // (public/index.html), and the ported StoryExperience's own post-finale
  // redirect — hard-codes that trailing-slash URL. Without this flag, Next's
  // default trailing-slash normalization 308-redirects `/view/` to `/view`,
  // which still works in a browser but breaks direct curl checks and risks
  // OG-tag scrapers (Messenger/Zalo link previews) that don't follow
  // redirects, defeating the purpose of the OG metadata this route exists
  // to serve.
  trailingSlash: true,
  async rewrites() {
    return [
      { source: "/galaxies/:path*", destination: `${backendOrigin}/galaxies/:path*` },
      { source: "/gallary/:path*", destination: `${backendOrigin}/gallary/:path*` },
    ];
  },
};

export default nextConfig;
