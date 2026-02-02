# Village Sprite Specifications
*Pokemon/Stardew Valley Style Pixel Art*

## Art Style Guidelines

- **Resolution:** 32x32 pixels per tile/character
- **Palette:** Limited 16-32 color palette per sprite
- **Style:** Japanese RPG pixel art (Pokemon Gen 3-4 / Stardew Valley hybrid)
- **Outline:** 1px dark outline on all sprites
- **Shading:** 2-3 shade variations per color
- **Animation:** 2-4 frame cycles

---

## 👥 VILLAGERS (7 Characters)

### 1. Merchant (General Store Owner)
**Appearance:**
- Friendly middle-aged man with a round belly
- Wears a green apron over brown vest
- Brown hair with slight balding
- Warm smile, rosy cheeks
- Carries a small pouch at belt

**Color Palette:** Greens, browns, cream

**Animations:**
- Idle: Slight breathing motion, occasional hand rub
- Walking (4 dir): Standard walk cycle
- Action: Showing items, counting coins

---

### 2. Baker (Bakery Owner)
**Appearance:**
- Cheerful woman with flour-dusted clothes
- White chef's hat (toque)
- Pink dress with white apron
- Curly auburn hair in a bun
- Slightly chubby, motherly figure

**Color Palette:** Whites, pinks, warm browns

**Animations:**
- Idle: Wiping hands on apron
- Walking (4 dir): Bouncy walk
- Action: Kneading, presenting bread

---

### 3. Banker (Bank Manager)
**Appearance:**
- Serious older gentleman
- Wire-rimmed glasses
- Navy blue suit with gold buttons
- Gray/silver slicked hair
- Thin, tall build
- Pocket watch chain visible

**Color Palette:** Navy, gold, gray, white

**Animations:**
- Idle: Adjusting glasses, checking watch
- Walking (4 dir): Stiff, formal gait
- Action: Counting money, stamping documents

---

### 4. Farmer (Field Tender)
**Appearance:**
- Sturdy man with sun-tanned skin
- Wide straw hat
- Blue overalls over plaid shirt
- Brown boots caked with dirt
- Strong arms, friendly face
- Sometimes carries hoe/pitchfork

**Color Palette:** Blues, browns, yellows, greens

**Animations:**
- Idle: Wiping brow, leaning on tool
- Walking (4 dir): Sturdy, grounded walk
- Action: Hoeing, watering, harvesting

---

### 5. Blacksmith (Tool Crafter)
**Appearance:**
- Muscular woman with strong arms
- Leather apron, sleeveless top
- Dark hair in practical ponytail
- Soot marks on face
- Work gloves, heavy boots
- Hammer at belt

**Color Palette:** Grays, oranges, browns, black

**Animations:**
- Idle: Arms crossed, hammer tap
- Walking (4 dir): Powerful stride
- Action: Hammering, inspecting work

---

### 6. Traveler (Wandering Storyteller)
**Appearance:**
- Mysterious hooded figure
- Flowing purple/blue cloak
- Carries wooden staff with gem
- Visible scarf, travel-worn boots
- Bag of trinkets and scrolls
- Enigmatic smile under hood

**Color Palette:** Purples, blues, gold accents

**Animations:**
- Idle: Swaying cloak, staff glow
- Walking (4 dir): Graceful, floating movement
- Action: Storytelling gestures, showing trinket

---

### 7. Elder (Village Wisdom Keeper)
**Appearance:**
- Elderly woman with kind eyes
- Long gray hair in traditional bun
- Simple but elegant kimono-style robe (blue/white)
- Walking cane with carved handle
- Slight stoop but dignified
- Prayer beads around wrist

**Color Palette:** Blues, whites, grays, subtle gold

**Animations:**
- Idle: Gentle nodding, prayer bead touch
- Walking (4 dir): Slow, deliberate steps
- Action: Blessing gesture, consulting scroll

---

## 🏠 BUILDINGS

### General Store (64x64 px)
- Warm wooden structure
- Large storefront windows with goods displayed
- Green awning with "GOODS" sign
- Barrels and crates outside
- Chimney with subtle smoke

### Bakery (64x64 px)
- Cozy stone/brick building
- Large oven visible through window
- Pink/white striped awning
- Bread basket sign
- Steam from chimney

### Bank (64x64 px)
- Imposing stone building
- Columns at entrance
- Gold coin emblem above door
- Iron-barred windows
- Grand but approachable

### Farm (96x64 px - larger)
- Rustic barn with silo
- Red wooden walls, white trim
- Hay bales outside
- Small fenced area
- Weather vane on top

### Blacksmith (64x64 px)
- Stone forge building
- Open front showing anvil
- Smoke from forge
- Tool rack outside
- Orange glow from within

### Village Hall (80x80 px - largest)
- Central civic building
- Clock tower
- Welcoming open design
- Notice board outside
- Bell in tower
- Japanese temple influences

### Houses (48x48 px - 3 variants)
1. **Cottage:** Thatched roof, cozy, garden
2. **Townhouse:** Two-story, shingled, neat
3. **Traditional:** Eastern-style curved roof

---

## 🌿 ENVIRONMENT TILES (16x16 px base)

### Grass Tiles
- **Basic grass:** 3-4 variations to avoid repetition
- **Tall grass:** Movement animation
- **Flowers in grass:** Small color accents

### Path Tiles
- **Dirt path:** Center, edges, corners (full tileset)
- **Stone path:** Cobblestone pattern
- **Wooden boardwalk:** For near water

### Trees (32x48 px)
- **Oak-style:** Round canopy, 2 variants
- **Pine:** Triangular, evergreen
- **Cherry blossom:** Pink accents (seasonal)
- Each has stump variant

### Flowers (16x16 px)
- **Tulips:** Red, yellow, pink variants
- **Daisies:** White with yellow center
- **Roses:** Small bushes
- **Wildflowers:** Mixed colorful clusters

### Water (16x16 px animated)
- **Pond edge:** Transition tiles
- **Deep water:** 2-frame shimmer animation
- **Lily pads:** Floating decoration
- **Small waterfall:** Edge piece

---

## 📋 SPRITE SHEET ORGANIZATION

```
/village/
  /villagers/
    merchant.png (sprite sheet - all poses)
    baker.png
    banker.png
    farmer.png
    blacksmith.png
    traveler.png
    elder.png
  /buildings/
    general-store.png
    bakery.png
    bank.png
    farm.png
    blacksmith-shop.png
    village-hall.png
    house-cottage.png
    house-townhouse.png
    house-traditional.png
  /environment/
    grass-tiles.png
    path-tiles.png
    trees.png
    flowers.png
    water-tiles.png
```

---

## 🎨 MASTER PALETTE

```
Background:  #8BC34A (light green)
Grass Dark:  #4CAF50
Grass Light: #C8E6C9
Path:        #8D6E63
Path Dark:   #5D4037
Wood Light:  #D7CCC8
Wood Dark:   #795548
Stone:       #9E9E9E
Stone Dark:  #616161
Water:       #42A5F5
Water Deep:  #1976D2
Skin Light:  #FFCCBC
Skin Med:    #FFAB91
Roof Red:    #E53935
Roof Blue:   #1E88E5
Accent Gold: #FFD54F
White:       #FAFAFA
Black:       #212121
```

---

*Generated for Milo Command Center - Village Project*
