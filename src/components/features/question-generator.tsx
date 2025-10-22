"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FileUp, Plus, Minus, Wand2, Download, Trash2, Check, XCircle, Lightbulb, Type, RotateCcw } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { generateQuestions, Question, GenerateQuestionsOutput } from '@/ai/flows/question-generation-flow';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const MAX_QUESTIONS = 100;
type Difficulty = 'easy' | 'medium' | 'hard';
type InputMode = 'file' | 'text';
type Language = 'ar' | 'en';

interface UserAnswer {
    questionIndex: number;
    selectedOption: string;
    isCorrect: boolean;
}

export function QuestionGenerator() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
    const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
    const [sourceFile, setSourceFile] = useState<string | null>(null);
    const [sourceText, setSourceText] = useState('');
    const [numQuestions, setNumQuestions] = useState(5);
    const [isInteractive, setIsInteractive] = useState(true);
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');
    const [language, setLanguage] = useState<Language>('ar');
    const [inputMode, setInputMode] = useState<InputMode>('file');
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setGeneratedQuestions([]);
        setUserAnswers([]);
        setSourceFile(null);

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
                language: language,
                numQuestions: numQuestions,
                interactive: isInteractive,
                difficulty: difficulty,
            });

            let result: GenerateQuestionsOutput;
            try {
                // Clean the response to ensure it's a valid JSON string
                const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("Response did not contain a valid JSON object.");
                }
                result = JSON.parse(jsonMatch[0]);

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
    };
    
    const clearInputs = () => {
        setSourceFile(null);
        setSourceText('');
        setFileName('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const renderResults = () => {
        if (!isInteractive || userAnswers.length !== generatedQuestions.length || generatedQuestions.length === 0) {
            return null;
        }
        const correctCount = userAnswers.filter(a => a.isCorrect).length;
        const totalCount = generatedQuestions.length;
        const score = (correctCount / totalCount) * 100;

        return (
            <div className="w-full border-t border-border pt-4 mt-6 text-center space-y-4">
                 <h3 className="text-xl font-bold text-primary">النتيجة النهائية</h3>
                 <p className="text-lg">لقد أجبت على <span className="font-bold text-foreground">{correctCount}</span> من <span className="font-bold text-foreground">{totalCount}</span> بشكل صحيح.</p>
                 <div className="w-full bg-secondary rounded-full h-4">
                     <div 
                        className="bg-primary h-4 rounded-full transition-all duration-500" 
                        style={{ width: `${score}%`}}
                    ></div>
                 </div>
                 <Button onClick={resetSession} variant="outline">
                    <RotateCcw className="ml-2 h-4 w-4"/>
                    إعادة المحاولة
                 </Button>
            </div>
        );
    }

    const handleDownload = () => {
        if (generatedQuestions.length === 0) {
            toast({
                variant: "destructive",
                title: "لا توجد أسئلة للتنزيل",
            });
            return;
        }
        let content = `الأسئلة التي تم إنشاؤها من: ${inputMode === 'file' ? fileName : 'نص مخصص'}\n\n`;
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
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const downloadFileName = (fileName ? fileName.split('.').slice(0, -1).join('.') : 'أسئلة') + '.txt';
        link.download = downloadFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const isGenerateButtonDisabled = isGenerating || (inputMode === 'file' && !sourceFile) || (inputMode === 'text' && !sourceText.trim());

    return (
        <Card className="w-full max-w-4xl mx-auto shadow-lg bg-card border-none">
            <CardHeader>
                <CardTitle className="text-center text-2xl font-bold text-primary">توليد الأسئلة من المحتوى</CardTitle>
            </CardHeader>
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
                                    {fileName ? <span className="font-semibold text-primary">{fileName}</span> : <>
                                        <span className="font-semibold text-primary">انقر للاختيار</span> أو اسحب وأفلت صورة أو PDF هنا
                                    </>}
                                </p>
                                <p className="text-xs text-muted-foreground">PDF, PNG, JPG, GIF</p>
                            </div>
                        </div>
                        <Input
                            id="file-upload-qg"
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                         {sourceFile && (
                            <Button variant="ghost" size="icon" className="absolute top-2 left-2" onClick={clearInputs}>
                                <RotateCcw className="w-5 h-5 text-muted-foreground" />
                            </Button>
                        )}
                    </TabsContent>
                    <TabsContent value="text" className="mt-4 relative">
                         <Textarea
                            placeholder="اكتب أو الصق النص هنا..."
                            className="min-h-[150px] bg-secondary text-right"
                            dir="rtl"
                            value={sourceText}
                            onChange={(e) => setSourceText(e.target.value)}
                         />
                         {sourceText && (
                             <Button variant="ghost" size="icon" className="absolute top-2 left-2" onClick={clearInputs}>
                                <RotateCcw className="w-5 h-5 text-muted-foreground" />
                            </Button>
                         )}
                    </TabsContent>
                </Tabs>
                
                <Card className="p-4 bg-secondary">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                             <div className="flex items-center justify-between">
                                <Label htmlFor="language-select" className="font-semibold text-foreground">لغة الأسئلة</Label>
                                <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
                                    <SelectTrigger id="language-select" className="w-[180px] bg-card">
                                        <SelectValue placeholder="اختر اللغة" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ar">العربية</SelectItem>
                                        <SelectItem value="en">English</SelectItem>
                                    </SelectContent>
                                </Select>
                             </div>
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
                                <Switch id="interactive-switch" checked={isInteractive} onCheckedChange={setIsInteractive} />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="font-semibold text-foreground">مستوى الصعوبة</Label>
                            <RadioGroup value={difficulty} onValueChange={(value: Difficulty) => setDifficulty(value)} className="grid grid-cols-3 gap-2" dir="rtl">
                                {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => {
                                    const translations = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' };
                                    return (
                                        <div key={level}>
                                            <RadioGroupItem value={level} id={level} className="sr-only" />
                                            <Label htmlFor={level} className={cn("flex flex-col items-center justify-between rounded-md border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer", difficulty === level && "border-primary")}>
                                                {translations[level]}
                                            </Label>
                                        </div>
                                    );
                                })}
                            </RadioGroup>
                        </div>
                    </div>
                </Card>

                <Button onClick={handleGenerateQuestions} disabled={isGenerateButtonDisabled} className="w-full text-lg py-6">
                    {isGenerating ? <><Loader2 className="ml-2 h-5 w-5 animate-spin" /> جاري توليد الأسئلة...</> : <><Wand2 className="ml-2 h-5 w-5" /> توليد الأسئلة</>}
                </Button>
            </CardContent>
            
            {generatedQuestions.length > 0 && (
                <CardFooter className="flex flex-col items-start gap-4">
                    <h3 className="text-lg font-medium text-right w-full border-t border-border pt-4 text-primary">الأسئلة التي تم إنشاؤها</h3>
                    <div className="w-full space-y-4">
                        {generatedQuestions.map((q, index) => {
                            const userAnswer = userAnswers.find(a => a.questionIndex === index);
                            const choices = ['أ', 'ب', 'ج', 'د'];
                            return (
                            <Card key={index} className="bg-secondary p-4" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                <p className="font-bold">{`${index + 1}. ${q.question}`}</p>
                                {isInteractive && q.options && q.options.length > 0 ? (
                                    <RadioGroup
                                        className="space-y-2 mt-2"
                                        onValueChange={(value) => handleAnswerSelect(index, value)}
                                        value={userAnswer?.selectedOption}
                                        disabled={!!userAnswer}
                                    >
                                        {q.options.map((opt, i) => {
                                            const isSelected = userAnswer?.selectedOption === opt;
                                            const isCorrectAnswer = q.correctAnswer === opt;
                                            return (
                                                <div key={i} className={cn("flex items-center space-x-2 p-2 rounded-md border",
                                                    language === 'ar' ? "space-x-reverse" : "",
                                                    !userAnswer ? "border-transparent" :
                                                    isSelected && !isCorrectAnswer ? "bg-red-500/20 border-red-500" :
                                                    isCorrectAnswer ? "bg-green-500/20 border-green-500" : "border-transparent"
                                                )}>
                                                    <RadioGroupItem value={opt} id={`q${index}-opt${i}`} />
                                                    <Label htmlFor={`q${index}-opt${i}`} className="flex-1 cursor-pointer">
                                                        <span className="font-bold">{choices[i]}-</span> {opt}
                                                    </Label>
                                                    {userAnswer && isSelected && !isCorrectAnswer && <XCircle className="w-5 h-5 text-red-500" />}
                                                    {userAnswer && isCorrectAnswer && <Check className="w-5 h-5 text-green-500" />}
                                                </div>
                                            );
                                        })}
                                    </RadioGroup>
                                ) : (
                                    <div className="mt-2 text-green-400 font-semibold bg-green-500/10 p-2 rounded-md">{q.correctAnswer}</div>
                                )}
                                {userAnswer && (
                                    <div className="mt-3 p-3 bg-card rounded-md border border-border">
                                        <p className="font-bold flex items-center gap-2"><Lightbulb className="w-5 h-5 text-primary" /> {language === 'ar' ? 'الشرح:' : 'Explanation:'}</p>
                                        <p className="text-muted-foreground">{q.explanation}</p>
                                    </div>
                                )}
                            </Card>
                        )})}
                    </div>
                    {renderResults()}
                    <div className="flex w-full justify-end items-center pt-4 border-t border-border mt-4 gap-2">
                       <Button variant="outline" onClick={handleDownload}>
                           <Download className="ml-2"/>
                           تنزيل
                       </Button>
                       <Button variant="destructive" onClick={() => { setGeneratedQuestions([]); setUserAnswers([]); }}>
                           <Trash2 className="ml-2"/>
                           حذف الكل
                       </Button>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}
