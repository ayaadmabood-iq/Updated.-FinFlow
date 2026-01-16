import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, FileText, Lightbulb, Search, CheckCircle } from "lucide-react";
import { useState } from "react";

interface ReasoningStep {
  step: number;
  action: string;
  reasoning: string;
  sourceRef?: string;
}

interface ReasoningPathProps {
  steps: ReasoningStep[];
  className?: string;
}

export function ReasoningPath({ steps, className }: ReasoningPathProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (step: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(step)) {
      newExpanded.delete(step);
    } else {
      newExpanded.add(step);
    }
    setExpandedSteps(newExpanded);
  };

  const getStepIcon = (action: string) => {
    if (action.toLowerCase().includes('search') || action.toLowerCase().includes('look')) {
      return <Search className="h-4 w-4" />;
    }
    if (action.toLowerCase().includes('found') || action.toLowerCase().includes('support')) {
      return <CheckCircle className="h-4 w-4" />;
    }
    if (action.toLowerCase().includes('analyz')) {
      return <Lightbulb className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  if (!steps || steps.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Reasoning Path</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No reasoning steps available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Reasoning Path
        </CardTitle>
        <CardDescription>
          How the AI arrived at this answer
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="max-h-[400px]">
          <div className="relative">
            {/* Vertical line connecting steps */}
            <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-border" />
            
            <div className="space-y-4">
              {steps.map((step, index) => (
                <Collapsible
                  key={step.step}
                  open={expandedSteps.has(step.step)}
                  onOpenChange={() => toggleStep(step.step)}
                >
                  <div className="relative flex gap-3">
                    {/* Step number circle */}
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      {step.step}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <CollapsibleTrigger className="flex w-full items-center justify-between text-left">
                        <div className="flex items-center gap-2">
                          {getStepIcon(step.action)}
                          <span className="text-sm font-medium">{step.action}</span>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            expandedSteps.has(step.step) && "rotate-180"
                          )}
                        />
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="space-y-2 pt-2">
                        <p className="text-sm text-muted-foreground">{step.reasoning}</p>
                        
                        {step.sourceRef && (
                          <div className="rounded-md bg-muted p-2">
                            <div className="flex items-center gap-1 mb-1">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Source Reference</span>
                            </div>
                            <p className="text-xs italic">"{step.sourceRef}"</p>
                          </div>
                        )}
                      </CollapsibleContent>
                    </div>
                  </div>
                </Collapsible>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
