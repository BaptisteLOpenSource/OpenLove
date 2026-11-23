# Installation

Le déploiement se fait sans terminal : forkez le dépôt, branchez-le sur Vercel, puis renseignez
les variables d'environnement. La page **/setup** de votre site vérifie chaque variable en direct
et affiche ce qui manque. Elle reprend les mêmes étapes que ce guide (synchronisation vérifiée par
`web/src/features/setup/installDoc.test.ts`).

## 1. Vercel

1. Importez votre fork GitHub dans Vercel.
2. Root Directory : `web`.
3. Activez « Include files outside the root directory in the Build Step » (l'app lit `design/tokens.json`).
4. Une fois l'étape Supabase faite, ajoutez chaque variable ci-dessous dans **Settings > Environment Variables**, puis redéployez.

## 2. Supabase

1. Créez un projet Supabase.
2. Liez le projet puis appliquez les migrations : `supabase link --project-ref <ref>` puis `supabase db push`.
3. Copiez l'URL et les clés depuis **Project Settings > API** dans les variables ci-dessous.

Variables à renseigner dans Vercel :

- `SUPABASE_URL` : URL du projet.
- `SUPABASE_ANON_KEY` : clé `anon` (publique).
- `SUPABASE_SERVICE_ROLE_KEY` : clé `service_role` (secrète, jamais côté navigateur).
- `NEXT_PUBLIC_SUPABASE_URL` : même valeur que `SUPABASE_URL`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : même valeur que `SUPABASE_ANON_KEY`.

Checklist de sécurité du tableau de bord hébergé :

- [ ] **Auth > Providers > Email** : désactivez les inscriptions une fois les deux partenaires créés.
- [ ] **Auth > Password security** : longueur minimale 8, protection contre les mots de passe fuités activée (plan Pro).
- [ ] **Auth > Sessions** : durée de vie limitée et délai d'inactivité (plan Pro).
- [ ] **Database > Settings** : Enforce SSL activé, restrictions réseau (allowlist). L'app utilise HTTPS, seul Postgres direct est concerné.
- [ ] **Advisors > Security Advisor** : aucun WARN.

## 3. Firebase

1. Créez un projet Firebase puis ajoutez-y une app Web et une app Android.
2. Cloud Messaging : générez une paire de clés Web Push (clé VAPID).
3. Project Settings > Service accounts : générez une clé privée, encodez le fichier JSON en base64.
4. Copiez les identifiants de projet et des apps dans les variables ci-dessous.

Variables à renseigner dans Vercel :

- `FIREBASE_SERVICE_ACCOUNT` : Compte de service Firebase (Project Settings > Service accounts > Generate new private key), le fichier JSON encodé en base64 (base64 -w0 fichier.json). Secret, serveur uniquement.
- `FIREBASE_ANDROID_APP_ID` : ID de l'app Android Firebase (Project Settings > Your apps > App ID, forme 1:...:android:...). Envoyé à l'app Android pour initialiser Firebase.
- `NEXT_PUBLIC_FIREBASE_API_KEY` : Clé API Firebase : Project Settings > Your apps > app Web > apiKey. Exposée au navigateur.
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` : ID du projet Firebase : Project Settings > General > Project ID.
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` : Sender ID : Project Settings > Cloud Messaging (ou General) > Sender ID.
- `NEXT_PUBLIC_FIREBASE_APP_ID` : ID de l'app Web Firebase : Project Settings > Your apps > app Web > appId.
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY` : Clé VAPID web : Project Settings > Cloud Messaging > Web Push certificates > Generate key pair.

## Autres variables

- `MESSAGE_ENCRYPTION_KEY` : clé AES-256 des Messages, 32 octets en base64 (`openssl rand -base64 32`). Secrète, jamais en base. La perdre rend les Messages illisibles.
- `SETUP_TOKEN` : secret demandé par le formulaire de premier lancement `/setup`, qui empêche un inconnu de créer le Couple. 32 caractères minimum (`openssl rand -base64 32`). Gardez-le privé.
- `CRON_SECRET` : secret d'au moins 16 caractères qui protège la tâche quotidienne des Rappels (`openssl rand -hex 16`). Vercel l'envoie en `Authorization: Bearer` à `/api/cron/reminders` chaque jour à 08:00 UTC.

