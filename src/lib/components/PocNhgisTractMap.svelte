<script>
	import { onDestroy } from 'svelte';
	import * as d3 from 'd3';
	import {
		tractGeo,
		developments,
		mbtaStops,
		mbtaLines
	} from '$lib/stores/data.svelte.js';
	import {
		aggregateDevsByTract,
		aggregateTractTodMetrics,
		buildFilteredData,
		developmentAffordableUnitsCapped,
		developmentMultifamilyShare,
		developmentMbtaProximity,
		isDevelopmentTransitAccessible,
		tractStopsDensityForDisplay,
		transitDistanceMiToMetres,
		transitModeUiLabel
	} from '$lib/utils/derived.js';
	import { periodCensusBounds } from '$lib/utils/periods.js';

	/**
	 * Tract-dashboard–style map: census % housing change choropleth (2010–20), TOD-tier
	 * outlines, optional MassBuilds developments and MBTA overlays.
	 *
	 * Parameters
	 * ----------
	 * panelState : PanelState
	 *     Shared with ``FilterPanel`` / ``MapView`` (transit toggles, dev filters, zoom).
	 * tractList : Array<object>
	 *     Filtered census tract rows (same universe as ``nhgisRows``).
	 * nhgisRows : Array<object>
	 *     Rows from ``buildNhgisLikeRows`` including ``gisjoin``, ``devClass``, ``census_hu_change_10_20``.
	 * metricsDevelopments : Array<object> | null | undefined
	 *     Optional MassBuilds rows for TOD / stock tooltips — use the same window as ``buildTractDevClassMap``
	 *     (e.g. 1990–2026 on the main POC). When omitted, uses ``buildFilteredData`` (panel period only).
	 */
	let { panelState, tractList, nhgisRows, metricsDevelopments = null } = $props();

	let containerEl = $state(null);
	let tooltip = $state({ visible: false, x: 0, y: 0, lines: [] });

	const CHORO_LEGEND_COL_W = 52;
	const DEV_LEGEND_COL_W = 44;
	const mapUid = Math.random().toString(36).slice(2, 11);

	let mapCanvasLeft = 0;
	let mapW = 520;
	const mapH = 480;

	let svgRef = $state(null);
	let projectionRef = $state(null);
	let lastStructuralKey = $state('');

	/** @type {Map<string, object> | null} */
	let tractTodMetricsMap = $state(null);
	/** @type {Map<string, object> | null} */
	let devAggMap = $state(null);

	const structuralKey = $derived(
		JSON.stringify({
			n: tractList.length,
			gf: tractGeo?.features?.length ?? 0,
			ms: mbtaStops.length,
			showDev: panelState.showDevelopments
		})
	);

	const dataKey = $derived(
		JSON.stringify({
			tp: panelState.timePeriod,
			stops: panelState.minStopsPerSqMi,
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
			dn: developments.length,
			nr: nhgisRows?.length ?? 0,
			md: metricsDevelopments?.length ?? -1,
			showDev: panelState.showDevelopments
		})
	);

	function meetsTodMultifamilyFloor(d, ps) {
		const minPct = Math.min(100, Math.max(0, Number(ps.minDevMultifamilyRatioPct) || 0));
		if (minPct <= 0) return true;
		const s = developmentMultifamilyShare(d);
		return s != null && s >= minPct / 100;
	}

	function stopColor(stop) {
		if (stop.color) return stop.color;
		const m = stop.modes ?? [];
		if (m.includes('commuter_rail')) return '#a855f7';
		if (m.includes('rail')) return '#3b82f6';
		if (m.includes('bus')) return '#f97316';
		return '#888';
	}

	function stopRadius(stop) {
		const m = stop.modes ?? [];
		if (m.includes('rail') || m.includes('commuter_rail')) return 3;
		return 1.2;
	}

	function lineStrokeColor(routeColor) {
		if (routeColor == null || routeColor === '') return '#888';
		const s = String(routeColor).trim();
		return s.startsWith('#') ? s : `#${s}`;
	}

	function lineMode(routeType) {
		if (routeType === 0 || routeType === 1) return 'rail';
		if (routeType === 2) return 'commuter_rail';
		if (routeType === 3) return 'bus';
		return 'other';
	}

	function buildTractLookup() {
		const m = new Map();
		for (const t of tractList) {
			if (t.gisjoin && typeof t.gisjoin === 'string' && t.gisjoin.startsWith('G')) m.set(t.gisjoin, t);
		}
		return m;
	}

	function refreshMetrics() {
		if (!tractList.length) {
			tractTodMetricsMap = null;
			devAggMap = null;
			return;
		}
		const tractMap = new Map();
		for (const t of tractList) {
			if (t.gisjoin) tractMap.set(t.gisjoin, t);
		}
		const transitM = transitDistanceMiToMetres(panelState.transitDistanceMi ?? 0.5);
		const minMf = Math.min(1, Math.max(0, (Number(panelState.minDevMultifamilyRatioPct) || 0) / 100));
		const tractSet = new Set(tractList.map((t) => t.gisjoin).filter(Boolean));
		let devsForMetrics;
		if (metricsDevelopments && Array.isArray(metricsDevelopments)) {
			devsForMetrics = metricsDevelopments.filter((d) => tractSet.has(d.gisjoin));
		} else {
			devsForMetrics = buildFilteredData(tractList, developments, panelState).filteredDevs;
		}
		tractTodMetricsMap = aggregateTractTodMetrics(
			devsForMetrics,
			tractMap,
			tractList,
			panelState.timePeriod,
			transitM,
			panelState.huChangeSource ?? 'massbuilds',
			minMf
		);
		devAggMap = aggregateDevsByTract(devsForMetrics, tractMap, panelState.timePeriod, panelState);
	}

	function rebuildSVG() {
		if (!containerEl) return;
		const root = d3.select(containerEl);
		root.selectAll('*').remove();

		const features = tractGeo?.features ?? [];
		if (features.length === 0) {
			root.append('p').attr('class', 'map-empty').text('Loading map data…');
			return;
		}

		const cw = containerEl.clientWidth || 900;
		mapW = Math.max(400, Math.min(1100, cw - CHORO_LEGEND_COL_W - DEV_LEGEND_COL_W - 24));

		const showDevs = panelState.showDevelopments;
		mapCanvasLeft = showDevs ? DEV_LEGEND_COL_W : 0;
		const svgW = mapCanvasLeft + mapW + CHORO_LEGEND_COL_W;
		const svgH = mapH;

		const projection = d3
			.geoMercator()
			.fitExtent(
				[
					[mapCanvasLeft, 0],
					[mapCanvasLeft + mapW, mapH]
				],
				tractGeo
			);
		projectionRef = projection;
		const path = d3.geoPath(projection);

		const svg = root
			.append('svg')
			.attr('viewBox', `0 0 ${svgW} ${svgH}`)
			.attr('width', '100%')
			.attr('height', 'auto')
			.attr('preserveAspectRatio', 'xMidYMid meet')
			.style('display', 'block')
			.style('background', 'var(--bg, #0f1115)');
		svgRef = svg;

		const clipId = `poc-map-clip-${mapUid}`;
		svg.append('defs').append('clipPath').attr('id', clipId)
			.append('rect')
			.attr('x', mapCanvasLeft)
			.attr('y', 0)
			.attr('width', mapW)
			.attr('height', mapH);

		svg.append('g').attr('class', 'map-dev-legend-group');

		const mapRoot = svg.append('g').attr('class', 'map-root').attr('clip-path', `url(#${clipId})`);
		const zoomLayer = mapRoot.append('g').attr('class', 'map-zoom-layer');

		zoomLayer
			.append('g')
			.attr('class', 'tract-layer')
			.selectAll('path.tract-poly')
			.data(features, (d) => d.properties?.gisjoin)
			.join('path')
			.attr('class', 'tract-poly')
			.attr('vector-effect', 'non-scaling-stroke')
			.attr('d', path)
			.attr('fill', 'var(--bg-card)')
			.attr('stroke', 'var(--border)')
			.attr('stroke-width', 0.5)
			.style('cursor', 'pointer')
			.on('mouseenter', handleTractEnter)
			.on('mousemove', handleMouseMove)
			.on('mouseleave', handleTractLeave)
			.on('click', handleTractClick);

		zoomLayer
			.append('g')
			.attr('class', 'mbta-lines-layer')
			.selectAll('path.mbta-line')
			.data(mbtaLines?.features ?? [], (d, i) => d.properties?.route_id ?? i)
			.join('path')
			.attr('class', 'mbta-line')
			.attr('d', path)
			.attr('fill', 'none')
			.attr('stroke', (d) => lineStrokeColor(d.properties?.route_color))
			.attr('stroke-width', 1.5)
			.attr('stroke-opacity', 0.7)
			.attr('vector-effect', 'non-scaling-stroke')
			.style('cursor', 'pointer')
			.on('mouseenter', handleLineEnter)
			.on('mousemove', handleMouseMove)
			.on('mouseleave', handleOverlayLeave);

		const stopG = zoomLayer.append('g').attr('class', 'mbta-stops-layer');
		stopG
			.selectAll('circle.mbta-stop')
			.data(mbtaStops, (d) => d.id)
			.join('circle')
			.attr('class', 'mbta-stop')
			.attr('r', (d) => stopRadius(d))
			.attr('cx', (d) => projection([d.lon, d.lat])?.[0] ?? -9999)
			.attr('cy', (d) => projection([d.lon, d.lat])?.[1] ?? -9999)
			.attr('fill', (d) => stopColor(d))
			.attr('stroke', '#555')
			.attr('stroke-width', 0.3)
			.style('cursor', 'pointer')
			.on('mouseenter', handleStopEnter)
			.on('mousemove', handleMouseMove)
			.on('mouseleave', handleOverlayLeave);

		zoomLayer.append('g').attr('class', 'dev-dots-layer');

		const zoom = d3
			.zoom()
			.scaleExtent([1, 28])
			.on('zoom', (event) => {
				zoomLayer.attr('transform', event.transform);
				const k = event.transform.k;
				const invK = 1 / k;
				stopG.selectAll('circle.mbta-stop')
					.attr('r', (d) => stopRadius(d) * invK)
					.attr('stroke-width', 0.3 * invK);
				zoomLayer.select('.dev-dots-layer').selectAll('circle.dev-dot')
					.attr('r', function () {
						const d = d3.select(this).datum();
						return (d?.rBase ?? 2.5) * invK;
					})
					.attr('stroke-width', function () {
						const d = d3.select(this).datum();
						return (d?.strokeWBase ?? 0.3) * invK;
					});
			});

		svg.call(zoom).on('dblclick.zoom', null).style('touch-action', 'none');

		svg.append('g').attr('class', 'map-legend-group');
	}

	function updateChoropleth() {
		if (!containerEl || !svgRef) return;

		refreshMetrics();

		const rowByGj = new Map((nhgisRows ?? []).map((r) => [r.gisjoin, r]));
		const values = (nhgisRows ?? [])
			.map((r) => Number(r.census_hu_change_10_20))
			.filter(Number.isFinite);
		const maxAbs = Math.max(1, d3.max(values, (d) => Math.abs(d)) || 1);
		const color = d3.scaleLinear().domain([-maxAbs, 0, maxAbs]).range(['#ed8b00', '#fffdf8', '#003da5']);

		d3.select(containerEl)
			.selectAll('path.tract-poly')
			.attr('fill', (d) => {
				const id = d.properties?.gisjoin;
				const row = rowByGj.get(id);
				const v = row ? Number(row.census_hu_change_10_20) : NaN;
				return Number.isFinite(v) ? color(v) : '#e7e0d5';
			})
			.attr('stroke', (d) => {
				const id = d.properties?.gisjoin;
				const row = rowByGj.get(id);
				const dc = row?.devClass;
				if (dc === 'tod_dominated') return 'var(--accent, #0d9488)';
				if (dc === 'nontod_dominated') return 'var(--warning, #ea580c)';
				if (dc === 'minimal') return '#64748b';
				return 'rgba(60,64,67,0.22)';
			})
			.attr('stroke-width', (d) => {
				const id = d.properties?.gisjoin;
				const row = rowByGj.get(id);
				return row?.devClass ? 0.75 : 0.25;
			});

		const svg = svgRef;
		const legGroup = svg.select('.map-legend-group');
		legGroup.selectAll('*').remove();
		legGroup.attr('transform', `translate(${mapCanvasLeft + mapW + 8},0)`);

		const titleBlockH = 22;
		const yTitleTop = 4;
		const y0 = yTitleTop + titleBlockH;
		const legBarW = 14;
		const axisPad = 4;
		const legBarH = Math.max(140, mapH - y0 - 16);
		const fmtTick = (v) => {
			const n = Number(v);
			if (!Number.isFinite(n)) return '';
			const ax = Math.abs(n);
			if (ax >= 1000 || (ax > 0 && ax < 0.01)) return d3.format('.2~s')(n);
			return d3.format('.1f')(n);
		};

		const legendG = legGroup.append('g').attr('class', 'map-legend-inner');
		const gradId = `poc-choro-grad-${mapUid}`;
		svg.select('defs').selectAll(`#${gradId}`).remove();
		const grad = svg
			.select('defs')
			.append('linearGradient')
			.attr('id', gradId)
			.attr('x1', '0%')
			.attr('y1', '100%')
			.attr('x2', '0%')
			.attr('y2', '0%');

		legendG
			.append('text')
			.attr('x', 0)
			.attr('y', yTitleTop + 14)
			.attr('fill', 'var(--text-muted)')
			.attr('font-size', '11px')
			.attr('font-weight', 600)
			.text('Housing change');

		legendG
			.append('text')
			.attr('x', 0)
			.attr('y', yTitleTop + 28)
			.attr('fill', 'var(--text-muted)')
			.attr('font-size', '9px')
			.text('Census 2010→2020 (%)');

		const d0 = -maxAbs;
		const d1 = maxAbs;
		const nStops = 48;
		for (let i = 0; i <= nStops; i++) {
			const t = i / nStops;
			const v = d0 + t * (d1 - d0);
			grad.append('stop').attr('offset', `${t * 100}%`).attr('stop-color', color(v));
		}
		legendG
			.append('rect')
			.attr('x', 0)
			.attr('y', y0)
			.attr('width', legBarW)
			.attr('height', legBarH)
			.attr('rx', 3)
			.attr('fill', `url(#${gradId})`)
			.attr('stroke', 'var(--border)')
			.attr('stroke-width', 0.6);

		const yScale = d3.scaleLinear().domain([d0, d1]).range([y0 + legBarH, y0]);
		legendG
			.append('g')
			.attr('transform', `translate(${legBarW + axisPad},0)`)
			.call(d3.axisRight(yScale).ticks(5).tickFormat((v) => `${fmtTick(v)}%`))
			.call((g) => g.selectAll('path,line').attr('stroke', 'var(--border)'))
			.call((g) => g.selectAll('text').attr('fill', 'var(--text-muted)').attr('font-size', '9.5px'));

		containerEl.__pocChoroMaxAbs = maxAbs;
		containerEl.__pocRowByGj = rowByGj;
	}

	function updateDevelopments() {
		if (!containerEl || !svgRef || !projectionRef) return;

		const svg = svgRef;
		const devLeg = svg.select('.map-dev-legend-group');
		devLeg.selectAll('*').remove();

		const devLayer = d3.select(containerEl).select('.dev-dots-layer');
		devLayer.selectAll('*').remove();

		if (!panelState.showDevelopments) return;

		const { filteredDevs } = buildFilteredData(tractList, developments, panelState);
		const projection = projectionRef;

		const currentK = d3.zoomTransform(svgRef.node()).k;
		const invK = 1 / currentK;

		const transitM = transitDistanceMiToMetres(panelState.transitDistanceMi ?? 0.5);
		const huVals = filteredDevs.map((d) => Number(d.hu) || 0).filter((h) => h > 0);
		const huMin = huVals.length ? d3.min(huVals) : 1;
		const huMax = huVals.length ? d3.max(huVals) : 1;
		const lo = Math.max(1, huMin);
		const hi = Math.max(lo + 1e-6, huMax);
		const rScale = d3.scaleSqrt().domain([lo, hi]).range([1.4, 8]);

		const mfColor = d3.scaleSequential(d3.interpolateYlGnBu).domain([0, 1]);

		const y0mf = 22;
		const legBarHmf = Math.max(120, mapH - y0mf - 12);
		const legBarWmf = 12;
		const barLeft = 30;
		const gradMfId = `poc-dev-mf-grad-${mapUid}`;
		svg.select('defs').selectAll(`#${gradMfId}`).remove();
		const gradMf = svg.select('defs').append('linearGradient').attr('id', gradMfId)
			.attr('x1', '0%').attr('y1', '100%').attr('x2', '0%').attr('y2', '0%');
		for (let i = 0; i <= 48; i++) {
			const t = i / 48;
			gradMf.append('stop').attr('offset', `${t * 100}%`).attr('stop-color', d3.interpolateYlGnBu(t));
		}
		const mfLegG = devLeg.append('g').attr('class', 'map-dev-legend-inner').attr('transform', 'translate(2,0)');
		mfLegG
			.append('text')
			.attr('x', 0)
			.attr('y', 13)
			.attr('fill', 'var(--text-muted)')
			.attr('font-size', '10px')
			.attr('font-weight', 600)
			.text('MF share');
		mfLegG
			.append('text')
			.attr('x', 0)
			.attr('y', 26)
			.attr('fill', 'var(--text-muted)')
			.attr('font-size', '8px')
			.text('(dot fill)');
		mfLegG
			.append('rect')
			.attr('x', barLeft)
			.attr('y', y0mf)
			.attr('width', legBarWmf)
			.attr('height', legBarHmf)
			.attr('rx', 3)
			.attr('fill', `url(#${gradMfId})`)
			.attr('stroke', 'var(--border)')
			.attr('stroke-width', 0.6);
		const yMf = d3.scaleLinear().domain([0, 1]).range([y0mf + legBarHmf, y0mf]);
		mfLegG
			.append('g')
			.attr('transform', `translate(${barLeft},0)`)
			.call(d3.axisLeft(yMf).ticks(4).tickFormat(d3.format('.0%')))
			.call((g) => g.selectAll('path,line').attr('stroke', 'var(--border)'))
			.call((g) =>
				g.selectAll('text').attr('fill', 'var(--text-muted)').attr('font-size', '9px')
			);

		const glyphData = filteredDevs.map((d) => {
			const hu = Number(d.hu) || 0;
			const mf = developmentMultifamilyShare(d);
			const access =
				isDevelopmentTransitAccessible(d, transitM) && meetsTodMultifamilyFloor(d, panelState);
			const rBase = hu > 0 ? rScale(Math.max(lo, Math.min(hi, hu))) : rScale(lo);
			return {
				...d,
				mfShare: mf,
				rBase,
				strokeWBase: access ? 0.55 : 0.4,
				transitAccessible: access
			};
		});

		devLayer
			.selectAll('circle.dev-dot')
			.data(glyphData, (d, i) => `${d.gisjoin}-${d.lat}-${d.lon}-${i}`)
			.join('circle')
			.attr('class', 'dev-dot')
			.attr('cx', (d) => projection([d.lon, d.lat])?.[0] ?? -9999)
			.attr('cy', (d) => projection([d.lon, d.lat])?.[1] ?? -9999)
			.attr('r', (d) => d.rBase * invK)
			.attr('fill', (d) =>
				d.mfShare == null || !Number.isFinite(d.mfShare) ? '#475569' : mfColor(d.mfShare)
			)
			.attr('fill-opacity', 0.78)
			.attr('stroke', (d) => (d.transitAccessible ? '#ffffff' : 'rgba(15, 23, 42, 0.55)'))
			.attr('stroke-width', (d) => d.strokeWBase * invK)
			.style('cursor', 'pointer')
			.on('mouseenter', handleDevEnter)
			.on('mousemove', handleMouseMove)
			.on('mouseleave', handleOverlayLeave);
	}

	function updateOverlays() {
		if (!containerEl || !svgRef) return;

		const lineVis = {
			rail: panelState.showRailLines,
			commuter_rail: panelState.showCommuterRailLines,
			bus: panelState.showBusLines
		};
		const stopVis = {
			rail: panelState.showRailStops,
			commuter_rail: panelState.showCommuterRailStops,
			bus: panelState.showBusStops
		};

		d3.select(containerEl).selectAll('path.mbta-line')
			.attr('display', (d) => {
				const mode = lineMode(d.properties?.route_type);
				return lineVis[mode] ? null : 'none';
			});

		d3.select(containerEl).selectAll('circle.mbta-stop')
			.attr('display', (d) => {
				const modes = d.modes ?? [];
				const visible = modes.some((m) => stopVis[m]);
				return visible ? null : 'none';
			});
	}

	function updateSelection() {
		if (!containerEl) return;
		const hoveredId = panelState.hoveredTract;
		const selectedSet = panelState.selectedTracts;
		const rowByGj = containerEl.__pocRowByGj;
		d3.select(containerEl)
			.selectAll('path.tract-poly')
			.attr('stroke', (d) => {
				const id = d.properties?.gisjoin;
				if (id === hoveredId) return '#ffffff';
				if (selectedSet.has(id)) return 'var(--cat-a, #6366f1)';
				const row = rowByGj?.get(id);
				const dc = row?.devClass;
				if (dc === 'tod_dominated') return 'var(--accent, #0d9488)';
				if (dc === 'nontod_dominated') return 'var(--warning, #ea580c)';
				if (dc === 'minimal') return '#64748b';
				return 'rgba(60,64,67,0.22)';
			})
			.attr('stroke-width', (d) => {
				const id = d.properties?.gisjoin;
				if (id === hoveredId) return 1.6;
				if (selectedSet.has(id)) return 1.4;
				const row = rowByGj?.get(id);
				return row?.devClass ? 0.75 : 0.25;
			});
	}

	function handleTractEnter(event, d) {
		const id = d.properties?.gisjoin;
		panelState.setHovered(id);
		const el = containerEl;
		if (!el) return;
		const rowByGj = el.__pocRowByGj;
		const row = rowByGj?.get(id);
		const fmt = d3.format('.2f');
		const fmt1 = d3.format('.1f');
		const fmtInt = d3.format(',.0f');
		const tractLookup = buildTractLookup();
		const t = tractLookup.get(id);
		const county = t?.county;
		const title = county && String(county) !== 'County Name' ? String(county) : String(id);

		const lines = [{ bold: true, text: title }];

		const huPct = row ? Number(row.census_hu_change_10_20) : NaN;
		lines.push({
			bold: false,
			text: `Census housing change (2010–20): ${Number.isFinite(huPct) ? `${fmt1(huPct)}%` : '—'}`
		});

		const tier =
			row?.devClass === 'tod_dominated'
				? 'TOD-dominated tract'
				: row?.devClass === 'nontod_dominated'
					? 'Non-TOD-dominated (significant dev)'
					: row?.devClass === 'minimal'
						? 'Minimal development'
						: 'Unclassified';
		lines.push({ bold: false, text: `Cohort (MassBuilds rules): ${tier}` });

		if (t) {
			const tp = panelState.timePeriod;
			const { startY, endY } = periodCensusBounds(tp);

			const pop = t[`pop_${endY}`] ?? t.pop_2020;
			if (pop != null) lines.push({ bold: false, text: `Population (${endY}): ${fmtInt(pop)}` });

			const huS = t[`total_hu_${startY}`];
			const huE = t[`total_hu_${endY}`];
			if (huS != null) lines.push({ bold: false, text: `Housing units (${startY}): ${fmtInt(huS)}` });
			if (huE != null) lines.push({ bold: false, text: `Housing units (${endY}): ${fmtInt(huE)}` });
			if (huS != null && huE != null) {
				const diff = huE - huS;
				const sign = diff >= 0 ? '+' : '';
				lines.push({ bold: false, text: `Net HU change (census): ${sign}${fmtInt(diff)}` });
			}

			const m = tractTodMetricsMap?.get(id);
			if (m && Number.isFinite(m.totalNewUnits) && m.totalNewUnits > 0) {
				lines.push({
					bold: false,
					text: `New units (MassBuilds, same window as cohort outlines): ${fmtInt(m.totalNewUnits)}`
				});
			}
			if (m?.todFraction != null && Number.isFinite(m.todFraction)) {
				lines.push({
					bold: false,
					text: `TOD share of new dev units: ${fmt1(m.todFraction * 100)}%`
				});
			}
			if (m?.pctStockIncrease != null && Number.isFinite(m.pctStockIncrease)) {
				lines.push({
					bold: false,
					text: `Stock increase (MassBuilds / base HU): ${fmt1(m.pctStockIncrease)}%`
				});
			}

			const agg = devAggMap?.get(id);
			if (agg?.new_units) {
				lines.push({
					bold: false,
					text: `Filtered new units (sum): ${fmtInt(agg.new_units)}`
				});
			}

			const densityDisp = tractStopsDensityForDisplay(t);
			if (densityDisp !== null) {
				lines.push({ bold: false, text: `Transit stops / mi² (display): ${fmt(densityDisp)}` });
			}
			const stopsRaw = Number(t.transit_stops) || 0;
			lines.push({ bold: false, text: `Stops in tract buffer: ${stopsRaw}` });

			const medInc = t.median_income_change_pct_10_20;
			if (medInc != null && Number.isFinite(medInc)) {
				lines.push({ bold: false, text: `Median income change (2010–20): ${fmt1(medInc)}%` });
			}
		} else {
			lines.push({ bold: false, text: 'No tract attributes loaded for this polygon.' });
		}

		tooltip = { visible: true, x: event.clientX, y: event.clientY, lines };
	}

	function handleMouseMove(event) {
		tooltip = { ...tooltip, x: event.clientX, y: event.clientY };
	}

	function handleTractLeave() {
		panelState.setHovered(null);
		tooltip = { ...tooltip, visible: false };
	}

	function handleTractClick(event, d) {
		event.stopPropagation();
		const id = d.properties?.gisjoin;
		if (id) panelState.toggleTract(id);
	}

	function handleStopEnter(event, d) {
		const routes = d.routes?.join(', ') || 'Unknown';
		const modes = (d.modes ?? []).map((m) => transitModeUiLabel(m)).join(', ') || 'Unknown';
		tooltip = {
			visible: true,
			x: event.clientX,
			y: event.clientY,
			lines: [
				{ bold: true, text: d.name || 'MBTA Stop' },
				{ bold: false, text: `Routes: ${routes}` },
				{ bold: false, text: `Mode: ${modes}` }
			]
		};
	}

	function handleLineEnter(event, d) {
		const props = d.properties ?? {};
		const name = props.route_long_name || props.route_short_name || props.route_id || 'MBTA Route';
		tooltip = {
			visible: true,
			x: event.clientX,
			y: event.clientY,
			lines: [
				{ bold: true, text: name },
				{ bold: false, text: `Route: ${props.route_short_name || props.route_id || ''}` }
			]
		};
	}

	function handleDevEnter(event, d) {
		const fmtPct = d3.format('.1f');
		const lines = [{ bold: true, text: d.name || 'Development' }];
		lines.push({ bold: false, text: `${d.municipal}` });
		lines.push({ bold: false, text: `Units: ${d.hu}` });
		const mf = developmentMultifamilyShare(d);
		if (mf != null && Number.isFinite(mf)) {
			lines.push({ bold: false, text: `Multifamily (share): ${fmtPct(mf * 100)}%` });
		}
		const transitM = transitDistanceMiToMetres(panelState.transitDistanceMi ?? 0.5);
		const todMi = panelState.transitDistanceMi ?? 0.5;
		const prox = developmentMbtaProximity(d, mbtaStops, transitM);
		const access =
			isDevelopmentTransitAccessible(d, transitM) && meetsTodMultifamilyFloor(d, panelState);
		const nearestM = prox.nearestDistM;
		const nWithin = prox.stopsWithinRadius;
		if (nearestM != null && Number.isFinite(nearestM)) {
			lines.push({
				bold: false,
				text: `Nearest stop: ${nearestM.toFixed(0)} m${access ? ' (within TOD radius)' : ''}`
			});
		} else {
			lines.push({ bold: false, text: 'Nearest stop: —' });
		}
		lines.push({
			bold: false,
			text: `Stops within ${todMi} mi: ${nWithin}`
		});
		const affCap = developmentAffordableUnitsCapped(d);
		if (affCap > 0) {
			const src = d.affrd_source === 'lihtc' ? ' (HUD LIHTC)' : '';
			lines.push({ bold: false, text: `Affordable: ${affCap}${src}` });
		}
		lines.push({ bold: false, text: d.mixed_use ? 'Mixed-use' : 'Residential' });
		if (d.rdv) lines.push({ bold: false, text: 'Redevelopment' });
		tooltip = { visible: true, x: event.clientX, y: event.clientY, lines };
	}

	function handleOverlayLeave() {
		tooltip = { ...tooltip, visible: false };
	}

	const overlayKey = $derived(
		JSON.stringify({
			busL: panelState.showBusLines,
			railL: panelState.showRailLines,
			crL: panelState.showCommuterRailLines,
			busS: panelState.showBusStops,
			railS: panelState.showRailStops,
			crS: panelState.showCommuterRailStops
		})
	);

	$effect(() => {
		void structuralKey;
		void containerEl;
		if (!containerEl) return;
		if (structuralKey !== lastStructuralKey) {
			lastStructuralKey = structuralKey;
			rebuildSVG();
			updateChoropleth();
			updateDevelopments();
			updateOverlays();
			updateSelection();
		}
	});

	$effect(() => {
		void dataKey;
		if (!containerEl || !svgRef) return;
		updateChoropleth();
		updateDevelopments();
		updateSelection();
	});

	$effect(() => {
		void overlayKey;
		if (!containerEl || !svgRef) return;
		updateOverlays();
	});

	$effect(() => {
		void panelState.hoveredTract;
		void panelState.selectedTracts;
		void panelState.selectedTracts.size;
		if (!containerEl || !svgRef) return;
		updateSelection();
	});

	onDestroy(() => {
		if (containerEl) d3.select(containerEl).selectAll('*').remove();
		lastStructuralKey = '';
		svgRef = null;
		projectionRef = null;
	});
</script>

<div class="poc-nhgis-map">
	<fieldset class="poc-map-overlays section--map">
		<legend class="section-title">Map overlays</legend>
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
			<label class="overlay-toggle"
				><input type="checkbox" bind:checked={panelState.showCommuterRailLines} /></label
			>
			<label class="overlay-toggle"
				><input type="checkbox" bind:checked={panelState.showCommuterRailStops} /></label
			>
		</div>
		<div class="toggles toggles-follow">
			<label class="toggle-item show-devs">
				<input type="checkbox" bind:checked={panelState.showDevelopments} />
				<span>Show developments</span>
			</label>
		</div>
	</fieldset>

	<div class="poc-map-key card-key" role="region" aria-label="Map legend">
		<div class="poc-map-key-grid">
			<div>
				<h4 class="poc-map-key-title">Tract fill</h4>
				<p class="poc-map-key-line">
					<span class="poc-k-swatch poc-k-swatch--div"></span>
					Diverging scale: <strong>orange</strong> = larger decreases in housing stock (%), <strong>blue</strong>
					= larger increases (Census 2010–20).
				</p>
				<h4 class="poc-map-key-title">Tract outline (development cohort)</h4>
				<ul class="poc-map-key-list">
					<li><span class="poc-k-ring poc-k-ring--tod"></span> TOD-dominated (MassBuilds TOD share ≥ cutoff)</li>
					<li>
						<span class="poc-k-ring poc-k-ring--nontod"></span> Non-TOD-dominated, significant development
					</li>
					<li><span class="poc-k-ring poc-k-ring--min"></span> Minimal development</li>
				</ul>
			</div>
			<div>
				<h4 class="poc-map-key-title">Developments (when enabled)</h4>
				<p class="poc-map-key-line">
					<strong>Fill</strong> = multifamily share of units (see left colorbar on map). <strong>Size</strong> ≈
					unit count. <strong>Outline</strong>: white = transit-accessible at the TOD distance and MF floor;
					dark = not.
				</p>
			</div>
		</div>
	</div>

	<div class="map-wrap">
		<div class="map-root" bind:this={containerEl}></div>
		{#if tooltip.visible}
			<div
				class="map-tooltip"
				style:left="{tooltip.x + 12}px"
				style:top="{tooltip.y + 12}px"
			>
				{#each tooltip.lines as line, i (i)}
					<p class:tooltip-bold={line.bold}>{line.text}</p>
				{/each}
			</div>
		{/if}
	</div>
	<p class="poc-map-zoom-hint">Scroll or pinch to zoom · drag to pan · click tracts to select (optional)</p>
</div>

<style>
	.poc-nhgis-map {
		display: flex;
		flex-direction: column;
		gap: 10px;
		min-width: 0;
	}

	.poc-map-overlays {
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-card);
		padding: 6px 8px 8px;
		margin: 0;
	}

	.section-title {
		font-size: 0.65rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--accent);
		padding: 0 2px;
	}

	.overlay-grid {
		display: grid;
		grid-template-columns: auto 1fr 1fr;
		gap: 4px 8px;
		align-items: center;
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.overlay-header {
		min-height: 4px;
	}

	.overlay-col-label {
		text-align: center;
		font-weight: 600;
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.overlay-row-label {
		font-weight: 500;
		color: var(--text);
	}

	.overlay-toggle {
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
		min-height: 26px;
	}

	.overlay-toggle input {
		accent-color: var(--accent);
		margin: 0;
	}

	.toggles {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 14px;
		margin-top: 6px;
	}

	.toggle-item {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.75rem;
		color: var(--text-muted);
		cursor: pointer;
	}

	.toggle-item input {
		accent-color: var(--accent);
		margin: 0;
	}

	.show-devs {
		color: var(--accent);
		font-weight: 600;
	}

	.card-key {
		border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
		background: color-mix(in srgb, var(--accent) 6%, var(--bg-card));
		border-radius: var(--radius-sm);
		padding: 10px 12px;
	}

	.poc-map-key-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 12px;
	}

	@media (min-width: 720px) {
		.poc-map-key-grid {
			grid-template-columns: 1fr 1fr;
			gap: 16px;
		}
	}

	.poc-map-key-title {
		margin: 0 0 6px;
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--text);
	}

	.poc-map-key-line {
		margin: 0;
		font-size: 0.75rem;
		line-height: 1.45;
		color: var(--text-muted);
	}

	.poc-map-key-list {
		margin: 4px 0 0;
		padding-left: 0;
		list-style: none;
		font-size: 0.72rem;
		line-height: 1.5;
		color: var(--text-muted);
	}

	.poc-map-key-list li {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 4px;
	}

	.poc-k-swatch {
		display: inline-block;
		width: 28px;
		height: 10px;
		border-radius: 2px;
		vertical-align: middle;
		margin-right: 6px;
		border: 1px solid var(--border);
	}

	.poc-k-swatch--div {
		background: linear-gradient(90deg, #ed8b00, #fffdf8, #003da5);
	}

	.poc-k-ring {
		display: inline-block;
		width: 14px;
		height: 14px;
		border-radius: 999px;
		flex-shrink: 0;
		border: 2px solid var(--border);
		background: color-mix(in srgb, var(--bg-card) 88%, transparent);
	}

	.poc-k-ring--tod {
		border-color: var(--accent, #0d9488);
	}
	.poc-k-ring--nontod {
		border-color: var(--warning, #ea580c);
	}
	.poc-k-ring--min {
		border-color: #64748b;
	}

	.map-wrap {
		position: relative;
		width: 100%;
		background: transparent;
	}

	.map-root {
		width: 100%;
		max-width: 100%;
		min-height: 300px;
	}

	.map-tooltip {
		position: fixed;
		z-index: 20;
		max-width: 340px;
		padding: 10px 12px;
		font-size: 0.78rem;
		line-height: 1.4;
		color: var(--text);
		background: var(--bg-card);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		box-shadow: var(--shadow);
		pointer-events: none;
	}

	.map-tooltip p {
		margin: 0 0 4px;
	}

	.map-tooltip p:last-child {
		margin-bottom: 0;
	}

	:global(.tooltip-bold) {
		font-weight: 700;
		color: var(--text);
	}

	.poc-map-zoom-hint {
		margin: 0;
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	:global(.map-empty) {
		margin: 0;
		padding: 16px;
		font-size: 0.875rem;
		color: var(--text-muted);
	}
</style>
