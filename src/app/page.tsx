import { ClockDisplay } from '@/components/features/clock-display';
import { ImageToPdfConverter } from '@/components/features/image-to-pdf-converter';
import { QuestionGenerator } from '@/components/features/question-generator';
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 font-body text-center">
      <header className="absolute top-8 text-center">
        <h1 className="text-5xl font-bold font-headline text-foreground">
          Medo.Ai
        </h1>
      </header>

      <main className="w-full max-w-4xl mt-32 mb-24 space-y-8">
        <ClockDisplay />
        <ImageToPdfConverter />
        <QuestionGenerator />
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
