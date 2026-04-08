/**
 * Quartile-based “transit access vs housing growth” mismatch flags (tract level).
 */

import * as d3 from 'd3';
import { periodCensusBounds } from './periods.js';
import { LOW_INCOME_MEDIAN_THRESHOLD } from './incomeTract.js';

/**
 * @param {Array<object>} tractList
 * @param {Array<object>} nhgisRows — same universe as tractList (e.g. buildNhgisLikeRows)
 * @param {string} timePeriod
 * @returns {{
 *   highGrowthLowAccess: Set<string>,
 *   highAccessLowGrowth: Set<string>,
 *   flagsByGj: Map<string, {
 *     isHighGrowthLowAccess: boolean,
 *     isHighAccessLowGrowth: boolean,
 *     isLowIncome: boolean,
 *     medianHouseholdIncome: number | null,
 *     isLowIncomeHighAccessLowGrowth: boolean,
 *     isLowIncomeHighGrowthLowAccess: boolean
 *   }>
 * }}
 */
export function computeTodMismatchClusters(tractList, nhgisRows, timePeriod) {
	const byGj = new Map((nhgisRows ?? []).map((r) => [r.gisjoin, r]));
	const { endY } = periodCensusBounds(timePeriod);
	const incomeKey = `median_income_${endY}`;

	const accessVals = (tractList ?? []).map((t) => Number(t?.transit_stops)).filter(Number.isFinite);
	const growthVals = (nhgisRows ?? []).map((r) => Number(r?.census_hu_pct_change)).filter(Number.isFinite);

	if (!accessVals.length || !growthVals.length) {
		return { highGrowthLowAccess: new Set(), highAccessLowGrowth: new Set(), flagsByGj: new Map() };
	}

	const sortedAccess = [...accessVals].sort(d3.ascending);
	const sortedGrowth = [...growthVals].sort(d3.ascending);
	const accessLow = d3.quantile(sortedAccess, 0.25) ?? 0;
	const accessHigh = d3.quantile(sortedAccess, 0.75) ?? 0;
	const growthLow = d3.quantile(sortedGrowth, 0.25) ?? 0;
	const growthHigh = d3.quantile(sortedGrowth, 0.75) ?? 0;

	const highGrowthLowAccess = new Set();
	const highAccessLowGrowth = new Set();
	const flagsByGj = new Map();

	for (const t of tractList ?? []) {
		const id = t?.gisjoin;
		if (!id) continue;
		const row = byGj.get(id);
		const medInc = Number(t[incomeKey]);
		const isLowIncome = Number.isFinite(medInc) && medInc < LOW_INCOME_MEDIAN_THRESHOLD;
		const access = Number(t?.transit_stops);
		const growth = row ? Number(row.census_hu_pct_change) : NaN;

		let isHighGrowthLowAccess = false;
		let isHighAccessLowGrowth = false;
		if (Number.isFinite(access) && Number.isFinite(growth)) {
			isHighGrowthLowAccess = growth >= growthHigh && access <= accessLow;
			isHighAccessLowGrowth = access >= accessHigh && growth <= growthLow;
			if (isHighGrowthLowAccess) highGrowthLowAccess.add(id);
			if (isHighAccessLowGrowth) highAccessLowGrowth.add(id);
		}

		flagsByGj.set(id, {
			isHighGrowthLowAccess,
			isHighAccessLowGrowth,
			isLowIncome,
			medianHouseholdIncome: Number.isFinite(medInc) ? medInc : null,
			isLowIncomeHighAccessLowGrowth: isLowIncome && isHighAccessLowGrowth,
			isLowIncomeHighGrowthLowAccess: isLowIncome && isHighGrowthLowAccess
		});
	}

	return { highGrowthLowAccess, highAccessLowGrowth, flagsByGj };
}
