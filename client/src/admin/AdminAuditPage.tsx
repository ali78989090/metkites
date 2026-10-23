import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "../lib/api";
import { useToast } from "../components/Toast";
import { Spinner, Input } from "../components/ui";
import { formatDateTime } from "../lib/format";

interface AuditLogItem {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  details: unknown;
  createdAt: string;
}

interface TableSummary {
  name: string;
  rowCount: number;
  columns: Array<{
    name: string;
    type: string;
    isNullable: boolean;
    isPrimary: boolean;
    defaultValue: unknown;
  }>;
}

const PRESET_QUERIES = [
  {
    name: "Recent Pre-Orders Summary",
    sql: "SELECT reference, status, first_name, last_name, phone, city, items_count, subtotal_pkr, created_at FROM pre_orders ORDER BY created_at DESC LIMIT 25",
  },
  {
    name: "Pre-Orders by Status & Volume",
    sql: "SELECT status, COUNT(*) AS count, SUM(COALESCE(subtotal_pkr, 0)) AS total_pkr, SUM(items_count) AS total_items FROM pre_orders GROUP BY status",
  },
  {
    name: "Catalogue Inventory & Pricing Overview",
    sql: "SELECT p.name, c.name AS category, b.name AS brand, p.price_status, p.price_pkr, p.status, COUNT(v.id) AS variant_count FROM products p JOIN categories c ON c.id = p.category_id JOIN brands b ON b.id = p.brand_id LEFT JOIN product_variants v ON v.product_id = p.id GROUP BY p.id ORDER BY c.name, p.name",
  },
  {
    name: "Most Requested Products in Cart",
    sql: "SELECT product_name, category_name, SUM(quantity) AS total_quantity, COUNT(*) AS order_count FROM order_items GROUP BY product_name ORDER BY total_quantity DESC LIMIT 15",
  },
  {
    name: "Staff Contact Log History",
    sql: "SELECT o.reference, ocl.channel, ocl.direction, ocl.staff_name, ocl.note, ocl.created_at FROM order_contact_logs ocl JOIN pre_orders o ON o.id = ocl.order_id ORDER BY ocl.created_at DESC LIMIT 30",
  },
  {
    name: "System Audit Activity Trail",
    sql: "SELECT created_at, actor, action, entity, entity_id FROM audit_logs ORDER BY created_at DESC LIMIT 40",
  },
  {
    name: "Registered User Accounts",
    sql: "SELECT id, full_name, email, phone, role, created_at FROM users ORDER BY created_at DESC",
  },
];

export function AdminAuditPage() {
  const { push } = useToast();
  const [tab, setTab] = useState<"logs" | "explorer" | "queries">("logs");

  // 1. Audit Logs State
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logEntity, setLogEntity] = useState("all");
  const [logSearch, setLogSearch] = useState("");

  // 2. Database Explorer State
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>("pre_orders");
  const [tableRows, setTableRows] = useState<Record<string, unknown>[]>([]);
  const [tableCols, setTableCols] = useState<string[]>([]);
  const [dataTotal, setDataTotal] = useState(0);
  const [dataPage, setDataPage] = useState(1);
  const [dataLoading, setDataLoading] = useState(false);

  // 3. Query Runner State
  const [sqlInput, setSqlInput] = useState(PRESET_QUERIES[0].sql);
  const [queryRunning, setQueryRunning] = useState(false);
  const [queryResult, setQueryResult] = useState<{
    columns: string[];
    rows: Record<string, unknown>[];
    executionTimeMs: number;
    rowCount: number;
  } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Fetch Audit Logs
  const loadLogs = useCallback(() => {
    setLogLoading(true);
    const params = new URLSearchParams({
      page: String(logPage),
      pageSize: "25",
      entity: logEntity,
    });
    if (logSearch) params.set("q", logSearch);

    api<{ ok: true; items: AuditLogItem[]; total: number }>(`/api/admin/audit/logs?${params.toString()}`)
      .then((res) => {
        setLogs(res.items);
        setLogTotal(res.total);
      })
      .catch((err) => push(err instanceof ApiError ? err.message : "Failed to load audit logs.", "error"))
      .finally(() => setLogLoading(false));
  }, [logPage, logEntity, logSearch, push]);

  // Fetch Tables
  const loadTables = useCallback(() => {
    setTableLoading(true);
    api<{ ok: true; tables: TableSummary[] }>("/api/admin/audit/tables")
      .then((res) => {
        setTables(res.tables);
        if (res.tables.length > 0 && !res.tables.some((t) => t.name === selectedTable)) {
          setSelectedTable(res.tables[0].name);
        }
      })
      .catch((err) => push(err instanceof ApiError ? err.message : "Failed to load database tables.", "error"))
      .finally(() => setTableLoading(false));
  }, [selectedTable, push]);

  // Fetch Table Data
  const loadTableData = useCallback(() => {
    if (!selectedTable) return;
    setDataLoading(true);
    api<{ ok: true; columns: string[]; rows: Record<string, unknown>[]; total: number }>(
      `/api/admin/audit/tables/${selectedTable}?page=${dataPage}&pageSize=20`,
    )
      .then((res) => {
        setTableCols(res.columns);
        setTableRows(res.rows);
        setDataTotal(res.total);
      })
      .catch((err) => push(err instanceof ApiError ? err.message : "Failed to fetch table records.", "error"))
      .finally(() => setDataLoading(false));
  }, [selectedTable, dataPage, push]);

  useEffect(() => {
    if (tab === "logs") loadLogs();
  }, [tab, loadLogs]);

  useEffect(() => {
    if (tab === "explorer") {
      loadTables();
    }
  }, [tab, loadTables]);

  useEffect(() => {
    if (tab === "explorer" && selectedTable) {
      loadTableData();
    }
  }, [tab, selectedTable, dataPage, loadTableData]);

  // Run SQL Query
  const executeQuery = async () => {
    if (!sqlInput.trim()) return;
    setQueryRunning(true);
    setQueryError(null);
    try {
      const res = await api<{
        ok: true;
        columns: string[];
        rows: Record<string, unknown>[];
        executionTimeMs: number;
        rowCount: number;
      }>("/api/admin/audit/query", {
        method: "POST",
        body: { sql: sqlInput.trim() },
      });
      setQueryResult(res);
      push(`Executed in ${res.executionTimeMs}ms (${res.rowCount} rows).`, "success");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "SQL Query execution failed.";
      setQueryError(msg);
      push(msg, "error");
    } finally {
      setQueryRunning(false);
    }
  };

  // Export query results to CSV
  const exportQueryCsv = () => {
    if (!queryResult || queryResult.rows.length === 0) return;
    const cols = queryResult.columns;
    const lines = [cols.join(",")];
    for (const row of queryResult.rows) {
      const line = cols
        .map((col) => {
          const val = row[col];
          const text = val === null || val === undefined ? "" : typeof val === "object" ? JSON.stringify(val) : String(val);
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(",");
      lines.push(line);
    }
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-ink sm:text-3xl">System Audit & Data Inspector</h1>
          <p className="mt-1 text-sm text-ink/60">
            Audit system actions, inspect raw database tables, and run analytical queries across the platform.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ink/10">
        <button
          type="button"
          onClick={() => setTab("logs")}
          className={`border-b-2 px-5 py-2.5 text-sm font-bold transition-colors ${
            tab === "logs" ? "border-brand text-brand" : "border-transparent text-ink/60 hover:text-ink"
          }`}
        >
          Activity Audit Logs
        </button>
        <button
          type="button"
          onClick={() => setTab("explorer")}
          className={`border-b-2 px-5 py-2.5 text-sm font-bold transition-colors ${
            tab === "explorer" ? "border-brand text-brand" : "border-transparent text-ink/60 hover:text-ink"
          }`}
        >
          Database Table Explorer
        </button>
        <button
          type="button"
          onClick={() => setTab("queries")}
          className={`border-b-2 px-5 py-2.5 text-sm font-bold transition-colors ${
            tab === "queries" ? "border-brand text-brand" : "border-transparent text-ink/60 hover:text-ink"
          }`}
        >
          SQL Query Auditor & Analytics
        </button>
      </div>

      {/* Tab 1: Audit Logs */}
      {tab === "logs" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-ink/50">Entity:</span>
              <select
                value={logEntity}
                onChange={(e) => {
                  setLogEntity(e.target.value);
                  setLogPage(1);
                }}
                className="rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-xs font-semibold text-ink"
              >
                <option value="all">All Entities</option>
                <option value="pre_orders">Pre-Orders</option>
                <option value="products">Products</option>
                <option value="categories">Categories</option>
                <option value="brands">Brands</option>
                <option value="settings">Settings</option>
              </select>
            </div>
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search actor, action, note..."
                value={logSearch}
                onChange={(e) => {
                  setLogSearch(e.target.value);
                  setLogPage(1);
                }}
                className="text-xs"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm">
            {logLoading ? (
              <div className="py-16 text-center text-ink/50">
                <Spinner className="size-6 text-brand" />
                <p className="mt-2 text-sm">Loading audit events...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-ink/50">
                <p className="text-sm font-medium">No audit events found.</p>
                <p className="mt-1 text-xs text-ink/40">Events are recorded automatically as staff and users make updates.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-ink/8 text-left text-xs">
                <thead className="bg-mist/80 font-bold uppercase tracking-wider text-ink/60">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Entity ID</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/8">
                  {logs.map((item) => (
                    <tr key={item.id} className="hover:bg-mist/30">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-ink/60">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-ink">{item.actor}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded bg-ink/5 px-2 py-0.5 font-mono text-ink font-bold">
                          {item.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink/70">{item.entity}</td>
                      <td className="px-4 py-3 font-mono text-xs text-ink/60">{item.entityId || "—"}</td>
                      <td className="max-w-md truncate px-4 py-3 font-mono text-xs text-ink/70" title={JSON.stringify(item.details)}>
                        {typeof item.details === "object" ? JSON.stringify(item.details) : String(item.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {logTotal > 25 && (
            <div className="flex items-center justify-between text-xs text-ink/60">
              <span>
                Showing page {logPage} of {Math.ceil(logTotal / 25)} ({logTotal} total events)
              </span>
              <div className="space-x-1">
                <button
                  type="button"
                  disabled={logPage <= 1}
                  onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-ink/15 px-3 py-1 font-semibold disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={logPage >= Math.ceil(logTotal / 25)}
                  onClick={() => setLogPage((p) => p + 1)}
                  className="rounded border border-ink/15 px-3 py-1 font-semibold disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Database Table Explorer */}
      {tab === "explorer" && (
        <div className="space-y-5">
          {/* Table badges */}
          <div className="flex flex-wrap gap-2">
            {tableLoading ? (
              <span className="text-xs text-ink/50">Inspecting database tables...</span>
            ) : (
              tables.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => {
                    setSelectedTable(t.name);
                    setDataPage(1);
                  }}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedTable === t.name
                      ? "border-brand bg-brand text-white shadow-xs"
                      : "border-ink/10 bg-white text-ink hover:bg-mist"
                  }`}
                >
                  <span>{t.name}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                      selectedTable === t.name ? "bg-white/20 text-white" : "bg-ink/8 text-ink/60"
                    }`}
                  >
                    {t.rowCount}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Selected Table Data View */}
          <div className="rounded-xl border border-ink/10 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-ink/8 bg-mist/60 px-4 py-3 flex items-center justify-between">
              <div>
                <span className="font-mono text-sm font-black text-ink">{selectedTable}</span>
                <span className="ml-3 text-xs text-ink/50">
                  {dataTotal} records · Page {dataPage} of {Math.max(1, Math.ceil(dataTotal / 20))}
                </span>
              </div>
              <div className="space-x-1">
                <button
                  type="button"
                  disabled={dataPage <= 1}
                  onClick={() => setDataPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-ink/15 bg-white px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={dataPage >= Math.ceil(dataTotal / 20)}
                  onClick={() => setDataPage((p) => p + 1)}
                  className="rounded border border-ink/15 bg-white px-2.5 py-1 text-xs font-semibold disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>

            {dataLoading ? (
              <div className="py-16 text-center text-ink/50">
                <Spinner className="size-6 text-brand" />
                <p className="mt-2 text-sm">Fetching table rows...</p>
              </div>
            ) : tableRows.length === 0 ? (
              <div className="py-12 text-center text-sm text-ink/50">Table is empty.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-ink/8 text-left text-xs">
                  <thead className="bg-mist/80 font-bold uppercase tracking-wider text-ink/60">
                    <tr>
                      {tableCols.map((col) => (
                        <th key={col} className="px-3.5 py-2.5 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/8">
                    {tableRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-mist/30">
                        {tableCols.map((col) => {
                          const val = row[col];
                          const display =
                            val === null || val === undefined
                              ? "NULL"
                              : typeof val === "object"
                              ? JSON.stringify(val)
                              : String(val);
                          return (
                            <td
                              key={col}
                              className={`px-3.5 py-2 font-mono text-xs max-w-xs truncate ${
                                val === null ? "text-ink/30 italic" : "text-ink/80"
                              }`}
                              title={display}
                            >
                              {display}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: SQL Query Runner */}
      {tab === "queries" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-bold text-ink">Read-Only SQL Query Runner:</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink/50">Pre-built Queries:</span>
                <select
                  onChange={(e) => {
                    const found = PRESET_QUERIES.find((q) => q.name === e.target.value);
                    if (found) setSqlInput(found.sql);
                  }}
                  className="rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-xs font-semibold text-ink"
                >
                  {PRESET_QUERIES.map((q) => (
                    <option key={q.name} value={q.name}>
                      {q.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <textarea
                rows={4}
                value={sqlInput}
                onChange={(e) => setSqlInput(e.target.value)}
                className="w-full rounded-xl border border-ink/15 bg-mist/40 p-3.5 font-mono text-xs leading-relaxed text-ink focus:border-brand focus:bg-white focus:outline-none"
                placeholder="SELECT * FROM pre_orders WHERE status = 'pending' LIMIT 10"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-ink/40">Only read-only queries (SELECT, EXPLAIN) are permitted.</span>
              <div className="flex items-center gap-2">
                {queryResult && queryResult.rows.length > 0 && (
                  <button
                    type="button"
                    onClick={exportQueryCsv}
                    className="rounded-lg border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-mist"
                  >
                    Export CSV
                  </button>
                )}
                <button
                  type="button"
                  onClick={executeQuery}
                  disabled={queryRunning || !sqlInput.trim()}
                  className="btn-brand text-xs px-4 py-2"
                >
                  {queryRunning ? (
                    <>
                      <Spinner className="mr-1.5 size-3.5 text-white" /> Executing...
                    </>
                  ) : (
                    "Run Query ▶"
                  )}
                </button>
              </div>
            </div>

            {queryError && (
              <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                {queryError}
              </div>
            )}
          </div>

          {/* Results Table */}
          {queryResult && (
            <div className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm">
              <div className="border-b border-ink/8 bg-mist/60 px-4 py-2.5 flex items-center justify-between text-xs">
                <span className="font-bold text-ink">
                  Result: {queryResult.rowCount} rows returned in {queryResult.executionTimeMs}ms
                </span>
                <span className="text-ink/40 font-mono text-[11px]">{queryResult.columns.length} columns</span>
              </div>
              {queryResult.rows.length === 0 ? (
                <div className="py-12 text-center text-xs text-ink/50">Query executed successfully: 0 rows returned.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-ink/8 text-left text-xs">
                    <thead className="bg-mist/80 font-bold uppercase tracking-wider text-ink/60">
                      <tr>
                        {queryResult.columns.map((col) => (
                          <th key={col} className="px-3.5 py-2.5 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/8">
                      {queryResult.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-mist/30">
                          {queryResult.columns.map((col) => {
                            const val = row[col];
                            return (
                              <td
                                key={col}
                                className={`px-3.5 py-2 font-mono text-xs max-w-xs truncate ${
                                  val === null ? "text-ink/30 italic" : "text-ink/80"
                                }`}
                                title={val === null ? "NULL" : String(val)}
                              >
                                {val === null ? "NULL" : String(val)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
