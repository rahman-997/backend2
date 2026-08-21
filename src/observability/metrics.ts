type HttpKey = `${string}|${string}|${number}`;
type CacheResult = "hit" | "miss" | "load" | "error";

const httpRequests = new Map<HttpKey, number>();
const httpDurationMs = new Map<HttpKey, { count: number; sum: number; max: number }>();
const cacheResults = new Map<CacheResult, number>();

function escapeLabel(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"").replaceAll("\n", "\\n");
}

function httpLabels(key: HttpKey): string {
  const parts = key.split("|");
  const method = parts[0] ?? "UNKNOWN";
  const route = parts[1] ?? "/";
  const status = parts[2] ?? "0";
  return `method="${escapeLabel(method)}",route="${escapeLabel(route)}",status="${status}"`;
}

export function normalizeMetricRoute(path: string): string {
  const cleanPath = path.split("?")[0] ?? "/";
  return cleanPath
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?=\/|$)/gi, "/:id")
    .replace(/\/\d+(?=\/|$)/g, "/:id");
}

export function recordHttpRequest(input: {
  method: string;
  route: string;
  status: number;
  durationMs: number;
}): void {
  const key = `${input.method}|${normalizeMetricRoute(input.route)}|${input.status}` as HttpKey;
  httpRequests.set(key, (httpRequests.get(key) ?? 0) + 1);

  const current = httpDurationMs.get(key) ?? { count: 0, sum: 0, max: 0 };
  current.count += 1;
  current.sum += input.durationMs;
  current.max = Math.max(current.max, input.durationMs);
  httpDurationMs.set(key, current);
}

export function recordCacheResult(result: CacheResult): void {
  cacheResults.set(result, (cacheResults.get(result) ?? 0) + 1);
}

export function renderMetrics(): string {
  const lines = [
    "# HELP eventify_process_uptime_seconds Process uptime in seconds.",
    "# TYPE eventify_process_uptime_seconds gauge",
    `eventify_process_uptime_seconds ${process.uptime().toFixed(3)}`,
    "# HELP eventify_process_resident_memory_bytes Resident memory usage in bytes.",
    "# TYPE eventify_process_resident_memory_bytes gauge",
    `eventify_process_resident_memory_bytes ${process.memoryUsage().rss}`,
    "# HELP eventify_http_requests_total Total HTTP requests.",
    "# TYPE eventify_http_requests_total counter",
  ];

  for (const [key, value] of [...httpRequests.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`eventify_http_requests_total{${httpLabels(key)}} ${value}`);
  }

  lines.push(
    "# HELP eventify_http_request_duration_ms Request duration in milliseconds.",
    "# TYPE eventify_http_request_duration_ms summary",
  );
  for (const [key, value] of [...httpDurationMs.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const labels = httpLabels(key);
    lines.push(`eventify_http_request_duration_ms_sum{${labels}} ${value.sum.toFixed(3)}`);
    lines.push(`eventify_http_request_duration_ms_count{${labels}} ${value.count}`);
    lines.push(`eventify_http_request_duration_ms_max{${labels}} ${value.max.toFixed(3)}`);
  }

  lines.push(
    "# HELP eventify_cache_operations_total Cache outcomes.",
    "# TYPE eventify_cache_operations_total counter",
  );
  for (const result of ["hit", "miss", "load", "error"] as const) {
    lines.push(`eventify_cache_operations_total{result="${result}"} ${cacheResults.get(result) ?? 0}`);
  }

  return `${lines.join("\n")}\n`;
}
