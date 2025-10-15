"use client";

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, FileText, Download, Trash2, Save } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { transcribeAudio } from '@/ai/flows/speech-to-text-flow';

export function SpeechToTextConverter() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcribedText, setTranscribedText] = useState('');
    const [summarizedText, setSummarizedText] = useState('');
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const { toast } = useToast();
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        // Request microphone permission on component mount
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                // We don't need to do anything with the stream here,
                // just confirm we have permission. The user will be prompted.
            })
            .catch(err => {
                console.error("Microphone permission denied:", err);
                toast({
                    variant: "destructive",
                    title: "تم رفض الوصول إلى الميكروفون",
                    description: "الرجاء تمكين الوصول إلى الميكروفون في إعدادات المتصفح.",
                });
            });
    }, [toast]);


    const handleRecord = async () => {
        if (isRecording) {
            // Stop recording
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
            }
        } else {
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                setIsRecording(true);
                toast({ title: "بدء التسجيل...", description: "تحدث الآن." });

                const recorder = new MediaRecorder(stream);
                mediaRecorderRef.current = recorder;
                audioChunksRef.current = [];

                recorder.ondataavailable = (event) => {
                    audioChunksRef.current.push(event.data);
                };

                recorder.onstop = async () => {
                    setIsRecording(false);
                    toast({ title: "تم إيقاف التسجيل. جاري التحويل..." });
                    setIsTranscribing(true);
                    
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = async () => {
                        const base64Audio = reader.result as string;
                         try {
                            const result = await transcribeAudio({ audio: { url: base64Audio } });
                            if (result && result.text) {
                                setTranscribedText(result.text);
                                toast({ title: "تم تحويل النص بنجاح!" });
                            } else {
                                throw new Error("No text transcribed.");
                            }
                        } catch (error) {
                            console.error("Transcription failed:", error);
                            toast({
                                variant: "destructive",
                                title: "فشل تحويل النص",
                                description: "حدث خطأ أثناء التواصل مع الذكاء الاصطناعي.",
                            });
                        } finally {
                            setIsTranscribing(false);
                        }
                    };
                };

                recorder.start();

            } catch (error) {
                console.error("Could not start recording:", error);
                toast({
                    variant: "destructive",
                    title: "فشل بدء التسجيل",
                    description: "لم نتمكن من الوصول إلى الميكروفون. يرجى التحقق من الأذونات.",
                });
            }
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
                    <Button onClick={handleRecord} disabled={isTranscribing} size="lg" className={`rounded-full w-24 h-24 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-primary'}`}>
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
                            onChange={(e) => setTranscribedText(e.target.value)}
                            placeholder="سيظهر النص المستخرج من الميكروفون هنا..."
                        />
                        {isTranscribing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-md">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}
                    </div>
                </div>

                <Button onClick={handleSummarize} disabled={!transcribedText || isSummarizing || isTranscribing} className="w-full">
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
                            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-md">
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
