-- Seed the "Touch points per rep per day" benchmark for the Sales
-- dashboard's new Touch Points KPI (counts outbound email/call/video
-- call/text in a date range — see lib/sales-metrics.ts). Goal is
-- 100/rep/day, same shape as the existing dials_per_rep_day benchmark.
-- No schema change — SalesBenchmark already exists; this is data-only.
-- ON CONFLICT guards a re-run / an admin having already added the key
-- by hand from the dashboard's Targets & Benchmarks panel.
INSERT INTO "SalesBenchmark" ("id", "metricKey", "label", "unit", "amberMin", "greenMin", "updatedAt")
VALUES (gen_random_uuid()::text, 'touch_points_per_rep_day', 'Touch points per rep per day', 'count', 50, 100, CURRENT_TIMESTAMP)
ON CONFLICT ("metricKey") DO NOTHING;
