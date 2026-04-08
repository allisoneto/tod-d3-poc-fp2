<script>
	import { base } from '$app/paths';
	import { finalProjectPlan, projectPlanContingency } from '$lib/content/projectPlan.js';
</script>

<div class="writeup-root">
	<section class="writeup-hero card">
		<p class="writeup-eyebrow">Project Writeup</p>
		<h1>TOD, Housing Growth, and Affordability</h1>
		<p class="writeup-subtitle">
			This writeup explains how the proof of concept works from the data pipeline through the visual design. We organize it the
			way we would want to read it ourselves: first what data is being transformed, then what decisions those transformations
			force, then how those decisions appear in the interface.
		</p>
		<p class="writeup-linkback">
			<a href={`${base}/`}>Back to the interactive visualization</a>
		</p>
	</section>

	<section class="writeup-section card">
		<h2>Data Preprocessing and Data Decisions</h2>
		<p>
			The interactive page pulls together several preprocessed assets rather than computing everything directly in the browser.
			In the current code, the dashboard loads <strong>tract attributes</strong>, <strong>tract geometry</strong>,
			<strong>development records</strong>, <strong>MBTA stops</strong>, <strong>MBTA lines</strong>, and a small
			<strong>metadata file</strong>. Those arrive as <code>tract_data.json</code>, <code>tracts.geojson</code>,
			<code>developments.json</code>, <code>mbta_stops.json</code>, <code>mbta_lines.geojson</code>, and
			<code>meta.json</code>. We treat those files as the contract between the data pipeline and the front end: the map only
			works cleanly because the browser receives geometry, census-style tract variables, and MassBuilds-style project rows
			already aligned around tract IDs.
		</p>

		<h3>How we organize the tract-level data</h3>
		<p>
			On the tract side, we rely on a shared geographic key, <code>gisjoin</code>, to connect everything. The browser builds a
			canonical tract row for each geography with fields like census housing-unit change, census percent housing growth,
			median household income at the period end, income change, and tract class labels. That standardization matters because
			the same tract universe supports several different views at once: the choropleth, the selected-tract detail card, the
			cohort comparison chart, and the mismatch logic. We therefore chose to normalize tract fields into one consistent schema
			before visualization rather than letting each chart interpret raw columns differently.
		</p>

		<h3>How we process developments into tract metrics</h3>
		<p>
			The development file is used at two levels at once. At the project level, each MassBuilds record carries values like
			total units, affordable units, multifamily counts, completion year, tract ID, and nearest-stop distance in meters. At
			the tract level, the code aggregates those project rows into totals such as TOD units, non-TOD units, total new units,
			TOD share, and percent housing stock increase relative to the tract’s starting housing stock. That aggregation step is
			what makes the tract groupings possible. Without it, we would only have a cloud of project points, not a way to compare
			tracts as neighborhood-scale development environments.
		</p>
		<p>
			We also make several cleanup decisions during that step. Affordable units are capped at total units for each project so a
			source inconsistency cannot produce tract totals where affordable housing exceeds total housing. Multifamily share is
			calculated as small multifamily plus large multifamily divided by total units. Projects can also be filtered by period,
			minimum unit count, affordable share, multifamily share, and redevelopment status before they affect any tract-level
			metric. We made those choices so the charts and map are always driven by the same filtered project universe.
		</p>

		<h3>How we define TOD and non-TOD development</h3>
		<p>
			The code does not treat TOD as a vague label. It operationalizes it by looking at each project’s distance to the nearest
			MBTA stop and then splitting units into TOD and non-TOD buckets. A development is treated as transit-accessible only if
			its <code>nearest_stop_dist_m</code> value falls within the selected threshold. On top of that, if a project does not
			meet the minimum multifamily-share rule, it contributes no TOD units at all. In other words, proximity alone is not
			enough; the development also has to look like the kind of housing form the project is trying to study.
		</p>
		<p>
			That project-level split then rolls up into tract-level labels. In the current proof of concept, a tract is marked
			<strong>TOD-dominated</strong> when it clears the significant-development floor and at least half of its filtered new
			units are in TOD developments. A tract is marked <strong>non-TOD-dominated</strong> when it clears the same growth floor
			but stays below that TOD-share cutoff. Tracts below the development floor are treated as
			<strong>minimal development</strong>. We use those categories because they let us compare development patterns without
			reducing the whole map to a binary TOD versus non-TOD split.
		</p>

		<h3>How mismatch is computed</h3>
		<p>
			The mismatch layer is not hand-labeled. It is computed from the tract distribution itself. The code takes transit-stop
			counts and census housing-growth values, finds the 25th and 75th percentiles for each, and then flags two kinds of
			tracts: <strong>high access, low growth</strong> and <strong>high growth, low access</strong>. That makes the mismatch
			categories relative to the observed tract universe rather than absolute citywide thresholds. We chose this because the
			page is about spatial imbalance inside the selected sample, not about declaring one universal stop count or growth rate to
			be “enough.”
		</p>

		<h3>How income enters the analysis</h3>
		<p>
			Income is present, but it is not used as the base map. Instead, the code treats it as a contextual layer. A tract counts
			as lower-income when median household income at the end of the selected period is below
			<code>$125,000</code>. That threshold powers the lower-income focus toggle and also appears in the mismatch metadata. We
			made this a supporting layer rather than the main choropleth because the central story of the proof of concept is about
			the relationship between development, transit access, and housing growth. Income helps qualify that relationship, but it
			is not the main visual baseline.
		</p>

		<h3>What we deliberately preprocess instead of computing on the fly</h3>
		<p>
			Some values are lightweight enough to derive in the browser, but others are clearly better treated as prepared inputs. We
			require every development record to arrive with a numeric nearest-stop distance, and the code explicitly throws an error if
			that field is missing. That is a useful clue about the data design: spatial joins and nearest-transit calculations belong
			in the preprocessing pipeline, while filtering, aggregation, classification, and linked-view updates can happen
			interactively in the browser. We think that split is the right one for this project because it keeps the interface
			responsive without hiding the logic that matters most to interpretation.
		</p>
	</section>

	<section class="writeup-section card">
		<h2>Design Decisions</h2>
		<p>
			We designed this prototype to answer a layered question: <strong>where housing growth has occurred, how that growth
			relates to transit access, and where those patterns do not align</strong>. Because the page combines census change,
			project-level development, transit infrastructure, tract groupings, and selected-tract detail, our main design goal was
			to <strong>keep the reading path clear while adding complexity gradually</strong>. We did not want the viewer’s first
			experience to be a wall of overlapping encodings.
		</p>

		<h3>Why the choropleth is the base layer</h3>
		<p>
			We chose a <strong>tract-level choropleth of census housing growth</strong> as the visual foundation because it gives one
			clear, comparable measure across the full geography. Percent housing growth works better than raw unit change for this page
			because it lets small and large tracts share the same visual logic. A raw-count map would have tilted too much toward
			larger tracts with larger housing stocks. By starting with percent change, we make it easier to ask where growth has been
			relatively strong or weak before asking why.
		</p>
		<p>
			We also keep the growth fill stable as later layers appear. That was an important design decision. Once readers form a
			first impression of the map, we do not want the main color meaning to change when outlines or project dots are added. The
			base layer stays the same, and everything else is read against it.
		</p>

		<h3>Why we separate visual channels</h3>
		<p>
			As we add transit grouping, mismatch, and development projects, we intentionally avoid asking one visual channel to carry
			too many meanings. In the current interface, <strong>fill color shows housing growth</strong>, <strong>outline color shows
			tract grouping</strong>, <strong>purple outlines show mismatch</strong>, and <strong>dots show project locations</strong>.
			We made that split because it preserves legibility. If we had tried to encode growth, TOD grouping, and mismatch all
			through fill color, the map would have become much harder to read and the user would have spent more time decoding the
			legend than understanding the patterns.
		</p>

		<h3>Why the color system looks the way it does</h3>
		<p>
			The palette is grounded in <strong>MBTA colors</strong>, not chosen arbitrarily. Green, orange, blue, red, and purple all
			come from that broader transit visual language. We liked that for contextual reasons, because the whole project is about
			transit-oriented development in Greater Boston, but it also helped functionally. The TOD-related outlines can sit beside
			the red-blue growth scale without blending into it, and the purple mismatch layer reads as a distinct analytical signal
			while still feeling like part of the same system. Tan and black are the main neutral exceptions, and we use them mostly
			for background or low-emphasis elements.
		</p>

		<h3>Why mismatch gets its own purple family</h3>
		<p>
			We wanted mismatch to feel important without overwhelming the rest of the map, so we gave it its own
			<strong>purple outline family</strong>. One mismatch type uses a stronger solid stroke and the other uses a lighter dashed
			stroke. That creates a family resemblance between the two categories while still keeping them separable. Using outlines
			rather than another fill scheme was especially important here. A second choropleth would have competed with the base growth
			map and made the figure much harder to parse.
		</p>

		<h3>Why we used scrollytelling instead of showing everything at once</h3>
		<p>
			This map has to introduce several connected ideas, so we chose a <strong>scrollytelling structure</strong> to control the
			order in which those ideas appear. The progression is intentional:
		</p>
		<ol class="writeup-list writeup-list--numbered">
			<li>housing growth as the baseline</li>
			<li>orange and green tract outlines for development grouping</li>
			<li>purple mismatch outlines</li>
			<li>development dots over the grouped map</li>
		</ol>
		<p>
			We wanted each step to add <strong>one main new concept</strong>. That lowers cognitive load and gives the user a clearer
			sense of why a new layer is appearing. The walkthrough is therefore not just a presentation gimmick; it is part of the
			visual design strategy.
		</p>

		<h3>Why controls stay visible alongside the story</h3>
		<p>
			We wanted the page to support both a guided reading and open-ended inspection. That is why the controls remain visible even
			while the walkthrough advances. A reader can follow the story as written, but they can also focus on lower-income tracts,
			isolate one mismatch type, turn MBTA layers on and off, or click a tract to inspect it more closely. That balance matters
			for this topic. We are not only telling the reader what to think; we are also giving them ways to test what the map is
			showing.
		</p>

		<h3>Why detail lives off the map</h3>
		<p>
			Income context, tract summaries, and comparison metrics are all important, but putting them directly on the map would have
			made the figure much noisier. We therefore use a <strong>linked-view structure</strong>: the map gives the spatial
			overview, while the selection chart, cohort spotlight, and tract-detail card provide detail on demand. Hover and click
			interactions let readers inspect a tract without permanently cluttering the visual field. That follows an
			<strong>overview + detail</strong> pattern and is one of the main reasons the interface can carry this much information
			without collapsing.
		</p>

		<h3>Why the typography stays simple</h3>
		<p>
			We intentionally use <strong>Helvetica and Inter</strong>. They are standard, readable, and well-suited to a dense
			analytical layout. Helvetica also connects back to the MBTA’s visual language, so the type supports the transit framing in
			a quiet way without becoming part of the argument itself. We wanted hierarchy to come from layout, spacing, weight, and
			color, not from decorative typography.
		</p>

		<h3>What all of these choices are trying to accomplish</h3>
		<p>
			Taken together, these design decisions aim to balance <strong>expressiveness, clarity, and interaction</strong>. The
			choropleth gives the page a stable foundation. Outlines and points add context without replacing that foundation. The
			scrollytelling sequence controls when new complexity appears. The linked views carry detail without overloading the map.
			Our goal is to move the reader from seeing patterns, to comparing tract types, to thinking more carefully about how growth
			and transit access line up across the region.
		</p>
	</section>

	<section class="writeup-section card">
		<h2>Assumptions and Limitations</h2>
		<p>
			This proof of concept makes several explicit simplifying assumptions. First, TOD classification depends on the project’s
			recorded distance to the nearest MBTA stop and on the selected multifamily threshold. That means TOD is being treated as an
			operational definition tied to this dataset and this workflow, not as the only legitimate way to define transit-oriented
			development. Second, the tract groupings depend on a significant-development floor and a TOD-share cutoff, so they should be
			read as analytical categories rather than fixed civic labels.
		</p>
		<p>
			The mismatch layer also depends on a relative rule. Because it uses the 25th and 75th percentiles of the current tract
			universe, a mismatch tract is defined relative to the distribution in view rather than against a single external standard.
			That is useful for identifying imbalance, but it also means the result is sensitive to the comparison set. Similarly, the
			lower-income focus uses one threshold, <code>$125,000</code>, as a practical emphasis rule. It is meant to help structure
			exploration, not to capture the full complexity of housing affordability across Massachusetts.
		</p>
		<p>
			There are also data-shape limitations built directly into the implementation. The browser expects nearest-stop distances to
			have already been computed. The development dots reflect project records, not every housing unit in the region. The
			choropleth uses census housing change, while the tract grouping uses filtered MassBuilds development, so those layers are
			deliberately related but not identical measures. We think that combination is analytically useful, but it is important that
			readers understand that they are comparing two different sources of evidence on the same geography.
		</p>
	</section>

	<section class="writeup-section card">
		<h2>Development Process Overview</h2>
		<p>
			Our process has been iterative rather than linear. We moved back and forth between narrative goals, map behavior, and
			layout decisions because each change affected the others. The most time-intensive work was not only building the map
			graphics themselves, but keeping the encodings, labels, interactions, and explanation aligned as the prototype evolved.
		</p>
		<p>
			In total, this proof of concept represents roughly <strong>80-90 person-hours</strong> of work across the team. That
			includes preprocessing and checking the data inputs, developing the tract model and interaction logic, iterating on the
			scrollytelling layout, debugging deployment and rendering issues, revising the narrative text, and documenting the final
			design decisions and project plan.
		</p>
		<p>
			A large share of the work went into integration and revision. We tightened the map story, simplified which layers appear at
			each step, reworked the sticky scrollytelling layout several times, improved tooltip behavior, and adjusted how the
			controls, charts, and walkthrough share screen space. We also separated the long-form explanation from the interactive
			page, which made the main visualization cleaner while giving us room to document the reasoning in full here.
		</p>
		<p>
			One clear lesson from the process is that interaction and explanation need to be developed together. If the map changes but
			the text and legends do not, the story becomes confusing very quickly. In later stages, we would want an even tighter
			review rhythm so that code changes, explanatory copy, and visual hierarchy stay synchronized throughout.
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
