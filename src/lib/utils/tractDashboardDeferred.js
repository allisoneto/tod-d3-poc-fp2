import { loadAllData } from '$lib/stores/data.svelte.js';

/**
 * @typedef {'idle' | 'loading' | 'ready' | 'error'} TractDashboardPhase
 */

/**
 * Build a loader for the heavy tract dashboard bundle (tract rows, tract GeoJSON,
 * developments, MBTA layers, metadata). ``loadAllData`` dedupes concurrent calls.
 *
 * Parameters
 * ----------
 * getPhase : () => TractDashboardPhase
 * setPhase : (p: TractDashboardPhase) => void
 * setError : (msg: string | null) => void
 *
 * Returns
 * -------
 * () => void
 *     Call when the tract section enters the viewport (IntersectionObserver) or from an explicit button.
 */
export function createBeginTractDashboardLoad(getPhase, setPhase, setError) {
	return function beginTractDashboardLoad() {
		const phase = getPhase();
		/* Allow retry from ``error`` without resetting to ``idle`` first. */
		if (phase === 'loading' || phase === 'ready') return;
		setPhase('loading');
		setError(null);
		loadAllData()
			.then(() => {
				setPhase('ready');
				setError(null);
			})
			.catch((e) => {
				setPhase('error');
				setError(e instanceof Error ? e.message : String(e));
			});
	};
}
