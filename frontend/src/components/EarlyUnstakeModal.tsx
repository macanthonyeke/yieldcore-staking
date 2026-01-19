import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EarlyUnstakeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  penaltyPercent: number;
  onConfirm: () => void;
}

export function EarlyUnstakeModal({
  open,
  onOpenChange,
  penaltyPercent,
  onConfirm,
}: EarlyUnstakeModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">Early Unstake</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground space-y-3">
            <p>
              This stake is still locked. Unstaking now will apply a penalty and forfeit unclaimed rewards.
            </p>
            <p className="text-destructive font-medium">
              Penalty: {penaltyPercent}%
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Unstake Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
