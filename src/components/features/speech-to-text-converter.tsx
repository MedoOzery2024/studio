"use client";

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, Download, Save, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { transcribeAudio } from '@/ai/flows/speech-to-text-flow';
import { summarizeText } from '@/ai/flows/summarize-text-flow';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface SavedFile {
    id: string;
    fileName: string;
    transcribedText: string;
    summarizedText: string;
    uploadDate: string;
}

export function SpeechToTextConverter() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcribedText, setTranscribedText] = useState('');
    const [summarizedText, setSummarizedText] = useState('');
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [fileName, setFileName] = useState('');
    const { toast } = useToast();
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const { user } = useUser();
    const firestore = useFirestore();

    const userFilesCollection = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, `users/${user.uid}/uploadedFiles`);
    }, [firestore, user]);

    const { data: savedFiles, isLoading: isLoadingFiles } = useCollection<SavedFile>(userFilesCollection);

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
        setSummarizedText('');

        try {
            const result = await summarizeText({
                text: transcribedText,
                language: 'ar',
            });
             if (result && result.summary) {
                setSummarizedText(result.summary);
                toast({ title: "تم تلخيص النص بنجاح!" });
            } else {
                throw new Error("Summarization returned no content.");
            }
        } catch (error) {
             console.error("Summarization failed:", error);
            toast({
                variant: "destructive",
                title: "فشل تلخيص النص",
                description: "حدث خطأ أثناء التواصل مع الذكاء الاصطناعي.",
            });
        } finally {
             setIsSummarizing(false);
        }
    };

    const handleDownload = (content: string, extension: string) => {
        if (!content) {
            toast({ variant: 'destructive', title: 'لا يوجد محتوى للتنزيل' });
            return;
        }
        const finalFileName = fileName.trim() || 'file';
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${finalFileName}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    const handleSave = async () => {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'المستخدم غير مسجل دخوله' });
            return;
        }
        if (!transcribedText) {
            toast({ variant: 'destructive', title: 'لا يوجد نص للحفظ' });
            return;
        }
        const finalFileName = fileName.trim() || `Recording ${new Date().toLocaleString()}`;
        
        setIsSaving(true);
        try {
            const fileId = new Date().toISOString();
            const docRef = doc(firestore, `users/${user.uid}/uploadedFiles`, fileId);
            const dataToSave = {
                id: fileId,
                fileName: finalFileName,
                transcribedText: transcribedText,
                summarizedText: summarizedText,
                uploadDate: new Date().toISOString(),
                fileType: 'text/plain',
                userId: user.uid,
            };

            setDocumentNonBlocking(docRef, dataToSave, { merge: true });

            toast({ title: "تم الحفظ بنجاح!", description: `تم حفظ "${finalFileName}".` });
            // Clear inputs after saving
            setTranscribedText('');
            setSummarizedText('');
            setFileName('');

        } catch (error) {
            console.error("Failed to save to Firestore:", error);
            toast({
                variant: "destructive",
                title: "فشل الحفظ",
                description: "حدث خطأ أثناء حفظ الملف في قاعدة البيانات.",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (fileId: string) => {
        if (!user || !firestore) return;
        
        const docRef = doc(firestore, `users/${user.uid}/uploadedFiles`, fileId);
        try {
            await deleteDoc(docRef);
            toast({ title: "تم الحذف بنجاح!" });
        } catch (error) {
            console.error("Failed to delete from Firestore:", error);
            toast({
                variant: "destructive",
                title: "فشل الحذف",
                description: "حدث خطأ أثناء حذف الملف.",
            });
        }
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
            {(transcribedText || summarizedText || (savedFiles && savedFiles.length > 0)) && (
                <CardFooter className="flex flex-col items-start gap-4">
                     <h3 className="text-lg font-medium text-right w-full border-t pt-4">حفظ وتنزيل</h3>
                     <div className="flex w-full flex-col gap-4">
                        <div className="flex w-full items-center gap-4" dir="rtl">
                           <Label htmlFor="fileName" className="whitespace-nowrap">اسم الملف:</Label>
                            <Input
                                id="fileName"
                                value={fileName}
                                onChange={(e) => setFileName(e.target.value)}
                                placeholder="أدخل اسم الملف..."
                                className="text-right"
                            />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <Label className="text-right">النص الكامل</Label>
                                <Button variant="outline" onClick={() => handleDownload(transcribedText, 'txt')} disabled={!transcribedText}>
                                    <Download className="ml-2"/>
                                    تنزيل (.txt)
                                </Button>
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label className="text-right">النص الملخص</Label>
                                <Button variant="outline" onClick={() => handleDownload(summarizedText, 'txt')} disabled={!summarizedText}>
                                   <Download className="ml-2"/>
                                   تنزيل (.txt)
                                </Button>
                            </div>
                         </div>
                         <Button onClick={handleSave} disabled={isSaving || !transcribedText}>
                           {isSaving ? <Loader2 className="h-4 w-4 animate-spin ml-2"/> : <Save className="ml-2"/>}
                           {isSaving ? 'جاري الحفظ...' : 'حفظ في الموقع'}
                       </Button>
                     </div>
                      {savedFiles && savedFiles.length > 0 && (
                        <div className="w-full">
                            <h3 className="text-lg font-medium text-right w-full border-t pt-4 mt-4">الملفات المحفوظة</h3>
                             <ul className="w-full space-y-2 mt-2">
                                {savedFiles.map((file) => (
                                <li key={file.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50" dir="rtl">
                                    <div className="flex flex-col">
                                        <span className="font-bold">{file.fileName}</span>
                                        <span className="text-xs text-muted-foreground">{new Date(file.uploadDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="destructive" size="icon" onClick={() => handleDelete(file.id)}>
                                            <Trash2 className="h-4 w-4" />
                                            <span className="sr-only">حذف</span>
                                        </Button>
                                    </div>
                                </li>
                                ))}
                            </ul>
                        </div>
                     )}
                     {isLoadingFiles && <p>جاري تحميل الملفات المحفوظة...</p>}
                </CardFooter>
            )}
        </Card>
    );
}
