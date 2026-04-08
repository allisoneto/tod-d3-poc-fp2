# Design decisions and visual encodings

This document mirrors the **Design decisions and visual encodings** section in the interactive writeup (`src/routes/+page.svelte`). It is meant for reviewers, collaborators, and anyone browsing the repository without running the app.

---

## 1. Epistemic framing (what this project does *not* claim)

The visualization is **descriptive and associational**. Patterns in development, transit access, affordability, and census change are shown together so readers can form hypotheses about equity and planning—but **no chart should be read as a causal estimate** of TOD on outcomes. Wording throughout uses “associated with,” “patterns suggest,” and similar hedges on purpose.

---

## 2. Two geographic scales: municipality and census tract

**Municipal-level views** aggregate MassBuilds-style project data into comparable units (zoning, income bands, TOD share of units). They answer: *where is growth, and how TOD-heavy is it?*

**Tract-level views** combine census housing-stock change (choropleth), MassBuilds-derived development *cohorts* (outlines), and optional project dots. They answer: *within the urban fabric, where does growth concentrate relative to transit, and where do “access vs growth” tensions appear?*

Keeping both scales avoids forcing one grain to do everything: municipalities suit policy comparison; tracts suit neighborhood-scale tension.

---

## 3. Tract choropleth: percent housing-unit change

Fill encodes **census percent change in housing units** for the selected period, on a **diverging scale** centered at zero: weaker/negative growth toward red, stronger growth toward blue, neutral near the regional middle. The scale **re-normalizes to the max absolute value in the filtered tract set** so the legend stays meaningful when filters change.

**Design intent:** encode *change* rather than levels, and keep the same semantic mapping as readers scroll through steps so the base story does not “jump” visually when outlines are added.

---

## 4. Development cohorts (MassBuilds-derived outlines)

After the base choropleth is established, **tract category outlines** introduce TOD-dominated, non-TOD-dominated, and minimal-development cohorts (green, orange, gray). These are **interpretive overlays**, not a second choropleth: fill still carries census growth; outlines carry *where filtered new development sits relative to transit*.

**Trade-off:** cohorts depend on project filtering and thresholds; they are stable enough for storytelling but should be read as model outputs, not ground truth from a single administrative definition of TOD.

---

## 5. Access–growth “mismatch” clusters

A separate layer highlights tracts where **transit access** (e.g., stop counts / proximity) and **housing growth** (census change and development signals) are **in tension** under a quartile-based rule set:

- **High access, low growth** — solid violet stroke (stronger weight).
- **High growth, low access** — dashed lavender stroke (lighter weight).

These are **outline-only** encodings so the choropleth scale is not replaced by a second competing fill ramp.

---

## 6. Progressive disclosure (scroll) and exploratory outline modes

**Scroll-linked steps** reveal layers in order: fill → cohort outlines → first mismatch type → both mismatch types → optional project dots. That limits simultaneous novelty and matches the written narrative.

**Mismatch outline modes** (Match scroll / Off / All mismatch / one type only) let readers **override** the scroll gate for teaching or exploration—for example, showing both mismatch types before the scroll step that introduces the second one. Default remains **Match scroll** so the guided path is preserved.

---

## 7. Focus toggles: mismatch-only and lower-income emphasis

- **Show mismatch areas only** pushes non-mismatch tracts to very low opacity so the mismatch layer reads clearly when the map is busy.
- **Show lower-income tracts** is an exploratory filter tied to a **median household income threshold** (e.g., \<$125k). Tracts **at or above** that threshold are **not** shown as “dimmed blues” (which was visually confusable with weak growth on the choropleth). Instead, they receive a **neutral fill** so they read as “out of focus,” not as a false light-blue growth bin. Hovered and selected tracts temporarily show full choropleth color again for inspection.

Neither toggle replaces a dedicated income choropleth; they are **emphasis layers** on top of the growth story.

---

## 8. Sidebar-first narrative (removed duplicate on-map callouts)

On-map floating callout boxes duplicated the **Map walkthrough** copy in the sidebar. Those overlays were removed so **one narrative channel** carries step text; the map stays visually cleaner. **Hover tooltips** for tract-level metrics remain for detail-on-demand.

---

## 9. Municipal supplemental charts and rendering lifecycle

Supplemental charts (e.g., TOD vs non-TOD mix by year, ranked municipalities) live in **`<details>`** blocks. Chart mount order varies: refs bind as sections open. The dashboard **draw** pipeline therefore:

- Requires only loaded municipal data as a gate—not a single chart’s DOM node.
- **Guards each chart** with its own container ref.
- Subscribes the reactive **draw** effect to **all** chart refs so opening a `<details>` section triggers a redraw when its container appears.

This avoids empty cards when an earlier chart ref was ready but another (e.g., scatter in a different details block) was not yet bound.

---

## 10. Color system, typography, and channels

- **MBTA-referential hues** (green, orange, red, blue) anchor transit-related semantics in a Boston-local context.
- **Categories are not carried by color alone:** outline weight, dash pattern, and interaction state reinforce meaning.
- **Typography:** Helvetica-family headings with Inter body text; quantitative comparisons in linked charts favor **position on common axes**, with color and size as secondary.

---

## 11. Trade-offs, limitations, and future work

| Area | Limitation | Mitigation / next step |
|------|------------|-------------------------|
| Causality | Observational data | Repeated non-causal framing; no effect claims in copy |
| Mismatch definition | Quartile/rule-based | Documented as a transparent heuristic; modes for exploration |
| Income emphasis | Single threshold | Exploratory; full income analysis may use distributions in future work |
| Accessibility | Design-informed, not certified | Usability testing; continued contrast and keyboard pass |

---

*Last updated to reflect the FP2 proof-of-concept implementation.*
