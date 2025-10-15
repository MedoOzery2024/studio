import { ClockDisplay } from '@/components/features/clock-display';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 font-body text-center">
      <header className="absolute top-8 text-center">
        <h1 className="text-5xl font-bold font-headline text-foreground">
          Medo.Ai
        </h1>
      </header>

      <main>
        <ClockDisplay />
      </main>

      <footer className="absolute bottom-8 text-center px-4" dir="rtl">
        <p className="text-base md:text-lg text-foreground/80">
          مطور الموقع:{' '}
          <span className="font-bold text-accent">
            محمود محمد محمود أبو الفتوح أحمد العزيري
          </span>
        </p>
      </footer>
    </div>
  );
}
