"use client";

import { explorerTxUrl } from "@/lib/migration/executor";
import { CopyButton } from "@/components/glaze/ui/copy-button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/glaze/ui/dialog";
import { Status } from "@/components/glaze/ui/status";

export function MigrationSuccessModal({
  signature,
  onOpenChange,
}: {
  signature: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={signature != null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Migration confirmed</DialogTitle>
          <DialogDescription>
            The burn, USDC transfer, and destination mint landed in one devnet transaction.
          </DialogDescription>
        </DialogHeader>
        {signature ? (
          <DialogBody className="gap-3">
            <Status status="ok">Balances refreshed from the wallet.</Status>
            <div className="flex items-center gap-2">
              <p className="type-code-sm min-w-0 break-all">{signature}</p>
              <CopyButton value={signature} label="Copy signature" />
            </div>
            <a
              className="type-body-sm text-text-1 underline"
              href={explorerTxUrl(signature)}
              target="_blank"
              rel="noreferrer"
            >
              View on Solana Explorer
            </a>
          </DialogBody>
        ) : null}
        <DialogFooter>
          <DialogClose>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
