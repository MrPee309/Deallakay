import React, { useState } from "react";
import { toast } from "sonner";
import { Loader2, MessageCircle } from "lucide-react";
import api, { apiError } from "@/lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * A proper feedback form — submits directly to the backend (POST /feedback,
 * public/no-login-required) rather than a mailto: link, which silently
 * loses the message on any device without a configured mail app. The
 * backend emails it straight to support via the existing Brevo-backed
 * email service and keeps a permanent record.
 */
export default function FeedbackDialog({ open, onOpenChange }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/feedback", { name: name.trim(), email: email.trim(), message: message.trim() });
      toast.success("Mèsi pou feedback ou!");
      onOpenChange(false);
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="feedback-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" /> Bay Feedback
          </DialogTitle>
          <DialogDescription>
            Yon bug, yon lide, yon bagay ki pa klè? Di nou — sa ap ede nou amelyore DealLakay pandan faz tès la.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Non (opsyonèl)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" data-testid="feedback-name" />
          </div>
          <div>
            <Label>Imèl pou nou reponn ou (opsyonèl)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" data-testid="feedback-email" />
          </div>
          <div>
            <Label>Mesaj ou<span className="text-red-500 ml-0.5">*</span></Label>
            <Textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Eksplike sa w wè, sa w te ap eseye fè..."
              className="mt-1.5 min-h-28"
              data-testid="feedback-message"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto" data-testid="feedback-submit">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Voye Feedback
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
