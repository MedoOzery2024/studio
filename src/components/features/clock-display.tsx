"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Languages, Clock } from 'lucide-react';

export function ClockDisplay() {
  const [time, setTime] = useState('');
  const [gregorianDate, setGregorianDate] = useState('');
  const [islamicDate, setIslamicDate] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const updateDateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }));
      setGregorianDate(new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now));
      setIslamicDate(new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now));
      setDayOfWeek(new Intl.DateTimeFormat('ar-EG', {
        weekday: 'long',
      }).format(now));
    };

    updateDateTime();
    const timerId = setInterval(updateDateTime, 1000);

    return () => clearInterval(timerId);
  }, []);

  if (!isMounted) {
    return (
       <Card className="w-full max-w-3xl mx-auto p-6 md:p-8 shadow-lg bg-card border border-border">
         <CardContent className="flex flex-col items-center justify-center gap-4 p-0 animate-pulse">
            <div className="h-12 md:h-16 w-3/4 rounded-md bg-secondary"></div>
            <div className="w-full h-[1px] bg-border my-1"></div>
            <div className="h-8 w-1/2 rounded-md bg-secondary"></div>
            <div className="h-6 w-1/3 rounded-md bg-secondary"></div>
         </CardContent>
       </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto p-6 md:p-8 shadow-lg bg-card border border-border">
      <CardContent className="flex flex-col items-center justify-center gap-4 p-0">
        <div 
        className="text-5xl sm:text-6xl md:text-7xl font-bold text-foreground font-mono tracking-wider"
        aria-live="polite"
        >
        {time}
        </div>

        <div className="w-full h-[1px] bg-border my-1"></div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-8 text-sm md:text-lg text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <span>{gregorianDate}</span>
          </div>
          <div className="flex items-center gap-2" dir="rtl">
            <Languages className="w-5 h-5 text-primary" />
            <span>{islamicDate}</span>
          </div>
        </div>

        <div className="text-xl md:text-2xl font-semibold text-primary/90">
          {dayOfWeek}
        </div>
      </CardContent>
    </Card>
  );
}
