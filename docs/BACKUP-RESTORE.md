# PostgreSQL Backup and Restore

PostgreSQL is the canonical production database. Backups should be tested regularly; a backup that has never been restored is not considered verified.

## Prerequisites

Install PostgreSQL client tools so `pg_dump` and `pg_restore` are available in `PATH`, and set `DATABASE_URL` to the target database.

## Create a backup

```bash
npm run db:backup
```

Backups are written to `backups/backend2-<timestamp>.dump` by default. To choose a path:

```bash
npm run db:backup -- backups/manual.dump
```

The dump uses PostgreSQL custom format and excludes ownership/privilege metadata so it is portable between environments.

## Restore a backup

Restore is destructive and requires an explicit confirmation environment variable.

macOS/Linux:

```bash
CONFIRM_RESTORE=yes npm run db:restore -- backups/manual.dump
```

PowerShell:

```powershell
$env:CONFIRM_RESTORE="yes"
npm run db:restore -- backups/manual.dump
Remove-Item Env:CONFIRM_RESTORE
```

After a restore, validate the canonical schema and application behavior:

```bash
npm run db:contract
npm run build
npm run test:e2e
```

## Docker Compose alternative

For a quick logical SQL dump from the local Compose database:

```bash
docker compose exec -T db pg_dump -U backend2 -d backend2 > backend2.sql
```

Restore into an empty/local database only after reviewing the target:

```bash
cat backend2.sql | docker compose exec -T db psql -U backend2 -d backend2
```

Production backup retention, encryption, off-site storage, restore drills, and RPO/RTO targets should be configured in the deployment platform rather than committed as credentials in this repository.
