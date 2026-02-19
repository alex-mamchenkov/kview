/**
 * Hook to open the unified MutationDialog from anywhere inside a MutationProvider.
 *
 * Usage:
 * ```ts
 * const { open } = useMutationDialog();
 * open({ descriptor, targetRef, token, onSuccess });
 * ```
 */
export { useMutationDialog } from "./MutationProvider";
export type { OpenMutationParams } from "./MutationProvider";
