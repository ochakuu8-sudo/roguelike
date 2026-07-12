# Shared Sprite Style Prompt

Use this prompt when generating character sprites, item icons, small props, equipment, and consumables for this game.

The target style is the high-density chibi pixel-art look established in:

- `public/assets/prototypes/reference-character-16-cast-atlas.png`
- `public/assets/prototypes/style-items-terrain-16-test-atlas.png`

Terrain, floors, walls, and full maps should use a separate map/tile prompt.

## Core Prompt

```text
Create game-ready high-density chibi pixel art for a dark cute roguelike RPG.

Match the established game style:
- compact oversized-head chibi proportions for characters
- compact readable icon silhouettes for items and props
- thick dark nearly-black outlines
- muted dungeon palette
- grayish dirty shadows
- soft blocky highlights
- visible pixel clusters
- slightly gloomy-cute handmade feel
- worn, dusty, dungeon-craft material texture

The sprite should feel hand-pixelled and low-resolution, but not tiny 32x32 pixel art.
Use a 64x64 to 96x96 sprite feel, shown enlarged with crisp pixels.

Avoid:
- smooth painting
- vector art
- glossy gradients
- realistic rendering
- photoreal material texture
- clean mobile-game icon style
- neon colors
- pure saturated toy colors
- excessive tiny details that do not read at game size

Use muted dungeon colors such as:
dark plum, dusty lavender, charcoal, warm gray, dull brown, moss green,
faded teal, rusty red, old brass, muted cream, bone ivory, desaturated blue.

Keep the visual style consistent through:
pixel density, outline weight, muted palette, blocky shading,
compact silhouette, and small-game readability.
Do not create consistency by copying the same face, hair, costume,
species parts, accessories, or expression.

Use a perfectly flat solid #FF00FF magenta background for chroma-key removal.
No shadows on the background. No text, no labels, no UI, no watermark,
no visible grid, and no borders.
```

## Character Add-On

Append this when generating playable characters, NPCs, enemies, or creature-like units.

```text
Character requirements:
Create a full-body chibi character sprite in a simple idle pose,
slightly top-down / 3/4 RPG overworld view.

Use an oversized head, tiny body, compact hands, chunky boots or feet,
and a readable face. Keep tools, bags, tails, horns, wings, weapons,
or other accessories close to the body so the character does not shrink
inside the cell.

The character should feel like they belong beside the reference demon girl
and the existing cast sheet. Match the same outline thickness,
head/body ratio, pixel density, muted shadow color, and blocky highlight style.
```

## Item Add-On

Append this when generating item icons, equipment, consumables, tools, or small props.

```text
Item and prop requirements:
Use the same outline weight, muted colors, blocky shading,
and pixel density as the character sprites, but simplify the subject
into a readable compact icon.

Do not make the item thin, tiny, glossy, realistic, or like a clean mobile-game icon.
Use a chunky silhouette, thick outline, worn material texture,
and a few clear blocky highlights.
```

## 4x4 Atlas Add-On

Append this when generating a 16-slot sheet.

```text
Create a 4x4 sprite atlas with exactly 16 equal invisible cells.
Each cell contains one separate centered sprite.
Keep every sprite fully inside its own cell with generous #FF00FF margin.
No object, weapon tip, hair, horn, wing, tail, tool, glow, or prop detail
may touch or cross a cell edge.
No visible grid lines, no labels, no numbers, no borders.
```

## Terrain Note

Do not use this prompt alone for terrain, tilemaps, floors, walls, rooms, or full maps.
Terrain needs separate constraints for tile readability, repeatability, collision shape,
walkable/non-walkable areas, and map composition.
