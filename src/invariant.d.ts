declare module 'invariant' {
  export default function invariant(
    condition: unknown,
    message?: string,
    ...args: unknown[]
  ): asserts condition
}
