# Cloudflare R2 Storage

## Scope

API-owned storage for project images and videos, plus helper support for client
and review images. The admin project editor now exposes authenticated project
uploads; the public website is unchanged. No database migration, media table,
automatic uploads, bucket provisioning, or live mutations happen during setup.
The API continues to start without R2; upload requests fail clearly when unconfigured.

Project uploads accept JPEG/PNG/WebP up to 10 MiB and compatible MP4/WebM up to
50 MiB. SVG, HTML, and PDFs remain disabled. See [project management](project-management.md)
for codec limits, ffprobe setup, API behavior, and orphan retention.

## 1. Create the bucket

In your Cloudflare account, activate R2 if necessary and create a **Standard**
bucket, for example `promdevs-media`. Use a separate bucket for development,
for example `promdevs-media-dev`; never test uploads against production casually.
Review the current [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
and any activation/billing requirements before enabling it. Do not assume a free
Cloudflare domain plan guarantees unlimited free storage. Monitor storage and
operation usage in your account.

Keep bucket public access disabled during setup. This repository does not
create buckets, change permissions, purchase services, or enter billing details.

## 2. Create bucket-scoped credentials

In R2's API token management, create an **Object Read & Write** token scoped only
to this bucket. Do not grant account-wide bucket administration. Save the generated
**Access Key ID** and **Secret Access Key** in your password manager; these are S3
credentials, not a general Cloudflare bearer token.

Copy the account **S3 API endpoint** shown by R2. Usually it is
`https://<account-id>.r2.cloudflarestorage.com`. Jurisdiction-restricted buckets
use the corresponding `eu`, `us`, or `fedramp` endpoint shown in the dashboard.
Do not append the bucket name to the endpoint.

## 3. Set API environment variables

Locally, add these to `apps/api/.env`. Keep your existing database and admin
settings. Do not put credentials in the root repository, frontend environment
variables, screenshots, logs, or Git.

```dotenv
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET=promdevs-media-dev
R2_ACCESS_KEY_ID=<access-key-id>
R2_SECRET_ACCESS_KEY=<secret-access-key>
R2_PUBLIC_BASE_URL=
```

The four first values are required together. All blank disables storage; partially
configured storage fails when explicitly used. The optional public base URL must
be an HTTPS origin with no path, query, fragment, port, or embedded credentials.
Configuration is never sent to the browser. The client uses the official AWS S3
SDK, R2's `auto` region, explicit credentials, two maximum attempts, request
timeouts, and R2-compatible checksum settings.

Run the **read-only** diagnostic after configuring credentials:

```sh
pnpm storage:check
```

It sends only `HeadBucket` to the configured bucket, exits nonzero on failure,
and does not list, upload, delete, or print credentials. It proves bucket access,
not write permission, custom-domain DNS, public delivery, or a complete upload
workflow. An upload smoke test is a separate, explicitly authorized operation.
The normal API `/health` remains process liveness, not storage readiness.

## 4. Optional public delivery

For images intended to be public, add `media.promdevs.com` under the production
bucket's **Custom Domains** settings. Let Cloudflare create/configure the domain
through R2 rather than manually pointing it at the S3 endpoint. Keep `r2.dev`
public development access disabled for production.

Then set on the production API:

```dotenv
R2_PUBLIC_BASE_URL=https://media.promdevs.com
```

**A public bucket exposes all its objects, including unpublished project images.**
Do not store private client files, contracts, secrets, or confidential draft assets
there. Confidential drafts need a separate private bucket and an authorized read/publish
workflow, which the current public-media editor does not implement. Unpredictable filenames are not
authorization. Setting or clearing `R2_PUBLIC_BASE_URL` does not change Cloudflare
bucket access; it only controls generated URLs and upload cache metadata.

Without this variable, helper results contain `url: null`; the S3 endpoint is
never presented as a public image URL. To migrate domains later, store the object
key as the canonical reference and derive public URLs in the API. Do not refactor
existing database/UI fields until that integration is requested.

No CORS change is needed for the current **server-to-R2** helpers. Browser-direct
presigned uploads are not implemented. If introduced later, scope CORS to exact
admin origins and required methods/headers; CORS alone is not authorization.
Plain image display generally does not need CORS, but browser fetch/canvas use may.

## 5. Coolify

Add all R2 variables to the **API application only**, as Runtime Variables, not
Build Variables. Keep secret values private. Use production bucket credentials
there, not the development token. Redeploy/restart the API after updating settings.
No storage container, persistent Hetzner disk mount, or web/admin storage variable
is needed. The API Dockerfile now installs ffmpeg for inspection; local development
requires ffprobe on PATH. Temporary upload files use the API container's temporary
directory and are removed after processing. Keep normal TLS verification enabled.

Builds and tests require no R2 secrets and perform no live R2 writes. This change
adds an API dependency to the root lockfile, so your existing shared-lockfile
Coolify watch paths may trigger all three deployments for this setup commit.

## Server helper interface (not HTTP routes)

- `getR2Storage()`: lazily read API configuration and construct a storage handle.
- `checkBucket()`: read-only bucket access check.
- `uploadImage({ scope, body, contentType })`: bounded buffered image upload;
  scope is `projects`, `clients`, or `reviews`.
- `inspectImage(key)`: read metadata for a managed image key.
- `deleteImage(key)`: explicitly delete a managed image; does not purge CDN caches.
- `publicUrl(key)`: derive a public URL, or return `null` without a public domain.
- `destroy()`: release the client's sockets when its owner finishes or shuts down.

Keys follow `images/<scope>/<uuid>.<extension>`; caller filenames and arbitrary
object paths are not accepted. New objects use `If-None-Match: *`, so retries or
collisions cannot overwrite existing media. Public uploads use immutable cache
headers; updates create new keys rather than replacing the same file. A failed
or timed-out write can still leave an object in R2. Future upload endpoints must
handle uncertain outcomes and orphan cleanup, not retry blindly or delete on every
error. Deleted content may remain in a public CDN cache until purged or expired.

The project upload route adds authentication, live authorization rechecks,
streamed body limits, ffprobe codec/dimension inspection, and throttling. Inspection
is not full decoding, re-encoding, metadata stripping, or malware scanning. Object
retention/garbage collection remains manual: unlinking media does not delete it,
and interrupted or abandoned edits can leave objects. Do not send files as JSON
or delete project media automatically without checking reuse and CDN retention.

Tests inject a fake transport; no real Cloudflare account is contacted.

## Troubleshooting public image delivery

`ERR_NAME_NOT_RESOLVED` means the browser could not resolve the public image
hostname; it is not an upload validation or admin authentication error. Check
the production bucket's **Settings > Custom Domains** and confirm the hostname
is connected and its status is **Active**. Connect it through R2 in the same
Cloudflare account as the domain's zone, rather than pointing it at Hetzner or
the S3 API endpoint.

Test the exact stored object URL, not just the domain root (R2 does not list
objects at `/`). For example:

```sh
curl -I https://media.promdevs.com/images/projects/<object-id>.png
```

If that returns `200` but a browser still reports a DNS error, retry after DNS
propagation and check another network or resolver. `pnpm storage:check` cannot
diagnose this: it checks authenticated bucket access, not public delivery.
Connecting the existing hostname fixes existing stored URLs without re-uploading
files, provided the objects exist. Changing `R2_PUBLIC_BASE_URL` affects future
uploads only; it does not rewrite previously stored URLs. The admin project list
uses a fixed-size placeholder when a thumbnail cannot load.

## Official references

- [R2 authentication and token scope](https://developers.cloudflare.com/r2/api/tokens/)
- [AWS SDK v3 with R2](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/)
- [Supported S3 operations](https://developers.cloudflare.com/r2/api/s3/api/)
- [Public buckets and custom domains](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [CORS](https://developers.cloudflare.com/r2/buckets/cors/)
