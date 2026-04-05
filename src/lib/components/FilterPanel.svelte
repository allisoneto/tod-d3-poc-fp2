<script>
	import { meta } from '$lib/stores/data.svelte.js';

	let {
		panelState,
		/** If set, only these ``meta.xVariables`` keys appear in the X-axis dropdown (e.g. home explore). */
		allowedXKeys = null
	} = $props();

	const groupedYVars = $derived.by(() => {
		const groups = [];
		const seen = new Set();
		for (const v of meta.yVariables ?? []) {
			if (!seen.has(v.cat)) {
				seen.add(v.cat);
				groups.push({ cat: v.cat, catLabel: v.catLabel, vars: [] });
			}
			groups.find((g) => g.cat === v.cat)?.vars.push(v);
		}
		return groups;
	});

	/** X-axis vars grouped by data source (census vs MassBuilds). */
	const groupedXVars = $derived.by(() => {
		const bySrc = new Map();
		const order = [];
		for (const v of meta.xVariables ?? []) {
			if (allowedXKeys && !allowedXKeys.includes(v.key)) continue;
			const src = v.source ?? 'other';
			if (!bySrc.has(src)) {
				bySrc.set(src, {
					source: src,
					sourceLabel: v.sourceLabel ?? src,
					vars: []
				});
				order.push(src);
			}
			bySrc.get(src).vars.push(v);
		}
		order.sort((a, b) => {
			const rank = (s) => (s === 'census' ? 0 : s === 'massbuilds' ? 1 : 2);
			return rank(a) - rank(b);
		});
		return order.map((s) => bySrc.get(s));
	});

</script>

<div class="filter-panel">
	<div class="filter-panel-grid">
	<!-- ── Section 1: Time & Axes ──────────────────────────── -->
	<fieldset class="section section--time">
		<legend class="section-title">Time & Axes</legend>
		<div class="row">
			<label class="field">
				<span class="label">Period</span>
			<select bind:value={panelState.timePeriod}>
				<option value="90_00">1990–2000</option>
				<option value="00_10">2000–2010</option>
				<option value="10_20">2010–2020</option>
				<option value="00_20">2000–2020</option>
				<option value="90_20">1990–2020</option>
			</select>
			</label>
			<label class="field grow">
				<span class="label">X axis</span>
				<select bind:value={panelState.xVar}>
					{#each groupedXVars as group (group.source)}
						<optgroup label={group.sourceLabel}>
							{#each group.vars as v (v.key)}
								<option value={v.key}>{v.label}</option>
							{/each}
						</optgroup>
					{/each}
				</select>
			</label>
			<label class="field grow">
				<span class="label">Y axis</span>
				<select bind:value={panelState.yVar}>
					{#each groupedYVars as group (group.cat)}
						<optgroup label={group.catLabel}>
							{#each group.vars as v (v.key)}
								<option value={v.key}>{v.label}</option>
							{/each}
						</optgroup>
					{/each}
				</select>
			</label>
		</div>
	</fieldset>

	<!-- ── Census tract filtering (single universe for all views) ── -->
	<fieldset class="section section--census">
		<legend class="section-title">Census tract filtering</legend>
		<p class="section-hint section-hint--tight">
			These limits apply to every chart and the map. TOD-dominated vs comparison cohorts use MassBuilds
			TOD units and the thresholds under &ldquo;TOD Analysis&rdquo; below.
		</p>
		<div class="census-fields">
			<label class="field" title="Minimum population at the start of the selected time period">
				<span class="label">Min. population</span>
				<input type="number" min="0" step="100" bind:value={panelState.minPopulation} />
			</label>
			<label class="field" title="Minimum population per square mile at the start of the selected time period">
				<span class="label">Min. pop. density (per mi²)</span>
				<input type="number" min="0" step="100" bind:value={panelState.minPopDensity} />
			</label>
			<label class="field" title="Minimum transit stops per square mile (stops within tract + 0.1 mi buffer) for inclusion in the analysis universe">
				<span class="label">Min. stops / mi²</span>
				<input type="number" min="0" step="0.5" bind:value={panelState.minStopsPerSqMi} />
			</label>
		</div>
	</fieldset>

	<!-- ── Development Filters ──────────────────── -->
	<fieldset class="section section--dev">
		<legend class="section-title">Development Filters</legend>
		<p class="section-hint section-hint--tight">
			These options filter which MassBuilds projects count toward development metrics.
		</p>
		<div class="dev-row">
			<label class="field" title="Exclude individual projects below this unit count">
				<span class="label">Min. units / project</span>
				<input type="number" min="0" step="1" bind:value={panelState.minUnitsPerProject} />
			</label>
			<label
				class="field"
				title="Each project must have at least this share of units in small + large multifamily (MassBuilds). 0 = off."
			>
				<span class="label">Min. multifamily ratio (%)</span>
				<input
					type="number"
					min="0"
					max="100"
					step="1"
					bind:value={panelState.minDevMultifamilyRatioPct}
				/>
			</label>
			<label
				class="field"
				title="Each project must have at least this share of units counted as affordable. 0 = off."
			>
				<span class="label">Min. affordable ratio (%)</span>
				<input
					type="number"
					min="0"
					max="100"
					step="1"
					bind:value={panelState.minDevAffordableRatioPct}
				/>
			</label>
			<label class="toggle-item toggle-item--inline">
				<input type="checkbox" bind:checked={panelState.includeRedevelopment} />
				<span>Include redevelopment</span>
			</label>
		</div>
	</fieldset>

	<!-- ── TOD Analysis (development-level TOD scatter plots) ── -->
	<fieldset class="section section--tod">
		<legend class="section-title">TOD Analysis</legend>
		<p class="section-hint section-hint--tight">
			Also drives map cohort highlights, bar chart comparison, and summary pills: transit distance for
			TOD units, thresholds for significant vs minimal development, and census vs MassBuilds % growth.
		</p>
		<div class="tod-grid">
			<div class="field field--segment">
				<span class="label">Housing growth</span>
				<div class="segmented" role="group" aria-label="Housing data source">
					<button
						type="button"
						class="segmented-btn"
						class:active={panelState.huChangeSource === 'massbuilds'}
						onclick={() => (panelState.huChangeSource = 'massbuilds')}
					>
						MassBuilds
					</button>
					<button
						type="button"
						class="segmented-btn"
						class:active={panelState.huChangeSource === 'census'}
						onclick={() => (panelState.huChangeSource = 'census')}
					>
						Census
					</button>
				</div>
			</div>
			<label class="field" title="Developments with nearest MBTA stop within this distance count as transit-accessible for TOD unit classification">
				<span class="label">Transit dist. (mi)</span>
				<input
					type="number"
					min="0.1"
					max="1"
					step="0.05"
					bind:value={panelState.transitDistanceMi}
				/>
			</label>
			<label class="field" title="Tracts below this % increase in housing stock (census or MassBuilds per toggle) are &lsquo;minimal development&rsquo; (grey)">
				<span class="label">Sig. dev. (%)</span>
				<input
					type="number"
					min="0"
					max="20"
					step="0.5"
					bind:value={panelState.sigDevMinPctStockIncrease}
				/>
			</label>
			<label class="field" title="TOD fraction of new development at or above this value marks a tract as TOD-dominated (blue side of diverging scale)">
				<span class="label">TOD-dom. cutoff</span>
				<input
					type="number"
					min="0"
					max="1"
					step="0.05"
					bind:value={panelState.todFractionCutoff}
				/>
			</label>
		</div>
	</fieldset>

	<!-- ── Section 4: Map Overlays ───────────────────────────── -->
	<fieldset class="section section--map">
		<legend class="section-title">Map Overlays</legend>
		<div class="overlay-grid">
			<div class="overlay-header"></div>
			<div class="overlay-header overlay-col-label">Lines</div>
			<div class="overlay-header overlay-col-label">Stops</div>

			<span class="overlay-row-label">Bus</span>
			<label class="overlay-toggle"><input type="checkbox" bind:checked={panelState.showBusLines} /></label>
			<label class="overlay-toggle"><input type="checkbox" bind:checked={panelState.showBusStops} /></label>

			<span class="overlay-row-label">Rapid transit</span>
			<label class="overlay-toggle"><input type="checkbox" bind:checked={panelState.showRailLines} /></label>
			<label class="overlay-toggle"><input type="checkbox" bind:checked={panelState.showRailStops} /></label>

			<span class="overlay-row-label">Commuter rail</span>
			<label class="overlay-toggle"><input type="checkbox" bind:checked={panelState.showCommuterRailLines} /></label>
			<label class="overlay-toggle"><input type="checkbox" bind:checked={panelState.showCommuterRailStops} /></label>
		</div>
		<div class="toggles toggles-follow">
			<label class="toggle-item show-devs">
				<input type="checkbox" bind:checked={panelState.showDevelopments} />
				<span>Show developments</span>
			</label>
			<label
				class="toggle-item"
				title="Tint TOD-dominated tracts (MassBuilds TOD share at or above cutoff) on the choropleth"
			>
				<input type="checkbox" bind:checked={panelState.showMapTodCohortShade} />
				<span>Highlight TOD-dominated tracts</span>
			</label>
			<label
				class="toggle-item"
				title="Tint tracts with significant non-TOD-dominated development (comparison cohort)"
			>
				<input type="checkbox" bind:checked={panelState.showMapControlCohortShade} />
				<span>Highlight non-TOD-dominated (significant dev)</span>
			</label>
		</div>
	</fieldset>
	</div>
</div>

<style>
	.filter-panel {
		min-width: 0;
		container-type: inline-size;
		container-name: filter-panel;
		font-size: 0.6875rem;
	}

	.filter-panel-grid {
		display: grid;
		grid-template-columns: 1fr;
		align-items: start;
		gap: 5px;
	}

	/* Wide dashboard: pair census + dev; pair TOD + map overlays to save vertical space */
	@container filter-panel (min-width: 640px) {
		.filter-panel-grid {
			grid-template-columns: repeat(12, minmax(0, 1fr));
		}

		.section--time {
			grid-column: 1 / -1;
		}

		.section--census {
			grid-column: 1 / span 6;
		}

		.section--dev {
			grid-column: 7 / span 6;
		}

		.section--tod {
			grid-column: 1 / -1;
		}

		.section--map {
			grid-column: 1 / -1;
		}
	}

	@container filter-panel (min-width: 900px) {
		.section--tod {
			grid-column: 1 / span 7;
		}

		.section--map {
			grid-column: 8 / span 5;
			align-self: stretch;
		}
	}

	.census-fields {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(124px, 1fr));
		gap: 5px 8px;
		align-items: end;
		margin-top: 1px;
	}

	.dev-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
		gap: 5px 8px;
		align-items: end;
	}

	.tod-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
		gap: 5px 8px;
		align-items: end;
		margin-top: 1px;
	}

	.field--segment {
		min-width: 0;
	}

	.section-hint--tight {
		margin-top: 0;
		margin-bottom: 4px;
	}

	.filter-panel :global(select),
	.filter-panel :global(input[type='number']) {
		font-size: 0.6875rem;
		line-height: 1.25;
		padding: 2px 5px;
		min-height: 22px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--bg-panel);
		color: var(--text);
	}

	.filter-panel :global(select) {
		padding-right: 1.5rem;
	}

	.section {
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-card);
		padding: 4px 6px 5px;
		margin: 0;
		min-width: 0;
	}

	.section--map .overlay-grid {
		gap: 5px 6px;
	}

	.section--map .toggles-follow {
		margin-top: 3px;
	}

	.toggle-item--inline {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.6875rem;
		color: var(--text-muted);
		cursor: pointer;
		line-height: 1.2;
		min-height: 22px;
		padding-top: 1.1rem;
	}

	.toggle-item--inline input[type='checkbox'] {
		accent-color: var(--accent);
		margin: 0;
	}

	.section-title {
		font-size: 0.625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--accent);
		padding: 0 2px;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: flex-end;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.field.grow {
		flex: 1 1 140px;
	}

	.label {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		line-height: 1.2;
	}

	.toggles {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 10px;
		margin-top: 4px;
	}

	.toggles-follow {
		margin-top: 4px;
	}

	.toggle-item {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.6875rem;
		color: var(--text-muted);
		cursor: pointer;
		line-height: 1.2;
	}

	.toggle-item input[type='checkbox'] {
		accent-color: var(--accent);
		margin: 0;
	}

	.show-devs {
		color: var(--accent);
		font-weight: 600;
	}

	.section-hint {
		font-size: 0.5625rem;
		color: var(--text-muted);
		line-height: 1.35;
		margin-top: 3px;
		opacity: 0.85;
		max-width: 100%;
		overflow-wrap: anywhere;
	}

	.overlay-grid {
		display: grid;
		grid-template-columns: auto 1fr 1fr;
		gap: 7px 8px;
		align-items: center;
	}

	.overlay-header {
		font-size: 0.5625rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	.overlay-col-label {
		text-align: center;
	}

	.overlay-row-label {
		font-size: 0.625rem;
		color: var(--text-muted);
		text-transform: capitalize;
		line-height: 1.2;
	}

	.overlay-toggle {
		display: flex;
		justify-content: center;
		cursor: pointer;
	}

	.overlay-toggle input[type='checkbox'] {
		accent-color: var(--accent);
		margin: 0;
	}

	.segmented {
		display: inline-flex;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--bg-panel);
	}

	.segmented-btn {
		border: none;
		background: transparent;
		color: var(--text-muted);
		font-size: 0.6875rem;
		padding: 4px 10px;
		cursor: pointer;
		line-height: 1.2;
	}

	.segmented-btn.active {
		background: color-mix(in srgb, var(--accent) 18%, var(--bg-panel));
		color: var(--accent);
		font-weight: 600;
	}
</style>
