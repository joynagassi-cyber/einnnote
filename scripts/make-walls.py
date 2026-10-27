#!/usr/bin/env python3
"""Génère les fonds « verre » de l'application.

Pourquoi générer au lieu de télécharger : les photos libres exigent de vérifier
une licence image par image, et un dépôt public ne garantit pas la
redistribution. Un fond généré est reproductible, versionnable, léger (~3 Ko en
SVG) et n'a aucune dette de licence. Même recette = même fichier.
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "walls"

WALLS = [
    ("aurore", "#08111A", [("#1E6E7A",260,220,460),("#4B2A6B",1180,180,520),("#0E4B5C",760,820,560),("#7A3E8F",1480,760,420)], 0.05, "dark"),
    ("braise", "#140A08", [("#B4471F",320,720,520),("#5E1A16",1180,260,480),("#F08A3C",880,940,380),("#2A0E0B",1520,820,420)], 0.06, "dark"),
    ("onyx", "#0A0A0B", [("#3A3A44",420,300,520),("#1B1B22",1240,700,560),("#55555F",900,120,380),("#101014",200,900,460)], 0.04, "dark"),
    ("ocean", "#061422", [("#12496E",300,260,520),("#0B7A8C",1260,760,520),("#1F3D7A",820,900,420),("#0A2A44",1500,180,380)], 0.05, "dark"),
    ("foret", "#08130D", [("#1F5A38",360,740,520),("#0E3B2A",1220,240,500),("#2E7D4F",900,120,360),("#081C12",1540,860,420)], 0.05, "dark"),
    ("cuivre", "#150F0A", [("#8C5326",320,240,500),("#3E2A18",1240,820,540),("#C08442",860,700,380),("#1F150C",1520,140,400)], 0.06, "dark"),
    ("grenat", "#160A10", [("#7A1E3C",340,700,520),("#3B0F24",1220,260,500),("#B03A5B",940,940,360),("#1D0A12",1540,840,400)], 0.05, "dark"),
    ("nuit-encre", "#0A0B18", [("#2A2F6E",300,300,520),("#141634",1260,740,540),("#4A3A8F",880,120,380),("#0C0D22",1520,880,400)], 0.05, "dark"),
    ("glacier", "#F2F8FB", [("#CFE9F5",300,240,520),("#A9D4E8",1240,760,520),("#E6F3F9",860,900,420),("#D5EAF3",1500,160,380)], 0.03, "light"),
    ("brume", "#F4F6F8", [("#DCE4EC",340,280,520),("#C9D6E2",1220,720,520),("#EDF1F5",900,120,400),("#D2DDE8",1520,860,380)], 0.03, "light"),
    ("quartz-rose", "#FDF5F7", [("#F6D7E1",300,260,520),("#EFC2D2",1260,740,520),("#FBEBF0",880,920,400),("#F3CEDC",1520,160,380)], 0.03, "light"),
    ("lilas", "#F9F5FD", [("#E4D8F5",320,280,520),("#D3C2EE",1240,760,520),("#F2ECFA",880,110,400),("#DDCCF2",1510,860,380)], 0.03, "light"),
    ("peche", "#FFF7F2", [("#F8DCC8",300,250,520),("#F2C4A6",1250,750,520),("#FDF0E5",880,920,400),("#F6D3BA",1520,150,380)], 0.03, "light"),
    ("sauge", "#F4F8F4", [("#D8E8D8",320,260,520),("#BFD9C2",1240,760,520),("#EBF3EC",880,110,400),("#CCE0CE",1520,860,380)], 0.03, "light"),
    ("menthe", "#F1FAF6", [("#CCEEDD",300,280,520),("#A9E2CB",1250,730,520),("#E6F8F0",880,120,400),("#BDE7D4",1520,870,380)], 0.03, "light"),
    ("argile", "#F9F4EE", [("#EAD8C4",320,250,520),("#DCBFA1",1240,760,520),("#F5EBDF",880,920,400),("#E3CBB2",1520,150,380)], 0.03, "light"),
    ("sable", "#FAF7F1", [("#EFE4CE",300,270,520),("#E0CFAF",1250,740,520),("#F7F1E4",880,110,400),("#E8DABE",1520,860,380)], 0.03, "light"),
    ("ciel", "#F3F8FE", [("#D5E6FA",320,250,520),("#B4D1F2",1240,770,520),("#EAF3FD",880,120,400),("#C3D9F5",1520,150,380)], 0.03, "light"),
]

TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000" preserveAspectRatio="xMidYMid slice">
  <defs>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="140" />
    </filter>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <radialGradient id="vignette" cx="50%" cy="45%" r="72%">
      <stop offset="55%" stop-color="#000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000" stop-opacity="{vignette}" />
    </radialGradient>
  </defs>
  <rect width="1600" height="1000" fill="{base}" />
  <g filter="url(#soft)">
{blobs}
  </g>
  <rect width="1600" height="1000" filter="url(#grain)" opacity="{grain}" style="mix-blend-mode:overlay" />
  <rect width="1600" height="1000" fill="url(#vignette)" />
</svg>
"""

for wall_id, base, blobs, grain, mode in WALLS:
    shapes = "\n".join(
        f'    <circle cx="{cx}" cy="{cy}" r="{r}" fill="{color}" opacity="0.85" />'
        for color, cx, cy, r in blobs
    )
    svg = TEMPLATE.format(base=base, blobs=shapes, grain=grain,
                          vignette="0.32" if mode == "dark" else "0.12")
    (OUT / f"{wall_id}.svg").write_text(svg, encoding="utf-8")
print(f"{len(WALLS)} fonds écrits dans public/walls")
