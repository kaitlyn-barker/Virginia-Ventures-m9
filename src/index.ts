// ============================================================================
// Money Moves: Your Financial Literacy
// FOUNDATION SHELL  —  rebuilt to match the Market Harvest (m4) house style.
// This file sets up:
//   1. The economic CONSTANTS (kept; the stages will read these)
//   2. The house colors (cream / navy / gold / green)
//   3. The three score meters and the HUD that shows them
//   4. The IWSDK world: a walkable, lit space, with mouse-look + WASD/thumbstick
//   5. The hidden-panel click guard and a press helper (needed once panels exist)
//   6. The phase machine skeleton (Select -> Morning -> Midday -> Afternoon -> Close)
// The stations, the mentor, the panels, and the stage logic arrive in later prompts.
// ============================================================================

import {
  World,
  SessionMode,
  LocomotionEnvironment,
  EnvironmentType,
  VisibilityState,
  PanelUI,
  PanelDocument,
  Interactable,
  Vector3,
  Box3,
  Mesh,
  Group,
  BoxGeometry,
  CircleGeometry,
  SphereGeometry,
  RingGeometry,
  MeshBasicMaterial,
  DoubleSide,
  Color,
} from "@iwsdk/core";

import { buildBaseWorld, buildStationMarkers, buildInvestors, buildHost, buildJudgesDesk, setStageLook, PLAN_BOARD, PRODUCT_SPOT, PRICE_SPOT, MARKETING_SPOT, INVESTOR_1, INVESTOR_2, INVESTOR_3 } from "./environment";
import { sfxStage, sfxClick, sfxCoin, sfxFanfare, sfxNotify, sfxDown } from "./sfx";


// ============================================================================
// MODULE 9 — PRODUCT STATION  —  the student's plan + tunable numbers
// `studentPlan` is the simple data object the studio stations fill in. Product is
// set here at the Product station; Price and Marketing arrive in later prompts.
// It is module scope so later code (and the plan board) can read it back.
// The constants below are the knobs this prompt asked to keep handy: where the
// four-card panel sits relative to the Product station, how big it and the cards
// are, and the color a card turns when it is chosen.
// ============================================================================
const studentPlan = {
  product: "",       // chosen option id: tech | delivery | tour | farm
  productLabel: "",  // the human-readable choice, e.g. "A farm fresh food stand"
  productShort: "",  // the short label for the plan board, e.g. "Farm stand"
  productRegion: "", // the Virginia region tied to the choice
  idea: "",          // chosen economic idea id: specialization | trade | opportunity
  ideaLabel: "",     // the human-readable idea, e.g. "Opportunity cost"
  // Price + Marketing are filled by the shared buildIdeaStation(), the same shape as
  // Product: a chosen option (id/label/short) plus its economic idea (id/label).
  price: "", priceLabel: "", priceShort: "", priceIdea: "", priceIdeaLabel: "",
  marketing: "", marketingLabel: "", marketingShort: "", marketingIdea: "", marketingIdeaLabel: "",
  // P0.2 — the two narrative slots that complete problem -> solution -> customer -> price -> ask.
  // `problem` is picked at the Product station (per-product options), `customer` at the Marketing
  // station. Short forms are phrased to slot mid-sentence in the pitch ("solves <problemShort>
  // for <customerShort>").
  problem: "", problemLabel: "", problemShort: "",
  customer: "", customerLabel: "", customerShort: "",
  // The pitch the student delivers to the investors, filled in part by part: the
  // opening (Part 1), the economic case (Part 2), and the ask (Part 3). Each part stores
  // the full line the student tapped AND which investor that card targets (smartMoney |
  // customers | lowRisk). There are no wrong answers; `complete` flips true after Part 3.
  pitch: {
    opening: "", openingInvestor: "", // Part 1 — the opening
    case: "", caseInvestor: "",       // Part 2 — the economic case
    ask: "", askInvestor: "",         // Part 3 — the ask
    complete: false,
  },
  // The investor Q&A after the pitch (P0.1). Per investor id, the outcome of their one
  // plan-specific follow-up: "strong" (nailed it first try — earns a confidence pip), "weak"
  // (needed the hint + a retry — leaves a concern), or "" (not asked). The ending reads this to
  // name each investor's concern honestly.
  questions: { smartMoney: "", customers: "", lowRisk: "" } as Record<string, string>,
};
void studentPlan; // read by later stations / the plan board

// The choices panel is popped directly in front of the user wherever they stand/look
// (see presentPanel) — same on desktop and in a headset — so no station-relative anchor
// offset is needed here anymore. Only its overall size is tuned below.
const PRODUCT_PANEL_MAX_WIDTH = 2.4;   // overall panel size in metres (a card-size lever)
const PRODUCT_PANEL_MAX_HEIGHT = 2.0;
const PRODUCT_CARD_WIDTH = 58;         // each option card's width (UIKit units)
const PRODUCT_IDEA_CARD_WIDTH = 120;   // each economic-idea card's width (UIKit units)
const PRODUCT_DONE_CLOSE_MS = 3000;    // how long the "plan complete" panel lingers before it closes

// A card's normal vs. chosen look. The chosen card turns green so it stands out.
const PRODUCT_CARD_BORDER = "#1F3A5F";     // normal border (navy)
const PRODUCT_CARD_BG = "#fbf4e3";         // normal background (cream)
const PRODUCT_SELECTED_BORDER = "#2e7d32"; // chosen border (green)
const PRODUCT_SELECTED_BG = "#d8efd8";     // chosen background (soft green)

// The little tappable "Choose Your Product" sign on the pedestal, FROM the spot.
const PRODUCT_TRIGGER_OFFSET = { x: 0, y: 1.35, z: 0.45 };
const PRODUCT_TRIGGER_MAX_WIDTH = 1.1;
const PRODUCT_TRIGGER_MAX_HEIGHT = 0.5;

// Plan board (the live "Your Plan" readout on the back wall): the row text size and
// the vertical gap above each row, in UIKit units. Bump the size up to read it from
// farther away; the board's frame, color, and position are not changed by these.
const PLAN_ROW_FONT_SIZE = 8;
const PLAN_ROW_SPACING = 4;

// ============================================================================
// MODULE 9 — "DELIVER YOUR PITCH" BUTTON  —  position, colors, labels, timing
// The climactic button that stands in front of the investors' desk. It is LOCKED
// (greyed out) until all three plan stations are finished, then turns to its
// normal look and invites the pitch. Everything tunable lives here; the behavior
// is wired next to the stations at the bottom of this file.
// ============================================================================
// Where the button floats, in world metres. The desk is centered at z -5.9 and is
// 0.6 deep (its front face is ~z -5.6), so this sits just in front of the desk,
// chest-high. It is offset to the RIGHT of center on purpose: the Price station
// pedestal and the wall plan board fill the x=0 sightline from the play area, so a
// centered button would hide behind them — this lands it clearly in front of the
// desk's right half, below the investors' faces. Like the station signs it is left
// unrotated, so its front (+Z) face looks back toward the player. (x=0 also works
// if you would rather center it and have the player walk up to the desk to see it.)
const DELIVER_BUTTON_POSITION = { x: 1.8, y: 1.3, z: -4.8 };
const DELIVER_BUTTON_MAX_WIDTH = 1.4;  // overall sign size in metres (a size lever)
const DELIVER_BUTTON_MAX_HEIGHT = 0.6;

// LOCKED (disabled) look — clearly greyed out so it reads as "not yet".
const DELIVER_DISABLED_BG = "#8a8a8a";     // grey fill
const DELIVER_DISABLED_BORDER = "#6f6f6f"; // darker grey edge
const DELIVER_DISABLED_LABEL = "#e9e9e9";  // muted off-white text

// READY (active) look — the normal navy / gold / cream the station signs use.
const DELIVER_ACTIVE_BG = "#1F3A5F";       // navy (matches COLOR_NAVY)
const DELIVER_ACTIVE_BORDER = "#8a6118";   // gold edge
const DELIVER_ACTIVE_LABEL = "#f3e9d2";    // cream text

// The two label lines, swapped with the state.
const DELIVER_LABEL_LOCKED = "Finish your plan first.";
const DELIVER_LABEL_READY = "Deliver your pitch";
const DELIVER_SUB_LOCKED = "Complete all three stations";
const DELIVER_SUB_READY = "Tap to begin";

// The gentle "I'm ready" pulse on the active button. Driven by setInterval (never
// requestAnimationFrame, which pauses in a headset).
const DELIVER_PULSE_AMOUNT = 0.04;         // max extra scale (1.00 -> 1.04)
const DELIVER_PULSE_SPEED = 0.12;          // radians added per 33 ms tick

// ============================================================================
// MODULE 9 — THE PITCH  —  panel placement, card size, per-answer feedback
// Tapping the READY "Deliver your pitch" button runs the pitch (Parts 1–3). The cards are
// STAGED so the investors stay in view: a WIDE, SHORT strip (three cards side by side) that
// FOLLOWS the lower part of the player's view — so the investors + their meters + their
// per-answer feedback bubbles always read ABOVE it, and it never blocks them however the
// player moves or backs up. The lines are composed at runtime from the student's real plan.
// ============================================================================
const PITCH_PANEL_MAX_WIDTH = 2.8;   // overall panel size in metres (wide: three cards in a row)
const PITCH_PANEL_MAX_HEIGHT = 0.72; // short strip, with room for the confirm line + Next/Go back row (P1.3)
const PITCH_CARD_WIDTH = 52;         // each option card's width (UIKit units; three across)
// (The old PITCH_DONE_CLOSE_MS auto-advance timer was removed in P1.3 — each pitch part now
// waits for the student to tap "Next" instead of racing their reading.)
// Where the cue-card strip rides in the view (camera-relative; updated every tick by the
// follow loop so it tracks the player). Tuned (low + short) so the WHOLE desk + investors read
// above it on a desktop FOV — see the desk dims (height 1, z -5.9) in environment.ts.
const PITCH_PANEL_DIST = 2.6;        // metres in front of the user (far enough that the strip stays small)
const PITCH_PANEL_DROP = 0.9;        // metres below eye line, so the desk + investors read above the strip
const PITCH_FOLLOW_LERP = 0.2;       // 0..1 ease toward the target each tick (smooth, not snappy)
// The per-answer feedback bubble that pops above the investor a chosen card targets. Built
// from the existing investor-reaction panels; only its float height + depth are set here.
const PITCH_FEEDBACK_Y = 1.95;       // world height — just above the investor's head
const PITCH_FEEDBACK_Z = -5.55;      // world z — in front of the desk, so it reads as their speech

// The three investors a pitch card can target. The id is what gets stored in
// studentPlan.pitch (e.g. openingInvestor); the label is the tag shown on the card and
// matches the floating priority labels above the investors (INVESTOR_PRIORITIES). The
// card order in every part is Smart Money, Customers, Low Risk — same order as the labels.
const PITCH_INVESTOR_LABEL: Record<string, string> = {
  smartMoney: "Smart Money",
  customers: "Customers",
  lowRisk: "Low Risk",
};

// ----------------------------------------------------------------------------
// MODULE 9 — THE ENDING  (replaces the old abstract-meters pitch report)
// After Part 3, a friendly closing appears in front of the investors — built the
// headset-visible way (PanelUI text + real 3D shapes, never DOM): a celebratory
// HEADLINE, a one-line REACTION near each investor matching their final pip count, and a
// gold CHECK badge payoff shown for EVERY student (there are no wrong answers). The
// investors + their reactions ARE the report now. The reveal pop + the check pulse run
// on setInterval (never rAF). Everything a designer might nudge lives here.
// ----------------------------------------------------------------------------
// Per-investor reaction lines, in each investor's own voice. Outer index = investor
// (0 Smart Money / 1 Customers / 2 Low Risk, same order as INVESTOR_IDS + the meters);
// inner index = that investor's filled-pip count (0..3), so the line escalates as they
// warm up. Used BOTH for the live per-answer bubble during the pitch (showPitchFeedback)
// and for each investor's final reaction at the ending (showEnding). Avoid em dashes —
// the panel font has no glyph for "—".
const INVESTOR_FEEDBACK_LINES: string[][] = [
  // Smart Money — cares about profit / strong earnings
  [
    "I'm not sure this will earn enough yet.", // 0 pips
    "I like the sound of those profits.",      // 1 pip
    "Now you're speaking my language!",        // 2 pips
    "This could make real money. I'm in!",     // 3 pips
  ],
  // Customers — cares about reaching lots of people
  [
    "I'm not sure people will want this yet.", // 0 pips
    "Your customers will love that.",          // 1 pip
    "Lots of people will want this. I like it!", // 2 pips
    "You really know your customers. I'm in!", // 3 pips
  ],
  // Low Risk — cares about a careful, safe plan
  [
    "I'd want a safer plan before I commit.",  // 0 pips
    "A careful plan. That's smart.",           // 1 pip
    "Steady and safe. I like how you think.",  // 2 pips
    "Low risk and a solid plan. I'm in!",      // 3 pips
  ],
];

// ============================================================================
// MODULE 9 — INVESTOR QUESTIONS  (P0.1: the follow-up Q&A after the pitch)
// After Part 3, each investor asks ONE follow-up question chosen from the student's REAL plan.
// Each investor probes the plan field they care about (Smart Money -> price / profit, Customers
// -> marketing / reach, Low Risk -> product / risk). Every question has three answers with
// exactly ONE clearly stronger answer; a first-try strong answer earns a confidence pip, a
// weaker pick shows a short amber hint and lets the student try again (the plan stations' gentle
// redirect). This restores real stakes to the pip meters. The bank is a plain data table keyed
// on the plan choice, so it stays easy to author: add a choice key to extend it.
// A short CONCERN line per investor is shown at the ending when they answered weakly.
// ============================================================================
const INVESTOR_QUESTION_PANEL_MAX_WIDTH = 2.4;   // the question panel size in metres
const INVESTOR_QUESTION_PANEL_MAX_HEIGHT = 2.2;
// A pip count at/above this reads as "this investor is in" (drives the escalating verdict line).
const INVESTOR_INVEST_THRESHOLD = 2;
// One short worry per investor, appended to their ending reaction only when their follow-up was
// answered weakly (needed the hint). ASCII only (the panel font has no em dash).
const INVESTOR_CONCERN_LINES = [
  "Still, keep a close eye on your profits.",       // Smart Money
  "Still, keep working to reach more customers.",   // Customers
  "Still, keep a backup plan ready.",               // Low Risk
];

// Which plan field each investor's question probes, in the SAME order as INVESTOR_IDS.
const INVESTOR_QUESTION_FIELD = ["price", "marketing", "product"];

type IQAnswer = { text: string; strong: boolean; hint?: string };
type InvestorQuestion = { question: string; answers: IQAnswer[] };
// INVESTOR_QUESTIONS[investorId][planChoiceId] -> the question asked when the student made that
// choice. Exactly one answer per question has strong=true; the others carry a one-line hint.
const INVESTOR_QUESTIONS: Record<string, Record<string, InvestorQuestion>> = {
  // SMART MONEY probes PRICE — the profit angle.
  smartMoney: {
    low: {
      question: "A low price earns less on each sale. How will you still make a profit?",
      answers: [
        { text: "Sell to lots of people, so small profits add up.", strong: true },
        { text: "Charge everyone more once I'm famous.", strong: false, hint: "Maybe someday, but a low price makes money NOW by selling to MANY customers." },
        { text: "Just hope it works out.", strong: false, hint: "Hope isn't a plan. A low price earns by selling to LOTS of buyers." },
      ],
    },
    medium: {
      question: "A medium price sits in the middle. How does that help your profit?",
      answers: [
        { text: "It earns a fair amount per sale and still keeps plenty of buyers.", strong: true },
        { text: "The middle is just the easy choice.", strong: false, hint: "The middle is smart for a reason: fair earnings AND lots of buyers." },
        { text: "Customers won't notice the price.", strong: false, hint: "Buyers always notice price. A medium price balances earnings and buyers." },
      ],
    },
    high: {
      question: "A high price scares off some buyers. How is that still good money?",
      answers: [
        { text: "Each sale earns a lot, so I don't need as many buyers.", strong: true },
        { text: "A high price proves I'm the best.", strong: false, hint: "Price alone doesn't prove quality. A high price works because each sale earns MORE." },
        { text: "I'll drop it if no one buys.", strong: false, hint: "That's a backup, not the plan. A high price earns more on EACH sale." },
      ],
    },
  },
  // CUSTOMERS probes MARKETING — the reach angle.
  customers: {
    social: {
      question: "Social media reaches huge crowds. How do you reach the RIGHT people?",
      answers: [
        { text: "Aim my videos at the customers who want my product.", strong: true },
        { text: "Post to as many people as I can.", strong: false, hint: "A giant crowd is mostly non-buyers. Aim at the people who actually want it." },
        { text: "Copy whatever is trending.", strong: false, hint: "Trends fade. Reaching YOUR customers matters more than chasing trends." },
      ],
    },
    flyers: {
      question: "Flyers reach your town. What about a customer outside town who wants it?",
      answers: [
        { text: "Add online posts so people farther away can find me too.", strong: true },
        { text: "Print even more flyers.", strong: false, hint: "More flyers still reach only the same town. A new channel like online reaches farther." },
        { text: "Tell them to drive into town.", strong: false, hint: "Many won't make the drive. Meet them where they are, online." },
      ],
    },
    fair: {
      question: "A fair booth reaches people there that day. How do you reach more?",
      answers: [
        { text: "Collect fans at the booth and post online so they hear from me again.", strong: true },
        { text: "Just wait for the next fair.", strong: false, hint: "That's a long wait. Stay in touch online between fairs." },
        { text: "Hand out more free samples.", strong: false, hint: "Samples are nice, but they still only reach today's crowd." },
      ],
    },
    word: {
      question: "Word of mouth is slow to start. How do you get it going?",
      answers: [
        { text: "Wow my first customers so they tell their friends.", strong: true },
        { text: "Ask strangers to spread the word.", strong: false, hint: "People share what they love. Wow your real customers first." },
        { text: "Wait and see if it spreads.", strong: false, hint: "Waiting is slow. Delight your first customers so they can't help but talk." },
      ],
    },
  },
  // LOW RISK probes PRODUCT — the risk / backup-plan angle (explicit risk vocabulary).
  lowRisk: {
    tech: {
      question: "Apps are risky, and most fail. What makes yours a safe bet?",
      answers: [
        { text: "Start small, test it with real users, and improve before growing.", strong: true },
        { text: "Spend big to launch as fast as possible.", strong: false, hint: "Spending big early is risky. Starting small and testing lowers the risk." },
        { text: "Tech always makes money.", strong: false, hint: "Big claims are risky. A safe plan tests first, then grows." },
      ],
    },
    delivery: {
      question: "Norfolk's port brings in goods from all over the world. What if a route gets blocked?",
      answers: [
        { text: "Keep a backup route so orders still arrive on time.", strong: true },
        { text: "Just wait for it to clear up.", strong: false, hint: "Waiting means late orders. A backup route keeps you running. That lowers your risk." },
        { text: "Cancel those orders.", strong: false, hint: "Canceling loses customers. A backup route is the safer plan." },
      ],
    },
    tour: {
      question: "Tourism rises and falls with the seasons. How do you stay safe in slow months?",
      answers: [
        { text: "Save money in busy months to cover the slow ones.", strong: true },
        { text: "Spend it all during the busy season.", strong: false, hint: "Then slow months hurt. Saving in busy months is your backup plan." },
        { text: "Hope every month stays busy.", strong: false, hint: "Seasons always change. Saving ahead keeps the risk low." },
      ],
    },
    farm: {
      question: "Crops can fail. What's your backup if one has a bad year?",
      answers: [
        { text: "Grow a few different foods, so one bad crop won't sink me.", strong: true },
        { text: "Plant only my best-selling crop.", strong: false, hint: "One crop is risky. A few different crops is a safer backup." },
        { text: "Hope the weather is always perfect.", strong: false, hint: "Weather is out of your control. Variety lowers the risk." },
      ],
    },
  },
};

// Each reaction line floats just in front of its investor, above the desk, centered on
// the investor's x. Only the height + depth (toward the player) are set here.
const ENDING_REACTION_Y = 1.15;         // world y of each reaction line (low, below the headline + check)
const ENDING_REACTION_Z = -3.3;         // world z — well forward of the desk, so the cards read from across the room
const ENDING_REACTION_MAX_WIDTH = 1.55; // reaction panel size in metres (caps; sizes to content; narrow so the x=-2/0/2 cards don't collide)
const ENDING_REACTION_MAX_HEIGHT = 1.3;
// The investors weigh in one at a time (left -> middle -> right) so the ending lands as a
// paced "each investor reacts" beat instead of one sudden pop. Gap between each, in ms.
const ENDING_REACTION_STAGGER_MS = 700;

// The celebratory headline, centered in front of the investors.
const ENDING_HEADLINE_POSITION = { x: 0, y: 2.05, z: -4.0 }; // world metres
const ENDING_HEADLINE_MAX_WIDTH = 3.0;
const ENDING_HEADLINE_MAX_HEIGHT = 0.9;
// Headline wording: a single biggest supporter is named (LEAD + investor name + TAIL);
// otherwise (a tie) the whole-panel line shows.
const ENDING_HEADLINE_LEAD = "Your biggest supporter: the ";
const ENDING_HEADLINE_TAIL = " investor!";
const ENDING_HEADLINE_TIE = "You won over the whole panel!";

// The gold CHECK badge — the payoff. Built from 3D shapes: a gold disc (CircleGeometry)
// with a white check mark (two thin boxes) just in front of it, in its own group so the
// pulse scales it as a unit. Positioned in world space below the headline; it draws
// on-top (depth off + high render order) so it reads over the headline panel.
const ENDING_CHECK_COLOR = "#f0b429";       // gold disc
const ENDING_CHECK_MARK_COLOR = "#ffffff";  // white check mark
const ENDING_CHECK_RADIUS = 0.16;           // disc radius (m)
const ENDING_CHECK_STROKE = 0.045;          // check-mark stroke thickness (m)
const ENDING_CHECK_DEPTH = 0.02;            // check-mark box thickness (m)
const ENDING_CHECK_POSITION = { x: 0, y: 1.72, z: -3.95 }; // world metres, between the headline + reactions
const ENDING_CHECK_RENDER_ORDER = 2500;     // > the +2000 applyPanelOnTop gives a panel
const ENDING_CHECK_PULSE_AMP = 0.08;        // gentle pulse size (+/- 8%)
const ENDING_CHECK_PULSE_STEP = 0.16;       // phase advance per tick (radians)
const ENDING_CHECK_PULSE_MS = 40;           // pulse tick interval (ms)

// Reveal pop (setInterval, like the deliver-button pulse): the headline + reactions grow
// from small to full when the ending appears.
const ENDING_POP_START_SCALE = 0.06;
const ENDING_POP_STEPS = 9;
const ENDING_POP_MS = 24;

// ============================================================================
// MODULE 9 — INVESTOR PRIORITIES + CONFIDENCE METERS
// Each investor (left, middle, right = INVESTOR_1 / INVESTOR_2 / INVESTOR_3) gets a
// floating PRIORITY LABEL above their head (a compiled UIKITML panel shown with PanelUI
// — the same in-headset text method as every other panel, never DOM) and a CONFIDENCE
// METER of three pips built from real 3D shapes (small spheres). All pips start EMPTY;
// the redesigned pitch steps (a later prompt) will fill them as each investor warms up.
// Everything a designer might want to nudge — the priorities, the label + meter heights,
// and the empty vs. filled pip colors — lives here.
// ============================================================================
// The three priorities, in order left -> middle -> right (INVESTOR_1/2/3).
const INVESTOR_PRIORITIES = ["Smart Money", "Customers", "Low Risk"];

// The priority label floats above each investor's head. It is centered over the
// investor's own x/z (read from INVESTOR_1/2/3); only its height is set here.
const INVESTOR_LABEL_Y = 2.2;           // world y of each label's center (heads top out ~1.9 m)
const INVESTOR_LABEL_MAX_WIDTH = 1.0;   // label panel size in metres
const INVESTOR_LABEL_MAX_HEIGHT = 0.3;

// The confidence meter — three pips in a row, floating just above the label.
const INVESTOR_PIPS_Y = 2.58;           // world y of the pip row's center
const INVESTOR_PIP_COUNT = 3;           // pips per meter (the prompt's "three pips")
const INVESTOR_PIP_RADIUS = 0.06;       // each pip's radius in metres (3D spheres)
const INVESTOR_PIP_GAP = 0.2;           // center-to-center spacing between pips, in metres

// Pip colors. Every pip starts EMPTY; each chosen pitch card fills one more pip (left ->
// right) on the investor it targets. (Same palette as the report bars, for consistency.)
const INVESTOR_PIP_EMPTY_COLOR = "#41597a";  // faint slate — an empty pip
const INVESTOR_PIP_FILLED_COLOR = "#f4c542"; // bright gold — a filled pip

// Investor ids, left -> middle -> right, in the SAME order as INVESTOR_1/2/3, the meters,
// and the priority labels. Maps a chosen card's target investor id to its meter/figure index.
const INVESTOR_IDS = ["smartMoney", "customers", "lowRisk"];

// The live reaction: when a card targets an investor, that investor gives a quick, friendly
// forward LEAN (a nod of interest), tipping forward and back once. Driven by setInterval
// (never requestAnimationFrame). Kept subtle on purpose — tune the lean and speed here.
const INVESTOR_REACT_LEAN = 0.1;   // max forward lean, in radians (~6°); bigger = deeper lean
const INVESTOR_REACT_STEP = 0.22;  // lean phase advance per tick (radians); bigger = faster
const INVESTOR_REACT_MS = 24;      // setInterval tick interval (ms)

// ============================================================================
// MODULE 9 — OPENING ONBOARDING  —  goal card + host tutorial + highlights
// The opening shown the moment the room loads, matching the other modules' pattern:
// first a GOAL CARD (built the headset-visible way, PanelUI + UIKITML, never DOM), then
// the HOST walks the founder through four lines one at a time. The student taps the
// host's speech card to advance (the practice tap), and the matching part of the room is
// gently highlighted as each line shows. The three plan stations stay LOCKED (their taps
// do nothing) until the opening finishes or the founder taps Skip. Everything a designer
// might nudge — the goal card spot, the host line spot, the four lines, which line
// highlights what, the highlight color/size/positions, and the pulse timing — lives here.
// ============================================================================
// The goal card floats straight ahead of the spawn, the same spot the other modules'
// opening cards use (the founder spawns at z 7 facing -z, so a card at z 4 faces them).
const GOAL_CARD_POSITION = { x: 0, y: 1.6, z: 4 };
const GOAL_CARD_MAX_WIDTH = 2.6;   // overall panel size in metres
const GOAL_CARD_MAX_HEIGHT = 2.4;

// The host's speech card is popped directly in front of the user each time a line shows
// (see presentPanel) — the same on desktop and in a headset — so only its size lives here.
const HOST_LINE_MAX_WIDTH = 2.2;
const HOST_LINE_MAX_HEIGHT = 1.2;

// The four tutorial lines, shown one at a time. Tapping the host's card advances to the
// next; after the last line the opening ends. Line 0 is the practice tap ("Tap me…").
const HOST_LINES = [
  "To pick anything here, just look at it and tap. Try it now. Tap me to keep going.",
  "Build your plan at these three stations.",
  "Your choices show up on this board as you go.",
  "When your plan is ready, you will pitch to the three investors. Let's get started.",
];
// What each line gently highlights, by the same index as HOST_LINES: the three plan
// stations, the plan board, or nothing. Line 0 (practice tap) and line 3 (wrap-up) have no
// highlight; line 1 highlights the stations; line 2 highlights the board.
const HOST_LINE_HIGHLIGHT = ["none", "stations", "board", "none"];
// The little tap hint under each line — a gentler word on the final line.
const HOST_LINE_HINT = "Tap to continue";
const HOST_LINE_HINT_LAST = "Tap to begin";

// The gentle highlight: a soft glowing ring (RingGeometry) drawn at the matching part of
// the room. The station rings lie flat on the floor at each station spot; the board ring
// stands at the plan board. Both are drawn over the room (depth off) so the glow always
// reads, and pulse their opacity on a setInterval (never requestAnimationFrame).
const HIGHLIGHT_COLOR = "#f4c542";          // warm gold glow (matches the house gold)
const HIGHLIGHT_OPACITY = 0.5;              // base opacity the gentle pulse swings around
const HIGHLIGHT_RING_THICKNESS = 0.14;      // ring band width in metres (inner = radius - this)
const HIGHLIGHT_STATION_RADIUS = 0.95;      // floor ring radius at each station (m)
const HIGHLIGHT_STATION_Y = 0.06;           // ring height above the floor (avoids z-fighting)
const HIGHLIGHT_BOARD_RADIUS = 1.7;         // ring framing the plan board (m)
const HIGHLIGHT_BOARD_Z_NUDGE = 0.1;        // toward the player from the board, so it sits just in front
const HIGHLIGHT_RENDER_ORDER = 1500;        // over the room (0), under the panels (+2000)
const HIGHLIGHT_PULSE_AMP = 0.28;           // how far the opacity swings each pulse
const HIGHLIGHT_PULSE_STEP = 0.12;          // phase advance per tick (radians)
const HIGHLIGHT_PULSE_MS = 40;              // pulse tick interval (ms)

// ============================================================================
// MODULE 9 — ARRIVAL CARDS  —  the one consistent intro shown at every stop
// The moment a student starts a stop (each plan station, and the pitch), one short
// arrival card appears before the choices: the stop's name, one friendly line about
// what they will do there, and a Start button. ONE PanelUI (ui/arrival-card) is reused
// for all of them — its title/line are set per stop and it is anchored at that stop.
// The old "Tap to start" sub-line on the station signs is folded into this card's Start
// button, so each stop has ONE clear intro. Positions live here; the words (fifth-grade
// voice) are the exact lines the prompt gave. Built/shown like the goal card, never DOM.
// ============================================================================
const ARRIVAL_CARD_MAX_WIDTH = 2.4;   // overall card size in metres
const ARRIVAL_CARD_MAX_HEIGHT = 1.5;
// The arrival card (like the choices that follow it) is popped directly in front of the
// user wherever they are standing/looking — see presentPanel — so it reads the same on
// desktop and in a headset no matter which station was tapped. No fixed anchor needed.

// The per-stop words. Title = the stop name; line = one friendly line about the task.
const ARRIVAL_PRODUCT_TITLE = "Product Station";
const ARRIVAL_PRODUCT_LINE = "Choose what your startup will sell. Pick the product that fits your Virginia region.";
const ARRIVAL_PRICE_TITLE = "Price Station";
const ARRIVAL_PRICE_LINE = "Set your price. Decide what to charge your customers.";
const ARRIVAL_MARKETING_TITLE = "Marketing Station";
const ARRIVAL_MARKETING_LINE = "Plan your marketing. Choose how you will reach your customers.";
const ARRIVAL_PITCH_TITLE = "Pitch Time";
const ARRIVAL_PITCH_LINE = "Win over the three investors. Each one cares about something different, so aim your lines to match.";


// ============================================================================
// THE WORLD
// ============================================================================
World.create(document.getElementById("scene-container") as HTMLDivElement, {
  assets: {},
  xr: {
    sessionMode: SessionMode.ImmersiveVR,
    offer: "always",
    features: { handTracking: { required: false }, layers: { required: false } },
  },
  features: {
    // initialPlayerPosition spawns the player RIG (the locomotion collision
    // capsule) on the entrance side of the plaza. The camera below sits at
    // local z 0, so the capsule lines up with where you actually appear to
    // stand — that is what makes the hedge boundary stop you in the right place.
    // useWorker is OFF on purpose: the worker only syncs world.player back to the
    // app after the first move, so with it on the spawn would sit at the origin
    // and snap forward on the first keypress. On the main thread the initial
    // position applies immediately. The scene is light, so there is no cost.
    locomotion: { useWorker: false, browserControls: true, initialPlayerPosition: [0, 0, 7] },
    grabbing: true,
    physics: true,
    sceneUnderstanding: false,
    environmentRaycast: false,
  },
}).then(function (world) {
  const scene = world.scene;
  const camera = world.camera;

  // Eye height only — no z offset. The player rig is spawned back on the
  // entrance side via locomotion's initialPlayerPosition, so keeping the camera
  // at local z 0 means the collision capsule sits exactly under the viewer
  // (otherwise walls would block you metres away from where they look).
  camera.position.set(0, 1.6, 0);

  // --------------------------------------------------------------------------
  // BROWSER MOUSE LOOK (right button looks; left button stays for clicks).
  // In the headset the headset owns the view, so this only runs in the browser.
  // --------------------------------------------------------------------------
  const lookContainer = document.getElementById("scene-container") as HTMLDivElement;
  const LOOK_BUTTON = 2; // right mouse button
  let lookDragging = false;
  let lookHasLooked = false;
  let lookLastX = 0;
  let lookLastY = 0;
  let lookYaw = 0;
  let lookPitch = 0;
  const LOOK_SENSITIVITY = 0.0025;
  const LOOK_PITCH_LIMIT = 1.4;

  lookContainer.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  lookContainer.addEventListener("pointerdown", function (e) {
    if (e.button !== LOOK_BUTTON) return;
    lookDragging = true;
    lookHasLooked = true;
    lookLastX = e.clientX;
    lookLastY = e.clientY;
    lookContainer.style.cursor = "grabbing";
  });
  window.addEventListener("pointermove", function (e) {
    if (!lookDragging) return;
    const dx = e.clientX - lookLastX;
    const dy = e.clientY - lookLastY;
    lookLastX = e.clientX;
    lookLastY = e.clientY;
    lookYaw = lookYaw - dx * LOOK_SENSITIVITY;
    lookPitch = lookPitch - dy * LOOK_SENSITIVITY;
    lookPitch = Math.max(-LOOK_PITCH_LIMIT, Math.min(LOOK_PITCH_LIMIT, lookPitch));
  });
  window.addEventListener("pointerup", function (e) {
    if (e.button !== LOOK_BUTTON) return;
    lookDragging = false;
    lookContainer.style.cursor = "";
  });

  function browserLookLoop() {
    if (lookHasLooked) {
      if (world.visibilityState.peek() === VisibilityState.NonImmersive) {
        camera.rotation.set(lookPitch, lookYaw, 0, "YXZ");
      }
    }
    requestAnimationFrame(browserLookLoop);
  }
  browserLookLoop();

  // --------------------------------------------------------------------------
  // HIDDEN-PANEL CLICK GUARD
  // IWSDK keeps every panel alive and just toggles visibility. Pointer ray tests
  // do NOT skip invisible meshes, so a hidden button can sit in front of a real
  // one and silently swallow the click. Each tick we mark effectively-hidden ray
  // targets pointerEvents = "none" so they are skipped, and restore them when
  // shown. setInterval (not requestAnimationFrame) because rAF pauses in a headset.
  // --------------------------------------------------------------------------
  function hitTestVisibilityLoop() {
    const targets = (scene as any).rayDescendants as any[] | undefined;
    if (!targets) return;
    for (const obj of targets) {
      let visible = obj.visible;
      let p = obj.parent;
      while (visible) {
        if (!p) break;
        visible = p.visible;
        p = p.parent;
      }
      if (!visible) {
        if (!obj.__guardHidden) {
          obj.__savedPointerEvents = obj.pointerEvents;
          obj.__guardHidden = true;
        }
        obj.pointerEvents = "none";
      } else if (obj.__guardHidden) {
        obj.pointerEvents = obj.__savedPointerEvents;
        obj.__guardHidden = false;
      }
    }
  }
  setInterval(hitTestVisibilityLoop, 33);

  // --------------------------------------------------------------------------
  // PANEL PRESENTATION
  // The story panels are anchored in the world, near Gus or a building. But the
  // player almost always walks RIGHT UP to that anchor, ending up far too close
  // to read the panel — the cards and buttons at the bottom fall off the screen.
  // presentPanel snaps a panel to a comfortable distance directly in front of
  // the player, sized from the panel's real bounds and the live camera so the
  // WHOLE panel fits in view, then turns it to face the player. It is called
  // once each time a panel first appears (showPanel), so a panel you are reading
  // or clicking stays put. Works the same on desktop and in a headset.
  // --------------------------------------------------------------------------
  const _presEye = new Vector3();
  const _presFwd = new Vector3();
  const _presSize = new Vector3();
  const _presBox = new Box3();
  const PRESENT_MARGIN = 1.18;  // breathing room so the panel is not edge-to-edge
  const PRESENT_MARGIN_DESKTOP = 1.4; // a bit more on a laptop, so the corner overlay does not crowd panels
  const PRESENT_MIN_DIST = 2.4; // never closer than this, however small the panel
  const PRESENT_MAX_DIST = 6.0; // never farther than this, however large the panel

  function presentPanel(entity: any) {
    const cam: any = world.camera;
    const o3d = entity.object3D;
    if (!cam || !o3d) return;

    // Measure the panel's real size. For a flat panel turned only on its Y axis,
    // the width lives in the X/Z plane and the height is always Y, so this stays
    // correct no matter which way the panel is currently facing.
    _presBox.setFromObject(o3d);
    _presBox.getSize(_presSize);
    const w = Math.hypot(_presSize.x, _presSize.z) || 2.6;
    const h = _presSize.y > 0.01 ? _presSize.y : 2.2;

    // Distance that fits the height (vertical FOV) and the width (FOV * aspect).
    const tanV = Math.tan((cam.fov * Math.PI) / 360); // tan(halfFov)
    const aspect = cam.aspect || 1;
    const distH = h / 2 / tanV;
    const distW = w / 2 / (tanV * aspect);
    // On a laptop the corner overlay sits in front of panels, so give them more
    // room there. In the headset there is no overlay, so keep them big.
    const desktopView = world.visibilityState.peek() === VisibilityState.NonImmersive;
    const margin = desktopView ? PRESENT_MARGIN_DESKTOP : PRESENT_MARGIN;
    let dist = Math.max(distH, distW) * margin;
    dist = Math.max(PRESENT_MIN_DIST, Math.min(PRESENT_MAX_DIST, dist));

    // Place it straight ahead of the camera, level, at the player's eye height.
    cam.getWorldPosition(_presEye);
    cam.getWorldDirection(_presFwd);
    _presFwd.y = 0;
    if (_presFwd.lengthSq() < 1e-6) _presFwd.set(0, 0, -1);
    _presFwd.normalize();
    const px = _presEye.x + _presFwd.x * dist;
    const pz = _presEye.z + _presFwd.z * dist;
    o3d.position.set(px, _presEye.y, pz);
    // Turn to face the player (a panel's front is its +Z side).
    o3d.rotation.set(0, Math.atan2(_presEye.x - px, _presEye.z - pz), 0, "YXZ");
    applyPanelOnTop(entity);
  }

  // Draw a panel OVER the 3D world so Gus, his cart, or a building can never sit
  // in front of it and hide the cards. The player walks right up to these spots,
  // so a readable (far enough) panel often lands at or behind the thing it
  // belongs to; turning off depth testing and lifting the render order keeps the
  // whole panel visible while preserving UIKit's own internal layering.
  function applyPanelOnTop(entity: any) {
    const o3d = entity.object3D;
    if (!o3d) return;
    o3d.traverse(function (child: any) {
      if (!child.isMesh || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        m.depthTest = false;
        m.depthWrite = false;
      }
      // Lift above the scene (renderOrder 0) once, keeping relative UIKit order.
      if (!child.__onTop) {
        child.renderOrder = (child.renderOrder || 0) + 2000;
        child.__onTop = true;
      }
    });
  }

  // Make a panel visible, snapping it in front of the player the first time it
  // appears. Idempotent while already shown, so reading/clicking it is stable.
  // The on-top maintenance loop (below) keeps it drawing over the world, even as
  // UIKit builds later content (a reply, a result) into the panel.
  function showPanel(entity: any) {
    const o3d = entity.object3D;
    if (!o3d) return;
    if (!o3d.visible) presentPanel(entity);
    o3d.visible = true;
  }

  // Every story panel, watched by one loop that re-applies applyPanelOnTop to
  // whichever is visible. UIKit creates text/glyph meshes lazily and only after
  // a panel's content is set, so a one-time pass misses them — a panel placed
  // behind Gus or a building would then show its boxes but hide its words. This
  // keeps the WHOLE visible panel on top, frame after frame.
  const storyPanels: any[] = [];
  setInterval(function () {
    for (const p of storyPanels) {
      if (p.object3D && p.object3D.visible) applyPanelOnTop(p);
    }
  }, 33);

  // --------------------------------------------------------------------------
  // The walkable world (sky, light, ground). See src/environment.ts.
  // --------------------------------------------------------------------------
  const built = buildBaseWorld(world);
  const ground = built.ground;
  ground.addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });
  // The hedge ring is collision too: the locomotion engine bakes its meshes into
  // the walkable BVH, so the player's capsule bumps into it and can no longer
  // walk off the edge of the world and fall.
  built.boundary.addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });
  setStageLook(world, "select");

  // Module 9: the Module 8 shop picker is disabled, so the room is shown right
  // away as an empty space to build the startup studio in. In Module 8 these were
  // hidden here and revealed in pick() once a shop was chosen; that reveal code is
  // left in place (just never triggered), so re-enabling the flow restores it.
  ground.object3D!.visible = true;
  built.boundary.object3D!.visible = true;
  for (const e of built.street) e.object3D!.visible = true;

  // Module 9: the three studio station markers (Product / Price / Marketing).
  // Static, labeled pedestals only — no interactivity yet. Edit their positions
  // in the STUDIO STATION SPOTS constants block in src/environment.ts.
  buildStationMarkers(world);

  // Module 9: the cast — three investors in a row at the far end, and a host near
  // the entrance. Same primitive-figure approach Module 8 used for its owner.
  const investorEntities = buildInvestors(world);
  buildHost(world);

  // Module 9: the judges' desk — one long, solid wood desk standing just in front
  // of the three investors (DESK_POSITION / WIDTH / HEIGHT / DEPTH in the STUDIO
  // STATION SPOTS block), so they read as a Shark Tank–style panel with their
  // lower bodies hidden behind it. Built from simple shapes so it shows in the headset.
  buildJudgesDesk(world);

  // ==========================================================================
  // MODULE 9 — INVESTOR PRIORITIES + CONFIDENCE METERS
  // Above each investor: (1) a PRIORITY LABEL — a compiled UIKITML panel shown with
  // PanelUI, the same in-headset text method every panel uses (never DOM) — and (2) a
  // CONFIDENCE METER of three pips built from real 3D shapes (small spheres) placed
  // through the ECS (createTransformEntity, never scene.add). Left -> middle -> right =
  // Smart Money / Customers / Low Risk. All pips START EMPTY here; the redesigned pitch
  // steps (a later prompt) will fill them. Positions + colors live in the INVESTOR_*
  // constants block. This is additive — the investors, desk, board, host, and room are
  // untouched.
  // ==========================================================================
  const investorSpots = [INVESTOR_1, INVESTOR_2, INVESTOR_3];

  // Each investor's three pip meshes, kept so a later step can fill them.
  // investorPips[i] = [pip0, pip1, pip2] for investor i (left, middle, right).
  const investorPips: Mesh[][] = [];

  // The one and only way to change a meter: recolor investor `index`'s pips so the first
  // `filled` read filled (gold) and the rest empty (slate). Called with 0 below so every
  // meter starts empty; the pitch steps will call it with 1..3 as confidence grows.
  function setInvestorConfidence(index: number, filled: number) {
    const pips = investorPips[index];
    if (!pips) return;
    for (let i = 0; i < pips.length; i++) {
      (pips[i].material as MeshBasicMaterial).color.set(
        i < filled ? INVESTOR_PIP_FILLED_COLOR : INVESTOR_PIP_EMPTY_COLOR,
      );
    }
  }
  // How many pips are filled on each meter (0..INVESTOR_PIP_COUNT), one per investor.
  // The pitch fills one each time a chosen card targets that investor.
  const investorConfidence = [0, 0, 0];

  // One in-flight lean per investor (its setInterval handle + phase), so re-triggering
  // a reaction restarts cleanly rather than stacking.
  const investorReactTimer: (ReturnType<typeof setInterval> | null)[] = [null, null, null];
  const investorReactPhase = [0, 0, 0];

  // A quick, friendly forward lean on investor `index` — a nod of interest. The figure
  // tips forward to INVESTOR_REACT_LEAN and back over one half-sine, on setInterval (never
  // rAF). investorEntities[index] is the figure Group placed by buildInvestors; we animate
  // only its rotation.x, leaving its facing (rotation.y) and the floating meter untouched.
  function reactInvestor(index: number) {
    const o3d = investorEntities[index]?.object3D;
    if (!o3d) return;
    if (investorReactTimer[index]) clearInterval(investorReactTimer[index]!);
    investorReactPhase[index] = 0;
    investorReactTimer[index] = setInterval(function () {
      investorReactPhase[index] += INVESTOR_REACT_STEP;
      const p = Math.min(investorReactPhase[index], Math.PI);
      o3d.rotation.x = INVESTOR_REACT_LEAN * Math.sin(p); // 0 -> lean in -> 0
      if (investorReactPhase[index] >= Math.PI) {
        o3d.rotation.x = 0;
        clearInterval(investorReactTimer[index]!);
        investorReactTimer[index] = null;
      }
    }, INVESTOR_REACT_MS);
  }

  // A chosen card targeted investor `id`: fill one more pip on that meter (capped at
  // INVESTOR_PIP_COUNT) and lean that investor in. All three meters stay visible throughout.
  function awardInvestor(id: string) {
    const index = INVESTOR_IDS.indexOf(id);
    if (index < 0) return;
    investorConfidence[index] = Math.min(INVESTOR_PIP_COUNT, investorConfidence[index] + 1);
    setInvestorConfidence(index, investorConfidence[index]);
    reactInvestor(index);
  }

  // Empty all three meters + stop any lean — used when a fresh pitch starts (openPitch),
  // so a re-pitch begins with every investor's confidence back at zero.
  function resetInvestorConfidence() {
    for (let i = 0; i < investorConfidence.length; i++) {
      investorConfidence[i] = 0;
      setInvestorConfidence(i, 0);
      if (investorReactTimer[i]) { clearInterval(investorReactTimer[i]!); investorReactTimer[i] = null; }
      const o3d = investorEntities[i]?.object3D;
      if (o3d) o3d.rotation.x = 0;
    }
  }

  investorSpots.forEach(function (spot, i) {
    // (1) Priority label — one generic UIKITML layout, its text set per investor. Left
    // unrotated like the pitch button so its +Z face looks back toward the player.
    const label = world
      .createTransformEntity()
      .addComponent(PanelUI, {
        config: "./ui/investor-label.json",
        maxWidth: INVESTOR_LABEL_MAX_WIDTH,
        maxHeight: INVESTOR_LABEL_MAX_HEIGHT,
      });
    label.object3D!.position.set(spot.x, INVESTOR_LABEL_Y, spot.z);
    label.object3D!.visible = true;
    whenPanelReady(label, function (doc) {
      doc.getElementById("investor-priority")?.setProperties({ text: INVESTOR_PRIORITIES[i] });
    });

    // (2) Confidence meter — three pip spheres in a row, in one Group above the label.
    // MeshBasicMaterial = exact unlit colors so empty vs. filled read clearly.
    const meterGroup = new Group();
    const pips: Mesh[] = [];
    for (let p = 0; p < INVESTOR_PIP_COUNT; p++) {
      const pip = new Mesh(
        new SphereGeometry(INVESTOR_PIP_RADIUS, 16, 16),
        new MeshBasicMaterial({ color: new Color(INVESTOR_PIP_EMPTY_COLOR) }),
      );
      // Center the row on the investor's x: for three pips, x = -gap, 0, +gap.
      pip.position.set((p - (INVESTOR_PIP_COUNT - 1) / 2) * INVESTOR_PIP_GAP, 0, 0);
      meterGroup.add(pip);
      pips.push(pip);
    }
    const meter = world.createTransformEntity(meterGroup);
    meter.object3D!.position.set(spot.x, INVESTOR_PIPS_Y, spot.z);
    meter.object3D!.visible = true;
    investorPips.push(pips);
    setInvestorConfidence(i, 0); // start every meter empty
  });

  // Module 9: the plan board — a large flat PanelUI mounted high on the far wall
  // above the investors, facing the player. Built like the Module 8 panels (PanelUI
  // + compiled UIKITML) so it shows in the headset, not as DOM. It now shows the live
  // plan: the title plus three rows (Product / Price / Marketing) filled in from the
  // studentPlan data object. The board's look, size, and position are unchanged.
  const planBoardPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/plan-board.json", maxWidth: 3.4, maxHeight: 1.4 });
  planBoardPanel.object3D!.position.set(PLAN_BOARD.x, PLAN_BOARD.y, PLAN_BOARD.z);
  planBoardPanel.object3D!.visible = true;

  // The board reads everything from studentPlan and from nowhere else. The Product row
  // shows the short product + economic idea once BOTH are chosen; otherwise (and the
  // Price/Marketing rows always, for now) it reads "not chosen yet". refreshPlanBoard()
  // is called whenever the plan changes — a finished Product pick, or a start-over.
  let planBoardDoc: any = null;
  function setPlanRow(id: string, prefix: string, value: string) {
    if (!planBoardDoc) return;
    planBoardDoc.getElementById(id)?.setProperties({ text: prefix + ": " + value });
  }
  function refreshPlanBoard() {
    if (!planBoardDoc) return;
    const productDone = studentPlan.product !== "" && studentPlan.idea !== "";
    setPlanRow("plan-row-product", "Product", productDone ? studentPlan.productShort + " (" + studentPlan.ideaLabel + ")" : "not chosen yet");
    const priceDone = studentPlan.price !== "" && studentPlan.priceIdea !== "";
    setPlanRow("plan-row-price", "Price", priceDone ? studentPlan.priceShort + " (" + studentPlan.priceIdeaLabel + ")" : "not chosen yet");
    const marketingDone = studentPlan.marketing !== "" && studentPlan.marketingIdea !== "";
    setPlanRow("plan-row-marketing", "Marketing", marketingDone ? studentPlan.marketingShort + " (" + studentPlan.marketingIdeaLabel + ")" : "not chosen yet");
  }
  whenPanelReady(planBoardPanel, function (doc) {
    planBoardDoc = doc;
    // Apply the tunable row text size + spacing (the same PanelUI setProperties path),
    // then draw the current plan.
    for (const id of ["plan-row-product", "plan-row-price", "plan-row-marketing"]) {
      doc.getElementById(id)?.setProperties({ fontSize: PLAN_ROW_FONT_SIZE, marginTop: PLAN_ROW_SPACING });
    }
    refreshPlanBoard();
  });

  // A panel's UI document loads over a frame or two. Run wiring once it is ready.
  function whenPanelReady(entity: any, callback: (doc: any) => void) {
    const check = function () {
      if (entity.hasComponent(PanelDocument)) {
        const doc = entity.getValue(PanelDocument, "document");
        if (doc) {
          callback(doc);
          return;
        }
      }
      requestAnimationFrame(check);
    };
    check();
  }

  // ==========================================================================
  // MODULE 9 — OPENING ONBOARDING  (goal card -> host tutorial -> gate / skip)
  // The opening shown the moment the room loads. It reuses the project's own systems only:
  // PanelUI for the in-headset text (the goal card and the host's speech card, never DOM)
  // and the Interactable + onClick tap path the station cards use. The room highlights are
  // simple 3D rings placed through the ECS (createTransformEntity, never scene.add). Every
  // loop here runs on setInterval (never requestAnimationFrame, which pauses in a headset).
  //
  // The gate: `stationsUnlocked` starts false and the three station open() functions below
  // bail while it is false, so the stations cannot be tapped during the opening. Finishing
  // the host walk-through OR tapping Skip unlocks them. Tunables live in the OPENING
  // ONBOARDING constants block at the top of this file.
  // ==========================================================================
  // The one flag the station signs read: the stations stay locked until the opening ends.
  let stationsUnlocked = false;

  // The gentle room highlights: one gold ring per station (laid flat on the floor) and one
  // framing the plan board. Hidden until a host line calls for them; the pulse loop below
  // breathes the opacity of whichever are visible. RingGeometry so the ring's hole never
  // covers the thing it points at; drawn over the room (depth off) so the glow always reads.
  function makeHighlightRing(radius: number): Mesh {
    const inner = Math.max(0.02, radius - HIGHLIGHT_RING_THICKNESS);
    const mat = new MeshBasicMaterial({
      color: new Color(HIGHLIGHT_COLOR),
      transparent: true,
      opacity: HIGHLIGHT_OPACITY,
      side: DoubleSide,
      depthTest: false,
      depthWrite: false,
    });
    const ring = new Mesh(new RingGeometry(inner, radius, 48), mat);
    ring.renderOrder = HIGHLIGHT_RENDER_ORDER;
    return ring;
  }

  // The three station rings, lying flat on the floor at each station spot.
  const stationRings: Mesh[] = [];
  const stationHighlightEntities = [PRODUCT_SPOT, PRICE_SPOT, MARKETING_SPOT].map(function (spot) {
    const ring = makeHighlightRing(HIGHLIGHT_STATION_RADIUS);
    stationRings.push(ring);
    const e = world.createTransformEntity(ring);
    e.object3D!.position.set(spot.x, HIGHLIGHT_STATION_Y, spot.z);
    e.object3D!.rotation.x = -Math.PI / 2; // lay it flat, facing up
    e.object3D!.visible = false;
    return e;
  });
  // The board ring, standing just in front of the plan board, facing the player.
  const boardRing = makeHighlightRing(HIGHLIGHT_BOARD_RADIUS);
  const boardHighlightEntity = world.createTransformEntity(boardRing);
  boardHighlightEntity.object3D!.position.set(PLAN_BOARD.x, PLAN_BOARD.y, PLAN_BOARD.z + HIGHLIGHT_BOARD_Z_NUDGE);
  boardHighlightEntity.object3D!.visible = false;

  // Every highlight mesh, for the one pulse loop.
  const highlightMeshes: Mesh[] = stationRings.concat([boardRing]);

  // Show the set a line calls for ("stations" / "board" / anything else = none); hide the rest.
  function showHighlight(which: string) {
    const showStations = which === "stations";
    for (const e of stationHighlightEntities) e.object3D!.visible = showStations;
    boardHighlightEntity.object3D!.visible = which === "board";
  }

  // The gentle pulse: breathe the opacity of whichever rings are visible (setInterval, not rAF).
  let highlightPulse = 0;
  setInterval(function () {
    highlightPulse += HIGHLIGHT_PULSE_STEP;
    const op = HIGHLIGHT_OPACITY + HIGHLIGHT_PULSE_AMP * Math.sin(highlightPulse);
    const clamped = Math.max(0, Math.min(1, op));
    for (const m of highlightMeshes) {
      if (m.visible) (m.material as MeshBasicMaterial).opacity = clamped;
    }
  }, HIGHLIGHT_PULSE_MS);

  // The goal card — the first thing the founder sees, straight ahead of the spawn. Built and
  // shown the same way as the other modules' opening cards; kept on top like every story panel.
  const goalCard = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/goal-card.json", maxWidth: GOAL_CARD_MAX_WIDTH, maxHeight: GOAL_CARD_MAX_HEIGHT })
    .addComponent(Interactable);
  goalCard.object3D!.position.set(GOAL_CARD_POSITION.x, GOAL_CARD_POSITION.y, GOAL_CARD_POSITION.z);
  goalCard.object3D!.visible = false;
  storyPanels.push(goalCard);

  // The host's speech card — one line at a time, anchored above the host. The whole card is
  // the tap target (advance); a small skip chip rides under it. Hidden until Start.
  const hostLine = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/host-line.json", maxWidth: HOST_LINE_MAX_WIDTH, maxHeight: HOST_LINE_MAX_HEIGHT })
    .addComponent(Interactable);
  hostLine.object3D!.visible = false;
  storyPanels.push(hostLine);

  // Element handles + the current line, set once the host card's document loads.
  let hostTextEl: any = null;
  let hostHintEl: any = null;
  let hostStep = 0;

  // Show line n: set its text + hint, highlight the matching part of the room, and pop the
  // card directly in front of the user (presentPanel sizes + faces it — the same on desktop
  // and in a headset). The card itself is the tap target, so front-and-center is also where
  // the next tap lands. The room highlights still pulse around it.
  function showHostLine(n: number) {
    hostStep = n;
    hostTextEl?.setProperties({ text: HOST_LINES[n] });
    hostHintEl?.setProperties({ text: n === HOST_LINES.length - 1 ? HOST_LINE_HINT_LAST : HOST_LINE_HINT });
    showHighlight(HOST_LINE_HIGHLIGHT[n]);
    hostLine.object3D!.visible = true;
    presentPanel(hostLine); // snap it in front of the player, fit + facing them
  }

  // End the opening (finished or skipped): hide the opening panels + highlights and unlock
  // the stations. Idempotent, so Start-then-Skip (or a stray double tap) is harmless.
  function endOpening() {
    goalCard.object3D!.visible = false;
    hostLine.object3D!.visible = false;
    showHighlight("none");
    stationsUnlocked = true;
    console.log("[OPENING] complete — stations unlocked");
  }

  // Tapping the host's card: advance to the next line, or end the opening after the last.
  function advanceHostLine() {
    sfxClick();
    if (hostStep < HOST_LINES.length - 1) showHostLine(hostStep + 1);
    else endOpening();
  }

  // Start (on the goal card): hide the card and begin the host walk-through at line 0.
  function startHostTutorial() {
    sfxClick();
    goalCard.object3D!.visible = false;
    showHostLine(0);
  }

  // Skip (on either panel): jump straight in with the stations open.
  function skipOpening() {
    sfxClick();
    endOpening();
  }

  // Wire the goal card: Start begins the tutorial, Skip jumps in.
  whenPanelReady(goalCard, function (doc) {
    doc.getElementById("goal-start")?.setProperties({ onClick: startHostTutorial });
    doc.getElementById("goal-skip")?.setProperties({ onClick: skipOpening });
  });

  // Wire the host card: tapping the card advances (the practice tap), Skip jumps in.
  whenPanelReady(hostLine, function (doc) {
    hostTextEl = doc.getElementById("host-line-text");
    hostHintEl = doc.getElementById("host-line-hint");
    doc.getElementById("host-line-tap")?.setProperties({ onClick: advanceHostLine });
    doc.getElementById("host-line-skip")?.setProperties({ onClick: skipOpening });
  });

  // The opening starts here: show the goal card the moment the room is ready.
  goalCard.object3D!.visible = true;
  applyPanelOnTop(goalCard);

  // ==========================================================================
  // MODULE 9 — ARRIVAL CARDS  (the one consistent intro shown at every stop)
  // ONE PanelUI reused for all four stops (the three plan stations + the pitch). When a
  // stop is started, its open() shows this card — anchored at the stop, with that stop's
  // title + friendly line — and the card's Start runs the activity that used to begin
  // straight away. Reuses the same systems as every other panel (PanelUI text, Interactable
  // + onClick, the on-top story-panel loop); no DOM, no rAF. Words + positions live in the
  // ARRIVAL_* constants block at the top of this file.
  // ==========================================================================
  const arrivalCard = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/arrival-card.json", maxWidth: ARRIVAL_CARD_MAX_WIDTH, maxHeight: ARRIVAL_CARD_MAX_HEIGHT })
    .addComponent(Interactable);
  arrivalCard.object3D!.visible = false;
  storyPanels.push(arrivalCard); // kept drawn over the room like every other story panel

  // Element handles + the pending "begin the activity" action, set per stop on show.
  let arrivalTitleEl: any = null;
  let arrivalLineEl: any = null;
  // The two buttons' current actions, swapped per use (a normal arrival vs. a review card).
  let arrivalPrimaryAction: () => void = function () {};
  let arrivalSecondaryAction: () => void = function () {};
  let arrivalPrimaryLabelEl: any = null;
  let arrivalSecondaryLabelEl: any = null;

  // Show the card at a stop with BOTH buttons configured, then pop it directly in front of the
  // user wherever they are (presentPanel sizes the distance and faces it — identical on desktop
  // and in a headset). The PRIMARY (gold) button is the safe default; the SECONDARY (outline)
  // button is the quieter alternative. This one card serves the normal arrival intro
  // ("Start" / "Go back") AND the review card shown when a finished station is reopened
  // ("Keep it" / "Change it"), so a curious tap never silently erases work.
  function showActionCard(cfg: {
    title: string; line: string;
    primaryLabel: string; onPrimary: () => void;
    secondaryLabel: string; onSecondary: () => void;
  }) {
    arrivalPrimaryAction = cfg.onPrimary;
    arrivalSecondaryAction = cfg.onSecondary;
    arrivalTitleEl?.setProperties({ text: cfg.title });
    arrivalLineEl?.setProperties({ text: cfg.line });
    arrivalPrimaryLabelEl?.setProperties({ text: cfg.primaryLabel });
    arrivalSecondaryLabelEl?.setProperties({ text: cfg.secondaryLabel });
    arrivalCard.object3D!.visible = true;
    presentPanel(arrivalCard); // snap it in front of the player, sized to fit + facing them
  }
  // The common case: an intro whose Start begins the activity and whose "Go back" just closes.
  function showArrivalCard(title: string, line: string, onStart: () => void) {
    showActionCard({
      title, line,
      primaryLabel: "Start", onPrimary: onStart,
      secondaryLabel: "Go back", onSecondary: function () {},
    });
  }
  function hideArrivalCard() {
    if (arrivalCard.object3D) arrivalCard.object3D.visible = false;
  }

  // Each button closes the card, then runs its configured action.
  whenPanelReady(arrivalCard, function (doc) {
    arrivalTitleEl = doc.getElementById("arrival-title");
    arrivalLineEl = doc.getElementById("arrival-line");
    arrivalPrimaryLabelEl = doc.getElementById("arrival-start-label");
    arrivalSecondaryLabelEl = doc.getElementById("arrival-secondary-label");
    doc.getElementById("arrival-start")?.setProperties({
      onClick: function () { sfxClick(); hideArrivalCard(); arrivalPrimaryAction(); },
    });
    doc.getElementById("arrival-secondary")?.setProperties({
      onClick: function () { sfxClick(); hideArrivalCard(); arrivalSecondaryAction(); },
    });
  });

  // ==========================================================================
  // MODULE 9 — THE PLAN STATIONS (Product / Price / Marketing) — REDESIGNED
  // One shared builder drives all three stations. Each station is a short founder
  // beat, not a pop-up quiz with a throwaway second question:
  //   beat-option  : make the real business choice (what to sell / what to charge /
  //                  how to reach customers).
  //   beat-concept : the MENTOR sets up a short real-world scenario (no keyword echo of the
  //                  answer), then a REAL comprehension check: three plausible same-domain
  //                  answers, exactly one right. A wrong pick plays a soft cue and shows that
  //                  misconception's hint, then lets the player retry — only the correct
  //                  answer unlocks Continue. Application, not vocabulary-matching.
  //   beat-confirm : names the choice + the opportunity-cost trade-off, with a Continue
  //                  button (no more 3-second auto-close). Committing visibly BUILDS the
  //                  startup: the plan-board row flashes in and the sign flips to a green
  //                  "Done".
  // The taught concept is the SAME within a station (Product = Specialization, Price =
  // Supply and demand, Marketing = Markets), so the check is honest; the agency lives in
  // the business choice. The concept stored on studentPlan is always the correct one, so
  // the plan board + pitch stay pedagogically right. Opportunity cost is named at every
  // station, so it lands three times before the pitch. The Price + Marketing mentor lines
  // weave in the chosen product, so the three stations read as one founder journey.
  // ==========================================================================

  // Plan-board row colors, for the small "it filled in" flash when a station completes.
  const PLAN_ROW_INK = "#1F3A5F";
  const PLAN_ROW_FLASH_INK = "#c8962a";
  function flashPlanRow(rowId: string) {
    if (!planBoardDoc) return;
    const el = planBoardDoc.getElementById(rowId);
    if (!el) return;
    el.setProperties({ color: PLAN_ROW_FLASH_INK });
    setTimeout(function () { el.setProperties({ color: PLAN_ROW_INK }); }, 750);
  }

  // The current product, lowercased for mid-sentence use in the Price + Marketing mentor
  // lines. Falls back gracefully if a student does those stations before Product.
  function productPhrase(): string {
    return (studentPlan.productShort ? studentPlan.productShort : "startup").toLowerCase();
  }

  // Are the OTHER two stations already complete? (so this station's Continue can say
  // "that's your whole plan — go pitch".)
  function otherStationsComplete(exceptKey: string): boolean {
    const done: Record<string, boolean> = {
      product: studentPlan.product !== "" && studentPlan.idea !== "",
      price: studentPlan.price !== "" && studentPlan.priceIdea !== "",
      marketing: studentPlan.marketing !== "" && studentPlan.marketingIdea !== "",
    };
    return Object.keys(done).filter(function (k) { return k !== exceptKey; }).every(function (k) { return done[k]; });
  }

  // Card looks: chosen-right (green), chosen-wrong (a gentle amber redirect, never a scary red).
  const STATION_GOOD_BORDER = PRODUCT_SELECTED_BORDER;
  const STATION_GOOD_BG = PRODUCT_SELECTED_BG;
  const STATION_WRONG_BORDER = "#c98a2a";
  const STATION_WRONG_BG = "#f7ebd4";
  const STATION_FEEDBACK_RIGHT = "#2e7d32";
  const STATION_FEEDBACK_WRONG = "#a9701a";
  // The sign's open vs. done looks.
  const SIGN_OPEN_BG = "#1F3A5F";
  const SIGN_OPEN_BORDER = "#8a6118";
  const SIGN_OPEN_INK = "#f3e9d2";
  const SIGN_DONE_BG = "#2e7d32";
  const SIGN_DONE_BORDER = "#1c5a20";
  const SIGN_DONE_INK = "#ffffff";

  type StationOption = { id: string; label: string; short: string; region?: string };

  // Every station's "start over" hook, so the ending's "New plan" can wipe all three at once
  // (clears the choice, the concept, the plan-board row, and the green Done sign).
  const stationResetFns: Array<() => void> = [];

  function buildIdeaStation(cfg: {
    key: "product" | "price" | "marketing";
    spot: { x: number; y: number; z: number };
    pickConfig: string;
    signConfig: string;
    signOpenLabel: string;                 // the sign's text before/while building
    signDoneLabel: string;                 // the sign's text once the station is finished
    arrivalTitle: string;
    arrivalLine: string;
    optionCardWidth: number;
    options: StationOption[];
    concept: { id: string; label: string };           // the concept this station TEACHES (stored on the plan)
    checkQuestion: string;                             // "What economic idea is that?"
    checkCards: { name: string; desc: string; correct: boolean; hint?: string }[];  // exactly one correct; hint = per-wrong-answer nudge
    feedbackRight: string;
    feedbackWrong: string;                             // names the correct concept
    mentorBridge: (opt: StationOption) => string;
    confirmText: (opt: StationOption) => string;
    // P0.2 (optional): an extra "name the detail" beat shown right after the option is chosen —
    // the Product station names the PROBLEM it solves, the Marketing station names the CUSTOMER
    // it is for. `optionsFor(opt)` returns 2..4 plain choices (no wrong answer); the pick is
    // stored on studentPlan under `field` (problem/customer) as id/Label/Short.
    detail?: {
      field: "problem" | "customer";
      question: string;
      optionsFor: (opt: StationOption) => { id: string; label: string; short: string }[];
    };
  }) {
    const plan = studentPlan as any;
    // The studentPlan field names this station writes (Product uses idea/ideaLabel; the
    // others use <key>Idea/<key>IdeaLabel) — matched to what refreshPlanBoard reads.
    const ideaKey = cfg.key === "product" ? "idea" : cfg.key + "Idea";
    const ideaLabelKey = cfg.key === "product" ? "ideaLabel" : cfg.key + "IdeaLabel";
    const conceptIds = ["a", "b", "c"];
    const correctIndex = cfg.checkCards.findIndex(function (c) { return c.correct; });

    const pickPanel = world
      .createTransformEntity()
      .addComponent(PanelUI, { config: cfg.pickConfig, maxWidth: PRODUCT_PANEL_MAX_WIDTH, maxHeight: PRODUCT_PANEL_MAX_HEIGHT })
      .addComponent(Interactable);
    pickPanel.object3D!.visible = false;
    storyPanels.push(pickPanel);

    let resetBeats: () => void = function () {};
    let markStationDone: () => void = function () {};
    let markStationReset: () => void = function () {};
    // Register this station's reset so the ending can start the whole plan over.
    stationResetFns.push(function () { resetBeats(); });

    // Is THIS station already finished (both its business choice AND its concept chosen)?
    function thisStationComplete(): boolean {
      return plan[cfg.key] !== "" && plan[ideaKey] !== "";
    }

    // Tapping the sign: if the station is still open, show the normal arrival intro whose
    // Start begins the activity. If it is already DONE, show a REVIEW card instead — the safe
    // default (gold "Keep it") just closes, and only "Change it" reopens the activity (which
    // clears the station to redo it). This is the P1.1 fix: a curious tap on a finished
    // station can no longer silently wipe the plan + re-lock the pitch.
    function openPanel() {
      if (!stationsUnlocked) return; // gated until the opening finishes or is skipped
      if (thisStationComplete()) {
        const summary = plan[cfg.key + "Short"] + " (" + plan[ideaLabelKey] + ")";
        showActionCard({
          title: cfg.arrivalTitle,
          line: "You already chose: " + summary + ". Keep it, or change it?",
          primaryLabel: "Keep it", onPrimary: function () {},
          secondaryLabel: "Change it", onSecondary: beginActivity,
        });
        return;
      }
      showArrivalCard(cfg.arrivalTitle, cfg.arrivalLine, beginActivity);
    }
    function beginActivity() {
      const o3d = pickPanel.object3D;
      if (!o3d) return;
      resetBeats();
      o3d.visible = true;
      presentPanel(pickPanel);
    }

    whenPanelReady(pickPanel, function (doc) {
      const beatOption = doc.getElementById("beat-option");
      const beatConcept = doc.getElementById("beat-concept");
      const beatConfirm = doc.getElementById("beat-confirm");
      const mentorBridgeEl = doc.getElementById("mentor-bridge");
      const conceptQuestionEl = doc.getElementById("concept-question");
      const feedbackEl = doc.getElementById("concept-feedback");
      const conceptNextBtn = doc.getElementById("concept-next");
      const confirmTextEl = doc.getElementById("confirm-text");
      const confirmContinueLabel = doc.getElementById("confirm-continue-label");

      const optionCards: Record<string, any> = {};
      for (const o of cfg.options) {
        const card = doc.getElementById("card-" + o.id);
        optionCards[o.id] = card;
        card?.setProperties({ width: cfg.optionCardWidth });
      }
      const conceptCards = conceptIds.map(function (id) { return doc.getElementById("concept-" + id); });
      conceptCards.forEach(function (c) { c?.setProperties({ width: PRODUCT_IDEA_CARD_WIDTH }); });

      // P0.2 detail beat handles (only present in the Product + Marketing layouts).
      const beatDetail = doc.getElementById("beat-detail");
      const detailQuestionEl = doc.getElementById("detail-question");
      const detailIds = ["a", "b", "c", "d"];
      const detailCards = detailIds.map(function (id) { return doc.getElementById("detail-" + id); });
      const detailTextEls = detailIds.map(function (id) { return doc.getElementById("detail-" + id + "-text"); });
      let currentDetailOptions: { id: string; label: string; short: string }[] = [];

      let chosenOption: StationOption | null = null;
      let answered = false;

      function paintOptions(chosenId: string) {
        for (const o of cfg.options) {
          const isSel = o.id === chosenId;
          optionCards[o.id]?.setProperties({
            borderColor: isSel ? STATION_GOOD_BORDER : PRODUCT_CARD_BORDER,
            backgroundColor: isSel ? STATION_GOOD_BG : PRODUCT_CARD_BG,
          });
        }
      }
      // Fill the three concept cards' words from the spine; reset to the neutral look.
      function fillConceptCards() {
        cfg.checkCards.forEach(function (cc, i) {
          doc.getElementById("concept-" + conceptIds[i] + "-name")?.setProperties({ text: cc.name });
          doc.getElementById("concept-" + conceptIds[i] + "-desc")?.setProperties({ text: cc.desc });
          conceptCards[i]?.setProperties({ borderColor: PRODUCT_CARD_BORDER, backgroundColor: PRODUCT_CARD_BG });
        });
      }
      // Right answer: green just the correct card (wrong picks were nudged earlier, so by the
      // time we land here the player has reasoned their way to the right one).
      function paintConceptResult(pickedIndex: number) {
        cfg.checkCards.forEach(function (cc, i) {
          let border = PRODUCT_CARD_BORDER;
          let bg = PRODUCT_CARD_BG;
          if (i === correctIndex) { border = STATION_GOOD_BORDER; bg = STATION_GOOD_BG; }
          else if (i === pickedIndex) { border = STATION_WRONG_BORDER; bg = STATION_WRONG_BG; }
          conceptCards[i]?.setProperties({ borderColor: border, backgroundColor: bg });
        });
      }
      // Wrong answer: amber only the card they picked, leave the rest neutral. We deliberately
      // do NOT reveal the correct card — the player reads the hint and picks again.
      function paintConceptWrong(pickedIndex: number) {
        cfg.checkCards.forEach(function (_cc, i) {
          const isWrong = i === pickedIndex;
          conceptCards[i]?.setProperties({
            borderColor: isWrong ? STATION_WRONG_BORDER : PRODUCT_CARD_BORDER,
            backgroundColor: isWrong ? STATION_WRONG_BG : PRODUCT_CARD_BG,
          });
        });
      }

      // Back to beat 1 with nothing chosen — used on first load and on every reopen.
      resetBeats = function () {
        plan[cfg.key] = ""; plan[cfg.key + "Label"] = ""; plan[cfg.key + "Short"] = "";
        if (cfg.key === "product") plan.productRegion = "";
        if (cfg.detail) { plan[cfg.detail.field] = ""; plan[cfg.detail.field + "Label"] = ""; plan[cfg.detail.field + "Short"] = ""; }
        plan[ideaKey] = ""; plan[ideaLabelKey] = "";
        chosenOption = null;
        answered = false;
        paintOptions("");
        fillConceptCards();
        conceptQuestionEl?.setProperties({ text: cfg.checkQuestion });
        feedbackEl?.setProperties({ display: "none" });
        conceptNextBtn?.setProperties({ display: "none" });
        beatDetail?.setProperties({ display: "none" });
        beatConcept?.setProperties({ display: "none" });
        beatConfirm?.setProperties({ display: "none" });
        beatOption?.setProperties({ display: "flex" });
        markStationReset();   // a re-do clears the green Done sign back to its open look
        refreshPlanBoard();
      };

      // P0.2 detail beat: highlight the chosen detail card.
      function paintDetail(chosenIdx: number) {
        detailCards.forEach(function (c, i) {
          const isSel = i === chosenIdx;
          c?.setProperties({
            borderColor: isSel ? STATION_GOOD_BORDER : PRODUCT_CARD_BORDER,
            backgroundColor: isSel ? STATION_GOOD_BG : PRODUCT_CARD_BG,
          });
        });
      }
      // Populate + show the detail beat for the chosen option; any unused cards are hidden.
      function showDetailBeat(opt: StationOption) {
        currentDetailOptions = cfg.detail!.optionsFor(opt);
        detailQuestionEl?.setProperties({ text: cfg.detail!.question });
        detailCards.forEach(function (c, i) {
          const d = currentDetailOptions[i];
          if (d) { detailTextEls[i]?.setProperties({ text: d.label }); c?.setProperties({ display: "flex", width: PRODUCT_IDEA_CARD_WIDTH }); }
          else { c?.setProperties({ display: "none" }); }
        });
        paintDetail(-1);
        beatOption?.setProperties({ display: "none" });
        beatDetail?.setProperties({ display: "flex" });
      }
      // The detail pick (no wrong answer): store it on the plan, then bridge into the concept.
      function selectDetail(i: number) {
        const d = currentDetailOptions[i];
        if (!d || !chosenOption) return;
        plan[cfg.detail!.field] = d.id;
        plan[cfg.detail!.field + "Label"] = d.label;
        plan[cfg.detail!.field + "Short"] = d.short;
        paintDetail(i);
        beatDetail?.setProperties({ display: "none" });
        bridgeToConcept(chosenOption);
      }

      // The mentor bridges the chosen option into the economic concept check (shared by the
      // option -> concept path and the option -> detail -> concept path).
      function bridgeToConcept(opt: StationOption) {
        mentorBridgeEl?.setProperties({ text: cfg.mentorBridge(opt) });
        fillConceptCards();
        feedbackEl?.setProperties({ display: "none" });
        conceptNextBtn?.setProperties({ display: "none" });
        answered = false;
        sfxNotify(); // the mentor speaks up
        beatConcept?.setProperties({ display: "flex" });
      }

      // Beat 1: record the business choice. Product/Marketing then name a detail (problem /
      // customer) before the mentor bridge; Price goes straight to the concept.
      function selectOption(opt: StationOption) {
        chosenOption = opt;
        plan[cfg.key] = opt.id; plan[cfg.key + "Label"] = opt.label; plan[cfg.key + "Short"] = opt.short;
        if (cfg.key === "product" && opt.region) plan.productRegion = opt.region;
        paintOptions(opt.id);
        if (cfg.detail) { showDetailBeat(opt); }
        else { beatOption?.setProperties({ display: "none" }); bridgeToConcept(opt); }
      }

      // Beat 2: a real comprehension check. The right answer affirms + coins + unlocks the
      // Continue button. A wrong answer is NOT accepted: it plays a soft "try again" cue and
      // shows THAT option's misconception hint, then lets the player choose again. Continue
      // only appears once they reason their way to the correct answer.
      function selectConcept(i: number) {
        if (answered) return; // already solved — ignore extra taps
        const card = cfg.checkCards[i];
        if (card.correct) {
          answered = true;
          paintConceptResult(i);
          feedbackEl?.setProperties({ text: cfg.feedbackRight, color: STATION_FEEDBACK_RIGHT, display: "flex" });
          sfxCoin();
          conceptNextBtn?.setProperties({ display: "flex" });
        } else {
          paintConceptWrong(i);
          feedbackEl?.setProperties({ text: card.hint || cfg.feedbackWrong, color: STATION_FEEDBACK_WRONG, display: "flex" });
          sfxDown();
        }
      }

      function toConfirm() {
        const opt: StationOption = chosenOption || { id: "", label: "", short: "", region: "" };
        confirmTextEl?.setProperties({ text: cfg.confirmText(opt) });
        confirmContinueLabel?.setProperties({ text: otherStationsComplete(cfg.key) ? "Let's pitch!" : "Got it!" });
        beatConcept?.setProperties({ display: "none" });
        beatConfirm?.setProperties({ display: "flex" });
      }

      // Beat 3 commit: record the concept, fill + flash the plan board, flip the sign to Done.
      function commitAndClose() {
        plan[ideaKey] = cfg.concept.id; plan[ideaLabelKey] = cfg.concept.label;
        refreshPlanBoard();
        flashPlanRow("plan-row-" + cfg.key);
        markStationDone();
        sfxStage();
        if (pickPanel.object3D) pickPanel.object3D.visible = false;
      }

      for (const o of cfg.options) {
        optionCards[o.id]?.setProperties({ onClick: function () { sfxClick(); selectOption(o); } });
      }
      conceptIds.forEach(function (id, i) {
        conceptCards[i]?.setProperties({ onClick: function () { selectConcept(i); } });
      });
      detailIds.forEach(function (_id, i) {
        detailCards[i]?.setProperties({ onClick: function () { sfxClick(); selectDetail(i); } });
      });
      conceptNextBtn?.setProperties({ onClick: function () { sfxClick(); toConfirm(); } });
      doc.getElementById("confirm-continue")?.setProperties({ onClick: function () { sfxClick(); commitAndClose(); } });

      // P1.2 "Go back": leave the station without committing. resetBeats already cleared any
      // in-progress data on open, so simply hiding the panel is safe — an unfinished station
      // stays unfinished (its sign stays open), and a finished one is only ever reached here
      // via the review card's explicit "Change it".
      doc.getElementById("station-back")?.setProperties({
        onClick: function () { sfxClick(); if (pickPanel.object3D) pickPanel.object3D.visible = false; },
      });

      resetBeats(); // start on beat 1, nothing chosen
    });

    // The tappable sign on this station's pedestal (always present; reopen = start over).
    const sign = world
      .createTransformEntity()
      .addComponent(PanelUI, { config: cfg.signConfig, maxWidth: PRODUCT_TRIGGER_MAX_WIDTH, maxHeight: PRODUCT_TRIGGER_MAX_HEIGHT })
      .addComponent(Interactable);
    sign.object3D!.position.set(
      cfg.spot.x + PRODUCT_TRIGGER_OFFSET.x,
      PRODUCT_TRIGGER_OFFSET.y,
      cfg.spot.z + PRODUCT_TRIGGER_OFFSET.z,
    );
    sign.object3D!.visible = true;
    whenPanelReady(sign, function (doc) {
      const btn = doc.getElementById("station-open-button");
      const titleEl = doc.getElementById("station-cta-title");
      btn?.setProperties({ onClick: function () { sfxClick(); openPanel(); } });
      markStationDone = function () {
        btn?.setProperties({ backgroundColor: SIGN_DONE_BG, borderColor: SIGN_DONE_BORDER });
        titleEl?.setProperties({ text: cfg.signDoneLabel, color: SIGN_DONE_INK });
      };
      markStationReset = function () {
        btn?.setProperties({ backgroundColor: SIGN_OPEN_BG, borderColor: SIGN_OPEN_BORDER });
        titleEl?.setProperties({ text: cfg.signOpenLabel, color: SIGN_OPEN_INK });
      };
    });
  }

  // P0.2 — the PROBLEM each product solves (per-product options). `short` is phrased to slot
  // after "solves " in the pitch opening ("solves the need for fresh food"). No wrong answer.
  const PRODUCT_PROBLEMS: Record<string, { id: string; label: string; short: string }[]> = {
    tech: [
      { id: "time", label: "People waste time on slow tasks", short: "the problem of wasting time" },
      { id: "connect", label: "People need better ways to connect", short: "the need to stay connected" },
      { id: "fun", label: "People want more fun and games", short: "the wish for more fun" },
    ],
    delivery: [
      { id: "far", label: "People need things from far away", short: "the trouble of getting goods from far away" },
      { id: "busy", label: "Busy people can't get to the store", short: "the problem of no time to shop" },
      { id: "heavy", label: "Heavy items are hard to carry home", short: "the trouble of carrying heavy things" },
    ],
    tour: [
      { id: "bored", label: "Visitors want fun things to do", short: "the need for fun things to do" },
      { id: "history", label: "People want to explore history", short: "the wish to learn history" },
      { id: "memories", label: "Families want special memories", short: "the wish for special memories" },
    ],
    farm: [
      { id: "fresh", label: "People want fresh, healthy food", short: "the need for fresh, healthy food" },
      { id: "local", label: "People want to support local farms", short: "the wish to buy local" },
      { id: "far", label: "Store food travels a long way", short: "the problem of food shipped from far away" },
    ],
  };

  // P0.2 — the CUSTOMER a startup serves (one shared set; works for any product). `short`
  // slots after "for " in the pitch opening ("for families nearby").
  const MARKETING_CUSTOMERS: { id: string; label: string; short: string }[] = [
    { id: "families", label: "Families in the neighborhood", short: "families nearby" },
    { id: "visitors", label: "Visitors and tourists", short: "visitors and tourists" },
    { id: "students", label: "Students and young people", short: "students and young people" },
    { id: "businesses", label: "Other local businesses", short: "local businesses" },
  ];

  // PRODUCT — teaches Specialization (focus on what your region of Virginia does best).
  buildIdeaStation({
    key: "product",
    spot: PRODUCT_SPOT,
    pickConfig: "./ui/product-pick.json",
    signConfig: "./ui/product-station.json",
    signOpenLabel: "Choose Your Product",
    signDoneLabel: "Product set",
    arrivalTitle: ARRIVAL_PRODUCT_TITLE,
    arrivalLine: ARRIVAL_PRODUCT_LINE,
    optionCardWidth: PRODUCT_CARD_WIDTH,
    options: [
      { id: "tech", label: "A tech app or gadget", short: "Tech app", region: "Northern Virginia" },
      { id: "delivery", label: "A delivery and shipping service", short: "Delivery service", region: "Norfolk" },
      { id: "tour", label: "A tour and travel experience", short: "Tour experience", region: "Williamsburg" },
      { id: "farm", label: "A farm fresh food stand", short: "Farm stand", region: "Shenandoah Valley" },
    ],
    concept: { id: "specialization", label: "Specialization" },
    checkQuestion: "So how does a small startup actually win?",
    checkCards: [
      { name: "Be the best at one thing", desc: "Do what your area does best, better than anyone.", correct: true },
      { name: "Sell a bit of everything", desc: "More products means more chances to win.", correct: false,
        hint: "Selling everything is how big companies spread thin. A small startup wins by going deep on one strength. That's specialization." },
      { name: "Copy the big rival", desc: "Just offer whatever they already offer.", correct: false,
        hint: "Copying a bigger rival means fighting on their turf. Play to what YOUR area does best instead. That's specialization." },
    ],
    feedbackRight: "Exactly right. Going deep on one strength is specialization!",
    feedbackWrong: "Not quite. A small startup wins by doing one thing best. Give it another try.",
    mentorBridge: function (opt) {
      return "A big company could sell a little of everything, cheaper than your " +
        opt.short.toLowerCase() + " in " + (opt.region || "Virginia") + ". You can't outspend them.";
    },
    detail: {
      field: "problem",
      question: "What problem does it solve?",
      optionsFor: function (opt) { return PRODUCT_PROBLEMS[opt.id] || []; },
    },
    confirmText: function (opt) {
      const solves = studentPlan.problemShort ? (" that solves " + studentPlan.problemShort) : "";
      return "Your startup: a " + opt.short.toLowerCase() + " in " + (opt.region || "Virginia") + solves +
        ". Choosing it meant not choosing the others. That trade-off is opportunity cost, and every founder makes it.";
    },
  });

  // PRICE — teaches Supply and demand (let how many people want it guide the price).
  buildIdeaStation({
    key: "price",
    spot: PRICE_SPOT,
    pickConfig: "./ui/price-pick.json",
    signConfig: "./ui/price-station.json",
    signOpenLabel: "Choose Your Price",
    signDoneLabel: "Price set",
    arrivalTitle: ARRIVAL_PRICE_TITLE,
    arrivalLine: ARRIVAL_PRICE_LINE,
    optionCardWidth: PRODUCT_IDEA_CARD_WIDTH,
    options: [
      { id: "low", label: "Low price", short: "Low price" },
      { id: "medium", label: "Medium price", short: "Medium price" },
      { id: "high", label: "High price", short: "High price" },
    ],
    concept: { id: "supply", label: "Supply and demand" },
    checkQuestion: "What should happen to your price?",
    checkCards: [
      { name: "It can go up", desc: "Lots of buyers, only so many to go around.", correct: true },
      { name: "Cut it right away", desc: "A lower price always beats the competition.", correct: false,
        hint: "When people are already lining up, cutting the price leaves money on the table. Price follows demand. That's supply and demand." },
      { name: "Keep it fixed", desc: "Your costs didn't change, so the price shouldn't.", correct: false,
        hint: "Price isn't only about your costs. When demand outruns what you can supply, price can rise. That's supply and demand." },
    ],
    feedbackRight: "Exactly right. Price rising with demand is supply and demand!",
    feedbackWrong: "Not quite. Think about what more buyers than supply does to price. Try again.",
    mentorBridge: function (opt) {
      return "Picture this: your " + productPhrase() +
        " takes off. Everyone wants in, but you can only serve so many at once.";
    },
    confirmText: function (opt) {
      return "Your price is set: " + opt.short.toLowerCase() +
        ". A higher price earns more per sale but draws fewer buyers. Picking one over the other is opportunity cost again.";
    },
  });

  // MARKETING — teaches Markets (reach the customers who want your product).
  buildIdeaStation({
    key: "marketing",
    spot: MARKETING_SPOT,
    pickConfig: "./ui/marketing-pick.json",
    signConfig: "./ui/marketing-station.json",
    signOpenLabel: "Choose Your Marketing",
    signDoneLabel: "Marketing set",
    arrivalTitle: ARRIVAL_MARKETING_TITLE,
    arrivalLine: ARRIVAL_MARKETING_LINE,
    optionCardWidth: PRODUCT_CARD_WIDTH,
    options: [
      { id: "social", label: "Social media videos", short: "Social media" },
      { id: "flyers", label: "Flyers and posters around town", short: "Flyers" },
      { id: "fair", label: "A booth at a local Virginia fair", short: "Fair booth" },
      { id: "word", label: "Word of mouth from happy customers", short: "Word of mouth" },
    ],
    concept: { id: "markets", label: "Markets" },
    checkQuestion: "Who should your marketing reach first?",
    checkCards: [
      { name: "The people who want it", desc: "Aim at the crowd most likely to buy.", correct: true },
      { name: "As many people as possible", desc: "The bigger the audience, the better.", correct: false,
        hint: "A huge audience is mostly people who'll never buy. Reach the crowd that already wants this. That's finding your market." },
      { name: "Whoever's cheapest to reach", desc: "Just chase the lowest-cost option.", correct: false,
        hint: "Cheap to reach is worthless if they aren't buyers. Go where your real customers are. That's finding your market." },
    ],
    feedbackRight: "Exactly right. You found your market!",
    feedbackWrong: "Not quite. Aim where your real buyers are. Give it another go.",
    detail: {
      field: "customer",
      question: "Who is it for?",
      optionsFor: function () { return MARKETING_CUSTOMERS; },
    },
    mentorBridge: function (opt) {
      return "You'll use " + opt.short.toLowerCase() + " to reach " + (studentPlan.customerShort || "your customers") +
        ", but your time and budget are limited. You can't reach everyone.";
    },
    confirmText: function (opt) {
      const forWho = studentPlan.customerShort ? (", aimed at " + studentPlan.customerShort) : "";
      return "Your marketing is set: " + opt.short.toLowerCase() + forWho +
        ". Reaching the right buyers is how you find your market and grow.";
    },
  });

  // ==========================================================================
  // MODULE 9 — "DELIVER YOUR PITCH" BUTTON
  // A tappable 3D button standing in front of the investors' desk, facing the
  // player. It is built the SAME way as the station signs (a PanelUI sign with
  // one clickable element + Interactable, wired through onClick), and it reads the
  // SAME completeness signal the plan board uses: a station counts as done only
  // when BOTH its option and its economic idea are chosen in studentPlan.
  //
  // Two states, swapped with setProperties (the exact recolor path the station
  // cards use):
  //   • LOCKED — greyed out, label "Finish your plan first." A tap does nothing.
  //   • READY  — normal navy/gold look, label "Deliver your pitch." A tap opens the
  //              pitch (Part 1, the opening — built just below).
  // The flip and the gentle ready-pulse are driven by ONE setInterval (never rAF),
  // so the button activates the instant the third station is finished. This block
  // is additive — the stations, board, investors, host, and room are untouched.
  // ==========================================================================

  // READY only when all three stations have BOTH their option and idea chosen —
  // the same per-station rule refreshPlanBoard() shows on the wall board.
  function isPlanComplete(): boolean {
    const productDone = studentPlan.product !== "" && studentPlan.idea !== "";
    const priceDone = studentPlan.price !== "" && studentPlan.priceIdea !== "";
    const marketingDone = studentPlan.marketing !== "" && studentPlan.marketingIdea !== "";
    return productDone && priceDone && marketingDone;
  }

  // The button sign itself. Placed in front of the desk and (like the station
  // signs) left unrotated, so its +Z face looks back toward the player. Normal
  // depth — nothing sits between the player and it, so it is not in storyPanels.
  const pitchButton = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/pitch-button.json", maxWidth: DELIVER_BUTTON_MAX_WIDTH, maxHeight: DELIVER_BUTTON_MAX_HEIGHT })
    .addComponent(Interactable);
  pitchButton.object3D!.position.set(DELIVER_BUTTON_POSITION.x, DELIVER_BUTTON_POSITION.y, DELIVER_BUTTON_POSITION.z);
  pitchButton.object3D!.visible = true;

  // ----- THE PITCH (PARTS 1–3) --------------------------------------------
  // Tapping the READY button runs the pitch: Part 1 (opening) -> Part 2 (economic
  // case) -> Part 3 (ask), one card panel at a time, in front of the investors. All
  // three are built by ONE shared helper (buildPitchPart) over ONE generic card
  // layout (ui/pitch-part.json) — the SAME card system the plan stations use. Only the
  // CONTENT differs per part (question, the three option lines, the confirm line), and
  // the lines are composed at open time from the student's real plan. Each option (card)
  // targets ONE investor (Smart Money / Customers / Low Risk); the chosen line and its
  // target investor are saved into studentPlan.pitch. There are no wrong answers — every
  // card is a good pitch line. After Part 3 the pitch parts are done.

  // Lowercase the first letter so an economic idea reads naturally mid-sentence:
  // "Supply and demand" -> "supply and demand". (All idea labels are single-capital.)
  function lcFirst(s: string): string { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  // The student's real plan values for the sentences, lowercased for mid-sentence use:
  // PRODUCT = the product short label ("Farm stand" -> "farm stand"); PRICE and MARKETING
  // likewise ("Medium price" -> "medium price", "Social media" -> "social media"). REGION
  // is a proper place name, so it is NOT lowercased; it comes from the plan, falling back
  // to the product's home region (the SAME id->region map the Product station uses) when
  // none is stored: Tech app -> Northern Virginia, Delivery service -> Norfolk, Tour
  // experience -> Williamsburg, Farm stand -> Shenandoah Valley.
  function pitchProduct(): string { return lcFirst(studentPlan.productShort || "business"); }
  function pitchRegion(): string {
    if (studentPlan.productRegion) return studentPlan.productRegion;
    const byProduct: Record<string, string> = { tech: "Northern Virginia", delivery: "Norfolk", tour: "Williamsburg", farm: "Shenandoah Valley" };
    return byProduct[studentPlan.product] || "Virginia";
  }
  function pitchPrice(): string { return lcFirst(studentPlan.priceShort || "price"); }
  function pitchMarketing(): string { return lcFirst(studentPlan.marketingShort || "marketing"); }
  // P0.2 — the problem + customer, phrased to slot mid-sentence ("solves <problem> for <customer>").
  function pitchProblem(): string { return studentPlan.problemShort || "a real need"; }
  function pitchCustomer(): string { return studentPlan.customerShort || "local customers"; }

  // Wipe the running pitch (the chosen lines + their target investors) — used each time
  // the player starts a fresh pitch, so a re-run never mixes old and new answers.
  function resetPitchData() {
    const obj: any = studentPlan.pitch;
    for (const k of Object.keys(obj)) {
      obj[k] = (typeof obj[k] === "number") ? 0 : (typeof obj[k] === "boolean") ? false : "";
    }
  }

  const _pitchEye = new Vector3();
  const _pitchFwd = new Vector3();
  const _pitchTargetPos = new Vector3();

  // The pitch part panel currently on screen (set by each part's open()). The follow loop
  // below keeps THIS panel parked low and in front of the player, so the investors always
  // read above it and it never blocks them — however the player moves, turns, or backs up.
  let activePitchPanel: any = null;

  // Where the cue-card strip should sit RIGHT NOW: PITCH_PANEL_DIST in front of the player
  // along their (flattened) look direction, PITCH_PANEL_DROP below eye line. Into _pitchTargetPos.
  function pitchPanelTarget(): boolean {
    const cam: any = world.camera;
    if (!cam) return false;
    cam.getWorldPosition(_pitchEye);
    cam.getWorldDirection(_pitchFwd);
    _pitchFwd.y = 0;
    if (_pitchFwd.lengthSq() < 1e-6) _pitchFwd.set(0, 0, -1);
    _pitchFwd.normalize();
    _pitchTargetPos.set(
      _pitchEye.x + _pitchFwd.x * PITCH_PANEL_DIST,
      _pitchEye.y - PITCH_PANEL_DROP,
      _pitchEye.z + _pitchFwd.z * PITCH_PANEL_DIST,
    );
    return true;
  }

  // Park a pitch panel at that target — SNAP on first show, then EASE toward it each tick so
  // it rides the lower view smoothly (investors visible above), always turned to face the player.
  function placePitchPanel(entity: any, snap: boolean) {
    const o3d = entity.object3D;
    if (!o3d || !pitchPanelTarget()) return;
    if (snap) o3d.position.copy(_pitchTargetPos);
    else o3d.position.lerp(_pitchTargetPos, PITCH_FOLLOW_LERP);
    o3d.rotation.set(0, Math.atan2(_pitchEye.x - o3d.position.x, _pitchEye.z - o3d.position.z), 0, "YXZ");
    applyPanelOnTop(entity);
  }

  // Open-time placement: make this the active pitch panel and snap it into the lower view.
  function presentPitchPanel(entity: any) {
    activePitchPanel = entity;
    placePitchPanel(entity, true);
  }

  // ONE follow loop keeps whichever pitch part is showing parked low + in front (setInterval,
  // never rAF). It eases rather than snaps, so small head motion stays smooth; when no part is
  // visible it does nothing, so a hidden/advancing panel is left alone.
  setInterval(function () {
    const p = activePitchPanel;
    if (p && p.object3D && p.object3D.visible) placePitchPanel(p, false);
  }, 33);

  // Pop the per-answer feedback bubble for investor `index`: an escalating reaction line
  // (matching their new pip count) above their head, faced at the player. Reuses the
  // investor-reaction panels (the ending repositions + repops them later). Shown the moment
  // a card targeting that investor is picked, so each answer gets a visible response.
  function showPitchFeedback(index: number) {
    const panel = endingReactionPanels[index];
    const el = endingReactionEls[index];
    if (!panel || !el || !panel.object3D) return;
    const n = Math.max(0, Math.min(3, investorConfidence[index] || 0));
    el.setProperties({ text: (INVESTOR_FEEDBACK_LINES[index] || [])[n] || "" });
    const spot = investorSpots[index];
    const o = panel.object3D;
    o.position.set(spot.x, PITCH_FEEDBACK_Y, PITCH_FEEDBACK_Z);
    const cam = world.camera;
    if (cam) {
      cam.getWorldPosition(_pitchEye);
      o.rotation.set(0, Math.atan2(_pitchEye.x - spot.x, _pitchEye.z - PITCH_FEEDBACK_Z), 0, "YXZ");
    }
    o.scale.setScalar(1);
    o.visible = true;
    applyPanelOnTop(panel);
  }

  // Every pitch part panel, so "Go back" (and a fresh start) can hide whichever is showing.
  const pitchPartPanels: any[] = [];

  // Hide all per-answer feedback bubbles (the investor-reaction panels reused during the pitch).
  function hidePitchFeedback() {
    for (const p of endingReactionPanels) { if (p && p.object3D) p.object3D.visible = false; }
  }

  // P1.2 cancel: leave the pitch cleanly from any part. Hide the parts + feedback bubbles, stop
  // the follow loop from tracking a panel, and reset the run so a later re-pitch starts fresh.
  // (The pitch button relocks itself only if the plan is incomplete; the plan itself is kept.)
  function cancelPitch() {
    activePitchPanel = null;
    for (const p of pitchPartPanels) { if (p && p.object3D) p.object3D.visible = false; }
    hidePitchFeedback();
    resetPitchData();
    resetInvestorConfidence();
    console.log("[PITCH] cancelled by player");
  }

  // Build one pitch part: a cards panel exactly like a plan station's, driven by cfg.
  // saveKey is the studentPlan.pitch field prefix (opening | case | ask). onPicked runs when
  // the student taps Next (no auto-advance) — it opens the next part, or finishes after Part 3.
  function buildPitchPart(cfg: {
    question: string;
    confirmMsg: string;
    saveKey: string;
    options: { investor: string; text: () => string }[];
    onPicked: () => void;
  }): { open: () => void } {
    const plan: any = studentPlan;
    const ids = ["a", "b", "c"];

    // One generic layout, hidden until shown — three parts each load the same json.
    const panel = world
      .createTransformEntity()
      .addComponent(PanelUI, { config: "./ui/pitch-part.json", maxWidth: PITCH_PANEL_MAX_WIDTH, maxHeight: PITCH_PANEL_MAX_HEIGHT })
      .addComponent(Interactable);
    panel.object3D!.visible = false;
    storyPanels.push(panel); // kept drawn over the desk/figures by the on-top loop

    let reset: () => void = function () {};
    pitchPartPanels.push(panel); // so "Go back" / a fresh start can hide whichever part shows

    // Refresh from the live plan, then pop the cards LOW in front of the user (a podium of
    // cue cards) so the investors stay visible above them — see presentPitchPanel.
    function open() {
      const o3d = panel.object3D;
      if (!o3d) return;
      reset();
      o3d.visible = true;
      presentPitchPanel(panel); // sit it below the investors, facing the player
    }

    whenPanelReady(panel, function (doc) {
      doc.getElementById("pitch-question")?.setProperties({ text: cfg.question });
      doc.getElementById("pitch-confirm")?.setProperties({ text: cfg.confirmMsg });
      const cards: any = {};
      const texts: any = {};
      const tags: any = {};
      ids.forEach(function (id) {
        cards[id] = doc.getElementById("pitch-card-" + id);
        texts[id] = doc.getElementById("pitch-text-" + id);
        tags[id] = doc.getElementById("pitch-tag-" + id);
        cards[id]?.setProperties({ width: PITCH_CARD_WIDTH });
      });
      const confirm = doc.getElementById("pitch-confirm");
      const nextBtn = doc.getElementById("pitch-next");

      // One pick per part. Set true on the first accepted tap so extra taps (a second
      // card, or the same one again) before the part auto-advances are ignored — otherwise
      // each tap awards another pip and over-fills the investor meters. Cleared by reset().
      let picked = false;

      // Paint the chosen card green, clear the rest — the same recolor the stations use.
      function highlight(chosenIdx: number) {
        ids.forEach(function (id, i) {
          const isSel = i === chosenIdx;
          cards[id]?.setProperties({
            borderColor: isSel ? PRODUCT_SELECTED_BORDER : PRODUCT_CARD_BORDER,
            backgroundColor: isSel ? PRODUCT_SELECTED_BG : PRODUCT_CARD_BG,
          });
        });
      }

      // Compose this part's lines from the live plan, tag each card with the investor it
      // targets, and clear any previous pick.
      reset = function () {
        picked = false;
        cfg.options.forEach(function (o, i) {
          texts[ids[i]]?.setProperties({ text: o.text() });
          tags[ids[i]]?.setProperties({ text: PITCH_INVESTOR_LABEL[o.investor] || "" });
        });
        plan.pitch[cfg.saveKey] = "";
        plan.pitch[cfg.saveKey + "Investor"] = "";
        highlight(-1);
        confirm?.setProperties({ display: "none" });
        nextBtn?.setProperties({ display: "none" }); // P1.3: Next appears only after a pick
      };

      // Any pick is accepted (no wrong answers): remember the line and which investor the
      // card targets, confirm, and reveal Next (the student advances when ready).
      function pick(i: number) {
        if (picked) return; // already chose this part — ignore extra taps so meters don't over-fill
        picked = true;
        const o = cfg.options[i];
        const line = o.text();
        plan.pitch[cfg.saveKey] = line;
        plan.pitch[cfg.saveKey + "Investor"] = o.investor;
        awardInvestor(o.investor); // fill the targeted investor's meter + lean them in
        const ti = INVESTOR_IDS.indexOf(o.investor);
        if (ti >= 0) showPitchFeedback(ti); // pop their spoken reaction above their head
        highlight(i);
        confirm?.setProperties({ display: "flex" });
        nextBtn?.setProperties({ display: "flex" }); // P1.3: reveal Next, no auto-advance
        console.log("[PITCH] " + cfg.saveKey + " -> " + (PITCH_INVESTOR_LABEL[o.investor] || o.investor) + " : \"" + line + "\"");
      }

      // P1.3: advance only when the student taps Next, so no timer races their reading of the
      // investor's reaction. Hide this part + its feedback bubble, then open the next (or finish).
      function advance() {
        if (!picked) return; // Next is hidden until a card is chosen, but guard anyway
        hidePitchFeedback();
        if (panel.object3D) panel.object3D.visible = false;
        cfg.onPicked();
      }

      ids.forEach(function (id, i) {
        cards[id]?.setProperties({ onClick: function () { sfxClick(); pick(i); } });
      });
      nextBtn?.setProperties({ onClick: function () { sfxClick(); advance(); } });
      doc.getElementById("pitch-back")?.setProperties({ onClick: function () { sfxClick(); cancelPitch(); } });

      reset(); // compose the lines on first load
    });

    return { open: open };
  }

  // ----- THE ENDING ------------------------------------------------------
  // After Part 3, a friendly closing in front of the investors: a HEADLINE panel, a
  // one-line REACTION near each investor (matching their final pip count), and a gold
  // CHECK badge. Built the headset-visible way (PanelUI text + real 3D shapes). The reactions
  // + check are display-only, but the headline is Interactable so its "See your results" chip
  // can gate the recap behind a TAP (P1.3) instead of a timer that covers the desk mid-read.
  // All are drawn on-top by the story loop and hidden until showEnding() reveals them.

  // The headline panel — the celebratory line plus a "See your results" chip (hidden until the
  // headline lands). Interactable so the chip is tappable.
  const endingHeadlinePanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/ending-headline.json", maxWidth: ENDING_HEADLINE_MAX_WIDTH, maxHeight: ENDING_HEADLINE_MAX_HEIGHT })
    .addComponent(Interactable);
  endingHeadlinePanel.object3D!.visible = false;
  storyPanels.push(endingHeadlinePanel);
  let endingHeadlineEl: any = null;
  let endingSeeResultsEl: any = null;
  whenPanelReady(endingHeadlinePanel, function (doc) {
    endingHeadlineEl = doc.getElementById("ending-headline");
    endingSeeResultsEl = doc.getElementById("ending-see-results");
    endingSeeResultsEl?.setProperties({ display: "none" }); // shown only once the headline lands
    doc.getElementById("ending-see-results")?.setProperties({
      onClick: function () { sfxClick(); presentEndingRecap(); },
    });
  });

  // One reaction panel per investor, floating just in front of each above the desk. One
  // generic layout; the text is set per investor in showEnding from their pip count.
  const endingReactionPanels: any[] = [];
  const endingReactionEls: any[] = [];
  investorSpots.forEach(function (spot, i) {
    const panel = world
      .createTransformEntity()
      .addComponent(PanelUI, { config: "./ui/investor-reaction.json", maxWidth: ENDING_REACTION_MAX_WIDTH, maxHeight: ENDING_REACTION_MAX_HEIGHT });
    panel.object3D!.position.set(spot.x, ENDING_REACTION_Y, ENDING_REACTION_Z);
    panel.object3D!.visible = false;
    storyPanels.push(panel);
    endingReactionPanels.push(panel);
    endingReactionEls.push(null);
    whenPanelReady(panel, function (doc) {
      endingReactionEls[i] = doc.getElementById("investor-reaction");
      // The bold header names who is speaking (set once; the body text is set per pitch).
      doc.getElementById("investor-reaction-name")?.setProperties({ text: INVESTOR_PRIORITIES[i] });
    });
  });

  // The gold CHECK badge — real 3D shapes (a gold disc + a white check mark), in its own
  // group so the pulse scales it as a unit. Unlit + depth-off so it draws cleanly on-top
  // of the headline panel.
  const endingOnTop = function (color: string) {
    const m = new MeshBasicMaterial({ color: new Color(color) });
    m.depthTest = false;
    m.depthWrite = false;
    m.transparent = true;
    return m;
  };
  const endingCheckGroup = new Group();
  const endingDisc = new Mesh(new CircleGeometry(ENDING_CHECK_RADIUS, 48), endingOnTop(ENDING_CHECK_COLOR));
  endingDisc.renderOrder = ENDING_CHECK_RENDER_ORDER;
  endingCheckGroup.add(endingDisc);
  // Each check stroke is a thin box from point A to point B (A/B in units of the radius).
  const endingCheckArm = function (ax: number, ay: number, bx: number, by: number) {
    const c = ENDING_CHECK_RADIUS;
    const dx = (bx - ax) * c, dy = (by - ay) * c;
    const m = new Mesh(
      new BoxGeometry(Math.hypot(dx, dy) + ENDING_CHECK_STROKE, ENDING_CHECK_STROKE, ENDING_CHECK_DEPTH),
      endingOnTop(ENDING_CHECK_MARK_COLOR),
    );
    m.renderOrder = ENDING_CHECK_RENDER_ORDER + 1; // the white mark draws over the gold disc
    m.position.set(((ax + bx) / 2) * c, ((ay + by) / 2) * c, 0.006);
    m.rotation.z = Math.atan2(dy, dx);
    endingCheckGroup.add(m);
  };
  endingCheckArm(-0.45, 0.02, -0.12, -0.28); // short stroke: upper-left down to the vertex
  endingCheckArm(-0.12, -0.28, 0.42, 0.34);  // long stroke: vertex up to the upper-right
  const endingCheck = world.createTransformEntity(endingCheckGroup);
  endingCheck.object3D!.visible = false;

  // ----- THE RESULTS OFFBOARDING (the recap card) -------------------------
  // The pitch's payoff for the FOUNDER (the headline + reactions above are the payoff near the
  // investors). It pops in front of the player a beat after the celebration: the startup they
  // built — each choice tagged with the economic concept it showed — what they learned, and a
  // clear next step (Pitch again / New plan / Done). Built + shown like every other story panel.
  const endingRecapPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/ending-recap.json", maxWidth: 2.8, maxHeight: 2.6 })
    .addComponent(Interactable);
  endingRecapPanel.object3D!.visible = false;
  storyPanels.push(endingRecapPanel);
  let endingRecapDoc: any = null;

  // P1.3: the recap no longer slides in on a timer (which raced the reader and covered the
  // desk mid-read). Instead the headline's "See your results" chip gates it behind a tap — the
  // student reads the three investor reactions at their own pace, then taps to bring up the recap.

  function hideEndingRecap() {
    if (endingRecapPanel.object3D) endingRecapPanel.object3D.visible = false;
  }

  // Start the whole plan over (the ending's "New plan"): clear every station (choice, concept,
  // plan-board row, green Done sign), wipe the pitch + investor meters. The pitch button
  // re-locks itself once the plan is no longer complete.
  function resetWholePlan() {
    for (const reset of stationResetFns) reset();
    resetPitchData();
    resetInvestorConfidence();
    refreshPlanBoard();
  }

  // Fill the recap from the live plan + the final investor confidence, then pop it in front of
  // the player (sized + faced by presentPanel). The investors' reactions + headline + check
  // have had their beat near the desk; clear them now so the recap dashboard reads cleanly and
  // the forward-placed feedback cards don't overlap it.
  function presentEndingRecap() {
    hideEnding();
    if (endingRecapDoc) {
      const region = studentPlan.productRegion ? (" in " + studentPlan.productRegion) : "";
      const solves = studentPlan.problemShort ? (", solving " + studentPlan.problemShort) : "";
      const forWho = studentPlan.customerShort ? (" for " + studentPlan.customerShort) : "";
      endingRecapDoc.getElementById("built-product")?.setProperties({ text: (studentPlan.productLabel || "Your product") + region + solves });
      endingRecapDoc.getElementById("built-product-tag")?.setProperties({ text: "Idea: " + (studentPlan.ideaLabel || "Specialization") });
      endingRecapDoc.getElementById("built-price")?.setProperties({ text: studentPlan.priceLabel || "Your price" });
      endingRecapDoc.getElementById("built-price-tag")?.setProperties({ text: "Idea: " + (studentPlan.priceIdeaLabel || "Supply and demand") });
      endingRecapDoc.getElementById("built-marketing")?.setProperties({ text: (studentPlan.marketingLabel || "Your marketing") + forWho });
      endingRecapDoc.getElementById("built-marketing-tag")?.setProperties({ text: "Idea: " + (studentPlan.marketingIdeaLabel || "Markets") });

      // A personalized payoff line naming the investor(s) won over.
      const pips = investorConfidence;
      const maxPips = Math.max(pips[0], pips[1], pips[2]);
      const leaders: number[] = [];
      for (let i = 0; i < 3; i++) if (pips[i] === maxPips) leaders.push(i);
      const sub = (maxPips <= 0)
        ? "You built and pitched a real Virginia startup."
        : (leaders.length === 1)
          ? "You built a real Virginia startup and won over the " + INVESTOR_PRIORITIES[leaders[0]] + " investor!"
          : "You built a real Virginia startup and won over the whole panel!";
      endingRecapDoc.getElementById("recap-subtitle")?.setProperties({ text: sub });

      // P0.5: reflection prompts to carry into the classroom debrief — the hardest question (the
      // one they needed a retry on) and the concepts they used.
      endingRecapDoc.getElementById("reflect-hardest")?.setProperties({ text: hardestQuestionText() });
      endingRecapDoc.getElementById("reflect-concept")?.setProperties({
        text: "You used four big ideas: specialization, supply and demand, markets, and opportunity cost. Which one helped your startup the most?",
      });
    }
    endingRecapPanel.object3D!.visible = true;
    presentPanel(endingRecapPanel);
  }

  // P0.5: the reflection prompt about the trickiest investor question — the first one the student
  // answered weakly (needed the hint + a retry). If they answered every one strongly, ask which
  // made them think the most, so there is always something to reflect on.
  function hardestQuestionText(): string {
    const topics = ["your price and profit", "reaching your customers", "keeping your risk low"];
    for (let i = 0; i < INVESTOR_IDS.length; i++) {
      if (studentPlan.questions[INVESTOR_IDS[i]] === "weak") {
        return "Your trickiest question came from the " + INVESTOR_PRIORITIES[i] +
          " investor, about " + topics[i] + ". How did you work it out?";
      }
    }
    return "You answered every investor's question strongly. Which one made you think the most?";
  }

  whenPanelReady(endingRecapPanel, function (doc) {
    endingRecapDoc = doc;
    doc.getElementById("recap-pitch-again")?.setProperties({
      onClick: function () { sfxClick(); hideEndingRecap(); openPitch(); },
    });
    doc.getElementById("recap-new-plan")?.setProperties({
      onClick: function () { sfxClick(); hideEndingRecap(); hideEnding(); resetWholePlan(); },
    });
    doc.getElementById("recap-done")?.setProperties({
      onClick: function () { sfxClick(); hideEndingRecap(); },
    });
  });

  // Timers backing the ending: the staggered reveal (setTimeouts), the per-element scale
  // pops (self-clearing setIntervals), and one continuous pulse on the gold check. Tracked
  // so a fresh re-pitch (hideEnding) cancels anything still in flight.
  let endingSeqTimers: any[] = [];   // setTimeouts: the per-investor stagger + finish + recap
  let endingPopTimers: any[] = [];   // setIntervals: one scale pop per revealed element
  let endingCheckPulseTimer: any = null;

  function clearEndingTimers() {
    for (const t of endingSeqTimers) clearTimeout(t);
    endingSeqTimers = [];
    for (const t of endingPopTimers) clearInterval(t);
    endingPopTimers = [];
    if (endingCheckPulseTimer) { clearInterval(endingCheckPulseTimer); endingCheckPulseTimer = null; }
  }

  // Pop one object3D from small to full over a few setInterval ticks (the reveal "bloom").
  // Self-clearing; its handle is tracked so hideEnding can cancel an in-flight pop.
  function popInObject(o3d: any) {
    if (!o3d) return;
    o3d.scale.setScalar(ENDING_POP_START_SCALE);
    let tick = 0;
    const timer = setInterval(function () {
      tick++;
      const t = Math.min(1, tick / ENDING_POP_STEPS);
      o3d.scale.setScalar(ENDING_POP_START_SCALE + (1 - ENDING_POP_START_SCALE) * t);
      if (t >= 1) {
        clearInterval(timer);
        const k = endingPopTimers.indexOf(timer);
        if (k >= 0) endingPopTimers.splice(k, 1);
      }
    }, ENDING_POP_MS);
    endingPopTimers.push(timer);
  }

  // Each investor's SPECIFIC closing note: a line about the actual plan choice they care
  // about — Smart Money -> price, Customers -> marketing, Low Risk -> the product focus +
  // region. Built from the live studentPlan so it names what the student really chose, with
  // a fallback if a field is somehow empty. ASCII only (the panel font has no em dash).
  function investorPlanNote(i: number): string {
    if (i === 0) return "A " + lcFirst(studentPlan.priceLabel || "fair price") + " was the right call for the bottom line.";
    if (i === 1) return "And you reach the crowd with " + lcFirst(studentPlan.marketingLabel || "smart marketing") + ".";
    return "Focusing on " + lcFirst(studentPlan.productLabel || "one clear idea") + " in " + pitchRegion() + " keeps the risk low.";
  }
  // The full ending line per investor (P0.3): their verdict (escalates with how well the pitch
  // AND their follow-up served them, 0..3 pips — the verdict already carries the invest / not-yet
  // sentiment), the plan-specific thing they liked, and — only when they answered their follow-up
  // weakly — one short honest concern. So each investor's feedback is: liked + verdict + concern.
  function investorEndingFeedback(i: number): string {
    const n = Math.max(0, Math.min(3, investorConfidence[i] || 0));
    const verdict = (INVESTOR_FEEDBACK_LINES[i] || [])[n] || "";
    const note = investorPlanNote(i);
    const answeredWeak = studentPlan.questions[INVESTOR_IDS[i]] === "weak";
    const concern = answeredWeak ? (" " + (INVESTOR_CONCERN_LINES[i] || "")) : "";
    return (note ? (verdict + " " + note) : verdict) + concern;
  }

  // Reveal the ending as a paced beat: each investor speaks in turn (their specific feedback
  // + a lean-in nod + a soft chime), THEN the celebratory headline + gold check, THEN the
  // founder's recap slides in. Reading investorConfidence (0..3 pips each) for the headline.
  function showEnding() {
    clearEndingTimers(); // cancel anything still in flight from a prior reveal
    const pips = investorConfidence; // 0..3 per investor (left Smart Money, mid Customers, right Low Risk)

    // P0.5: one-line structured completion summary a teacher dashboard / LMS could later consume.
    // Prefixed [M9-RESULT] and emitted once per finished run, with the plan, the concepts, which
    // investor each pitch part targeted, each follow-up's outcome, and the final confidence pips.
    console.log("[M9-RESULT] " + JSON.stringify({
      product: studentPlan.product, price: studentPlan.price, marketing: studentPlan.marketing,
      problem: studentPlan.problem, customer: studentPlan.customer,
      region: pitchRegion(),
      concepts: { product: studentPlan.ideaLabel, price: studentPlan.priceIdeaLabel, marketing: studentPlan.marketingIdeaLabel },
      pitchTargets: { opening: studentPlan.pitch.openingInvestor, case: studentPlan.pitch.caseInvestor, ask: studentPlan.pitch.askInvestor },
      questions: { smartMoney: studentPlan.questions.smartMoney, customers: studentPlan.questions.customers, lowRisk: studentPlan.questions.lowRisk },
      pips: { smartMoney: pips[0], customers: pips[1], lowRisk: pips[2] },
    }));

    // Headline text (a lone leader is named; a tie celebrates the whole panel) — computed now,
    // revealed after the investors have spoken.
    const maxPips = Math.max(pips[0], pips[1], pips[2]);
    const leaders: number[] = [];
    for (let i = 0; i < 3; i++) if (pips[i] === maxPips) leaders.push(i);
    const headline = (leaders.length === 1)
      ? ENDING_HEADLINE_LEAD + INVESTOR_PRIORITIES[leaders[0]] + ENDING_HEADLINE_TAIL
      : ENDING_HEADLINE_TIE;
    endingHeadlineEl?.setProperties({ text: headline });
    console.log("[PITCH] ending — pips [SmartMoney, Customers, LowRisk] = [" + pips.join(", ") + "]  headline: \"" + headline + "\"");

    // Face the player (a panel's / shape's front is its +Z side). Recomputed per reveal so a
    // player who has moved is still faced.
    const cam = world.camera;
    const faceYaw = function (px: number, pz: number) {
      if (cam) cam.getWorldPosition(_pitchEye);
      return cam ? Math.atan2(_pitchEye.x - px, _pitchEye.z - pz) : 0;
    };

    // One investor weighs in: their specific feedback, placed + faced near them, popped in,
    // with a lean-in nod and a soft chime so the player's eye goes to them.
    const revealReaction = function (i: number) {
      const panel = endingReactionPanels[i];
      const o = panel?.object3D;
      if (!o) return;
      endingReactionEls[i]?.setProperties({ text: investorEndingFeedback(i) });
      const spot = investorSpots[i];
      o.position.set(spot.x, ENDING_REACTION_Y, ENDING_REACTION_Z);
      o.rotation.set(0, faceYaw(spot.x, ENDING_REACTION_Z), 0, "YXZ");
      o.visible = true;
      applyPanelOnTop(panel);
      popInObject(o);
      reactInvestor(i); // a nod of interest
      sfxNotify();      // a soft "they speak" chime
    };

    // The celebratory headline + gold check, once all three have spoken.
    const revealFinish = function () {
      const hO = endingHeadlinePanel.object3D!;
      hO.position.set(ENDING_HEADLINE_POSITION.x, ENDING_HEADLINE_POSITION.y, ENDING_HEADLINE_POSITION.z);
      hO.rotation.set(0, faceYaw(ENDING_HEADLINE_POSITION.x, ENDING_HEADLINE_POSITION.z), 0, "YXZ");
      hO.visible = true;
      applyPanelOnTop(endingHeadlinePanel);
      popInObject(hO);

      const cO = endingCheck.object3D!;
      cO.position.set(ENDING_CHECK_POSITION.x, ENDING_CHECK_POSITION.y, ENDING_CHECK_POSITION.z);
      cO.rotation.set(0, faceYaw(ENDING_CHECK_POSITION.x, ENDING_CHECK_POSITION.z), 0, "YXZ");
      cO.visible = true;
      if (endingCheckPulseTimer) clearInterval(endingCheckPulseTimer);
      let phase = 0;
      endingCheckPulseTimer = setInterval(function () {
        phase += ENDING_CHECK_PULSE_STEP;
        endingCheckGroup.scale.setScalar(1 + ENDING_CHECK_PULSE_AMP * Math.sin(phase));
      }, ENDING_CHECK_PULSE_MS);
      sfxFanfare(); // the celebration sting lands with the headline
      // P1.3: reveal the "See your results" chip. The recap is now gated behind THIS tap, so
      // the student reads the three investor reactions at their own pace before it appears.
      endingSeeResultsEl?.setProperties({ display: "flex" });
    };

    // Schedule: investor 0 now, 1 and 2 staggered, then the headline + check + the results chip.
    // The recap itself waits for the student to tap that chip (no auto-advance timer).
    revealReaction(0);
    for (let i = 1; i < endingReactionPanels.length; i++) {
      endingSeqTimers.push(setTimeout(function () { revealReaction(i); }, i * ENDING_REACTION_STAGGER_MS));
    }
    const afterAll = endingReactionPanels.length * ENDING_REACTION_STAGGER_MS;
    endingSeqTimers.push(setTimeout(revealFinish, afterAll));
  }

  // Hide the ending (headline + reactions + check) and stop its timers — used on a fresh
  // re-pitch so the next run starts clean.
  function hideEnding() {
    clearEndingTimers();
    endingCheckGroup.scale.setScalar(1);
    endingSeeResultsEl?.setProperties({ display: "none" }); // re-arm the gate for next time
    if (endingHeadlinePanel.object3D) endingHeadlinePanel.object3D.visible = false;
    for (const p of endingReactionPanels) { if (p.object3D) p.object3D.visible = false; }
    if (endingCheck.object3D) endingCheck.object3D.visible = false;
  }

  // ----- INVESTOR QUESTIONS (P0.1) ---------------------------------------
  // One reusable panel drives all three investors' follow-ups in turn. It reuses the plan
  // stations' gentle mechanic: the asking investor, their plan-specific question, three answers
  // (one clearly stronger), an amber redirect + retry on a weak pick, and a Next button (paced,
  // no auto-advance). A first-try strong answer earns a confidence pip on that investor (so the
  // meters mean something); a weak-then-corrected answer earns none and is remembered as a
  // "concern" for the ending. Built + shown the headset-visible way, like every other panel.
  const iqPanel = world
    .createTransformEntity()
    .addComponent(PanelUI, { config: "./ui/investor-question.json", maxWidth: INVESTOR_QUESTION_PANEL_MAX_WIDTH, maxHeight: INVESTOR_QUESTION_PANEL_MAX_HEIGHT })
    .addComponent(Interactable);
  iqPanel.object3D!.visible = false;
  storyPanels.push(iqPanel);

  // Element handles (set once the document loads) + the live per-question state.
  let iqAskerEl: any = null;
  let iqQuestionEl: any = null;
  let iqFeedbackEl: any = null;
  let iqNextBtn: any = null;
  const iqCards: any[] = [];
  const iqCardTexts: any[] = [];
  let iqCurrentQ: InvestorQuestion | null = null;
  let iqInvestorIndex = -1;
  let iqAnswered = false;      // the strong answer has been chosen (Next is available)
  let iqNeededRetry = false;   // a weak answer was tried first (no pip; leaves a concern)
  let iqOnDone: () => void = function () {};

  function paintIqCards(chosenIdx: number, correctIdx: number, revealCorrect: boolean) {
    iqCurrentQ?.answers.forEach(function (_a, i) {
      let border = PRODUCT_CARD_BORDER, bg = PRODUCT_CARD_BG;
      if (revealCorrect && i === correctIdx) { border = STATION_GOOD_BORDER; bg = STATION_GOOD_BG; }
      else if (!revealCorrect && i === chosenIdx) { border = STATION_WRONG_BORDER; bg = STATION_WRONG_BG; }
      iqCards[i]?.setProperties({ borderColor: border, backgroundColor: bg });
    });
  }

  // Ask investor `i` their one plan-specific question; call `done` once it is answered strongly
  // and the student taps Next. If the plan somehow has no matching question, skip straight to done.
  function askInvestorQuestion(i: number, done: () => void) {
    const id = INVESTOR_IDS[i];
    const field = INVESTOR_QUESTION_FIELD[i];
    const choice = (studentPlan as any)[field] as string;
    const q = INVESTOR_QUESTIONS[id]?.[choice];
    if (!q) { done(); return; } // no question for this choice — skip this investor

    iqCurrentQ = q;
    iqInvestorIndex = i;
    iqAnswered = false;
    iqNeededRetry = false;
    iqOnDone = done;

    iqAskerEl?.setProperties({ text: INVESTOR_PRIORITIES[i] });
    iqQuestionEl?.setProperties({ text: q.question });
    q.answers.forEach(function (a, k) { iqCardTexts[k]?.setProperties({ text: a.text }); });
    paintIqCards(-1, -1, false);
    iqFeedbackEl?.setProperties({ display: "none" });
    iqNextBtn?.setProperties({ display: "none" });

    iqPanel.object3D!.visible = true;
    presentPanel(iqPanel);   // pop it comfortably in front of the player
    reactInvestor(i);        // the asking investor leans in
    sfxNotify();
    console.log("[PITCH] question — " + INVESTOR_PRIORITIES[i] + " asks about " + field + "=" + choice);
  }

  function iqPick(k: number) {
    if (iqAnswered || !iqCurrentQ) return; // already solved this one
    const correctIdx = iqCurrentQ.answers.findIndex(function (a) { return a.strong; });
    const a = iqCurrentQ.answers[k];
    if (a.strong) {
      iqAnswered = true;
      paintIqCards(k, correctIdx, true);
      const id = INVESTOR_IDS[iqInvestorIndex];
      if (iqNeededRetry) {
        studentPlan.questions[id] = "weak"; // corrected, but needed the hint — no pip, a concern
        iqFeedbackEl?.setProperties({ text: "Yes, that's the strong answer.", color: STATION_FEEDBACK_RIGHT, display: "flex" });
        sfxClick();
      } else {
        studentPlan.questions[id] = "strong"; // nailed it first try — earn a confidence pip
        awardInvestor(id);
        iqFeedbackEl?.setProperties({ text: "Exactly right. Strong answer!", color: STATION_FEEDBACK_RIGHT, display: "flex" });
        sfxCoin();
      }
      iqNextBtn?.setProperties({ display: "flex" });
    } else {
      iqNeededRetry = true;
      paintIqCards(k, correctIdx, false);
      iqFeedbackEl?.setProperties({ text: a.hint || "Not the strongest answer. Try again.", color: STATION_FEEDBACK_WRONG, display: "flex" });
      sfxDown();
    }
  }

  function iqAdvance() {
    if (!iqAnswered) return;
    iqPanel.object3D!.visible = false;
    iqOnDone();
  }

  whenPanelReady(iqPanel, function (doc) {
    iqAskerEl = doc.getElementById("iq-asker");
    iqQuestionEl = doc.getElementById("iq-question");
    iqFeedbackEl = doc.getElementById("iq-feedback");
    iqNextBtn = doc.getElementById("iq-next");
    ["a", "b", "c"].forEach(function (id) {
      iqCards.push(doc.getElementById("iq-" + id));
      iqCardTexts.push(doc.getElementById("iq-" + id + "-text"));
    });
    iqCards.forEach(function (card, k) {
      card?.setProperties({ onClick: function () { sfxClick(); iqPick(k); } });
    });
    iqNextBtn?.setProperties({ onClick: function () { sfxClick(); iqAdvance(); } });
    doc.getElementById("iq-back")?.setProperties({
      onClick: function () { sfxClick(); iqPanel.object3D!.visible = false; cancelPitch(); },
    });
  });

  // Ask all three investors in turn (skipping any without a matching question), then run onAllDone.
  function runInvestorQuestions(onAllDone: () => void) {
    studentPlan.questions.smartMoney = "";
    studentPlan.questions.customers = "";
    studentPlan.questions.lowRisk = "";
    const askNext = function (i: number) {
      if (i >= INVESTOR_IDS.length) { onAllDone(); return; }
      askInvestorQuestion(i, function () { askNext(i + 1); });
    };
    askNext(0);
  }

  // After Part 3: the pitch is done. Mark it complete, log which investor each part targeted (a
  // dev check), then run the investor Q&A (P0.1). Once every investor has been answered, the
  // ending runs — showEnding() walks the investors' specific reactions one by one, then the
  // headline + check + fanfare, then the founder's recap.
  function finishPitch() {
    const p = studentPlan.pitch;
    p.complete = true;
    const name = function (key: string): string { return PITCH_INVESTOR_LABEL[key] || key || "(none)"; };
    console.log("[PITCH] complete — opening -> " + name(p.openingInvestor) +
      ", case -> " + name(p.caseInvestor) + ", ask -> " + name(p.askInvestor));
    runInvestorQuestions(showEnding);
  }

  // The three parts' CONTENT. Each part has three cards; card a targets Smart Money, b
  // targets Customers, c targets Low Risk — the same order as the floating labels above
  // the investors. Every line is a good pitch (no wrong answers); they just appeal to
  // different investors. The lines insert the student's real plan values (product /
  // region / price / marketing), lowercased mid-sentence where needed. Built back-to-front
  // so each part opens the next; after Part 3, finishPitch() marks the pitch done.
  const pitchPart3 = buildPitchPart({
    saveKey: "ask",
    question: "Part 3: your ask. What will you tell the investors?",
    confirmMsg: "That's your pitch. Well done!",
    options: [
      { investor: "smartMoney", text: () => "Invest in me, and I will use " + pitchMarketing() + " to grow my profits." },
      { investor: "customers", text: () => "Invest in me, and I will use " + pitchMarketing() + " to reach even more customers." },
      { investor: "lowRisk", text: () => "Invest in me, and I will use " + pitchMarketing() + " as a careful, proven way to grow." },
    ],
    onPicked: function () { finishPitch(); },
  });
  const pitchPart2 = buildPitchPart({
    saveKey: "case",
    question: "Part 2: your economic case. Why is your plan smart?",
    confirmMsg: "Strong case! Now make your ask.",
    options: [
      { investor: "smartMoney", text: () => "I set a " + pitchPrice() + " using supply and demand, so my business earns well." },
      { investor: "customers", text: () => "I set a " + pitchPrice() + " that as many customers as possible can afford." },
      { investor: "lowRisk", text: () => "I set a " + pitchPrice() + " carefully to keep my risk low while I grow." },
    ],
    onPicked: function () { pitchPart3.open(); },
  });
  const pitchPart1 = buildPitchPart({
    saveKey: "opening",
    question: "Part 1: your opening. How will you introduce your business?",
    confirmMsg: "Great opening! Now your economic case.",
    options: [
      { investor: "smartMoney", text: () => "My " + pitchProduct() + " in " + pitchRegion() + " solves " + pitchProblem() + " for " + pitchCustomer() + ", and it is built to earn strong profits." },
      { investor: "customers", text: () => "My " + pitchProduct() + " in " + pitchRegion() + " solves " + pitchProblem() + " for " + pitchCustomer() + ", who already want it." },
      { investor: "lowRisk", text: () => "My " + pitchProduct() + " in " + pitchRegion() + " solves " + pitchProblem() + " for " + pitchCustomer() + ", with a careful plan to start safely." },
    ],
    onPicked: function () { pitchPart2.open(); },
  });

  // Start the whole pitch from Part 1, fresh: wipe any previous run + ending, then open
  // Part 1. Part 1 -> Part 2 -> Part 3 chains via each part's onPicked.
  function openPitch() {
    hideEnding();              // clear any ending from a previous run
    resetPitchData();
    resetInvestorConfidence(); // every meter back to empty for a fresh pitch
    pitchPart1.open();
  }

  // Element handles + the apply-a-state helper, set once the sign's document loads.
  let pitchBoxEl: any = null;
  let pitchLabelEl: any = null;
  let pitchSubEl: any = null;
  function applyPitchState(ready: boolean) {
    pitchBoxEl?.setProperties({
      backgroundColor: ready ? DELIVER_ACTIVE_BG : DELIVER_DISABLED_BG,
      borderColor: ready ? DELIVER_ACTIVE_BORDER : DELIVER_DISABLED_BORDER,
    });
    pitchLabelEl?.setProperties({
      text: ready ? DELIVER_LABEL_READY : DELIVER_LABEL_LOCKED,
      color: ready ? DELIVER_ACTIVE_LABEL : DELIVER_DISABLED_LABEL,
    });
    pitchSubEl?.setProperties({
      text: ready ? DELIVER_SUB_READY : DELIVER_SUB_LOCKED,
      color: ready ? DELIVER_ACTIVE_LABEL : DELIVER_DISABLED_LABEL,
    });
  }
  whenPanelReady(pitchButton, function (doc) {
    pitchBoxEl = doc.getElementById("pitch-button");
    pitchLabelEl = doc.getElementById("pitch-button-label");
    pitchSubEl = doc.getElementById("pitch-button-sub");
    // The tap path is the SAME Interactable + onClick the station signs use. The
    // guard makes a LOCKED tap do nothing; a READY tap starts the pitch at Part 1.
    pitchBoxEl?.setProperties({
      onClick: function () {
        if (!isPlanComplete()) return; // locked → nothing happens
        sfxClick();
        // The arrival card first (matching every other stop), then the pitch from Part 1.
        showArrivalCard(ARRIVAL_PITCH_TITLE, ARRIVAL_PITCH_LINE, function () {
          console.log("[PITCH] starting — Part 1");
          openPitch();
        });
      },
    });
    applyPitchState(isPlanComplete()); // first paint matches the current plan
  });

  // ONE loop flips the button the moment the plan becomes complete and gives the
  // READY button a gentle pulse so it draws the eye. State is only re-applied when
  // it actually changes, so this is cheap. setInterval (not rAF) per house style.
  let pitchReadyShown = false;
  let pitchInited = false;
  let pitchPulse = 0;
  setInterval(function () {
    if (!pitchBoxEl) return; // wait for the document to load
    const ready = isPlanComplete();
    if (ready !== pitchReadyShown || !pitchInited) {
      pitchReadyShown = ready;
      pitchInited = true;
      applyPitchState(ready);
    }
    const o3d = pitchButton.object3D;
    if (!o3d) return;
    if (ready) {
      pitchPulse += DELIVER_PULSE_SPEED;
      o3d.scale.setScalar(1 + DELIVER_PULSE_AMOUNT * (0.5 + 0.5 * Math.sin(pitchPulse)));
    } else if (o3d.scale.x !== 1) {
      o3d.scale.setScalar(1); // rest at normal size while locked
    }
  }, 33);

});
