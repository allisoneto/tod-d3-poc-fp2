<script>
	import { base } from '$app/paths';
	import { finalProjectPlan, projectPlanContingency } from '$lib/content/projectPlan.js';
</script>

<div class="writeup-root">
	<section class="writeup-hero card">
		<p class="writeup-eyebrow">Project Writeup</p>
		<h1>TOD, Housing Growth, and Affordability</h1>
		<p class="writeup-subtitle">
			This writeup focuses on the big decisions behind the proof of concept: what story we wanted to tell, how we designed the
			interface to tell it, what still feels unfinished, and where we want to take the project next.
		</p>
		<p class="writeup-linkback">
			<a href={`${base}/`}>Back to the interactive visualization</a>
		</p>
	</section>

	<section class="writeup-section card">
		<h2>Design Decisions</h2>
		<h3>How we chose the visual encodings and interactions</h3>
		<p>
			We designed this proof of concept around one main question: <strong>where housing growth is happening, how that growth
			relates to transit access, and who is most affected when those patterns do not line up</strong>. Earlier versions behaved
			more like dashboards. They had a lot of analysis in them, but they asked the reader to do too much interpretive work on
			their own. The current version is more guided. We first explain the pattern, then walk through the map step by step, and
			only after that open up the full exploration view.
		</p>
		<p>
			We kept the data side fairly lightweight in the writeup because the important point is simple: the browser loads
			already-prepared tract data, tract geometry, MBTA stops and lines, and project-level MassBuilds records. We made that
			choice so the front end could stay focused on comparison, filtering, and storytelling rather than trying to do heavy
			spatial processing live in the browser.
		</p>
		<p>
			The visual encoding follows that same logic. We use a <strong>tract choropleth</strong> as the base because it gives one
			clear regional measure that can stay stable across the whole story. Blue means stronger housing growth, red means weaker
			or negative growth, and tan marks places where the growth measure is limited or less reliable. That gives the reader a
			spatial baseline before any other layer appears.
		</p>
		<p>
			From there, we separate other ideas into different channels instead of asking the fill color to do everything.
			<strong>Green and orange outlines</strong> show TOD-dominated versus non-TOD-dominated tracts. <strong>Purple outlines</strong>
			show mismatch. <strong>Project dots</strong> show individual developments. We made that choice because the project is
			already conceptually dense; once too many things compete for the same channel, the map becomes much harder to read.
		</p>
		<p>
			We also chose a <strong>martini-glass structure</strong> on purpose. The top of the page simplifies the argument into a
			few static views. The guided map then introduces one layer at a time: transit access, housing growth, mismatch, TOD
			grouping, project dots, and finally lower-income context. Only after that do we turn the reader loose in the full
			explorer. For policymakers and planners, we think that balance matters. They need a clear take-away, but they also want
			to inspect the evidence themselves.
		</p>
		<h3>Alternatives we considered</h3>
		<p>
			Color was chosen deliberately rather than just for decoration. We grounded the palette in MBTA colors so the project feels
			tied to the transit system it is analyzing. The core values are <strong>green</strong>
			<span class="writeup-color-chip" style="--chip:#00843D; --chip-ink:#ffffff;">#00843D</span>,
			<strong>orange</strong>
			<span class="writeup-color-chip" style="--chip:#ED8B00; --chip-ink:#1f2430;">#ED8B00</span>,
			<strong>red</strong>
			<span class="writeup-color-chip" style="--chip:#DA291C; --chip-ink:#ffffff;">#DA291C</span>,
			<strong>blue</strong>
			<span class="writeup-color-chip" style="--chip:#003DA5; --chip-ink:#ffffff;">#003DA5</span>, and the
			<strong>purple</strong> mismatch family
			<span class="writeup-color-chip" style="--chip:#8A78E0; --chip-ink:#ffffff;">#8A78E0</span> and
			<span class="writeup-color-chip" style="--chip:#C4B5F0; --chip-ink:#1f2430;">#C4B5F0</span>. Minimal-development tracts
			use a quieter gray
			<span class="writeup-color-chip" style="--chip:#94A3B8; --chip-ink:#1f2430;">#94A3B8</span>, and neutral tan fills like
			<span class="writeup-color-chip" style="--chip:#E7E0D5; --chip-ink:#1f2430;">#E7E0D5</span> help push supporting
			information into the background.
		</p>
		<p>
			We considered keeping the page as a more open dashboard, adding more permanent map callouts, and putting income directly
			into the base map. We moved away from all three. The dashboard version buried the argument. Heavy callouts cluttered the
			geography. An income choropleth competed too strongly with the housing-growth choropleth. The current design is not
			minimal, but it is much more readable.
		</p>
		<h3>How the design fits our intended audience</h3>
		<p>
			Our intended audience is policymakers and planners. That is why we put so much emphasis on readable regional comparison,
			clear step-by-step explanation, and the ability to inspect the evidence afterward. The guided story makes the main claim
			explicit, while the open explorer still leaves room for policy audiences to test specific municipalities, tracts, and
			developments themselves.
		</p>
		<h3>Critique and future improvements</h3>
		<p>
			What still does not work quite as well as we want is the sheer density of the system. Even in the improved version, there
			is still a lot happening once outlines, dots, selections, and tooltips start to accumulate. We also think the guided
			narrative is stronger than the open exploration section. If we had another milestone, we would spend time making the
			explorer feel more polished, simplifying the walkthrough even further, and deepening the demographic side of the story,
			especially around income and race.
		</p>
	</section>

	<section class="writeup-section card">
		<h2>Process and Team Reflection</h2>
		<h3>How the work was split</h3>
		<p>
			Our team split the work in a fairly collaborative way rather than in totally separate lanes. Allison and Krishna spent the
			most time on the interactive tract visualization itself: layout, scrollytelling flow, map behavior, selection logic,
			project examples, and repeated revisions to make the page feel less like a dashboard. Hanna focused more on the written
			argument, feedback synthesis, and making sure the story stayed coherent as the interface changed. Supriya focused more on
			the demographic framing and the broader question of who is affected by these patterns.
		</p>
		<h3>Time spent and what took the longest</h3>
		<p>
			Our estimate is roughly <strong>80–90 person-hours</strong> across the team. The biggest time sink was not any one chart
			or one map layer. It was revision: changing the structure, rewriting the walkthrough, debugging loading and deployment
			issues, fixing tooltips and sticky behavior, and repeatedly simplifying the project so the argument came through more
			clearly.
		</p>
		<h3>How we want to improve the process</h3>
		<p>
			The clearest lesson for us is that writing, interaction, and visual design all need to evolve together. Earlier on, we
			sometimes improved one piece faster than the others, which created moments where the code worked but the story was weak,
			or where the story was stronger but the interface still felt cluttered. For future milestones, we want to simplify
			earlier and review the narrative and interface together more often.
		</p>
	</section>

	<section class="writeup-section card">
		<h2>Plan</h2>
		<p>
			Our overall plan is to keep the current spatial mismatch story as the base and make the final project better at explaining
			<strong>who</strong> is affected by it. The two demographic lenses we most want to deepen are <strong>income</strong> and
			<strong>race</strong>. The current proof of concept already shows where transit access and housing growth do not line up.
			The next milestone is to connect that pattern more directly to neighborhood change and access to opportunity.
		</p>
		<div class="plan-grid">
			{#each finalProjectPlan as week (week.week)}
				<section class="plan-card">
					<h3>{week.week}</h3>
					<ul class="writeup-list">
						{#each week.overall as item}
							<li>{item}</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>

		<section class="plan-note">
			<h3>Contingency plan</h3>
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

	.writeup-color-chip {
		display: inline-block;
		margin: 0 0.15rem 0.15rem 0;
		padding: 0.14rem 0.46rem;
		border-radius: 999px;
		border: 1px solid rgba(31, 36, 48, 0.12);
		background: var(--chip, #fffdf8);
		color: var(--chip-ink, #1f2430);
		font-family: 'SFMono-Regular', ui-monospace, monospace;
		font-size: 0.9em;
		line-height: 1.25;
		white-space: nowrap;
	}

	.writeup-list {
		margin: 0 0 14px;
		padding-left: 1.2rem;
		display: grid;
		gap: 8px;
		color: #454d5c;
		line-height: 1.6;
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
	.plan-note h3 {
		margin-top: 0;
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
