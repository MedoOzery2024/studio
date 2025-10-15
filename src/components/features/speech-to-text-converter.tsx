"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, FileText, Download, Trash2, Save } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export function SpeechToTextConverter() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcribedText, setTranscribedText] = useState('');
    const [summarizedText, setSummarizedText] = useState('');
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const { toast } = useToast();

    const handleRecord = async () => {
        if (isRecording) {
            // Stop recording logic will go here
            setIsRecording(false);
            toast({ title: "تم إيقاف التسجيل." });
            
            // Placeholder for transcription
            setIsTranscribing(true);
            setTimeout(() => {
                setTranscribedText("هذا نص تجريبي تم استخراجه من تسجيل صوتي. سيتم هنا عرض النص الفعلي بعد ربط الذكاء الاصطناعي.");
                setIsTranscribing(false);
            }, 2000);

        } else {
            // Start recording logic will go here
            setIsRecording(true);
            toast({ title: "بدء التسجيل...", description: "تحدث الآن." });
        }
    };
    
    const handleSummarize = async () => {
        if (!transcribedText) {
            toast({ variant: 'destructive', title: 'لا يوجد نص للتلخيص' });
            return;
        }
        setIsSummarizing(true);
        // Placeholder for summarization
        setTimeout(() => {
            setSummarizedText("هذا ملخص تجريبي للنص المستخرج.");
            setIsSummarizing(false);
        }, 2000);
    };

    return (
        <Card className="w-full max-w-4xl shadow-2xl bg-card/80 backdrop-blur-sm border-primary/10 border-t-0 rounded-t-none">
            <CardContent className="space-y-6 pt-6">
                <div className="flex flex-col items-center justify-center gap-4">
                    <Button onClick={handleRecord} size="lg" className={`rounded-full w-24 h-24 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-primary'}`}>
                        {isRecording ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                        {isRecording ? "انقر للإيقاف" : "انقر لبدء التسجيل"}
                    </p>
                </div>
                
                <div className="space-y-2">
                    <Label htmlFor="transcribed-text" className="text-right w-full block">النص المستخرج</Label>
                    <div className="relative">
                        <Textarea
                            id="transcribed-text"
                            dir="rtl"
                            className="min-h-[150px]"
                            value={transcribedText}
                            readOnly
                            placeholder="سيظهر النص المستخرج من الميكروفون هنا..."
                        />
                        {isTranscribing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}
                    </div>
                </div>

                <Button onClick={handleSummarize} disabled={!transcribedText || isSummarizing} className="w-full">
                    {isSummarizing ? (
                        <>
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                           جاري التلخيص...
                        </>
                    ) : (
                        "تلخيص النص"
                    )}
                </Button>

                 <div className="space-y-2">
                    <Label htmlFor="summarized-text" className="text-right w-full block">النص الملخص</Label>
                    <div className="relative">
                       <Textarea
                            id="summarized-text"
                            dir="rtl"
                            className="min-h-[150px]"
                            value={summarizedText}
                            readOnly
                            placeholder="سيظهر النص الملخص هنا..."
                        />
                         {isSummarizing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}
                    </div>
                </div>

            </CardContent>
            {(transcribedText || summarizedText) && (
                <CardFooter className="flex flex-col items-start gap-4">
                     <h3 className="text-lg font-medium text-right w-full border-t pt-4">حفظ وتنزيل</h3>
                     <div className="flex w-full justify-between items-center gap-4">
                        <div className="flex gap-2">
                             <Button variant="outline">
                               <Download className="ml-2"/>
                               تنزيل
                           </Button>
                           <Button variant="outline">
                               <Save className="ml-2"/>
                               حفظ
                           </Button>
                        </div>
                         <Input
                            id="fileName"
                            placeholder="أدخل اسم الملف..."
                            className="text-right max-w-xs"
                            dir="rtl"
                        />
                     </div>
                </CardFooter>
            )}
        </Card>
    );
}
