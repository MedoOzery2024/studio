"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Upload, FileDown, Trash2, BrainCircuit, File as FileIcon, X, Save, FileText, View } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { generateMindMap, type GenerateMindMapOutput } from '@/ai/flows/mind-map-flow';
import { useUser, useFirestore, useMemoFirebase, useCollection, doc, setDoc, deleteDoc, collection } from '@/firebase';
import { cn } from '@/lib/utils';
import PptxGenJS from 'pptxgenjs';

interface SavedSession {
    id: string;
    fileName: string;
    mindMapData: GenerateMindMapOutput;
    uploadDate: string;
}

export function MindMapGenerator() {
    const [contextText, setContextText] = useState('');
    const [attachedFile, setAttachedFile] = useState<{ name: string; url: string; type: string } | null>(null);
    const [sessionName, setSessionName] = useState('');
    const [generatedMap, setGeneratedMap] = useState<GenerateMindMapOutput | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    
    const userMindMapCollection = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, `users/${user.uid}/mindMapSessions`);
    }, [firestore, user]);

    const { data: savedSessions, isLoading: isLoadingSessions } = useCollection<SavedSession>(userMindMapCollection);

    const handleGenerate = async () => {
        if (!contextText && !attachedFile) {
            toast({ variant: 'destructive', title: 'لا يوجد محتوى', description: 'الرجاء إدخال نص أو رفع ملف.' });
            return;
        }
        setIsGenerating(true);
        setGeneratedMap(null);
        try {
            const result = await generateMindMap({
                context: contextText,
                file: attachedFile ? { url: attachedFile.url } : undefined,
            });
            if (result && result.title) {
                setGeneratedMap(result);
                if (!sessionName) setSessionName(result.title);
                toast({ title: "تم إنشاء الخريطة الذهنية بنجاح!" });
            } else {
                throw new Error("Failed to generate mind map.");
            }
        } catch (error) {
            console.error("Mind map generation failed:", error);
            toast({ variant: "destructive", title: "فشل إنشاء الخريطة", description: "حدث خطأ أثناء التواصل مع الذكاء الاصطناعي." });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const url = e.target?.result as string;
                setAttachedFile({ name: file.name, url: url, type: file.type });
                if (!contextText) setContextText(`تحليل الملف: ${file.name}`);
                toast({ title: 'تم إرفاق الملف', description: `"${file.name}".` });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSaveSession = useCallback(async (name: string) => {
        if (!user || !firestore || !generatedMap) return;
        if (!name.trim()) {
            toast({ variant: "destructive", title: "اسم الجلسة مطلوب" });
            return;
        }
        
        setIsSaving(true);
        const sessionId = selectedSessionId || doc(collection(firestore, `users/${user.uid}/mindMapSessions`)).id;
        const docRef = doc(firestore, `users/${user.uid}/mindMapSessions`, sessionId);
        
        const dataToSave: SavedSession = {
            id: sessionId,
            fileName: name.trim(),
            mindMapData: generatedMap,
            uploadDate: new Date().toISOString(),
        };

        try {
            await setDoc(docRef, dataToSave, { merge: true });
            toast({ title: "تم الحفظ بنجاح!", description: `تم حفظ جلسة "${name.trim()}".` });
            setSelectedSessionId(sessionId);
        } catch (error) {
            console.error("Failed to save session:", error);
            toast({ variant: "destructive", title: "فشل الحفظ" });
        } finally {
            setIsSaving(false);
        }
    }, [user, firestore, generatedMap, selectedSessionId]);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            if (sessionName && generatedMap && user) {
                handleSaveSession(sessionName);
            }
        }, 1500); // Debounce time

        return () => clearTimeout(handler);
    }, [sessionName, generatedMap, user, handleSaveSession]);


    const handleViewSession = (session: SavedSession) => {
        setSessionName(session.fileName);
        setGeneratedMap(session.mindMapData);
        setSelectedSessionId(session.id);
        setContextText('');
        setAttachedFile(null);
        toast({ title: `جاري عرض: ${session.fileName}` });
    };

    const handleNewSession = () => {
        setContextText('');
        setAttachedFile(null);
        setSessionName('');
        setGeneratedMap(null);
        setSelectedSessionId(null);
        if(fileInputRef.current) fileInputRef.current.value = "";
        toast({ title: 'جلسة جديدة جاهزة للبدء' });
    };
    
    const handleDeleteSession = async (sessionId: string) => {
        if (!user || !firestore) return;
        const docRef = doc(firestore, `users/${user.uid}/mindMapSessions`, sessionId);
        try {
            await deleteDoc(docRef);
            toast({ title: "تم الحذف بنجاح!" });
            if (selectedSessionId === sessionId) {
                handleNewSession();
            }
        } catch (error) {
            console.error("Failed to delete session:", error);
            toast({ variant: "destructive", title: "فشل الحذف" });
        }
    };

    const exportToPPTX = () => {
        if (!generatedMap) return;
        let pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_WIDE';
        
        const titleSlide = pptx.addSlide();
        titleSlide.addText(generatedMap.title, { x: 0.5, y: 2.5, w: '90%', h: 1, align: 'center', fontSize: 36, bold: true });

        generatedMap.mainIdeas.forEach(idea => {
            const slide = pptx.addSlide();
            slide.addText(idea.text, { x: 0.5, y: 0.5, w: '90%', h: 1, fontSize: 28, bold: true, color: '363636' });
            
            const bodyText = idea.subPoints.map(point => point.text).join('\n');
            slide.addText(bodyText, { x: 0.5, y: 1.5, w: '90%', h: 4, fontSize: 18, bullet: true });
        });
        
        pptx.writeFile({ fileName: `${sessionName || 'mindmap'}.pptx` });
    };

    const exportToDOCX = () => {
        if (!generatedMap) return;
        let content = `<h1>${generatedMap.title}</h1>`;
        generatedMap.mainIdeas.forEach(idea => {
            content += `<h2>${idea.text}</h2>`;
            content += '<ul>';
            idea.subPoints.forEach(point => {
                content += `<li>${point.text}</li>`;
            });
            content += '</ul>';
        });

        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word Document</title></head><body>";
        const footer = "</body></html>";
        const sourceHTML = header + content + footer;

        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = `${sessionName || 'mindmap'}.doc`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
    };
    
    const exportToTXT = () => {
        if (!generatedMap) return;
        let content = `${generatedMap.title}\n\n`;
        generatedMap.mainIdeas.forEach(idea => {
            content += `- ${idea.text}\n`;
            idea.subPoints.forEach(point => {
                content += `  - ${point.text}\n`;
            });
            content += '\n';
        });
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${sessionName || 'mindmap'}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };
    
    const MindMapDisplay = ({ map }: { map: GenerateMindMapOutput }) => (
      <div className="space-y-4 text-right" dir="rtl">
        <h3 className="text-2xl font-bold text-primary text-center">{map.title}</h3>
        <div className="space-y-3">
          {map.mainIdeas.map((idea) => (
            <div key={idea.id} className="p-3 bg-secondary rounded-lg">
              <p className="font-semibold text-foreground">{idea.text}</p>
              <ul className="pr-6 mt-1 space-y-1 list-disc list-inside text-muted-foreground">
                {idea.subPoints.map((point) => (
                  <li key={point.id}>{point.text}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Inputs and Settings */}
            <Card className="lg:col-span-1 h-fit shadow-lg bg-card border-none">
                 <CardHeader>
                    <CardTitle className="text-center text-xl font-bold text-primary">إنشاء خريطة ذهنية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="context-text" className="text-right w-full block font-semibold">المحتوى النصي</Label>
                        <Textarea
                            id="context-text" dir="rtl" className="min-h-[120px] bg-secondary"
                            value={contextText} onChange={(e) => setContextText(e.target.value)}
                            placeholder="اكتب أو الصق النص هنا..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="file-upload" className="text-right w-full block font-semibold">أو ارفع ملفًا</Label>
                        <div 
                            className="flex justify-center items-center w-full px-4 py-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-secondary transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="text-center">
                                <Upload className="mx-auto h-8 w-8 text-muted-foreground"/>
                                <p className="mt-1 text-xs text-foreground">
                                    <span className="font-semibold text-primary">اختر ملف</span> (صورة أو PDF)
                                </p>
                            </div>
                        </div>
                        <Input id="file-upload" ref={fileInputRef} type="file" className="hidden"
                            onChange={handleFileUpload} accept="image/*,application/pdf"
                        />
                         {attachedFile && (
                            <div className="relative mt-2 p-2 border border-dashed border-primary rounded-md flex items-center gap-2 text-sm bg-secondary">
                                <FileIcon className="w-4 h-4 text-primary" />
                                <span className="truncate">{attachedFile.name}</span>
                                <Button type="button" variant="ghost" size="icon" className="h-5 w-5 ml-auto"
                                    onClick={() => { setAttachedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        )}
                    </div>
                     <Button onClick={handleGenerate} disabled={isGenerating} className="w-full text-lg py-6">
                        {isGenerating ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : <BrainCircuit className="ml-2 h-5 w-5" />}
                        {isGenerating ? 'جاري الإنشاء...' : 'إنشاء الخريطة'}
                    </Button>
                </CardContent>
            </Card>
            
            {/* Middle Column: Mind Map Display */}
            <Card className="lg:col-span-2 shadow-lg bg-card border-none">
                <CardHeader>
                     <div className="flex w-full flex-col sm:flex-row items-center gap-4" dir="rtl">
                        <Label htmlFor="sessionName" className="whitespace-nowrap font-semibold text-lg">اسم الجلسة:</Label>
                        <Input
                            id="sessionName" value={sessionName} onChange={(e) => setSessionName(e.target.value)}
                            placeholder="أدخل اسمًا لحفظ الجلسة..."
                            className="text-right bg-secondary focus-visible:ring-primary w-full"
                            disabled={!generatedMap}
                        />
                        {isSaving && <Loader2 className="h-5 w-5 animate-spin" />}
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[500px] w-full p-4 border border-secondary rounded-lg">
                        {generatedMap ? (
                            <MindMapDisplay map={generatedMap} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                <BrainCircuit className="w-16 h-16 mb-4 text-primary/50" />
                                <h2 className="text-2xl font-semibold text-foreground">الخريطة الذهنية</h2>
                                <p>ستظهر الخريطة الذهنية التي تم إنشاؤها هنا.</p>
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
                 {generatedMap && (
                    <CardFooter className="flex-col items-stretch gap-4">
                        <h3 className="text-lg font-medium text-right w-full border-t border-border pt-4 text-primary">تصدير وحفظ</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           <Button variant="outline" onClick={exportToPPTX}>تصدير لـ PowerPoint</Button>
                           <Button variant="outline" onClick={exportToDOCX}>تصدير لـ Word</Button>
                           <Button variant="outline" onClick={exportToTXT}>تصدير كنص</Button>
                           <Button onClick={handleNewSession}><FileText className="ml-2"/>جلسة جديدة</Button>
                        </div>
                    </CardFooter>
                 )}
            </Card>

            {/* Right Column: Saved Sessions (only if user is logged in) */}
             {user && (
                <Card className="lg:col-span-3 shadow-lg bg-card border-none">
                     <CardHeader>
                        <CardTitle className="text-center text-xl font-bold text-primary">الجلسات المحفوظة</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <ScrollArea className="h-48 w-full">
                             <ul className="w-full space-y-2 pr-2">
                                {isLoadingSessions && <p className='text-center w-full text-muted-foreground'>جاري تحميل الجلسات...</p>}
                                {savedSessions && savedSessions.map((session) => (
                                <li key={session.id} className={cn("flex items-center justify-between p-3 rounded-lg bg-secondary cursor-pointer", selectedSessionId === session.id && "ring-2 ring-primary")} dir="rtl">
                                    <div className="flex flex-col overflow-hidden" onClick={() => handleViewSession(session)}>
                                        <span className="font-bold text-foreground truncate">{session.fileName}</span>
                                        <span className="text-xs text-muted-foreground">{new Date(session.uploadDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleViewSession(session)}><View className="h-4 w-4"/></Button>
                                        <Button variant="destructive" size="icon" onClick={() => handleDeleteSession(session.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </li>
                                ))}
                                {savedSessions?.length === 0 && !isLoadingSessions && (
                                    <li className="text-center text-muted-foreground p-4">لا توجد خرائط ذهنية محفوظة.</li>
                                )}
                            </ul>
                         </ScrollArea>
                    </CardContent>
                </Card>
             )}
        </div>
    );
}
