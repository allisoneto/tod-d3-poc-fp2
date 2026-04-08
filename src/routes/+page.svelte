<script>
	import { base } from '$app/paths';
	import * as d3 from 'd3';
	import {
		loadMunicipalData,
		filterMunicipalProjects,
		buildMunicipalityRows,
		activeRows as getActiveRows
	} from '$lib/utils/municipalModel.js';
	import {
		renderMuniScatter,
		renderMuniComposition,
		renderMuniGrowthCapture,
	} from '$lib/utils/municipalCharts.js';
	import { tractData, developments } from '$lib/stores/data.svelte.js';
	import { loadAllData } from '$lib/stores/data.svelte.js';
	import {
		DEFAULT_MAIN_POC_DEV_OPTS,
		DEFAULT_MAIN_POC_UNIVERSE,
		buildNhgisLikeRows,
		buildTractDevClassMap,
		filterDevelopmentsByYearRange,
		filterTractsForMainPoc,
		uniqueCounties
	} from '$lib/utils/mainPocTractModel.js';
	import { createPanelState } from '$lib/stores/panelState.svelte.js';
	import PocNhgisTractMap from '$lib/components/PocNhgisTractMap.svelte';
	import ExploreTractSection from '$lib/components/ExploreTractSection.svelte';

	/* ═══════════════════════════════════════════════════════
	   MUNICIPAL STATE (Part 1)
	   ═══════════════════════════════════════════════════════ */
	let muniLoaded = $state(false);
	let muniData = $state(/** @type {any} */ (null));

	let yearStart = $state(1990);
	let yearEnd = $state(2026);
	let threshold = $state(0.5);
	let growthScale = $state(/** @type {'units' | 'share'} */ ('units'));
	let showTrendline = $state(false);
	let dominanceFilter = $state(/** @type {'all' | 'tod' | 'nonTod'} */ ('all'));
	let zoning = $state(/** @type {Set<string>} */ (new Set()));
	let search = $state('');
	let selected = $state(/** @type {Set<string>} */ (new Set()));
	let mapMetric = $state(/** @type {string} */ ('units'));

	/* ── Derived municipal data ───────────────────────── */
	const muniState = $derived({
		yearStart,
		yearEnd,
		threshold,
		growthScale,
		showTrendline,
		dominanceFilter,
		zoning,
		search,
		selected,
		mapMetric
	});

	const projectRows = $derived.by(() => {
		if (!muniData) return [];
		return filterMunicipalProjects(muniData.projects, muniState);
	});

	const allProjectRows = $derived.by(() => {
		if (!muniData) return [];
		return filterMunicipalProjects(muniData.projects, muniState, false);
	});

	const visibleRows = $derived.by(() => {
		if (!muniData) return [];
		const rows = buildMunicipalityRows(
			projectRows,
			muniData.municipalityList,
			muniData.incomeByNorm,
			muniData.storyByNorm,
			muniData.householdByNorm,
			threshold,
			muniState
		);
		if (dominanceFilter === 'all') return rows;
		return rows.filter(
			(d) => dominanceFilter === 'tod' ? d.dominant === 'tod' : d.dominant !== 'tod'
		);
	});

	const domainRows = $derived.by(() => {
		if (!muniData) return [];
		return buildMunicipalityRows(
			allProjectRows,
			muniData.municipalityList,
			muniData.incomeByNorm,
			muniData.storyByNorm,
			muniData.householdByNorm,
			threshold,
			{ ...muniState, yearStart: 1990, yearEnd: 2026 },
			false
		);
	});

	const muniActive = $derived(getActiveRows(visibleRows, selected));

	/* ── Element refs (municipal) ─────────────────────── */
	let elScatter = $state(/** @type {HTMLElement | undefined} */ (undefined));
	let elComposition = $state(/** @type {HTMLElement | undefined} */ (undefined));
	let elGrowthCapture = $state(/** @type {HTMLElement | undefined} */ (undefined));

	function draw() {
		if (!muniData) return;
		const cb = { onSelectionChange: () => { selected = new Set(selected); } };
		if (elScatter) renderMuniScatter(elScatter, visibleRows, domainRows, muniState, cb);
		if (elComposition) renderMuniComposition(elComposition, projectRows, muniState);
		if (elGrowthCapture) renderMuniGrowthCapture(elGrowthCapture, projectRows, domainRows, muniState);
	}

	// Debounce draw during playback via rAF
	let rafId = 0;
	$effect(() => {
		void visibleRows;
		void domainRows;
		void projectRows;
		void muniActive;
		void mapMetric;
		void muniData;
		void elScatter;
		void elComposition;
		void elGrowthCapture;
		cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(() => draw());
	});

	/* ── Load municipal data on mount ─────────────────── */
	$effect(() => {
		loadMunicipalData(base).then((data) => {
			muniData = data;
			zoning = new Set(data.zoningOptions);
			muniLoaded = true;
		});
	});

	/* ═══════════════════════════════════════════════════════
	   TRACT STATE (Part 2)
	   ═══════════════════════════════════════════════════════ */
	let tractLoading = $state(true);
	let tractError = $state(/** @type {string | null} */ (null));
	let tractReady = $state(false);

	// Tract analysis defaults (sensible, no user controls)
	const tractTimePeriod = '00_20';
	const tractSigDevMin = 2;
	const tractTodFractionCutoff = 0.5;

	/** Map overlays + dev filters for ``PocNhgisTractMap`` (aligned with tract ``FilterPanel`` / ``MapView``). */
	const pocMapPanel = createPanelState('poc-main');

	$effect(() => {
		if (!tractReady) return;
		pocMapPanel.transitDistanceMi = threshold;
		pocMapPanel.timePeriod = tractTimePeriod;
		pocMapPanel.minStops = DEFAULT_MAIN_POC_UNIVERSE.minStops;
		pocMapPanel.sigDevMinPctStockIncrease = tractSigDevMin;
		pocMapPanel.todFractionCutoff = tractTodFractionCutoff;
		pocMapPanel.huChangeSource = 'massbuilds';
		pocMapPanel.minPopulation = DEFAULT_MAIN_POC_UNIVERSE.minPopulation;
		pocMapPanel.minPopDensity = DEFAULT_MAIN_POC_UNIVERSE.minPopDensity;
		pocMapPanel.minUnitsPerProject = DEFAULT_MAIN_POC_DEV_OPTS.minUnitsPerProject;
		pocMapPanel.minDevMultifamilyRatioPct = DEFAULT_MAIN_POC_DEV_OPTS.minDevMultifamilyRatioPct;
		pocMapPanel.minDevAffordableRatioPct = DEFAULT_MAIN_POC_DEV_OPTS.minDevAffordableRatioPct;
		pocMapPanel.includeRedevelopment = DEFAULT_MAIN_POC_DEV_OPTS.includeRedevelopment;
		pocMapPanel.showRailLines = true;
		pocMapPanel.showRailStops = true;
		pocMapPanel.showCommuterRailLines = true;
		pocMapPanel.showCommuterRailStops = false;
		pocMapPanel.showBusLines = false;
		pocMapPanel.showBusStops = false;
	});

	$effect(() => {
		loadAllData()
			.then(() => {
				tractReady = true;
				tractError = null;
			})
			.catch((e) => {
				tractError = e instanceof Error ? e.message : String(e);
			})
			.finally(() => {
				tractLoading = false;
			});
	});

	const tractDevOpts = $derived({
		minUnitsPerProject: DEFAULT_MAIN_POC_DEV_OPTS.minUnitsPerProject,
		minDevMultifamilyRatioPct: DEFAULT_MAIN_POC_DEV_OPTS.minDevMultifamilyRatioPct,
		minDevAffordableRatioPct: DEFAULT_MAIN_POC_DEV_OPTS.minDevAffordableRatioPct,
		includeRedevelopment: DEFAULT_MAIN_POC_DEV_OPTS.includeRedevelopment
	});

	const tractCounties = $derived.by(() => {
		if (!tractData.length) return new Set();
		return new Set(uniqueCounties(tractData));
	});

	const tractListFiltered = $derived.by(() => {
		if (!tractData.length) return [];
		return filterTractsForMainPoc(tractData, tractCounties, '', {
			timePeriod: tractTimePeriod,
			minStops: DEFAULT_MAIN_POC_UNIVERSE.minStops,
			minPopulation: DEFAULT_MAIN_POC_UNIVERSE.minPopulation,
			minPopDensity: DEFAULT_MAIN_POC_UNIVERSE.minPopDensity
		});
	});

	const tractWindowDevs = $derived.by(() =>
		filterDevelopmentsByYearRange(developments, 1990, 2026, tractDevOpts)
	);

	const tractDevClassByGj = $derived.by(() =>
		buildTractDevClassMap(
			tractListFiltered,
			tractWindowDevs,
			{ timePeriod: tractTimePeriod, minStops: DEFAULT_MAIN_POC_UNIVERSE.minStops, minPopulation: DEFAULT_MAIN_POC_UNIVERSE.minPopulation, minPopDensity: DEFAULT_MAIN_POC_UNIVERSE.minPopDensity },
			threshold,
			tractDevOpts,
			tractSigDevMin,
			tractTodFractionCutoff
		)
	);

	const nhgisLikeRows = $derived.by(() =>
		buildNhgisLikeRows(tractListFiltered, tractDevClassByGj, tractTimePeriod)
	);
</script>

<div class="poc-root">
	<!-- Narrative + tract story up to "Explore" use a narrower column; Explore stays full poc-root width. -->
	<div class="poc-pre-explore">
	<section class="hero-full card">
		<div class="eyebrow">Guided Story</div>
		<h1>Transit Access and Housing Growth Are Not Aligned Across Greater Boston</h1>
		<p class="subtitle">
			This visualization shows where housing growth does—and does not—occur relative to transit access.
		</p>
		<p class="subtitle subtitle--compact">
			Start with the short guided walkthrough below. After that, the full explorer opens up so you can test the patterns for yourself.
		</p>
		<p class="hero-plan-note">
			A separate writeup page includes our design decisions, processing notes, development overview, and final project plan:
			<a href={`${base}/writeup`}>open the full writeup</a>.
		</p>
	</section>

	<section class="story card story--signal">
		<h2>The central takeaway</h2>
		<p class="signal-line">Transit access and housing growth do not move together consistently across the region.</p>
		<p class="signal-line">Some transit-rich places see limited housing growth, while some faster-growing places remain less connected to strong transit.</p>
		<p class="signal-line">That mismatch matters most when lower-income tracts are part of the pattern.</p>
		<p class="chart-note">
			The rest of the page is designed to walk you from that claim, to the evidence behind it, and then into a full interactive explorer where you can test the pattern yourself.
		</p>
	</section>

	{#if !muniLoaded}
		<div class="loading-status">
			<div class="spinner" aria-hidden="true"></div>
			<p>Loading municipal data…</p>
		</div>
	{:else}
	<section class="story card">
		<h2>What to look for before you enter the map</h2>
		<p class="chart-note">
			Before moving into the interactive map, we want to make the main pattern visible in a simpler form. The visualizations
			below are not meant to replace the map. Instead, they establish the relationships we want the reader to carry into the
			scrollytelling section: housing growth is uneven, transit access does not automatically attract that growth, and the
			pattern matters more when lower-income households are already part of the places under pressure.
		</p>
		<div class="guide-figures">
			<figure class="guide-figure card">
				<h3>Transit-oriented development is growing, but it still does not absorb most new housing</h3>
				<div class="chart-wrap small-chart" bind:this={elComposition}></div>
				<figcaption>
					We start here because it prevents an easy misunderstanding. The question is not whether TOD exists in Greater
					Boston. It clearly does. The question is whether new housing is consistently concentrating in the places with the
					strongest transit access. This figure shows that the answer is no: TOD makes up an important share of recent growth,
					but a large share of new units still lands outside the highest-access transit context.
				</figcaption>
			</figure>
			<figure class="guide-figure card">
				<h3>New housing growth is not only uneven, but socially uneven</h3>
				<div class="chart-wrap small-chart" bind:this={elGrowthCapture}></div>
				<figcaption>
					This figure moves from geography to stakes. It shows how much yearly growth is landing in municipalities with
					higher shares of households below $125k. That matters because the mismatch argument is not only about where growth
					is missing from transit-rich places. It is also about where growth pressure is landing, and who is more likely to
					be living there when that pressure arrives.
				</figcaption>
			</figure>
			<figure class="guide-figure card">
				<h3>Transit access and lower-income geography do not line up cleanly</h3>
				<div class="chart-wrap small-chart" bind:this={elScatter}></div>
				<figcaption>
					Here the point is comparison. Municipalities with larger lower-income shares do not map neatly onto the places with
					the strongest TOD share or the largest amount of new growth. That is why we do not stop at a regional summary. The
					map is needed next, because the tract scale shows where transit access, housing growth, and lower-income context
					line up, and where they begin to pull apart.
				</figcaption>
			</figure>
		</div>
		<p class="chart-note chart-note--after-figures">
			Taken together, these views show the reader what to watch for once the map begins to zoom in. The question is not simply
			where transit is, or where growth is, but where those patterns stop lining up neatly, especially in places where lower-income
			households may have the most to gain from living near strong transit access.
		</p>
	</section>
	{/if}

	<!-- ═══════════════════════════════════════════════════════
	     PART 2 — TRACT ANALYSIS
	     ═══════════════════════════════════════════════════════ -->
	<section class="tract-section">
		<section class="story card full-width">
			<h2>Guided walkthrough: where the mismatch appears</h2>
			<p>
				The map below is the guided part of the story. It introduces one layer at a time so the reader can see how transit
				access, housing growth, mismatch, and lower-income context build on one another. The point is not simply to identify
				where transit is strongest, but to notice where expected growth does not follow and where that has broader social
				consequences.
			</p>
			<ul class="story-list">
				<li><strong>First:</strong> establish the geography of strong MBTA access.</li>
				<li><strong>Then:</strong> compare that geography to where housing growth has actually occurred.</li>
				<li><strong>Then:</strong> isolate the mismatch layer, which is the core analytical claim.</li>
				<li><strong>Finally:</strong> bring in lower-income context to show why the mismatch matters beyond a purely spatial planning question.</li>
			</ul>
		</section>

		{#if tractLoading}
			<div class="loading-status">
				<div class="spinner" aria-hidden="true"></div>
				<p>Loading tract data…</p>
			</div>
		{:else if tractError}
			<div class="loading-status loading-status--error">
				<h3>Failed to load tract data</h3>
				<p>{tractError}</p>
			</div>
		{:else}
			<section class="chart-card card full-width">
				<h3>Transit access and new housing growth do not consistently align across Greater Boston tracts</h3>
				<p class="chart-note">
					As you move through the walkthrough, the map progresses from transit access, to housing growth, to mismatch, and then
					to lower-income context. Blue tract fill indicates stronger housing growth, red indicates weaker or negative growth,
					and purple outlines identify the tracts where transit access and growth no longer move together in the expected way.
					The full exploration interface comes afterward, once that argument has been established more clearly.
				</p>
				<div class="chart-wrap chart-tall chart-wrap--poc-map">
					<PocNhgisTractMap
						panelState={pocMapPanel}
						tractList={tractListFiltered}
						nhgisRows={nhgisLikeRows}
						metricsDevelopments={tractWindowDevs}
						guidedMode={true}
					/>
				</div>
			</section>

			<section class="story card">
				<h2>Three places to notice</h2>
				<p class="chart-note">
					These are useful anchors while you scroll. They are not the only places that matter, but they make the regional
					argument easier to interpret because they show different relationships between transit access and housing growth.
				</p>
				<div class="annotation-grid">
					<div class="annotation-card">
						<h3>Boston and Cambridge</h3>
						<p>These municipalities anchor the strongest rapid-transit system in the region.</p>
						<p>They matter because they show the expected case most clearly: dense transit access and substantial housing growth in the same part of the map.</p>
						<p>At the same time, not every tract here grows equally. That unevenness matters, because it reminds us that being near strong transit does not automatically produce the same development outcome everywhere.</p>
					</div>
					<div class="annotation-card">
						<h3>Quincy and Revere</h3>
						<p>These are useful comparison cases because they sit within the broader transit system but do not reproduce the same growth pattern everywhere.</p>
						<p>They matter because the mismatch question is not only about the inner core. Nearby tracts can share transit context while still showing different housing outcomes.</p>
						<p>That variation makes the planning problem more concrete: access alone does not tell us where growth will actually occur.</p>
					</div>
					<div class="annotation-card">
						<h3>Outer-ring tracts west of Boston</h3>
						<p>Some highlighted tracts farther from the strongest MBTA access still show meaningful growth.</p>
						<p>They matter because they reveal the reverse side of the mismatch story: growth can occur without equivalent transit access.</p>
						<p>That is important for the gentrification argument because it suggests new housing growth is not consistently being steered toward the most transit-rich places, even though those are often framed as the most equitable places to add housing.</p>
					</div>
				</div>
			</section>

			<section class="story card">
				<h2>Why these demographic proxies appear here</h2>
				<p>
					Income and education are used here as <strong>warning-signal proxies</strong> for neighborhood change, not as
					stand-alone proof of displacement. They help us ask whether the places where transit access and housing growth pull
					apart also show signs of social change that matter for a gentrification argument.
				</p>
				<ul class="story-list">
					<li>Sharp increases in median income can signal rising housing costs or stronger market pressure.</li>
					<li>Rapid increases in the share of residents with bachelor’s degrees can signal selective in-migration and neighborhood turnover.</li>
					<li>Future versions will add more explicit tenure and ownership-change measures so the demographic story is not carried by income and education alone.</li>
				</ul>
				<p>
					These comparisons are descriptive. They help identify where neighborhood change may be happening alongside
					development and transit access, but they do not by themselves prove a causal TOD effect. What they do offer is a
					way to connect the spatial mismatch on the map to a broader gentrification question: if growth and transit access
					are misaligned, who is more likely to lose out on the benefits of living near transit?
				</p>
			</section>

			<section class="story card">
				<h2>What does this tell us?</h2>
				<p>
					The main takeaway from this analysis is that the relationship between transit access and housing growth varies
					significantly across Greater Boston. Some places follow the expected pattern, where strong access and meaningful
					growth appear together. But other places do not. Some transit-rich tracts have seen limited housing growth, while
					some faster-growing tracts sit outside the strongest transit context.
				</p>
				<p>
					That matters for planners and policymakers because it suggests that transit-oriented growth is not happening evenly
					or automatically. Transit access creates opportunity, but it does not guarantee housing production. At the same
					time, growth outside the strongest transit geography raises a different planning question: if new housing is being
					added in weaker-access areas, then the benefits of living near strong transit may not be reaching households in the
					same way across the region.
				</p>
				<p>
					The lower-income context makes that pattern more consequential. Once we shift from asking “where is growth?” to
					asking “who is most affected by where growth is or is not happening?”, the mismatch becomes more than a spatial
					oddity. It becomes a distributional question about access to transit-linked housing opportunity.
				</p>
			</section>
		{/if}
	</section>

	</div>

	{#if muniLoaded && !tractLoading && !tractError}
		<div class="explore-after-narrow">
			<section class="explore-gate card full-width" aria-labelledby="explore-gate-heading">
				<h2 id="explore-gate-heading">Explore the map</h2>
				<p>
					How does this pattern look in other municipalities, or in other tracts within the same municipality? Use the full
					explorer below to compare places, inspect tract detail, and test how transit access, housing growth, and
					lower-income context interact across the region.
				</p>
			</section>
			<ExploreTractSection />

			<section class="story card full-width sources-card">
				<h2>Data sources and acknowledgments</h2>
				<p>
					This project brings together tract-level census data, tract geometry, MBTA stops and line data, and project-level
					housing development records. In the current application, those processed assets are loaded as
					<code>tract_data.json</code>, <code>tracts.geojson</code>, <code>developments.json</code>,
					<code>mbta_stops.json</code>, <code>mbta_lines.geojson</code>, and <code>meta.json</code>.
				</p>
				<p>
					The tract-level housing and demographic measures are derived from NHGIS / census-based inputs. The development layer
					draws from MassBuilds project records, with some affordable-unit fields supplemented through matched HUD LIHTC
					information where available. The transit layer is based on MBTA stop and line geometry used to calculate project
					proximity to transit and tract-level stop access.
				</p>
				<p>
					This proof of concept also reflects substantial course feedback and repeated revision. The current page was shaped by
					iteration on the story, layout, and interaction design so that the final experience would guide readers toward the
					main planning question before opening into a fuller interactive exploration tool.
				</p>
			</section>
		</div>
	{/if}
</div>

<style>
	/* ── Warm editorial theme (matches static/municipal/index.html) ── */
	.poc-root {
		--bg: #f5f2eb;
		--paper: #fffdf8;
		--ink: #1f2430;
		--muted: #5e6573;
		--line: #d8d2c7;
		--accent: #00843d;
		--accent-soft: #d8efe2;
		--warning: #ed8b00;
		--warning-soft: #fbe6cc;
		--blue-1: #edf4ff;
		--blue-2: #bfd6f6;
		--blue-3: #6fa8dc;
		--blue-4: #2f6ea6;
		--blue-5: #003da5;
		--shadow: 0 14px 34px rgba(31, 36, 48, 0.08);
		--radius: 18px;

		/* Light-mode tokens for embedded charts (TodIntensityScatter, D3) — darker than app :root dark theme */
		--text: #1f2430;
		--text-muted: #3d4a5c;
		--border: #b8b0a3;
		--bg-hover: #e8e0d4;
		--bg-card: #fffdf8;
		--cat-a: #006b32;
		--radius-sm: 6px;
		--shadow-sm: 0 4px 14px rgba(31, 36, 48, 0.12);

		/* mainPocTractCharts.js — same as MainPocTractDashboard warm theme */
		--mpc-ink: #1f2430;
		--mpc-muted: #454d5c;
		--mpc-line: #d8d2c7;
		--mpc-paper: #fffdf8;
		--mpc-bg: #f5f2eb;
		--mpc-accent: #00843d;
		--mpc-accent-soft: #d8efe2;
		--mpc-warning: #ed8b00;
		--mpc-blue5: #003da5;

		--poc-max-width: 1680px;

		font-family: var(--font-body);
		color: var(--ink);
		background: var(--bg);
		max-width: var(--poc-max-width);
		margin: 0 auto;
		padding: 18px 22px 36px;
	}

	/* 75% of the main column max width — keeps long-form narrative readable; explore map stays wide below. */
	.poc-pre-explore {
		max-width: calc(var(--poc-max-width) * 0.75);
		margin-inline: auto;
		width: 100%;
	}

	.explore-after-narrow {
		margin-top: 14px;
	}

	.explore-gate {
		padding: 18px 20px;
		display: grid;
		gap: 10px;
	}

	.explore-gate h2 {
		margin: 0;
		font-size: 1.2rem;
	}

	.explore-gate p {
		margin: 0;
		color: var(--muted);
		line-height: 1.55;
		max-width: 58rem;
	}

	* { box-sizing: border-box; }

	h1, h2, h3 { margin-top: 0; }

	h1 {
		margin-bottom: 14px;
		font-size: clamp(2rem, 4vw, 3.4rem);
		line-height: 1.02;
		letter-spacing: -0.03em;
	}

	.card {
		background: var(--paper);
		border: 1px solid rgba(120, 114, 102, 0.14);
		border-radius: 12px;
		box-shadow: none;
	}

	/* ── Hero ─────────────────────────────────────────── */
	.hero-full {
		padding: 20px 22px;
		margin-bottom: 14px;
	}

	.eyebrow {
		display: inline-block;
		margin-bottom: 8px;
		padding: 0;
		border-radius: 0;
		background: transparent;
		color: var(--accent);
		font-weight: 700;
		font-size: 0.74rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.subtitle { color: var(--muted); line-height: 1.58; margin-bottom: 0; }

	/* ── Dashboard layout ─────────────────────────────── */
	.dashboard {
		display: grid;
		gap: 14px;
	}

	.controls-bar {
		padding: 14px 16px;
	}

	.controls-header {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		align-items: end;
		flex-wrap: wrap;
	}

	.controls-bar h2 { margin-bottom: 6px; font-size: 1.05rem; }
	.controls-note { color: var(--muted); line-height: 1.5; font-size: 0.9rem; margin: 0; }
	.controls-reset { white-space: nowrap; }

	.controls-grid,
	.advanced-grid {
		display: grid;
		gap: 12px;
	}

	.controls-grid {
		grid-template-columns: minmax(260px, 1.35fr) minmax(220px, 1fr) minmax(220px, 1fr);
		align-items: end;
		margin-top: 14px;
	}

	.advanced-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		margin-top: 14px;
	}

	.control-field {
		min-width: 0;
	}

	.control-field--range {
		max-width: 420px;
	}

	.control-block + .control-block {
		margin-top: 0;
		padding-top: 0;
		border-top: 0;
	}

	.label {
		display: block;
		margin-bottom: 8px;
		font-weight: 700;
		font-size: 0.9rem;
	}

	.range-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.play-row {
		display: flex;
		gap: 10px;
		align-items: center;
	}

	.play-row button { flex: 0 0 auto; min-width: 92px; }

	.play-slider-wrap { flex: 1 1 auto; }
	.play-caption { margin-top: 6px; font-size: 0.84rem; color: var(--muted); }

	input[type="number"], select, input[type="search"] {
		width: 100%;
		padding: 9px 10px;
		border: 1px solid #c9c1b4;
		border-radius: 8px;
		background: #fff;
		color: var(--ink);
		font: inherit;
	}

	input[type="range"] { width: 100%; }

	.check-grid {
		display: grid;
		gap: 8px;
		max-height: 180px;
		overflow: auto;
		padding-right: 4px;
	}

	.check-item {
		display: flex;
		gap: 8px;
		align-items: start;
		font-size: 0.92rem;
		color: var(--muted);
		cursor: pointer;
	}

	.button-row, .preset-row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	button {
		font: inherit;
		border: 1px solid #cfc6b8;
		border-radius: 8px;
		padding: 8px 12px;
		background: #fff;
		color: var(--ink);
		cursor: pointer;
		transition: background 120ms ease, border-color 120ms ease;
	}

	button.secondary {
		background: #fff;
		color: var(--ink);
	}

	button:hover {
		background: #faf7f0;
		border-color: #bdb3a4;
	}

	/* ── Content area ─────────────────────────────────── */
	.content {
		display: grid;
		gap: 14px;
	}

	.summary { padding: 16px; }

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
		margin: 12px 0;
	}

	.summary-stat {
		padding: 12px;
		border-radius: 10px;
		background: transparent;
		border: 1px solid var(--line);
	}

	.summary-stat .k {
		color: var(--muted);
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-weight: 700;
	}

	.summary-stat .v {
		margin-top: 6px;
		font-size: 1.7rem;
		font-weight: 800;
		letter-spacing: -0.03em;
	}

	.selection-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 10px;
	}

	.finding-list {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
		margin-top: 12px;
	}

	.finding-item {
		padding: 12px;
		border-radius: 10px;
		background: transparent;
		border: 1px solid var(--line);
	}

	.finding-kicker {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		margin-bottom: 6px;
	}

	.finding-item p {
		color: var(--muted);
		line-height: 1.5;
		margin: 0;
	}

	.chip {
		padding: 5px 8px;
		border-radius: 8px;
		background: transparent;
		border: 1px solid var(--line);
		color: #433d34;
		font-size: 0.85rem;
		font-weight: 500;
	}

	/* ── Story / narrative cards ──────────────────────── */
	.story {
		padding: 18px;
	}

	.story h2 { font-size: 1.2rem; margin-bottom: 10px; }
	.story p { color: var(--muted); line-height: 1.58; margin-bottom: 12px; }
	.story p:last-child { margin-bottom: 0; }

	.hero-plan-note {
		margin-top: 14px;
		font-size: 0.95rem;
		color: var(--muted);
	}

	.hero-plan-note a {
		color: var(--accent);
		font-weight: 700;
		text-decoration: none;
	}

	.hero-plan-note a:hover {
		text-decoration: underline;
	}

	.story-list {
		color: var(--muted);
		line-height: 1.58;
		padding-left: 22px;
		margin: 10px 0;
		list-style-position: outside;
	}

	.story-list li { margin-bottom: 6px; }

	.plan-section {
		scroll-margin-top: 24px;
	}

	.plan-grid {
		display: grid;
		gap: 14px;
		margin-top: 16px;
	}

	.plan-card {
		padding: 16px;
		border: 1px solid var(--line);
		border-radius: 14px;
		background: #faf7f0;
	}

	.plan-card h3 {
		margin-bottom: 12px;
		font-size: 1.05rem;
	}

	.plan-block + .plan-people {
		margin-top: 14px;
		padding-top: 14px;
		border-top: 1px solid var(--line);
	}

	.plan-people {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 14px;
	}

	.plan-block h4,
	.plan-person h4,
	.plan-contingency h3 {
		margin-bottom: 8px;
		font-size: 0.95rem;
	}

	.plan-list {
		margin: 0;
	}

	.plan-contingency {
		margin-top: 16px;
		padding-top: 16px;
		border-top: 1px solid var(--line);
	}

	/* Nested methodology list: indent sub-bullets and leave space before the next paragraph */
	.story-list--nested {
		margin-bottom: 18px;
		padding-left: 1.5em;
	}

	.story-list--nested ul {
		margin-top: 8px;
		margin-bottom: 0;
		padding-left: 1.5em;
		list-style-position: outside;
	}

	.story-list--nested > li:last-child > ul > li:last-child {
		margin-bottom: 0;
	}

	.supplemental {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid var(--line);
	}

	.supplemental summary {
		cursor: pointer;
		font-weight: 700;
		color: var(--ink);
		list-style: none;
	}

	.supplemental summary::-webkit-details-marker {
		display: none;
	}

	.supplemental summary::before {
		content: '+';
		display: inline-block;
		margin-right: 8px;
		font-weight: 700;
		color: var(--accent);
	}

	.supplemental[open] summary::before {
		content: '–';
	}

	.supplemental-grid,
	.supplemental-card {
		margin-top: 14px;
	}

	/* ── Chart cards ──────────────────────────────────── */
	.chart-card { padding: 20px; }
	.chart-card { padding: 16px; }

	.chart-card h2 { font-size: 1.15rem; margin-bottom: 8px; }
	.chart-card h3 { font-size: 1.05rem; margin-bottom: 8px; }

	.chart-note {
		color: var(--muted);
		line-height: 1.55;
		font-size: 0.9rem;
		margin-bottom: 8px;
	}

	.chart-toolbar {
		display: flex;
		gap: 10px;
		align-items: center;
		flex-wrap: wrap;
		margin-bottom: 8px;
	}

	.chart-toolbar select { width: auto; min-width: 210px; }

	.chart-wrap {
		position: relative;
		min-height: 420px;
	}

	.small-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px;
	}

	.small-chart { min-height: 320px; }
	.chart-tall { min-height: 520px; }

	/* Tract overview map: full width of card; map uses wheel capture so zoom stays on the map */
	.chart-wrap--poc-map {
		width: 100%;
		max-width: 100%;
	}

	/* Cohort comparison chart: responsive height, scroll if needed */
	.chart-wrap--tract-edu {
		min-height: 0;
		max-height: min(78vh, 620px);
		overflow: auto;
	}

	.scatter-container {
		display: flex;
		justify-content: center;
		overflow-x: auto;
	}

	.scatter-container--compact {
		justify-content: flex-start;
		max-width: 100%;
	}

	/* Story + chart side-by-side */
	.story-chart-row {
		display: grid;
		gap: 14px;
		align-items: start;
	}

	/* Narrative + chart in one white card (municipal affordability & vulnerability) */
	.story-chart-panel {
		padding: 18px;
	}

	.story-card--embedded {
		margin-top: 12px;
		padding: 0;
		border: 0;
		background: transparent;
	}

	.story-chart-panel__grid {
		display: grid;
		gap: 14px;
		align-items: start;
		grid-template-columns: minmax(0, 1fr) minmax(300px, 1.05fr);
	}

	/* Stacked: narrative uses full card width; chart keeps prior right-column width (1fr : 1.05fr → 1.05/2.05 of row) */
	.story-chart-panel--stacked .story-chart-panel__grid {
		grid-template-columns: 1fr;
	}

	.story-chart-panel--stacked .story-chart-panel__text {
		width: 100%;
		max-width: none;
		justify-self: stretch;
	}

	.story-chart-panel--stacked .story-chart-panel__chart {
		/* Same track sizing intent as minmax(300px, 1.05fr) in the two-column card */
		width: min(100%, max(300px, calc(100% * 1.05 / 2.05)));
		margin-inline: auto;
	}

	.story-chart-panel__text h2 {
		font-size: 1.2rem;
		margin-bottom: 10px;
	}

	.story-chart-panel__text p {
		color: var(--muted);
		line-height: 1.58;
		margin-bottom: 12px;
	}

	.story-chart-panel__text p:last-child {
		margin-bottom: 0;
	}

	.story-chart-panel__chart {
		width: 100%;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.story-chart-panel__chart h3 {
		font-size: 1rem;
		margin-bottom: 8px;
	}

	.story-chart-panel__chart .chart-wrap.small-chart.compact-side-chart {
		flex: 0 0 auto;
		min-height: 0;
		height: auto;
		width: 100%;
	}

	.story-chart-panel .compact-side-chart :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}

	/* Tract TOD scatters: wider copy column, plot slightly narrower than before */
	.story-chart-row--tract {
		grid-template-columns: minmax(0, 0.36fr) minmax(0, 0.64fr);
		align-items: start;
	}

	.story-chart-row--tract .story-chart-text {
		max-width: 40em;
	}

	.story-chart-row--tract .story-chart-plot {
		max-width: 100%;
		width: 100%;
	}

	.story-chart-text {
		margin: 0;
		max-width: 34em;
	}

	.story-chart-plot {
		min-width: 0;
	}

	.story-chart-plot h3 {
		font-size: 1rem;
	}

	.story-chart-row--tract .scatter-container--compact {
		width: 100%;
	}

	@media (max-width: 920px) {
		.controls-grid,
		.advanced-grid {
			grid-template-columns: 1fr;
		}

		.finding-list,
		.plan-people,
		.story-chart-panel__grid,
		.story-chart-row--tract {
			grid-template-columns: 1fr;
		}

		.story-chart-panel .compact-side-chart {
			max-height: none;
			min-height: 260px;
		}
	}

	:global(.poc-root .mpc-map-zoom-hint) {
		font-size: 0.78rem;
		color: var(--muted);
		margin: 8px 0 0;
		line-height: 1.45;
	}

	:global(.poc-root .mpc-tract-edu-legend) {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 20px;
		align-items: center;
		margin-bottom: 6px;
		font-size: 0.82rem;
		color: var(--muted);
	}

	:global(.poc-root .mpc-tract-edu-legend-item) {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	:global(.poc-root .mpc-tract-edu-swatch) {
		width: 11px;
		height: 11px;
		border-radius: 2px;
		flex-shrink: 0;
		box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
	}

	/* TodIntensityScatter: readable tooltip on warm background */
	:global(.poc-root .tod-intensity-wrap .scatter-tooltip) {
		color: var(--ink);
		border-color: var(--line);
		box-shadow: var(--shadow-sm);
	}

	/* ── Tooltip & legend (global for D3 injected elements) ── */
	:global(.poc-root .tooltip) {
		position: absolute;
		pointer-events: none;
		opacity: 0;
		background: rgba(20, 24, 31, 0.94);
		color: #fff;
		padding: 10px 12px;
		border-radius: 10px;
		font-size: 0.82rem;
		line-height: 1.45;
		width: 230px;
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
		z-index: 20;
		max-width: 280px;
	}

	:global(.poc-root .tooltip strong) {
		display: block;
		margin-bottom: 4px;
		font-size: 0.9rem;
	}

	:global(.poc-root .legend) {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
		color: var(--muted);
		font-size: 0.84rem;
	}

	:global(.poc-root .legend-item) {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	:global(.poc-root .legend-scale) {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	:global(.poc-root .legend-ramp) {
		display: inline-grid;
		grid-auto-flow: column;
		gap: 2px;
	}

	:global(.poc-root .legend-ramp span) {
		width: 18px;
		height: 10px;
		border-radius: 999px;
		display: inline-block;
	}

	:global(.poc-root .swatch) {
		width: 12px;
		height: 12px;
		border-radius: 999px;
		display: inline-block;
	}

	:global(.poc-root .chart-note) {
		font-size: 0.85rem;
		color: var(--muted);
		margin: 0 0 8px;
	}

	:global(.poc-root .empty) {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 240px;
		color: var(--muted);
		text-align: center;
		padding: 20px;
		border: 1px dashed var(--line);
		border-radius: 14px;
		background: #faf7f1;
	}

	:global(.poc-root .summary-stat) {
		padding: 14px;
		border-radius: 14px;
		background: #faf7f0;
		border: 1px solid var(--line);
	}

	:global(.poc-root .summary-stat .k) {
		font-size: 0.78rem;
		color: var(--muted);
	}

	:global(.poc-root .summary-stat .v) {
		font-size: 1.15rem;
		font-weight: 700;
	}

	/* NHGIS-style tract globals */
	:global(.poc-root .mpc-tooltip) {
		position: absolute;
		pointer-events: none;
		background: rgba(17, 24, 39, 0.94);
		color: #fff;
		padding: 8px 10px;
		border-radius: 8px;
		font-size: 12px;
		line-height: 1.45;
		opacity: 0;
		z-index: 20;
		max-width: 280px;
	}

	:global(.poc-root .mpc-legend) {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 14px;
		font-size: 0.82rem;
		color: var(--mpc-muted);
	}

	:global(.poc-root .mpc-legend-item) {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	:global(.poc-root .mpc-swatch) {
		width: 12px;
		height: 12px;
		border-radius: 3px;
		display: inline-block;
	}

	:global(.poc-root .mpc-legend-scale) {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	:global(.poc-root .mpc-legend-ramp span) {
		display: inline-block;
		width: 18px;
		height: 10px;
	}

	:global(.poc-root .mpc-empty) {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 160px;
		color: var(--muted);
		border: 1px dashed var(--line);
		border-radius: 12px;
		background: #faf7f1;
		padding: 16px;
		text-align: center;
	}

	:global(.poc-root .mpc-chart-note) {
		font-size: 0.85rem;
		color: var(--mpc-muted);
		margin: 0 0 8px;
	}

	:global(.poc-root .mpc-summary-stat) {
		padding: 12px;
		border-radius: 10px;
		background: #faf7f0;
		border: 1px solid var(--line);
	}

	:global(.poc-root .mpc-k) {
		font-size: 0.78rem;
		color: var(--muted);
	}

	:global(.poc-root .mpc-v) {
		font-size: 1.1rem;
		font-weight: 700;
	}

	/* ── Tract section ────────────────────────────────── */
	.tract-section {
		margin-top: 18px;
		display: grid;
		gap: 14px;
	}

	.full-width { grid-column: 1 / -1; }

	.subtitle--compact {
		max-width: 760px;
		font-size: 1rem;
	}

	.story--signal {
		display: grid;
		gap: 10px;
	}

	.signal-line {
		margin: 0;
		font-size: 1.05rem;
		line-height: 1.55;
		color: var(--ink);
	}

	.guide-figures {
		display: grid;
		grid-template-columns: 1fr;
		gap: 18px;
		margin-top: 14px;
		max-width: 860px;
	}

	.guide-figure {
		margin: 0;
		padding: 16px;
		display: grid;
		gap: 12px;
	}

	.guide-figure h3 {
		margin: 0;
		font-size: 1rem;
		line-height: 1.35;
	}

	.guide-figure figcaption {
		font-size: 0.94rem;
		line-height: 1.55;
		color: var(--muted);
	}

	.annotation-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 12px;
		margin-top: 12px;
	}

	.annotation-card {
		padding: 14px;
		border: 1px solid var(--line);
		border-radius: 14px;
		background: rgba(255, 253, 248, 0.78);
		display: grid;
		gap: 8px;
	}

	.annotation-card h3 {
		margin: 0;
		font-size: 1rem;
	}

	.annotation-card p {
		margin: 0;
		font-size: 0.94rem;
		line-height: 1.5;
		color: var(--muted);
	}

	/* ── Takeaway cards ───────────────────────────────── */
	.takeaway-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 10px;
		margin-top: 10px;
	}

	.takeaway-card {
		padding: 12px;
		border-radius: 10px;
		background: transparent;
		border: 1px solid var(--line);
	}

	.takeaway-label {
		font-size: 0.78rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted);
		margin-bottom: 8px;
	}

	.takeaway-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 4px;
	}

	.takeaway-dumbbell {
		position: relative;
		height: 132px;
		margin: 10px 0 6px;
	}

	.takeaway-dumbbell--compact {
		height: 110px;
	}

	.takeaway-axis {
		position: absolute;
		left: 0;
		right: 0;
		top: 56px;
		height: 4px;
		border-radius: 999px;
		background: linear-gradient(90deg, #e8e0d4, #ddd3c3);
	}

	.takeaway-dumbbell--compact .takeaway-axis {
		top: 46px;
	}

	.takeaway-dot-group {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		display: grid;
		justify-items: center;
		gap: 4px;
		min-width: 72px;
		max-width: 92px;
	}

	.takeaway-dot-group--lower {
		top: 24px;
	}

	.takeaway-dot-label {
		font-size: 0.68rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted);
		text-align: center;
		line-height: 1.15;
		white-space: nowrap;
	}

	.takeaway-dot {
		width: 16px;
		height: 16px;
		border-radius: 999px;
		border: 3px solid #fff;
		box-shadow: 0 2px 10px rgba(31, 36, 48, 0.15);
		margin-top: 18px;
	}

	.takeaway-dumbbell--compact .takeaway-dot {
		margin-top: 12px;
	}

	.takeaway-dot-group.tod .takeaway-dot,
	.takeaway-dot-group.hi-aff .takeaway-dot {
		background: var(--accent);
	}

	.takeaway-dot-group.ctrl .takeaway-dot {
		background: #94a3b8;
	}

	.takeaway-dot-group.minimal .takeaway-dot,
	.takeaway-dot-group.lo-aff .takeaway-dot {
		background: #c9bfaf;
	}

	.takeaway-dot-value {
		font-size: 0.95rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--ink);
		white-space: nowrap;
		background: rgba(255, 253, 248, 0.96);
		padding: 0 4px;
		border-radius: 6px;
	}

	.takeaway-meta {
		margin-top: 10px;
		padding-top: 10px;
		border-top: 1px solid var(--line);
		display: grid;
		gap: 6px;
	}

	.takeaway-statline {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 14px;
		font-size: 0.9rem;
		color: var(--muted);
	}

	.takeaway-statline strong {
		color: var(--ink);
		font-size: 1rem;
		font-variant-numeric: tabular-nums;
	}

	.takeaway-tag {
		font-size: 0.7rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 3px 8px;
		border-radius: 999px;
		min-width: 60px;
		text-align: center;
	}

	.takeaway-tag.tod { background: var(--accent-soft); color: #0b5e2c; }
	.takeaway-tag.ctrl { background: #e2e8f0; color: #475569; }
	.takeaway-tag.minimal { background: #f1f5f9; color: #64748b; }
	.takeaway-tag.hi-aff { background: #d1fae5; color: #065f46; }
	.takeaway-tag.lo-aff { background: #f5f5f4; color: #57534e; }

	.takeaway-value {
		font-size: 1.1rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

	/* ── Conclusion ───────────────────────────────────── */
	.conclusion {
		border-left: 4px solid var(--accent);
	}

	/* ── Loading ──────────────────────────────────────── */
	.loading-status {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 16px;
		min-height: 200px;
		color: var(--muted);
	}

	.loading-status--error h3 { color: #c0392b; font-size: 1.1rem; margin: 0; }

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--line);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin { to { transform: rotate(360deg); } }

	/* ── Responsive ───────────────────────────────────── */
	@media (max-width: 1060px) {
		.dashboard, .small-grid, .summary-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
