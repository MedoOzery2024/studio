"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileUp, Wand2, Download, Trash2, Check, XCircle, Lightbulb, Type, RotateCcw, Minus, Plus, FileText, View, PlusCircle, FileJson, FileType } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { generateQuestions, type Question, type GenerateQuestionsOutput } from '@/ai/flows/question-generation-flow';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from '../ui/textarea';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase';
import { collection, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { ScrollArea } from '../ui/scroll-area';
import { Progress } from '@/components/ui/progress';

const MAX_QUESTIONS = 1000;
type Difficulty = 'easy' | 'medium' | 'hard';
type InputMode = 'file' | 'text';
type QuizState = 'not-started' | 'in-progress' | 'finished';

interface UserAnswer {
    questionIndex: number;
    selectedOption: string;
    isCorrect: boolean;
}

interface SavedSession {
    id: string;
    fileName: string;
    questions: Question[];
    isInteractive: boolean;
    uploadDate: string;
    userId: string;
    userAnswers?: UserAnswer[];
}

export function QuestionGenerator() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
    const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
    const [sourceFile, setSourceFile] = useState<string | null>(null);
    const [sourceText, setSourceText] = useState('');
    const [numQuestions, setNumQuestions] = useState(5);
    const [isInteractive, setIsInteractive] = useState(true);
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');
    const [inputMode, setInputMode] = useState<InputMode>('file');
    const [fileName, setFileName] = useState('');
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [quizState, setQuizState] = useState<QuizState>('not-started');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    const userFilesCollection = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, `users/${user.uid}/questionSessions`);
    }, [firestore, user]);

    const { data: savedSessions, isLoading: isLoadingFiles } = useCollection<SavedSession>(userFilesCollection);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        handleNewSession();

        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';

        if (isImage || isPdf) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                setSourceFile(dataUrl);
                 toast({
                    title: `تم رفع ملف: ${file.name}`,
                    description: "الملف جاهز الآن. اضغط على زر 'توليد الأسئلة' للبدء.",
                });
            };
            reader.readAsDataURL(file);
        } else {
             toast({
                variant: 'destructive',
                title: 'نوع ملف غير مدعوم',
                description: 'الرجاء رفع ملف صورة أو PDF.',
            });
            setFileName('');
        }
    };
    
    const handleGenerateQuestions = async () => {
        if (inputMode === 'file' && !sourceFile) {
            toast({ variant: 'destructive', title: 'لا يوجد ملف', description: 'الرجاء رفع صورة أو ملف PDF أولاً.' });
            return;
        }
        if (inputMode === 'text' && !sourceText.trim()) {
            toast({ variant: 'destructive', title: 'لا يوجد نص', description: 'الرجاء إدخال نص لتوليد أسئلة منه.' });
            return;
        }

        setIsGenerating(true);
        setGeneratedQuestions([]);
        setUserAnswers([]);

        try {
            const rawResult = await generateQuestions({
                text: inputMode === 'text' ? sourceText : undefined,
                image: inputMode === 'file' ? sourceFile! : undefined,
                fileName: fileName,
                numQuestions: numQuestions,
                interactive: isInteractive,
                difficulty: difficulty,
            });

            let result: GenerateQuestionsOutput;
            try {
                const jsonMatch = rawResult.match(/```json\s*([\s\S]*?)\s*```|(\[[\s\S]*\]|\{[\s\S]*\})/);
                if (!jsonMatch) {
                    JSON.parse(rawResult);
                    result = JSON.parse(rawResult);
                } else {
                    const jsonString = jsonMatch[1] || jsonMatch[2];
                     result = JSON.parse(jsonString);
                }
            } catch(e) {
                 console.error("Failed to parse JSON response from LLM:", rawResult, e);
                 toast({
                    variant: "destructive",
                    title: "فشل تحليل الاستجابة",
                    description: "تم استلام استجابة غير صالحة من الذكاء الاصطناعي. الرجاء المحاولة مرة أخرى.",
                 });
                 setIsGenerating(false);
                 return;
            }

            if (result && result.questions && result.questions.length > 0) {
                setGeneratedQuestions(result.questions);
                setQuizState('not-started');
                toast({
                    title: 'تم توليد الأسئلة بنجاح!',
                    description: `تم إنشاء ${result.questions.length} سؤال.`,
                });
            } else {
                 toast({
                    variant: "destructive",
                    title: "فشل توليد الأسئلة",
                    description: "تعذر إنشاء أسئلة من المحتوى المقدم. حاول مرة أخرى أو قم بتعديل المدخلات.",
                });
            }
        } catch (error) {
            console.error("Failed to generate questions:", error);
            toast({
                variant: "destructive",
                title: "فشل توليد الأسئلة",
                description: "حدث خطأ أثناء التواصل مع الذكاء الاصطناعي. الرجاء المحاولة مرة أخرى.",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAnswerSelect = (questionIndex: number, selectedOption: string) => {
        const question = generatedQuestions[questionIndex];
        const isCorrect = question.correctAnswer === selectedOption;
        
        setUserAnswers(prevAnswers => {
            const otherAnswers = prevAnswers.filter(a => a.questionIndex !== questionIndex);
            return [...otherAnswers, { questionIndex, selectedOption, isCorrect }];
        });
    };
    
    const resetSession = () => {
        setUserAnswers([]);
        setCurrentQuestionIndex(0);
        setQuizState('in-progress');
    };
    
    const clearInputs = () => {
        setSourceFile(null);
        setSourceText('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDownload = async (format: 'txt' | 'pdf' | 'json') => {
        if (generatedQuestions.length === 0) {
            toast({ variant: "destructive", title: "لا توجد أسئلة للتنزيل" });
            return;
        }

        const downloadFileName = (fileName ? fileName.split('.').slice(0, -1).join('.') : 'أسئلة');
        let blob: Blob;
        let fileExtension: string;

        if (format === 'pdf') {
            const { default: jsPDF } = await import('jspdf');
            // You might need to add a custom font that supports Arabic
            const doc = new jsPDF();
            
            let y = 10;
            doc.text(`Generated Questions from: ${fileName || 'Custom Text'}`, 10, y);
            y += 10;

            generatedQuestions.forEach((q, index) => {
                if (y > 280) {
                    doc.addPage();
                    y = 10;
                }
                const questionText = doc.splitTextToSize(`Q${index + 1}: ${q.question}`, 180);
                doc.text(questionText, 10, y);
                y += questionText.length * 5;

                if (isInteractive && q.options && q.options.length > 0) {
                    q.options.forEach((opt) => {
                        const optionText = doc.splitTextToSize(`- ${opt}`, 170);
                        doc.text(optionText, 15, y);
                        y += optionText.length * 5;
                    });
                }
                 const answerText = doc.splitTextToSize(`Answer: ${q.correctAnswer}`, 180);
                 doc.text(answerText, 10, y);
                 y += answerText.length * 5;

                 const explanationText = doc.splitTextToSize(`Explanation: ${q.explanation}`, 180);
                 doc.text(explanationText, 10, y);
                 y += explanationText.length * 5 + 10;
            });
            blob = doc.output('blob');
            fileExtension = 'pdf';

        } else if (format === 'json') {
             blob = new Blob([JSON.stringify(generatedQuestions, null, 2)], { type: 'application/json' });
             fileExtension = 'json';
        } else { // txt
            let content = `الأسئلة التي تم إنشاؤها من: ${fileName || 'نص مخصص'}\n\n`;
            content += "========================================\n\n";
            generatedQuestions.forEach((q, index) => {
                content += `سؤال ${index + 1}: ${q.question}\n`;
                if (isInteractive && q.options && q.options.length > 0) {
                    const choices = ['أ', 'ب', 'ج', 'د'];
                    content += "الخيارات:\n";
                    q.options.forEach((opt, i) => content += `${choices[i]}- ${opt}\n`);
                }
                content += `الإجابة الصحيحة: ${q.correctAnswer}\n`;
                content += `الشرح: ${q.explanation}\n\n`;
                content += "----------------------------------------\n\n";
            });
            blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            fileExtension = 'txt';
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${downloadFileName}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleSaveSession = useCallback(async (currentFileName: string) => {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'المستخدم غير مسجل دخوله' });
            return;
        }
        if (generatedQuestions.length === 0) {
            return;
        }
        if (!currentFileName.trim()) {
            toast({ variant: 'destructive', title: 'اسم الجلسة مطلوب للحفظ' });
            return;
        }

        setIsSaving(true);
        const sessionId = selectedSessionId || doc(collection(firestore, `users/${user.uid}/questionSessions`)).id;
        const docRef = doc(firestore, `users/${user.uid}/questionSessions`, sessionId);
        const dataToSave: SavedSession = {
            id: sessionId,
            fileName: currentFileName,
            questions: generatedQuestions,
            isInteractive,
            uploadDate: new Date().toISOString(),
            userId: user.uid,
            userAnswers: userAnswers,
        };
        try {
            await setDoc(docRef, dataToSave, { merge: true });
            toast({ title: "تم الحفظ بنجاح!", description: `تم حفظ "${currentFileName}".` });
            if (!selectedSessionId) {
                setSelectedSessionId(sessionId);
            }
        } catch (error) {
            console.error("Failed to save to Firestore:", error);
            toast({ variant: "destructive", title: "فشل الحفظ" });
        } finally {
            setIsSaving(false);
        }
    }, [user, firestore, generatedQuestions, isInteractive, selectedSessionId, userAnswers, toast]);
    
    const handleViewSession = (session: SavedSession) => {
        setGeneratedQuestions(session.questions);
        setFileName(session.fileName);
        setIsInteractive(session.isInteractive);
        setSelectedSessionId(session.id);
        setUserAnswers(session.userAnswers || []);
        setQuizState('not-started');
        setCurrentQuestionIndex(0);
        clearInputs();
        toast({ title: `جاري عرض: ${session.fileName}` });
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (!user || !firestore) return;
        const docRef = doc(firestore, `users/${user.uid}/questionSessions`, sessionId);
        try {
            await deleteDoc(docRef);
            toast({ title: "تم حذف الجلسة بنجاح" });
            if (selectedSessionId === sessionId) {
                handleNewSession();
            }
        } catch (error) {
            console.error("Failed to delete session:", error);
            toast({ variant: "destructive", title: "فشل الحذف" });
        }
    };

    const handleNewSession = () => {
        setGeneratedQuestions([]);
        setUserAnswers([]);
        setFileName('');
        setSelectedSessionId(null);
        setQuizState('not-started');
        setCurrentQuestionIndex(0);
        clearInputs();
        toast({ title: 'جلسة جديدة جاهزة للبدء' });
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < generatedQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            setQuizState('finished');
            handleSaveSession(fileName); // Auto-save on quiz completion
        }
    };

    const retryIncorrect = () => {
        const incorrectQuestions = userAnswers.filter(a => !a.isCorrect).map(a => generatedQuestions[a.questionIndex]);
        setGeneratedQuestions(incorrectQuestions);
        setUserAnswers([]);
        setCurrentQuestionIndex(0);
        setQuizState('in-progress');
        setFileName(prev => `${prev} (مراجعة الأخطاء)`);
        setSelectedSessionId(null); // This is a new session based on the old one
    };

    const isGenerateButtonDisabled = isGenerating || (inputMode === 'file' && !sourceFile) || (inputMode === 'text' && !sourceText.trim());

    const correctCount = userAnswers.filter(a => a.isCorrect).length;
    const incorrectCount = userAnswers.length - correctCount;

    const renderMainContent = () => {
        if (generatedQuestions.length === 0) {
            return (
                 <CardContent className="space-y-6">
                    <Tabs value={inputMode} onValueChange={(value) => setInputMode(value as InputMode)} className="w-full" dir="rtl">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="file"><FileUp className="ml-2" /> رفع ملف</TabsTrigger>
                            <TabsTrigger value="text"><Type className="ml-2" /> إدخال نص</TabsTrigger>
                        </TabsList>
                        <TabsContent value="file" className="mt-4 relative">
                            <div 
                                className="flex justify-center items-center w-full px-6 py-10 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-secondary transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="text-center">
                                    <FileUp className="mx-auto h-12 w-12 text-muted-foreground"/>
                                    <p className="mt-2 text-sm text-foreground">
                                        {sourceFile && fileName ? <span className="font-semibold text-primary">{fileName}</span> : <>
                                            <span className="font-semibold text-primary">انقر للاختيار</span> أو اسحب وأفلت صورة أو PDF
                                        </>}
                                    </p>
                                    <p className="text-xs text-muted-foreground">PDF, PNG, JPG, GIF</p>
                                </div>
                            </div>
                            <Input id="file-upload-qg" ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange}/>
                            {sourceFile && <Button variant="ghost" size="icon" className="absolute top-2 left-2" onClick={clearInputs}><RotateCcw className="w-5 h-5 text-muted-foreground" /></Button>}
                        </TabsContent>
                        <TabsContent value="text" className="mt-4 relative">
                            <Textarea placeholder="اكتب أو الصق النص هنا..." className="min-h-[150px] bg-secondary text-right" dir="rtl" value={sourceText} onChange={(e) => setSourceText(e.target.value)} />
                            {sourceText && <Button variant="ghost" size="icon" className="absolute top-2 left-2" onClick={clearInputs}><RotateCcw className="w-5 h-5 text-muted-foreground" /></Button>}
                        </TabsContent>
                    </Tabs>
                    
                    <Card className="p-4 bg-secondary">
                         <CardHeader className="p-2 pt-0"><CardTitle className="text-lg">إعدادات التوليد</CardTitle></CardHeader>
                        <CardContent className="p-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="num-questions" className="font-semibold text-foreground">عدد الأسئلة</Label>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="icon" className="h-8 w-8 bg-card" onClick={() => setNumQuestions(n => Math.max(1, n - 1))}><Minus className="h-4 w-4" /></Button>
                                            <Input id="num-questions" type="number" value={numQuestions} onChange={e => setNumQuestions(Math.max(1, Math.min(MAX_QUESTIONS, parseInt(e.target.value) || 1)))} className="w-16 text-center bg-card" />
                                            <Button variant="outline" size="icon" className="h-8 w-8 bg-card" onClick={() => setNumQuestions(n => Math.min(MAX_QUESTIONS, n + 1))}><Plus className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="interactive-switch" className="font-semibold text-foreground">أسئلة تفاعلية</Label>
                                        <Switch id="interactive-switch" checked={isInteractive} onCheckedChange={(checked) => { setIsInteractive(checked); if (!checked) setQuizState('not-started'); }} />
                                    </div>
                                </div>
                                <div className="space-y-3 mt-4">
                                    <Label className="font-semibold text-foreground">مستوى الصعوبة</Label>
                                    <RadioGroup value={difficulty} onValueChange={(value: Difficulty) => setDifficulty(value)} className="grid grid-cols-3 gap-2" dir="rtl">
                                        {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => {
                                            const translations = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' };
                                            return (
                                                <div key={level}>
                                                    <RadioGroupItem value={level} id={level} className="sr-only" />
                                                    <Label htmlFor={level} className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-card p-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer", difficulty === level && "border-primary")}>
                                                        {translations[level]}
                                                    </Label>
                                                </div>
                                            );
                                        })}
                                    </RadioGroup>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Button onClick={handleGenerateQuestions} disabled={isGenerateButtonDisabled} className="w-full text-lg py-6">
                        {isGenerating ? <><Loader2 className="ml-2 h-5 w-5 animate-spin" /> جاري توليد الأسئلة...</> : <><Wand2 className="ml-2 h-5 w-5" /> توليد الأسئلة</>}
                    </Button>
                </CardContent>
            );
        }

        if (quizState === 'in-progress') return <QuizView />;
        if (quizState === 'finished') return <ResultsView />;

        return (
            <CardContent className="text-center">
                 <h3 className="text-xl font-bold mb-4">تم إنشاء {generatedQuestions.length} سؤال</h3>
                 <p className="text-muted-foreground mb-6">هل أنت مستعد لبدء الاختبار؟</p>
                 <Button onClick={() => setQuizState('in-progress')} size="lg">ابدأ الاختبار</Button>
            </CardContent>
        );
    }
    
    const QuizView = () => {
        const question = generatedQuestions[currentQuestionIndex];
        const userAnswer = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
        const progress = ((currentQuestionIndex + 1) / generatedQuestions.length) * 100;

        return (
            <CardContent className="space-y-6">
                 <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                       <span>السؤال: {currentQuestionIndex + 1} / {generatedQuestions.length}</span>
                       <div className="flex gap-4">
                           <span className="flex items-center gap-1 text-green-500"><Check className="w-4 h-4"/> {correctCount}</span>
                           <span className="flex items-center gap-1 text-red-500"><XCircle className="w-4 h-4"/> {incorrectCount}</span>
                       </div>
                    </div>
                    <Progress value={progress} />
                 </div>

                <Card className="bg-secondary p-6" dir="rtl">
                    <p className="font-bold text-lg">{question.question}</p>
                    <RadioGroup
                        className="space-y-3 mt-4"
                        onValueChange={(value) => handleAnswerSelect(currentQuestionIndex, value)}
                        value={userAnswer?.selectedOption}
                        disabled={!!userAnswer}
                    >
                        {question.options.map((opt, i) => {
                            const isSelected = userAnswer?.selectedOption === opt;
                            const isCorrectAnswer = question.correctAnswer === opt;
                            return (
                                <div key={i} className={cn("flex items-center space-x-2 p-3 rounded-md border-2 transition-all",
                                    "space-x-reverse",
                                    !userAnswer ? "border-muted hover:border-primary cursor-pointer" :
                                    isSelected && !isCorrectAnswer ? "bg-red-900/50 border-red-500" :
                                    isCorrectAnswer ? "bg-green-900/50 border-green-500" : "border-muted"
                                )}>
                                    <RadioGroupItem value={opt} id={`q${currentQuestionIndex}-opt${i}`} />
                                    <Label htmlFor={`q${currentQuestionIndex}-opt${i}`} className="flex-1 cursor-pointer text-base">
                                        {opt}
                                    </Label>
                                    {userAnswer && isSelected && !isCorrectAnswer && <XCircle className="w-6 h-6 text-red-400" />}
                                    {userAnswer && isCorrectAnswer && <Check className="w-6 h-6 text-green-400" />}
                                </div>
                            );
                        })}
                    </RadioGroup>

                    {userAnswer && (
                        <div className="mt-4 p-4 bg-card rounded-md border border-border animate-in fade-in-50">
                            <p className="font-bold flex items-center gap-2"><Lightbulb className="w-5 h-5 text-primary" /> الشرح:</p>
                            <p className="text-muted-foreground mt-1">{question.explanation}</p>
                        </div>
                    )}
                </Card>

                {userAnswer && (
                     <Button onClick={handleNextQuestion} className="w-full text-lg py-6">
                        {currentQuestionIndex < generatedQuestions.length - 1 ? 'السؤال التالي' : 'إنهاء الاختبار'}
                    </Button>
                )}
            </CardContent>
        );
    };

    const ResultsView = () => {
        const score = Math.round((correctCount / generatedQuestions.length) * 100);
        return (
            <CardContent className="text-center space-y-6">
                <h3 className="text-2xl font-bold text-primary">اكتمل الاختبار!</h3>
                <p className="text-4xl font-bold">{score}%</p>
                <div className="w-full bg-secondary rounded-full h-4">
                    <div className="bg-primary h-4 rounded-full" style={{ width: `${score}%` }}></div>
                </div>
                 <div className="flex justify-center gap-4 text-lg">
                    <span className="flex items-center gap-2"><Check className="w-5 h-5 text-green-500"/>صحيح: <span className="font-bold">{correctCount}</span></span>
                    <span className="flex items-center gap-2"><XCircle className="w-5 h-5 text-red-500"/>خطأ: <span className="font-bold">{incorrectCount}</span></span>
                 </div>

                 <div className="flex flex-wrap justify-center gap-4">
                     <Button onClick={resetSession} variant="outline"><RotateCcw className="ml-2 h-4 w-4"/> إعادة الاختبار</Button>
                     {incorrectCount > 0 && <Button onClick={retryIncorrect}><Wand2 className="ml-2 h-4 w-4"/> مراجعة الأخطاء فقط</Button>}
                     <Button onClick={() => setQuizState('not-started')} variant="secondary">العودة للبداية</Button>
                 </div>
                 
                 <div className='w-full pt-6 border-t border-border'>
                    <h4 className="text-xl font-bold mb-4 text-right">ملخص الإجابات</h4>
                     <ScrollArea className="h-96 text-right">
                        <div className="space-y-4 pr-2">
                             {generatedQuestions.map((q, index) => {
                                const answer = userAnswers.find(a => a.questionIndex === index);
                                return (
                                <Card key={index} className={cn("p-4 text-sm", answer?.isCorrect ? "border-green-500/30" : "border-red-500/30")}>
                                     <p className="font-bold">{index + 1}. {q.question}</p>
                                     <p className="mt-2 text-muted-foreground">إجابتك: <span className={cn(answer?.isCorrect ? "text-green-400" : "text-red-400")}>{answer?.selectedOption || "لم تتم الإجابة"}</span></p>
                                     {!answer?.isCorrect && <p className="text-green-400">الإجابة الصحيحة: {q.correctAnswer}</p>}
                                </Card>
                                )
                            })}
                        </div>
                     </ScrollArea>
                 </div>

            </CardContent>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <Card className="w-full shadow-lg bg-card border-none min-h-[500px]">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-xl font-bold text-primary">توليد الأسئلة</CardTitle>
                             { (generatedQuestions.length > 0) && (
                                <Button variant="outline" onClick={handleNewSession}><PlusCircle className="ml-2 h-4 w-4"/> جلسة جديدة</Button>
                             )}
                        </div>
                    </CardHeader>
                    {renderMainContent()}
                </Card>
            </div>

            {user && (
                <div className="lg:col-span-1">
                     <Card className="w-full shadow-lg bg-card border-none sticky top-6">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold text-primary">إدارة الجلسات</CardTitle>
                        </CardHeader>
                         <CardContent className="space-y-4">
                             <div className="space-y-2">
                                 <Label htmlFor="sessionName" className="text-right w-full block font-semibold">اسم الجلسة الحالية</Label>
                                 <Input
                                    id="sessionName"
                                    value={fileName}
                                    onChange={(e) => setFileName(e.target.value)}
                                    onBlur={(e) => handleSaveSession(e.target.value)}
                                    placeholder="أدخل اسمًا للحفظ التلقائي..."
                                    className="text-right bg-secondary focus-visible:ring-primary w-full"
                                    disabled={isSaving}
                                />
                             </div>
                             <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" onClick={() => handleDownload('txt')} disabled={!generatedQuestions.length}>
                                    <FileText className="ml-2"/>
                                    TXT
                                </Button>
                                 <Button variant="outline" onClick={() => handleDownload('pdf')} disabled={!generatedQuestions.length}>
                                    <FileType className="ml-2"/>
                                    PDF
                                </Button>
                             </div>
                             
                            <ScrollArea className="h-96 w-full mt-2 border-t border-border pt-4">
                                <ul className="w-full space-y-2 pr-2">
                                    {isLoadingFiles && <p className='text-center w-full text-muted-foreground'>جاري تحميل الجلسات...</p>}
                                    {savedSessions && savedSessions.map((session) => (
                                    <li key={session.id} className={cn("flex items-center justify-between p-3 rounded-lg bg-secondary cursor-pointer", selectedSessionId === session.id && "ring-2 ring-primary")} dir="rtl">
                                        <div className="flex flex-col overflow-hidden" onClick={() => handleViewSession(session)}>
                                            <span className="font-bold text-foreground truncate">{session.fileName}</span>
                                            <span className="text-xs text-muted-foreground">{new Date(session.uploadDate).toLocaleString()}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteSession(session.id)}>
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">حذف</span>
                                            </Button>
                                        </div>
                                    </li>
                                    ))}
                                    {savedSessions && savedSessions.length === 0 && !isLoadingFiles && (
                                        <li className="text-center text-muted-foreground p-4">لا توجد جلسات محفوظة.</li>
                                    )}
                                </ul>
                            </ScrollArea>
                        </CardContent>
                     </Card>
                </div>
             )}
        </div>
    );
}
