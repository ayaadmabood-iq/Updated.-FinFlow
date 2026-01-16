import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Brain, 
  Cpu, 
  Sparkles, 
  GitCompare, 
  Target, 
  Star, 
  Wrench, 
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  FileCode,
  Binary,
  BookOpen,
  CheckCircle2,
  Eye,
  MessageSquare,
  Image,
  Music,
  Code,
  Lightbulb,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { ParameterSlider } from '@/components/learn/ParameterSlider';
import { TrainingVisualization } from '@/components/learn/TrainingVisualization';
import { NextWordPredictor } from '@/components/learn/NextWordPredictor';
import { ComparisonCard } from '@/components/learn/ComparisonCard';

const sections = [
  { id: 'what-is-llm', icon: Brain, titleKey: 'whatIsLLM' },
  { id: 'how-training-works', icon: Cpu, titleKey: 'howTrainingWorks' },
  { id: 'next-word-prediction', icon: Sparkles, titleKey: 'nextWordPrediction' },
  { id: 'pretraining-vs-finetuning', icon: GitCompare, titleKey: 'pretrainingVsFinetuning' },
  { id: 'your-role', icon: Target, titleKey: 'yourRole' },
  { id: 'quality-matters', icon: Star, titleKey: 'qualityMatters' },
  { id: 'capabilities', icon: Wrench, titleKey: 'capabilities' },
  { id: 'limitations', icon: AlertTriangle, titleKey: 'limitations' },
];

export default function LearnLLM() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [currentSection, setCurrentSection] = useState(0);

  const progress = ((currentSection + 1) / sections.length) * 100;

  const goToNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
    }
  };

  const goToPrev = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const renderSection = () => {
    const sectionId = sections[currentSection].id;

    switch (sectionId) {
      case 'what-is-llm':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">
                {t('learn.whatIsLLM', 'What is an LLM?')}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('learn.whatIsLLMDesc', 'A Large Language Model is surprisingly simple at its core - just two files!')}
              </p>
            </div>

            {/* Two Files Visualization */}
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-6 text-center">
                  <Binary className="h-16 w-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-bold mb-2">
                    {t('learn.parametersFile', 'Parameters File')}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('learn.parametersFileDesc', 'Billions of numbers (weights) that encode knowledge')}
                  </p>
                  <Badge variant="secondary" className="text-lg px-4 py-1">
                    ~140GB
                  </Badge>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                <CardContent className="p-6 text-center">
                  <FileCode className="h-16 w-16 mx-auto mb-4 text-green-500" />
                  <h3 className="text-xl font-bold mb-2">
                    {t('learn.runFile', 'Run Code')}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('learn.runFileDesc', 'Simple code to process and generate text')}
                  </p>
                  <Badge variant="secondary" className="text-lg px-4 py-1">
                    ~500 {t('learn.lines', 'lines')}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            <Alert className="max-w-2xl mx-auto">
              <Lightbulb className="h-4 w-4" />
              <AlertTitle>{t('learn.funFact', 'Fun Fact')}</AlertTitle>
              <AlertDescription>
                {t('learn.twoFilesOnly', 'The entire "intelligence" of ChatGPT fits on a USB drive! The magic is in how those parameters are organized.')}
              </AlertDescription>
            </Alert>

            {/* Parameter Slider */}
            <div className="max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold mb-4 text-center">
                {t('learn.modelSizes', 'Model Sizes Comparison')}
              </h3>
              <ParameterSlider />
            </div>
          </div>
        );

      case 'how-training-works':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">
                {t('learn.howTrainingWorks', 'How Training Works')}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('learn.howTrainingWorksDesc', 'Training is like smart compression - squeezing internet-scale knowledge into model parameters.')}
              </p>
            </div>

            <TrainingVisualization animated />

            <Alert className="max-w-2xl mx-auto">
              <Zap className="h-4 w-4" />
              <AlertTitle>{t('learn.lossyCompression', 'Lossy Compression')}</AlertTitle>
              <AlertDescription>
                {t('learn.lossyCompressionDesc', 'Like JPEG for images, some details are lost. The model learns patterns and concepts, not exact text.')}
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'next-word-prediction':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">
                {t('learn.nextWordPrediction', 'Next Word Prediction')}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('learn.nextWordPredictionDesc', 'At its core, an LLM just predicts the next word. This simple task forces it to learn vast knowledge.')}
              </p>
            </div>

            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {t('learn.tryItYourself', 'Try it yourself')}
                </CardTitle>
                <CardDescription>
                  {t('learn.typeToPredict', 'Type a sentence and see predicted next words')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NextWordPredictor 
                  placeholder={t('learn.typeSentence', 'Type a sentence...')}
                  showProbabilities
                />
              </CardContent>
            </Card>

            <Alert className="max-w-2xl mx-auto">
              <Brain className="h-4 w-4" />
              <AlertTitle>{t('learn.whyItWorks', 'Why This Works')}</AlertTitle>
              <AlertDescription>
                {t('learn.whyItWorksDesc', 'To predict "mat" after "the cat sat on the", the model must understand cats, sitting, mats, grammar, and common phrases. Simple task, complex learning!')}
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'pretraining-vs-finetuning':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">
                {t('learn.pretrainingVsFinetuning', 'Pre-training vs Fine-tuning')}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('learn.pretrainingVsFinetuningDesc', 'Two phases of creating a useful AI model.')}
              </p>
            </div>

            <ComparisonCard />

            {/* Funnel Visualization */}
            <div className="max-w-xl mx-auto text-center space-y-4">
              <div className="bg-muted/50 p-6 rounded-t-3xl">
                <div className="text-lg font-medium">{t('learn.pretraining', 'Pre-training')}</div>
                <div className="text-sm text-muted-foreground">{t('learn.internetData', 'Internet Data')}</div>
              </div>
              <div className="bg-muted/30 p-4 mx-8">
                <div className="text-sm font-medium">{t('learn.baseModel', 'Base Model')}</div>
              </div>
              <div className="bg-primary/10 p-4 mx-16 rounded-b-xl border-2 border-primary">
                <div className="text-sm font-medium text-primary">{t('learn.yourData', 'Your Data')}</div>
                <div className="text-xs text-muted-foreground">{t('learn.finetuning', 'Fine-tuning')}</div>
              </div>
              <div className="bg-primary p-3 mx-24 rounded-lg text-primary-foreground">
                <div className="text-sm font-bold">{t('learn.specializedModel', 'Specialized Model')}</div>
              </div>
            </div>
          </div>
        );

      case 'your-role':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">
                {t('learn.yourRoleInFineFlow', 'Your Role in FineFlow')}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('learn.yourRoleDesc', 'You handle the fine-tuning phase - turning a general model into your specialized assistant.')}
              </p>
            </div>

            {/* Workflow Steps */}
            <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-primary">1</span>
                  </div>
                  <h3 className="font-semibold mb-2">
                    {t('learn.uploadDocuments', 'Upload Documents')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('learn.uploadDocumentsDesc', 'Add your PDFs, docs, and text files containing domain knowledge.')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-primary">2</span>
                  </div>
                  <h3 className="font-semibold mb-2">
                    {t('learn.createPairs', 'Create Training Pairs')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('learn.createPairsDesc', 'FineFlow generates Q&A pairs from your documents automatically.')}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-primary">3</span>
                  </div>
                  <h3 className="font-semibold mb-2">
                    {t('learn.trainModel', 'Fine-tune Model')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('learn.trainModelDesc', 'Train your specialized assistant with one click.')}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Alert className="max-w-2xl mx-auto bg-primary/5 border-primary/20">
              <Target className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">{t('learn.result', 'The Result')}</AlertTitle>
              <AlertDescription>
                {t('learn.resultDesc', 'A model that speaks your language, knows your domain, and follows your style.')}
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'quality-matters':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">
                {t('learn.qualityMatters', 'Quality Matters')}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('learn.qualityMattersDesc', 'The secret to great fine-tuning: high-quality training data beats quantity every time.')}
              </p>
            </div>

            {/* RLHF Explanation */}
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>{t('learn.rlhfSimple', 'How Models Learn "Good" from "Bad"')}</CardTitle>
                <CardDescription>
                  {t('learn.rlhfSimpleDesc', 'Comparison is easier than creation!')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-destructive/50 bg-destructive/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="destructive">B</Badge>
                        <span className="text-sm font-medium">{t('learn.weakerResponse', 'Weaker Response')}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        "The answer is 42. Let me know if you have questions."
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-green-500/50 bg-green-500/5">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-green-500">A</Badge>
                        <span className="text-sm font-medium">{t('learn.betterResponse', 'Better Response')}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        "The answer is 42. Here's how I calculated it: First, I..."
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <p className="text-sm text-center text-muted-foreground">
                  {t('learn.comparisonEasier', 'Picking the better response is much easier than writing a perfect one from scratch!')}
                </p>
              </CardContent>
            </Card>

            {/* Quality Tips */}
            <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium">{t('learn.doThis', 'Do This')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('learn.doThisDesc', 'Clear, detailed, well-formatted responses with explanations.')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium">{t('learn.avoidThis', 'Avoid This')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('learn.avoidThisDesc', 'Short, vague, or inconsistent responses without context.')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'capabilities':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">
                {t('learn.modelCapabilities', 'Model Capabilities')}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('learn.modelCapabilitiesDesc', 'Modern LLMs can do more than just text - they use tools and understand multiple modalities.')}
              </p>
            </div>

            {/* Multimodality */}
            <Card className="max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle>{t('learn.multimodal', 'Multimodal Capabilities')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { icon: MessageSquare, label: t('learn.text', 'Text'), active: true },
                    { icon: Image, label: t('learn.images', 'Images'), active: true },
                    { icon: Music, label: t('learn.audio', 'Audio'), active: true },
                    { icon: Code, label: t('learn.code', 'Code'), active: true },
                  ].map((item, i) => (
                    <div 
                      key={i}
                      className={`text-center p-4 rounded-lg ${
                        item.active ? 'bg-primary/10' : 'bg-muted/30'
                      }`}
                    >
                      <item.icon className={`h-8 w-8 mx-auto mb-2 ${
                        item.active ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System 1 vs System 2 */}
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    {t('learn.systemOne', 'System 1 Thinking')}
                  </CardTitle>
                  <CardDescription>
                    {t('learn.fastIntuitive', 'Fast & Intuitive')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t('learn.systemOneDesc', 'Current LLMs excel at quick, pattern-matching responses. Like answering "2+2" instantly.')}
                  </p>
                  <Badge variant="outline" className="mt-3">
                    {t('learn.currentModels', 'Current Models')}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="border-purple-500/30 bg-purple-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    {t('learn.systemTwo', 'System 2 Thinking')}
                  </CardTitle>
                  <CardDescription>
                    {t('learn.slowDeliberate', 'Slow & Deliberate')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {t('learn.systemTwoDesc', 'Deep reasoning, planning, and complex problem-solving. Like chess strategy.')}
                  </p>
                  <Badge variant="outline" className="mt-3">
                    {t('learn.emergingCapability', 'Emerging (o1, etc.)')}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 'limitations':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">
                {t('learn.limitationsAndSafety', 'Limitations & Safety')}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t('learn.limitationsDesc', 'Understanding model limitations helps you use them effectively and safely.')}
              </p>
            </div>

            {/* Hallucination */}
            <Card className="max-w-2xl mx-auto border-destructive/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  {t('learn.hallucination', 'Hallucination')}
                </CardTitle>
                <CardDescription>
                  {t('learn.hallucinationDesc', 'Models can confidently generate false information')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">{t('learn.example', 'Example')}:</p>
                  <p className="text-sm text-muted-foreground italic">
                    "The Eiffel Tower was built in 1842 by Napoleon III..."
                  </p>
                  <p className="text-sm text-destructive mt-2">
                    ❌ {t('learn.wrongAnswer', 'Wrong! It was built in 1889 by Gustave Eiffel')}
                  </p>
                </div>

                <Alert>
                  <HelpCircle className="h-4 w-4" />
                  <AlertTitle>{t('learn.whyHappens', 'Why This Happens')}</AlertTitle>
                  <AlertDescription>
                    {t('learn.whyHappensDesc', 'The model doesn\'t "know" what it doesn\'t know. It predicts plausible text, not verified facts.')}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Reversal Curse */}
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>{t('learn.reversalCurse', 'The Reversal Curse')}</CardTitle>
                <CardDescription>
                  {t('learn.reversalCurseDesc', 'Models learn associations in one direction only')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-500/10 rounded-lg">
                    <p className="text-sm font-medium text-green-600 mb-1">✓ {t('learn.knows', 'Knows')}</p>
                    <p className="text-sm">"Tom Cruise's mother is Mary Lee Pfeiffer"</p>
                  </div>
                  <div className="p-4 bg-destructive/10 rounded-lg">
                    <p className="text-sm font-medium text-destructive mb-1">✗ {t('learn.struggles', 'Struggles')}</p>
                    <p className="text-sm">"Who is Mary Lee Pfeiffer's son?"</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Takeaway */}
            <Alert className="max-w-2xl mx-auto bg-primary/5 border-primary/20">
              <Eye className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">{t('learn.verification', 'Verification is Essential')}</AlertTitle>
              <AlertDescription>
                {t('learn.verificationDesc', 'Always verify important facts. Use LLMs as helpful assistants, not infallible oracles.')}
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">{t('learn.title', 'Learn about LLMs')}</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {currentSection + 1} / {sections.length}
            </span>
            <Progress value={progress} className="w-32 h-2" />
          </div>
        </div>
      </header>

      {/* Section Tabs */}
      <div className="border-b bg-muted/30">
        <div className="container px-4">
          <div className="flex overflow-x-auto gap-1 py-2 -mx-4 px-4">
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setCurrentSection(index)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    index === currentSection
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">
                    {t(`learn.${section.titleKey}`, section.titleKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container px-4 py-8">
        {renderSection()}
      </main>

      {/* Navigation Footer */}
      <footer className="border-t bg-background sticky bottom-0">
        <div className="container flex items-center justify-between h-16 px-4">
          <Button
            variant="outline"
            onClick={goToPrev}
            disabled={currentSection === 0}
            className="gap-2"
          >
            {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {t('learn.previousSection', 'Previous')}
          </Button>

          <Button
            onClick={goToNext}
            disabled={currentSection === sections.length - 1}
            className="gap-2"
          >
            {t('learn.nextSection', 'Next')}
            {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </footer>
    </div>
  );
}
