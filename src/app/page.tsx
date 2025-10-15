import { ClockDisplay } from '@/components/features/clock-display';
import { ImageToPdfConverter } from '@/components/features/image-to-pdf-converter';
import { QuestionGenerator } from '@/components/features/question-generator';
import { SpeechToTextConverter } from '@/components/features/speech-to-text-converter';
import { AiAssistant } from '@/components/features/ai-assistant';
import { Toaster } from "@/components/ui/toaster"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageIcon, BrainCircuit, Mic, Bot, FileText } from 'lucide-react';

export default function Home() {
  return (
    <div className="dark flex flex-col items-center min-h-screen bg-background text-foreground p-4 md:p-8 font-body">
      <header className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center py-4 gap-4 sm:gap-0">
        <div className="flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tighter text-primary">
              Medo.Ai
            </h1>
        </div>
        <div className="text-center sm:text-right">
          <p className="text-sm text-muted-foreground">مطور الموقع</p>
          <p className="font-bold text-lg text-foreground">
            محمود محمد محمود أبو الفتوح أحمد العزيري
          </p>
        </div>
      </header>

      <main className="w-full max-w-6xl flex-grow mt-8 mb-8 flex flex-col">
        <ClockDisplay />
        
        <Tabs defaultValue="ai-assistant" className="w-full mt-8 flex-grow flex flex-col">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mx-auto max-w-2xl bg-card border border-border h-auto">
            <TabsTrigger value="ai-assistant" className="py-2.5">
              <Bot className="w-5 h-5 ml-2" />
              المساعد الذكي
            </TabsTrigger>
            <TabsTrigger value="speech-to-text" className="py-2.5">
              <Mic className="w-5 h-5 ml-2" />
              تحويل الكلام إلى نص
            </TabsTrigger>
            <TabsTrigger value="question-generator" className="py-2.5">
              <BrainCircuit className="w-5 h-5 ml-2" />
              توليد الأسئلة
            </TabsTrigger>
            <TabsTrigger value="image-converter" className="py-2.5">
              <ImageIcon className="w-5 h-5 ml-2" />
              تحويل الصور إلى PDF
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ai-assistant" className="flex-grow mt-4">
            <AiAssistant />
          </TabsContent>
          <TabsContent value="speech-to-text" className="flex-grow mt-4">
            <SpeechToTextConverter />
          </TabsContent>
          <TabsContent value="question-generator" className="flex-grow mt-4">
            <QuestionGenerator />
          </TabsContent>
          <TabsContent value="image-converter" className="flex-grow mt-4">
            <ImageToPdfConverter />
          </TabsContent>
        </Tabs>
      </main>
      <Toaster />
    </div>
  );
}
