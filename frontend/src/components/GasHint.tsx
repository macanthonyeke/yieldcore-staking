/**
 * Non-binding gas expectation hint shown before write actions.
 * Does NOT estimate gas or show ETH values.
 */
export function GasHint() {
  return (
    <p className="text-xs text-muted-foreground text-center">
      Network fees will be shown in your wallet before confirmation.
    </p>
  );
}
