/**
 * Generates every piece of original brand artwork used by the storefront:
 * hero art, category tiles, product illustrations, placeholder, favicon and
 * social preview. All art is drawn here as SVG and rasterised with sharp —
 * no third-party or competitor imagery is used anywhere.
 *
 * Usage: npm run generate:images
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const outRoot = path.join(repoRoot, "client", "public", "img");

const RED = "#E30613";
const RED_DARK = "#B00410";
const INK = "#141414";
const CHARCOAL = "#242424";
const WHITE = "#FFFFFF";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function svgDoc(width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
}

function gradientDefs() {
  return `
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cfe6f7"/>
      <stop offset="55%" stop-color="#eaf3fa"/>
      <stop offset="100%" stop-color="#fdf3e6"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.8" cy="0.18" r="0.5">
      <stop offset="0%" stop-color="#fff4d6" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#fff4d6" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f4f4f5"/>
    </linearGradient>
    <linearGradient id="thread" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#efe7d8"/>
      <stop offset="45%" stop-color="#fdfbf6"/>
      <stop offset="100%" stop-color="#e6dcc9"/>
    </linearGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#b5773b"/>
      <stop offset="100%" stop-color="#8a5626"/>
    </linearGradient>
  </defs>`;
}

/** Classic Lahore patang: curved diamond with kinara border and tabee patch. */
function patang({ x = 0, y = 0, size = 300, body = RED, border = INK, accent = WHITE, rotate = 0, opacity = 1 }) {
  const s = size / 400;
  return `
  <g transform="translate(${x} ${y}) rotate(${rotate}) scale(${s}) translate(-200 -200)" opacity="${opacity}">
    <path d="M200 34 C158 118 96 182 34 232 C112 254 168 302 200 372 C232 302 288 254 366 232 C304 182 242 118 200 34 Z"
          fill="${body}" stroke="${border}" stroke-width="12" stroke-linejoin="round"/>
    <path d="M200 60 C164 132 110 186 58 228 C126 248 174 290 200 348 C226 290 274 248 342 228 C290 186 236 132 200 60 Z"
          fill="none" stroke="${accent}" stroke-width="7" stroke-linejoin="round" opacity="0.9"/>
    <rect x="168" y="188" width="64" height="52" rx="6" fill="${accent}" stroke="${border}" stroke-width="6"/>
    <path d="M200 34 L200 372" stroke="${border}" stroke-width="6" opacity="0.55"/>
    <path d="M60 224 C130 196 270 196 340 224" stroke="${border}" stroke-width="6" fill="none" opacity="0.35"/>
  </g>`;
}

/** Gudda: larger squarer kite with a ribbon tail. */
function gudda({ x = 0, y = 0, size = 320, body = INK, border = RED, accent = WHITE, rotate = 0, opacity = 1 }) {
  const s = size / 400;
  return `
  <g transform="translate(${x} ${y}) rotate(${rotate}) scale(${s}) translate(-200 -200)" opacity="${opacity}">
    <path d="M200 40 C136 96 84 156 44 214 C118 240 166 288 200 356 C234 288 282 240 356 214 C316 156 264 96 200 40 Z"
          fill="${body}" stroke="${border}" stroke-width="10" stroke-linejoin="round"/>
    <path d="M200 40 C176 128 176 268 200 356" stroke="${accent}" stroke-width="8" fill="none"/>
    <path d="M52 206 C140 178 260 178 348 206" stroke="${accent}" stroke-width="8" fill="none"/>
    <circle cx="200" cy="200" r="26" fill="${accent}" stroke="${border}" stroke-width="6"/>
    <path d="M200 356 C206 392 190 420 196 456 C202 486 186 502 192 526"
          stroke="${RED}" stroke-width="9" fill="none" stroke-linecap="round"/>
    <path d="M186 396 l28 14 l-30 12 z" fill="${RED}"/>
  </g>`;
}

/** Pinna: wooden spool wound with cotton dor. */
function pinna({ x = 0, y = 0, size = 320, rotate = 0, opacity = 1 }) {
  const s = size / 400;
  return `
  <g transform="translate(${x} ${y}) rotate(${rotate}) scale(${s}) translate(-200 -200)" opacity="${opacity}">
    <rect x="192" y="30" width="16" height="340" rx="8" fill="url(#wood)"/>
    <ellipse cx="200" cy="70" rx="150" ry="46" fill="url(#wood)" stroke="#6d431c" stroke-width="6"/>
    <rect x="50" y="70" width="300" height="260" fill="#efe7d8"/>
    <ellipse cx="200" cy="330" rx="150" ry="46" fill="url(#wood)" stroke="#6d431c" stroke-width="6"/>
    <rect x="50" y="70" width="300" height="260" fill="url(#thread)"/>
    ${Array.from({ length: 16 }, (_, i) => {
      const yy = 78 + i * 16;
      return `<path d="M52 ${yy} Q200 ${yy + 10} 348 ${yy - 4}" stroke="#ded2ba" stroke-width="2.4" fill="none" opacity="0.85"/>`;
    }).join("")}
    <rect x="50" y="150" width="300" height="16" fill="${RED}" opacity="0.9"/>
    <rect x="50" y="228" width="300" height="10" fill="${INK}" opacity="0.75"/>
    <ellipse cx="200" cy="70" rx="150" ry="46" fill="none" stroke="#6d431c" stroke-width="6"/>
    <rect x="186" y="14" width="28" height="60" rx="12" fill="url(#wood)" stroke="#6d431c" stroke-width="4"/>
  </g>`;
}

function gloves({ x = 0, y = 0, size = 320, rotate = 0, opacity = 1 }) {
  const s = size / 400;
  const glove = (flip) => `
    <g transform="translate(${flip ? 210 : 20} 60)${flip ? " scale(-1,1)" : ""}">
      <path d="M40 60 h120 c10 0 16 8 16 18 v90 c0 40 -18 74 -46 92 l-14 9 v55 c0 10 -8 18 -18 18 h-30 c-10 0 -18 -8 -18 -18 v-140 l-14 -20 c-8 -12 -4 -28 8 -34 z"
            fill="#1f1f1f" stroke="${RED}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M46 150 h108" stroke="${RED}" stroke-width="10" stroke-linecap="round"/>
      <path d="M60 108 v-46 M92 104 v-58 M124 108 v-46" stroke="#3a3a3a" stroke-width="7" stroke-linecap="round"/>
    </g>`;
  return `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${s}) translate(-200 -200)" opacity="${opacity}">${glove(false)}${glove(true)}</g>`;
}

function tape({ x = 0, y = 0, size = 320, rotate = 0, opacity = 1 }) {
  const s = size / 400;
  return `
  <g transform="translate(${x} ${y}) rotate(${rotate}) scale(${s}) translate(-200 -200)" opacity="${opacity}">
    <circle cx="200" cy="200" r="150" fill="#f6efe3" stroke="${CHARCOAL}" stroke-width="10"/>
    <circle cx="200" cy="200" r="140" fill="none" stroke="#e2d6bf" stroke-width="8"/>
    <circle cx="200" cy="200" r="62" fill="${WHITE}" stroke="${CHARCOAL}" stroke-width="10"/>
    <circle cx="200" cy="200" r="62" fill="${RED}" opacity="0.12"/>
    <path d="M320 148 q56 -26 66 26 q8 44 -44 58 l-52 12 z" fill="#efe4d0" stroke="${CHARCOAL}" stroke-width="8" stroke-linejoin="round"/>
    <text x="200" y="216" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="${RED}" text-anchor="middle">MLK</text>
  </g>`;
}

function bag({ x = 0, y = 0, size = 320, rotate = 0, opacity = 1 }) {
  const s = size / 400;
  return `
  <g transform="translate(${x} ${y}) rotate(${rotate}) scale(${s}) translate(-200 -200)" opacity="${opacity}">
    <path d="M110 120 q90 -80 180 0" stroke="${CHARCOAL}" stroke-width="16" fill="none" stroke-linecap="round"/>
    <rect x="52" y="118" width="296" height="220" rx="18" fill="${CHARCOAL}" stroke="${INK}" stroke-width="6"/>
    <rect x="52" y="118" width="296" height="46" rx="18" fill="${RED}"/>
    <rect x="52" y="150" width="296" height="14" fill="${RED_DARK}" opacity="0.5"/>
    ${patang({ x: 200, y: 246, size: 150, body: RED, border: INK, accent: WHITE, rotate: -12 })}
    <text x="200" y="152" font-family="Arial, sans-serif" font-size="26" font-weight="800" fill="${WHITE}" text-anchor="middle" letter-spacing="4">METRO LAHORE KITES</text>
  </g>`;
}

function kitBox({ x = 0, y = 0, size = 340, rotate = 0, opacity = 1 }) {
  const s = size / 400;
  return `
  <g transform="translate(${x} ${y}) rotate(${rotate}) scale(${s}) translate(-200 -200)" opacity="${opacity}">
    ${patang({ x: 140, y: 150, size: 170, body: RED, border: INK, accent: WHITE, rotate: -18 })}
    ${patang({ x: 240, y: 170, size: 150, body: INK, border: RED, accent: WHITE, rotate: 14 })}
    ${pinna({ x: 300, y: 270, size: 150, rotate: 24 })}
    <path d="M40 200 h320 v150 a14 14 0 0 1 -14 14 h-292 a14 14 0 0 1 -14 -14 z" fill="${CHARCOAL}"/>
    <path d="M40 200 l40 -54 h240 l40 54 z" fill="#333" stroke="${INK}" stroke-width="5"/>
    <rect x="40" y="236" width="320" height="34" fill="${RED}"/>
    <text x="200" y="262" font-family="Arial, sans-serif" font-size="24" font-weight="800" fill="${WHITE}" text-anchor="middle" letter-spacing="3">KITE &amp; DOR KIT</text>
  </g>`;
}

/* ------------------------------------------------------------------ */
/* Compositions                                                        */
/* ------------------------------------------------------------------ */

function skyline() {
  // Lahori skyline silhouette: domes, minarets and the Minar-e-Pakistan.
  return `
  <g fill="${CHARCOAL}" opacity="0.92">
    <path d="M0 900 h1800 v-40 H0 z"/>
    <!-- Badshahi-style mosque block -->
    <path d="M120 900 v-120 h250 v120 z"/>
    <path d="M170 780 q75 -110 150 0 z"/>
    <path d="M228 700 h14 v-40 h-14 z"/>
    <path d="M110 900 v-220 h26 v220 z"/><path d="M110 680 q13 -34 26 0 z"/>
    <path d="M354 900 v-220 h26 v220 z"/><path d="M354 680 q13 -34 26 0 z"/>
    <path d="M96 680 h54 l-27 -46 z"/><path d="M340 680 h54 l-27 -46 z"/>
    <!-- Minar-e-Pakistan -->
    <path d="M700 900 v-30 h20 v-70 h-8 v-90 h-6 v-120 h-6 v-140 h6 v-120 h6 v-90 h8 v70 h20 v30 h-20 v-40 h-20 v40 z" opacity="0"/>
    <path d="M694 900 q6 -210 6 -300 q0 -80 10 -140 q10 60 10 140 q0 90 6 300 z"/>
    <path d="M700 470 q4 -34 4 -56 q0 -26 6 -46 q6 20 6 46 q0 22 4 56 z"/>
    <path d="M672 620 h76 v14 h-76 z"/>
    <path d="M660 700 h100 v16 h-100 z"/>
    <!-- Modern blocks -->
    <path d="M880 900 v-240 h120 v240 z"/>
    <path d="M1030 900 v-170 h90 v170 z"/>
    <path d="M1150 900 v-300 h140 v300 z"/>
    <path d="M1320 900 v-190 h110 v190 z"/>
    <path d="M1460 900 v-260 h180 v260 z"/>
    <path d="M470 900 v-150 h130 v150 z"/>
    <path d="M1670 900 v-120 h110 v120 z"/>
  </g>
  <g fill="#ffffff" opacity="0.5">
    ${Array.from({ length: 60 }, (_, i) => {
      const col = i % 12;
      const row = Math.floor(i / 12);
      const x = 890 + col * 68;
      const y = 690 + row * 38;
      return `<rect x="${x}" y="${y}" width="16" height="12" rx="2"/>`;
    }).join("")}
  </g>`;
}

function heroComposition(width = 1800, height = 1100) {
  return svgDoc(
    width,
    height,
    `
    ${gradientDefs()}
    <rect width="${width}" height="${height}" fill="url(#sky)"/>
    <rect width="${width}" height="${height}" fill="url(#sun)"/>
    <g opacity="0.85">
      <ellipse cx="380" cy="230" rx="220" ry="46" fill="#ffffff" opacity="0.65"/>
      <ellipse cx="520" cy="270" rx="150" ry="34" fill="#ffffff" opacity="0.5"/>
      <ellipse cx="1420" cy="180" rx="240" ry="50" fill="#ffffff" opacity="0.6"/>
      <ellipse cx="1240" cy="250" rx="140" ry="30" fill="#ffffff" opacity="0.45"/>
    </g>
    ${patang({ x: 1280, y: 300, size: 340, body: RED, border: INK, accent: WHITE, rotate: -8 })}
    ${patang({ x: 1600, y: 560, size: 190, body: INK, border: RED, accent: WHITE, rotate: 14, opacity: 0.95 })}
    ${gudda({ x: 1000, y: 480, size: 300, body: "#1b4f8f", border: INK, accent: WHITE, rotate: 6, opacity: 0.96 })}
    ${patang({ x: 1480, y: 830, size: 150, body: "#f5b301", border: INK, accent: WHITE, rotate: -16, opacity: 0.9 })}
    ${patang({ x: 880, y: 220, size: 130, body: "#128a52", border: INK, accent: WHITE, rotate: 22, opacity: 0.85 })}
    <g stroke="${INK}" stroke-width="2.4" opacity="0.35" fill="none">
      <path d="M1280 470 C1200 640 1150 760 1120 1100"/>
      <path d="M1000 630 C940 780 930 900 940 1100"/>
      <path d="M1600 655 C1580 780 1590 940 1610 1100"/>
    </g>
    ${skyline()}
    <rect width="${width}" height="${height}" fill="none"/>
    `,
  );
}

function tileComposition(artSvg, { w = 900, h = 675, tint = "#f4f4f5", accent = RED } = {}) {
  return svgDoc(
    w,
    h,
    `
    ${gradientDefs()}
    <rect width="${w}" height="${h}" fill="${tint}"/>
    <circle cx="${w * 0.86}" cy="${h * 0.16}" r="${h * 0.34}" fill="${accent}" opacity="0.08"/>
    <circle cx="${w * 0.12}" cy="${h * 0.9}" r="${h * 0.28}" fill="${accent}" opacity="0.06"/>
    <g opacity="0.12" stroke="${accent}" stroke-width="3">
      ${Array.from({ length: 14 }, (_, i) => `<path d="M${-h + i * 90} ${h} L${i * 90} 0"/>`).join("")}
    </g>
    ${artSvg}
    <rect x="0" y="${h - 10}" width="${w}" height="10" fill="${accent}"/>
    `,
  );
}

function productComposition(artSvg, { w = 1000, h = 1000 } = {}) {
  return svgDoc(
    w,
    h,
    `
    ${gradientDefs()}
    <rect width="${w}" height="${h}" fill="url(#card)"/>
    <circle cx="${w / 2}" cy="${h / 2 + 30}" r="${h * 0.40}" fill="${RED}" opacity="0.06"/>
    <circle cx="${w / 2}" cy="${h / 2 + 30}" r="${h * 0.40}" fill="none" stroke="${RED}" stroke-width="4" opacity="0.18"/>
    ${artSvg}
    `,
  );
}

function placeholderComposition() {
  return svgDoc(
    800,
    800,
    `
    ${gradientDefs()}
    <rect width="800" height="800" fill="#f4f4f5"/>
    ${patang({ x: 400, y: 360, size: 360, body: "#d4d4d8", border: "#a1a1aa", accent: "#ffffff", rotate: -6, opacity: 0.9 })}
    <text x="400" y="660" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#71717a" text-anchor="middle">Image coming soon</text>
    `,
  );
}

/* ------------------------------------------------------------------ */
/* Output                                                              */
/* ------------------------------------------------------------------ */

const outputs = [
  {
    file: "hero/hero-kites.webp",
    width: 1800,
    height: 1100,
    quality: 80,
    svg: () => heroComposition(),
  },
  {
    file: "categories/patang.webp",
    width: 900,
    height: 675,
    quality: 82,
    svg: () => tileComposition(patang({ x: 450, y: 320, size: 460, body: RED, border: INK, accent: WHITE, rotate: -6 })),
  },
  {
    file: "categories/gudda.webp",
    width: 900,
    height: 675,
    quality: 82,
    svg: () => tileComposition(gudda({ x: 450, y: 320, size: 470, body: INK, border: RED, accent: WHITE, rotate: 4 }), { accent: INK }),
  },
  {
    file: "categories/kits.webp",
    width: 900,
    height: 675,
    quality: 82,
    svg: () => tileComposition(kitBox({ x: 450, y: 330, size: 540 })),
  },
  {
    file: "categories/dor.webp",
    width: 900,
    height: 675,
    quality: 82,
    svg: () => tileComposition(pinna({ x: 450, y: 330, size: 520, rotate: -18 })),
  },
  {
    file: "categories/accessories.webp",
    width: 900,
    height: 675,
    quality: 82,
    svg: () =>
      tileComposition(
        `${gloves({ x: 330, y: 330, size: 380, rotate: -8 })}${tape({ x: 590, y: 350, size: 300, rotate: 12 })}${bag({
          x: 250,
          y: 380,
          size: 260,
          rotate: -6,
        })}`,
        { accent: "#0f766e" },
      ),
  },
  {
    file: "products/patang-classic.webp",
    width: 1000,
    height: 1000,
    quality: 84,
    svg: () => productComposition(patang({ x: 500, y: 480, size: 700, body: RED, border: INK, accent: WHITE, rotate: -4 })),
  },
  {
    file: "products/patang-premium.webp",
    width: 1000,
    height: 1000,
    quality: 84,
    svg: () => productComposition(patang({ x: 500, y: 480, size: 700, body: INK, border: RED, accent: WHITE, rotate: 3 })),
  },
  {
    file: "products/gudda.webp",
    width: 1000,
    height: 1000,
    quality: 84,
    svg: () => productComposition(gudda({ x: 500, y: 460, size: 720, body: "#1b4f8f", border: INK, accent: WHITE })),
  },
  {
    file: "products/dor-pinna.webp",
    width: 1000,
    height: 1000,
    quality: 84,
    svg: () => productComposition(pinna({ x: 500, y: 500, size: 760, rotate: -14 })),
  },
  {
    file: "products/kite-dor-kit.webp",
    width: 1000,
    height: 1000,
    quality: 84,
    svg: () => productComposition(kitBox({ x: 500, y: 500, size: 820 })),
  },
  {
    file: "products/gloves.webp",
    width: 1000,
    height: 1000,
    quality: 84,
    svg: () => productComposition(gloves({ x: 500, y: 480, size: 760, rotate: -4 })),
  },
  {
    file: "products/tape.webp",
    width: 1000,
    height: 1000,
    quality: 84,
    svg: () => productComposition(tape({ x: 500, y: 480, size: 760, rotate: -6 })),
  },
  {
    file: "products/bag.webp",
    width: 1000,
    height: 1000,
    quality: 84,
    svg: () => productComposition(bag({ x: 500, y: 480, size: 780, rotate: -2 })),
  },
  {
    file: "placeholders/product-placeholder.webp",
    width: 800,
    height: 800,
    quality: 80,
    svg: () => placeholderComposition(),
  },
];

async function main() {
  // The brand logo is copied, never modified: the original stays untouched.
  const logoSource = path.join(repoRoot, "metrolahorekites.png");
  const logoDir = path.join(outRoot, "logo");
  fs.mkdirSync(logoDir, { recursive: true });
  fs.copyFileSync(logoSource, path.join(logoDir, "metrolahorekites.png"));

  // Small favicon derived from the logo (the original file is preserved).
  await sharp(logoSource).resize(96, 96).png().toFile(path.join(outRoot, "favicon.png"));

  // Social preview card.
  await sharp(Buffer.from(heroComposition(1200, 630)))
    .png()
    .toFile(path.join(outRoot, "og-image.png"));

  let count = 0;
  for (const output of outputs) {
    const target = path.join(outRoot, output.file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const svg = Buffer.from(output.svg());
    const image = sharp(svg, { density: 96 });
    if (output.file.endsWith(".webp")) {
      await image.webp({ quality: output.quality ?? 82, effort: 5 }).toFile(target);
    } else {
      await image.png({ compressionLevel: 9 }).toFile(target);
    }
    const stats = fs.statSync(target);
    if (stats.size < 1500) throw new Error(`Generated image looks empty: ${output.file}`);
    const meta = await sharp(target).metadata();
    console.log(`✓ ${output.file.padEnd(42)} ${meta.width}x${meta.height}  ${(stats.size / 1024).toFixed(0)} KB`);
    count += 1;
  }
  console.log(`\nGenerated ${count} images + logo copy + favicon + og-image in client/public/img`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
