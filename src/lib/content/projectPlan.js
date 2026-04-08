export const finalProjectPlan = [
	{
		week: 'Week 9: 3/30-4/3',
		overall: [
			'Stabilize the FP2 proof of concept and decide what the final argument should be.',
			'Use feedback from class and staff to narrow the story so it is about a small number of clearly interpretable relationships, not every possible housing metric.',
			'Identify which demographic lenses most directly support the final narrative, especially income change and racial composition.'
		],
		people: {
			Allison: [
				'Make the first round of edits to the tract visualization and document which interactions feel most useful.',
				'Review possible demographic outcomes and help decide which ones fit the final narrative best.',
				'Help prepare questions and screenshots for the office-hours check-in.'
			],
			Krishna: [
				'Make the first round of edits to the tract visualization and help tighten the scrollytelling sequence.',
				'Review candidate demographic variables, especially income and race, and note how they could connect to TOD-related tract groupings.',
				'Help prepare questions and screenshots for the office-hours check-in.'
			],
			Hanna: [
				'Organize staff and class feedback into concrete changes to the current prototype.',
				'Review possible demographic outcomes and help decide which ones fit the final narrative best.',
				'Revise the visualization with that feedback in mind before office hours.'
			],
			Supriya: [
				'Review which demographic measures are most illustrative of neighborhood change in this context.',
				'Test revisions to the current prototype and note where the argument still feels unclear.',
				'Help prepare for the office-hours check-in.'
			]
		}
	},
	{
		week: 'Week 10: 4/6-4/10',
		overall: [
			'Complete the office-hours check-in and translate that feedback into a concrete final-project direction.',
			'Turn the current polished tract map into the first piece of a minimal viable final system.',
			'Decide how income and race will be shown: as direct outcomes, linked comparison views, or supporting evidence.'
		],
		people: {
			Allison: [
				'Implement the next round of changes from the edited visualization.',
				'Help specify how tract comparisons should summarize demographic change.',
				'Participate in the office-hours check-in and record actionable feedback.'
			],
			Krishna: [
				'Implement the next round of changes from the edited visualization.',
				'Refine interaction logic so the final story can support both guided and exploratory reading.',
				'Participate in the office-hours check-in and record actionable feedback.'
			],
			Hanna: [
				'Finalize the feedback summary after the first round of edits.',
				'Help frame the final narrative around which demographic shifts matter most.',
				'Participate in the office-hours check-in and convert feedback into specific next steps.'
			],
			Supriya: [
				'Help frame the final narrative around which demographic shifts matter most.',
				'Review whether income and race should appear as parallel outcome measures or as separate sections of the final story.',
				'Participate in the office-hours check-in and convert feedback into specific next steps.'
			]
		}
	},
	{
		week: 'Week 11: 4/13-4/17',
		overall: [
			'Build satisfactory demos for the minimal viable product.',
			'Make income and race the two clearest demographic lenses for examining TOD-affected tracts, unless the data shows one of them is not interpretable enough.',
			'Draft the presentation around the core question: what kinds of tracts appear most affected, and how do those tracts differ demographically?'
		],
		people: {
			Allison: [
				'Finalize charts or linked views showing how income shifts across tract groupings or selected tract sets.',
				'Help revise the narrative text so it explains demographic comparisons clearly and cautiously.'
			],
			Krishna: [
				'Refine interactive elements and chart linking so map selections connect clearly to demographic comparisons.',
				'Work on the data-interpretation part of the presentation, especially how to explain tract categories and mismatch patterns.'
			],
			Hanna: [
				'Work on the introduction, motivation, and source framing for the presentation.',
				'Help test whether race-based comparisons are legible and appropriately contextualized.'
			],
			Supriya: [
				'Work on the audience and project-goals portion of the presentation.',
				'Help test whether income-based comparisons are legible and appropriately contextualized.'
			]
		}
	},
	{
		week: 'Week 12: 4/20-4/24',
		overall: [
			'Finish the minimal viable product so the full narrative works from beginning to end.',
			'Finalize and record the presentation.',
			'Make sure the final story has one coherent arc: transit access, housing growth, tract grouping, and demographic difference.'
		],
		people: {
			Allison: [
				'Finish final chart polish and linked-view cleanup.',
				'Help record and review the presentation.'
			],
			Krishna: [
				'Finish interaction polish, especially any remaining selection, tooltip, or layout issues.',
				'Help record and review the presentation.'
			],
			Hanna: [
				'Finalize text, citations, and visual explanations for the presentation.',
				'Help record and review the presentation.'
			],
			Supriya: [
				'Finalize supporting narrative and quality-check the full story for coherence.',
				'Help record and review the presentation.'
			]
		}
	},
	{
		week: 'Week 13: 4/27-5/1',
		overall: [
			'Write critiques for other teams and review the strengths and weaknesses of our own project in parallel.',
			'Use that reflection to identify which parts of our final product still feel under-explained or under-developed.'
		],
		people: {
			Allison: ['Write critiques for other teams and review where our own visual explanations could still be clearer.'],
			Krishna: ['Write critiques for other teams and review where our own interaction design could still be improved.'],
			Hanna: ['Write critiques for other teams and review where our own narrative framing could still be improved.'],
			Supriya: ['Write critiques for other teams and review where our own audience framing could still be improved.']
		}
	},
	{
		week: 'Week 14: 5/4-5/8',
		overall: [
			'Integrate feedback from critiques, presentation comments, and final review.',
			'Push the project from “working” to “finished,” especially in narrative polish and cross-view consistency.'
		],
		people: {
			Allison: ['Integrate visual-design and chart changes from feedback and test them in the full page context.'],
			Krishna: ['Integrate interaction and layout changes from feedback and test them in the full page context.'],
			Hanna: ['Organize final feedback and help translate it into prioritized revisions.'],
			Supriya: ['Integrate narrative and framing changes from feedback and test the final reading flow.']
		}
	},
	{
		week: 'Week 15: 5/11',
		overall: [
			'Do a final walkthrough of the full project as a team.',
			'Check that the final submission is coherent across visuals, interaction, writing, and interpretation.'
		],
		people: {
			Allison: ['Do a final walkthrough and sign off on visual clarity and chart behavior.'],
			Krishna: ['Do a final walkthrough and sign off on interaction behavior and deployment readiness.'],
			Hanna: ['Do a final walkthrough and sign off on narrative clarity and writeup quality.'],
			Supriya: ['Do a final walkthrough and sign off on audience fit and overall coherence.']
		}
	}
];

export const projectPlanContingency =
	"If things go wrong, we will first protect the core argument rather than trying to save every feature. Within 24 hours of a serious delay, we will meet, identify exactly what is blocked, and reassign work so no one person holds the critical path alone. If data quality becomes the issue, we will narrow the demographic analysis to the two strongest lenses, income and race, and reduce weaker exploratory views. If implementation time becomes the issue, we will keep the tract choropleth, tract grouping logic, and one strong linked demographic comparison as the non-negotiable core, then simplify secondary interactions, optional overlays, or less essential charts. If the story itself becomes too broad, we will narrow the final narrative to one clean claim about how TOD-related tracts differ from other tracts, rather than trying to answer every housing question at once.";
