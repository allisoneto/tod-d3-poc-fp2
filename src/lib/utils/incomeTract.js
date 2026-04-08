/**
 * Tract-level median household income helpers (ACS / decennial end-year fields).
 */

import { periodCensusBounds } from './periods.js';

/** Households below this median income are treated as “lower-income” for narrative / filters. */
export const LOW_INCOME_MEDIAN_THRESHOLD = 125000;

/**
 * @param {object} tract
 * @param {string} timePeriod
 * @returns {number | null}
 */
export function medianHouseholdIncomeAtPeriodEnd(tract, timePeriod) {
	const { endY } = periodCensusBounds(timePeriod);
	const v = Number(tract?.[`median_income_${endY}`]);
	return Number.isFinite(v) ? v : null;
}

/**
 * @param {object} tract
 * @param {string} timePeriod
 * @param {number} [cap]
 * @returns {boolean}
 */
export function tractIsLowIncome(tract, timePeriod, cap = LOW_INCOME_MEDIAN_THRESHOLD) {
	const v = medianHouseholdIncomeAtPeriodEnd(tract, timePeriod);
	return v != null && v < cap;
}
