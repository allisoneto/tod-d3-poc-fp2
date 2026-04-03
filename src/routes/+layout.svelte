<script>
	import '../app.css';
	import NavBar from '$lib/components/NavBar.svelte';
	import { loadAllData } from '$lib/stores/data.svelte.js';
	import { page } from '$app/state';

	let { children } = $props();
	let error = $state(/** @type {string | null} */ (null));
	/** Tract/policy bundle successfully loaded at least once. */
	let tractDataReady = $state(false);

	function needsTractData(/** @type {string | null} */ routeId) {
		return routeId === '/tract' || routeId === '/policy';
	}

	$effect(() => {
		const id = page.route.id;
		if (!needsTractData(id)) return;
		if (tractDataReady) return;
		error = null;
		loadAllData()
			.then(() => {
				tractDataReady = true;
			})
			.catch((e) => {
				error = e instanceof Error ? e.message : String(e);
			});
	});
</script>

<div class="site-shell">
	<NavBar />

	<main>
	{#if needsTractData(page.route.id)}
		{#if error}
			<div class="error-screen">
				<h2>Failed to load data</h2>
				<p>{error}</p>
			</div>
		{:else if !tractDataReady}
			<div class="loading-screen">
				<div class="spinner"></div>
				<p>Loading dashboard data...</p>
			</div>
		{:else}
			<div class="main-page">
				{@render children()}
			</div>
		{/if}
	{:else}
		<div class="main-page">
			{@render children()}
		</div>
	{/if}
	</main>
</div>

<style>
	.site-shell {
		max-width: min(1280px, 100%);
		margin: 0 auto;
		width: 100%;
		/* Fill the viewport so main/.main-page get a bounded height and scroll inside .main-page (needed for sticky sidebars). */
		min-height: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	main {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		/* Must not be overflow:hidden — that breaks position:sticky for sidebar controls inside .main-page */
		overflow: visible;
	}
	.loading-screen, .error-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex: 1;
		min-height: 0;
		gap: 16px;
	}
	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--border);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
	.error-screen h2 { color: var(--danger); }

	/*
	 * Block layout (not flex): a flex child with min-height:auto would grow with POC content and
	 * move scrolling to the document, which breaks position:sticky on the controls sidebar.
	 */
	.main-page {
		flex: 1;
		min-height: 0;
		overflow-x: hidden;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}
</style>
