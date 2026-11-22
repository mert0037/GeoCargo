[▶ Play GeoCargo](https://mert0037.github.io/GeoCargo/)
# GeoCargo — Global Logistics Command

GeoCargo is a browser-based logistics strategy game I developed for **GMT 458 – Web GIS (Assignment 2)**. After the fictional logistics giant Atlas Corp. collapses, you take over a small carrier based in Istanbul and try to grow it into a global network over four quarters without running out of money or lives.

Location and geography directly drive the gameplay. Short freight routes provide steady cash flow, distant cities require transfer hubs, and regional disruptions like a Suez Canal blockage slow down the exact corridors crossing that area. The interface supports both **English** and **Turkish**.

---

## Main Features & Requirements

* **Interactive Map Gameplay:** Build air and freight corridors across 20 world cities directly on the map.
* **Time-Based Pressure:** Complete deliveries across 4 quarters (240 simulation seconds total) with individual shipment countdowns and timed story decisions.
* **Fleet & Economy Management:** Buy ships, planes, and staff while managing fuel costs and upkeep charged every 15 seconds.
* **Story Decisions:** Make choices that carry consequences into later quarters and lead to 3 different endings.
* **Live Analytics & High Scores:** Track income vs. expenses with live charts and save your top 5 scores locally in the browser.

---

## Frontend Layout Sketch

The map fills the entire viewport so the network stays visible at all times. Management panels open on top of the map only when needed.

```text
+-------------------------------------------------------------------------+
| [GeoCargo | Maya's News Feed v]            [EN/TR | Q1 00:45 | || 1x 2x]|
|                                                                         |
| +---------------+                                     +---------------+ |
| | Company       |        Interactive World Map        | Urgent Orders | |
| | Drawer        |   (Hubs, Routes, Moving Vehicles,   | & Ops Drawer  | |
| | (when open)   |          and Crisis Pins)           | (when open)   | |
| +---------------+                                     +---------------+ |
|                                                                         |
| [+/-]             [Origin -> Dest | Mode | Preview]    [Chart (open)]   |
+-------------------------------------------------------------------------+
| [Company & Fleet] | Tier | Budget | Cash Flow | Fleet | Staff | [Ops]   |
+-------------------------------------------------------------------------+
```

---

## How to Play

1. Click **Start in Istanbul**. You begin with **$3,000**, **5 lives**, **1 freighter**, and **1 staff member**.
2. For your first shipment, select **Istanbul → Suez**, choose **Freight**, review the cost preview, and click **Open corridor**. Once connected, shipments depart automatically when a suitable vehicle is free.
3. Connect **Istanbul → Frankfurt** for your second shipment. Each staff member supports 2 open corridors, so your starting crew can operate both routes.
4. Open **Company & fleet** to buy vehicles or hire staff. Open **Ops & analytics** to inspect waiting shipments, close idle corridors, and compare income with expenses.
5. Finish all 4 quarters with at least **1 life** and a balance above **-$500**.

> **Early tip:** One of the first real decisions is whether to buy a second freighter or save cash for the fleet inspection. A second ship lets you carry two shipments at once, but its upkeep is charged every 15 seconds even while it sits idle.

---

## Game Progression & Time Limits

A full campaign lasts **240 simulation seconds**, split into four **60-second quarters**. Across the game, there are **18 scheduled shipments**, **4 story decisions**, and **1 optional medical shipment**. Each quarter increases the number of orders and introduces new challenges:

| Quarter | Scheduled Shipments | What Changes |
| :--- | :---: | :--- |
| **Q1 — First Spark** | 3 | Build the initial Istanbul freight network. First destinations are Suez and Frankfurt. |
| **Q2 — Race Against Time** | 4 | Cargo planes unlock. Decide whether to pay for a fleet inspection and a crew bonus. |
| **Q3 — Global Storm** | 5 | Your Q2 inspection decision takes effect. A Suez Canal blockage hits the map. |
| **Q4 — The Global Bridge** | 6 | Your Q2 crew decision affects speed or capacity. Choose between a UN medical shipment and a private contract. |

* **Simulation Speed:** Runs at `1x`, `2x`, or `3x` speed, and can be paused at any time.
* **Shipment Deadlines:** Standard shipments have **48 simulation seconds**, and Express shipments have **32 seconds** (deadlines are capped at the end of Q4).
* **Decision Timer:** During a story decision, the simulation pauses and a **15-second timer** runs. If time expires, the second option is applied automatically.

---

## Network Rules & Economy

The map includes **20 logistics hubs**. Click an active hub and then a destination on the map (or use the route menus) to preview distance, construction cost, travel time, fuel cost, and remaining cash before opening the corridor.

| Investment | Purchase Price | Upkeep (per 15s) | Operational Effect |
| :--- | :---: | :---: | :--- |
| **Freighter** | $900 | $70 | Carries 1 freight shipment at a time. Max corridor length: **5,000 km**. |
| **Cargo Plane** | $1,500 | $160 | Carries 1 air shipment at a time. Max corridor length: **8,500 km**. Required for Express shipments. |
| **Operations Staff** | $650 | $95 | Supports **+2 open corridors** and gives a **+5% shipment speed bonus**. |

* **Routing & Transfers:** The model uses **Dijkstra's algorithm** to find the quickest available path through your network, taking active delays into account. If no suitable vehicle is free, the order waits while its deadline keeps running. Multi-hop deliveries earn a **+12% bonus** for 1 transfer and **+24%** for 2 or more transfers.
* **Market Costs & Discounts:** Major hubs like **New York, Shanghai, and Rotterdam** cost **$1,550** to unlock and add **$140** in upkeep every 15 seconds. Corridors linked to **Dubai** or **Rotterdam** receive a **35% construction discount**, making them useful transfer hubs.
* **Passive Income & Fuel:** Open corridors generate passive trade income every 15 seconds, while fuel is charged when a vehicle starts a leg. For example, Istanbul–Suez and Istanbul–Frankfurt together generate **$416** per cycle; after **$165** in upkeep for the starting ship and staff, that leaves **$251** before fuel and delivery rewards.
* **Spatial Disruption (Suez Crisis):** If you divert freight during the Q3 Suez crisis, the game tests freight corridor geometries against the canal's impact area. Intersecting corridors lose passive income and run at **40% speed for 25 seconds**, while unaffected routes continue normally.

---

## Lives, Scoring & Endings

* **Lives:** You start with **5 lives** and lose **1 life** for each missed shipment. Completing the optional UN medical shipment earns **+$1,200**, **+1 ethics point**, and **+1 life** (up to 5).
* **Game Over:** The company collapses if lives reach **0** or the balance drops to **-$500 or lower**.
* **Endings:** Depending on your performance and story choices, the campaign ends as **Global Lifeline**, **Ruthless Tycoon**, or **Collapsed Startup**.

### Scoring Formula

| Component | Points |
| :--- | :--- |
| Completed shipments | `100` per delivery |
| Active hubs | `250` per active hub (including Istanbul) |
| Early delivery bonus | `1` point per unused simulation second before the deadline |
| Delivery streak | `0, 5, 10, 15...` bonus points for consecutive on-time deliveries (resets on a miss) |
| Remaining cash | `Math.floor(finalBalance / 10)` |

The debrief screen displays the campaign result, delivery stats, final score, and financial chart. The **top 5 high scores** are saved locally in the browser via `localStorage`.

---

## JavaScript Libraries & Open Datasets

| Library / Dataset | Use in GeoCargo |
| :--- | :--- |
| **Leaflet** | Displays the interactive map, country polygons, hub markers, route previews, and event pins. |
| **Turf.js** | Calculates real distances and great-circle routes, locates moving vehicles along paths, computes vehicle bearings, and checks route intersections with the Suez crisis polygon. |
| **Chart.js** | Plots live income vs. expenses during gameplay and displays financial performance in the final debrief. |
| **Natural Earth** | Locally bundled country boundary GeoJSON used for regional highlighting and the zoomed-out world view. |
| **Esri World Imagery** | Provides satellite basemap imagery at closer zoom levels. |
| **Project Hub Dataset** | Stores coordinates and country codes for 20 cities (prices, travel times, and disruption parameters are custom simulation values). |

---

## Code Architecture & Implementation

The project uses HTML, CSS, and vanilla JavaScript organized with a **Model–View–Controller (MVC)** structure:

| File | Responsibility |
| :--- | :--- |
| `index.html`, `css/style.css` | Page layout, map overlays, responsive panels, and visual feedback. |
| `js/data.js`, `js/world.js` | Hub locations, country boundaries, chapter timeline, and story decision scenarios. |
| `js/model.js` | Campaign state, order generation, Dijkstra routing, vehicle capacity, economy, and scoring. |
| `js/view.js` | Map rendering, vehicle animation, live HUD metrics, modals, and Chart.js graphs. |
| `js/controller.js` | Simulation clock, player input, purchases, story decisions, and campaign flow. |
| `js/lang.js` | English and Turkish interface text and saved language preference. |

### Three Event Handlers
1. **Map Marker Click & Hover:** Clicking an active city sets the origin, hovering another city previews the route and cost, and clicking it selects the destination for confirmation.
2. **Button Click (`Open corridor`):** Checks range limits, staff capacity, vehicle requirements, and available budget before updating the network and refreshing the map and HUD.
3. **Keyboard Input (`keydown`):** `Space` pauses or resumes the simulation, `1` and `2` choose options in story decisions, and `Escape` cancels route selection on the map.

### How Closures Are Used
* `createOrderGenerator()` keeps the scheduled shipment sequence private to each campaign run.
* `createStoryMemory()` retains player choices across quarters so a Q2 inspection or crew decision can trigger its effect in Q3 or Q4.
* `createScoreManager()` keeps the delivery streak and accumulated bonus private, and manages updating the top-5 `localStorage` scores.

### DOM Interaction
The view creates dynamic elements like shipment cards and decision buttons using `document.createElement()`. As the simulation runs, the controller updates text values, progress bars, and button states in real time—for example, buying a plane updates the budget and fleet counters immediately, while an expired order disappears from the queue and subtracts a life on the dashboard.

---

## What I Learned from AI

I used AI tools (**ChatGPT** and **Gemini**) to help with game design, implementation, and debugging.

* **Separating map-layer issues from game-logic bugs:** When a tile provider showed an `"API key required"` error, the city markers still appeared normally. Noticing that helped me isolate the problem to the basemap layer and led me to bundle a local Natural Earth overview layer.
* **Checking balance with concrete numbers:** Comparing passive corridor income directly against 15-second upkeep showed why a starting network that looked busy could still slowly lose money, which made it much easier to tune the economy.

**AI Interaction URL(s):**
* []
