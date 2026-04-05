<script>
	import '../app.css';
	import { base } from '$app/paths';
	import { loadAllData, tractData } from '$lib/stores/data.svelte.js';
	import { page } from '$app/state';

	let { children } = $props();
	let tractLoadError = $state(/** @type {string | null} */ (null));

	/**
	 * Strip ``paths.base`` (e.g. GitHub Pages ``/repo``) so ``/repo/tract`` matches ``/tract``.
	 * ``page.route.id`` can miss base-prefixed deployments; pathname is authoritative.
	 *
	 * Parameters
	 * ----------
	 * pathname : string
	 *
	 * Returns
	 * -------
	 * string
	 */
	function pathnameWithoutBase(pathname) {
		const b = base || '';
		if (!b) return pathname;
		const prefix = b.endsWith('/') ? b.slice(0, -1) : b;
		if (pathname === prefix || pathname === `${prefix}/`) return '/';
		if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
		return pathname;
	}

	const needsTractShell = $derived.by(() => {
		const p = pathnameWithoutBase(page.url.pathname);
		return p === '/tract' || p === '/policy';
	});

	const tractBundleLoading = $derived(
		needsTractShell && !tractLoadError && tractData.length === 0
	);

	$effect(() => {
		if (!needsTractShell) return;
		tractLoadError = null;
		loadAllData().catch((e) => {
			tractLoadError = e instanceof Error ? e.message : String(e);
		});
	});
</script>

{#if needsTractShell}
	<div class="tract-route-shell">
		{#if tractLoadError}
			<div class="tract-load-banner tract-load-banner--error" role="alert">
				<p>Failed to load dashboard data: {tractLoadError}</p>
			</div>
		{:else if tractBundleLoading}
			<div class="tract-load-banner tract-load-banner--loading" role="status" aria-live="polite">
				<p>Loading tract dashboard data…</p>
			</div>
		{/if}
		<div class="tract-route-body">
			{@render children()}
		</div>
	</div>
{:else}
	{@render children()}
{/if}

<style>
	.tract-route-shell {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		width: 100%;
		box-sizing: border-box;
	}

	.tract-route-body {
		flex: 1;
		min-height: 22rem;
		display: flex;
		flex-direction: column;
	}

	.tract-load-banner {
		padding: 10px 16px;
		font-size: 0.9rem;
		flex-shrink: 0;
	}

	.tract-load-banner--error {
		background: color-mix(in srgb, var(--danger) 12%, transparent);
		border-bottom: 1px solid color-mix(in srgb, var(--danger) 35%, transparent);
		color: var(--text);
	}

	.tract-load-banner--loading {
		background: color-mix(in srgb, var(--accent) 10%, var(--bg-card));
		border-bottom: 1px solid var(--border);
		color: var(--text-muted);
	}

	.tract-load-banner p {
		margin: 0;
	}
</style>
