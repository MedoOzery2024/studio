"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AudioLines, Download, Play, Pause, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Label } from '@/components/ui/label';
import { textToSpeech } from '@/ai/flows/text-to-speech-flow';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Voice = 'Algenib' | 'Achernar' | 'Erinome' | 'Umbriel' | 'Rasalgethi';

const voiceMap: Record<Voice, string> = {
    Algenib: 'رجل 1 (افتراضي)',
    Achernar: 'رجل 2',
    Erinome: 'امرأة 1',
    Umbriel: 'امرأة 2',
    Rasalgethi: 'رجل 3',
};


export function TextToSpeechConverter() {
    const [inputText, setInputText] = useState('');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState<Voice>('Algenib');
    const audioRef = useState<HTMLAudioElement | null>(null);
    const { toast } = useToast();

    const handleConvert = async () => {
        if (!inputText.trim()) {
            toast({ variant: 'destructive', title: 'لا يوجد نص', description: 'الرجاء إدخال نص لتحويله.' });
            return;
        }

        setIsConverting(true);
        setAudioUrl(null);
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }

        try {
            const result = await textToSpeech({ text: inputText, voice: selectedVoice });
            if (result && result.audioDataUri) {
                setAudioUrl(result.audioDataUri);
                toast({ title: 'تم تحويل النص إلى صوت بنجاح!' });
            } else {
                throw new Error("Text-to-speech conversion returned no audio.");
            }
        } catch (error) {
            console.error("Text-to-speech failed:", error);
            toast({
                variant: "destructive",
                title: "فشل التحويل",
                description: "حدث خطأ أثناء التواصل مع الذكاء الاصطناعي.",
            });
        } finally {
            setIsConverting(false);
        }
    };
    
    const handlePlayPause = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };
    
    const setupAudioPlayer = (node: HTMLAudioElement) => {
        if (node) {
            audioRef.current = node;
            node.onended = () => setIsPlaying(false);
            node.onplay = () => setIsPlaying(true);
            node.onpause = () => setIsPlaying(false);
        }
    };

    const handleClear = () => {
        setInputText('');
        setAudioUrl(null);
        if (audioRef.current) {
            audioRef.current.pause();
        }
        setIsPlaying(false);
        toast({ title: 'تم مسح كل شيء' });
    }

    return (
        <Card className="w-full max-w-4xl mx-auto shadow-lg bg-card border-none">
            <CardHeader>
                <CardTitle className="text-center text-2xl font-bold text-primary">تحويل النص إلى كلام</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="space-y-2">
                    <Label htmlFor="text-input" className="text-right w-full block font-semibold">النص المراد تحويله</Label>
                    <Textarea
                        id="text-input"
                        dir="rtl"
                        className="min-h-[150px] bg-secondary"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="اكتب أو الصق النص هنا..."
                    />
                </div>
                
                 <div className="space-y-2">
                    <Label htmlFor="voice-select" className="text-right w-full block font-semibold">اختر الصوت</Label>
                    <Select value={selectedVoice} onValueChange={(value: Voice) => setSelectedVoice(value)}>
                        <SelectTrigger id="voice-select" className="w-full bg-secondary">
                            <SelectValue placeholder="اختر الصوت" />
                        </SelectTrigger>
                        <SelectContent>
                           {Object.entries(voiceMap).map(([value, label]) => (
                               <SelectItem key={value} value={value}>{label}</SelectItem>
                           ))}
                        </SelectContent>
                    </Select>
                 </div>

                <Button onClick={handleConvert} disabled={isConverting || !inputText.trim()} className="w-full text-lg py-6">
                    {isConverting ? (
                        <>
                            <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                            جاري التحويل...
                        </>
                    ) : (
                        <>
                            <AudioLines className="ml-2 h-5 w-5" />
                            تحويل إلى صوت
                        </>
                    )}
                </Button>
            </CardContent>

            {(audioUrl || inputText) && (
                <CardFooter className="flex flex-col items-center gap-4 border-t border-border pt-6">
                    {audioUrl && (
                        <>
                            <audio ref={setupAudioPlayer} src={audioUrl} className="hidden" />
                            <div className="flex w-full justify-center items-center gap-4">
                                <Button onClick={handlePlayPause} size="icon" className="w-16 h-16 rounded-full">
                                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                                </Button>
                            </div>
                        </>
                    )}
                    <div className="flex w-full justify-center items-center gap-2">
                       {audioUrl && (
                            <Button variant="outline" onClick={() => {
                                const link = document.createElement('a');
                                link.href = audioUrl;
                                link.download = `medo-ai-speech.wav`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }}>
                                <Download className="ml-2"/>
                                تنزيل
                            </Button>
                       )}
                       <Button variant="destructive" onClick={handleClear}>
                           <Trash2 className="ml-2"/>
                           مسح
                       </Button>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}
    
