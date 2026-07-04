// ============================================================================
// environment.ts  —  the "Startup Studio" room for Virginia Ventures (Module 9)
// Built from simple shapes in the Market Harvest style: a few mesh helpers, a
// gradient sky, and soft daylight. The player stands inside a bright modern
// office: a wood floor, warm-white walls, a city-skyline window, three plan
// stations, and — at the far end — the investor panel behind a long desk.
// For "Pitch Day" the room can drop into a STAGE look: setPitchStage() dims the
// house lights, warms the sky, and lights spotlight beams on the investors.
// No 3D model files are needed; real models can be swapped in later.
// ============================================================================

import {
  Mesh,
  Group,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  ConeGeometry,
  PlaneGeometry,
  MeshLambertMaterial,
  MeshBasicMaterial,
  Color,
  CanvasTexture,
  SRGBColorSpace,
  RepeatWrapping,
  DirectionalLight,
  HemisphereLight,
  AmbientLight,
  Fog,
  BackSide,
  DoubleSide,
  Vector3,
} from "@iwsdk/core";

// ----------------------------------------------------------------------------
// PALETTE  —  the WORLD colors (warm and naturalistic). The cream/navy/gold of
// the panels is reserved for signs and UI, so the buildings feel like a place.
// ----------------------------------------------------------------------------
export const PALETTE = {
  grass: "#7db84e",
  road: "#9a9488",
  sidewalk: "#cfc7b5",
  homeWall: "#f1d49a",
  homeRoof: "#c2593f",
  bankWall: "#d8d2c4",
  bankRoof: "#7a8a93",
  bankTrim: "#b9b1a0",
  storeWall: "#e7b27a",
  storeRoof: "#7b4a2c",
  awningA: "#c0432f",
  awningB: "#f3e9d2",
  wood: "#8b5e3c",
  woodDark: "#5b3a21",
  trunk: "#6e4a2c",
  leaf: "#4e8f3a",
  hedge: "#3f7a34", // the boundary hedge that fences the plaza in
  lamp: "#ffd98a",
  skyTop: "#3f8fd6",
  skyMid: "#8ec4ea",
  horizon: "#dceefb",
  sun: "#fff2d4",
  piggy: "#f59ab6",
  shopFloor: "#b98a52",
  shopWall: "#efe2c6",
  shopTrim: "#8b5e3c",
  // Warm bakery reskin: cream-and-rose palette, warm wood trim, checker floor.
  wallCream: "#f6e8cb",
  wainscot: "#e3a9a2",
  floorLight: "#efe0bf",
  floorDark: "#cf9a63",
  woodWarm: "#a9763f",
  woodDark2: "#7a4f2a",
  caseGlass: "#dff0f4",
  accentRose: "#d98a8f",
  // Bakery treats: crusts, frostings, and fillings for the case and shelf.
  breadCrust: "#c98a3e",
  breadDark: "#a5662a",
  frostPink: "#f3b6c4",
  frostCream: "#f7ecd0",
  cherryRed: "#c2402f",
  chocolate: "#5b3a24",
  glass: "#bcd8ec",
  counterTop: "#6b4a2e",
  register: "#3a4654",
  productA: "#d2452f",
  productB: "#e7b84a",
  productC: "#3a7bd5",
  teal: "#0E7C7B",
  // Ms. Delia, the baker: dress, apron, skin, hair, hat, and a touch of cheek.
  dressBlue: "#6f86a6",
  apronCream: "#f5ecd6",
  skinTone: "#e6b48f",
  hairBrown: "#5b3a24",
  hatWhite: "#f7f3ea",
  cheekPink: "#e8a0a0",
  // Surf shop reskin: sandy checker floor, ocean-blue walls, and Mr. Reyes.
  surfSand1: "#e6d2a6",
  surfSand2: "#cdb27e",
  surfWall: "#86c1da",
  surfWainscot: "#3f8aa6",
  boardRed: "#d2452f",
  boardYellow: "#e7b84a",
  boardTeal: "#27a3a3",
  reyesShirt: "#1f8fb0",
  reyesShorts: "#3a5f8a",
  reyesSkin: "#c8895a",
  reyesHair: "#3a2a20",
  reyesCap: "#16465c",
  // Repair shop reskin: cool gray checker floor, slate-blue walls, and Mr. Okafor.
  repairFloor1: "#cdd3d8",
  repairFloor2: "#a7b0b8",
  repairWall: "#bcc7cf",
  repairWainscot: "#46708c",
  okaforSkirt: "#46505a",
  okaforSmock: "#2f7d8a",
  okaforApron: "#e3e9ec",
  okaforSkin: "#7a4f33",
  okaforHair: "#1f1a18",
};

// Held so a per-shop reskin can repaint them after the shell is built: the floor
// checker texture and the solid wall / wainscot colors. Captured as the shell
// builds; left untouched for the bakery, recolored for surf.
let _floorMat: MeshLambertMaterial | null = null;
let _wallMats: MeshLambertMaterial[] = [];
let _wainscotMats: MeshLambertMaterial[] = [];

const SIGN_CREAM = "#f3e9d2"; // sign background (matches the panel cream)
const SIGN_NAVY = "#1F3A5F";  // sign text (matches the panel navy)

// ============================================================================
// MODULE 9 — STUDIO ROOM SHELL  (the bright, airy modern-office look)
// ----------------------------------------------------------------------------
// THE ONE PLACE TO TUNE THE ROOM. Only the room shell reads these — the three
// stations, the plan board, the investors, the host, the judges' desk, the
// pitch and the scoring are all untouched. Everything below is built from 3D
// primitives + materials (never DOM); the shell is static, so it adds no motion.
// ============================================================================
const STUDIO = {
  // --- ROOM SIZE -----------------------------------------------------------
  // Wall + ceiling height, in metres. Raised from the old 3 m so the space feels
  // open and airy, and so the flat ceiling clears the plan board (its top sits
  // at ~3.7 m). The walls are rebuilt to this height; the ceiling sits on top.
  ROOM_HEIGHT: 4.0,
  WIDTH: 11, // interior width  (x: -5.5 .. 5.5) — matches the floor and walls
  DEPTH: 16, // interior depth  (z: -8 .. 8)

  // --- SURFACE COLORS ------------------------------------------------------
  WALL_COLOR:          "#f8f5ef", // WALLS: a clean warm white — light and bright
  BASEBOARD_COLOR:     "#ece5d8", // the low wall band (dado): a subtle soft greige
  CEILING_COLOR:       "#f7f4ec", // CEILING: a soft warm white (unlit, so it stays evenly bright)
  CEILING_PANEL_COLOR: "#fffaf0", // recessed light panels: a brighter warm white that reads as a glowing inset
  FLOOR_WOOD_BASE:     "#e7d2a6", // FLOOR: a light blonde wood tone — warm but bright
  FLOOR_WOOD_SEAM:     "#d2b582", // floor plank seams / faint grain (a slightly deeper blonde)
  FLOOR_PLANK_REPEAT:  [4, 10],   // how many plank tiles across (x) and down (z) the floor

  // --- PENDANT COLORS ------------------------------------------------------
  PENDANT_CORD_COLOR:  "#3d3a34", // the thin hanging cord
  PENDANT_SHADE_COLOR: "#e7dcc4", // the small shade
  PENDANT_GLOW_COLOR:  "#ffdca6", // the soft warm emissive glow under each shade (unlit — always glowing)

  // --- LIGHTING  (raise overall brightness; keep it even, no dark corners) ---
  // Soft AMBIENT fill — the main "even, no dark corners" light. It lights every
  // surface equally regardless of direction, so nothing falls into shadow.
  AMBIENT_COLOR:     "#fff7ea",
  AMBIENT_INTENSITY: 0.85,
  // A gentle top-down wash so the room reads as lit from the ceiling: a warm
  // white pours down, a soft floor-bounce tint comes back up.
  CEILING_FILL_SKY:       "#fff6ec",
  CEILING_FILL_GROUND:    "#e2d2b4",
  CEILING_FILL_INTENSITY: 0.5,
  // (Warm daylight from the sun + sky still spills through the storefront window;
  //  that outdoor light is set by STAGE_LOOKS.lobby — sunI 1.7 / hemiI 1.05.)

  // --- RECESSED CEILING PANELS --------------------------------------------
  // Flat emissive rectangles set just under the ceiling, facing down. A front
  // row (over the judges' panel) and a back row (over the entrance); the three
  // pendants light the middle, over the station row at z 0.  {x, z, w, d} metres.
  CEILING_PANELS: [
    { x: -3.4, z: -5, w: 1.8, d: 1.1 },
    { x:  0.0, z: -5, w: 1.8, d: 1.1 },
    { x:  3.4, z: -5, w: 1.8, d: 1.1 },
    { x: -3.4, z:  5, w: 1.8, d: 1.1 },
    { x:  0.0, z:  5, w: 1.8, d: 1.1 },
    { x:  3.4, z:  5, w: 1.8, d: 1.1 },
  ],
  CEILING_PANEL_INSET: 0.02, // how far below the ceiling the panels sit

  // --- PENDANT LIGHTS  (one over each plan station) ------------------------
  // x/z of each pendant — placed over Product / Price / Marketing (station spots
  // at z 0). Each is a thin cord from the ceiling to a small shade with a glow.
  PENDANT_XZ: [
    { x: -3.5, z: 0 }, // over Product
    { x:  0.0, z: 0 }, // over Price
    { x:  3.5, z: 0 }, // over Marketing
  ],
  PENDANT_SHADE_Y:     2.45, // world-y of each shade's center (sits well above the station labels at y 1.7)
  PENDANT_SHADE_RTOP:  0.05, // shade radius at the top (narrow)
  PENDANT_SHADE_RBOT:  0.13, // shade radius at the bottom (wider)
  PENDANT_SHADE_H:     0.18, // shade height
  PENDANT_CORD_RADIUS: 0.018, // the slim cord's radius
  PENDANT_GLOW_RADIUS: 0.06, // the warm glow sphere's radius

  // --- SKYLINE WINDOW  (the hero feature on the far wall) ------------------
  // The far wall behind the investors (z -8) is a floor-to-ceiling window onto a
  // hazy daytime city skyline. The plan board (z -7.8) stays in front of it,
  // untouched. ONE pale-blue, mostly see-through glass panel fills the opening
  // (a single transparent surface, so it stays smooth on the headset).
  WINDOW_Z:        -8,        // the far-wall plane the glass sits on
  WINDOW_WIDTH:    10.4,      // glass width (leaves the side walls at x ±5.5)
  WINDOW_HEIGHT:   4.0,       // floor-to-ceiling (matches ROOM_HEIGHT)
  GLASS_COLOR:     "#cfe6f5", // a pale blue glass tint
  GLASS_OPACITY:   0.16,      // how solid the glass reads (0 = invisible, 1 = opaque) — mostly see-through
  // Thin white frame bars dividing the glass into clean panes, modern-office style.
  FRAME_COLOR:       "#ffffff",
  FRAME_BAR:         0.07,    // bar thickness (the slim dimension)
  FRAME_DEPTH:       0.08,    // how far each bar stands off the glass, toward the room
  FRAME_STANDOFF:    0.06,    // gap from the glass plane to the frame (keeps it in front of the glass, behind the board)
  FRAME_VERTICALS:   [-3.45, -1.15, 1.15, 3.45], // x of each vertical mullion
  FRAME_HORIZONTALS: [1.35, 2.75],               // y of each horizontal mullion

  // --- THE CITY SKYLINE behind the glass ----------------------------------
  // A bright light-blue sky plane, then simple boxes for buildings — lighter =
  // farther, so haze reads as distance. SKYLINE_SKY_Z is the skyline depth.
  SKYLINE_SKY_COLOR:    "#bfe0fb", // the bright daytime sky plane
  SKYLINE_SKY_Z:        -24,       // how far back the sky plane sits (skyline depth)
  SKYLINE_WINDOW_COLOR: "#eaf4ff", // the small soft emissive "lit window" squares
  // Buildings: {x, w (width), h (height), z (set-back, negative), c (hazy color)}.
  SKYLINE_BUILDINGS: [
    { x: -8.5, w: 3.0, h: 7.0,  z: -16, c: "#a6bccd" },
    { x: -5.6, w: 2.4, h: 10.5, z: -19, c: "#bccedb" },
    { x: -3.3, w: 2.2, h: 5.0,  z: -14, c: "#94adc1" },
    { x: -1.0, w: 2.8, h: 8.5,  z: -17, c: "#aabfd0" },
    { x:  1.3, w: 2.2, h: 6.0,  z: -14, c: "#9bb3c6" },
    { x:  3.4, w: 2.6, h: 11.0, z: -20, c: "#c2d2de" },
    { x:  5.8, w: 2.4, h: 7.5,  z: -16, c: "#a6bccd" },
    { x:  8.4, w: 3.2, h: 9.0,  z: -18, c: "#b4c6d5" },
  ],
  SKYLINE_BUILDING_DEPTH: 2.5, // each building's z-thickness
};

// ============================================================================
// MODULE 9 — STUDIO FURNITURE  (additive "lived-in office" decor)
// ----------------------------------------------------------------------------
// THE ONE PLACE TO NUDGE THE DECOR. All of this is decoration only — none of it
// is collision, and none of it touches the stations, plan board, investors,
// host, desk, pitch or scoring. Everything is tucked against the side walls and
// into the corners so the central walkway (spawn z 7 → stations z 0 → investors
// z -6.5) and the view of the window stay clear. Built from simple primitives.
// Room is x -5.5..5.5, z -8..8; stations sit at z 0; the host at (-3, 2.5).
// ============================================================================
const FURNISH = {
  // --- LOUNGE  (back-left, by the entrance + host; never crosses the walkway) --
  RUG_COLOR: "#3c8a85",             // a soft muted-teal accent rug
  RUG_POS:   { x: -4.0, z: 5.2 },   // center (x, z)
  RUG_SIZE:  { w: 2.7, d: 2.6 },    // x by z (sits between the left wall and the corridor)
  RUG_THICK: 0.03,

  SOFA_COLOR:  "#b8bdc4",           // soft grey — low + modern; back to the left wall, seat faces +x (into the room)
  SOFA_POS:    { x: -4.75, z: 5.2 },// center (x, z)
  SOFA_LEN:    2.2,                 // length along z
  SOFA_DEPTH:  0.9,                 // depth along x
  SOFA_SEAT_H: 0.42,                // seat-top height
  SOFA_BACK_H: 0.55,                // backrest height above the seat
  SOFA_ARM_H:  0.3,                 // armrest height above the seat

  TABLE_COLOR: "#7c8087",           // small modern coffee table (cool grey)
  TABLE_POS:   { x: -3.5, z: 5.2 }, // in front of the sofa
  TABLE_SIZE:  { w: 0.62, d: 1.1, h: 0.4 }, // x, z, height

  // --- PLANTS  (a pot + a cluster of green blobs) — corners + beside the lounge -
  POT_COLOR: "#c7a06a",             // warm light planter
  FOLIAGE_COLORS: ["#5aa050", "#4e8f3a", "#74b262"], // a few greens for variety
  POT_R: 0.22,                      // pot radius (top)
  POT_H: 0.44,                      // pot height
  FOLIAGE_R: 0.3,                   // base foliage-blob radius
  PLANTS: [
    { x: -4.95, z:  3.5 },          // beside the lounge
    { x:  4.95, z:  6.4 },          // back-right corner (entrance)
    { x: -5.0,  z: -5.4 },          // front-left, by the window
    { x:  5.0,  z: -5.4 },          // front-right, by the window
  ],

  // --- WALL ACCENTS  (framed panels on the side walls) + a studio sign ---------
  ACCENT_FRAME_COLOR: "#f2ecdf",    // soft cream frame
  ACCENT_TEAL: "#2f7d77",           // muted teal panel
  ACCENT_GOLD: "#c79a3e",           // warm gold panel
  ACCENT_Y: 2.35,                   // height of each panel's center on the wall
  ACCENT_W: 0.95,                   // panel width (along the wall, z)
  ACCENT_H: 1.15,                   // panel height (y)
  WALL_ACCENTS: [
    { side: "left",  z: -1.2, color: "teal" },
    { side: "right", z: -1.2, color: "gold" },
  ],
  // Optional studio name sign on one side wall (uses the cream/navy sign texture).
  SHOW_STUDIO_SIGN: true,
  STUDIO_SIGN_TEXT: "Startup Studio",
  STUDIO_SIGN: { side: "left", z: 3.4, y: 2.95, w: 1.7, h: 0.55 },
};

// ----------------------------------------------------------------------------
// STAGE LOOKS  —  the street's time of day shifts as the student ages. The new
// PROPS for each stage (the food truck in Stage 2, your storefront in Stage 3)
// are added with those stages; here we change the light and sky.
// ----------------------------------------------------------------------------
const stageState = {
  skyMat: null as MeshBasicMaterial | null,
  sun: null as DirectionalLight | null,
  hemi: null as HemisphereLight | null,
  fog: null as Fog | null,
  groundMats: [] as MeshLambertMaterial[],
  foliageMats: [] as { mat: { color: Color }; orig: Color }[],
};

function registerFoliage(mesh: Mesh) {
  const mat = mesh.material as MeshLambertMaterial;
  stageState.foliageMats.push({ mat, orig: mat.color.clone() });
}

const STAGE_LOOKS = {
  // Setup lobby: a calm neutral backdrop for the shop picker, before any shop.
  lobby: { skyTop: "#7e93a3", skyMid: "#a9bcc7", horizon: "#d4dee4", sun: "#fdf6ea", sunI: 1.7, hemiI: 1.05, ground: "#d4dee4", foliage: "#d4dee4" },
  // Morning (childhood): a fresh bright morning.
  morning: { skyTop: "#5aa6e0", skyMid: "#9fcdee", horizon: "#e3f1fb", sun: "#fff4dd", sunI: 2.3, hemiI: 1.15, ground: "#ffffff", foliage: "#ffffff" },
  // Midday (working years): a strong full midday.
  midday: { skyTop: "#2f86d8", skyMid: "#7fbcec", horizon: "#d6ebfb", sun: "#ffefbe", sunI: 2.7, hemiI: 1.2, ground: "#f3ffe4", foliage: "#eaffce" },
  // Afternoon (adult): a warm golden hour.
  afternoon: { skyTop: "#6f7fb8", skyMid: "#d9a878", horizon: "#f6cf9a", sun: "#ffba78", sunI: 2.0, hemiI: 0.98, ground: "#f0e0b8", foliage: "#e8b878" },
  // Pitch Day (P2): the house lights drop and the sky warms to a focused, theatrical look. The
  // sun + hemi fall hard so the lit surfaces (walls, floor, desk, the investors) darken and the
  // warm spotlight beams pop; the unlit ceiling stays as a soft glow overhead.
  pitch: { skyTop: "#241d31", skyMid: "#46324f", horizon: "#6f4a50", sun: "#ffc98f", sunI: 0.7, hemiI: 0.32, ground: "#9c8863", foliage: "#8f745a" },
};

// P2 — the "Pitch Day" STAGE. During the pitch the house lights dim, the sky warms (the pitch
// STAGE_LOOK above), and warm spotlight beams switch on over the three investors. All tunable here.
const STAGE = {
  DIM_FACTOR: 0.28,       // indoor ambient + ceiling wash drop to this fraction during a pitch
  DIM_COLOR: 0.5,         // the big UNLIT surfaces (ceiling, skyline) darken to this fraction too
  SPOT_COLOR: "#fff1c9",  // warm spotlight glow
  SPOT_OPACITY: 0.22,     // beam translucency (a soft glow, not a solid cone)
  SPOT_BASE_RADIUS: 0.95, // beam width low, near the investor
  SPOT_TOP_Y: 3.95,       // beam tip near the ceiling (the "source")
  SPOT_BOTTOM_Y: 1.3,     // beam base down around the investor's upper body
};

// Live handles for the pitch stage (captured as the room is built), toggled by setPitchStage().
// `dimmables` holds the big UNLIT (MeshBasic) surfaces — the ceiling + the skyline window — whose
// colors are multiplied down during a pitch (dimming the lights alone can't touch them).
const pitchStageState = {
  ambient: null as AmbientLight | null,
  ceiling: null as HemisphereLight | null,
  ambientBase: 0,
  ceilingBase: 0,
  spots: [] as Mesh[],
  dimmables: [] as { mat: MeshBasicMaterial; orig: Color }[],
  on: false,
};

// Register an unlit surface material so setPitchStage() can darken it during the pitch.
function registerDimmable(mat: MeshBasicMaterial) {
  pitchStageState.dimmables.push({ mat, orig: mat.color.clone() });
}

// Retint the whole street for a stage. Safe to call any number of times; every
// tint is computed from stored originals, never stacked. "select" maps to morning, "close" to afternoon.
export function setStageLook(world: any, stage: string) {
  void world;
  let key = stage;
  if (key === "select") key = "lobby";
  if (key === "close") key = "afternoon";
  const preset = (STAGE_LOOKS as any)[key];
  if (!preset) return;
  if (stageState.skyMat) {
    const old = stageState.skyMat.map;
    stageState.skyMat.map = makeSkyTexture(preset.skyTop, preset.skyMid, preset.horizon);
    stageState.skyMat.needsUpdate = true;
    if (old) old.dispose();
  }
  if (stageState.sun) {
    stageState.sun.color.set(preset.sun);
    stageState.sun.intensity = preset.sunI;
  }
  if (stageState.hemi) stageState.hemi.intensity = preset.hemiI;
  if (stageState.fog) stageState.fog.color.set(preset.horizon);
  for (const mat of stageState.groundMats) mat.color.set(preset.ground);
  const tint = new Color(preset.foliage);
  for (const f of stageState.foliageMats) {
    f.mat.color.copy(f.orig).multiply(tint);
  }
}

// ----------------------------------------------------------------------------
// SMALL SHAPE HELPERS  —  every scenery piece is made out of these.
// ----------------------------------------------------------------------------
function meshBox(w: number, h: number, d: number, color: string): Mesh {
  const m = new Mesh(new BoxGeometry(w, h, d), new MeshLambertMaterial({ color: new Color(color) }));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function meshCyl(rTop: number, rBot: number, h: number, color: string, seg = 12): Mesh {
  const m = new Mesh(new CylinderGeometry(rTop, rBot, h, seg), new MeshLambertMaterial({ color: new Color(color) }));
  m.castShadow = true;
  return m;
}
function meshSphere(r: number, color: string, seg = 12): Mesh {
  const m = new Mesh(new SphereGeometry(r, seg, seg), new MeshLambertMaterial({ color: new Color(color) }));
  m.castShadow = true;
  return m;
}
function meshCone(r: number, h: number, color: string, seg = 12): Mesh {
  const m = new Mesh(new ConeGeometry(r, h, seg), new MeshLambertMaterial({ color: new Color(color) }));
  m.castShadow = true;
  return m;
}

// ----------------------------------------------------------------------------
// CANVAS TEXTURES  —  a gradient sky and readable signs, drawn once at startup.
// ----------------------------------------------------------------------------
function makeSkyTexture(top: string, mid: string, horizon: string): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 256;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, horizon);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 256);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

// A small 2x2 checkerboard, drawn once and tiled across the bakery floor. The
// two colors alternate; the texture repeats so the squares read at a tile size
// that fits the room (about 6 across, 9 down the 11x16 floor).
function makeCheckerTexture(a: string, b: string): CanvasTexture {
  const S = 64;
  const half = S / 2;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, half, half);
  ctx.fillRect(half, half, half, half);
  ctx.fillStyle = b;
  ctx.fillRect(half, 0, half, half);
  ctx.fillRect(0, half, half, half);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(6, 9);
  return tex;
}

// A light blonde wood-plank texture for the studio floor: a bright base with
// faint plank seams and a touch of tone variation, so it reads as warm wood
// rather than flat paint. Two close tones keep it light. Tiled across the floor;
// the repeat count comes from STUDIO.FLOOR_PLANK_REPEAT.
function makeWoodFloorTexture(base: string, seam: string): CanvasTexture {
  const W = 256;
  const H = 256;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  const planks = 4;
  const ph = H / planks;
  for (let i = 0; i < planks; i++) {
    // Every other plank a hair deeper, for a subtle wood variation.
    if (i % 2 === 1) {
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = seam;
      ctx.fillRect(0, i * ph, W, ph);
      ctx.globalAlpha = 1;
    }
    // The seam line between planks.
    ctx.fillStyle = seam;
    ctx.fillRect(0, Math.round(i * ph), W, 2);
  }
  // A few staggered board-end seams, so the planks don't look continuous.
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = seam;
  ctx.fillRect(Math.round(W * 0.5), 0, 2, ph);
  ctx.fillRect(Math.round(W * 0.25), ph, 2, ph);
  ctx.fillRect(Math.round(W * 0.75), 2 * ph, 2, ph);
  ctx.fillRect(Math.round(W * 0.4), 3 * ph, 2, ph);
  ctx.globalAlpha = 1;
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.repeat.set(STUDIO.FLOOR_PLANK_REPEAT[0], STUDIO.FLOOR_PLANK_REPEAT[1]);
  return tex;
}

function makeSignTexture(text: string): CanvasTexture {
  // Drawn at high resolution so the text stays crisp even on the wide overhead
  // banner, which stretches one texture across a much larger board than the
  // building signs. Low resolution there blurred "Main Street" into nothing.
  const W = 720;
  const H = 240;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  ctx.fillStyle = SIGN_CREAM;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = SIGN_NAVY;
  ctx.lineWidth = 16;
  ctx.strokeRect(12, 12, W - 24, H - 24);
  ctx.fillStyle = SIGN_NAVY;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Pick the largest font (up to a cap) that still fits, so longer names like
  // "Main Street" fill the board instead of shrinking to nothing.
  let size = 104;
  do {
    ctx.font = "bold " + size + "px sans-serif";
    size -= 4;
  } while (ctx.measureText(text).width > W - 72 && size > 24);
  ctx.fillText(text, W / 2, H / 2 + 4);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

// A flat readable sign board (unlit so it never darkens), added to a building
// group facing the street (the building's +Z side).
function addBoardSign(group: Group, text: string, x: number, y: number, z: number) {
  const board = new Mesh(
    new PlaneGeometry(2.2, 0.72),
    new MeshBasicMaterial({ map: makeSignTexture(text), side: DoubleSide }),
  );
  board.position.set(x, y, z);
  group.add(board);
}

// ----------------------------------------------------------------------------
// SKY + LIGHTS
// ----------------------------------------------------------------------------
function buildSkyAndLights(world: any) {
  const scene = world.scene;

  // A big inside-out sphere painted with the sky gradient.
  const skyMat = new MeshBasicMaterial({
    map: makeSkyTexture(PALETTE.skyTop, PALETTE.skyMid, PALETTE.horizon),
    side: BackSide,
    fog: false,
  });
  const skyMesh = new Mesh(new SphereGeometry(120, 24, 16), skyMat);
  world.createTransformEntity(skyMesh);
  stageState.skyMat = skyMat;

  // Fog so distant things melt into the horizon color.
  const fog = new Fog(new Color(PALETTE.horizon), 28, 95);
  scene.fog = fog;
  stageState.fog = fog;

  // Soft sky light + a warm sun.
  const hemi = new HemisphereLight(new Color("#ffffff"), new Color("#7f9a6a"), 1.15);
  scene.add(hemi);
  stageState.hemi = hemi;

  const sun = new DirectionalLight(new Color(PALETTE.sun), 2.3);
  sun.position.set(12, 22, 8);
  scene.add(sun);
  stageState.sun = sun;

  // INDOOR OFFICE LIGHTING — makes the room read bright and even with no dark
  // corners. These are kept SEPARATE from the day-shift sun/hemi above (which
  // setStageLook retints), so a stage change never touches them. Tune both in
  // the STUDIO block. A soft ambient fill, plus a gentle top-down ceiling wash.
  const fill = new AmbientLight(new Color(STUDIO.AMBIENT_COLOR), STUDIO.AMBIENT_INTENSITY);
  scene.add(fill);

  const ceilingWash = new HemisphereLight(
    new Color(STUDIO.CEILING_FILL_SKY),
    new Color(STUDIO.CEILING_FILL_GROUND),
    STUDIO.CEILING_FILL_INTENSITY,
  );
  scene.add(ceilingWash);

  // P2: remember the house lights + their normal intensities so setPitchStage() can dim them for
  // the pitch and restore them afterward.
  pitchStageState.ambient = fill;
  pitchStageState.ambientBase = STUDIO.AMBIENT_INTENSITY;
  pitchStageState.ceiling = ceilingWash;
  pitchStageState.ceilingBase = STUDIO.CEILING_FILL_INTENSITY;
}

// ----------------------------------------------------------------------------
// THE SHOP FLOOR  —  the walkable wood floor. Returned to index.ts so it is
// registered as the LocomotionEnvironment the player stands on. It keeps its
// wood color and is lit by the day-shifting sun, warming as the day advances.
// ----------------------------------------------------------------------------
function buildShopFloor(world: any) {
  const floorMesh = new Mesh(
    new PlaneGeometry(STUDIO.WIDTH, STUDIO.DEPTH),
    new MeshLambertMaterial({ map: makeWoodFloorTexture(STUDIO.FLOOR_WOOD_BASE, STUDIO.FLOOR_WOOD_SEAM) }),
  );
  floorMesh.receiveShadow = true;
  const ground = world.createTransformEntity(floorMesh);
  ground.object3D!.rotation.x = -Math.PI / 2;
  ground.object3D!.position.set(0, 0, 0);
  _floorMat = floorMesh.material as MeshLambertMaterial;
  return ground;
}

// ----------------------------------------------------------------------------
// SHOP WALLS  —  three solid walls and a glass storefront, in ONE Group. This
// is the collision boundary: index.ts registers it as a LocomotionEnvironment,
// so the capsule bumps the walls and cannot leave the shop. The glass pane is
// see-through (low opacity) but still part of this Group, so it collides too and
// the player cannot walk out the front. The player spawns near the back wall,
// facing -z, looking down the shop toward the street through the glass.
// ----------------------------------------------------------------------------
export const BOUNDARY = { xHalf: 5.5, zBack: 8, zFront: -8, height: 3, thickness: 0.3 };

function buildShopWalls(world: any) {
  const g = new Group();
  const H = STUDIO.ROOM_HEIGHT; // wall + ceiling height (STUDIO block)
  const W = STUDIO.WIDTH;
  const D = STUDIO.DEPTH;

  // Back wall (behind you at spawn). Raised to the room height, clean warm white.
  const back = meshBox(W, H, 0.3, STUDIO.WALL_COLOR);
  back.position.set(0, H / 2, 8);
  g.add(back);

  // Left and right walls, running the full depth.
  const left = meshBox(0.3, H, D, STUDIO.WALL_COLOR);
  left.position.set(-5.5, H / 2, 0);
  g.add(left);
  const right = meshBox(0.3, H, D, STUDIO.WALL_COLOR);
  right.position.set(5.5, H / 2, 0);
  g.add(right);

  // A low baseboard band along the bottom of the three solid walls (room-side
  // face), a subtle tone below the warm-white wall so it reads as a clean dado.
  const backBand = meshBox(W, 1.0, 0.1, STUDIO.BASEBOARD_COLOR);
  backBand.position.set(0, 0.5, 7.85);
  g.add(backBand);
  const leftBand = meshBox(0.1, 1.0, D, STUDIO.BASEBOARD_COLOR);
  leftBand.position.set(-5.35, 0.5, 0);
  g.add(leftBand);
  const rightBand = meshBox(0.1, 1.0, D, STUDIO.BASEBOARD_COLOR);
  rightBand.position.set(5.35, 0.5, 0);
  g.add(rightBand);

  // The far wall behind the investors is a floor-to-ceiling SKYLINE WINDOW (the
  // city skyline beyond it is built in buildSkyline). ONE pale-blue, mostly
  // see-through glass panel fills the opening — a single transparent surface, so
  // it stays smooth on the headset. It is part of this boundary group, so it
  // still collides and the player cannot walk through. The plan board (z -7.8)
  // sits in front of it, untouched.
  const glass = new Mesh(
    new BoxGeometry(STUDIO.WINDOW_WIDTH, STUDIO.WINDOW_HEIGHT, 0.08),
    new MeshLambertMaterial({ color: new Color(STUDIO.GLASS_COLOR), transparent: true, opacity: STUDIO.GLASS_OPACITY }),
  );
  glass.position.set(0, STUDIO.WINDOW_HEIGHT / 2, STUDIO.WINDOW_Z);
  g.add(glass);

  // Thin white frame bars dividing the glass into clean panes: a perimeter, then
  // a few vertical mullions and one or two horizontals. Slim opaque boxes that
  // stand just in front of the glass, toward the room (but behind the board).
  const frameZ = STUDIO.WINDOW_Z + STUDIO.FRAME_STANDOFF;
  const halfW = STUDIO.WINDOW_WIDTH / 2;
  const winH = STUDIO.WINDOW_HEIGHT;
  const addFrameBar = (bw: number, bh: number, bx: number, by: number) => {
    const bar = meshBox(bw, bh, STUDIO.FRAME_DEPTH, STUDIO.FRAME_COLOR);
    bar.position.set(bx, by, frameZ);
    bar.castShadow = false;
    g.add(bar);
  };
  // Perimeter (slightly overlong so the corners meet cleanly).
  addFrameBar(STUDIO.WINDOW_WIDTH + STUDIO.FRAME_BAR, STUDIO.FRAME_BAR, 0, STUDIO.FRAME_BAR / 2);        // bottom
  addFrameBar(STUDIO.WINDOW_WIDTH + STUDIO.FRAME_BAR, STUDIO.FRAME_BAR, 0, winH - STUDIO.FRAME_BAR / 2); // top
  addFrameBar(STUDIO.FRAME_BAR, winH, -halfW, winH / 2);                                                 // left
  addFrameBar(STUDIO.FRAME_BAR, winH,  halfW, winH / 2);                                                 // right
  // Vertical mullions.
  for (const fx of STUDIO.FRAME_VERTICALS) addFrameBar(STUDIO.FRAME_BAR, winH, fx, winH / 2);
  // Horizontal mullions.
  for (const fy of STUDIO.FRAME_HORIZONTALS) addFrameBar(STUDIO.WINDOW_WIDTH, STUDIO.FRAME_BAR, 0, fy);

  _wallMats = [back.material as MeshLambertMaterial, left.material as MeshLambertMaterial, right.material as MeshLambertMaterial];
  _wainscotMats = [backBand.material as MeshLambertMaterial, leftBand.material as MeshLambertMaterial, rightBand.material as MeshLambertMaterial];

  return world.createTransformEntity(g);
}

// ----------------------------------------------------------------------------
// THE CITY SKYLINE  —  what shows through the far-wall window: a hazy daytime
// city skyline set back behind the glass. A bright light-blue sky plane, then a
// run of simple boxes for buildings (lighter = farther, so they read as distant)
// with a few small soft emissive squares as lit windows. All unlit (MeshBasic)
// and fog-free, so it stays a clean, flat, bright daytime backdrop that matches
// the airy room. Returned so the opening reveals it with the rest of the world.
// (This replaced the old street view; the window opening lives in buildShopWalls.)
// ----------------------------------------------------------------------------
function buildSkyline(world: any) {
  // The bright daytime sky plane, far behind the buildings.
  const sky = new Mesh(
    new PlaneGeometry(80, 44),
    new MeshBasicMaterial({ color: new Color(STUDIO.SKYLINE_SKY_COLOR), fog: false }),
  );
  const skyE = world.createTransformEntity(sky);
  skyE.object3D!.position.set(0, 10, STUDIO.SKYLINE_SKY_Z);
  registerDimmable(sky.material as MeshBasicMaterial); // P2: the big bright window darkens for the pitch

  // The buildings + their lit windows, all in one group.
  const g = new Group();
  const depth = STUDIO.SKYLINE_BUILDING_DEPTH;
  for (let b = 0; b < STUDIO.SKYLINE_BUILDINGS.length; b++) {
    const bd = STUDIO.SKYLINE_BUILDINGS[b];
    const tower = new Mesh(
      new BoxGeometry(bd.w, bd.h, depth),
      new MeshBasicMaterial({ color: new Color(bd.c), fog: false }),
    );
    tower.position.set(bd.x, bd.h / 2, bd.z);
    registerDimmable(tower.material as MeshBasicMaterial);
    g.add(tower);

    // Scatter a few small lit-window squares on the room-facing (+z) face. A
    // sparse, deterministic pattern, kept to the lower (visible) part of each tower.
    const faceZ = bd.z + depth / 2 + 0.02;
    const cols = Math.max(2, Math.round(bd.w / 0.8));
    const rows = Math.max(2, Math.round(bd.h / 1.1));
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if ((c * 3 + r * 7 + b * 5) % 4 !== 0) continue; // ~1 in 4 windows is "lit"
        const wy = ((r + 0.5) / rows) * bd.h;
        if (wy > 6.5 || wy > bd.h - 0.4) continue; // skip the high, out-of-view rows
        const wx = bd.x - bd.w / 2 + ((c + 0.5) / cols) * bd.w;
        const win = new Mesh(
          new PlaneGeometry(0.16, 0.26),
          new MeshBasicMaterial({ color: new Color(STUDIO.SKYLINE_WINDOW_COLOR), fog: false }),
        );
        win.position.set(wx, wy, faceZ);
        registerDimmable(win.material as MeshBasicMaterial);
        g.add(win);
      }
    }
  }
  const cityE = world.createTransformEntity(g);

  // Hand back the skyline pieces so the opening reveals them with the room.
  return [skyE, cityE];
}

// ----------------------------------------------------------------------------
// THE CEILING  —  a flat white ceiling on top of the walls, with a few recessed
// light panels set into it. The ceiling is an unlit (MeshBasic) plane facing
// down, so it always reads bright and even no matter how the lights fall; the
// panels are brighter flat emissive rectangles so the room reads brightly lit
// from above. Both are built from STUDIO constants. Not collision (no need).
// ----------------------------------------------------------------------------
function buildCeiling(world: any) {
  const g = new Group();
  const H = STUDIO.ROOM_HEIGHT;

  const ceil = new Mesh(
    new PlaneGeometry(STUDIO.WIDTH, STUDIO.DEPTH),
    new MeshBasicMaterial({ color: new Color(STUDIO.CEILING_COLOR), side: DoubleSide }),
  );
  ceil.rotation.x = Math.PI / 2; // normal points down, into the room
  ceil.position.set(0, H, 0);
  ceil.castShadow = false;
  ceil.receiveShadow = false;
  registerDimmable(ceil.material as MeshBasicMaterial); // P2: the ceiling dims for the pitch
  g.add(ceil);

  // Recessed light panels: flat emissive rectangles set just under the ceiling.
  for (const p of STUDIO.CEILING_PANELS) {
    const panel = new Mesh(
      new PlaneGeometry(p.w, p.d),
      new MeshBasicMaterial({ color: new Color(STUDIO.CEILING_PANEL_COLOR), side: DoubleSide, fog: false }),
    );
    panel.rotation.x = Math.PI / 2;
    panel.position.set(p.x, H - STUDIO.CEILING_PANEL_INSET, p.z);
    panel.castShadow = false;
    panel.receiveShadow = false;
    registerDimmable(panel.material as MeshBasicMaterial);
    g.add(panel);
  }

  return world.createTransformEntity(g);
}

// ----------------------------------------------------------------------------
// PENDANT LIGHTS  —  three slim pendants hung from the ceiling over the three
// plan stations. Each is a thin cord, a small shade, and a soft warm emissive
// glow beneath it (an unlit sphere, so it always glows). Positions + sizes come
// from the STUDIO block. Static (no motion), built from simple primitives.
// ----------------------------------------------------------------------------
function buildPendants(world: any) {
  const H = STUDIO.ROOM_HEIGHT;
  const shadeY = STUDIO.PENDANT_SHADE_Y;
  const shadeTop = shadeY + STUDIO.PENDANT_SHADE_H / 2;
  const cordLen = H - shadeTop;       // cord runs from the ceiling to the shade top
  const cordY = (H + shadeTop) / 2;   // cord center

  for (const p of STUDIO.PENDANT_XZ) {
    const g = new Group();

    // Thin cord from the ceiling down to the shade.
    const cord = meshCyl(STUDIO.PENDANT_CORD_RADIUS, STUDIO.PENDANT_CORD_RADIUS, cordLen, STUDIO.PENDANT_CORD_COLOR, 8);
    cord.position.set(0, cordY, 0);
    cord.castShadow = false;
    g.add(cord);

    // Small shade — a lampshade trapezoid: narrow at the top, wider at the bottom.
    const shade = meshCyl(STUDIO.PENDANT_SHADE_RTOP, STUDIO.PENDANT_SHADE_RBOT, STUDIO.PENDANT_SHADE_H, STUDIO.PENDANT_SHADE_COLOR, 16);
    shade.position.set(0, shadeY, 0);
    shade.castShadow = false;
    g.add(shade);

    // Soft warm glow just under the shade (unlit emissive sphere).
    const glow = new Mesh(
      new SphereGeometry(STUDIO.PENDANT_GLOW_RADIUS, 12, 12),
      new MeshBasicMaterial({ color: new Color(STUDIO.PENDANT_GLOW_COLOR), fog: false }),
    );
    glow.position.set(0, shadeY - STUDIO.PENDANT_SHADE_H / 2, 0);
    glow.castShadow = false;
    g.add(glow);

    const e = world.createTransformEntity(g);
    e.object3D!.position.set(p.x, 0, p.z);
  }
}

// ============================================================================
// MODULE 9 STUDIO FURNITURE  —  additive "lived-in office" decor: a lounge by
// the entrance, potted plants in the corners, and framed wall accents (+ an
// optional studio sign). All from simple primitives, all tucked to the
// edges/corners so the walkway, stations, investors and window stay clear.
// NONE of it is collision. Every position / size / color lives in FURNISH.
// ============================================================================

// A low modern sofa: a seat slab, a backrest on the wall (-x) side, and two
// arms. Built facing +x (into the room), centered at the origin; the caller
// places the group.
function buildSofa(): Group {
  const g = new Group();
  const d = FURNISH.SOFA_DEPTH;   // along x
  const len = FURNISH.SOFA_LEN;   // along z
  const seatH = FURNISH.SOFA_SEAT_H;

  const seat = meshBox(d, seatH, len, FURNISH.SOFA_COLOR);
  seat.position.set(0, seatH / 2, 0);
  g.add(seat);

  const back = meshBox(0.18, seatH + FURNISH.SOFA_BACK_H, len, FURNISH.SOFA_COLOR);
  back.position.set(-d / 2 + 0.09, (seatH + FURNISH.SOFA_BACK_H) / 2, 0);
  g.add(back);

  for (const s of [-1, 1]) {
    const arm = meshBox(d, seatH + FURNISH.SOFA_ARM_H, 0.18, FURNISH.SOFA_COLOR);
    arm.position.set(0, (seatH + FURNISH.SOFA_ARM_H) / 2, s * (len / 2 - 0.09));
    g.add(arm);
  }
  return g;
}

// A small modern coffee table: a thin top on four slim legs.
function buildCoffeeTable(): Group {
  const g = new Group();
  const w = FURNISH.TABLE_SIZE.w, d = FURNISH.TABLE_SIZE.d, h = FURNISH.TABLE_SIZE.h;
  const top = meshBox(w, 0.06, d, FURNISH.TABLE_COLOR);
  top.position.set(0, h - 0.03, 0);
  g.add(top);
  const legH = h - 0.06;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const leg = meshBox(0.05, legH, 0.05, FURNISH.TABLE_COLOR);
    leg.position.set(sx * (w / 2 - 0.05), legH / 2, sz * (d / 2 - 0.05));
    g.add(leg);
  }
  return g;
}

// A potted plant: a tapered pot with a cluster of green blobs above it.
function buildPlant(): Group {
  const g = new Group();
  const pot = meshCyl(FURNISH.POT_R, FURNISH.POT_R * 0.8, FURNISH.POT_H, FURNISH.POT_COLOR, 12);
  pot.position.set(0, FURNISH.POT_H / 2, 0);
  g.add(pot);

  const fr = FURNISH.FOLIAGE_R;
  const base = FURNISH.POT_H + fr * 0.7;
  const blobs = [
    { x: 0.0,   y: base + 0.10, z: 0.0,   r: fr,        c: 0 },
    { x: -0.17, y: base - 0.02, z: 0.05,  r: fr * 0.75, c: 1 },
    { x: 0.16,  y: base + 0.04, z: -0.05, r: fr * 0.8,  c: 2 },
    { x: 0.02,  y: base + 0.30, z: 0.0,   r: fr * 0.7,  c: 1 },
  ];
  for (const b of blobs) {
    const leaf = meshSphere(b.r, FURNISH.FOLIAGE_COLORS[b.c], 10);
    leaf.position.set(b.x, b.y, b.z);
    g.add(leaf);
  }
  return g;
}

// A framed wall panel on a side wall, facing into the room (a cream frame with a
// colored panel just in front of it). Thin boxes, so no rotation needed.
function buildWallAccent(world: any, side: string, z: number, accentColor: string) {
  const g = new Group();
  const frame = meshBox(0.06, FURNISH.ACCENT_H + 0.12, FURNISH.ACCENT_W + 0.12, FURNISH.ACCENT_FRAME_COLOR);
  const panel = meshBox(0.05, FURNISH.ACCENT_H, FURNISH.ACCENT_W, accentColor);
  panel.position.set(side === "left" ? 0.02 : -0.02, 0, 0); // colored panel toward the room
  g.add(frame);
  g.add(panel);
  const e = world.createTransformEntity(g);
  e.object3D!.position.set(side === "left" ? -5.33 : 5.33, FURNISH.ACCENT_Y, z);
  return e;
}

// The "Startup Studio" sign on a side wall (the cream/navy sign texture), facing
// into the room. The textured board is a plane, so it is rotated onto the wall.
function buildStudioSign(world: any) {
  const s = FURNISH.STUDIO_SIGN;
  const g = new Group();
  const frame = meshBox(0.05, s.h + 0.1, s.w + 0.1, FURNISH.ACCENT_FRAME_COLOR);
  g.add(frame);
  const board = new Mesh(
    new PlaneGeometry(s.w, s.h),
    new MeshBasicMaterial({ map: makeSignTexture(FURNISH.STUDIO_SIGN_TEXT), side: DoubleSide }),
  );
  board.rotation.y = s.side === "left" ? Math.PI / 2 : -Math.PI / 2;
  board.position.set(s.side === "left" ? 0.04 : -0.04, 0, 0);
  g.add(board);
  const e = world.createTransformEntity(g);
  e.object3D!.position.set(s.side === "left" ? -5.32 : 5.32, s.y, s.z);
}

// Build the whole furniture set. Called once from buildBaseWorld.
function buildFurniture(world: any) {
  // Lounge: a teal rug, a grey sofa on it, a coffee table in front.
  const rug = meshBox(FURNISH.RUG_SIZE.w, FURNISH.RUG_THICK, FURNISH.RUG_SIZE.d, FURNISH.RUG_COLOR);
  const rugE = world.createTransformEntity(rug);
  rugE.object3D!.position.set(FURNISH.RUG_POS.x, FURNISH.RUG_THICK / 2, FURNISH.RUG_POS.z);

  const sofaE = world.createTransformEntity(buildSofa());
  sofaE.object3D!.position.set(FURNISH.SOFA_POS.x, 0, FURNISH.SOFA_POS.z);

  const tableE = world.createTransformEntity(buildCoffeeTable());
  tableE.object3D!.position.set(FURNISH.TABLE_POS.x, 0, FURNISH.TABLE_POS.z);

  // Potted plants in the corners + beside the lounge.
  for (const p of FURNISH.PLANTS) {
    const e = world.createTransformEntity(buildPlant());
    e.object3D!.position.set(p.x, 0, p.z);
  }

  // Framed wall accents + the optional studio sign.
  for (const a of FURNISH.WALL_ACCENTS) {
    buildWallAccent(world, a.side, a.z, a.color === "teal" ? FURNISH.ACCENT_TEAL : FURNISH.ACCENT_GOLD);
  }
  if (FURNISH.SHOW_STUDIO_SIGN) buildStudioSign(world);
}

// ----------------------------------------------------------------------------
// STATION ANCHORS  —  where each panel/mentor sits inside the shop. The panels
// read these, so they move into the shop on their own. The names bank/business
// are leftover labels we rename when we reskin each phase.
// ----------------------------------------------------------------------------
export const STATIONS = {
  bank:     { x: -2.6, z: 0,  faceY: 0 },
  business: { x:  2.6, z: 0,  faceY: 0 },
  store:    { x:  0,   z: -3, faceY: 0 },
  home:     { x:  0,   z:  4, faceY: 0 },
};

// ----------------------------------------------------------------------------
// MODULE 9 — STUDIO STATION SPOTS  —  where the three studio station markers
// stand in the empty room. These are best-guess starting positions to fine-tune
// in the headset, kept together here as the one place to edit them. Each is a
// floor spot (y = 0); buildStationMarkers() (further down) drops a labeled
// pedestal at each. No interactivity yet — just visible, labeled markers.
//
// The rest of the Module 9 world lives in this same block: three investors stand
// in a row at the far end (y 0), the plan board mounts high on the far wall
// (y 2.2), and the host greets near the entrance, off to one side (y 0).
// ----------------------------------------------------------------------------
export const PRODUCT_SPOT   = { x: -3.5, y: 0,   z: 0 };
export const PRICE_SPOT     = { x:  0,   y: 0,   z: 0 };
export const MARKETING_SPOT = { x:  3.5, y: 0,   z: 0 };

export const INVESTOR_1     = { x: -2,   y: 0,   z: -6.5 };
export const INVESTOR_2     = { x:  0,   y: 0,   z: -6.5 };
export const INVESTOR_3     = { x:  2,   y: 0,   z: -6.5 };
export const PLAN_BOARD     = { x:  0,   y: 3.0, z: -7.8 };
export const HOST_SPOT      = { x: -3,   y: 0,   z:  2.5 };

// The judges' desk: one long, solid desk centered just in front of the investors
// (who stand at z -6.5) so the trio reads as a panel. y 0.5 is the center of the
// 1 m-tall body, so the desk rests on the floor (y 0 to 1). Width/height/depth
// are the box dimensions, fed straight into buildJudgesDesk().
export const DESK_POSITION  = { x: 0, y: 0.5, z: -5.9 };
export const DESK_WIDTH     = 6;
export const DESK_HEIGHT    = 1;
export const DESK_DEPTH     = 0.6;

// ============================================================================
// GUS  —  the Main Street cart shopkeeper and your money mentor. He wheels his
// cart to where you are, waves you over with a gold "!", and greets you when you
// walk up. His stage question (which feeds Money Smarts) arrives with the panel
// system in the next prompt; for now he is alive and says hello.
// ============================================================================

// Where Gus parks (and which way he faces). The one place to move him.
export const GUS_SPOT = { x: -2.6, z: 1.6, faceY: 0 };

// Break a sentence into lines that fit a given width, for the speech bubble.
function wrapLines(ctx: any, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxWidth) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Draw a white speech bubble with navy text onto a canvas, wrapped to fit.
function makeBubbleTexture(text: string): CanvasTexture {
  const W = 460;
  const H = 240;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  ctx.clearRect(0, 0, W, H);
  const bx = 14;
  const by = 14;
  const bw = W - 28;
  const bh = H - 78;
  ctx.fillStyle = "#fffdf8";
  ctx.strokeStyle = SIGN_NAVY;
  ctx.lineWidth = 8;
  ctx.fillRect(bx, by, bw, bh);
  // a little tail pointing down toward Gus
  ctx.beginPath();
  ctx.moveTo(W / 2 - 28, by + bh);
  ctx.lineTo(W / 2 + 28, by + bh);
  ctx.lineTo(W / 2, by + bh + 50);
  ctx.closePath();
  ctx.fill();
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = SIGN_NAVY;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Fit the text to the box: take the largest font (up to 30px) whose wrapped
  // lines fit inside the bubble both across and down, then center them. A long
  // greeting shrinks to stay inside instead of spilling over the border.
  const maxTextW = bw - 44;
  const maxTextH = bh - 28;
  let size = 30;
  let lines: string[] = [];
  let lh = 38;
  for (;;) {
    ctx.font = "bold " + size + "px sans-serif";
    lh = size * 1.25;
    lines = wrapLines(ctx, text, maxTextW);
    if (size <= 14 || lines.length * lh <= maxTextH) break;
    size -= 2;
  }

  const startY = by + bh / 2 - ((lines.length - 1) * lh) / 2;
  let li = 0;
  for (const ln of lines) {
    ctx.fillText(ln, W / 2, startY + li * lh);
    li = li + 1;
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

// ---- Ms. Delia, the baker who owns the shop. A blue dress under a cream
// apron, shoulder-length brown hair, and a tall white baker's hat. She stands
// at GUS_SPOT facing the room (+z), just behind the sales counter, feet on the
// floor at y = 0. Built from the same shape helpers as the rest of the shop. ----
function buildDeliaFigure(): Group {
  const gus = new Group();

  // Dress: a cone skirt with a cylinder bodice above it.
  const skirt = meshCone(0.4, 0.9, PALETTE.dressBlue);
  skirt.position.set(0, 0.45, 0);
  gus.add(skirt);
  const bodice = meshCyl(0.2, 0.24, 0.5, PALETTE.dressBlue);
  bodice.position.set(0, 1.05, 0);
  gus.add(bodice);

  // Cream apron across the front.
  const apron = meshBox(0.4, 0.85, 0.05, PALETTE.apronCream);
  apron.position.set(0, 0.7, 0.34);
  gus.add(apron);

  // Arms down her sides, each with a hand at the end.
  for (const s of [-1, 1]) {
    const arm = meshCyl(0.06, 0.06, 0.45, PALETTE.dressBlue);
    arm.position.set(s * 0.26, 1.05, 0);
    gus.add(arm);
    const hand = meshSphere(0.06, PALETTE.skinTone);
    hand.position.set(s * 0.26, 0.82, 0);
    gus.add(hand);
  }

  // Head, with a rounded mass of hair behind it and a lock down each side.
  const head = meshSphere(0.19, PALETTE.skinTone);
  head.position.set(0, 1.52, 0);
  gus.add(head);
  const hairBack = meshSphere(0.21, PALETTE.hairBrown);
  hairBack.position.set(0, 1.52, -0.05);
  gus.add(hairBack);
  for (const s of [-1, 1]) {
    const lock = meshBox(0.09, 0.28, 0.14, PALETTE.hairBrown);
    lock.position.set(s * 0.17, 1.38, -0.02);
    gus.add(lock);
  }

  // White baker's hat: a band with a puffed top.
  const hatBand = meshCyl(0.16, 0.17, 0.14, PALETTE.hatWhite);
  hatBand.position.set(0, 1.68, 0);
  gus.add(hatBand);
  const hatPuff = meshSphere(0.19, PALETTE.hatWhite);
  hatPuff.position.set(0, 1.82, 0);
  gus.add(hatPuff);

  // Face: pink cheeks and dark eyes, set on the +z side so she faces the room.
  for (const s of [-1, 1]) {
    const cheek = meshSphere(0.035, PALETTE.cheekPink);
    cheek.position.set(s * 0.09, 1.49, 0.16);
    gus.add(cheek);
    const eye = meshSphere(0.025, "#3a2a20");
    eye.position.set(s * 0.07, 1.55, 0.17);
    gus.add(eye);
  }

  return gus;
}

// ---- Mr. Reyes, who owns the surf shop. Board shorts and sandals, a tee, short
// hair under a ball cap, standing at GUS_SPOT facing the room (+z). Built from
// the same shape helpers so he matches the rest of the shop. ----
function buildReyesFigure(): Group {
  const g = new Group();

  // Board shorts: two short legs, with sandals.
  for (const s of [-1, 1]) {
    const leg = meshCyl(0.1, 0.1, 0.55, PALETTE.reyesShorts);
    leg.position.set(s * 0.12, 0.4, 0);
    g.add(leg);
    const shoe = meshBox(0.16, 0.08, 0.26, "#3a2a20");
    shoe.position.set(s * 0.12, 0.07, 0.04);
    g.add(shoe);
  }

  // Tee shirt torso.
  const torso = meshCyl(0.22, 0.24, 0.6, PALETTE.reyesShirt);
  torso.position.set(0, 1.0, 0);
  g.add(torso);

  // Arms and hands.
  for (const s of [-1, 1]) {
    const arm = meshCyl(0.06, 0.06, 0.45, PALETTE.reyesShirt);
    arm.position.set(s * 0.27, 1.05, 0);
    g.add(arm);
    const hand = meshSphere(0.06, PALETTE.reyesSkin);
    hand.position.set(s * 0.27, 0.82, 0);
    g.add(hand);
  }

  // Head with short hair.
  const head = meshSphere(0.19, PALETTE.reyesSkin);
  head.position.set(0, 1.5, 0);
  g.add(head);
  const hair = meshSphere(0.2, PALETTE.reyesHair);
  hair.scale.set(1, 0.7, 1);
  hair.position.set(0, 1.57, -0.02);
  g.add(hair);

  // A cap: a round crown and a short brim facing the room (+z).
  const crown = meshCyl(0.18, 0.19, 0.14, PALETTE.reyesCap);
  crown.position.set(0, 1.64, 0);
  g.add(crown);
  const brim = meshBox(0.3, 0.04, 0.18, PALETTE.reyesCap);
  brim.position.set(0, 1.6, 0.2);
  g.add(brim);

  // Eyes on the +z side so he faces the room.
  for (const s of [-1, 1]) {
    const eye = meshSphere(0.025, "#3a2a20");
    eye.position.set(s * 0.07, 1.52, 0.17);
    g.add(eye);
  }

  return g;
}

// ---- Ms. Okafor, who owns the repair shop. A work skirt and teal smock under a
// light apron with a screwdriver in the pocket, hair gathered into a bun, glasses
// across the eyes, standing at GUS_SPOT facing the room (+z). ----
function buildOkaforFigure(): Group {
  const g = new Group();

  // Work skirt and a teal smock bodice.
  const skirt = meshCone(0.4, 0.9, PALETTE.okaforSkirt);
  skirt.position.set(0, 0.45, 0);
  g.add(skirt);
  const bodice = meshCyl(0.2, 0.24, 0.5, PALETTE.okaforSmock);
  bodice.position.set(0, 1.05, 0);
  g.add(bodice);

  // A light apron with a pocket and a screwdriver tucked in it.
  const apron = meshBox(0.4, 0.72, 0.05, PALETTE.okaforApron);
  apron.position.set(0, 0.76, 0.34);
  g.add(apron);
  const pocket = meshBox(0.22, 0.16, 0.04, PALETTE.okaforSmock);
  pocket.position.set(0, 0.64, 0.37);
  g.add(pocket);
  const driver = meshCyl(0.014, 0.014, 0.18, "#d0d4d8");
  driver.position.set(0.06, 0.78, 0.39);
  g.add(driver);
  const driverGrip = meshBox(0.04, 0.06, 0.04, PALETTE.boardRed);
  driverGrip.position.set(0.06, 0.86, 0.39);
  g.add(driverGrip);

  // Arms and hands.
  for (const s of [-1, 1]) {
    const arm = meshCyl(0.06, 0.06, 0.45, PALETTE.okaforSmock);
    arm.position.set(s * 0.26, 1.05, 0);
    g.add(arm);
    const hand = meshSphere(0.06, PALETTE.okaforSkin);
    hand.position.set(s * 0.26, 0.82, 0);
    g.add(hand);
  }

  // Head, hair gathered into a bun.
  const head = meshSphere(0.19, PALETTE.okaforSkin);
  head.position.set(0, 1.52, 0);
  g.add(head);
  const hairBack = meshSphere(0.21, PALETTE.okaforHair);
  hairBack.position.set(0, 1.52, -0.05);
  g.add(hairBack);
  const bun = meshSphere(0.11, PALETTE.okaforHair);
  bun.position.set(0, 1.68, -0.12);
  g.add(bun);

  // Glasses across the eyes, then the eyes and a touch of cheek, on the +z side.
  const glasses = meshBox(0.26, 0.05, 0.03, "#2a2a2a");
  glasses.position.set(0, 1.52, 0.17);
  g.add(glasses);
  for (const s of [-1, 1]) {
    const eye = meshSphere(0.022, "#3a2a20");
    eye.position.set(s * 0.07, 1.52, 0.16);
    g.add(eye);
    const cheek = meshSphere(0.03, PALETTE.cheekPink);
    cheek.position.set(s * 0.1, 1.48, 0.15);
    g.add(cheek);
  }

  return g;
}

// ============================================================================
// SHOP FURNITURE  —  the two fixtures the panels anchor to. The sales counter
// (with its little register) stands at the bank station, where the Morning and
// Daily Report panels appear; the display shelf of products stands at the
// business station, where the Midday panel appears. Each is a Group built around
// its own local origin, then dropped at its station the same way Gus's cart is.
// ============================================================================

// The sales counter: a glass bakery display case. A warm wood base carries a
// darker wood lip; a low-opacity glass box sits on the lip with little cakes,
// cupcakes, and a chocolate loaf arranged inside; a register sits at one end.
function buildSalesCounter(world: any) {
  const g = new Group();

  const base = meshBox(2.6, 0.9, 0.7, PALETTE.woodWarm);
  base.position.set(0, 0.45, 0);
  g.add(base);

  const lip = meshBox(2.7, 0.08, 0.75, PALETTE.woodDark2);
  lip.position.set(0, 0.93, 0);
  g.add(lip);

  // The glass case: see-through so the treats inside read clearly.
  const glassCase = new Mesh(
    new BoxGeometry(2.5, 0.55, 0.65),
    new MeshLambertMaterial({ color: new Color(PALETTE.caseGlass), transparent: true, opacity: 0.22 }),
  );
  glassCase.position.set(0, 1.22, 0);
  g.add(glassCase);

  // ---- Treats inside the case, resting on the lip (~y 1.05), spread along x. ----
  // Two round cakes, each with a cherry on top.
  for (const cx of [-0.9, 0.3]) {
    const cake = meshCyl(0.18, 0.18, 0.16, PALETTE.frostCream);
    cake.position.set(cx, 1.05, 0.06);
    g.add(cake);
    const cherry = meshSphere(0.05, PALETTE.cherryRed);
    cherry.position.set(cx, 1.16, 0.06);
    g.add(cherry);
  }
  // Two cupcakes: a dark wrapper topped with a dome of pink frosting.
  for (const ux of [-0.5, 0.6]) {
    const cup = meshCyl(0.1, 0.13, 0.14, PALETTE.woodDark2);
    cup.position.set(ux, 1.05, -0.06);
    g.add(cup);
    const frosting = meshSphere(0.13, PALETTE.frostPink);
    frosting.position.set(ux, 1.18, -0.06);
    g.add(frosting);
  }
  // One chocolate loaf, a squashed sphere.
  const loaf = meshSphere(0.14, PALETTE.chocolate);
  loaf.scale.set(1.6, 0.8, 1);
  loaf.position.set(-0.05, 1.06, 0);
  g.add(loaf);

  // A small register at one end of the base top.
  const registerBody = meshBox(0.4, 0.28, 0.32, "#3a4654");
  registerBody.position.set(0.95, 1.05, 0);
  g.add(registerBody);

  const e = world.createTransformEntity(g);
  e.object3D!.position.set(STATIONS.bank.x, 0, STATIONS.bank.z);
  e.object3D!.rotation.y = STATIONS.bank.faceY;
}

// The display shelf: a back board and three shelf boards stocked with bakery
// goods — bread loaves, baguettes on their side, and frosted cupcakes — resting
// on each board (z ~0.25). Every shelf carries all three for a full window.
function buildDisplayShelf(world: any) {
  const g = new Group();

  const backBoard = meshBox(2.4, 2.2, 0.12, PALETTE.shopTrim);
  backBoard.position.set(0, 1.1, 0);
  g.add(backBoard);

  for (const sy of [0.7, 1.3, 1.9]) {
    const shelf = meshBox(2.4, 0.08, 0.5, PALETTE.counterTop);
    shelf.position.set(0, sy, 0.25);
    g.add(shelf);
  }

  // A round loaf of crusty bread, squashed into a loaf shape.
  function addLoaf(x: number, boardTop: number) {
    const loaf = meshSphere(0.16, PALETTE.breadCrust);
    loaf.scale.set(1.7, 0.85, 1);
    loaf.position.set(x, boardTop + 0.14, 0.25);
    g.add(loaf);
  }
  // A baguette lying on its side across the shelf.
  function addBaguette(x: number, boardTop: number) {
    const bag = meshCyl(0.06, 0.06, 0.7, PALETTE.breadCrust);
    bag.rotation.z = Math.PI / 2;
    bag.position.set(x, boardTop + 0.06, 0.25);
    g.add(bag);
  }
  // A cupcake: cream cup with a dome of pink frosting.
  function addCupcake(x: number, boardTop: number) {
    const cup = meshCyl(0.09, 0.12, 0.13, PALETTE.frostCream);
    cup.position.set(x, boardTop + 0.065, 0.25);
    g.add(cup);
    const frosting = meshSphere(0.12, PALETTE.frostPink);
    frosting.position.set(x, boardTop + 0.2, 0.25);
    g.add(frosting);
  }

  // Each shelf board's top surface (board sits at sy, 0.08 tall). A rotating mix
  // so no two shelves read the same across x = -0.7 / 0 / 0.7.
  const lowTop = 0.7 + 0.04;
  addLoaf(-0.7, lowTop);
  addBaguette(0, lowTop);
  addCupcake(0.7, lowTop);

  const midTop = 1.3 + 0.04;
  addBaguette(-0.7, midTop);
  addCupcake(0, midTop);
  addLoaf(0.7, midTop);

  const topTop = 1.9 + 0.04;
  addCupcake(-0.7, topTop);
  addLoaf(0, topTop);
  addBaguette(0.7, topTop);

  const e = world.createTransformEntity(g);
  e.object3D!.position.set(STATIONS.business.x, 0, STATIONS.business.z);
  e.object3D!.rotation.y = STATIONS.business.faceY;
}

// ----------------------------------------------------------------------------
// SURF COUNTER  —  a wood stand with three surfboards leaning in a back rail and
// a small register, standing where the bakery case stands (the bank station).
// ----------------------------------------------------------------------------
function buildSurfCounter(world: any) {
  const g = new Group();

  const base = meshBox(2.6, 0.9, 0.7, PALETTE.woodWarm);
  base.position.set(0, 0.45, 0);
  g.add(base);
  const lip = meshBox(2.7, 0.08, 0.78, PALETTE.woodDark2);
  lip.position.set(0, 0.93, 0);
  g.add(lip);

  // A back rail the boards lean against.
  const rail = meshBox(2.4, 0.1, 0.1, PALETTE.woodDark2);
  rail.position.set(0, 1.75, -0.22);
  g.add(rail);

  // Three boards: elongated flat ellipsoids, fanned slightly, each with a fin.
  const boardColors = [PALETTE.boardRed, PALETTE.boardYellow, PALETTE.boardTeal];
  let i = 0;
  for (const bx of [-0.7, 0, 0.7]) {
    const board = meshSphere(0.5, boardColors[i % 3]);
    board.scale.set(0.5, 2.0, 0.12);
    board.position.set(bx, 1.55, -0.1);
    board.rotation.z = bx * 0.14;
    g.add(board);
    const fin = meshCone(0.06, 0.16, "#2a2a2a");
    fin.position.set(bx, 0.66, 0.0);
    g.add(fin);
    i = i + 1;
  }

  const reg = meshBox(0.4, 0.28, 0.32, PALETTE.register);
  reg.position.set(0.95, 1.05, 0);
  g.add(reg);

  const e = world.createTransformEntity(g);
  e.object3D!.position.set(STATIONS.bank.x, 0, STATIONS.bank.z);
  e.object3D!.rotation.y = STATIONS.bank.faceY;
}

// ----------------------------------------------------------------------------
// SURF SHELF  —  the same three-board shelf shape as the bakery, stocked with
// wetsuits, rash guards, wax, and sunscreen, at the business station.
// ----------------------------------------------------------------------------
function buildSurfShelf(world: any) {
  const g = new Group();

  const backBoard = meshBox(2.4, 2.2, 0.12, PALETTE.shopTrim);
  backBoard.position.set(0, 1.1, 0);
  g.add(backBoard);
  for (const sy of [0.7, 1.3, 1.9]) {
    const shelf = meshBox(2.4, 0.08, 0.5, PALETTE.counterTop);
    shelf.position.set(0, sy, 0.25);
    g.add(shelf);
  }

  function wetsuit(x: number, top: number) {
    const w = meshBox(0.3, 0.52, 0.1, "#243240");
    w.position.set(x, top + 0.28, 0.25);
    g.add(w);
  }
  function rashguard(x: number, top: number, color: string) {
    const r = meshBox(0.34, 0.34, 0.08, color);
    r.position.set(x, top + 0.21, 0.25);
    g.add(r);
  }
  function waxStack(x: number, top: number) {
    const c = meshBox(0.16, 0.12, 0.16, "#f0ead2");
    c.position.set(x, top + 0.1, 0.25);
    g.add(c);
  }
  function sunscreen(x: number, top: number) {
    const s = meshCyl(0.06, 0.06, 0.2, "#f2a93a");
    s.position.set(x, top + 0.14, 0.25);
    g.add(s);
  }

  const lowTop = 0.74;
  wetsuit(-0.7, lowTop); rashguard(0, lowTop, PALETTE.boardRed); sunscreen(0.7, lowTop);
  const midTop = 1.34;
  rashguard(-0.7, midTop, PALETTE.boardTeal); waxStack(0, midTop); wetsuit(0.7, midTop);
  const topTop = 1.94;
  sunscreen(-0.7, topTop); wetsuit(0, topTop); rashguard(0.7, topTop, PALETTE.boardYellow);

  const e = world.createTransformEntity(g);
  e.object3D!.position.set(STATIONS.business.x, 0, STATIONS.business.z);
  e.object3D!.rotation.y = STATIONS.business.faceY;
}

// ----------------------------------------------------------------------------
// REPAIR COUNTER  —  a worktop with a parts tray, a phone laid open for repair,
// a tablet propped up on a small stand, and a register, at the bank station.
// ----------------------------------------------------------------------------
function buildRepairCounter(world: any) {
  const g = new Group();

  const base = meshBox(2.6, 0.9, 0.7, PALETTE.woodWarm);
  base.position.set(0, 0.45, 0);
  g.add(base);
  const top = meshBox(2.7, 0.08, 0.78, "#9aa3ab");
  top.position.set(0, 0.93, 0);
  g.add(top);

  // A parts tray with a few small chips.
  const tray = meshBox(0.7, 0.06, 0.4, "#3a4048");
  tray.position.set(-0.6, 1.0, 0);
  g.add(tray);
  for (const px of [-0.78, -0.6, -0.42]) {
    const chip = meshBox(0.08, 0.04, 0.08, PALETTE.boardTeal);
    chip.position.set(px, 1.05, 0.0);
    g.add(chip);
  }

  // A phone laid open on the bench, screen up.
  const phone = meshBox(0.18, 0.03, 0.34, "#2a3038");
  phone.position.set(0.15, 1.0, 0.05);
  g.add(phone);
  const phoneScreen = meshBox(0.15, 0.012, 0.3, "#5fb0e0");
  phoneScreen.position.set(0.15, 1.02, 0.05);
  g.add(phoneScreen);

  // A tablet propped upright on a little stand, facing the room.
  const stand = meshBox(0.06, 0.18, 0.12, "#3a4048");
  stand.position.set(0.7, 1.02, -0.05);
  g.add(stand);
  const tablet = meshBox(0.34, 0.46, 0.03, "#2a3038");
  tablet.position.set(0.7, 1.28, 0.0);
  tablet.rotation.x = -0.18;
  g.add(tablet);
  const tabletScreen = meshBox(0.3, 0.4, 0.012, "#7fd0f0");
  tabletScreen.position.set(0.7, 1.28, 0.02);
  tabletScreen.rotation.x = -0.18;
  g.add(tabletScreen);

  const reg = meshBox(0.4, 0.28, 0.32, PALETTE.register);
  reg.position.set(0.98, 1.05, 0);
  g.add(reg);

  const e = world.createTransformEntity(g);
  e.object3D!.position.set(STATIONS.bank.x, 0, STATIONS.bank.z);
  e.object3D!.rotation.y = STATIONS.bank.faceY;
}

// ----------------------------------------------------------------------------
// REPAIR SHELF  —  the three-board shelf stocked with phones, tablets, and
// open laptops, at the business station.
// ----------------------------------------------------------------------------
function buildRepairShelf(world: any) {
  const g = new Group();

  const backBoard = meshBox(2.4, 2.2, 0.12, PALETTE.shopTrim);
  backBoard.position.set(0, 1.1, 0);
  g.add(backBoard);
  for (const sy of [0.7, 1.3, 1.9]) {
    const shelf = meshBox(2.4, 0.08, 0.5, PALETTE.counterTop);
    shelf.position.set(0, sy, 0.25);
    g.add(shelf);
  }

  function phone(x: number, top: number, screen: string) {
    const b = meshBox(0.16, 0.3, 0.03, "#2a3038");
    b.position.set(x, top + 0.18, 0.25);
    g.add(b);
    const s = meshBox(0.13, 0.26, 0.012, screen);
    s.position.set(x, top + 0.19, 0.27);
    g.add(s);
  }
  function tablet(x: number, top: number) {
    const b = meshBox(0.3, 0.4, 0.03, "#2a3038");
    b.position.set(x, top + 0.23, 0.25);
    g.add(b);
    const s = meshBox(0.26, 0.36, 0.012, "#7fd0f0");
    s.position.set(x, top + 0.24, 0.27);
    g.add(s);
  }
  function laptop(x: number, top: number) {
    const base2 = meshBox(0.42, 0.03, 0.3, "#b8bfc6");
    base2.position.set(x, top + 0.06, 0.22);
    g.add(base2);
    const screen = meshBox(0.42, 0.28, 0.02, "#b8bfc6");
    screen.position.set(x, top + 0.2, 0.1);
    screen.rotation.x = -0.32;
    g.add(screen);
    const lit = meshBox(0.37, 0.23, 0.012, "#5fb0e0");
    lit.position.set(x, top + 0.2, 0.115);
    lit.rotation.x = -0.32;
    g.add(lit);
  }

  const lowTop = 0.74;
  phone(-0.75, lowTop, PALETTE.boardTeal); laptop(0.25, lowTop);
  const midTop = 1.34;
  tablet(-0.7, midTop); phone(0.15, midTop, "#5fb0e0"); phone(0.7, midTop, PALETTE.boardYellow);
  const topTop = 1.94;
  laptop(-0.45, topTop); tablet(0.55, topTop);

  const e = world.createTransformEntity(g);
  e.object3D!.position.set(STATIONS.business.x, 0, STATIONS.business.z);
  e.object3D!.rotation.y = STATIONS.business.faceY;
}

// ============================================================================
// AMBIENT LIFE  —  a dog, a stroller, and two birds, so Main Street feels
// lived in. None of this changes the lesson; it is set dressing. Everything
// moves on one gentle loop, and it shares no state with the game. No new imports.
// ============================================================================
function buildDog() {
  const d = new Group();
  const body = meshBox(0.5, 0.26, 0.22, "#8a5a2b"); body.position.set(0, 0.3, 0); d.add(body);
  const head = meshBox(0.2, 0.2, 0.2, "#8a5a2b"); head.position.set(0.32, 0.36, 0); d.add(head);
  const snout = meshBox(0.12, 0.1, 0.1, "#6e4420"); snout.position.set(0.45, 0.31, 0); d.add(snout);
  for (const ez of [0.07, -0.07]) {
    const ear = meshBox(0.05, 0.12, 0.08, "#6e4420");
    ear.position.set(0.28, 0.48, ez);
    d.add(ear);
  }
  const tail = meshBox(0.18, 0.05, 0.05, "#8a5a2b"); tail.position.set(-0.3, 0.4, 0); tail.rotation.z = 0.7; d.add(tail);
  for (const lp of [[0.18, 0.09], [0.18, -0.09], [-0.18, 0.09], [-0.18, -0.09]]) {
    const leg = meshBox(0.07, 0.22, 0.07, "#6e4420");
    leg.position.set(lp[0], 0.11, lp[1]);
    d.add(leg);
  }
  return d;
}

function buildPasserby() {
  const p = new Group();
  const legs = meshCyl(0.1, 0.13, 0.5, "#39404c", 8); legs.position.set(0, 0.25, 0); p.add(legs);
  const coat = meshCyl(0.17, 0.13, 0.52, "#3a6ea5", 10); coat.position.set(0, 0.73, 0); p.add(coat);
  const head = meshSphere(0.13, "#e0b48c", 12); head.position.set(0, 1.04, 0); p.add(head);
  const hat = meshCyl(0.15, 0.15, 0.08, "#2b3550", 10); hat.position.set(0, 1.16, 0); p.add(hat);
  return p;
}

function buildBird(bodyColor: string) {
  const g = new Group();
  const body = meshSphere(0.12, bodyColor, 10); body.scale.set(1.3, 1, 1); g.add(body);
  const head = meshSphere(0.08, bodyColor, 10); head.position.set(0.13, 0.05, 0); g.add(head);
  const beak = meshCone(0.04, 0.09, "#e0a020", 8); beak.position.set(0.22, 0.05, 0); beak.rotation.z = -Math.PI / 2; g.add(beak);
  const wingL = meshBox(0.16, 0.03, 0.1, bodyColor); wingL.position.set(-0.02, 0.05, 0.12); g.add(wingL);
  const wingR = meshBox(0.16, 0.03, 0.1, bodyColor); wingR.position.set(-0.02, 0.05, -0.12); g.add(wingR);
  return { group: g, wingL: wingL, wingR: wingR };
}

function buildAmbientLife(world: any) {
  // A dog trotting in front of the shops.
  const dogObj = world.createTransformEntity(buildDog()).object3D!;
  dogObj.position.set(0, 0, -2.8);

  // Someone strolling along the road.
  const personObj = world.createTransformEntity(buildPasserby()).object3D!;
  personObj.position.set(0, 0, -4.4);

  // Two birds circling above the street.
  const b1 = buildBird("#3a7bd5");
  const bird1Obj = world.createTransformEntity(b1.group).object3D!;
  const b2 = buildBird("#c0563f");
  const bird2Obj = world.createTransformEntity(b2.group).object3D!;

  let t = 0;
  setInterval(function () {
    t = t + 1;

    // Dog: trots back and forth, faces the way it walks, with a little bounce.
    dogObj.position.set(Math.sin(t * 0.025) * 1.75, Math.abs(Math.sin(t * 0.3)) * 0.05, -10.5);
    dogObj.rotation.y = Math.cos(t * 0.025) > 0 ? 0 : Math.PI;

    // Person: a slow stroll along the road.
    personObj.position.set(Math.sin(t * 0.015) * 6.0, 0, -9.6);

    // Bird 1: a wide circle with flapping wings.
    const a1 = t * 0.03;
    bird1Obj.position.set(Math.cos(a1) * 5.0, 3.4 + Math.sin(t * 0.1) * 0.3, -12 + Math.sin(a1) * 4.0);
    bird1Obj.rotation.y = -a1;
    const flap1 = Math.sin(t * 0.8) * 0.6;
    b1.wingL.rotation.x = flap1;
    b1.wingR.rotation.x = -flap1;

    // Bird 2: a smaller, offset circle.
    const a2 = t * 0.026 + 2.0;
    bird2Obj.position.set(2 + Math.cos(a2) * 4.0, 3.9 + Math.sin(t * 0.12) * 0.3, -12 + Math.sin(a2) * 3.2);
    bird2Obj.rotation.y = -a2;
    const flap2 = Math.sin(t * 0.9) * 0.6;
    b2.wingL.rotation.x = flap2;
    b2.wingR.rotation.x = -flap2;
  }, 33);
}

// ----------------------------------------------------------------------------
// buildBaseWorld  —  the parts that are the same no matter which shop you run:
// the sky and lights, the walkable floor, the walls, and the street outside the
// window. Returns the floor (ground) and walls (boundary) so index.ts can make
// them locomotion collision, exactly as before.
// ----------------------------------------------------------------------------
export function buildBaseWorld(world: any) {
  buildSkyAndLights(world);
  const ground = buildShopFloor(world);
  const boundary = buildShopWalls(world);
  const street = buildSkyline(world); // Module 9: city skyline seen through the far-wall window
  buildCeiling(world);  // Module 9: flat white ceiling + recessed light panels
  buildPendants(world); // Module 9: three pendant lights over the plan stations
  buildFurniture(world); // Module 9: lounge, plants, and wall accents (decor only)
  return { ground, boundary, street };
}

// ============================================================================
// MODULE 9 STATION MARKERS  —  a small labeled pedestal at each studio spot.
// Static markers only (no clicking yet). The label is a textured plane drawn
// with makeSignTexture — the same canvas-texture path the storefront sign uses —
// so it renders in 3D and stays readable in the headset (a DOM/HTML label would
// only show on the laptop). Positions come from the STUDIO STATION SPOTS block.
// ============================================================================

// One marker: a small wood pedestal (about the height of a Module 8 station
// fixture) with its label floating on a textured plane above it. The label faces
// +z, toward where the player spawns and looks down the room.
function buildStationMarker(
  world: any,
  spot: { x: number; y: number; z: number },
  label: string,
) {
  const g = new Group();

  // Pedestal: a wide round plinth, a column, and a flat top cap.
  const base = meshCyl(0.42, 0.5, 0.16, PALETTE.woodWarm);
  base.position.set(0, 0.08, 0);
  g.add(base);
  const column = meshCyl(0.2, 0.24, 0.82, PALETTE.woodDark2);
  column.position.set(0, 0.57, 0);
  g.add(column);
  const cap = meshBox(0.62, 0.1, 0.62, PALETTE.woodWarm);
  cap.position.set(0, 1.03, 0);
  g.add(cap);

  // Floating label above the pedestal. The plane is ~3:1 to match the sign
  // texture's shape so the word is not stretched. DoubleSide so it reads from
  // either side; makeSignTexture draws navy text on a cream board.
  const labelPlane = new Mesh(
    new PlaneGeometry(1.3, 0.44),
    new MeshBasicMaterial({ map: makeSignTexture(label), side: DoubleSide }),
  );
  labelPlane.position.set(0, 1.7, 0);
  g.add(labelPlane);

  const e = world.createTransformEntity(g);
  e.object3D!.position.set(spot.x, spot.y, spot.z);
}

// Build all three studio station markers. Called once from index.ts at startup.
export function buildStationMarkers(world: any) {
  buildStationMarker(world, PRODUCT_SPOT, "Product");
  buildStationMarker(world, PRICE_SPOT, "Price");
  buildStationMarker(world, MARKETING_SPOT, "Marketing");
}

// ============================================================================
// MODULE 9 CAST  —  the three investors and the host. Built from the same shape
// primitives as the Module 8 owners, but as their own figures: a shared business
// figure for the three investors (one model, one scale, so they match in size)
// and a separate friendly greeter for the host. Static: each figure is turned
// once to face the player's spawn. No interactivity.
// ============================================================================

// Where the player spawns (mirrors locomotion.initialPlayerPosition in index.ts);
// used only to turn the cast toward the arriving player.
const PLAYER_SPAWN = { x: 0, z: 7 };

// Yaw that turns a +z-facing figure to face the spawn point — computed once, so it
// stays static. Same atan2 convention index.ts uses to face panels at the player.
function faceSpawnY(x: number, z: number): number {
  return Math.atan2(PLAYER_SPAWN.x - x, PLAYER_SPAWN.z - z);
}

// Drop a prebuilt figure Group at a spot, turned to face the player. Returns the
// created entity so callers can keep a handle on it (e.g. to animate a reaction).
function placeFigure(
  world: any,
  figure: Group,
  spot: { x: number; y: number; z: number },
) {
  const e = world.createTransformEntity(figure);
  e.object3D!.position.set(spot.x, spot.y, spot.z);
  e.object3D!.rotation.y = faceSpawnY(spot.x, spot.z);
  return e;
}

// ---- The investor figure: one shared business person — a blazer over a blouse
// or a shirt-and-tie, with feet on the floor — drawn as THREE distinct people. The
// body and scale are identical across the trio (so they still match across the
// desk); only the hairstyle, hair/skin color, and neckline vary, which is exactly
// what reads above the desk top. `style` picks the hairstyle (also the main gender
// cue), `tie` adds a tie for the shirt-and-tie reads, `earrings` adds small studs.
// Built at its local origin with feet at y = 0, facing +z, from the same shape
// helpers as the rest of the cast. ----
type HairStyle = "crop" | "long" | "bun";
interface InvestorOpts {
  jacket: string;     // blazer color (also legs/sleeves, so the figure stays one piece)
  top: string;        // blouse / dress shirt shown in the open front of the blazer
  skin: string;
  hair: string;
  style: HairStyle;   // hairstyle — the strongest individuality / gender cue
  tie?: string;       // a slim tie down the neckline (a shirt-and-tie read); omit for an open blouse
  earrings?: string;  // small studs at the ears (a soft feminine cue); optional
}
function buildInvestorFigure(opts: InvestorOpts): Group {
  const g = new Group();

  // Lower body (hidden behind the judges' desk): two legs in the jacket color with
  // dark dress shoes, feet on the floor. Kept identical across all three so scale
  // and footing match.
  for (const s of [-1, 1]) {
    const leg = meshCyl(0.1, 0.11, 0.72, opts.jacket);
    leg.position.set(s * 0.13, 0.43, 0);
    g.add(leg);
    const shoe = meshBox(0.17, 0.09, 0.28, "#23282e");
    shoe.position.set(s * 0.13, 0.045, 0.05);
    g.add(shoe);
  }

  // Blazer torso.
  const torso = meshCyl(0.27, 0.22, 0.62, opts.jacket);
  torso.position.set(0, 1.1, 0);
  g.add(torso);

  // The blouse / dress shirt shown in the open front of the blazer — ONE clean
  // panel sitting proud of the chest in the `top` color. (The old figure stacked a
  // shirt box, a collar box, a tie, and two outward-angled lapel slabs that winged
  // out past the body — that is what made the clothing look strange. This is a tidy
  // neckline instead.)
  const front = meshBox(0.16, 0.42, 0.05, opts.top);
  front.position.set(0, 1.16, 0.25);
  g.add(front);

  // A neat blazer lapel: two short bands in the jacket color that form a shallow V
  // at the throat. They stay INSIDE the body silhouette and flush to the chest, so
  // they frame the neckline without jutting out.
  for (const s of [-1, 1]) {
    const lapel = meshBox(0.08, 0.34, 0.05, opts.jacket);
    lapel.position.set(s * 0.1, 1.2, 0.255);
    lapel.rotation.z = -s * 0.14;
    g.add(lapel);
  }

  // A slim tie for the shirt-and-tie investors; left off for an open blouse.
  if (opts.tie) {
    const tie = meshBox(0.045, 0.34, 0.02, opts.tie);
    tie.position.set(0, 1.18, 0.285);
    g.add(tie);
  }

  // Jacket sleeves and hands.
  for (const s of [-1, 1]) {
    const arm = meshCyl(0.07, 0.07, 0.5, opts.jacket);
    arm.position.set(s * 0.3, 1.12, 0);
    g.add(arm);
    const hand = meshSphere(0.07, opts.skin);
    hand.position.set(s * 0.3, 0.84, 0);
    g.add(hand);
  }

  // Neck and head.
  const neck = meshCyl(0.07, 0.07, 0.12, opts.skin);
  neck.position.set(0, 1.47, 0);
  g.add(neck);
  const head = meshSphere(0.18, opts.skin);
  head.position.set(0, 1.62, 0);
  g.add(head);

  // Hair — a real, full style (never the old flat skullcap), chosen by `style`.
  buildHair(g, opts.style, opts.hair);

  // Eyes on the +z side so the investor faces the player.
  for (const s of [-1, 1]) {
    const eye = meshSphere(0.022, "#2a221c");
    eye.position.set(s * 0.07, 1.6, 0.165);
    g.add(eye);
  }

  // Optional small earrings — a soft extra cue that still reads at panel distance.
  if (opts.earrings) {
    for (const s of [-1, 1]) {
      const stud = meshSphere(0.02, opts.earrings);
      stud.position.set(s * 0.165, 1.55, 0.02);
      g.add(stud);
    }
  }

  return g;
}

// ---- Investor hairstyles, all built from the shared sphere/box helpers so they
// stay low-poly. Each is a distinct mass and silhouette so the trio reads as three
// different people and none look bald. The crowns are flattened and shifted back
// (like the rest of the cast's hair) so they sit ON the head without covering the
// face. ----
function buildHair(g: Group, style: HairStyle, color: string) {
  if (style === "crop") {
    // A full, rounded short cut — clearly hair, not a skullcap.
    const cap = meshSphere(0.2, color);
    cap.scale.set(1, 0.82, 1);
    cap.position.set(0, 1.67, -0.02);
    g.add(cap);
  } else if (style === "long") {
    // Shoulder-length: a rounded crown, a back mass dropping to the shoulders, and
    // two locks framing the face.
    const crown = meshSphere(0.2, color);
    crown.scale.set(1, 0.82, 1);
    crown.position.set(0, 1.67, -0.02);
    g.add(crown);
    const back = meshSphere(0.22, color);
    back.scale.set(1.05, 1.2, 0.9);
    back.position.set(0, 1.5, -0.08);
    g.add(back);
    for (const s of [-1, 1]) {
      const lock = meshBox(0.08, 0.32, 0.12, color);
      lock.position.set(s * 0.18, 1.45, 0.0);
      g.add(lock);
    }
  } else {
    // Swept-up: a smooth crown with a bun gathered at the back of the head.
    const crown = meshSphere(0.19, color);
    crown.scale.set(1, 0.82, 1.02);
    crown.position.set(0, 1.67, -0.02);
    g.add(crown);
    const bun = meshSphere(0.1, color);
    bun.position.set(0, 1.63, -0.16);
    g.add(bun);
  }
}

// ---- The studio host: a friendly greeter, deliberately NOT in a suit so a
// student can tell them apart from the investor panel at a glance. A clean, casual
// button-up shirt with ROLLED SLEEVES (bare forearms) and a lanyard name badge,
// neat chinos and white sneakers, friendly curly hair, and a warm smile — a
// guide, not a panelist. The bright shirt and rolled sleeves read as approachable
// against the investors' dark blazers, and the curly hair differs from all
// three of their styles (long / crop / bun). Same body and scale as the rest of
// the cast; feet at y = 0, facing +z. ----
function buildHostFigure(): Group {
  const g = new Group();

  const SHIRT = "#4a86c6";   // friendly sky blue — bright and clearly not a dark suit
  const TRIM = "#dce9f5";    // pale collar / placket / cuff trim
  const BUTTON = "#2f4a6b";  // small shirt buttons
  const CHINO = "#c2ac82";   // clean warm-stone chinos
  const SKIN = "#e3ab7e";
  const HAIR = "#5a3d28";    // warm medium brown — distinct from the investors' hair colors

  // Chinos with white casual sneakers (a thin gray sole) — relaxed, not dress shoes.
  for (const s of [-1, 1]) {
    const leg = meshCyl(0.1, 0.11, 0.72, CHINO);
    leg.position.set(s * 0.13, 0.43, 0);
    g.add(leg);
    const shoe = meshBox(0.17, 0.085, 0.28, "#ece8dd");
    shoe.position.set(s * 0.13, 0.06, 0.05);
    g.add(shoe);
    const sole = meshBox(0.18, 0.035, 0.3, "#8a8580");
    sole.position.set(s * 0.13, 0.02, 0.06);
    g.add(sole);
  }

  // Button-up shirt torso.
  const torso = meshCyl(0.25, 0.22, 0.62, SHIRT);
  torso.position.set(0, 1.1, 0);
  g.add(torso);

  // An open collar: a tidy band plus two small points forming a soft V at the neck.
  const collarBand = meshBox(0.24, 0.07, 0.09, TRIM);
  collarBand.position.set(0, 1.38, 0.13);
  g.add(collarBand);
  for (const s of [-1, 1]) {
    const point = meshBox(0.08, 0.13, 0.05, TRIM);
    point.position.set(s * 0.06, 1.31, 0.2);
    point.rotation.z = s * 0.3;
    g.add(point);
  }

  // A clean button placket down the center with a few small buttons.
  const placket = meshBox(0.05, 0.42, 0.04, TRIM);
  placket.position.set(0, 1.16, 0.235);
  g.add(placket);
  for (const y of [1.3, 1.21, 1.12]) {
    const button = meshSphere(0.014, BUTTON);
    button.position.set(0, y, 0.258);
    g.add(button);
  }

  // A lanyard (two straps) and a name badge — the clearest "studio host / greeter"
  // signal, and nothing the investors wear.
  for (const s of [-1, 1]) {
    const strap = meshBox(0.03, 0.34, 0.02, "#c0392b");
    strap.position.set(s * 0.08, 1.27, 0.24);
    strap.rotation.z = s * 0.12;
    g.add(strap);
  }
  const clip = meshBox(0.03, 0.03, 0.02, "#9aa0a6");
  clip.position.set(0, 1.15, 0.25);
  g.add(clip);
  const badge = meshBox(0.16, 0.11, 0.02, "#f4efe2");
  badge.position.set(0, 1.07, 0.25);
  g.add(badge);

  // Rolled-up sleeves: a short shirt sleeve with a light cuff, then a bare skin
  // forearm and hand — relaxed and approachable.
  for (const s of [-1, 1]) {
    const sleeve = meshCyl(0.07, 0.07, 0.26, SHIRT);
    sleeve.position.set(s * 0.29, 1.24, 0);
    g.add(sleeve);
    const cuff = meshCyl(0.076, 0.076, 0.05, TRIM);
    cuff.position.set(s * 0.29, 1.11, 0);
    g.add(cuff);
    const forearm = meshCyl(0.062, 0.062, 0.22, SKIN);
    forearm.position.set(s * 0.29, 0.99, 0);
    g.add(forearm);
    const hand = meshSphere(0.07, SKIN);
    hand.position.set(s * 0.29, 0.84, 0);
    g.add(hand);
  }

  // Neck and head.
  const neck = meshCyl(0.07, 0.07, 0.12, SKIN);
  neck.position.set(0, 1.47, 0);
  g.add(neck);
  const head = meshSphere(0.18, SKIN);
  head.position.set(0, 1.62, 0);
  g.add(head);

  // Short, curly hair: a rounded base topped with a cluster of small curls for a
  // friendly, textured look — clearly different from the investors' smooth long /
  // crop / bun styles (and kept above the brow so the face stays clear).
  const base = meshSphere(0.2, HAIR);
  base.scale.set(1, 0.82, 1);
  base.position.set(0, 1.67, -0.02);
  g.add(base);
  const topCurl = meshSphere(0.08, HAIR);
  topCurl.position.set(0, 1.83, -0.03);
  g.add(topCurl);
  // Symmetric curl pairs around the crown: [x, y, z, radius].
  const curls = [
    [0.1, 1.79, 0.07, 0.07],    // front pair, above the forehead
    [0.17, 1.72, -0.02, 0.07],  // side pair at the temples
    [0.09, 1.76, -0.14, 0.075], // back pair
    [0.05, 1.85, -0.08, 0.06],  // upper-back pair
  ];
  for (const [x, y, z, r] of curls) {
    for (const s of [-1, 1]) {
      const curl = meshSphere(r, HAIR);
      curl.position.set(s * x, y, z);
      g.add(curl);
    }
  }

  // Friendly face: eyes, rosy cheeks, and a small smile, all on the +z side.
  for (const s of [-1, 1]) {
    const eye = meshSphere(0.022, "#2a221c");
    eye.position.set(s * 0.07, 1.62, 0.165);
    g.add(eye);
    const cheek = meshSphere(0.03, "#e8a0a0");
    cheek.position.set(s * 0.09, 1.57, 0.155);
    g.add(cheek);
  }
  const smile = meshBox(0.08, 0.02, 0.02, "#7a4a3a");
  smile.position.set(0, 1.54, 0.17);
  g.add(smile);

  return g;
}

// Three investors standing in a row across the far end, all facing the player.
// One shared business figure (same model, same scale) so they match in size; the
// suit, shirt, tie, skin, and hair vary a little so they still read as three
// distinct people. Positions are unchanged (INVESTOR_1/2/3 in the spots block).
export function buildInvestors(world: any) {
  // A varied, believable panel: two women and one man, each a distinct silhouette
  // (different hairstyle, hair color, skin tone, and blazer) but the SAME shared
  // body and scale so the trio still matches across the desk. Positions are
  // unchanged (INVESTOR_1/2/3). Skin tones span light / medium / deep across the
  // three, and the hair colors span auburn / black / silver.

  // Investor 1 — woman: shoulder-length auburn hair, medium skin, burgundy blazer
  // over an ivory blouse, gold studs.
  const investor1 = placeFigure(world, buildInvestorFigure({
    jacket: "#6d2f43", top: "#efe7d8",
    skin: "#c8895a", hair: "#6e4327", style: "long", earrings: "#d8c27a",
  }), INVESTOR_1);

  // Investor 2 — man: short dark crop, deep skin, navy blazer over a white shirt
  // with a deep-red tie.
  const investor2 = placeFigure(world, buildInvestorFigure({
    jacket: "#243049", top: "#eef1f4", tie: "#7a2f37",
    skin: "#7a4f33", hair: "#1a1714", style: "crop",
  }), INVESTOR_2);

  // Investor 3 — woman: silver hair in a bun, light skin, charcoal blazer over a
  // slate-blue shell, small studs.
  const investor3 = placeFigure(world, buildInvestorFigure({
    jacket: "#3b4250", top: "#b9c6d6",
    skin: "#e6b48f", hair: "#9b9a92", style: "bun", earrings: "#cfcabd",
  }), INVESTOR_3);

  // Left -> middle -> right, the SAME order as INVESTOR_1/2/3, the meters, and the
  // priority labels. Returned so index.ts can lean an investor in when a card targets it.
  return [investor1, investor2, investor3];
}

// The host: a friendly greeter near the entrance, off to one side, facing the
// player — deliberately not in a suit so they stand apart from the panel. Position
// is unchanged (HOST_SPOT). No apron or pen.
export function buildHost(world: any) {
  placeFigure(world, buildHostFigure(), HOST_SPOT);
}

// P2 — the "Pitch Day" STAGE. One warm spotlight beam over each investor, built as a translucent
// open cone (narrow at the ceiling "source", widening down over the investor). Hidden until the
// pitch begins; setPitchStage() switches them on and dims the house lights so the panel is
// theatrically lit. Additive to the room — the investors, desk, and board are untouched.
export function buildStage(world: any) {
  const h = STAGE.SPOT_TOP_Y - STAGE.SPOT_BOTTOM_Y;
  const midY = (STAGE.SPOT_TOP_Y + STAGE.SPOT_BOTTOM_Y) / 2;
  for (const spot of [INVESTOR_1, INVESTOR_2, INVESTOR_3]) {
    const cone = new Mesh(
      new ConeGeometry(STAGE.SPOT_BASE_RADIUS, h, 20, 1, true), // open-ended: a beam, not a solid cone
      new MeshBasicMaterial({
        color: new Color(STAGE.SPOT_COLOR),
        transparent: true,
        opacity: STAGE.SPOT_OPACITY,
        side: DoubleSide,
        depthWrite: false,
        fog: false,
      }),
    );
    cone.position.set(spot.x, midY, spot.z); // tip lands at SPOT_TOP_Y, base at SPOT_BOTTOM_Y
    cone.renderOrder = 3;
    cone.visible = false;
    world.createTransformEntity(cone);
    pitchStageState.spots.push(cone);
  }
}

// Enter (on=true) or leave (on=false) the Pitch Day stage look: dim/restore the house lights,
// switch the investor spotlights on/off, and warm/cool the sky (the pitch STAGE_LOOK). Safe to
// call repeatedly.
export function setPitchStage(world: any, on: boolean) {
  pitchStageState.on = on;
  if (pitchStageState.ambient) pitchStageState.ambient.intensity = on ? pitchStageState.ambientBase * STAGE.DIM_FACTOR : pitchStageState.ambientBase;
  if (pitchStageState.ceiling) pitchStageState.ceiling.intensity = on ? pitchStageState.ceilingBase * STAGE.DIM_FACTOR : pitchStageState.ceilingBase;
  for (const cone of pitchStageState.spots) cone.visible = on;
  // Darken the big unlit surfaces (ceiling + skyline) so the house clearly reads "lights down".
  for (const d of pitchStageState.dimmables) {
    if (on) d.mat.color.copy(d.orig).multiplyScalar(STAGE.DIM_COLOR);
    else d.mat.color.copy(d.orig);
  }
  setStageLook(world, on ? "pitch" : "select");
}

// ----------------------------------------------------------------------------
// MODULE 9 JUDGES' DESK  —  one long, solid desk standing just in front of the
// three investors so the trio reads as a Shark Tank–style judging panel, with
// their lower bodies hidden behind it. Built from simple boxes (not HTML) so it
// shows in the headset, in the room's warm wood to match the station pedestals.
// Centered at DESK_POSITION and sized by DESK_WIDTH / DESK_HEIGHT / DESK_DEPTH.
// ----------------------------------------------------------------------------
export function buildJudgesDesk(world: any) {
  const g = new Group();

  // The solid desk body: a single box of exactly the requested size, centered on
  // the group origin so it spans y -0.5..+0.5 locally — which becomes y 0..1 once
  // the group is placed at DESK_POSITION (y 0.5), resting on the floor.
  const body = meshBox(DESK_WIDTH, DESK_HEIGHT, DESK_DEPTH, PALETTE.woodWarm);
  body.position.set(0, 0, 0);
  g.add(body);

  // A thin darker lip across the top edge — the same finish the sales counter and
  // station pedestals use — so the desk fits the room. Sits flush at the top.
  const lip = meshBox(DESK_WIDTH + 0.1, 0.08, DESK_DEPTH + 0.1, PALETTE.woodDark2);
  lip.position.set(0, DESK_HEIGHT / 2, 0);
  g.add(lip);

  const e = world.createTransformEntity(g);
  // Centered at DESK_POSITION, facing the player (+z) — a symmetric desk needs no turn.
  e.object3D!.position.set(DESK_POSITION.x, DESK_POSITION.y, DESK_POSITION.z);
}

// ----------------------------------------------------------------------------
// buildShopProps  —  the parts that change per shop: the storefront sign, the
// sales counter and its case, the display shelf, and the owner. For now this
// always builds the bakery; the surf and repair versions arrive in the next
// two stages, switched on the shop argument.
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// BAKERY SCENERY  —  café life in the open front of the room: two bistro tables
// with chairs, a specials board by the door, and two potted plants. Everything
// sits at z 4 and up, clear of the counter and shelf (z 0), the owner (z 1.6),
// and the walkway down the middle. Positions below are easy to nudge. Bakery only.
// ----------------------------------------------------------------------------
function buildBakeryScenery(world: any) {
  // Drop a finished group onto the floor at x,z, turned ry radians.
  function place(g: Group, x: number, z: number, ry: number) {
    const e = world.createTransformEntity(g);
    e.object3D!.position.set(x, 0, z);
    e.object3D!.rotation.y = ry;
  }

  // Round bistro table: metal base, slim pole, round wooden top (~0.76 tall).
  function table(): Group {
    const g = new Group();
    const base = meshCyl(0.26, 0.3, 0.05, "#6f6f6f");
    base.position.set(0, 0.03, 0);
    g.add(base);
    const pole = meshCyl(0.04, 0.04, 0.7, "#7c7c7c");
    pole.position.set(0, 0.4, 0);
    g.add(pole);
    const top = meshCyl(0.4, 0.4, 0.05, PALETTE.woodWarm);
    top.position.set(0, 0.76, 0);
    g.add(top);
    return g;
  }

  // Simple chair: seat, four legs, a low back. The back is on the -z side, so a
  // chair placed with ry 0 faces +z (toward the table in front of it).
  function chair(): Group {
    const g = new Group();
    const seat = meshBox(0.34, 0.05, 0.34, PALETTE.woodWarm);
    seat.position.set(0, 0.45, 0);
    g.add(seat);
    for (const lx of [-0.14, 0.14]) {
      for (const lz of [-0.14, 0.14]) {
        const leg = meshBox(0.045, 0.45, 0.045, PALETTE.woodDark2);
        leg.position.set(lx, 0.225, lz);
        g.add(leg);
      }
    }
    const back = meshBox(0.34, 0.42, 0.05, PALETTE.woodWarm);
    back.position.set(0, 0.68, -0.15);
    g.add(back);
    return g;
  }

  // Specials board: two posts holding a dark chalk slate. Faces +z at ry 0.
  function board(): Group {
    const g = new Group();
    for (const px of [-0.3, 0.3]) {
      const post = meshBox(0.05, 1.2, 0.05, PALETTE.woodDark2);
      post.position.set(px, 0.6, 0);
      g.add(post);
    }
    const frame = meshBox(0.74, 0.64, 0.06, PALETTE.woodWarm);
    frame.position.set(0, 1.0, 0);
    g.add(frame);
    const slate = meshBox(0.64, 0.54, 0.07, "#33403a");
    slate.position.set(0, 1.0, 0.015);
    g.add(slate);
    return g;
  }

  // Potted plant: terracotta pot, leafy dome.
  function plant(): Group {
    const g = new Group();
    const pot = meshCyl(0.17, 0.12, 0.3, "#b5654d");
    pot.position.set(0, 0.15, 0);
    g.add(pot);
    const leaves = meshSphere(0.3, PALETTE.leaf);
    leaves.position.set(0, 0.55, 0);
    g.add(leaves);
    return g;
  }

  // --- Placement (x, z, turn). Nudge these to taste. ---
  // The open floor BEYOND the counter (z below 0), toward the storefront windows.
  // The counter and shelf sit at z 0; the front wall is at z -8; this fills between.
  // Three tables with facing chairs, spread across the space.
  place(table(), -3.0, -2.0, 0);
  place(chair(), -3.0, -1.4, 0);
  place(chair(), -3.0, -2.6, Math.PI);
  place(table(), 3.0, -2.0, 0);
  place(chair(), 3.0, -1.4, 0);
  place(chair(), 3.0, -2.6, Math.PI);
  place(table(), 0, -4.8, 0);
  place(chair(), 0, -4.2, 0);
  place(chair(), 0, -5.4, Math.PI);

  // Specials board to one side of the seating, turned to face in.
  place(board(), -3.6, -4.6, Math.PI / 2);

  // Plants in the back corners, by the storefront windows.
  place(plant(), 4.6, -6.2, 0);
  place(plant(), -4.6, -6.2, 0);
}

// ----------------------------------------------------------------------------
// SURF SCENERY  —  Atlantic Avenue Surf Co. Fills the open floor beyond the
// counter (z below 0), toward the storefront windows: a board rack, two
// driftwood benches, a wetsuit on a stand, and beach grass. Surf only.
// ----------------------------------------------------------------------------
function buildSurfScenery(world: any) {
  function place(g: Group, x: number, z: number, ry: number) {
    const e = world.createTransformEntity(g);
    e.object3D!.position.set(x, 0, z);
    e.object3D!.rotation.y = ry;
  }

  // One surfboard standing on its tail: colored body, a stripe, a small fin.
  function surfboard(color: string, stripe: string, h: number): Group {
    const g = new Group();
    const body = meshBox(0.42, h, 0.07, color);
    body.position.set(0, h / 2 + 0.1, 0);
    g.add(body);
    const str = meshBox(0.07, h, 0.075, stripe);
    str.position.set(0, h / 2 + 0.1, 0.002);
    g.add(str);
    const fin = meshBox(0.04, 0.16, 0.14, "#243640");
    fin.position.set(0, 0.18, -0.08);
    g.add(fin);
    return g;
  }

  // A floor rack holding three boards upright in a row.
  function boardRack(): Group {
    const g = new Group();
    const base = meshBox(1.7, 0.14, 0.42, "#8a6a45");
    base.position.set(0, 0.07, 0);
    g.add(base);
    const rail = meshBox(1.7, 0.07, 0.07, "#6a4f30");
    rail.position.set(0, 1.2, -0.16);
    g.add(rail);
    const b1 = surfboard("#e8794a", "#fff3e0", 1.6);
    b1.position.set(-0.55, 0, 0);
    g.add(b1);
    const b2 = surfboard("#2a8aa8", "#eaf6f8", 1.5);
    b2.position.set(0, 0, 0);
    g.add(b2);
    const b3 = surfboard("#e94f64", "#ffe0e6", 1.55);
    b3.position.set(0.55, 0, 0);
    g.add(b3);
    return g;
  }

  // A weathered driftwood bench: seat, four legs, two back slats.
  function bench(): Group {
    const g = new Group();
    const seat = meshBox(1.4, 0.08, 0.4, "#a89478");
    seat.position.set(0, 0.45, 0);
    g.add(seat);
    for (const lx of [-0.6, 0.6]) {
      for (const lz of [-0.15, 0.15]) {
        const leg = meshBox(0.07, 0.45, 0.07, "#8a7860");
        leg.position.set(lx, 0.225, lz);
        g.add(leg);
      }
    }
    for (const by of [0.62, 0.78]) {
      const slat = meshBox(1.4, 0.08, 0.05, "#a89478");
      slat.position.set(0, by, -0.16);
      g.add(slat);
    }
    return g;
  }

  // A wetsuit hanging on a stand.
  function wetsuit(): Group {
    const g = new Group();
    const base = meshCyl(0.24, 0.28, 0.05, "#5a5a5a");
    base.position.set(0, 0.025, 0);
    g.add(base);
    const post = meshCyl(0.04, 0.04, 1.5, "#6a6a6a");
    post.position.set(0, 0.75, 0);
    g.add(post);
    const bar = meshBox(0.5, 0.04, 0.04, "#6a6a6a");
    bar.position.set(0, 1.45, 0);
    g.add(bar);
    const torso = meshBox(0.36, 0.5, 0.14, "#1f2a33");
    torso.position.set(0, 1.12, 0.04);
    g.add(torso);
    const stripe = meshBox(0.36, 0.06, 0.15, "#2a8aa8");
    stripe.position.set(0, 0.98, 0.04);
    g.add(stripe);
    for (const lx of [-0.1, 0.1]) {
      const leg = meshBox(0.14, 0.5, 0.12, "#1f2a33");
      leg.position.set(lx, 0.66, 0.04);
      g.add(leg);
    }
    return g;
  }

  // Beach grass in a sandy pot.
  function plant(): Group {
    const g = new Group();
    const pot = meshCyl(0.18, 0.13, 0.3, "#caa26a");
    pot.position.set(0, 0.15, 0);
    g.add(pot);
    for (const bx of [-0.07, 0, 0.07]) {
      for (const bz of [-0.06, 0.06]) {
        const blade = meshCone(0.05, 0.75, "#5aa46a");
        blade.position.set(bx, 0.62, bz);
        g.add(blade);
      }
    }
    return g;
  }

  // --- Placement (x, z, turn). Open floor beyond the counter; nudge to taste. ---
  place(boardRack(), 0, -5.2, 0);
  place(bench(), -3.2, -2.2, 0);
  place(bench(), 3.2, -2.2, 0);
  place(wetsuit(), -3.4, -4.6, 0);
  place(plant(), -4.6, -6.4, 0);
  place(plant(), 4.4, -5.2, 0);
}

// ----------------------------------------------------------------------------
// REPAIR SCENERY  —  Clarendon Device Repair. Fills the open floor beyond the
// counter (z below 0): a row of waiting seats, a tall parts shelf, a work table
// with a device on it, and two office plants. Repair only.
// ----------------------------------------------------------------------------
function buildRepairScenery(world: any) {
  function place(g: Group, x: number, z: number, ry: number) {
    const e = world.createTransformEntity(g);
    e.object3D!.position.set(x, 0, z);
    e.object3D!.rotation.y = ry;
  }

  // A row of three connected waiting-room seats on a metal frame.
  function waitingSeats(): Group {
    const g = new Group();
    const frame = "#7a828c";
    let sx = -0.7;
    for (let i = 0; i < 3; i++) {
      const seat = meshBox(0.46, 0.07, 0.44, "#46708c");
      seat.position.set(sx, 0.45, 0);
      g.add(seat);
      const back = meshBox(0.46, 0.42, 0.06, "#46708c");
      back.position.set(sx, 0.67, -0.19);
      g.add(back);
      sx += 0.7;
    }
    const rail = meshBox(2.25, 0.06, 0.1, frame);
    rail.position.set(0, 0.4, 0.1);
    g.add(rail);
    for (const lx of [-0.95, 0.95]) {
      const leg = meshBox(0.07, 0.4, 0.42, frame);
      leg.position.set(lx, 0.2, 0);
      g.add(leg);
    }
    return g;
  }

  // A tall parts shelf: four posts, three shelves, small colored boxes on each.
  function partsShelf(): Group {
    const g = new Group();
    const frame = "#5a626c";
    for (const px of [-0.7, 0.7]) {
      for (const pz of [-0.2, 0.2]) {
        const post = meshBox(0.06, 1.8, 0.06, frame);
        post.position.set(px, 0.9, pz);
        g.add(post);
      }
    }
    const cols = ["#46708c", "#c8704a", "#5aa46a", "#d6b24a", "#7a6aa8", "#4a90c8"];
    let ci = 0;
    for (const sy of [0.4, 0.9, 1.4]) {
      const shelf = meshBox(1.55, 0.05, 0.46, "#8a929c");
      shelf.position.set(0, sy, 0);
      g.add(shelf);
      for (const bx of [-0.45, 0, 0.45]) {
        const box = meshBox(0.3, 0.18, 0.3, cols[ci % cols.length]);
        box.position.set(bx, sy + 0.12, 0);
        g.add(box);
        ci++;
      }
    }
    return g;
  }

  // A small work table with a device and a tool on top.
  function workTable(): Group {
    const g = new Group();
    const top = meshBox(1.0, 0.06, 0.5, "#8a929c");
    top.position.set(0, 0.75, 0);
    g.add(top);
    for (const lx of [-0.42, 0.42]) {
      for (const lz of [-0.18, 0.18]) {
        const leg = meshBox(0.05, 0.75, 0.05, "#5a626c");
        leg.position.set(lx, 0.375, lz);
        g.add(leg);
      }
    }
    const device = meshBox(0.4, 0.03, 0.28, "#2a3038");
    device.position.set(-0.1, 0.79, 0);
    g.add(device);
    const screen = meshBox(0.34, 0.035, 0.22, "#4a90c8");
    screen.position.set(-0.1, 0.8, 0);
    g.add(screen);
    const tool = meshBox(0.16, 0.025, 0.03, "#c4c4c4");
    tool.position.set(0.28, 0.78, 0.1);
    g.add(tool);
    return g;
  }

  // A leafy office plant in a grey planter.
  function plant(): Group {
    const g = new Group();
    const pot = meshCyl(0.16, 0.13, 0.3, "#6a6f76");
    pot.position.set(0, 0.15, 0);
    g.add(pot);
    const f1 = meshSphere(0.32, "#4e8f5a");
    f1.position.set(0, 0.56, 0);
    g.add(f1);
    const f2 = meshSphere(0.22, "#5aa46a");
    f2.position.set(0.12, 0.72, 0.08);
    g.add(f2);
    return g;
  }

  // --- Placement (x, z, turn). Open floor beyond the counter; nudge to taste. ---
  place(waitingSeats(), -2.8, -2.2, 0);
  place(workTable(), 3.2, -2.4, 0);
  place(partsShelf(), 0, -5.8, 0);
  place(plant(), -4.4, -5.6, 0);
  place(plant(), 4.4, -5.6, 0);
}
