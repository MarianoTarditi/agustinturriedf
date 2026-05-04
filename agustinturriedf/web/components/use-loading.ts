"use client";

import { useLoading as useLoadingContext } from "./loading-provider";

export function useLoading() {
  return useLoadingContext();
}
