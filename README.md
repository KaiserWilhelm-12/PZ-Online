<div align="center">

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 400" width="100%" height="100%">
  <defs>
    <radialGradient id="skyGlow" cx="72%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#6ca3c4" stop-opacity="0.85"/>
      <stop offset="35%" stop-color="#284863" stop-opacity="0.9"/>
      <stop offset="75%" stop-color="#0f1c29" stop-opacity="0.98"/>
      <stop offset="100%" stop-color="#060b10" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="fogBottom" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#05080c" stop-opacity="1"/>
      <stop offset="35%" stop-color="#0b151f" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#1c354a" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="bloodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8a1111"/>
      <stop offset="60%" stop-color="#520808"/>
      <stop offset="100%" stop-color="#290303" stop-opacity="0"/>
    </linearGradient>
    <filter id="grunge" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <pattern id="rainPattern" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
      <line x1="10" y1="0" x2="10" y2="25" stroke="#a6d1eb" stroke-width="0.8" stroke-opacity="0.22"/>
      <line x1="35" y1="15" x2="35" y2="48" stroke="#a6d1eb" stroke-width="0.6" stroke-opacity="0.15"/>
      <line x1="52" y1="5" x2="52" y2="30" stroke="#ffffff" stroke-width="0.7" stroke-opacity="0.18"/>
    </pattern>
  </defs>

  <rect width="1280" height="400" fill="url(#skyGlow)"/>

  <g fill="#0c1722" opacity="0.85">
    <path d="M 0,400 L 0,60 Q 160,10 340,80 L 340,400 Z"/>
    <path d="M 80,400 L 80,180 Q 170,110 260,180 L 260,400 Z" fill="#132434"/>
    <rect x="360" y="130" width="140" height="270" fill="#122333"/>
    <rect x="520" y="160" width="180" height="240" fill="#172c40"/>
    <path d="M 980,400 L 980,110 L 1280,60 L 1280,400 Z" fill="#142738"/>
  </g>

  <g stroke="#081018" fill="#081018" opacity="0.9">
    <path d="M 330,105 L 780,125 L 780,132 L 330,114 Z"/>
    <rect x="640" y="125" width="18" height="42" rx="3"/>
    <circle cx="649" cy="134" r="3" fill="#4a1515"/>
    <rect x="675" y="128" width="95" height="22" rx="2"/>
  </g>

  <g stroke="#0a131c" stroke-linecap="round" fill="none" opacity="0.85">
    <path d="M 1180,400 Q 1160,260 1120,160 T 1040,50" stroke-width="8"/>
    <path d="M 1135,210 Q 1080,170 1010,140 T 940,110" stroke-width="4"/>
    <path d="M 1150,250 Q 1200,190 1260,150" stroke-width="5"/>
    <path d="M 1100,130 Q 1060,90 1020,75" stroke-width="2.5"/>
    <path d="M 1070,165 Q 1020,155 975,165" stroke-width="2"/>
    <path d="M 1180,180 Q 1210,120 1230,70" stroke-width="3"/>
  </g>

  <g fill="#070c12">
    <path d="M 0,400 L 0,320 Q 120,290 250,330 T 520,310 T 820,325 T 1100,300 L 1280,315 L 1280,400 Z"/>
    <path d="M 90,340 L 75,270 L 65,255 L 72,252 L 80,265 L 82,245 L 89,245 L 88,265 L 96,248 L 102,251 L 94,268 L 105,258 L 109,263 L 94,278 L 105,340 Z"/>
    <circle cx="155" cy="315" r="22"/>
    <path d="M 210,345 L 225,275 L 218,255 L 224,253 L 231,268 L 236,248 L 243,250 L 238,270 L 248,255 L 253,259 L 242,277 L 230,345 Z"/>
    <circle cx="760" cy="318" r="24"/>
    <path d="M 710,340 L 690,265 L 678,248 L 684,244 L 695,260 L 698,238 L 705,239 L 703,260 L 714,244 L 720,248 L 708,268 L 728,340 Z"/>
    <path d="M 830,335 L 845,255 L 838,235 L 844,233 L 851,250 L 858,228 L 865,230 L 858,252 L 870,236 L 862,260 L 850,335 Z"/>
    <circle cx="910" cy="322" r="21"/>
    <path d="M 960,340 L 985,260 L 980,240 L 986,238 L 992,254 L 1002,235 L 1008,238 L 998,258 L 1012,245 L 1016,250 L 1000,268 L 980,340 Z"/>
    <path d="M 1060,345 L 1080,275 L 1075,255 L 1081,253 L 1086,268 L 1094,250 L 1100,253 L 1092,272 L 1104,262 L 1108,267 L 1094,282 L 1080,345 Z"/>
  </g>

  <g stroke="#4b7796" stroke-width="1.2" fill="none" opacity="0.45">
    <path d="M 698,238 L 703,260 L 714,244"/>
    <path d="M 858,228 L 858,252 L 870,236"/>
    <path d="M 1002,235 L 998,258 L 1012,245"/>
  </g>

  <rect width="1280" height="400" fill="url(#fogBottom)"/>
  <rect width="1280" height="400" fill="url(#rainPattern)"/>

  <g transform="translate(80, 115)" filter="url(#grunge)">
    <text x="115" y="38" fill="#f0f4f8" font-family="'Times New Roman', Georgia, serif" font-weight="bold" font-size="36" letter-spacing="3">project</text>
    <g transform="translate(245, -5) scale(0.85)" fill="#f0f4f8">
      <circle cx="18" cy="10" r="6"/>
      <path d="M 12,18 L 24,18 L 27,36 L 23,37 L 21,26 L 21,42 L 26,58 L 21,59 L 17,45 L 12,59 L 7,58 L 13,41 L 13,26 L 9,36 L 5,34 Z"/>
    </g>
    <text x="0" y="135" fill="#ffffff" font-family="Impact, 'Arial Narrow', 'Trebuchet MS', sans-serif" font-weight="900" font-size="112" letter-spacing="4" transform="scale(0.95, 1.15)">PZ ONLINE</text>
    <text x="455" y="152" fill="#82b7d9" font-family="'Courier New', Courier, monospace" font-weight="bold" font-size="22" letter-spacing="4">WEB PORT</text>
    <path d="M 75,172 Q 190,166 315,171 T 425,174 Q 330,181 210,178 T 75,172 Z" fill="#f0f4f8" opacity="0.9"/>
    <path d="M 250,176 Q 360,175 515,178 L 480,183 Q 340,182 250,176 Z" fill="url(#bloodGrad)"/>
  </g>

  <rect width="1280" height="400" fill="none" stroke="#04070a" stroke-width="12"/>
</svg>

**A planned browser-based port for iPad — survive together, straight from Safari.**

![Status: planning](https://img.shields.io/badge/status-planning-orange?style=for-the-badge)
![Target: iPad Safari](https://img.shields.io/badge/target-iPad%2010%20%2B%20Safari-168de2?style=for-the-badge)
![Open development](https://img.shields.io/badge/development-open-7c5cff?style=for-the-badge)

*The Knox Country outbreak. A touchscreen. Your story.*

</div>

---

## The vision

PZ Online aims to bring a **multiplayer Project Zomboid experience to the iPad as a web-based game**. The goal is to make it playable in Safari with touch-first controls, while preserving the tension, teamwork, and unpredictable survivor stories that make the game compelling.

No app or playable build exists yet. This repository is in the planning stage; the features below are design goals, not promises of what is already implemented.

> **Unofficial fan project:** PZ Online is not affiliated with or endorsed by The Indie Stone. Project Zomboid and its related marks belong to their respective owners. Any implementation and distribution must respect the rights of the original creators.

## Built for the iPad

| 👆 Touch first | 🌐 Runs in the browser | 📱 Mobile-ready |
| --- | --- | --- |
| Large, accessible controls with no keyboard requirement. | The target is Safari on iPad 10, with no native app install required. | Designed for unstable connections, reconnection, and iPad performance. |

## Multiplayer, by design

The planned experience follows a server-authoritative model: the server—not the player's device—decides important game outcomes.

```mermaid
flowchart LR
    P["🎮 Player"] -->|touch input| W["🌐 iPad Safari"]
    W <-->|validated actions and updates| S["🛡️ Authoritative game server"]
    S <--> D[("💾 Persistent world")]
    S <-->|shared world state| O["👥 Other survivors"]
```

The diagram describes the intended direction, not a finished architecture.

### Design priorities

- **Fair multiplayer:** Server-owned decisions for damage, inventory, loot, health, skills, crafting, and item ownership.
- **Reliable sessions:** Reconnection support and resilience to unstable mobile internet.
- **Safe by default:** Validate user input, protect secrets, prevent item duplication, rate-limit sensitive actions, and log administrative actions.
- **iPad performance:** Target iPad 10 Safari; use chunk streaming and object pooling where appropriate, and profile before optimizing.
- **Accessible controls:** Touch-first interactions, generous hit areas, and accessibility support.

## Roadmap

```text
PLAN                 PROTOTYPE                PLAYTEST
Define the scope  →  Build a small slice  →  Test on real iPads
```

- [x] Write down the project goals and engineering guidelines
- [ ] Define the first playable milestone
- [ ] Choose the technical architecture and project license
- [ ] Prototype touch controls and the browser game loop
- [ ] Build multiplayer and persistence in testable milestones
- [ ] Test reconnection, multiplayer edge cases, and real iPad performance

Progress will be driven by stability and verified testing—not feature count.

## Get involved

The project is early, so thoughtful feedback on scope, iPad controls, and the multiplayer experience is especially useful. Open an issue or start a discussion to share ideas.

The current engineering principles are in [`PZ Online iPad/ai_guidelines.txt`](PZ%20Online%20iPad/ai_guidelines.txt). Code contributions can follow once the initial architecture, license, and contribution workflow are established.

## Open source

Open development is the goal, but **the repository does not have a license yet**. A license is needed before others can confidently reuse, modify, or distribute the project. Choosing one and documenting the contribution process are early milestones.

---

<div align="center">

**A small screen. A big world. Nobody survives alone.**

</div>
