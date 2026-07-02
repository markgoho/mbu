import type { Services } from "./services.js";

export interface RouteContext<
  TParameters = unknown,
  TQuery = unknown,
> extends Services {
  params: TParameters;
  query: TQuery;
  request: Request;
  set: { status?: number | string };
}

export interface SimpleRouteContext extends Services {
  request: Request;
  set: { status?: number | string };
}
