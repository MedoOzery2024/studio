import { ClockDisplay } from '@/components/features/clock-display';
import { ImageToPdfConverter } from '@/components/features/image-to-pdf-converter';
import { QuestionGenerator } from '@/components/features/question-generator';
import { SpeechToTextConverter } from '@/components/features/speech-to-text-converter';
import { Toaster } from "@/components/ui/toaster"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageIcon, BrainCircuit, Mic } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 font-body">
      <header className="absolute top-8 text-center">
        <h1 className="text-5xl font-bold font-headline text-foreground">
          Medo.Ai
        </h1>
      </header>

      <main className="w-full max-w-4xl mt-32 mb-24 space-y-8">
        <ClockDisplay />
        
        <Tabs defaultValue="image-converter" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="image-converter">
              <ImageIcon className="w-5 h-5 mr-2" />
              تحويل الصور إلى PDF
            </TabsTrigger>
            <TabsTrigger value="question-generator">
              <BrainCircuit className="w-5 h-5 mr-2" />
              توليد الأسئلة
            </TabsTrigger>
            <TabsTrigger value="speech-to-text">
              <Mic className="w-5 h-5 mr-2" />
              تحويل الكلام إلى نص
            </TabsTrigger>
          </TabsList>
          <TabsContent value="image-converter">
            <ImageToPdfConverter />
          </TabsContent>
          <TabsContent value="question-generator">
            <QuestionGenerator />
          </TabsContent>
           <TabsContent value="speech-to-text">
            <SpeechToTextConverter />
          </TabsContent>
        </Tabs>

      </main>

      <footer className="absolute bottom-8 text-center px-4" dir="rtl">
        <p className="text-base md:text-lg text-foreground/80">
          مطور الموقع:{' '}
          <span className="font-bold text-accent">
            محمود محمد محمود أبو الفتوح أحمد العزيري
          </span>
        </p>
      </footer>
      <Toaster />
    </div>
  );
}
