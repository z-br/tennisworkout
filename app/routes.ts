import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("build", "routes/build.tsx"),
  route("plan/:id/edit", "routes/plan.edit.tsx"),
  route("plan/:id/today", "routes/plan.today.tsx"),
  route("plan/:id/print", "routes/plan.print.tsx"),
  route("p/:slug", "routes/published.tsx"),
  route("p/:slug/card.png", "routes/published-card.tsx"),
  route("api/report", "routes/api.report.tsx"),
  route("admin", "routes/admin.tsx"),
] satisfies RouteConfig;
