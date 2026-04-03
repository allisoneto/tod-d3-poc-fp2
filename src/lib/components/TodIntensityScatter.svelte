<script>
	import { onDestroy } from 'svelte';
	import * as d3 from 'd3';
	import { tractData, developments, meta } from '$lib/stores/data.svelte.js';
	import {
		buildTodAnalysisData,
		classifyTractDevelopment,
		computeWeightedRegression,
		filterPointsTenSigmaMarginals,
		huWeightKey
	} from '$lib/utils/derived.js';
	import { periodCensusBounds } from '$lib/utils/periods.js';
	import { splitChartTitle } from '$lib/utils/chartTitles.js';

	let { panelState, domainOverride = null } = $props();

	let containerEl = $state(null);
	let tooltip = $state({ visible: false, x: 0, y: 0, lines: [] });

	const marginLeft = 60;
	const marginRight = 14;
	const marginBottom = 52;
	/** Space for vertical TOD-share colorbar to the right of the plot. */
	const LEGEND_COL_W = 54;
	const innerWidth = 380;
	const innerHeight = 340;

	const LINE_TOD = '#2563eb';
	const LINE_NONTOD = '#dc2626';
	const LINE_ALL = '#7c3aed';
	const GREY_MINIMAL = '#94a3b8';

	const plotKey = $derived(
		JSON.stringify({
			tp: panelState.timePeriod,
			y: panelState.yVar,
			n: tractData.length,
			dn: developments.length,
			tdMi: panelState.transitDistanceMi,
			sig: panelState.sigDevMinPctStockIncrease,
			todCut: panelState.todFractionCutoff,
			huSrc: panelState.huChangeSource,
			devMin: panelState.minUnitsPerProject,
			devMfPct: panelState.minDevMultifamilyRatioPct,
			devAffPct: panelState.minDevAffordableRatioPct,
			redev: panelState.includeRedevelopment,
			minPop: panelState.minPopulation,
			minDens: panelState.minPopDensity,
			minStops: panelState.minStopsPerSqMi,
			trim: panelState.trimOutliers,
			dom: domainOverride?.todIntensity ? 'on' : 'off',
			dx: domainOverride?.todIntensity?.xDomain,
			dy: domainOverride?.todIntensity?.yDomain
		})
	);

	let lastPlotKey = $state('');
	const plotUid = `ti-${Math.random().toString(36).slice(2, 9)}`;

	/**
	 * Diverging red–white–blue by TOD fraction; white at ``cut``.
	 *
	 * @param {number | null} todFraction
	 * @param {number} cut
	 * @returns {string}
	 */
	function colorDivergingTod(todFraction, cut) {
		const tf = Number(todFraction);
		if (!Number.isFinite(tf)) return GREY_MINIMAL;
		const c = Math.min(1, Math.max(0, cut));
		const t = Math.min(1, Math.max(0, tf));
		if (c <= 1e-9) {
			return d3.interpolateRgb('#dc2626', '#2563eb')(t);
		}
		if (t <= c) {
			const u = c < 1e-9 ? 0 : t / c;
			return d3.interpolateRgb('#dc2626', '#ffffff')(u);
		}
		const u = 1 - c < 1e-9 ? 1 : (t - c) / (1 - c);
		return d3.interpolateRgb('#ffffff', '#2563eb')(u);
	}

	$effect(() => {
		void plotKey;
		if (!containerEl) return;
		if (plotKey === lastPlotKey) return;
		lastPlotKey = plotKey;

		const tp = panelState.timePeriod;
		const yBase = panelState.yVar;
		const yKey = `${yBase}_${tp}`;
		const huKey = huWeightKey(tp);
		const hoveredId = panelState.hoveredTract;
		const selectedSet = panelState.selectedTracts;

		const root = d3.select(containerEl);
		root.selectAll('*').remove();

		const { filteredTracts, tractTodMetrics } = buildTodAnalysisData(
			tractData,
			developments,
			panelState
		);

		const sigThr = panelState.sigDevMinPctStockIncrease ?? 2;
		const todCut = Number(panelState.todFractionCutoff);
		const cut = Number.isFinite(todCut) ? Math.min(1, Math.max(0, todCut)) : 0.5;

		/** @type {Array<{ tract: object, x: number, y: number, w: number, classification: string, todFraction: number | null, dotR?: number }>} */
		const allPoints = [];

		for (const t of filteredTracts) {
			const m = tractTodMetrics.get(t.gisjoin);
			if (!m) continue;
			const rawY = t[yKey];
			if (rawY == null) continue;
			const yVal = Number(rawY);
			const xVal = m.pctStockIncrease;
			if (!Number.isFinite(yVal)) continue;
			if (xVal == null || !Number.isFinite(xVal)) continue;

			const w = Math.max(Number(t[huKey]) || 0, 1);
			const cls = classifyTractDevelopment(m, sigThr, cut);
			allPoints.push({
				tract: t,
				x: xVal,
				y: yVal,
				w,
				classification: cls,
				todFraction: m.todFraction
			});
		}

		const minimalPts = allPoints.filter((p) => p.classification === 'minimal');
		const sigPts = allPoints.filter((p) => p.classification !== 'minimal');

		const pointsTodDom = sigPts.filter((p) => p.classification === 'tod_dominated');
		const pointsNonTodDom = sigPts.filter((p) => p.classification === 'nontod_dominated');

		const regTod = filterPointsTenSigmaMarginals(pointsTodDom);
		const regNonTod = filterPointsTenSigmaMarginals(pointsNonTodDom);
		const regAll = filterPointsTenSigmaMarginals([...pointsTodDom, ...pointsNonTodDom]);

		const wRegTod =
			regTod.length >= 2 ? computeWeightedRegression(regTod) : { slope: NaN, intercept: NaN, r2: 0 };
		const wRegNonTod =
			regNonTod.length >= 2
				? computeWeightedRegression(regNonTod)
				: { slope: NaN, intercept: NaN, r2: 0 };
		const wRegAll =
			regAll.length >= 2 ? computeWeightedRegression(regAll) : { slope: NaN, intercept: NaN, r2: 0 };

		if (allPoints.length === 0) {
			const pe = root.append('p').attr('class', 'scatter-empty');
			pe.text('No tracts with data for this combination (check filters).');
			return;
		}

		const { startY } = periodCensusBounds(tp);
		const yMeta = meta.yVariables?.find((v) => v.key === yBase);
		const yLabel = yMeta?.label ?? yBase;
		const huSrcLabel = panelState.huChangeSource === 'census' ? 'Census' : 'MassBuilds';
		const xLabel = `% housing stock increase (${huSrcLabel})`;

		const wAll = allPoints.map((d) => d.w);
		const wMin = d3.min(wAll) ?? 1;
		const wMax = d3.max(wAll) ?? 1;
		const rScale = d3
			.scaleSqrt()
			.domain(wMin === wMax ? [Math.max(wMin * 0.9, 1), wMax * 1.1 + 1] : [wMin, wMax])
			.range([2.5, 5.2]);
		for (const p of allPoints) p.dotR = rScale(p.w);

		let xDomain;
		let yDomain;
		if (domainOverride?.todIntensity?.xDomain) {
			xDomain = domainOverride.todIntensity.xDomain;
			yDomain = domainOverride.todIntensity.yDomain;
		} else if (panelState.trimOutliers && sigPts.length > 2) {
			const xVals = sigPts.map((d) => d.x);
			const yVals = sigPts.map((d) => d.y);
			const xMu = d3.mean(xVals);
			const yMu = d3.mean(yVals);
			const xSd = Math.sqrt(d3.variance(xVals) || 0);
			const ySd = Math.sqrt(d3.variance(yVals) || 0);
			const xIn = xSd > 0 ? xVals.filter((v) => v >= xMu - 10 * xSd && v <= xMu + 10 * xSd) : xVals;
			const yIn = ySd > 0 ? yVals.filter((v) => v >= yMu - 10 * ySd && v <= yMu + 10 * ySd) : yVals;
			xDomain = xIn.length > 0 ? d3.extent(xIn) : d3.extent(xVals);
			yDomain = yIn.length > 0 ? d3.extent(yIn) : d3.extent(yVals);
		} else {
			const extentFrom = allPoints.length > 0 ? allPoints : sigPts;
			xDomain = d3.extent(extentFrom, (d) => d.x);
			yDomain = d3.extent(extentFrom, (d) => d.y);
		}

		const xScale = d3
			.scaleLinear()
			.domain(xDomain[0] === undefined ? [0, 1] : xDomain)
			.nice()
			.range([0, innerWidth]);
		const yScale = d3
			.scaleLinear()
			.domain(yDomain[0] === undefined ? [0, 1] : yDomain)
			.nice()
			.range([innerHeight, 0]);

		const titleFull = `${yLabel} vs % housing growth (TOD analysis)`;
		const scatterTitleLines = splitChartTitle(titleFull, 44);
		const titleAnchorX = marginLeft + innerWidth / 2;
		const firstTitleBaseline = 20;
		/** Stacked fit-line legend (swatch + label + stats per row). */
		const regLegendRows = 3;
		const regLegendRowH = 28;
		const legendBlockH = 6 + regLegendRows * regLegendRowH + 4;
		const chartOffsetTop = firstTitleBaseline + scatterTitleLines.length * 16 + legendBlockH + 8;
		const width = marginLeft + innerWidth + LEGEND_COL_W + marginRight;
		/** Extra SVG height for size legend + minimal-dev swatch below x-axis label. */
		const height = chartOffsetTop + innerHeight + marginBottom + 44;

		const svg = root
			.append('svg')
			.attr('viewBox', `0 0 ${width} ${height}`)
			.attr('width', '100%')
			.attr('height', 'auto')
			.attr('preserveAspectRatio', 'xMidYMid meet')
			.style('display', 'block');

		const gradId = `tod-share-grad-${plotUid}`;
		const defs = svg.append('defs');
		const lg = defs
			.append('linearGradient')
			.attr('id', gradId)
			.attr('x1', '0%')
			.attr('y1', '100%')
			.attr('x2', '0%')
			.attr('y2', '0%');
		lg.append('stop').attr('offset', '0%').attr('stop-color', '#dc2626');
		lg.append('stop').attr('offset', `${Math.min(100, Math.max(0, cut * 100))}%`).attr('stop-color', '#ffffff');
		lg.append('stop').attr('offset', '100%').attr('stop-color', '#2563eb');

		const plotTitle = svg
			.append('text')
			.attr('x', titleAnchorX)
			.attr('y', firstTitleBaseline)
			.attr('text-anchor', 'middle')
			.attr('fill', 'var(--text)')
			.attr('font-size', '13px')
			.attr('font-weight', '600');
		scatterTitleLines.forEach((line, i) => {
			const ts = plotTitle.append('tspan').attr('x', titleAnchorX).text(line);
			if (i > 0) ts.attr('dy', '1.15em');
		});

		const regLegY0 = firstTitleBaseline + scatterTitleLines.length * 16 + 8;
		const slopeFmt = d3.format('.4f');
		const regLegend = svg.append('g').attr('class', 'tod-intensity-reg-legend').attr('pointer-events', 'none');

		/**
		 * @param {number} rowIdx
		 * @param {string} label
		 * @param {{ slope: number, intercept: number, r2?: number }} reg
		 * @param {string} stroke
		 * @param {string | null} dash
		 * @param {number} nPts
		 */
		function addRegLegendRow(rowIdx, label, reg, stroke, dash, nPts) {
			const g = regLegend
				.append('g')
				.attr('transform', `translate(${marginLeft}, ${regLegY0 + rowIdx * regLegendRowH})`);
			const ln = g
				.append('line')
				.attr('x1', 0)
				.attr('y1', 5)
				.attr('x2', 28)
				.attr('y2', 5)
				.attr('stroke', stroke)
				.attr('stroke-width', 2.4)
				.attr('stroke-linecap', 'round');
			if (dash) ln.attr('stroke-dasharray', dash);
			g.append('text')
				.attr('x', 34)
				.attr('y', 8)
				.attr('fill', 'var(--text)')
				.attr('font-size', '9px')
				.attr('font-weight', '600')
				.text(label);
			g.append('text')
				.attr('x', 34)
				.attr('y', 19)
				.attr('fill', 'var(--text-muted)')
				.attr('font-size', '7.5px')
				.text(
					`Slope ${Number.isFinite(reg.slope) ? slopeFmt(reg.slope) : '—'} · R² ${Number.isFinite(reg.r2) ? reg.r2.toFixed(3) : '—'} · n=${nPts}`
				);
		}

		addRegLegendRow(0, 'TOD-dominated tracts', wRegTod, LINE_TOD, null, pointsTodDom.length);
		addRegLegendRow(1, 'non-TOD-dominated (sig.)', wRegNonTod, LINE_NONTOD, null, pointsNonTodDom.length);
		addRegLegendRow(2, 'All significant tracts', wRegAll, LINE_ALL, '4 3', regAll.length);

		const chart = svg.append('g').attr('transform', `translate(${marginLeft},${chartOffsetTop})`);

		chart
			.append('g')
			.attr('transform', `translate(0,${innerHeight})`)
			.call(d3.axisBottom(xScale).ticks(8))
			.call((g) => g.selectAll('path,line').attr('stroke', 'var(--border)'))
			.call((g) => g.selectAll('text').attr('fill', 'var(--text-muted)'));

		chart
			.append('g')
			.call(d3.axisLeft(yScale).ticks(8))
			.call((g) => g.selectAll('path,line').attr('stroke', 'var(--border)'))
			.call((g) => g.selectAll('text').attr('fill', 'var(--text-muted)'));

		chart
			.append('text')
			.attr('x', innerWidth / 2)
			.attr('y', innerHeight + 42)
			.attr('text-anchor', 'middle')
			.attr('fill', 'var(--text-muted)')
			.attr('font-size', '12px')
			.text(xLabel);

		chart
			.append('text')
			.attr('transform', 'rotate(-90)')
			.attr('x', -innerHeight / 2)
			.attr('y', -44)
			.attr('text-anchor', 'middle')
			.attr('fill', 'var(--text-muted)')
			.attr('font-size', '12px')
			.text(yLabel);

		const [d0, d1] = xScale.domain();

		const regG = chart.append('g').attr('class', 'tod-intensity-reg').attr('pointer-events', 'none');

		/**
		 * @param {{ slope: number, intercept: number }} regResult
		 * @param {string} stroke
		 * @param {string | null} dash
		 */
		function drawRegLine(regResult, stroke, dash) {
			if (!Number.isFinite(regResult.slope) || !Number.isFinite(regResult.intercept)) return;
			const ln = regG
				.append('line')
				.attr('x1', xScale(d0))
				.attr('y1', yScale(regResult.slope * d0 + regResult.intercept))
				.attr('x2', xScale(d1))
				.attr('y2', yScale(regResult.slope * d1 + regResult.intercept))
				.attr('stroke', stroke)
				.attr('stroke-width', 2.5)
				.attr('stroke-linecap', 'round');
			if (dash) ln.attr('stroke-dasharray', dash);
		}

		drawRegLine(wRegAll, LINE_ALL, '4 3');
		drawRegLine(wRegNonTod, LINE_NONTOD, null);
		drawRegLine(wRegTod, LINE_TOD, null);

		const brush = d3
			.brush()
			.extent([
				[0, 0],
				[innerWidth, innerHeight]
			])
			.on('end', (event) => {
				if (!event.selection) return;
				const [[bx0, by0], [bx1, by1]] = event.selection;
				const xMin = Math.min(xScale.invert(bx0), xScale.invert(bx1));
				const xMax = Math.max(xScale.invert(bx0), xScale.invert(bx1));
				const yMin = Math.min(yScale.invert(by0), yScale.invert(by1));
				const yMax = Math.max(yScale.invert(by0), yScale.invert(by1));
				const next = new Set(panelState.selectedTracts);
				for (const d of allPoints) {
					if (d.x >= xMin && d.x <= xMax && d.y >= yMin && d.y <= yMax) {
						next.add(d.tract.gisjoin);
					}
				}
				panelState.selectedTracts = next;
				brushG.call(brush.move, null);
			});

		const brushG = chart.append('g').attr('class', 'scatter-brush').call(brush);
		brushG.selectAll('.selection').attr('stroke', 'var(--accent)').attr('fill', 'var(--accent)');
		brushG.select('.overlay').attr('cursor', 'crosshair');

		const fmt = d3.format('.2f');
		const huFmt = d3.format(',.0f');

		function bindDotInteractions(selection) {
			selection
				.style('cursor', 'pointer')
				.on('mouseenter', function (event, d) {
					panelState.setHovered(d.tract.gisjoin);
					const name =
						d.tract.county && String(d.tract.county) !== 'County Name'
							? String(d.tract.county)
							: d.tract.gisjoin;
					const lines = [
						{ bold: true, text: name },
						{ bold: false, text: `${xLabel}: ${fmt(d.x)}` },
						{ bold: false, text: `${yLabel}: ${fmt(d.y)}` },
						{ bold: false, text: `HU (${startY}): ${huFmt(d.w)}` },
						{
							bold: false,
							text: `Class: ${d.classification.replace(/_/g, ' ')}`
						}
					];
					if (d.todFraction != null && Number.isFinite(d.todFraction)) {
						lines.push({ bold: false, text: `TOD fraction: ${fmt(d.todFraction)}` });
					}
					tooltip = { visible: true, x: event.clientX, y: event.clientY, lines };
				})
				.on('mousemove', (event) => {
					tooltip = { ...tooltip, x: event.clientX, y: event.clientY };
				})
				.on('mouseleave', () => {
					panelState.setHovered(null);
					tooltip = { ...tooltip, visible: false };
				})
				.on('click', (event, d) => {
					event.stopPropagation();
					panelState.toggleTract(d.tract.gisjoin);
				});
		}

		// Minimal (grey) first
		chart
			.append('g')
			.attr('class', 'tod-intensity-minimal')
			.selectAll('circle')
			.data(minimalPts, (d) => d.tract.gisjoin)
			.join('circle')
			.attr('cx', (d) => xScale(d.x))
			.attr('cy', (d) => yScale(d.y))
			.attr('r', (d) => d.dotR ?? 3)
			.attr('fill', GREY_MINIMAL)
			.attr('opacity', 0.45)
			.attr('stroke', (d) => (selectedSet.has(d.tract.gisjoin) ? 'var(--cat-a)' : 'none'))
			.attr('stroke-width', 1.5)
			.call(bindDotInteractions);

		chart
			.append('g')
			.attr('class', 'tod-intensity-sig')
			.selectAll('circle')
			.data(sigPts, (d) => d.tract.gisjoin)
			.join('circle')
			.attr('cx', (d) => xScale(d.x))
			.attr('cy', (d) => yScale(d.y))
			.attr('r', (d) => d.dotR ?? 4)
			.attr('fill', (d) => colorDivergingTod(d.todFraction, cut))
			.attr('opacity', 0.88)
			.attr('stroke', (d) => (selectedSet.has(d.tract.gisjoin) ? 'var(--cat-a)' : '#475569'))
			.attr('stroke-width', (d) => (selectedSet.has(d.tract.gisjoin) ? 2 : 0.5))
			.call(bindDotInteractions);

		const cbW = 11;
		const cbG = svg
			.append('g')
			.attr('class', 'tod-intensity-colorbar')
			.attr('transform', `translate(${marginLeft + innerWidth + 12}, ${chartOffsetTop})`)
			.attr('pointer-events', 'none');

		cbG
			.append('text')
			.attr('x', 0)
			.attr('y', -4)
			.attr('fill', 'var(--text-muted)')
			.attr('font-size', '8px')
			.attr('font-weight', '600')
			.text('TOD share (colour)');

		cbG
			.append('rect')
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', cbW)
			.attr('height', innerHeight)
			.attr('rx', 2)
			.attr('fill', `url(#${gradId})`)
			.attr('stroke', 'var(--border)')
			.attr('stroke-width', 0.5);

		const fracAxis = d3.scaleLinear().domain([0, 1]).range([innerHeight, 0]);
		cbG
			.append('g')
			.attr('transform', `translate(${cbW + 4}, 0)`)
			.call(
				d3
					.axisRight(fracAxis)
					.ticks(5)
					.tickFormat(d3.format('.0%'))
			)
			.call((g) => g.selectAll('path,line').attr('stroke', 'var(--border)'))
			.call((g) => g.selectAll('text').attr('fill', 'var(--text-muted)').attr('font-size', '8px'));

		cbG
			.append('text')
			.attr('x', cbW + 42)
			.attr('y', (1 - cut) * innerHeight)
			.attr('dy', '0.35em')
			.attr('fill', 'var(--accent)')
			.attr('font-size', '7px')
			.text(`cut ${(cut * 100).toFixed(0)}%`);

		/* Below x-axis label (y = innerHeight + 42 in chart coords → +50 in SVG under plot). */
		const sizeY = chartOffsetTop + innerHeight + 50;
		const sizeG = svg.append('g').attr('class', 'tod-intensity-size-legend').attr('pointer-events', 'none');
		sizeG
			.append('text')
			.attr('x', marginLeft + innerWidth / 2)
			.attr('y', sizeY)
			.attr('text-anchor', 'middle')
			.attr('fill', 'var(--text-muted)')
			.attr('font-size', '8px')
			.text(`Dot size ∝ housing units (${startY})`);

		const wMid = (wMin + wMax) / 2;
		const sizeSamples = [{ w: wMin }, { w: wMid }, { w: wMax }];
		const sizeRowY = sizeY + 16;
		const span = Math.min(200, innerWidth - 40);
		const x0s = marginLeft + (innerWidth - span) / 2;
		sizeSamples.forEach((s, i) => {
			const cx = x0s + (i * span) / 2;
			const rr = rScale(s.w);
			sizeG
				.append('circle')
				.attr('cx', cx)
				.attr('cy', sizeRowY + rr)
				.attr('r', rr)
				.attr('fill', 'color-mix(in srgb, var(--bg-hover) 85%, var(--text-muted))')
				.attr('stroke', 'var(--border)')
				.attr('stroke-width', 0.6);
			sizeG
				.append('text')
				.attr('x', cx)
				.attr('y', sizeRowY + rr * 2 + 12)
				.attr('text-anchor', 'middle')
				.attr('fill', 'var(--text-muted)')
				.attr('font-size', '7px')
				.text(`${huFmt(s.w)}`);
		});

		sizeG
			.append('rect')
			.attr('x', marginLeft)
			.attr('y', sizeRowY - 6)
			.attr('width', 9)
			.attr('height', 9)
			.attr('rx', 2)
			.attr('fill', GREY_MINIMAL);
		sizeG
			.append('text')
			.attr('x', marginLeft + 14)
			.attr('y', sizeRowY + 1)
			.attr('fill', 'var(--text-muted)')
			.attr('font-size', '7.5px')
			.text('Minimal development (no fit)');
	});

	$effect(() => {
		void panelState.hoveredTract;
		void panelState.selectedTracts;
		if (!containerEl) return;
		const root = d3.select(containerEl);
		const hoveredId = panelState.hoveredTract;
		const selectedSet = panelState.selectedTracts;
		root.selectAll('.tod-intensity-minimal circle, .tod-intensity-sig circle').each(function () {
			const el = d3.select(this);
			const d = el.datum();
			const gj = d?.tract?.gisjoin;
			const h = gj && gj === hoveredId;
			const sel = gj && selectedSet.has(gj);
			el.attr('opacity', h ? 1 : d?.classification === 'minimal' ? 0.45 : 0.88);
			if (d?.classification === 'minimal') {
				el.attr('stroke', sel ? 'var(--cat-a)' : 'none').attr('stroke-width', sel ? 2 : 0);
			} else {
				el.attr('stroke', sel ? 'var(--cat-a)' : '#475569').attr('stroke-width', sel ? 2 : 0.5);
			}
		});
	});

	onDestroy(() => {
		if (containerEl) d3.select(containerEl).selectAll('*').remove();
	});
</script>

<div class="tod-intensity-wrap">
	<label class="trim-check">
		<input type="checkbox" bind:checked={panelState.trimOutliers} />
		<span>Trim axes (exclude &gt;10σ on significant tracts)</span>
	</label>
	<div bind:this={containerEl} class="tod-intensity-chart"></div>
	{#if tooltip.visible}
		<div
			class="scatter-tooltip"
			style:left="{tooltip.x + 12}px"
			style:top="{tooltip.y + 12}px"
			role="tooltip"
		>
			{#each tooltip.lines as L (L.text)}
				<div class:tooltip-bold={L.bold}>{L.text}</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.tod-intensity-wrap {
		position: relative;
		min-width: 0;
	}

	.tod-intensity-chart {
		min-height: 120px;
	}

	.trim-check {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.75rem;
		color: var(--text-muted);
		margin-bottom: 6px;
		cursor: pointer;
	}

	.trim-check input {
		accent-color: var(--accent);
	}

	:global(.scatter-empty) {
		font-size: 0.875rem;
		color: var(--text-muted);
		padding: 12px 0;
	}

	.scatter-tooltip {
		position: fixed;
		z-index: 50;
		pointer-events: none;
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 8px 10px;
		font-size: 0.75rem;
		box-shadow: var(--shadow);
		max-width: 280px;
	}

	.tooltip-bold {
		font-weight: 700;
		margin-bottom: 4px;
	}
</style>
