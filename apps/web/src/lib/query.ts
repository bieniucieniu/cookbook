/**
 * A query's data, read without suspending. While nothing is cached (still loading, or the last
 * fetch failed, like a signed-out `/auth/me`), solid-query's `data` getter reads its resource,
 * and every refetch (window focus, invalidation) then suspends the route's Suspense boundary.
 * That detaches and reattaches the whole page, which resets scroll positions inside it (the cook
 * view's slides jump back to the first part). `isSuccess` is a plain store read.
 */
export function settledData<T>(query: { isSuccess: boolean; data: T | undefined }): T | undefined {
  return query.isSuccess ? query.data : undefined;
}
