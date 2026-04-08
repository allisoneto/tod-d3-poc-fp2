<script>
	import { onDestroy } from 'svelte';
	import * as d3 from 'd3';
	import { computeTodMismatchClusters } from '$lib/utils/todMismatchClusters.js';
	import { LOW_INCOME_MEDIAN_THRESHOLD } from '$lib/utils/incomeTract.js';

	/** @type {{ tractList: object[], nhgisRows: object[], panelState: object }} */
	let { tractList, nhgisRows, panelState } = $props();

	let elA = $state(/** @type {HTMLElement | null} */ (null));
	let elB = $state(/** @type {HTMLElement | null} */ (null));

	const COLORS = {
		tod: 'var(--accent, #00843d)',
		nontod: 'var(--warning, #ea580c)',
		minimal: '#94a3b8',
		ha: '#7B61FF',
		hg: '#B8A8FF',
		other: '#64748b'
	};

	/** @param {number} mh */
	function incomeBin(mh) {
		if (!Number.isFinite(mh)) return -1;
		if (mh < 75_000) return 0;
		if (mh < 125_000) return 1;
		if (mh < 175_000) return 2;
		return 3;
	}

	const BIN_LABELS = ['Under $75k', '$75k–125k', '$125k–175k', '$175k+'];

	const plotKey = $derived(
		JSON.stringify({
			n: tractList?.length ?? 0,
			nr: nhgisRows?.length ?? 0,
			tp: panelState.timePeriod,
			h: panelState.hoveredTract,
			s: [...(panelState.selectedTracts ?? new Set())].sort().join(',')
		})
	);

	let lastKey = '';

	function draw() {
		if (!elA || !elB || !tractList?.length || !nhgisRows?.length) return;
		if (plotKey === lastKey) return;

		const tp = panelState.timePeriod;
		const { flagsByGj } = computeTodMismatchClusters(tractList, nhgisRows, tp);
		const rowByGj = new Map(nhgisRows.map((r) => [r.gisjoin, r]));

		const cohorts = ['tod_dominated', 'nontod_dominated', 'minimal'];
		const cohortLabel = (c) =>
			c === 'tod_dominated' ? 'TOD-dom.' : c === 'nontod_dominated' ? 'Non-TOD' : 'Minimal';

		/** @type {Record<string, number[]>} */
		const counts = {};
		for (const c of cohorts) counts[c] = [0, 0, 0, 0];

		for (const row of nhgisRows) {
			const dc = row.devClass;
			if (!dc || !cohorts.includes(dc)) continue;
			const mh = row.median_household_income;
			if (mh == null || !Number.isFinite(Number(mh))) continue;
			const b = incomeBin(Number(mh));
			if (b < 0) continue;
			counts[dc][b] += 1;
		}

		const maxC = d3.max(cohorts, (c) => d3.max(counts[c])) ?? 1;

		const w = elA.clientWidth || 520;
		const h = 200;
		const m = { t: 28, r: 12, b: 40, l: 44 };

		// —— Chart A: grouped counts by income bin ——
		d3.select(elA).selectAll('*').remove();
		const svgA = d3
			.select(elA)
			.append('svg')
			.attr('width', w)
			.attr('height', h)
			.attr('role', 'img')
			.attr('aria-label', 'Tract count by median income bin and development cohort');

		const x0 = d3.scaleBand().domain(BIN_LABELS.map((_, i) => String(i))).range([m.l, w - m.r]).padding(0.15);
		const x1 = d3.scaleBand().domain(cohorts).range([0, x0.bandwidth()]).padding(0.12);
		const y = d3
			.scaleLinear()
			.domain([0, maxC * 1.08])
			.nice()
			.range([h - m.b, m.t]);

		const gA = svgA.append('g');
		gA.append('text')
			.attr('x', m.l)
			.attr('y', 18)
			.attr('fill', 'var(--text-muted, #5e6573)')
			.attr('font-size', '11px')
			.attr('font-weight', 600)
			.text('Tracts by median income bin (period end)');

		for (const c of cohorts) {
			const color =
				c === 'tod_dominated' ? COLORS.tod : c === 'nontod_dominated' ? COLORS.nontod : COLORS.minimal;
			gA.selectAll(`rect.cohort-${c}`)
				.data([0, 1, 2, 3])
				.join('rect')
				.attr('class', `cohort-${c}`)
				.attr('x', (bin) => (x0(String(bin)) ?? 0) + (x1(c) ?? 0))
				.attr('y', (bin) => y(counts[c][bin]))
				.attr('width', x1.bandwidth())
				.attr('height', (bin) => y(0) - y(counts[c][bin]))
				.attr('fill', color)
				.attr('opacity', 0.88);
		}

		const xAxis = d3.axisBottom(x0).tickFormat((d) => BIN_LABELS[Number(d)]);
		gA.append('g')
			.attr('transform', `translate(0,${h - m.b})`)
			.call(xAxis)
			.call((g) => g.selectAll('text').attr('fill', 'var(--text-muted)').attr('font-size', '9px'));

		gA.append('g')
			.attr('transform', `translate(${m.l - 8},0)`)
			.call(d3.axisLeft(y).ticks(4))
			.call((g) => g.selectAll('text').attr('fill', 'var(--text-muted)').attr('font-size', '9px'));

		const leg = gA
			.append('g')
			.attr('transform', `translate(${m.l}, ${h - 14})`);
		cohorts.forEach((c, i) => {
			const color =
				c === 'tod_dominated' ? COLORS.tod : c === 'nontod_dominated' ? COLORS.nontod : COLORS.minimal;
			leg.append('rect')
				.attr('x', i * 118)
				.attr('width', 10)
				.attr('height', 10)
				.attr('rx', 2)
				.attr('fill', color);
			leg.append('text')
				.attr('x', i * 118 + 14)
				.attr('y', 9)
				.attr('fill', 'var(--text-muted)')
				.attr('font-size', '9px')
				.text(cohortLabel(c));
		});

		// Highlight hovered tract’s bin + cohort
		const hid =
			panelState.hoveredTract ??
			([...(panelState.selectedTracts ?? new Set())][0] ?? null);
		if (hid) {
			const row = rowByGj.get(hid);
			const mh = row?.median_household_income;
			const dc = row?.devClass;
			const b = Number.isFinite(Number(mh)) ? incomeBin(Number(mh)) : -1;
			if (dc && cohorts.includes(dc) && b >= 0) {
				gA.append('rect')
					.attr('x', (x0(String(b)) ?? 0) + (x1(dc) ?? 0) - 1)
					.attr('y', y(counts[dc][b]) - 2)
					.attr('width', x1.bandwidth() + 2)
					.attr('height', y(0) - y(counts[dc][b]) + 4)
					.attr('fill', 'none')
					.attr('stroke', '#1f2430')
					.attr('stroke-width', 2)
					.attr('pointer-events', 'none');
			}
		}

		// —— Chart B: share of lower-income tracts by pattern ——
		function shareLowIncome(filterFn) {
			let n = 0;
			let li = 0;
			for (const row of nhgisRows) {
				if (!filterFn(row)) continue;
				n += 1;
				if (row.is_low_income) li += 1;
			}
			return n ? li / n : 0;
		}

		const groups = [
			{
				key: 'ha',
				label: 'High access, low growth',
				ok: (row) => flagsByGj.get(row.gisjoin)?.isHighAccessLowGrowth
			},
			{
				key: 'hg',
				label: 'High growth, low access',
				ok: (row) => flagsByGj.get(row.gisjoin)?.isHighGrowthLowAccess
			},
			{ key: 'other', label: 'Other tracts', ok: () => true }
		];

		const shares = groups.map((g) => ({
			...g,
			share: shareLowIncome(
				g.key === 'other'
					? (row) =>
							!flagsByGj.get(row.gisjoin)?.isHighAccessLowGrowth &&
							!flagsByGj.get(row.gisjoin)?.isHighGrowthLowAccess
					: (row) => g.ok(row)
			)
		}));

		const wB = elB.clientWidth || 520;
		const hB = 160;
		const mB = { t: 28, r: 16, b: 28, l: 150 };

		d3.select(elB).selectAll('*').remove();
		const svgB = d3
			.select(elB)
			.append('svg')
			.attr('width', wB)
			.attr('height', hB)
			.attr('role', 'img')
			.attr(
				'aria-label',
				'Share of tracts with median income below 125 thousand dollars by access growth pattern'
			);

		svgB
			.append('text')
			.attr('x', mB.l - 134)
			.attr('y', 18)
			.attr('fill', 'var(--text-muted, #5e6573)')
			.attr('font-size', '11px')
			.attr('font-weight', 600)
			.text(`Share of tracts &lt; $${(LOW_INCOME_MEDIAN_THRESHOLD / 1000).toFixed(0)}k median`);

		const yB = d3
			.scaleBand()
			.domain(shares.map((s) => s.key))
			.range([mB.t, hB - mB.b])
			.padding(0.28);

		const xB = d3.scaleLinear().domain([0, 1]).range([mB.l, wB - mB.r]);

		const hb = svgB.append('g');
		hb.selectAll('rect')
			.data(shares)
			.join('rect')
			.attr('x', mB.l)
			.attr('y', (d) => yB(d.key) ?? 0)
			.attr('height', yB.bandwidth())
			.attr('width', (d) => xB(d.share) - mB.l)
			.attr('fill', (d) => (d.key === 'ha' ? COLORS.ha : d.key === 'hg' ? COLORS.hg : COLORS.other))
			.attr('opacity', 0.9);

		hb.selectAll('text.pct')
			.data(shares)
			.join('text')
			.attr('class', 'pct')
			.attr('x', (d) => xB(d.share) + 6)
			.attr('y', (d) => (yB(d.key) ?? 0) + yB.bandwidth() / 2 + 4)
			.attr('fill', 'var(--text, #1f2430)')
			.attr('font-size', '11px')
			.attr('font-weight', 700)
			.text((d) => `${d3.format('.0%')(d.share)}`);

		hb.selectAll('text.lab')
			.data(shares)
			.join('text')
			.attr('class', 'lab')
			.attr('x', mB.l - 6)
			.attr('y', (d) => (yB(d.key) ?? 0) + yB.bandwidth() / 2 + 4)
			.attr('text-anchor', 'end')
			.attr('fill', 'var(--text-muted)')
			.attr('font-size', '10px')
			.text((d) => d.label);

		// Link highlight: hovered tract’s pattern row
		if (hid) {
			const f = flagsByGj.get(hid);
			let hk = 'other';
			if (f?.isHighAccessLowGrowth) hk = 'ha';
			else if (f?.isHighGrowthLowAccess) hk = 'hg';
			hb.append('rect')
				.attr('x', mB.l - 4)
				.attr('y', (yB(hk) ?? 0) - 2)
				.attr('width', wB - mB.l - mB.r + 8)
				.attr('height', yB.bandwidth() + 4)
				.attr('fill', 'none')
				.attr('stroke', '#1f2430')
				.attr('stroke-width', 1.5)
				.attr('rx', 4)
				.attr('pointer-events', 'none');
		}

		hb.append('g')
			.attr('transform', `translate(0,${hB - mB.b})`)
			.call(
				d3
					.axisBottom(xB)
					.ticks(5)
					.tickFormat((v) => `${Math.round(Number(v) * 100)}%`)
			)
			.call((g) => g.selectAll('text').attr('fill', 'var(--text-muted)').attr('font-size', '9px'));

		lastKey = plotKey;
	}

	$effect(() => {
		void plotKey;
		draw();
	});

	onDestroy(() => {
		lastKey = '';
	});
</script>

<div class="income-charts card-key" role="region" aria-label="Income distribution supplementary charts">
	<h4 class="income-charts__title">Income distribution across transit and development patterns</h4>
	<p class="income-charts__sub">
		Median household income uses the census tract field at the period end year (same threshold as the map:
		&lt;$125k = lower-income). Charts update when you hover or select tracts on the map.
	</p>
	<div class="income-charts__grid">
		<div class="income-charts__plot" bind:this={elA}></div>
		<div class="income-charts__plot" bind:this={elB}></div>
	</div>
</div>

<style>
	.income-charts {
		margin-top: 10px;
		padding: 12px 14px;
		border-radius: 12px;
		border: 1px solid color-mix(in srgb, var(--border, #d8d2c7) 88%, transparent);
		background: color-mix(in srgb, var(--bg-card, #fffdf8) 96%, transparent);
	}

	.income-charts__title {
		margin: 0 0 6px;
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--text, #1f2430);
	}

	.income-charts__sub {
		margin: 0 0 10px;
		font-size: 0.78rem;
		line-height: 1.45;
		color: var(--text-muted, #5e6573);
	}

	.income-charts__grid {
		display: grid;
		gap: 14px;
	}

	@media (min-width: 900px) {
		.income-charts__grid {
			grid-template-columns: 1fr 1fr;
			align-items: start;
		}
	}

	.income-charts__plot {
		min-height: 200px;
		width: 100%;
		overflow: auto;
	}

	.income-charts__plot :global(svg) {
		display: block;
		max-width: 100%;
		height: auto;
	}
</style>
