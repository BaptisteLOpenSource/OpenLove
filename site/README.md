# Wiki OpenLove

Site de documentation (Astro + Starlight), en français. Projet indépendant : rien dans `web/` ou `mobile/` n'en dépend.

## Commandes

Depuis `site/` (Node 22.23.4 ou plus récent) :

| Commande | Action |
| :--- | :--- |
| `npm install` | Installe les dépendances |
| `npm run dev` | Serveur local sur `localhost:4321` |
| `npm run build` | Build statique dans `dist/` |

## Structure

- `src/content/docs/installer/` : guide utilisateur.
- `src/content/docs/developper/` : guide développeur.
- Les deux guides partagent les mêmes titres de secrets, donc les mêmes ancres.
