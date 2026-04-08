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

		<h3>Why these demographic proxies are used in the prototype</h3>
		<p>
			The completed version of this project is meant to say more than where development happened. It is also meant to ask what
			kinds of neighborhood change appear alongside that development. For that reason, we are treating several demographic
			measures as <strong>proxy indicators</strong> of gentrification pressure rather than as definitive proof of displacement on
			their own.
		</p>
		<ul class="writeup-list">
			<li>Sharp increases in median income, which are often read as one warning sign of rising housing costs.</li>
			<li>Rapid increases in the share of residents with bachelor’s degrees or higher.</li>
			<li>Potential shifts from owner-occupied housing toward more turnover-prone rental conditions, which we would like to analyze further in the completed version.</li>
		</ul>
		<p>
			We use these measures because they help us compare tract categories in a way that connects built change to social change.
			In the full dashboard, we expect to compare income and education change across TOD-dominated, non-TOD-dominated, and
			minimal-development tracts, as well as across different levels of development intensity and affordability. These measures
			are useful because they are interpretable at the tract level and because they help move the project toward the broader
			question of who seems most affected by these growth patterns.
		</p>
		<p>
			At the same time, we want to be careful about what those proxies can and cannot show. They are descriptive comparisons, not
			causal estimates. A tract can experience income growth or educational change for many reasons, including broader labor
			market shifts, urban form, pre-existing neighborhood trends, or regional demand unrelated to TOD. We therefore treat them
			as warning signals and comparison tools, not as stand-alone proof that TOD caused demographic change.
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
			We ended up redesigning the proof of concept around a <strong>guided narrative first, exploration second</strong> model.
			Early versions behaved much more like a dashboard: the user saw many layers at once, had to decide what mattered, and
			often had to do the interpretive work themselves. The current version is closer to a martini-glass structure. We first
			show a few simpler views that explain what patterns to look for, then we walk the viewer through the map step by step,
			and only after that do we open up a fuller exploration mode.
		</p>

		<h3>How did we choose our particular visual encodings and interaction techniques?</h3>
		<p>
			We chose a <strong>tract-level choropleth of census housing growth</strong> as the base layer because it gives one clear,
			comparable regional measure that can stay stable throughout the entire story. We use percent housing growth rather than raw
			unit change so large tracts do not dominate just because they start with larger housing stocks. We encode that growth with
			a diverging red-blue scale: weaker or negative growth moves toward red, stronger growth moves toward blue, and tan marks
			tracts with limited or unreliable growth data. That gives readers a quick first read before they interact with anything.
		</p>
		<p>
			After that, we deliberately separate the other ideas into different channels rather than asking fill color to do
			everything. <strong>Green and orange outlines</strong> encode TOD-dominated and non-TOD-dominated tract groupings,
			<strong>purple outlines</strong> encode mismatch categories, and <strong>project dots</strong> encode individual
			MassBuilds developments. We also keep income out of the main fill because adding it as another choropleth would have made
			the map much harder to read. Instead, income appears through a lower-income emphasis step, linked detail panels, and
			supporting explanation.
		</p>
		<p>
			On the interaction side, we chose techniques that support explanation instead of distracting from it. The walkthrough uses
			progressive disclosure, place-based zooming, and annotations to guide attention. Hover tooltips and click-to-select
			provide detail-on-demand. Linked charts update from map selections so the user can compare tracts without losing the
			spatial overview. We also kept a mismatch filter and a full exploration section because once the main claim is clear, we
			want planners and policymakers to inspect the system themselves rather than only passively watch a story.
		</p>

		<h3>What alternatives did we consider, and how did we arrive at the final design?</h3>
		<p>
			We considered several alternatives before arriving at the current design. One option was to keep the page as a
			dashboard-style interface with many controls visible from the start. We moved away from that because it made the page feel
			analytically rich but narratively weak. The user could technically inspect a lot, but the main takeaway about mismatch was
			not guided clearly enough.
		</p>
		<p>
			We also considered making the project almost entirely chart-driven, with the map acting as supporting context. That would
			have made some comparisons easier, but it would have weakened the geographic argument. The core question here is spatial:
			where transit access and housing growth align, and where they do not. For that reason, we kept the map as the anchor and
			let charts and narrative figures prepare the reader for it.
		</p>
		<p>
			Another alternative was to push more information directly into the map itself through heavier labels, permanent callouts,
			and more simultaneous overlays. We tried versions of that and found that the map quickly became crowded. The design became
			much stronger when we switched to one stable base layer, then introduced tract examples, region zooms, and notable
			development examples in the sidebar instead of trying to annotate everything directly on the geography.
		</p>
		<p>
			We also considered putting income directly on the map as another fill layer. We decided against that because the main
			story is about the relationship between transit access and housing growth. Once income became another choropleth, the page
			started to ask the reader to decode too many overlapping map logics at once. Moving income into tooltips, contextual
			highlighting, and linked views gave us a cleaner result.
		</p>

		<h3>How do these design choices help reach our intended audience?</h3>
		<p>
			Our intended audience is <strong>policymakers and planners</strong>, so our design choices try to balance clarity with
			enough evidence to support policy interpretation. We assume this audience cares about spatial patterns, regional
			comparisons, and whether the story is grounded in tract-level and project-level evidence. The guided introduction helps by
			stating the key point early: transit access and housing growth are not aligning consistently across Greater Boston. The
			place-based zoom steps then make that claim concrete in familiar municipalities rather than leaving it at an abstract
			regional level.
		</p>
		<p>
			We also think policymakers and planners benefit from seeing the difference between a guided reading and an open-ended tool.
			The narrative stem tells them what the core claim is and why it matters for planning. The exploration phase then lets them
			check specific places, compare tracts, inspect developments, and ask whether the pattern holds in the parts of the region
			they care most about. That combination is important because a policy audience usually wants both explanation and room to
			verify.
		</p>

		<h3>What do we think does not work quite as well as we hoped?</h3>
		<p>
			The strongest remaining weakness is density. Even after we simplified the walkthrough, the system still carries several
			related layers and panels. The map is much clearer than it was before, but once outlines, dots, and selection states
			accumulate in dense areas, the page can still feel visually busy. We also think the relationship between census housing
			growth and MassBuilds development requires careful explanation. It is analytically useful to compare them, but it is not
			automatically intuitive for every reader.
		</p>
		<p>
			We also think the narrative is stronger than the open exploration mode. The exploration section is useful, but it still
			feels a little more like a tool than like a polished second half of the story. That is not a failure exactly, but it is a
			place where the experience still feels less resolved than the guided walkthrough.
		</p>

		<h3>How might we improve the design in future milestones?</h3>
		<p>
			In future milestones, we would improve the project in three main ways. First, we would tighten the exploration mode so it
			inherits more of the same visual hierarchy as the guided story. Second, we would make the demographic comparisons more
			fully integrated, especially around income and race, so the transition from spatial mismatch to neighborhood change feels
			even more direct. Third, we would test the page more deliberately with readers outside the team to see where the narrative
			still depends too much on our own familiarity with the data.
		</p>
		<p>
			We would also like to improve the annotation system. The current guided tract and development examples are much better than
			a generic “try this” prompt, but there is still room to make those examples feel even more editorial and polished. A later
			version could sequence them more explicitly, tie them to stronger summary charts, and give the exploration section a clearer
			set of recommended comparisons.
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
			Our process has been iterative rather than linear. We moved back and forth between narrative goals, map behavior, data
			assumptions, and layout decisions because each change affected the others. A large part of the work was not just coding new
			views, but revising the page repeatedly so the interaction, copy, and visual hierarchy all told the same story.
		</p>

		<h3>How was the work split among team members?</h3>
		<p>
			We split the work across four team members, but not in a completely rigid way. <strong>Allison</strong> and
			<strong>Krishna</strong> spent the most time on the interactive tract visualization itself, especially the scrollytelling
			flow, layer logic, layout revisions, map behavior, and the transition from dashboard-style exploration to a guided
			narrative. <strong>Hanna</strong> focused more on narrative framing, feedback synthesis, and making sure the project’s
			argument stayed coherent as the interface changed. <strong>Supriya</strong> focused more on demographic framing, audience
			questions, and helping evaluate which demographic comparisons would most strengthen the final direction.
		</p>
		<p>
			In practice, the work overlapped quite a bit. The map design, copy, and planning questions were tightly connected, so most
			major changes required discussion across more than one person. We think that overlap helped the project because this was
			not the kind of assignment where one person could finish “their part” independently and hand it off cleanly.
		</p>

		<h3>How much time did we spend developing the application?</h3>
		<p>
			Our estimate is roughly <strong>80-90 person-hours</strong> across the team for this proof of concept. That includes data
			preparation and checking, development of the tract and development logic, repeated layout and scrollytelling revisions,
			debugging deployment issues, rewriting explanatory text, and preparing the writeup and project plan.
		</p>

		<h3>What aspects took the most time?</h3>
		<p>
			The most time-consuming work was integration and revision. The page went through many rounds of changes to the scrollytelling
			structure, sticky layout, map controls, tooltip behavior, and the relationship between the walkthrough and the exploration
			mode. Rebuilding the project around a guided narrative took much longer than simply adding another chart or another layer,
			because every change to the story also forced changes to the interface and explanation.
		</p>
		<p>
			The other major time sink was debugging behavior that sat between code and presentation: deployment issues, blank-page
			problems, load failures, awkward sticky behavior, tooltip clipping, and map-state transitions that felt wrong even when the
			code technically ran. Those were the kinds of problems that required repeated iteration rather than one clean fix.
		</p>

		<h3>How do we hope to improve our process for future milestones?</h3>
		<p>
			The biggest lesson for us is that interaction, writing, and visual design need to be revised together. Earlier in the
			process, we sometimes improved one part of the system faster than the others, which led to moments where the map behavior
			changed but the explanation did not, or where the explanation improved but the layout still felt dashboard-like. For future
			milestones, we want a tighter review rhythm where we check code, copy, and narrative structure together rather than
			treating them as separate stages.
		</p>
		<p>
			We also want to protect time for simplifying earlier. A lot of our iteration came from discovering too late that a feature
			was technically interesting but narratively weak. In later milestones, we would like to decide sooner which interactions
			are truly central to the argument and which ones are optional.
		</p>
	</section>

	<section class="writeup-section card">
		<h2>Final Project Plan</h2>
		<p>
			This plan lays out how we expect to move from the current proof of concept to the final project. The main shift is that we
			do not want the final submission to be only a polished interactive map. We want it to make a clearer claim about how
			TOD-affected tracts differ from other tracts and what those differences look like demographically.
		</p>
		<p>
			Right now, the two demographic lenses we most expect to investigate are <strong>income</strong> and
			<strong>race</strong>. We think those two measures are especially important because they can help us ask whether tracts
			with stronger TOD-related development or stronger mismatch patterns also show a distinct social profile. The plan below is
			therefore not just a production schedule. It is a roadmap for moving from the current tract-growth story to a fuller
			account of who seems most affected by these patterns.
		</p>
		<p>
			We also wanted the plan to be honest about sequencing. Earlier weeks are focused on narrowing the question and testing what
			the data can support. Middle weeks are focused on building the minimum viable narrative and interaction structure. Final
			weeks are focused on presentation, critique, and cleanup so the final deliverable feels coherent rather than pieced
			together.
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
			<h3>Overall plan</h3>
			<p>
				Our overall plan is to move from a proof of concept about transit access and housing growth into a final project that can
				say more about <strong>who</strong> is affected by those spatial patterns. The two demographic lenses we most expect to
				develop further are <strong>income</strong> and <strong>race</strong>. We want the final project to preserve the current
				spatial mismatch argument, then connect it to neighborhood change more directly through linked demographic comparisons and
				clearer narrative framing.
			</p>
			<p>
				In practical terms, that means the current tract choropleth, tract grouping logic, mismatch analysis, and guided-to-exploratory
				structure form the base we will build on. The next milestone is not to throw that work away, but to strengthen it with a
				more complete explanation of demographic change in TOD-affected and non-TOD-affected tracts.
			</p>
		</section>

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
