#!/usr/bin/env bun

/**
 * SEO Validation Script
 * Validates all SEO improvements from seo.md implementation checklist
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

interface ValidationResult {
  passed: boolean;
  message: string;
}

interface ValidationCheck {
  name: string;
  check: () => ValidationResult;
}

const checks: ValidationCheck[] = [
  // 1. Hugo sitemap configuration
  {
    name: "Hugo sitemap with git-based lastmod",
    check: () => {
      const config = readFileSync("hugo/hugo.toml", "utf-8");
      const hasGitInfo = config.includes("enableGitInfo = true");
      const hasSitemap = config.includes("[sitemap]");
      const hasChangefreq = config.includes('changefreq = ""');
      const hasPriority = config.includes("priority = -1");

      if (hasGitInfo && hasSitemap && hasChangefreq && hasPriority) {
        return {
          passed: true,
          message: "✅ Sitemap configured with git-based lastmod dates",
        };
      }
      return {
        passed: false,
        message: "❌ Sitemap configuration incomplete in hugo.toml",
      };
    },
  },

  // 2. BreadcrumbList schema
  {
    name: "BreadcrumbList schema partial exists",
    check: () => {
      const exists = existsSync(
        "hugo/layouts/partials/json-ld/breadcrumb.html",
      );
      if (exists) {
        const content = readFileSync(
          "hugo/layouts/partials/json-ld/breadcrumb.html",
          "utf-8",
        );
        const hasBreadcrumb = content.includes('"@type": "BreadcrumbList"');
        if (hasBreadcrumb) {
          return {
            passed: true,
            message:
              "✅ BreadcrumbList schema partial created and has correct type",
          };
        }
      }
      return {
        passed: false,
        message: "❌ BreadcrumbList schema partial missing or invalid",
      };
    },
  },

  // 3. BreadcrumbList schema included in requirements page
  {
    name: "BreadcrumbList schema included in requirements layout",
    check: () => {
      const layout = readFileSync(
        "hugo/layouts/merit-badges/requirements.html",
        "utf-8",
      );
      const includes = layout.includes('partial "json-ld/breadcrumb.html"');
      if (includes) {
        return {
          passed: true,
          message: "✅ BreadcrumbList schema included in requirements layout",
        };
      }
      return {
        passed: false,
        message: "❌ BreadcrumbList schema not included in requirements layout",
      };
    },
  },

  // 4. Course schema includes all requirements (not just first 5)
  {
    name: "Course schema includes all requirements",
    check: () => {
      const schema = readFileSync(
        "hugo/layouts/partials/json-ld/merit-badge-requirements.html",
        "utf-8",
      );
      const hasFirst5 = schema.includes("first 5");
      const hasJsonRequirements = schema.includes("$json.requirements");

      if (!hasFirst5 && hasJsonRequirements) {
        return {
          passed: true,
          message:
            "✅ Course schema includes all requirements (not limited to 5)",
        };
      }
      return {
        passed: false,
        message:
          "❌ Course schema still limited to first 5 requirements or not using all requirements",
      };
    },
  },

  // 5. Organization schema
  {
    name: "Organization schema partial exists",
    check: () => {
      const exists = existsSync(
        "hugo/layouts/partials/json-ld/organization.html",
      );
      if (exists) {
        const content = readFileSync(
          "hugo/layouts/partials/json-ld/organization.html",
          "utf-8",
        );
        const hasOrganization = content.includes('"@type": "Organization"');
        const hasName = content.includes('"name": "Merit Badge University"');
        if (hasOrganization && hasName) {
          return {
            passed: true,
            message:
              "✅ Organization schema partial created with correct structure",
          };
        }
      }
      return {
        passed: false,
        message: "❌ Organization schema partial missing or invalid",
      };
    },
  },

  // 6. Organization schema included in homepage
  {
    name: "Organization schema included in homepage",
    check: () => {
      const homepage = readFileSync("hugo/layouts/index.html", "utf-8");
      const includes = homepage.includes('partial "json-ld/organization.html"');
      if (includes) {
        return {
          passed: true,
          message: "✅ Organization schema included in homepage",
        };
      }
      return {
        passed: false,
        message: "❌ Organization schema not included in homepage",
      };
    },
  },

  // 7. robots.txt
  {
    name: "robots.txt with sitemap location",
    check: () => {
      const exists = existsSync("hugo/static/robots.txt");
      if (exists) {
        const content = readFileSync("hugo/static/robots.txt", "utf-8");
        const hasSitemap = content.includes(
          "Sitemap: https://merit-badge.university/sitemap.xml",
        );
        const allowsAll = content.includes("Allow: /");
        if (hasSitemap && allowsAll) {
          return {
            passed: true,
            message:
              "✅ robots.txt exists with sitemap location and allows crawling",
          };
        }
      }
      return {
        passed: false,
        message: "❌ robots.txt missing or incomplete",
      };
    },
  },

  // 8. CSP headers in firebase.json
  {
    name: "CSP headers in firebase.json",
    check: () => {
      const config = readFileSync("firebase.json", "utf-8");
      const hasHeaders = config.includes('"headers"');
      const hasCSP = config.includes("Content-Security-Policy");
      const hasXFrame = config.includes("X-Frame-Options");
      const hasXContent = config.includes("X-Content-Type-Options");
      const hasReferrer = config.includes("Referrer-Policy");

      if (hasHeaders && hasCSP && hasXFrame && hasXContent && hasReferrer) {
        return {
          passed: true,
          message:
            "✅ Security headers configured (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)",
        };
      }
      return {
        passed: false,
        message: "❌ Security headers incomplete in firebase.json",
      };
    },
  },

  // 9. Preconnect for scouting.org
  {
    name: "Preconnect for scouting.org",
    check: () => {
      const sitePartial = readFileSync(
        "hugo/layouts/partials/head/site.html",
        "utf-8",
      );
      const hasPreconnect = sitePartial.includes(
        'rel="preconnect" href="https://www.scouting.org"',
      );
      const hasDnsPrefetch = sitePartial.includes(
        'rel="dns-prefetch" href="https://filestore.scouting.org"',
      );

      if (hasPreconnect && hasDnsPrefetch) {
        return {
          passed: true,
          message:
            "✅ Preconnect for scouting.org and dns-prefetch for filestore configured",
        };
      }
      return {
        passed: false,
        message: "❌ Preconnect/dns-prefetch not configured in site.html",
      };
    },
  },

  // 10. hreflang tag
  {
    name: 'hreflang="en-US" tag',
    check: () => {
      const baseof = readFileSync("hugo/layouts/_default/baseof.html", "utf-8");
      const hasHreflang = baseof.includes('hreflang="en-US"');

      if (hasHreflang) {
        return {
          passed: true,
          message: '✅ hreflang="en-US" tag added to baseof.html',
        };
      }
      return {
        passed: false,
        message: '❌ hreflang="en-US" tag not found in baseof.html',
      };
    },
  },

  // 11. Content-Language meta tag
  {
    name: "content-language meta tag",
    check: () => {
      const sitePartial = readFileSync(
        "hugo/layouts/partials/head/site.html",
        "utf-8",
      );
      const hasContentLanguage = sitePartial.includes(
        'content-language" content="en-US"',
      );

      if (hasContentLanguage) {
        return {
          passed: true,
          message: '✅ content-language="en-US" meta tag added',
        };
      }
      return {
        passed: false,
        message: "❌ content-language meta tag not found",
      };
    },
  },

  // 12. Canonical tags
  {
    name: "Canonical tags with trailing slashes",
    check: () => {
      const baseof = readFileSync("hugo/layouts/_default/baseof.html", "utf-8");
      const hasCanonical = baseof.includes(
        '<link rel="canonical" href="{{ .Permalink | absURL }}" />',
      );

      if (hasCanonical) {
        return {
          passed: true,
          message:
            "✅ Canonical tag configured (Hugo's .Permalink includes trailing slashes)",
        };
      }
      return {
        passed: false,
        message: "❌ Canonical tag not found or incorrect",
      };
    },
  },

  // 13. Meta descriptions
  {
    name: "Meta descriptions for all badges",
    check: () => {
      const badgesPath = "hugo/content/merit-badges";
      const badges = readdirSync(badgesPath).filter(name => {
        const path = join(badgesPath, name);
        return statSync(path).isDirectory();
      });

      let withDescriptions = 0;
      let total = 0;

      for (const badge of badges) {
        const reqPath = join(badgesPath, badge, "requirements", "index.md");
        if (existsSync(reqPath)) {
          total++;
          const content = readFileSync(reqPath, "utf-8");
          if (/^description:/m.test(content)) {
            withDescriptions++;
          }
        }
      }

      if (total === withDescriptions && total > 0) {
        return {
          passed: true,
          message: `✅ All ${total} badges have meta descriptions`,
        };
      }
      return {
        passed: false,
        message: `❌ Only ${withDescriptions}/${total} badges have meta descriptions`,
      };
    },
  },
];

// Run all checks
console.log("🔍 Validating SEO Implementation\n");
console.log("=".repeat(70));
console.log();

let passedCount = 0;
let failedCount = 0;

for (const check of checks) {
  const result = check.check();
  console.log(`${result.message}`);

  if (result.passed) {
    passedCount++;
  } else {
    failedCount++;
  }
}

console.log();
console.log("=".repeat(70));
console.log();
console.log(`📊 Results: ${passedCount} passed, ${failedCount} failed`);
console.log();

if (failedCount === 0) {
  console.log("🎉 All SEO improvements successfully implemented!");
  process.exit(0);
} else {
  console.log("⚠️  Some checks failed. Please review the output above.");
  process.exit(1);
}
