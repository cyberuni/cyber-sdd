import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

export default defineConfig({
	site: 'https://cyberuni.github.io',
	base: '/cyber-sdd',
	integrations: [
		starlight({
			title: 'cyber-sdd',
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/cyberuni/cyber-sdd',
				},
			],
			sidebar: [
				{
					label: 'SDD',
					items: [
						{ label: 'Overview', link: '/sdd/overview/' },
						{ label: 'Spec-Driven Development', link: '/sdd/spec-driven-development/' },
						{ label: 'Test-Driven Development', link: '/sdd/test-driven-development/' },
						{ label: 'Use Case', link: '/sdd/use-case/' },
						{ label: 'Scenario', link: '/sdd/scenario/' },
						{ label: 'Control Flow', link: '/sdd/control-flow/' },
						{ label: 'Spec Dependencies', link: '/sdd/spec-dependencies/' },
						{ label: 'Metaphor', link: '/sdd/metaphor/' },
					],
				},
				{
					label: 'ACED',
					items: [
						{ label: 'Overview', link: '/aced/overview/' },
						{ label: 'run', link: '/aced/run/' },
						{ label: 'report', link: '/aced/report/' },
						{ label: 'compare', link: '/aced/compare/' },
						{ label: 'improve', link: '/aced/improve/' },
						{ label: 'add-scenario', link: '/aced/add-scenario/' },
						{ label: 'define-skill', link: '/aced/define-skill/' },
						{ label: 'define-agent', link: '/aced/define-agent/' },
						{ label: 'define-governance', link: '/aced/define-governance/' },
						{ label: 'skillify', link: '/aced/skillify/' },
						{ label: 'contribute-skill', link: '/aced/contribute-skill/' },
						{ label: 'init-aced', link: '/aced/init-aced/' },
					],
				},
				{
					label: 'Quill',
					items: [
						{ label: 'Overview', link: '/quill/overview/' },
						{ label: 'Production Chain', link: '/quill/production-chain/' },
						{ label: 'Doc Eval Model', link: '/quill/doc-eval-model/' },
						{ label: 'Builder Spec', link: '/quill/quill-builder-spec/' },
						{ label: 'Builder Impl', link: '/quill/quill-builder-impl/' },
						{ label: 'init-quill', link: '/quill/init-quill/' },
					],
				},
			],
			editLink: {
				baseUrl: 'https://github.com/cyberuni/cyber-sdd/edit/main/apps/web/',
			},
		}),
	],
})
