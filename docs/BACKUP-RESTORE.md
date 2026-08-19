# Database Backup and Restore

Backups should be tested regularly. A backup that has never been restored is not considered verified.

## PostgreSQL

### Prerequisites

Install PostgreSQL client tools so `pg_dump` and `pg_restore` are available in `PATH`, and set `DATABASE_URL`.

### Backup

```bash
npm run db:backup
```

Default output:

```text
backups/backend2-<timestamp>.dump
```

Custom path:

```bash
npm run db:backup -- backups/manual.dump
```

The dump uses PostgreSQL custom format and excludes ownership/privilege metadata.

### Restore

Restore is destructive and requires explicit confirmation.

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

After restoring PostgreSQL:

```bash
STORAGE=postgres npm run db:migrate
npm run db:contract
STORAGE=postgres npm run test:e2e
```

## MySQL

### Prerequisites

Install MySQL client tools so `mysqldump` and `mysql` are available in `PATH`, and set `MYSQL_URL`.

### Backup

```bash
npm run db:backup:mysql
```

Default output:

```text
backups/backend2-mysql-<timestamp>.sql
```

Custom path:

```bash
npm run db:backup:mysql -- backups/mysql-manual.sql
```

The script uses a consistent transactional dump where possible, avoids table locks, and does not pass the database password as a visible command-line argument.

### Restore

macOS/Linux:

```bash
CONFIRM_RESTORE=yes npm run db:restore:mysql -- backups/mysql-manual.sql
```

PowerShell:

```powershell
$env:CONFIRM_RESTORE="yes"
npm run db:restore:mysql -- backups/mysql-manual.sql
Remove-Item Env:CONFIRM_RESTORE
```

After restoring MySQL:

```bash
STORAGE=mysql npm run db:migrate
npm run db:contract:mysql
STORAGE=mysql npm run test:e2e
```

## Docker Compose quick dumps

PostgreSQL:

```bash
docker compose exec -T db pg_dump -U backend2 -d backend2 > backend2-postgres.sql
```

MySQL:

```bash
docker compose exec -T mysql mysqldump -u backend2 -pbackend2 --no-tablespaces backend2 > backend2-mysql.sql
```

For restore operations, review the target carefully and stop API writes first. Production retention, encryption, off-site storage, restore drills, and RPO/RTO targets belong in the deployment platform rather than in committed credentials.
