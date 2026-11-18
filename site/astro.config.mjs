// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	site: 'https://openlove.baptisteledev.fr',
	integrations: [
		starlight({
			title: 'OpenLove',
			description: 'Installer et développer OpenLove',
			defaultLocale: 'root',
			locales: { root: { label: 'Français', lang: 'fr' } },
			customCss: ['./src/styles/theme.css'],
			sidebar: [
				{ label: 'Installer OpenLove', items: [{ autogenerate: { directory: 'wiki/installer' } }] },
				{ label: 'Développer', items: [{ autogenerate: { directory: 'wiki/developper' } }] },
			],
		}),
	],
});
