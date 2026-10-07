# PromDevs on Coolify

Deploy three independent applications from this repository, not one combined
Compose application. Each has its own build, environment, logs, and deployment.
These instructions assume Coolify is already running on your Hetzner server.
No deployment settings in this document have been applied to your server.

## What triggers a deployment?

| Change | Expected automatic deployment with the filters below |
| --- | --- |
| Admin source in `apps/admin` | Admin only |
| Website source in `apps/web` | Web only |
| API source in `apps/api` | API only |
| `packages/ui` | Admin only; web does not currently import this package |
| `packages/contracts` | All three; all depend on the contract |
| Root package manager files or TypeScript base config | All three |
| One app's Dockerfile | That app only |
| README or this guide | None |
| Editing a project through the admin UI | None; writes data, not source code |

An admin-only dependency change can also update the root `pnpm-lock.yaml`, which
intentionally redeploys all three. Do not omit the lockfile from filters just to
avoid this: dependency changes can affect builds. App code/CSS changes normally
do not change the lockfile.

Coolify's Watch Paths apply to Git webhook events with changed-file information.
They do not prevent a manual deployment or an authenticated Deploy Webhook.
Do not add another workflow that calls all three deploy webhooks on every push.
The repository's verification workflow builds/tests all apps, but deploys none.
See [automatic deployments](https://coolify.io/docs/applications/deployments/automatic-deployments).

## 1. Prepare the repository and resources

1. Commit and push the workspace changes to the branch you intend to deploy.
   Coolify builds committed repository contents, not your local working directory.
2. Connect the repository through a Coolify GitHub App for Git-triggered deployments.
   Use the same repository and production branch for all three applications.
3. Create a PromDevs project with a production environment on your Hetzner server.
4. Add three separate Git-based applications using the Dockerfile build pack.
   Leave automatic deployments off until the initial rollout is verified.

Use these settings for each application:

| Setting | API | Admin | Website |
| --- | --- | --- | --- |
| Name | `promdevs-api` | `promdevs-admin` | `promdevs-web` |
| Base Directory / build context | `/` | `/` | `/` |
| Dockerfile Location, relative to root | `deploy/api.Dockerfile` | `deploy/admin.Dockerfile` | `deploy/web.Dockerfile` |
| Ports Exposes | `4000` | `80` | `3000` |
| Domain | `https://api.promdevs.com` | `https://admin.promdevs.com` | `https://promdevs.com` |
| Container health path | `/health` | `/health` | `/` |

Do not set Base Directory to an individual app: the Dockerfiles need the root
workspace and shared packages. No custom install/build/start command is needed;
the Dockerfiles provide them. Leave host Port Mappings empty; use the Coolify
HTTPS proxy rather than publishing application ports on the server.
All three images already include a HEALTHCHECK.
The API and web runtime images install `curl`; the Alpine admin image provides
`wget`. This also supports Coolify versions that generate their own HTTP checks.
See [Dockerfile deployment](https://coolify.io/docs/applications/builds/dockerfile)
and [health checks](https://coolify.io/docs/applications/configuration/health-checks).

## 2. Configure independent Watch Paths

For each application, open Configuration > General > Build > Watch Paths.
Enter the following patterns (one per line in the multiline field). No leading
slash: these paths are relative to the Git repository, not the server filesystem.
If your installed Coolify version uses a different editor, enter the same patterns
in its expected format. Do not add a catch-all `**` or `apps/**`.

### Website

```text
apps/web/**
packages/contracts/**
deploy/web.Dockerfile
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
tsconfig.base.json
.dockerignore
.nvmrc
```

### Admin

```text
apps/admin/**
packages/contracts/**
packages/ui/**
deploy/admin.Dockerfile
deploy/admin.nginx.conf.template
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
tsconfig.base.json
.dockerignore
.nvmrc
```

### API

```text
apps/api/**
packages/contracts/**
deploy/api.Dockerfile
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
tsconfig.base.json
.dockerignore
.nvmrc
```

## 3. Configure runtime variables

For optional Cloudflare R2 media storage, follow [storage setup](../docs/storage.md).
R2 credentials belong only on the API as runtime variables. There is no storage
container or persistent Hetzner volume to add, and upload UI/routes are not enabled.

In Configuration > Environment Variables, enable Runtime Variable and disable
Build Variable for these settings. The builds need no production credentials.
Add secrets in the Normal view; enable Literal for the password hash so its `$`
characters are preserved. Do not paste surrounding shell quotes into the value.
See [environment variables](https://coolify.io/docs/applications/configuration/environment-variables).

### API

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` (do not copy the local `127.0.0.1` setting) |
| `PORT` | `4000` |
| `DATABASE_URL` | Your existing database connection string |
| `ADMIN_EMAIL` | Your administrator email |
| `ADMIN_PASSWORD_HASH` | Output of `pnpm admin:password` run locally |
| `ADMIN_ORIGIN` | `https://admin.promdevs.com` exactly, no trailing slash |
| `RESEND_API_KEY` | Your private Resend API key |
| `CONTACT_TO_EMAIL` | Your receiving inbox |
| `CONTACT_FROM_EMAIL` | A sender at your verified Resend domain |
| `TRUST_PROXY` | `false` initially; see the security note below |

Use a unique admin password of at least 16 characters. Store the hash only on the
API, not the plaintext password. Resend's `onboarding@resend.dev` default is for
initial testing; configure your verified domain for normal production delivery.
Deploy **one API replica**: sessions and rate limits are currently in memory.
An API restart signs administrators out; it does not delete database projects.

### Admin

```dotenv
API_UPSTREAM=https://api.promdevs.com
```

### Website

```dotenv
API_BASE_URL=https://api.promdevs.com
```

These HTTPS addresses are a straightforward first setup. Neither should end in
`/api` or include a trailing slash. The admin serves `/api` through its own Nginx
proxy; the website fetches server-side. Do not set `VITE_API_*`, CORS wildcards,
or database/email credentials on either frontend.

Private networking is an alternative once configured: use the actual stable API
network alias and port, not an assumed `api` hostname. `localhost` in a container
means that container, not another application.

## 4. DNS and HTTPS

In Cloudflare, create A records for `api` and `admin` pointing to the Hetzner
server's IPv4 address. Point `@` there when ready to move the public website;
leave the existing Vercel record alone until then. Add `www` as a CNAME to
`promdevs.com` if you serve it. Do not add an AAAA record unless IPv6 works.

Ensure Coolify issues a valid origin certificate and serves HTTPS, then use
Cloudflare proxying with SSL/TLS **Full (strict)**, not Flexible. Full (strict)
validates the origin certificate; see
[Cloudflare's SSL documentation](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/).
If certificate issuance fails, temporarily switch the affected record to DNS-only
and diagnose origin HTTPS before enabling the proxy again.

Add both root and www URLs in the web application if using both, and choose a
single canonical redirect (the current website uses `promdevs.com`).
Keep database credentials and database ports private. Do not configure Cache
Everything for admin HTML or `/api` responses; bypass any custom cache rules for
the admin and API hosts and the website's `/api/*` routes. Do not challenge
server-to-server API requests with an interactive browser challenge.

## 5. Deploy and verify

1. Deploy the API first. Check its logs and `https://api.promdevs.com/health`.
   Health is process liveness only: also check `/api/projects` to verify database
   access. A public empty project list is valid; 503 is not database readiness.
2. Deploy admin. Open `https://admin.promdevs.com`, sign in, and verify the project
   list. Confirm sign-out revokes access. Do not create test records in the live
   portfolio unless you intentionally want them public.
3. Deploy web. Check the homepage, `/projects`, a real project detail URL if one
   exists, `/robots.txt`, and `/sitemap.xml`. Submit a contact message only if you
   intend to send that email. Admin content changes appear on the next public
   project request, without a web rebuild.
4. Enable Auto Deploy under Configuration > Advanced > Deployment & Git for each
   resource. Push an admin-only source change and confirm only admin has a webhook
   deployment. Test a documentation-only commit: none should deploy. Test the
   installed version's filters before relying on them.

If you want complete manual control, keep Auto Deploy off and select Deploy on
the individual resource when ready. There is no need to redeploy all three.

## Health check reports curl or wget not found

If the application starts but Coolify rolls back with `curl: not found` and
`wget: not found`, its HTTP check cannot run inside the image. Installing tools
on the Hetzner host does not install them in the application container.

Push the updated Dockerfiles and redeploy the affected application from that
commit. Keep the API check on HTTP port `4000`, path `/health`; the web check
uses port `3000`, path `/`. Do not disable monitoring just to conceal a failed
check. In the API container terminal, verify:

```sh
curl --fail --silent --show-error http://127.0.0.1:4000/health
```

A successful response verifies liveness, not database or email readiness. If
the new image still says the command is missing, confirm the deployed commit
and Dockerfile Location, then rebuild without cache if necessary.

## Admin loads but login/session requests return 502

Check the admin container's Nginx logs. `upstream SSL certificate verify error`
with `unable to get local issuer certificate` means the HTTPS API proxy failed
certificate-chain verification, not that the admin password is incorrect.
The template explicitly allows a verification depth of three for cross-signed
intermediates; Nginx's default is one. Verification remains enabled against the
container's CA bundle. See
[Nginx verification depth](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_ssl_verify_depth).

Push the updated `deploy/admin.nginx.conf.template` and redeploy **admin only**.
Keep `API_UPSTREAM=https://api.promdevs.com`. An unauthenticated request to
`https://admin.promdevs.com/api/admin/session` should return 401 once admin
credentials are configured, not 502. Do not turn `proxy_ssl_verify` off.
If TLS errors persist, inspect the deployed template, CA bundle, and the API's
presented certificate chain from inside the container; never download arbitrary
certificates into the trust store to work around an unverified issuer.

## Security and operational limitations

- Keep `TRUST_PROXY=false` until every ingress path sanitizes `X-Forwarded-For`
  and direct origin access is blocked. With it false, shared proxy IPs share a
  rate-limit bucket. Accurate per-visitor limits require deliberate trusted-proxy
  configuration; simply enabling the setting is not enough.
- Keep HTTPS, no-store responses, and backend authentication intact. Admin noindex
  is not access control. An optional Cloudflare Access policy should protect the
  admin host, not block public API requests needed by the website.
- Review migrations separately, back up the database, and obtain authorization
  before applying them. Do not add automatic production migrations to this rollout.
- No persistent application disk is needed for the current database-backed
  portfolio. Maintain off-server database backups and monitor uptime/resource use.
- Docker images were not built locally because Docker was unavailable. Inspect
  each first Coolify build log. If it fails, do not assume a healthy API means the
  database, email, or admin integration has also been verified.
