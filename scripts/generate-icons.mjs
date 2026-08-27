import sharp from "sharp"
import { mkdir } from "node:fs/promises"

const BOOK_SVG = (maskable) => `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" ${maskable ? 'rx="0"' : 'rx="112"'} fill="url(#g)"/>
  <g transform="${maskable ? "translate(51.2,51.2) scale(0.8)" : ""}">
    <path d="M256 148 C216 124 160 116 112 116 L112 348 C160 348 216 356 256 380 Z" fill="#ffffff" opacity="0.95"/>
    <path d="M256 148 C296 124 352 116 400 116 L400 348 C352 348 296 356 256 380 Z" fill="#ffffff" opacity="0.75"/>
    <line x1="256" y1="148" x2="256" y2="380" stroke="#c7d2fe" stroke-width="12" stroke-linecap="round"/>
  </g>
</svg>`

const outputs = [
  { svg: BOOK_SVG(false), size: 192, file: "public/icons/icon-192.png" },
  { svg: BOOK_SVG(false), size: 512, file: "public/icons/icon-512.png" },
  { svg: BOOK_SVG(true), size: 512, file: "public/icons/icon-maskable-512.png" },
  { svg: BOOK_SVG(false), size: 180, file: "public/icons/apple-touch-icon.png" },
]

await mkdir("public/icons", { recursive: true })

for (const { svg, size, file } of outputs) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(file)
  console.log(`✓ ${file} (${size}x${size})`)
}
