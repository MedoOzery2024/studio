"use client";

import { useState } from 'react';
import { ClockDisplay } from '@/components/features/clock-display';
import { ImageToPdfConverter } from '@/components/features/image-to-pdf-converter';
import { SpeechToTextConverter } from '@/components/features/speech-to-text-converter';
import { AiAssistant } from '@/components/features/ai-assistant';
import { TextToSpeechConverter } from '@/components/features/text-to-speech-converter';
import { MindMapGenerator } from '@/components/features/mind-map-generator';
import { Toaster } from "@/components/ui/toaster"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ImageIcon, Mic, Bot, FileText, ArrowRight, Text, BrainCircuit } from 'lucide-react';

type Feature = 'ai-assistant' | 'speech-to-text' | 'image-converter' | 'text-to-speech' | 'mind-map';

interface FeatureCardProps {
  id: Feature;
  title: string;
  description: string;
  icon: React.ReactNode;
  onSelect: (feature: Feature) => void;
}

const FeatureCard = ({ id, title, description, icon, onSelect }: FeatureCardProps) => (
  <Card 
    className="bg-card hover:bg-secondary border-border hover:border-primary transition-all duration-300 cursor-pointer group flex flex-col h-full"
    onClick={() => onSelect(id)}
  >
    <CardHeader className="flex flex-row items-center gap-4">
      <div className="bg-primary/10 text-primary p-3 rounded-lg">
        {icon}
      </div>
      <CardTitle className="text-xl text-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent className="flex-grow">
      <CardDescription>{description}</CardDescription>
    </CardContent>
    <div className="p-6 pt-0">
        <Button variant="ghost" className="p-0 text-primary group-hover:translate-x-2 transition-transform">
            <span>ابدأ الآن</span>
            <ArrowRight className="mr-2 w-4 h-4" />
        </Button>
    </div>
  </Card>
);

const featureMap = {
    'ai-assistant': { 
        title: "المساعد الذكي", 
        description: "تحدث مع الذكاء الاصطناعي، ارفع ملفات، واطرح أسئلة معقدة في مختلف العلوم.",
        icon: <Bot className="w-8 h-8" />,
        component: <AiAssistant />
    },
    'speech-to-text': {
        title: "تحويل الكلام إلى نص",
        description: "سجل صوتك باستخدام الميكروفون، وقم بتحويله إلى نص مكتوب وتلخيصه بسهولة.",
        icon: <Mic className="w-8 h-8" />,
        component: <SpeechToTextConverter />
    },
     'text-to-speech': {
        title: "تحويل النص إلى كلام",
        description: "حوّل أي نص مكتوب إلى ملف صوتي مسموع يمكنك الاستماع إليه وتنزيله.",
        icon: <Text className="w-8 h-8" />,
        component: <TextToSpeechConverter />
    },
    'image-converter': {
        title: "تحويل الصور إلى PDF",
        description: "اجمع صورك المفضلة وحولها إلى ملف PDF واحد جاهز للتنزيل والمشاركة.",
        icon: <ImageIcon className="w-8 h-8" />,
        component: <ImageToPdfConverter />
    },
    'mind-map': {
      title: "صانع الخرائط الذهنية",
      description: "حوّل النصوص، الصور، أو ملفات PDF إلى خرائط ذهنية منظمة لتسهيل المذاكرة.",
      icon: <BrainCircuit className="w-8 h-8" />,
      component: <MindMapGenerator />
    }
};


export default function Home() {
  const [activeFeature, setActiveFeature] = useState<Feature | null>(null);

  const renderContent = () => {
    if (activeFeature) {
        return (
            <div className="w-full">
                <Button onClick={() => setActiveFeature(null)} variant="outline" className="mb-6">
                    <ArrowRight className="ml-2 w-4 h-4" />
                    العودة إلى القائمة الرئيسية
                </Button>
                {featureMap[activeFeature].component}
            </div>
        );
    }
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.keys(featureMap).map(key => {
                const feature = featureMap[key as Feature];
                return (
                    <FeatureCard 
                        key={key}
                        id={key as Feature}
                        title={feature.title}
                        description={feature.description}
                        icon={feature.icon}
                        onSelect={setActiveFeature}
                    />
                );
            })}
        </div>
    );
  }

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

      <main className="w-full max-w-6xl flex-grow mt-8 mb-8 flex flex-col items-center">
        <ClockDisplay />
        <div className="w-full mt-12">
            {renderContent()}
        </div>
      </main>
      <Toaster />
    </div>
  );
}
