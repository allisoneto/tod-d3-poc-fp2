import { base } from '$app/paths';

const MISSING_NEAREST_STOP =
	'developments.json must include a numeric nearest_stop_dist_m for every MassBuilds project. ' +
	'Run the data pipeline on your machine and copy outputs into static/data, e.g.: ' +
	'conda activate ./.conda && python scripts/process_data.py';

/**
 * Shared tract/policy dashboard data loaded on demand from ``static/data``
 * (served under ``{base}/data/`` for GitHub Pages).
 *
 * Notes
 * -----
 * **Phased loading:** ``loadAllData`` fetches ``meta.json`` + ``tracts.geojson`` first and assigns
 * them so the map shell and axis metadata can render before ``tract_data.json`` (largest parse)
 * and the MassBuilds/MBTA payloads finish. Home/POC deferred loads use the same function.
 *
 * **Production:** Prefer gzip/brotli for ``static/data/*.json`` (most hosts compress automatically).
 * Re-run ``scripts/process_data.py`` so outputs use compact JSON.
 *
 * Svelte does not allow reassigning exported ``$state`` bindings; ``loadAllData`` mutates
 * these values in place (arrays via ``length`` / ``push``, objects via key updates).
 */

export const tractData = $state([]);
export const tractGeo = $state({ type: 'FeatureCollection', features: [] });
export const developments = $state([]);
export const mbtaStops = $state([]);
export const mbtaLines = $state({ type: 'FeatureCollection', features: [] });
export const meta = $state({ yVariables: [], xVariables: [], controlAverages: {} });

/**
 * Replace enumerable own properties on ``target`` with those from ``source``.
 */
function replaceObjectProps(target, source) {
	for (const k of Object.keys(target)) {
		delete target[k];
	}
	Object.assign(target, source);
}

/**
 * Fail fast if the pipeline did not attach per-project nearest-stop distances.
 *
 * Parameters
 * ----------
 * devs : Array<object>
 *
 * Returns
 * -------
 * void
 */
function assertDevelopmentsHaveNearestStopDist(devs) {
	if (!Array.isArray(devs) || devs.length === 0) return;
	for (let i = 0; i < devs.length; i++) {
		const v = devs[i].nearest_stop_dist_m;
		if (v == null || !Number.isFinite(Number(v))) {
			throw new Error(MISSING_NEAREST_STOP);
		}
	}
}

/** @type {Promise<void> | null} */
let loadAllDataPromise = null;

/**
 * Yield so the main thread can paint / handle input before heavy ``JSON.parse`` work.
 *
 * Returns
 * -------
 * Promise<void>
 */
function yieldToMain() {
	return new Promise((resolve) => {
		if (typeof requestAnimationFrame !== 'undefined') {
			requestAnimationFrame(() => requestAnimationFrame(resolve));
		} else {
			setTimeout(resolve, 0);
		}
	});
}

/**
 * Fetch all dashboard JSON assets in two phases and assign module state.
 *
 * Phase 1 (fast): ``meta.json`` + ``tracts.geojson`` — map boundaries and selectors can render.
 * Phase 2 (heavy): ``tract_data.json``, ``developments.json``, MBTA layers — full dashboard.
 *
 * Notes
 * -----
 * Concurrent callers await the same in-flight promise. On failure, the guard is cleared so a later
 * call can retry (partial phase-1 state may remain until the next successful load).
 */
export async function loadAllData() {
	if (loadAllDataPromise) return loadAllDataPromise;
	loadAllDataPromise = (async () => {
		const p = (/** @type {string} */ path) => `${base}${path}`;

		/* ── Phase 1: metadata + tract boundaries (smaller; map can paint outlines early) ── */
		const [metaRes, tractGeoRes] = await Promise.all([
			fetch(p('/data/meta.json')),
			fetch(p('/data/tracts.geojson'))
		]);

		await yieldToMain();

		const metaJson = await metaRes.json();
		const tractGeoTxt = await tractGeoRes.text();
		await yieldToMain();
		const tractGeoJson = JSON.parse(tractGeoTxt);

		replaceObjectProps(meta, metaJson);
		replaceObjectProps(tractGeo, tractGeoJson);

		await yieldToMain();

		/* ── Phase 2: tract rows, developments, transit overlays ── */
		const [tractDataRes, devsRes, mbtaStopsRes, mbtaLinesRes] = await Promise.all([
			fetch(p('/data/tract_data.json')),
			fetch(p('/data/developments.json')),
			fetch(p('/data/mbta_stops.json')),
			fetch(p('/data/mbta_lines.geojson'))
		]);

		await yieldToMain();

		const [devsJson, mbtaStopsJson, mbtaLinesJson] = await Promise.all([
			devsRes.json(),
			mbtaStopsRes.json(),
			mbtaLinesRes.json()
		]);

		const tractDataTxt = await tractDataRes.text();
		await yieldToMain();
		const tractDataJson = JSON.parse(tractDataTxt);

		assertDevelopmentsHaveNearestStopDist(devsJson);

		tractData.length = 0;
		tractData.push(...tractDataJson);
		developments.length = 0;
		developments.push(...devsJson);
		mbtaStops.length = 0;
		mbtaStops.push(...mbtaStopsJson);
		replaceObjectProps(mbtaLines, mbtaLinesJson);
	})().catch((e) => {
		loadAllDataPromise = null;
		throw e;
	});
	return loadAllDataPromise;
}

/** Alias for clarity in tract-only code paths (same promise / dedupe as ``loadAllData``). */
export const loadTractDashboardData = loadAllData;
