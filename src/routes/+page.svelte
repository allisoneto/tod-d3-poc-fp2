<script>
	import { base } from '$app/paths';
	import { onDestroy } from 'svelte';
	import * as d3 from 'd3';
	import {
		loadMunicipalData,
		filterMunicipalProjects,
		buildMunicipalityRows,
		activeRows as getActiveRows
	} from '$lib/utils/municipalModel.js';
	import {
		renderMuniScatter,
		renderMuniChoropleth,
		renderMuniTimeline,
		renderMuniComposition,
		renderMuniRankedGrowth,
		renderMuniAffordabilityComposition,
		renderMuniGrowthCapture,
		computeMuniSummary
	} from '$lib/utils/municipalCharts.js';
	import { tractData, developments, tractGeo, meta, mbtaStops } from '$lib/stores/data.svelte.js';
	import { loadAllData } from '$lib/stores/data.svelte.js';
	import {
		DEFAULT_MAIN_POC_DEV_OPTS,
		DEFAULT_MAIN_POC_UNIVERSE,
		buildNhgisLikeRows,
		buildTractDevClassMap,
		buildTractPocRows,
		buildProjectRowsWithGisjoin,
		filterDevelopmentsByYearRange,
		filterTractsForMainPoc,
		uniqueCounties
	} from '$lib/utils/mainPocTractModel.js';
	import { drawMainPocTractCharts } from '$lib/utils/mainPocTractCharts.js';
	import { createPanelState } from '$lib/stores/panelState.svelte.js';
	import PocNhgisTractMap from '$lib/components/PocNhgisTractMap.svelte';
	import {
		filterTractsByTract,
		buildCohortDevelopmentSplit,
		cohortYMeansForYKey,
		getTodTracts,
		getNonTodTracts,
		aggregateDevsByTract,
		filterDevelopments,
		computeGroupMean,
		popWeightKey,
		yMetricDisplayKind,
		formatYMetricSummary
	} from '$lib/utils/derived.js';
	import { periodCensusBounds } from '$lib/utils/periods.js';
	import TodIntensityScatter from '$lib/components/TodIntensityScatter.svelte';

	const fmtInt = d3.format(',');
	const fmtPct1 = d3.format('.1%');
	const finalProjectPlan = [
		{
			week: 'Week 9: 3/30-4/3',
			overall: [
				'Polish one visualization',
				'Understand and justify design decisions',
				'Understand and learn from the development process'
			],
			people: {
				Allison: [
					'Make initial suggested edits to the current visualization',
					'Determine which demographic(s) are most illustrative of the main point',
					'Schedule and prepare for the office hours check-in'
				],
				Krishna: [
					'Make initial suggested edits to the current visualization',
					'Determine which demographic(s) are most illustrative of the main point',
					'Schedule and prepare for the office hours check-in'
				],
				Hanna: [
					'Parse and organize staff and classmate feedback',
					'Determine which demographic(s) are most illustrative of the main point',
					'Play around with and edit the revised visualization',
					'Schedule and prepare for the office hours check-in'
				],
				Supriya: [
					'Determine which demographic(s) are most illustrative of the main point',
					'Play around with and edit the revised visualization',
					'Schedule and prepare for the office hours check-in'
				]
			}
		},
		{
			week: 'Week 10: 4/6-4/10',
			overall: [
				'Finalize one visualization',
				'Start working on the minimal viable product',
				'Complete the office hours check-in'
			],
			people: {
				Allison: [
					'Implement changes in the edited visualization',
					'Complete the office hours check-in'
				],
				Krishna: [
					'Implement changes in the edited visualization',
					'Complete the office hours check-in'
				],
				Hanna: [
					'Finalize feedback for the initial edit of the visualization',
					'Implement changes in the edited visualization',
					'Complete the office hours check-in'
				],
				Supriya: [
					'Finalize feedback for the initial edit of the visualization',
					'Complete the office hours check-in'
				]
			}
		},
		{
			week: 'Week 11: 4/13-4/17',
			overall: [
				'Have satisfactory demos for the minimal viable product',
				'Have satisfactory progress on the presentation of the minimal viable product'
			],
			people: {
				Allison: [
					'Finalize visuals showing demographic changes',
					'Make adjustments to narrative around demographic changes'
				],
				Krishna: [
					'Work on the data visualization interpretation part of the presentation',
					'Refine interactive elements and features'
				],
				Hanna: [
					'Work on the introduction, motivation, and sources part of the presentation',
					'Collaboratively and individually make changes to demos'
				],
				Supriya: [
					'Work on the audience and main goals part of the presentation',
					'Collaboratively and individually make changes to demos'
				]
			}
		},
		{
			week: 'Week 12: 4/20-4/24',
			overall: [
				'Finish the minimal viable product',
				'Finalize and record the presentation',
				"Start exploration of other teams' projects and begin thinking about critique"
			],
			people: {
				Allison: [
					'Finalize the minimal viable product',
					'Record the presentation',
					"Start exploration of other teams' projects and begin thinking about critique"
				],
				Krishna: [
					'Finalize the minimal viable product',
					'Record the presentation',
					"Start exploration of other teams' projects and begin thinking about critique"
				],
				Hanna: [
					'Finalize the minimal viable product',
					'Record the presentation',
					"Start exploration of other teams' projects and begin thinking about critique"
				],
				Supriya: [
					'Finalize the minimal viable product',
					'Record the presentation',
					"Start exploration of other teams' projects and begin thinking about critique"
				]
			}
		},
		{
			week: 'Week 13: 4/27-5/1',
			overall: [
				'Finalize critique for other teams',
				'Keep looking over final products'
			],
			people: {
				Allison: ['Write critique for other teams', 'Keep looking over final products'],
				Krishna: ['Write critique for other teams', 'Keep looking over final products'],
				Hanna: ['Write critique for other teams', 'Keep looking over final products'],
				Supriya: ['Write critique for other teams', 'Keep looking over final products']
			}
		},
		{
			week: 'Week 14: 5/4-5/8',
			overall: [
				'Integrate provided feedback',
				'Mostly finalize the final project'
			],
			people: {
				Allison: ['Integrate changes from feedback and iterate'],
				Krishna: ['Integrate changes from feedback and iterate'],
				Hanna: ['Parse and organize feedback', 'Integrate changes from feedback and iterate'],
				Supriya: ['Integrate changes from feedback and iterate']
			}
		},
		{
			week: 'Week 15: 5/11',
			overall: ['Finish the final project'],
			people: {
				Allison: ['Final walkthrough evaluation of the project'],
				Krishna: ['Final walkthrough evaluation of the project'],
				Hanna: ['Final walkthrough evaluation of the project'],
				Supriya: ['Final walkthrough evaluation of the project']
			}
		}
	];
	const projectPlanContingency =
		"If things go wrong, the team will schedule an emergency meeting as soon as possible to get back on track, review any unmet goals without assigning blame, redistribute missed work that same week when needed, and adjust responsibilities so delays do not snowball.";
	let exploreSectionComponent = $state(null);
	let exploreSectionLoading = $state(false);

	async function loadExploreSection() {
		if (exploreSectionComponent || exploreSectionLoading) return;
		exploreSectionLoading = true;
		try {
			const mod = await import('$lib/components/ExploreTractSection.svelte');
			exploreSectionComponent = mod.default;
		} finally {
			exploreSectionLoading = false;
		}
	}

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

	const presets = [
		{ label: 'Boston / Cambridge / Somerville', munis: ['Boston', 'Cambridge', 'Somerville'] },
		{ label: 'Newton / Brookline / Wellesley', munis: ['Newton', 'Brookline', 'Wellesley'] },
		{ label: 'Quincy / Malden / Revere', munis: ['Quincy', 'Malden', 'Revere'] }
	];

	/* ── Play-years animation ─────────────────────────── */
	let playTimer = $state(/** @type {ReturnType<typeof setInterval> | null} */ (null));
	let playPending = $state(false);

	function stopPlayback() {
		if (playTimer) {
			clearInterval(playTimer);
			playTimer = null;
		}
	}

	function togglePlayback() {
		if (playTimer) {
			stopPlayback();
			return;
		}
		if (yearEnd >= 2026) yearEnd = yearStart;
		playTimer = setInterval(() => {
			if (yearEnd >= 2026) {
				stopPlayback();
				return;
			}
			yearEnd += 1;
		}, 700);
	}

	onDestroy(() => stopPlayback());

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

	const summary = $derived.by(() =>
		computeMuniSummary(visibleRows, muniActive, projectRows, muniState)
	);

	/* ── Element refs (municipal) ─────────────────────── */
	let elScatter = $state(/** @type {HTMLElement | undefined} */ (undefined));
	let elChoro = $state(/** @type {HTMLElement | undefined} */ (undefined));
	let elTimeline = $state(/** @type {HTMLElement | undefined} */ (undefined));
	let elComposition = $state(/** @type {HTMLElement | undefined} */ (undefined));
	let elRanked = $state(/** @type {HTMLElement | undefined} */ (undefined));
	let elAffordMix = $state(/** @type {HTMLElement | undefined} */ (undefined));
	let elGrowthCapture = $state(/** @type {HTMLElement | undefined} */ (undefined));

	function draw() {
		if (!muniData) return;
		const cb = { onSelectionChange: () => { selected = new Set(selected); } };
		if (elScatter) renderMuniScatter(elScatter, visibleRows, domainRows, muniState, cb);
		if (elChoro) renderMuniChoropleth(elChoro, visibleRows, domainRows, muniData.muniGeo, muniState, cb);
		if (elTimeline) renderMuniTimeline(elTimeline, projectRows, muniState);
		if (elComposition) renderMuniComposition(elComposition, projectRows, muniState);
		if (elRanked) renderMuniRankedGrowth(elRanked, visibleRows);
		if (elAffordMix) renderMuniAffordabilityComposition(elAffordMix, projectRows, muniState);
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
		void elChoro;
		void elTimeline;
		void elComposition;
		void elRanked;
		void elAffordMix;
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

	function resetMuniControls() {
		stopPlayback();
		yearStart = 1990;
		yearEnd = 2026;
		threshold = 0.5;
		growthScale = 'units';
		showTrendline = false;
		dominanceFilter = 'all';
		search = '';
		selected = new Set();
		mapMetric = 'units';
		if (muniData) zoning = new Set(muniData.zoningOptions);
	}

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

	// Shared TOD threshold from Part 1
	const tractPanelConfig = $derived({
		timePeriod: tractTimePeriod,
		minStops: DEFAULT_MAIN_POC_UNIVERSE.minStops,
		transitDistanceMi: threshold,
		sigDevMinPctStockIncrease: tractSigDevMin,
		todFractionCutoff: tractTodFractionCutoff,
		huChangeSource: 'massbuilds',
		minPopulation: DEFAULT_MAIN_POC_UNIVERSE.minPopulation,
		minPopDensity: DEFAULT_MAIN_POC_UNIVERSE.minPopDensity,
		minUnitsPerProject: DEFAULT_MAIN_POC_DEV_OPTS.minUnitsPerProject,
		minDevMultifamilyRatioPct: DEFAULT_MAIN_POC_DEV_OPTS.minDevMultifamilyRatioPct,
		minDevAffordableRatioPct: DEFAULT_MAIN_POC_DEV_OPTS.minDevAffordableRatioPct,
		includeRedevelopment: DEFAULT_MAIN_POC_DEV_OPTS.includeRedevelopment
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

	// Cohort dev split for affordability analysis
	const cohortDevSplit = $derived.by(() => {
		if (!tractData.length || !developments.length) return { tod: [], nonTod: [], minimal: [] };
		return buildCohortDevelopmentSplit(tractData, tractPanelConfig, developments);
	});

	const cohortRowsByY = $derived.by(() => {
		if (!meta.yVariables?.length) return [];
		const tp = tractTimePeriod;
		const weightKey = popWeightKey(tp);
		const rows = [];
		for (const v of meta.yVariables) {
			const yKey = `${v.key}_${tp}`;
			const raw = cohortYMeansForYKey(cohortDevSplit, yKey, weightKey);
			const kind = yMetricDisplayKind(v);
			rows.push({
				key: v.key,
				label: v.label ?? v.key,
				catLabel: v.catLabel ?? 'Outcomes',
				fmtTod: formatYMetricSummary(raw.meanTod, kind),
				fmtCtrl: formatYMetricSummary(raw.meanNonTod, kind),
				fmtMinimal: formatYMetricSummary(raw.meanMinimal, kind),
				rawTod: raw.meanTod,
				rawCtrl: raw.meanNonTod,
				rawMinimal: raw.meanMinimal,
				nTod: raw.nTod,
				nNonTod: raw.nNonTod,
				nMinimal: raw.nMinimal
			});
		}
		return rows;
	});

	// Income and education row references for inline numbers
	const incomeRow = $derived(cohortRowsByY.find((r) => r.key === 'median_income_change_pct'));
	const eduRow = $derived(cohortRowsByY.find((r) => r.key === 'bachelors_pct_change'));

	// Affordability split: among TOD tracts, high vs low affordable share
	const todRows = $derived.by(() => {
		if (!tractData.length || !developments.length) return [];
		return getTodTracts(tractData, tractPanelConfig, developments);
	});

	const nonTodRows = $derived.by(() => {
		if (!tractData.length || !developments.length) return [];
		return getNonTodTracts(tractData, tractPanelConfig, developments);
	});

	const affShareMap = $derived.by(() => {
		const tractMap = new Map();
		for (const t of tractData) if (t.gisjoin) tractMap.set(t.gisjoin, t);
		const filteredDevs = filterDevelopments(developments, tractPanelConfig);
		return aggregateDevsByTract(filteredDevs, tractMap, tractTimePeriod, tractPanelConfig);
	});

	/** High vs low affordable TOD tracts: ≥50% affordable share vs &lt;50% (not a median split). */
	const AFF_SPLIT_THRESHOLD = 0.5;

	const affSplitCohorts = $derived.by(() => {
		const tod = todRows;
		const todAff = tod.filter((t) => {
			const agg = affShareMap.get(t.gisjoin);
			return agg && Number.isFinite(agg.affordable_share);
		});
		const getAffShare = (t) => affShareMap.get(t.gisjoin)?.affordable_share ?? NaN;
		const hiAff = todAff.filter((t) => getAffShare(t) >= AFF_SPLIT_THRESHOLD);
		const loAff = todAff.filter((t) => getAffShare(t) < AFF_SPLIT_THRESHOLD);
		return { todAff, hiAff, loAff, affSplitThreshold: AFF_SPLIT_THRESHOLD };
	});

	const affSplitRowsByY = $derived.by(() => {
		if (!meta.yVariables?.length) return [];
		const { hiAff, loAff } = affSplitCohorts;
		if (!hiAff.length || !loAff.length) return [];
		const tp = tractTimePeriod;
		const weightKey = popWeightKey(tp);
		const rows = [];
		for (const v of meta.yVariables) {
			const yKey = `${v.key}_${tp}`;
			const meanHi = computeGroupMean(hiAff, yKey, weightKey);
			const meanLo = computeGroupMean(loAff, yKey, weightKey);
			const kind = yMetricDisplayKind(v);
			rows.push({
				key: v.key,
				label: v.label ?? v.key,
				catLabel: v.catLabel ?? 'Outcomes',
				fmtHi: formatYMetricSummary(meanHi, kind),
				fmtLo: formatYMetricSummary(meanLo, kind),
				rawHi: meanHi,
				rawLo: meanLo,
				nHi: hiAff.length,
				nLo: loAff.length
			});
		}
		return rows;
	});

	const affIncomeRow = $derived(affSplitRowsByY.find((r) => r.key === 'median_income_change_pct'));
	const affEduRow = $derived(affSplitRowsByY.find((r) => r.key === 'bachelors_pct_change'));

	function buildTakeawayScale(items) {
		const finite = items.filter((d) => Number.isFinite(d.value));
		if (!finite.length) return [];
		const min = d3.min(finite, (d) => d.value) ?? 0;
		const max = d3.max(finite, (d) => d.value) ?? 0;
		const span = max - min;
		const pad = span > 0 ? span * 0.12 : Math.max(Math.abs(max) * 0.15, 1);
		const lo = min - pad;
		const hi = max + pad;
		const scale = d3.scaleLinear().domain([lo, hi]).range([0, 100]);
		return finite.map((d) => ({ ...d, pct: scale(d.value) }));
	}

	function buildCohortTakeawayItems(row) {
		if (!row) return [];
		return buildTakeawayScale([
			{ key: 'tod', label: 'TOD', value: row.rawTod, fmt: row.fmtTod, tone: 'tod' },
			{ key: 'ctrl', label: 'non-TOD', value: row.rawCtrl, fmt: row.fmtCtrl, tone: 'ctrl' },
			{ key: 'minimal', label: 'minimal dev.', value: row.rawMinimal, fmt: row.fmtMinimal, tone: 'minimal' }
		]);
	}

	function buildAffordabilityTakeawayItems(row) {
		if (!row) return [];
		return buildTakeawayScale([
			{ key: 'hi-aff', label: 'High aff.', value: row.rawHi, fmt: row.fmtHi, tone: 'hi-aff' },
			{ key: 'lo-aff', label: 'Low aff.', value: row.rawLo, fmt: row.fmtLo, tone: 'lo-aff' }
		]);
	}

	function formatTakeawayDelta(value, key) {
		if (!Number.isFinite(value)) return '—';
		const kind = key === 'bachelors_pct_change' ? 'pp' : 'pct';
		const out = formatYMetricSummary(value, kind);
		return value > 0 ? `+${out}` : out;
	}

	/** Panel state for the TodIntensityScatter — shared config + a yVar override. */
	function makeTodScatterPanelState(yVar) {
		return {
			timePeriod: tractTimePeriod,
			yVar,
			transitDistanceMi: threshold,
			sigDevMinPctStockIncrease: tractSigDevMin,
			todFractionCutoff: tractTodFractionCutoff,
			huChangeSource: 'massbuilds',
			minPopulation: DEFAULT_MAIN_POC_UNIVERSE.minPopulation,
			minPopDensity: DEFAULT_MAIN_POC_UNIVERSE.minPopDensity,
			minStops: DEFAULT_MAIN_POC_UNIVERSE.minStops,
			minUnitsPerProject: DEFAULT_MAIN_POC_DEV_OPTS.minUnitsPerProject,
			minDevMultifamilyRatioPct: DEFAULT_MAIN_POC_DEV_OPTS.minDevMultifamilyRatioPct,
			minDevAffordableRatioPct: DEFAULT_MAIN_POC_DEV_OPTS.minDevAffordableRatioPct,
			includeRedevelopment: DEFAULT_MAIN_POC_DEV_OPTS.includeRedevelopment,
			trimOutliers: true,
			hoveredTract: null,
			selectedTracts: new Set(),
			/** @param {string | null} gisjoin */
			setHovered(gisjoin) {
				this.hoveredTract = gisjoin;
			},
			/** @param {string} gisjoin */
			toggleTract(gisjoin) {
				const next = new Set(this.selectedTracts);
				if (next.has(gisjoin)) next.delete(gisjoin);
				else next.add(gisjoin);
				this.selectedTracts = next;
			}
		};
	}

	/** $state so hover/selection updates rerun TodIntensityScatter effects (plain $derived objects are not deeply reactive). */
	let incomePanelState = $state(makeTodScatterPanelState('median_income_change_pct'));
	let eduPanelState = $state(makeTodScatterPanelState('bachelors_pct_change'));

	$effect(() => {
		void threshold;
		incomePanelState = makeTodScatterPanelState('median_income_change_pct');
		eduPanelState = makeTodScatterPanelState('bachelors_pct_change');
	});

	/* ── Tract chart element refs ─────────────────────── */
	let elTractEdu = $state(/** @type {HTMLElement | undefined} */ (undefined));
	let elTakeaway = $state(/** @type {HTMLElement | undefined} */ (undefined));

	$effect(() => {
		if (!tractReady || !tractData.length || !developments.length) return;
		const devOpts2 = tractDevOpts;
		const windowDevs = filterDevelopmentsByYearRange(developments, 1990, 2026, devOpts2);

		const pocRows = buildTractPocRows(tractListFiltered, windowDevs, threshold, 0, tractTimePeriod).filter(
			(d) => Number.isFinite(d.vulnerabilityPct)
		);
		const projRows = buildProjectRowsWithGisjoin(developments, 1990, 2026, threshold, devOpts2);

		drawMainPocTractCharts({
			elScatter: null,
			elChoro: null,
			elTimeline: null,
			elComposition: null,
			elRanked: null,
			elAffordMix: null,
			elGrowthCapture: null,
			elTractEdu,
			elMobility: null,
			elTakeaway,
			state: {
				yearStart: 1990,
				yearEnd: 2026,
				threshold,
				growthScale: 'units',
				showTrendline: false,
				dominanceFilter: 'all',
				search: '',
				selected: new Set(),
				mapMetric: 'units'
			},
			visibleRows: pocRows,
			domainRows: pocRows,
			projectRows: projRows,
			selectedProjectRows: projRows,
			nhgisLikeRows,
			tractGeo,
			timePeriod: tractTimePeriod
		});
	});
</script>

<div class="poc-root">
	<!-- Narrative + tract story up to "Explore" use a narrower column; Explore stays full poc-root width. -->
	<div class="poc-pre-explore">
	<!-- ═══════════════════════════════════════════════════════
	     HERO / THESIS
	     ═══════════════════════════════════════════════════════ -->
	<section class="hero-full card">
		<div class="eyebrow">Proof of Concept</div>
		<h1>TOD can expand access. Do lower-income residents benefit too?</h1>
		<p class="subtitle">
			Transit-oriented development (TOD) is often associated with housing growth, reduced car dependence, and denser neighborhoods with stronger access to jobs and services.
			At the same time, public debate asks whether these benefits are broadly shared, especially by lower-income residents, and whether TOD is associated with demographic
			changes that can indicate neighborhood pressure. This prototype examines tract- and municipality-level associations between TOD patterns and demographic change across Massachusetts.
		</p>
		<p class="subtitle">
			The results shown below are descriptive and correlational, not causal estimates. We use them as policy-relevant signals for how TOD and affordability appear together in practice.
		</p>
		<p class="hero-plan-note">
			A detailed plan for finishing the project is included at the end of this interactive visualization writeup:
			<a href="#final-project-plan">jump to the final project plan</a>.
		</p>
	</section>

	<section class="story card">
		<h2>How to read this story</h2>
		<ul class="story-list">
			<li><strong>Step 1 (municipal context):</strong> establish where TOD and non-TOD development are concentrated statewide.</li>
			<li><strong>Step 2 (tract comparison):</strong> compare TOD-dominated, non-TOD-dominated, and minimal-development tracts.</li>
			<li><strong>Step 3 (affordability split):</strong> compare TOD tracts with higher vs lower affordable-unit shares.</li>
			<li><strong>Interpretation rule:</strong> all findings are associations; no chart is interpreted as causal proof.</li>
		</ul>
	</section>

	{#if !muniLoaded}
		<div class="loading-status">
			<div class="spinner" aria-hidden="true"></div>
			<p>Loading municipal data…</p>
		</div>
	{:else}

	<!-- ═══════════════════════════════════════════════════════
	     PART 1 — MUNICIPAL DASHBOARD
	     ═══════════════════════════════════════════════════════ -->
	<section class="dashboard">
		<!-- <section class="controls-bar card">
			<div class="controls-header">
				<div>
					<h2>Municipal filters</h2>
					<p class="controls-note">Keep these lightweight unless you want to explore the supplemental charts in more detail.</p>
				</div>
				<button class="secondary controls-reset" type="button" onclick={resetMuniControls}>Reset filters</button>
			</div>

			<div class="controls-grid">
				<div class="control-field control-field--range">
					<label class="label">Completion year range</label>
					<div class="range-row">
						<input type="number" min="1990" max="2026" bind:value={yearStart} onchange={() => { stopPlayback(); if (yearStart > yearEnd) yearStart = yearEnd; }} />
						<input type="number" min="1990" max="2026" bind:value={yearEnd} onchange={() => { stopPlayback(); if (yearEnd < yearStart) yearEnd = yearStart; }} />
					</div>
				</div>

				<div class="control-field">
					<label class="label">TOD threshold: {threshold.toFixed(2)} miles</label>
					<input type="range" min="0.2" max="1.5" step="0.05" bind:value={threshold} />
				</div>

				<div class="control-field">
					<label class="label" for="poc-dom-filter">Show municipalities</label>
					<select id="poc-dom-filter" bind:value={dominanceFilter}>
						<option value="all">All municipalities</option>
						<option value="tod">TOD-dominant only</option>
						<option value="nonTod">Non-TOD-dominant only</option>
					</select>
				</div>
			</div>

			<details class="supplemental controls-advanced">
				<summary>Open advanced filters</summary>
				<div class="advanced-grid">
					<div class="control-block">
						<div class="play-row">
							<button class="secondary" type="button" onclick={togglePlayback}>
								{playTimer ? 'Pause' : 'Play years'}
							</button>
							<div class="play-slider-wrap">
								<input type="range" min="1990" max="2026" bind:value={yearEnd} oninput={() => stopPlayback()} />
								<div class="play-caption">Showing cumulative development from {yearStart} through {yearEnd}.</div>
							</div>
						</div>
					</div>

					<div class="control-block">
						<label class="label" for="poc-growth-scale">Growth scale</label>
						<select id="poc-growth-scale" bind:value={growthScale}>
							<option value="units">Raw units</option>
							<option value="share">Share of visible-window growth</option>
						</select>
					</div>

					<div class="control-block">
						<label class="check-item">
							<input type="checkbox" bind:checked={showTrendline} />
							<span>Show trendline on main scatter</span>
						</label>
					</div>

					<div class="control-block">
						<label class="label" for="poc-search">Municipality search</label>
						<input id="poc-search" type="search" placeholder="Search municipality..." bind:value={search} />
					</div>

					<div class="control-block">
						<label class="label">Zoning profile</label>
						<div class="check-grid">
							{#if muniData}
								{#each muniData.zoningOptions as z (z)}
									<label class="check-item">
										<input type="checkbox" checked={zoning.has(z)} onchange={() => {
											const next = new Set(zoning);
											if (next.has(z)) next.delete(z); else next.add(z);
											zoning = next;
										}} />
										<span>{z}</span>
									</label>
								{/each}
							{/if}
						</div>
					</div>

					<div class="control-block">
						<div class="button-row">
							<button class="secondary" type="button" onclick={() => { selected = new Set(); }}>Clear selection</button>
						</div>
					</div>

					<div class="control-block">
						<label class="label">Quick compare presets</label>
						<div class="preset-row">
							{#each presets as p}
								<button class="secondary" type="button" onclick={() => {
									selected = new Set(p.munis.filter((m) => muniData.allMunicipalities.includes(m)));
								}}>{p.label}</button>
							{/each}
						</div>
					</div>
				</div>
			</details>
		</section> -->

		<!-- ── Summary stats ─────────────────────────── -->
		<div class="content">
			<!-- <section class="summary card">
				<h2>Summary of Selected Data</h2>
				<p class="chart-note">
					From <strong>{yearStart}</strong> through <strong>{yearEnd}</strong>, the visible municipalities
					average <strong>{summary.avgIncome.toFixed(1)}%</strong> of households under $125k.
					<strong>{summary.todDominantCount}</strong> of the {summary.selectionCount} selected-or-visible
					municipalities are currently TOD-dominant by unit count.
				</p>
				<div class="summary-grid">
					<div class="summary-stat"><div class="k">Municipalities shown</div><div class="v">{fmtInt(summary.muniCount)}</div></div>
					<div class="summary-stat"><div class="k">Units in window</div><div class="v">{fmtInt(summary.totalUnits)}</div></div>
					<div class="summary-stat"><div class="k">Affordable share</div><div class="v">{fmtPct1(summary.affordableShare)}</div></div>
					<div class="summary-stat"><div class="k">TOD share of units</div><div class="v">{fmtPct1(summary.todShare)}</div></div>
				</div>
				<div class="selection-chips">
					{#if selected.size === 0}
						<span class="chip">All visible municipalities</span>
					{:else}
						{#each [...selected].sort() as name}
							<span class="chip">{name}</span>
						{/each}
					{/if}
				</div>
			</section> -->

			<section class="story card">
				<h2>What is the status of TOD in Massachusetts?</h2>
				<p>
					Despite policy efforts, most newly produced units in Massachusetts are still non-TOD units. At the same time, as overall development volume has increased,
					the total number of TOD units has also increased. This makes it useful to evaluate how TOD growth patterns are associated with affordability and demographic outcomes.
				</p>
				
				<details class="supplemental">
					<summary>Open supplemental chart: TOD vs non-TOD development mix by year</summary>
					<div class="small-grid supplemental-grid">
						<section class="chart-card card">
							<h3>TOD vs non-TOD mix by year</h3>
							<div class="chart-wrap small-chart" bind:this={elComposition}></div>
						</section>
					</div>
				</details>
			</section>

			
			
			<!-- ── 4. Most not affordable (single card: narrative + chart) ───────────────── -->
			<section class="card story-chart-panel story-chart-panel--stacked">
				<div class="story-chart-panel__grid">
					<div class="story-chart-panel__text">
						<h2>Who benefits from TOD?</h2>
						<p>
							For many residents, a primary concern with TOD is the gap between housing supply and genuine affordability.
							Although TOD projects often increase the total number of housing units, if these units are
							market-rate, they are often priced above much of the existing neighborhood stock.
							That pattern can be associated with reduced access for low-to-moderate income households and with stronger rent pressure for existing residents.
						</p>

						<p>
							Encouraging TOD projects that include affordable housing units can help mitigate this issue, but recent
							trends suggest affordability has not consistently kept pace with total production.
						</p>
					</div>
					<!-- <div class="story-chart-panel__chart">
						<h3>Most new housing is still market-rate</h3>
						<p class="chart-note">
							The affordable share of new development has decreased significantly in recent years,
							which likely indicates that lower-income residents are benefitting much less from this new development.
						</p>
						<div class="chart-wrap small-chart compact-side-chart" bind:this={elAffordMix}></div>
					</div> -->
				</div>
				<!-- <details class="supplemental">
					<summary>Development and affordability over time</summary>
					<div class="small-grid supplemental-grid">
						<section class="chart-card card">
							<h3>When production rises, affordability often lags</h3>
							<p class="chart-note">
								In recent years, despite increasing total production, the share of affordable newly-constructed units has decreased significantly.
							</p>
							<div class="chart-wrap small-chart" bind:this={elTimeline}></div>
						</section>
					</div>
				</details> -->
			</section>

			<!-- ── Higher-vulnerability areas (single card: narrative + chart) ─────────── -->
			<section class="card story-chart-panel story-chart-panel--stacked">
				<div class="story-chart-panel__grid">
					<div class="story-chart-panel__text">
						<h2>Where is development most concentrated?</h2>
						<p>
						    Although lower-income residents are the most at risk of displacement,
							municipalities with more lower income households (&lt; $125k/year) are often the ones seeing the most new development.
							This concentration pattern suggests that implementation details (especially affordability provisions) matter most in places already facing the highest pressure.
						</p>
					</div>
					<!-- <div class="story-chart-panel__chart">
						<h3>New development is often concentrated in higher-vulnerability municipalities</h3>
						<div class="chart-wrap small-chart compact-side-chart" bind:this={elGrowthCapture}></div>
					</div> -->
				</div>
				<!-- <section class="story card story-card--embedded">
					<h3>What zoning flexibility means here</h3>
					<p>
						When this dashboard refers to <strong>zoning flexibility</strong>, it means how easily local land-use rules allow
						multifamily housing or denser housing near transit. More flexible zoning generally means fewer barriers such as large
						minimum lot sizes, low height limits, or parking requirements that make it harder to build homes near stations.
					</p>
					<p>
						It is not the same thing as development itself, but it helps explain why some municipalities are structurally better positioned
						to absorb growth than others.
					</p>
				</section> -->
				<details class="supplemental">
					<summary>Open supplemental charts: income scatter, concentration ranking, and municipal map</summary>
					<section class="chart-card card supplemental-card">
						<h2>Lower-income municipalities see the most TOD</h2>
						<div class="chart-wrap" bind:this={elScatter}></div>
					</section>
					<div class="small-grid supplemental-grid">
						<section class="chart-card card">
							<h3>New development is concentrated in a small set of municipalities</h3>
							<div class="chart-wrap small-chart" bind:this={elRanked}></div>
						</section>
						<section class="chart-card card">
							<h3>The map below shows where vulnerability and growth overlap</h3>
							<div class="chart-toolbar">
								<label class="label" for="poc-map-metric" style="margin:0">Map metric</label>
								<select id="poc-map-metric" bind:value={mapMetric}>
									<option value="units">New units in current window</option>
									<option value="affordableUnits">Affordable units</option>
									<option value="under125">Households under $125k</option>
									<option value="high125">Households $125k+</option>
									<option value="affordableShare">Affordable share</option>
									<option value="todShare">TOD share of units</option>
								</select>
							</div>
							<div class="chart-wrap small-chart" bind:this={elChoro}></div>
						</section>
					</div>
				</details>
			</section>


			<!-- ── 5. Displacement explanation ──────────── -->
			<!-- <section class="story card">
				<h2>What metrics are useful for analyzing the impact of TOD?</h2>
				<p>
					This dashboard uses several <strong>proxy indicators</strong> that are often associated with
					gentrification pressure, including:
				</p>
				<ul class="story-list">
					<li>Sharp increases in median income, often used as a <strong>risk indicator for rising housing costs</strong></li>
					<li>Rapid increases in the percentage of residents with bachelor's degrees or higher</li>
					<li>Shift from owner-occupied housing to high-turnover rental units [analysis of this metric will be added soon]</li>
				</ul>
				<p>
					These measures do not necessarily establish that TOD causes gentrification, but they can be interpreted as
					warning signals that can help identify where neighborhood change may be happening
					alongside new development and transit access.
				</p>
			</section> -->

		</div>
	</section>

	<!-- ═══════════════════════════════════════════════════════
	     PART 2 — TRACT ANALYSIS
	     ═══════════════════════════════════════════════════════ -->
	<section class="tract-section">
		<section class="story card full-width">
			<h2>Where are TOD patterns most associated with neighborhood change?</h2>
			<p>
				This dashboard analyzes how TOD-dominated tracts are associated with different socioeconomic change patterns relative to comparable
				non-TOD or minimal-development tracts, and whether higher affordable-housing shares are associated with moderated shifts.
				These are not direct measures of displacement; they are tract-level comparisons using demographic proxies.
			</p>
			<h4>Data analysis methodology</h4>
			<p>
				Development, transit-oriented or otherwise, often results in demographic change. In order to
				isolate the influence of TOD from the influence of development generally, we analyze three groups
				of census tracts:
			</p>
			<ul class="story-list story-list--nested">
				<li>
					<strong>Minimal development tracts</strong> (less than 2% increase in housing stock): These are
					likely to show different demographic changes than high-development tracts and are filtered out of
					the main comparison.
				</li>
				<li>
					<strong>High-development tracts</strong>: Census tracts with at least 2% increase in housing
					stock. We divide these tracts into two groups to differentiate between the effects of TOD and
					non-TOD development:
					<ul>
						<li>
							<strong>TOD-dominated tracts</strong>: High-development tracts where TOD units make up at
							least 50% of new development.
						</li>
						<li>
							<strong>Non-TOD-dominated tracts</strong>: High-development tracts where TOD units make up
							less than 50% of new development.
						</li>
					</ul>
				</li>
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
			<!-- Tract cohort map -->
			<section class="chart-card card full-width">
				<h3>Transit access and new housing growth do not consistently align across Greater Boston tracts</h3>
				<p class="chart-note">
					Read this map in layers: tract color shows <strong>percent housing growth (2000–2020)</strong>, outlines show development cohort, and optional overlays add MBTA lines/stops and project points from the 
					<a href="https://www.massbuilds.com/map" target="_blank" rel="noopener noreferrer">MassBuilds dataset</a>.
				</p>
				<ul class="story-list chart-guide">
					<li><strong>Pay most attention to TOD-dominated tracts with stronger housing growth.</strong> Those are the places where transit-oriented development and neighborhood change appear together most clearly.</li>
					<li><strong>Compare TOD-dominated tracts to nearby non-TOD-dominated tracts.</strong> That helps separate “development near transit” from development that happened for other reasons.</li>
					<li><strong>Use minimal-development tracts as the baseline.</strong> They show what neighborhood change looks like in places without much recent building.</li>
				</ul>
				<div class="chart-wrap chart-tall chart-wrap--poc-map">
					<PocNhgisTractMap
						panelState={pocMapPanel}
						tractList={tractListFiltered}
						nhgisRows={nhgisLikeRows}
						metricsDevelopments={tractWindowDevs}
					/>
				</div>
			</section>

			<!-- Explanation of demographic metrics used moved here for FP2 proof of concept -->

			<section class="story card">
				<h2>Why these demographic proxies are used in this prototype</h2>
				<p>
					The completed version of this dashboard will use several <strong>proxy indicators</strong> that are often associated with
					gentrification pressure, including:
				</p>
				<ul class="story-list">
					<li>Sharp increases in median income, often used as a <strong>risk indicator for rising housing costs</strong></li>
					<li>Rapid increases in the percentage of residents with bachelor's degrees or higher</li>
					<li>Shift from owner-occupied housing to high-turnover rental units [analysis of this metric will be added soon]</li>
				</ul>
				
				<p>
					<strong>Caveats:</strong> These comparisons are descriptive and should not be read as causal estimates. Some differences may reflect
					broader urban form, pre-existing neighborhood trends, or regional labor-market dynamics rather than TOD alone. However, they can be interpreted as
                    warning signals that help identify where neighborhood change may be happening alongside new development and transit access.
				</p>

				<p>
					The full dashboard will include an analysis of median income and education changes compared between different tract categories,
					between different levels of development intensity, and between different levels of affordability.
				</p>
			</section>

			<section class="story card">
				<h2>Design decisions and visual encodings</h2>
				<p>
					This section documents why the interface looks and behaves the way it does. The goal is to make a multi-layer policy question readable
					without pretending it is simpler than it is—and to let readers inspect evidence directly. The same content is maintained as
					<code>DESIGN_DECISIONS.md</code> at the repository root for version control and code review.
				</p>

				<h3>1. Epistemic framing (what we do not claim)</h3>
				<p>
					Everything here is <strong>descriptive and associational</strong>. We show development, transit access, affordability signals, and census change
					in the same views so readers can form hypotheses about equity and planning. <strong>No chart is a causal estimate</strong> of TOD on
					outcomes; copy uses language like “associated with” and “patterns suggest” on purpose.
				</p>

				<h3>2. Two scales: municipality and census tract</h3>
				<p>
					<strong>Municipal views</strong> aggregate project data into comparable units—where growth is, how TOD-heavy it is, and how affordability mixes in.
					<strong>Tract views</strong> combine census housing-stock change (the choropleth), MassBuilds-derived development cohorts (outlines), and optional
					project dots. Municipal answers “where at the policy scale?”; tracts answer “where within the urban fabric, relative to transit?” Keeping both
					grains avoids forcing one resolution to do everything.
				</p>

				<h3>3. Tract choropleth: housing growth as the base layer</h3>
				<p>
					Fill encodes <strong>census percent change in housing units</strong> for the selected period on a <strong>diverging</strong> scale centered at zero:
					weaker or negative growth toward red, stronger growth toward blue. The scale re-normalizes to the maximum absolute change in the current tract
					sample so the legend stays interpretable when filters change. We encode <em>change</em>, not levels, and we keep the same mapping as new layers appear
					so the geographic story does not visually “jump” when outlines are added.
				</p>

				<h3>4. Development cohort outlines (MassBuilds-derived)</h3>
				<p>
					After the base map is established, <strong>tract category outlines</strong> introduce TOD-dominated, non-TOD-dominated, and minimal-development
					cohorts (green, orange, gray). These are interpretive overlays: <strong>fill still carries census growth</strong>; outlines carry where filtered new
					development sits relative to transit. Cohorts depend on filters and thresholds—they are stable enough for narrative use but should be read as
					model outputs, not a single statutory definition of TOD.
				</p>

				<h3>5. Access–growth “mismatch” layer</h3>
				<p>
					A separate layer highlights tracts where transit access and housing growth sit in tension under a <strong>quartile-based rule set</strong>.
					<strong>High access, low growth</strong> uses a solid violet stroke (heavier weight); <strong>high growth, low access</strong> uses a dashed
					lavender stroke. These are <strong>outline-only</strong> so we do not introduce a second choropleth that would compete with the growth fill.
				</p>

				<h3>6. Progressive disclosure and dual controls</h3>
				<p>
					<strong>Scroll-linked steps</strong> add layers in order: fill → cohort outlines → first mismatch type → both types → optional project dots.
					That limits simultaneous novelty and tracks the written narrative. Separately, <strong>mismatch outline modes</strong> (match scroll, off, all
					mismatch, or one type only) let readers override the scroll gate for teaching or exploration—for example, isolating one mismatch type or showing
					both before the scroll step that introduces the second. Default remains <strong>match scroll</strong> so the guided path stays the baseline.
				</p>

				<h3>7. Focus toggles: mismatch-only and lower-income emphasis</h3>
				<p>
					<strong>Show mismatch areas only</strong> pushes non-mismatch tracts to very low opacity so the mismatch layer stays legible when the map is busy.
					<strong>Show lower-income tracts</strong> is tied to a median household income threshold (for example &lt;$125k). Tracts at or above that threshold
					are not shown as “dimmed” blues—which was easy to confuse with weak growth on the diverging scale. Instead they receive a <strong>neutral fill</strong>
					so they read as out of focus, not as a false light-blue growth bin. Hovered and selected tracts temporarily show full choropleth color again for
					inspection. Neither toggle replaces a dedicated income map; they are emphasis layers on top of the growth story.
				</p>

				<h3>8. Sidebar-first narrative (no duplicate map callouts)</h3>
				<p>
					Floating on-map callout boxes once duplicated the <strong>Map walkthrough</strong> text in the sidebar. Those overlays were removed so a single
					narrative channel carries step copy and the map stays visually calmer. <strong>Hover tooltips</strong> with tract-level metrics remain for
					detail-on-demand.
				</p>

				<h3>9. Municipal supplemental charts and the draw lifecycle</h3>
				<p>
					Supplemental charts (for example TOD vs non-TOD mix by year, ranked municipalities) live in <code>&lt;details&gt;</code> blocks. Because container
					nodes mount in different orders, the dashboard draw pipeline only requires loaded data as a gate—not a single chart’s DOM node. Each chart
					renders only when its container ref exists, and the reactive effect subscribes to <strong>all</strong> chart refs so opening a section triggers a
					redraw when its container appears. That avoids empty cards when one chart was ready and another was not yet bound.
				</p>

				<h3>10. Color, typography, and channels</h3>
				<p>
					The palette uses <strong>MBTA-referential hues</strong> (green, orange, red, blue) so transit-related semantics feel grounded in Greater Boston.
					Categories are not carried by color alone: outline weight, dash pattern, and interaction state add redundant cues. Typography pairs
					Helvetica-family headings with Inter for body text. Linked charts emphasize <strong>position on common axes</strong>; color and size are secondary
					channels. Where it helps comparability, measures are normalized (percent change, shares) so patterns are less driven by raw tract size alone.
				</p>

				<h3>11. Trade-offs, limitations, and future work</h3>
				<p>
					These choices improve interpretability but are <strong>design-informed, not a claim of full WCAG certification</strong>. The mismatch definition is a
					transparent heuristic; income emphasis uses a single threshold for exploration. Usability testing with a broader audience, stronger keyboard
					coverage, and richer income analyses (for example full distributions) are natural next steps. Throughout, the limiting honesty is the same:
					<strong>describe patterns carefully; do not over-claim causality.</strong>
				</p>
			</section>

			<!-- <div class="story-chart-row story-chart-row--tract full-width">
				<section class="story card story-chart-text">
					<h2>Income analysis</h2>
					<p>
						We can get a sense of the socioeconomic distribution of people by looking at the median income
						of a neighborhood.
						{#if incomeRow}
							In census tracts dominated by TOD, the median income changes by
							<strong>{incomeRow.fmtTod}</strong>, while in non-TOD dominated tracts it changes by
							<strong>{incomeRow.fmtCtrl}</strong>, and in minimal development tracts by
							<strong>{incomeRow.fmtMinimal}</strong>.
						{/if}
						This is one proxy for neighborhood change and possible market pressure, though it should not be
						read as direct evidence that TOD itself caused these shifts.
					</p>
					<p>
						If TOD-dominated tracts show larger income increases, that is consistent with stronger
						socioeconomic sorting or housing-market pressure, though other urban factors may also contribute.
					</p>
				</section>

				<section class="chart-card card story-chart-plot">
					<h3>TOD intensity vs median income change</h3>
					<p class="chart-note">
						This plot shows that not only does TOD correspond to greater income jumps than non-TOD,
						but also that higher TOD intensity is associated with larger income changes within the observed tract sample.
						Each point is a tract; color = TOD share of new units; size = population.
					</p>
					<div class="scatter-container scatter-container--compact">
						<TodIntensityScatter panelState={incomePanelState} wideLayout />
					</div>
				</section>
			</div>

			<div class="story-chart-row story-chart-row--tract full-width">
				<section class="story card story-chart-text">
					<h2>Education analysis</h2>
					<p>
						Another indicator of socioeconomic change is the percentage of people who are college-educated.
						{#if eduRow}
							In TOD-dominated tracts, the bachelor's degree share changes by
							<strong>{eduRow.fmtTod}</strong>, compared to
							<strong>{eduRow.fmtCtrl}</strong> in non-TOD dominated tracts and
							<strong>{eduRow.fmtMinimal}</strong> in minimal development tracts.
						{/if}
						This is another proxy for neighborhood change. Because most adults do not gain bachelor's degrees
						rapidly within a decade, changes often reflect turnover, replacement, or selective in-migration.
					</p>
				</section>

				<section class="chart-card card story-chart-plot">
					<h3>TOD intensity vs bachelor's degree share change</h3>
					<p class="chart-note">
						The same pattern holds for education: tracts with more TOD see larger increases in the share
						of residents with bachelor's degrees or higher — a useful proxy for neighborhood change, but not direct causal proof of displacement.
					</p>
					<div class="scatter-container scatter-container--compact">
						<TodIntensityScatter panelState={eduPanelState} wideLayout />
					</div>
				</section>
			</div>

			<section class="chart-card card full-width">
				<h3>Income & education — TOD-dominated vs non-TOD vs minimal development</h3>
				<p class="chart-note">
					Population-weighted means (MassBuilds cohort tiers); bars compare TOD-dominated,
					non-TOD-dominated significant development, and minimal development tracts.
					TOD-dominated tracts see greater income and education increases than both non-TOD
					dominated and minimal development tracts.
				</p>
				<div class="chart-wrap chart-wrap--tract-edu" bind:this={elTractEdu}></div>
			</section>

			<section class="story card full-width">
				<h2>How affordability could help</h2>
				<p>
					Among TOD-dominated tracts, we compare those where <strong>at least half</strong> of new
					development is affordable (≥{(affSplitCohorts.affSplitThreshold * 100).toFixed(0)}% affordable share)
					to those where <strong>less than half</strong> is affordable.
					Comparing these two groups reveals whether affordability moderates
					the demographic changes associated with TOD.
				</p>
				{#if affIncomeRow && affEduRow}
					<p>
						In TOD tracts with a higher affordable share, median income changes by
						<strong>{affIncomeRow.fmtHi}</strong> (vs. <strong>{affIncomeRow.fmtLo}</strong> in
						low-affordable TOD tracts). For education, the bachelor's share changes by
						<strong>{affEduRow.fmtHi}</strong> vs. <strong>{affEduRow.fmtLo}</strong>.
						This suggests that TOD tracts with more affordability may experience smaller socioeconomic shifts
						on average, though the comparison is still descriptive rather than causal.
					</p>
				{/if}
			</section> -->

			<!-- <section class="summary card full-width">
				<h2>Bottom line</h2>
				<p class="chart-note">
					The tract-level evidence is organized around one takeaway:
					TOD looks more broadly inclusive when affordability grows with it.
				</p>

				<h3>TOD-dominated vs non-TOD-dominated</h3>
				{#if cohortRowsByY.length}
					<div class="takeaway-grid">
						{#each cohortRowsByY.filter((r) => r.key === 'median_income_change_pct' || r.key === 'bachelors_pct_change') as row (row.key)}
							<div class="takeaway-card">
								<div class="takeaway-label">{row.label}</div>
								<div class="takeaway-dumbbell" role="img" aria-label={`${row.label} for TOD, non-TOD, and minimal development tracts`}>
									<div class="takeaway-axis"></div>
									{#each buildCohortTakeawayItems(row) as item, i (item.key)}
										<div class="takeaway-dot-group {item.tone}" class:takeaway-dot-group--lower={i % 2 === 1} style={`left:${item.pct}%`}>
											<div class="takeaway-dot-label">{item.label}</div>
											<div class="takeaway-dot"></div>
											<div class="takeaway-dot-value">{item.fmt}</div>
										</div>
									{/each}
								</div>
								<div class="takeaway-meta">
									<div class="takeaway-statline">
										<span>TOD − non-TOD</span>
										<strong>{formatTakeawayDelta(row.rawTod - row.rawCtrl, row.key)}</strong>
									</div>
									<div class="takeaway-statline">
										<span>Minimal dev. reference</span>
										<strong>{row.fmtMinimal}</strong>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<h3 style="margin-top: 18px;">High-affordable vs low-affordable TOD tracts</h3>
				{#if affSplitRowsByY.length}
					<div class="takeaway-grid">
						{#each affSplitRowsByY.filter((r) => r.key === 'median_income_change_pct' || r.key === 'bachelors_pct_change') as row (row.key)}
							<div class="takeaway-card">
								<div class="takeaway-label">{row.label}</div>
								<div class="takeaway-dumbbell takeaway-dumbbell--compact" role="img" aria-label={`${row.label} for high- and low-affordability TOD tracts`}>
									<div class="takeaway-axis"></div>
									{#each buildAffordabilityTakeawayItems(row) as item, i (item.key)}
										<div class="takeaway-dot-group {item.tone}" class:takeaway-dot-group--lower={i % 2 === 1} style={`left:${item.pct}%`}>
											<div class="takeaway-dot-label">{item.label}</div>
											<div class="takeaway-dot"></div>
											<div class="takeaway-dot-value">{item.fmt}</div>
										</div>
									{/each}
								</div>
								<div class="takeaway-meta">
									<div class="takeaway-statline">
										<span>High aff. − low aff.</span>
										<strong>{formatTakeawayDelta(row.rawHi - row.rawLo, row.key)}</strong>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="chart-note">No affordable-share data available to compare.</p>
				{/if}

				<div class="chart-wrap" style="margin-top: 16px;" bind:this={elTakeaway}></div>
			</section>

			<section class="story card full-width conclusion">
				<h2>Conclusion</h2>
				<p>
					TOD is still a valuable planning strategy, but the patterns in census demographic data suggest that it should be paired
					with a larger share of affordable housing in order to share neighborhood benefits more broadly. 
				</p>
				<p>
					These findings should be interpreted cautiously: they show correlations in demographic and development patterns,
					not definitive causal effects. Still, they provide a practical reason to treat affordability requirements as a core
					part of TOD implementation rather than a separate policy add-on.
				</p>
				<p>
					As Massachusetts continues to encourage transit-oriented development, it is important to ensure that <strong>affordability</strong> is a core part of its policy framework.
				</p>
			</section> -->

			<section class="story card full-width plan-section" id="final-project-plan">
				<h2>Final Project Plan</h2>
				<p>
					This project plan is included as part of the interactive visualization writeup to document the team’s design rationale,
					development process, and week-by-week path to a finished final project.
				</p>

				<div class="plan-grid">
					{#each finalProjectPlan as week (week.week)}
						<section class="plan-card">
							<h3>{week.week}</h3>
							<div class="plan-block">
								<h4>Overall</h4>
								<ul class="story-list plan-list">
									{#each week.overall as item}
										<li>{item}</li>
									{/each}
								</ul>
							</div>

							<div class="plan-people">
								{#each Object.entries(week.people) as [name, tasks]}
									<div class="plan-person">
										<h4>{name}</h4>
										<ul class="story-list plan-list">
											{#each tasks as task}
												<li>{task}</li>
											{/each}
										</ul>
									</div>
								{/each}
							</div>
						</section>
					{/each}
				</div>

				<section class="plan-contingency">
					<h3>If things go wrong</h3>
					<p>{projectPlanContingency}</p>
				</section>

				<section class="plan-contingency">
					<h3>Development process, team split, and opportunities to improve</h3>
					<p>
						This proof-of-concept required approximately <strong>80–90 people-hours</strong> across the team. Work was split between
						visualization implementation and narrative/design framing so that interaction and interpretation could be developed in parallel.
					</p>
					<ul class="story-list plan-list">
						<li><strong>Krishna:</strong> iterative dashboard implementation, chart/map refinement, and testing of candidate visualization directions.</li>
						<li><strong>Allison:</strong> iterative dashboard implementation, chart/map refinement, and testing of candidate visualization directions.</li>
						<li><strong>Hanna:</strong> narrative structure, framing/implementing revisions, design-decision articulation, and team plan.</li>
						<li><strong>Supriya:</strong> narrative structure, framing/implementing revisions, and design-decision articulation.</li>
					</ul>
					<p>
						The most time-intensive work was integration: keeping map encodings, interaction logic, legends, and narrative text aligned while preserving non-causal claims.
						The next most time-intensive area was iterative layout polish, especially balancing explanatory panels with map readability.
					</p>
					<p>
						For future milestones, we plan to improve process quality by locking a tighter weekly integration cadence, defining “done” criteria for each interaction earlier,
						and running shorter but more frequent review checkpoints so narrative text and visual behavior remain synchronized throughout development.
					</p>
				</section>
			</section>
		{/if}
	</section>

	{/if}

	</div>

	<!-- {#if muniLoaded && !tractLoading && !tractError}
		<div class="explore-after-narrow">
			{#if exploreSectionComponent}
				<svelte:component this={exploreSectionComponent} />
			{:else}
				<section class="explore-gate card full-width" aria-labelledby="explore-gate-heading">
					<h2 id="explore-gate-heading">Interactive Explorer</h2>
					<p>
						The full tract explorer is heavier than the main narrative, so it now loads on demand to keep the page faster.
					</p>
					<button
						type="button"
						class="secondary"
						disabled={exploreSectionLoading}
						onclick={loadExploreSection}
					>
						{exploreSectionLoading ? 'Loading explorer…' : 'Load interactive explorer'}
					</button>
				</section>
			{/if}
		</div>
	{/if} -->
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
