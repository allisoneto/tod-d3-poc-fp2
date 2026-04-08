<script>
	import { base } from '$app/paths';
	import { finalProjectPlan, projectPlanContingency } from '$lib/content/projectPlan.js';
</script>

<div class="writeup-root">
	<section class="writeup-hero card">
		<p class="writeup-eyebrow">Project Writeup</p>
		<h1>TOD, Housing Growth, and Affordability</h1>
		<p class="writeup-subtitle">
			This writeup explains the thinking behind the proof of concept: what we chose to show, how we structured the interaction,
			and how we plan to carry the project forward. It is meant to sit alongside the interactive page, not replace it.
		</p>
		<p class="writeup-linkback">
			<a href={`${base}/`}>Back to the interactive visualization</a>
		</p>
	</section>

	<section class="writeup-section card">
		<h2>Design Decisions</h2>
		<p>
			We designed this prototype to answer a layered question: <strong>where housing growth has occurred, how that growth
			relates to transit access, and where those patterns do not align</strong>. Because this involves multiple variables and
			comparisons, our main goal was to <strong>keep the story clear while adding complexity gradually</strong>. Instead of
			showing everything at once, we structured the visualization so each layer adds meaning without hiding what came before.
		</p>

		<h3>Establishing a clear base map</h3>
		<p>
			We began with a <strong>tract-level choropleth of housing growth</strong> as the base of the visualization. We chose
			percent housing growth as the main encoding because it gives one <strong>comparable measure across all tracts</strong>
			and helps the reader quickly see where change is stronger or weaker. We use a <strong>diverging red-blue scale</strong>
			so the midpoint reads as little change, one side shows weaker or negative growth, and the other shows stronger growth.
			That makes the first read of the map immediate, even before the reader interacts with it.
		</p>

		<h3>Keeping each visual channel focused</h3>
		<p>
			As we introduce transit access, mismatch patterns, and development projects, we intentionally <strong>do not overload the
			choropleth fill</strong>. Instead, we separate the encodings:
		</p>
		<ul class="writeup-list">
			<li><strong>Fill color</strong> shows housing growth.</li>
			<li><strong>Outline color</strong> shows TOD grouping.</li>
			<li><strong>Purple outlines</strong> show mismatch categories.</li>
			<li><strong>Point symbols</strong> show development projects.</li>
		</ul>
		<p>
			We made that choice so the layers can work together without fighting for attention. The result is a map that can hold
			several ideas at once while still staying readable.
		</p>

		<h3>Using MBTA colors as a visual anchor</h3>
		<p>
			The palette is grounded in <strong>MBTA colors</strong>, not chosen at random. Green, orange, red, blue, and purple all
			come from that transit visual language, which helps place the project clearly in the Greater Boston context. That gives the
			page a stronger connection to transit without needing to explain that link over and over again in the text.
		</p>
		<p>
			This choice also helps functionally. The TOD group outlines stay separate from the red-blue growth scale, and the mismatch
			layer can still stand out without feeling disconnected from the rest of the system. Tan and black are the only neutral
			exceptions, and we use those mostly for supporting or background roles.
		</p>

		<h3>Making mismatch feel like its own idea</h3>
		<p>
			We treated mismatch, where transit access and housing growth do not line up neatly, as one of the main insights of the page.
			To make that clear, we introduced a <strong>purple outline family</strong>. One mismatch type uses a solid purple stroke and the
			other uses a lighter dashed purple stroke. They look related, but still distinct. That matters because we want the reader to
			understand them as two versions of the same analytical idea, not as two unrelated layers.
		</p>

		<h3>Why we used scrollytelling</h3>
		<p>
			This map is doing more than one job, so showing every layer at once would make the first read overwhelming. We used a
			<strong>scrollytelling structure</strong> so the reader builds the picture step by step:
		</p>
		<ol class="writeup-list writeup-list--numbered">
			<li>housing growth as the baseline</li>
			<li>TOD-related tract groupings</li>
			<li>mismatch patterns</li>
			<li>development projects and added context</li>
		</ol>
		<p>
			We wanted each step to add <strong>one new concept</strong>. That keeps the story from becoming visually crowded too early
			and creates a more legible path from first impression to deeper interpretation.
		</p>

		<h3>Balancing story and exploration</h3>
		<p>
			We designed the interface to support both <strong>guided storytelling</strong> and <strong>reader-driven exploration</strong>.
			The walkthrough provides a clear narrative order, but the controls stay visible so readers can test what they are seeing for
			themselves. They can toggle layers, focus on one mismatch type, and select tracts directly on the map. That makes the interaction
			analytical rather than decorative.
		</p>

		<h3>Using linked views instead of crowding the map</h3>
		<p>
			Income context, tract summaries, and comparisons are important to the story, but putting all of that directly on the map would
			make the main view much harder to read. We therefore use a <strong>linked-view structure</strong>: the map provides the spatial
			overview, and the side panels and tooltips provide detail on demand. That follows an <strong>overview + detail</strong> pattern
			and lets us add depth without losing clarity.
		</p>

		<h3>Keeping typography simple</h3>
		<p>
			We intentionally used <strong>Helvetica and Inter</strong>. They are familiar, easy to read, and appropriate for a dense analytical
			layout. Helvetica also connects back to MBTA’s visual language, so the type quietly supports the same transit framing as the color
			system. We wanted hierarchy to come from spacing, weight, and layout rather than from decorative type choices.
		</p>

		<h3>What these choices are trying to do</h3>
		<p>
			Taken together, these choices aim to balance <strong>clarity, expressive encoding, and useful interaction</strong>. The choropleth
			gives the reader a stable base. Outlines and symbols add new context in different channels. The scroll structure controls how much
			appears at once. Our goal is to move the reader from seeing spatial patterns, to comparing tract groups, to thinking about what
			those patterns might mean for housing and transit policy.
		</p>
	</section>

	<section class="writeup-section card">
		<h2>Development Process Overview</h2>
		<p>
			Our process has been iterative rather than linear. We moved back and forth between narrative goals, map behavior, and layout
			decisions because each one affected the others. The most time-intensive work was not just building the map, but keeping the
			encodings, labels, interactions, and explanatory text aligned as the prototype changed.
		</p>
		<p>
			We spent a large share of our time on integration and revision: tightening the map story, simplifying the visible layers,
			reworking the sticky layout, fixing step transitions, and improving the relationship between the controls and the walkthrough.
			We also spent time deciding which supporting information belonged on the map, which belonged in linked panels, and which should
			live in a separate writeup like this one.
		</p>
		<p>
			One clear lesson from the process is that interaction and explanation need to be developed together. If the map changes but the
			text does not, the story quickly becomes confusing. In later stages, we would want a tighter review rhythm so that visual changes,
			narrative wording, and legends stay synchronized the whole time.
		</p>
	</section>

	<section class="writeup-section card">
		<h2>Final Project Plan</h2>
		<p>
			This plan lays out how we expect to move from the current proof of concept to the final project. It captures both the weekly
			pacing and the team split so the final deliverable is not just visually polished, but also methodologically and narratively coherent.
		</p>

		<div class="plan-grid">
			{#each finalProjectPlan as week (week.week)}
				<section class="plan-card">
					<h3>{week.week}</h3>
					<div class="plan-block">
						<h4>Overall goals</h4>
						<ul class="writeup-list">
							{#each week.overall as item}
								<li>{item}</li>
							{/each}
						</ul>
					</div>

					<div class="plan-people">
						{#each Object.entries(week.people) as [name, tasks]}
							<div class="plan-person">
								<h4>{name}</h4>
								<ul class="writeup-list">
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

		<section class="plan-note">
			<h3>If things go wrong</h3>
			<p>{projectPlanContingency}</p>
		</section>
	</section>
</div>

<style>
	.writeup-root {
		max-width: 980px;
		margin: 0 auto;
		padding: 32px 20px 72px;
		display: grid;
		gap: 24px;
		color: #1f2430;
	}

	.card {
		background: #fffdf8;
		border: 1px solid #d8d2c7;
		border-radius: 18px;
		box-shadow: 0 14px 34px rgba(31, 36, 48, 0.08);
	}

	.writeup-hero,
	.writeup-section {
		padding: 24px 26px;
	}

	.writeup-eyebrow {
		margin: 0 0 8px;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #00843d;
	}

	.writeup-hero h1,
	.writeup-section h2 {
		margin: 0 0 12px;
		font-family: Helvetica, Arial, sans-serif;
		color: #1f2430;
	}

	.writeup-hero h1 {
		font-size: clamp(2rem, 4vw, 3rem);
		line-height: 1.05;
	}

	.writeup-section h2 {
		font-size: 1.65rem;
	}

	.writeup-section h3 {
		margin: 28px 0 10px;
		font-size: 1.08rem;
		line-height: 1.3;
		color: #1f2430;
	}

	.writeup-section p,
	.writeup-subtitle,
	.writeup-linkback {
		margin: 0 0 14px;
		font-size: 1rem;
		line-height: 1.7;
		color: #454d5c;
	}

	.writeup-linkback a {
		color: #00843d;
		font-weight: 700;
		text-decoration: none;
	}

	.writeup-linkback a:hover {
		text-decoration: underline;
	}

	.writeup-list {
		margin: 0 0 14px;
		padding-left: 1.2rem;
		display: grid;
		gap: 8px;
		color: #454d5c;
		line-height: 1.6;
	}

	.writeup-list--numbered {
		padding-left: 1.4rem;
	}

	.writeup-section hr {
		border: 0;
		border-top: 1px solid #d8d2c7;
		margin: 22px 0;
	}

	.plan-grid {
		display: grid;
		gap: 16px;
		margin-top: 18px;
	}

	.plan-card {
		border: 1px solid #d8d2c7;
		border-radius: 14px;
		padding: 16px 18px;
		background: #f8f5ef;
	}

	.plan-card h3,
	.plan-card h4,
	.plan-note h3 {
		margin-top: 0;
	}

	.plan-block {
		margin-bottom: 14px;
	}

	.plan-people {
		display: grid;
		gap: 12px;
	}

	.plan-note {
		margin-top: 18px;
		padding-top: 18px;
		border-top: 1px solid #d8d2c7;
	}

	@media (max-width: 720px) {
		.writeup-root {
			padding: 20px 14px 56px;
		}

		.writeup-hero,
		.writeup-section {
			padding: 18px 16px;
		}
	}
</style>
