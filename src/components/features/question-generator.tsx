"use client";

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Upload, FileDown, Trash2, FileQuestion, File as FileIcon, X, Save, FileText, View, Sparkles, Check, XIcon, Repeat, History, Pilcrow } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { generateQuestions, type Question, GenerateQuestionsInput } from '@/ai/flows/generate-questions-flow';
import { correctEssay, type CorrectEssayOutput } from '@/ai/flows/correct-essay-flow';
import { useUser, useFirestore, useMemoFirebase, useCollection, doc, setDoc, deleteDoc, collection } from '@/firebase';
import { cn } from '@/lib/utils';
import PptxGenJS from 'pptxgenjs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '../ui/textarea';

// --- Types ---
type QuestionType = 'multiple-choice' | 'essay';
type QuestionMode = 'interactive' | 'static';
type Difficulty = 'easy' | 'medium' | 'hard';
type QuizStatus = 'not-started' | 'in-progress' | 'completed';

interface UserAnswer {
    questionIndex: number;
    answer: string;
    isCorrect?: boolean;
    correction?: CorrectEssayOutput;
}

interface SavedSession {
    id: string;
    fileName: string;
    questions: Question[];
    questionType: QuestionType;
    questionMode: QuestionMode;
    uploadDate: string;
    userAnswers?: UserAnswer[];
}

// --- Main Component ---
export function QuestionGenerator() {
    // State Management
    const [contextFile, setContextFile] = useState<{ name: string; url: string; type: string } | null>(null);
    const [questionCount, setQuestionCount] = useState<number>(5);
    const [questionType, setQuestionType] = useState<QuestionType>('multiple-choice');
    const [questionMode, setQuestionMode] = useState<QuestionMode>('interactive');
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');
    const [sessionName, setSessionName] = useState('');
    const [generatedSession, setGeneratedSession] = useState<SavedSession | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    
    // Quiz State
    const [quizState, setQuizState] = useState<{ status: QuizStatus, answers: UserAnswer[] }>({ status: 'not-started', answers: [] });
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string>('');
    const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
    const [isCorrecting, setIsCorrecting] = useState(false);


    // Refs and Hooks
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    // Firestore Collection
    const userQuestionCollection = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return collection(firestore, `users/${user.uid}/questionSessions`);
    }, [firestore, user]);
    const { data: savedSessions, isLoading: isLoadingSessions } = useCollection<SavedSession>(userQuestionCollection);

    // --- Handlers ---
    const handleGenerate = async () => {
        if (!contextFile) {
            toast({ variant: 'destructive', title: 'لا يوجد ملف', description: 'الرجاء رفع ملف أولاً.' });
            return;
        }
        setIsGenerating(true);
        handleNewSession(); // Clear previous state
        try {
            const result = await generateQuestions({
                file: { url: contextFile.url },
                count: questionCount,
                questionType,
                difficulty,
            });

            if (result && result.questions.length > 0) {
                 const newSessionId = doc(collection(firestore!, 'users')).id; // Temporary client-side ID
                const newSession: SavedSession = {
                    id: newSessionId,
                    fileName: sessionName || contextFile.name.split('.')[0] || `جلسة ${new Date().toLocaleDateString()}`,
                    questions: result.questions,
                    questionType: questionType,
                    questionMode: questionMode,
                    uploadDate: new Date().toISOString(),
                    userAnswers: [],
                };
                setGeneratedSession(newSession);
                setSelectedSessionId(newSession.id);
                setSessionName(newSession.fileName);
                toast({ title: "تم إنشاء الأسئلة بنجاح!" });

                if (newSession.questionMode === 'interactive') {
                    startQuiz(newSession.questions);
                }

            } else {
                throw new Error("Failed to generate questions.");
            }
        } catch (error) {
            console.error("Question generation failed:", error);
            toast({ variant: "destructive", title: "فشل إنشاء الأسئلة", description: "حدث خطأ أثناء التواصل مع الذكاء الاصطناعي." });
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
                setContextFile({ name: file.name, url: url, type: file.type });
                if (!sessionName) setSessionName(file.name.split('.')[0]);
                toast({ title: 'تم إرفاق الملف', description: `"${file.name}".` });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSaveSession = useCallback(async (sessionToSave: SavedSession, isNew = false) => {
        if (!user || !firestore) return;
        const docRef = doc(firestore, `users/${user.uid}/questionSessions`, sessionToSave.id);
        
        try {
            await setDoc(docRef, sessionToSave, { merge: true });
            if (isNew) {
                 toast({ title: "تم حفظ الجلسة بنجاح!" });
            }
        } catch (serverError) {
             const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: isNew ? 'create' : 'update',
                requestResourceData: sessionToSave,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    }, [user, firestore, toast]);

    const handleNewSession = () => {
        setContextFile(null);
        setSessionName('');
        setGeneratedSession(null);
        setSelectedSessionId(null);
        setQuizState({ status: 'not-started', answers: [] });
        setCurrentQuestionIndex(0);
        setSelectedAnswer('');
        setIsAnswerSubmitted(false);
        if(fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (!user || !firestore) return;
        const docRef = doc(firestore, `users/${user.uid}/questionSessions`, sessionId);
        deleteDoc(docRef)
            .then(() => {
                toast({ title: "تم حذف الجلسة بنجاح!" });
                if (selectedSessionId === sessionId) handleNewSession();
            })
            .catch(() => toast({ variant: "destructive", title: "فشل الحذف" }));
    };

    const handleViewSession = (session: SavedSession) => {
        setGeneratedSession(session);
        setSessionName(session.fileName);
        setSelectedSessionId(session.id);
        setQuestionType(session.questionType);
        setQuestionMode(session.questionMode);
        setQuizState({ status: 'not-started', answers: session.userAnswers || [] });
        setCurrentQuestionIndex(0);
        setSelectedAnswer('');
        setIsAnswerSubmitted(false);
        setContextFile(null);
        toast({ title: `جاري عرض: ${session.fileName}` });
    };

    // --- Quiz Logic ---
    const startQuiz = (questions?: Question[]) => {
        const targetQuestions = questions || generatedSession?.questions;
        if (!targetQuestions) return;

        setGeneratedSession(prev => prev ? { ...prev, questions: targetQuestions } : null);
        setQuizState({ status: 'in-progress', answers: [] });
        setCurrentQuestionIndex(0);
        setSelectedAnswer('');
        setIsAnswerSubmitted(false);
    };

    const handleAnswerSelect = (selected: string) => {
        if (isAnswerSubmitted) return;
        setSelectedAnswer(selected);
    };

    const handleSubmitAnswer = async () => {
        if (!selectedAnswer || !generatedSession) return;
        
        const currentQuestion = generatedSession.questions[currentQuestionIndex];
        let newAnswer: UserAnswer | null = null;

        if (generatedSession.questionType === 'multiple-choice') {
            const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
            newAnswer = { questionIndex: currentQuestionIndex, answer: selectedAnswer, isCorrect };
            setIsAnswerSubmitted(true);
        } else { // Essay question
            setIsCorrecting(true);
            try {
                const correction = await correctEssay({
                    question: currentQuestion.question,
                    idealAnswer: currentQuestion.correctAnswer,
                    userAnswer: selectedAnswer
                });
                newAnswer = { questionIndex: currentQuestionIndex, answer: selectedAnswer, correction };
                setIsAnswerSubmitted(true);
            } catch (e) {
                toast({ variant: 'destructive', title: 'خطأ في التصحيح', description: 'فشل التواصل مع الذكاء الاصطناعي لتقييم الإجابة.' });
            } finally {
                setIsCorrecting(false);
            }
        }
        
        if (newAnswer) {
             const updatedAnswers = [...quizState.answers, newAnswer];
             setQuizState(prev => ({ ...prev, answers: updatedAnswers }));
             
             const isFirstAnswerForSession = (generatedSession.userAnswers || []).length === 0;
             const updatedSession = { ...generatedSession, userAnswers: updatedAnswers };
             setGeneratedSession(updatedSession); // Update local state immediately
             handleSaveSession(updatedSession, isFirstAnswerForSession);
        }
    };

    const handleNextQuestion = () => {
        if (!generatedSession) return;

        if (currentQuestionIndex < generatedSession.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer('');
            setIsAnswerSubmitted(false);
        } else {
            setQuizState(prev => ({ ...prev, status: 'completed' }));
        }
    };
    
    // --- Export Logic ---
    const exportToTxt = () => {
        if (!generatedSession) return;
        let content = `${generatedSession.fileName}\n\n`;
        generatedSession.questions.forEach((q, i) => {
            content += `Q${i + 1}: ${q.question}\n`;
            if (q.options) {
                q.options.forEach(opt => content += `- ${opt}\n`);
            }
            content += `Answer: ${q.correctAnswer}\n`;
            content += `Explanation: ${q.explanation}\n\n`;
        });
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${generatedSession.fileName}.txt`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportToPdf = () => {
      if (!generatedSession) return;
      const doc = new jsPDF();
      
      // Add Amiri font for Arabic support.
      // This is a simplified approach. For production, you'd host the font file.
      // jsPDF has built-in fonts, but none support Arabic well.
      // The following is a common pattern but requires the font to be available.
      // For this environment, we rely on jspdf-autotable's ability to handle this better with the right font name.
      doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal'); // This line is illustrative
      doc.setFont('Amiri');

      doc.text(generatedSession.fileName, 105, 15, { align: 'center' });

      const body = generatedSession.questions.map((q, i) => {
          let questionText = `${q.question} :${i + 1}س`;
          let optionsText = q.options ? q.options.join('\n') : 'N/A';
          let answerText = `${q.explanation} :شرح\n${q.correctAnswer} :إجابة`;
          return [answerText, optionsText, questionText];
      });

      (doc as any).autoTable({
          head: [['الإجابة والشرح', 'الخيارات', 'السؤال']],
          body: body,
          startY: 25,
          styles: { font: "Amiri", halign: 'right' }, // Use a font that supports Arabic
          headStyles: {fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'right'},
          columnStyles: {
              0: { halign: 'right' },
              1: { halign: 'right' },
              2: { halign: 'right' },
          }
      });
      
      doc.save(`${generatedSession.fileName}.pdf`);
    };

    const exportToPptx = () => {
      if (!generatedSession) return;
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';

      const titleSlide = pptx.addSlide();
      titleSlide.addText(generatedSession.fileName, { x: 0.5, y: 2.5, w: '90%', h: 1, align: 'center', fontSize: 32, bold: true, rtlMode: true });

      generatedSession.questions.forEach((q, i) => {
          const slide = pptx.addSlide();
          slide.addText(`سؤال ${i + 1}: ${q.question}`, { x: 0.5, y: 0.5, w: '90%', h: 1, fontSize: 24, bold: true, align: 'right', rtlMode: true });
          
          let bodyText = '';
          if (q.options) {
              bodyText += 'الخيارات:\n';
              q.options.forEach(opt => bodyText += `- ${opt}\n`);
          }
          bodyText += `\nالإجابة الصحيحة: ${q.correctAnswer}`;
          bodyText += `\n\nالشرح: ${q.explanation}`;

          slide.addText(bodyText, { x: 0.5, y: 1.5, w: '90%', h: 4, fontSize: 18, align: 'right', rtlMode: true });
      });

      pptx.writeFile({ fileName: `${generatedSession.fileName}.pptx` });
    };

    // --- Render Components ---
    const renderSettings = () => (
        <Card className="lg:col-span-1 h-fit shadow-lg bg-card border-none">
            <CardHeader><CardTitle className="text-center text-xl font-bold text-primary">إعدادات الاختبار</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                {/* File Upload */}
                <div className="space-y-2">
                    <Label htmlFor="file-upload-q" className="text-right w-full block font-semibold">ارفع ملف (صورة أو PDF)</Label>
                    <Input id="file-upload-q" ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf" />
                    <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="ml-2 h-4 w-4" /> اختر ملفًا
                    </Button>
                    {contextFile && (
                        <div className="relative mt-2 p-2 border border-dashed border-primary rounded-md flex items-center gap-2 text-sm bg-secondary">
                            <FileIcon className="w-4 h-4 text-primary" />
                            <span className="truncate">{contextFile.name}</span>
                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={() => { setContextFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                                <X className="w-3 h-3" />
                            </Button>
                        </div>
                    )}
                </div>
                {/* Session Name */}
                <div className="space-y-2">
                    <Label htmlFor="sessionName" className="text-right w-full block font-semibold">اسم الجلسة</Label>
                    <Input id="sessionName" value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="e.g., الفصل الأول أحياء" className="text-right bg-secondary" dir="rtl" />
                </div>
                {/* Question Count */}
                <div className="space-y-2">
                    <Label htmlFor="q-count" className="text-right w-full block font-semibold">عدد الأسئلة</Label>
                    <Input id="q-count" type="number" value={questionCount} onChange={(e) => setQuestionCount(parseInt(e.target.value) || 1)} className="bg-secondary" min="1" />
                </div>
                {/* Difficulty Level */}
                <div className="space-y-2">
                     <Label className="text-right w-full block font-semibold">مستوى الصعوبة</Label>
                     <RadioGroup value={difficulty} onValueChange={(v: any) => setDifficulty(v)} className="flex gap-4 justify-end">
                        <div className="flex items-center space-x-2 space-x-reverse"><RadioGroupItem value="easy" id="easy"/><Label htmlFor="easy">سهل</Label></div>
                        <div className="flex items-center space-x-2 space-x-reverse"><RadioGroupItem value="medium" id="medium"/><Label htmlFor="medium">متوسط</Label></div>
                        <div className="flex items-center space-x-2 space-x-reverse"><RadioGroupItem value="hard" id="hard"/><Label htmlFor="hard">صعب</Label></div>
                     </RadioGroup>
                </div>
                 {/* Question Type */}
                <div className="space-y-2">
                     <Label className="text-right w-full block font-semibold">نوع الأسئلة</Label>
                     <RadioGroup value={questionType} onValueChange={(v: any) => setQuestionType(v)} className="flex gap-4 justify-end">
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="multiple-choice" id="mcq"/>
                            <Label htmlFor="mcq">اختيار من متعدد</Label>
                        </div>
                         <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="essay" id="essay"/>
                             <Label htmlFor="essay">مقالي</Label>
                        </div>
                     </RadioGroup>
                </div>
                {/* Question Mode */}
                 <div className="space-y-2">
                     <Label className="text-right w-full block font-semibold">وضع الاختبار</Label>
                     <RadioGroup value={questionMode} onValueChange={(v: any) => setQuestionMode(v)} className="flex gap-4 justify-end">
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="interactive" id="interactive"/>
                            <Label htmlFor="interactive">تفاعلي</Label>
                        </div>
                         <div className="flex items-center space-x-2 space-x-reverse">
                            <RadioGroupItem value="static" id="static"/>
                             <Label htmlFor="static">عرض ثابت</Label>
                        </div>
                     </RadioGroup>
                </div>
                {/* Generate Button */}
                <Button onClick={handleGenerate} disabled={isGenerating || !contextFile} className="w-full text-lg py-6">
                    {isGenerating ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : <FileQuestion className="ml-2 h-5 w-5" />}
                    {isGenerating ? 'جاري الإنشاء...' : 'أنشئ الأسئلة'}
                </Button>
            </CardContent>
        </Card>
    );

    const renderQuizView = () => {
        if (!generatedSession) return null;
        const question = generatedSession.questions[currentQuestionIndex];
        const progress = ((currentQuestionIndex + 1) / generatedSession.questions.length) * 100;
        
        const lastAnswer = quizState.answers.find(a => a.questionIndex === currentQuestionIndex);

        return (
            <div className="space-y-6" dir="rtl">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>سؤال {currentQuestionIndex + 1} من {generatedSession.questions.length}</CardTitle>
                             <div className="flex gap-4 text-sm">
                                <span className="flex items-center gap-1 text-green-500"><Check/>{quizState.answers.filter(a => a.isCorrect || a.correction?.isCorrect).length} صحيح</span>
                                <span className="flex items-center gap-1 text-red-500"><XIcon/>{quizState.answers.filter(a => a.isCorrect === false || a.correction?.isCorrect === false).length} خطأ</span>
                            </div>
                        </div>
                        <Progress value={progress} className="mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="font-bold text-lg">{question.question}</p>
                        {question.questionType === 'multiple-choice' ? (
                            <RadioGroup onValueChange={handleAnswerSelect} value={selectedAnswer} disabled={isAnswerSubmitted}>
                                {question.options?.map((option, index) => {
                                    const answerState = isAnswerSubmitted
                                        ? (option === question.correctAnswer ? 'correct' : (option === selectedAnswer ? 'incorrect' : 'none'))
                                        : 'none';
                                    
                                    return (
                                        <Label key={index} className={cn("flex items-center p-3 border rounded-md cursor-pointer transition-colors",
                                            answerState === 'correct' && 'bg-green-500/20 border-green-500',
                                            answerState === 'incorrect' && 'bg-red-500/20 border-red-500',
                                            !isAnswerSubmitted && 'hover:bg-secondary'
                                        )}>
                                            <RadioGroupItem value={option} className="ml-3"/>
                                            {option}
                                        </Label>
                                    );
                                })}
                            </RadioGroup>
                        ) : (
                           <Textarea 
                                placeholder='اكتب إجابتك هنا...'
                                className='min-h-[150px] bg-secondary'
                                value={selectedAnswer}
                                onChange={(e) => setSelectedAnswer(e.target.value)}
                                disabled={isAnswerSubmitted || isCorrecting}
                           />
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col items-stretch gap-4">
                         {isAnswerSubmitted && lastAnswer && (
                            <Alert variant={lastAnswer.isCorrect || lastAnswer.correction?.isCorrect ? 'default' : 'destructive'}>
                                <AlertTitle>
                                   {generatedSession.questionType === 'multiple-choice'
                                        ? (lastAnswer.isCorrect ? 'إجابة صحيحة!' : 'إجابة خاطئة!')
                                        : (lastAnswer.correction?.isCorrect ? 'إجابتك صحيحة!' : 'إجابتك تحتاج لبعض التحسين')
                                   }
                                </AlertTitle>
                                <AlertDescription className="space-y-2">
                                     {generatedSession.questionType === 'multiple-choice' ? (
                                         <p className="font-bold">الشرح: {question.explanation}</p>
                                     ) : (
                                         <>
                                            <p><b>تقييم الذكاء الاصطناعي:</b> {lastAnswer.correction?.feedback}</p>
                                            {!lastAnswer.correction?.isCorrect && <p><b>الإجابة النموذجية:</b> {question.correctAnswer}</p>}
                                         </>
                                     )}
                                </AlertDescription>
                            </Alert>
                         )}
                         <Button onClick={isAnswerSubmitted ? handleNextQuestion : handleSubmitAnswer} disabled={!selectedAnswer || isCorrecting}>
                             {isCorrecting ? <Loader2 className='ml-2 animate-spin' /> : null}
                            {isCorrecting ? 'جاري التصحيح...' : (isAnswerSubmitted ? 'السؤال التالي' : 'تأكيد الإجابة')}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    };

    const renderResultsView = () => {
        if (!generatedSession) return null;
        const correctAnswers = quizState.answers.filter(a => a.isCorrect || a.correction?.isCorrect).length;
        const totalQuestions = generatedSession.questions.length;
        const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
        const questionsWithMistakes = generatedSession.questions.filter((_, i) => {
            const answer = quizState.answers.find(a => a.questionIndex === i);
            return !answer || (!answer.isCorrect && !answer.correction?.isCorrect);
        });


        return (
             <div className="space-y-6 text-right" dir="rtl">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-center text-2xl">النتائج النهائية</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                         <p className="text-lg">لقد حصلت على <span className="font-bold text-primary">{correctAnswers}</span> من <span className="font-bold">{totalQuestions}</span></p>
                         <p className="text-4xl font-bold text-primary">{score.toFixed(0)}%</p>
                         <div className="flex justify-center gap-4 pt-4">
                            <Button onClick={() => startQuiz()}>
                                <Repeat className="ml-2"/>إعادة الاختبار
                            </Button>
                            {questionsWithMistakes.length > 0 && (
                                <Button variant="outline" onClick={() => startQuiz(questionsWithMistakes)}>
                                   <History className="ml-2"/> مراجعة الأخطاء ({questionsWithMistakes.length})
                                </Button>
                            )}
                            <Button variant="secondary" onClick={() => {
                                setQuizState({ status: 'not-started', answers: generatedSession.userAnswers || [] });
                                setCurrentQuestionIndex(0);
                            }}>
                                العودة للجلسة
                            </Button>
                         </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>ملخص الأسئلة والإجابات</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {generatedSession.questions.map((q, i) => {
                            const userAnswer = quizState.answers.find(a => a.questionIndex === i);
                            const isMcqCorrect = q.questionType === 'multiple-choice' && userAnswer?.isCorrect;
                            const isEssayCorrect = q.questionType === 'essay' && userAnswer?.correction?.isCorrect;

                            return (
                                <div key={i} className="p-3 border rounded-lg">
                                    <p className="font-bold">{i+1}. {q.question}</p>
                                    {q.questionType === 'multiple-choice' && q.options ? (
                                        <ul className="mt-2 space-y-1 pr-4">
                                            {q.options.map((opt, j) => (
                                                <li key={j} className={cn("flex items-center gap-2",
                                                    opt === q.correctAnswer && 'text-green-500 font-bold',
                                                    opt === userAnswer?.answer && opt !== q.correctAnswer && 'text-red-500'
                                                )}>
                                                     {opt === q.correctAnswer ? <Check size={16}/> : (opt === userAnswer?.answer ? <XIcon size={16}/> : <Pilcrow size={12}/>)}
                                                    {opt}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className='mt-2 space-y-2 text-sm pr-4'>
                                            <p><b className={cn(isEssayCorrect ? 'text-green-500' : 'text-red-500')}>إجابتك:</b> {userAnswer?.answer || 'لم تتم الإجابة'}</p>
                                            {userAnswer?.correction && <p><b>التقييم:</b> {userAnswer.correction.feedback}</p>}
                                        </div>
                                    )}
                                     <p className="text-sm text-muted-foreground mt-2 border-t pt-2"><b>الشرح/الإجابة النموذجية:</b> {q.explanation}</p>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>
        );
    };

    const renderMainContent = () => {
        // Show placeholder if no session is active
        if (!generatedSession) {
             return (
                 <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                    <Sparkles className="w-16 h-16 mb-4 text-primary/50" />
                    <h2 className="text-2xl font-semibold text-foreground">مولد الأسئلة</h2>
                    <p>قم بإعداد اختبارك، ارفع ملفك، ودع الذكاء الاصطناعي ينشئ لك أسئلة للمراجعة.</p>
                </div>
            );
        }

        // --- INTERACTIVE MODE ---
        if (generatedSession.questionMode === 'interactive') {
            if (quizState.status === 'in-progress') return renderQuizView();
            if (quizState.status === 'completed') return renderResultsView();
            // If quiz is not started, show the "Start Quiz" button
            return (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                    <FileQuestion className="w-16 h-16 mb-4 text-primary/50" />
                    <h2 className="text-2xl font-semibold text-foreground">{generatedSession.fileName}</h2>
                    <p className='mb-4'>الجلسة جاهزة. لديك {generatedSession.questions.length} أسئلة.</p>
                    <Button onClick={() => startQuiz()} className="w-full max-w-sm">
                        بدء الاختبار
                    </Button>
                </div>
            );
        }

        // --- STATIC MODE ---
        // Default view for static mode: show all questions and answers
        return (
            <div className="space-y-4 text-right" dir="rtl">
                {generatedSession.questions.map((q, i) => (
                    <Card key={i}>
                        <CardHeader><CardTitle>سؤال {i+1}</CardTitle></CardHeader>
                        <CardContent>
                            <p className="font-bold">{q.question}</p>
                            {q.options && (
                                <ul className="mt-2 space-y-1 list-disc list-inside pr-4">
                                    {q.options.map((opt, j) => (
                                        <li key={j} className={cn(opt === q.correctAnswer && "font-bold text-primary")}>{opt}</li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                        <CardFooter className="bg-secondary/50 p-4 rounded-b-lg">
                           <p><b>الإجابة:</b> {q.correctAnswer}<br/><b>الشرح:</b> {q.explanation}</p>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {renderSettings()}
            
            <Card className="lg:col-span-2 shadow-lg bg-card border-none">
                <CardHeader>
                     <div className="flex w-full flex-col sm:flex-row items-center justify-between gap-4" dir="rtl">
                        <h2 className="text-xl font-bold text-primary truncate">{generatedSession?.fileName || "الأسئلة"}</h2>
                        {generatedSession && (
                             <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={exportToPdf}>تصدير PDF</Button>
                                <Button variant="outline" onClick={exportToPptx}>تصدير PPTX</Button>
                                <Button variant="outline" onClick={exportToTxt}>تصدير TXT</Button>
                                <Button onClick={handleNewSession}><FileText className="ml-2"/>جلسة جديدة</Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[600px] w-full p-4 border border-secondary rounded-lg">
                       {renderMainContent()}
                    </ScrollArea>
                </CardContent>
            </Card>

             {user && (
                <Card className="lg:col-span-3 shadow-lg bg-card border-none">
                     <CardHeader><CardTitle className="text-center text-xl font-bold text-primary">الجلسات المحفوظة</CardTitle></CardHeader>
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
                                    <li className="text-center text-muted-foreground p-4">لا توجد جلسات محفوظة.</li>
                                )}
                            </ul>
                         </ScrollArea>
                    </CardContent>
                </Card>
             )}
        </div>
    );
}

    