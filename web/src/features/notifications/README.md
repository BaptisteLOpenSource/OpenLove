# notifications

Push FCM, web et Android ([ADR 0004](../../../../docs/decisions/0004-fcm-single-push-provider.md)).

- Envoi: `shared/push/notify.ts` (`notify(userId, {title, body, url, tag})`), SEUL client FCM
  (HTTP v1 + JWT compte de service, `FIREBASE_SERVICE_ACCOUNT`). Dans `shared/` car `messages` et
  les rappels l'appellent (pas d'import entre features).
- Invariants: `notify` ne throw jamais (un push raté ne casse pas l'appelant). 2 retries
  (200 ms, 500 ms) sur erreur réseau, 429, 5xx, INTERNAL/UNAVAILABLE. 404/410/UNREGISTERED supprime
  le token. Aucun contenu de Message dans un push: texte générique, `tag` = regroupement.
- Tokens: table `push_tokens`, service role seulement. `POST /api/push-tokens` fait un insert,
  jamais un upsert: token déjà pris par l'autre Partenaire = 403 (S6).
- `GET /api/push-config`: config Firebase pour l'init runtime d'Android (pas de google-services.json).
- Web: `public/firebase-messaging-sw.js` sans SDK, affiche `payload.notification`; clic = `data.url`
  seulement si same-origin (S7), sinon `/`. Activation depuis `/settings` (`ui/PushToggle`).
