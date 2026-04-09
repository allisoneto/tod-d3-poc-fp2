<script>
	import { base } from '$app/paths';
	import FilterPanel from '$lib/components/FilterPanel.svelte';
	import PocNhgisTractMap from '$lib/components/PocNhgisTractMap.svelte';
	import TractDetail from '$lib/components/TractDetail.svelte';
	import { createPanelState } from '$lib/stores/panelState.svelte.js';
	import { tractData, developments } from '$lib/stores/data.svelte.js';
	import { buildFilteredData } from '$lib/utils/derived.js';
	import { buildNhgisLikeRows, buildTractDevClassMap } from '$lib/utils/mainPocTractModel.js';

	const playgroundPanel = createPanelState('playground');
	playgroundPanel.xVar = 'pct_stock_increase';
	playgroundPanel.yVar = 'median_income_change_pct';

	const ALLOWED_X_KEYS = [
		'pct_stock_increase',
		'tod_pct_stock_increase',
		'nontod_pct_stock_increase',
		'affordable_share'
	];

	$effect(() => {
		if (!ALLOWED_X_KEYS.includes(playgroundPanel.xVar)) {
			playgroundPanel.xVar = 'pct_stock_increase';
		}
	});

	const filteredData = $derived.by(() => buildFilteredData(tractData, developments, playgroundPanel));
	const filteredTracts = $derived(filteredData.filteredTracts);
	const filteredDevs = $derived(filteredData.filteredDevs);

	const devClassByGj = $derived.by(() =>
		buildTractDevClassMap(
			filteredTracts,
			filteredDevs,
			{ timePeriod: playgroundPanel.timePeriod },
			playgroundPanel.transitDistanceMi,
			{
				minUnitsPerProject: playgroundPanel.minUnitsPerProject,
				minDevMultifamilyRatioPct: playgroundPanel.minDevMultifamilyRatioPct,
				minDevAffordableRatioPct: playgroundPanel.minDevAffordableRatioPct,
				includeRedevelopment: playgroundPanel.includeRedevelopment
			},
			playgroundPanel.sigDevMinPctStockIncrease,
			playgroundPanel.todFractionCutoff
		)
	);

	const nhgisRows = $derived.by(() =>
		buildNhgisLikeRows(filteredTracts, devClassByGj, playgroundPanel.timePeriod)
	);
</script>

<section class="playground-root">
	<div class="playground-hero card">
		<p class="playground-eyebrow">Map Playground</p>
		<h1>Explore the choropleth without the walkthrough</h1>
		<p class="playground-lead">
			This page keeps the full tract map interactive from the start. Toggle transit overlays, development
			dots, and tract classifications, then click tracts to inspect them in more detail.
		</p>
		<p class="playground-link">
			<a href={`${base}/`}>Back to the guided story</a>
		</p>
	</div>

	<div class="playground-grid">
		<aside class="playground-side">
			<div class="card playground-panel">
				<h2>Controls</h2>
				<p class="playground-note">
					Everything here updates the map directly. Use the overlay and development settings to compare
					growth, TOD patterns, and projects in the same view.
				</p>
				<FilterPanel panelState={playgroundPanel} allowedXKeys={ALLOWED_X_KEYS} />
			</div>

			<div class="card playground-panel">
				<h2>Selected tract detail</h2>
				<p class="playground-note">
					Click one or more tracts on the map to pin them here. Hovering still gives quick tooltip detail.
				</p>
				<TractDetail
					panelState={playgroundPanel}
					sidebarMode="compact"
					hideBulkActions
					allowedXAxisKeys={ALLOWED_X_KEYS}
				/>
			</div>
		</aside>

		<div class="card playground-map-card">
			<div class="playground-map-head">
				<div>
					<p class="playground-map-kicker">Interactive map</p>
					<h2>Choropleth playground</h2>
				</div>
				<p class="playground-map-note">
					Blue means stronger housing growth, red means weaker or negative growth, and overlays can be
					switched on and off as needed.
				</p>
			</div>

			<div class="playground-map-wrap">
				<PocNhgisTractMap
					panelState={playgroundPanel}
					tractList={filteredTracts}
					nhgisRows={nhgisRows}
					metricsDevelopments={filteredDevs}
				/>
			</div>
		</div>
	</div>
</section>

<style>
	.playground-root {
		max-width: 1440px;
		margin: 0 auto;
		padding: 28px 20px 56px;
		display: grid;
		gap: 18px;
	}

	.card {
		background: #fffdf8;
		border: 1px solid #d8d2c7;
		border-radius: 18px;
		box-shadow: 0 14px 34px rgba(31, 36, 48, 0.08);
	}

	.playground-hero {
		padding: 24px 26px;
	}

	.playground-eyebrow {
		margin: 0 0 8px;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #00843d;
	}

	.playground-hero h1,
	.playground-panel h2,
	.playground-map-card h2 {
		margin: 0 0 10px;
		font-family: Helvetica, Arial, sans-serif;
		color: #1f2430;
	}

	.playground-hero h1 {
		font-size: clamp(1.9rem, 4vw, 2.9rem);
		line-height: 1.08;
	}

	.playground-lead,
	.playground-link,
	.playground-note,
	.playground-map-note {
		margin: 0;
		color: #4b5563;
		line-height: 1.65;
	}

	.playground-link {
		margin-top: 12px;
	}

	.playground-link a {
		color: #00843d;
		font-weight: 700;
		text-decoration: none;
	}

	.playground-link a:hover {
		text-decoration: underline;
	}

	.playground-grid {
		display: grid;
		grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
		gap: 18px;
		align-items: start;
	}

	.playground-side {
		display: grid;
		gap: 18px;
		position: sticky;
		top: 18px;
	}

	.playground-panel {
		padding: 18px 18px 20px;
	}

	.playground-note {
		margin-bottom: 14px;
		font-size: 0.94rem;
	}

	.playground-map-card {
		padding: 18px 18px 22px;
		display: grid;
		gap: 14px;
	}

	.playground-map-head {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: end;
	}

	.playground-map-kicker {
		margin: 0 0 6px;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #00843d;
	}

	.playground-map-note {
		max-width: 440px;
		font-size: 0.94rem;
	}

	.playground-map-wrap {
		min-height: 760px;
	}

	@media (max-width: 1180px) {
		.playground-grid {
			grid-template-columns: 1fr;
		}

		.playground-side {
			position: static;
		}

		.playground-map-head {
			flex-direction: column;
			align-items: start;
		}
	}

	@media (max-width: 720px) {
		.playground-root {
			padding-inline: 14px;
		}

		.playground-hero,
		.playground-panel,
		.playground-map-card {
			padding-inline: 16px;
		}

		.playground-map-wrap {
			min-height: 620px;
		}
	}
</style>
