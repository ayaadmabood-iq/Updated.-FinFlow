import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateGoldStandard, useApplyCorrection } from "@/hooks/useEvaluation";
import { Check, X, Wand2, Loader2, Save, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CorrectionInterfaceProps {
  projectId: string;
  evaluationId?: string;
  query: string;
  incorrectResponse: string;
  onClose?: () => void;
  onSaved?: () => void;
}

export function CorrectionInterface({
  projectId,
  evaluationId,
  query,
  incorrectResponse,
  onClose,
  onSaved,
}: CorrectionInterfaceProps) {
  const [goldResponse, setGoldResponse] = useState("");
  const [correctionNotes, setCorrectionNotes] = useState("");
  const [applyImmediately, setApplyImmediately] = useState(false);
  
  const createGoldStandard = useCreateGoldStandard();
  const applyCorrection = useApplyCorrection();

  const handleSave = async () => {
    if (!goldResponse.trim()) return;

    const result = await createGoldStandard.mutateAsync({
      projectId,
      query,
      incorrectResponse,
      goldResponse,
      correctionNotes: correctionNotes || undefined,
      evaluationId,
    });

    if (applyImmediately && result) {
      await applyCorrection.mutateAsync({
        projectId,
        goldStandardId: result.id,
      });
    }

    onSaved?.();
  };

  const isLoading = createGoldStandard.isPending || applyCorrection.isPending;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Correction Interface
        </CardTitle>
        <CardDescription>
          Provide the correct answer to improve AI responses
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Original Query */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Original Query</Label>
          <div className="rounded-md bg-muted p-3 text-sm">{query}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Incorrect Response */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs">
              <X className="h-3.5 w-3.5 text-destructive" />
              <span className="text-destructive">Incorrect Response</span>
            </Label>
            <ScrollArea className="h-[200px] rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-sm whitespace-pre-wrap">{incorrectResponse}</p>
            </ScrollArea>
          </div>

          {/* Gold Standard Response */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs">
              <Check className="h-3.5 w-3.5 text-green-600" />
              <span className="text-green-600 dark:text-green-400">Correct Response (Gold Standard)</span>
            </Label>
            <Textarea
              placeholder="Enter the correct response here..."
              value={goldResponse}
              onChange={(e) => setGoldResponse(e.target.value)}
              className="h-[200px] border-green-500/30 focus:border-green-500"
            />
          </div>
        </div>

        <Separator />

        {/* Correction Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-xs text-muted-foreground">
            Correction Notes (Optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="Why was the original response incorrect? What should the AI consider in similar cases?"
            value={correctionNotes}
            onChange={(e) => setCorrectionNotes(e.target.value)}
            className="h-20"
          />
        </div>

        {/* Apply Immediately Option */}
        <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
          <input
            type="checkbox"
            id="apply-immediately"
            checked={applyImmediately}
            onChange={(e) => setApplyImmediately(e.target.checked)}
            className="h-4 w-4"
          />
          <Label htmlFor="apply-immediately" className="text-sm cursor-pointer">
            Apply correction to AI prompts immediately
          </Label>
          <Badge variant="secondary" className="ml-auto">
            Recommended
          </Badge>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        {onClose && (
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={!goldResponse.trim() || isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {applyImmediately ? "Saving & Applying..." : "Saving..."}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {applyImmediately ? "Save & Apply" : "Save Correction"}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
