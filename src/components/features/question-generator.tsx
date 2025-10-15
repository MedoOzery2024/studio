"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, FileUp, Settings, Plus, Minus, Wand2, Download, Trash2, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { generateQuestions, Question } from '@/ai/flows/question-generation-flow';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

const MAX_QUESTIONS = 100;
type Difficulty = 'easy' | 'medium' | 'hard';


export function QuestionGenerator() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [numQuestions, setNumQuestions] = useState(5);
    const [isInteractive, setIsInteractive] = useState(true);
    const [difficulty, setDifficulty] = useState<Difficulty>('medium');
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        setGeneratedQuestions([]);
        setSourceImage(null);

        const isPdf = file.type === 'application/pdf';
        const isImage = file.type.startsWith('image/');

        if (isPdf) {
            toast({
                variant: 'destructive',
                title: 'ملفات PDF غير مدعومة حاليًا',
                description: 'هذه الميزة تدعم تحليل الصور فقط في الوقت الحالي.',
            });
            setFileName('');
            return;
        }

        if (isImage) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                setSourceImage(dataUrl);
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
                description: 'الرجاء رفع ملف صورة.',
            });
        }
    };

    const handleGenerateQuestions = async () => {
        if (!sourceImage) {
            toast({
                variant: 'destructive',
                title: 'لا يوجد ملف صورة',
                description: 'الرجاء رفع صورة أولاً.',
            });
            return;
        }

        setIsGenerating(true);
        setGeneratedQuestions([]);

        try {
            const result = await generateQuestions({
                text: "Analyze the attached image to generate questions.", // Instruction for the AI
                image: sourceImage,
                language: 'ar',
                numQuestions: numQuestions,
                interactive: isInteractive,
                difficulty: difficulty,
            });

            if (result && result.questions) {
                setGeneratedQuestions(result.questions);
                toast({
                    title: 'تم توليد الأسئلة بنجاح!',
                    description: `تم إنشاء ${result.questions.length} سؤال.`,
                });
            } else {
                 throw new Error("No questions generated.");
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
    
    return (
        <Card className="w-full max-w-4xl mx-auto shadow-lg bg-card border-none">
            <CardHeader>
                <CardTitle className="text-center text-2xl font-bold text-primary">توليد الأسئلة من المحتوى</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div 
                    className="flex justify-center items-center w-full px-6 py-10 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-secondary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="text-center">
                        <FileUp className="mx-auto h-12 w-12 text-muted-foreground"/>
                        <p className="mt-2 text-sm text-foreground">
                            {fileName ? (
                                <span className="font-semibold text-primary">{fileName}</span>
                            ) : (
                                <>
                                    <span className="font-semibold text-primary">انقر للاختيار</span> أو اسحب وأفلت صورة هنا
                                </>
                            )}
                        </p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, GIF</p>
                    </div>
                </div>
                 <Input
                    id="file-upload-qg"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />

                <Accordion type="single" collapsible className="w-full rounded-lg bg-secondary px-4">
                    <AccordionItem value="settings" className="border-none">
                        <AccordionTrigger>
                            <div className="flex items-center gap-2 font-semibold">
                                <Settings className="w-5 h-5 text-primary" />
                                <span>إعدادات التوليد</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-6 pt-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="num-questions" className="font-semibold">عدد الأسئلة</Label>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setNumQuestions(n => Math.max(1, n - 1))}><Minus className="h-4 w-4" /></Button>
                                    <Input id="num-questions" type="number" value={numQuestions} onChange={e => setNumQuestions(Math.max(1, Math.min(MAX_QUESTIONS, parseInt(e.target.value) || 1)))} className="w-16 text-center bg-background" />
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setNumQuestions(n => Math.min(MAX_QUESTIONS, n + 1))}><Plus className="h-4 w-4" /></Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="interactive-switch" className="font-semibold">أسئلة تفاعلية (اختيار من متعدد)</Label>
                                <Switch id="interactive-switch" checked={isInteractive} onCheckedChange={setIsInteractive} />
                            </div>
                             <div className="space-y-3">
                                <Label className="font-semibold">مستوى الصعوبة</Label>
                                <RadioGroup
                                    value={difficulty}
                                    onValueChange={(value: Difficulty) => setDifficulty(value)}
                                    className="grid grid-cols-3 gap-2"
                                    dir="rtl"
                                >
                                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => {
                                        const translations = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' };
                                        return (
                                            <div key={level}>
                                                <RadioGroupItem value={level} id={level} className="sr-only" />
                                                <Label
                                                    htmlFor={level}
                                                    className={cn(
                                                        "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                                        difficulty === level && "border-primary"
                                                    )}
                                                >
                                                    {translations[level]}
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </RadioGroup>
                             </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>


                <Button onClick={handleGenerateQuestions} disabled={isGenerating || !sourceImage} className="w-full text-lg py-6">
                    {isGenerating ? (
                        <>
                            <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                            جاري توليد الأسئلة...
                        </>
                    ) : (
                        <>
                            <Wand2 className="ml-2 h-5 w-5" />
                            توليد الأسئلة
                        </>
                    )}
                </Button>
            </CardContent>
            {generatedQuestions.length > 0 && (
                <CardFooter className="flex flex-col items-start gap-4">
                    <h3 className="text-lg font-medium text-right w-full border-t border-border pt-4 text-primary">الأسئلة التي تم إنشاؤها</h3>
                    <Accordion type="single" collapsible className="w-full space-y-2">
                        {generatedQuestions.map((q, index) => (
                            <AccordionItem value={`item-${index}`} key={index} className="bg-secondary rounded-lg px-4 border-b-0">
                                <AccordionTrigger className="text-right hover:no-underline">{`سؤال ${index + 1}: ${q.question}`}</AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-4 text-right pr-4 border-r-2 border-primary mr-2">
                                        {q.isInteractive && q.options && q.options.length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="font-semibold">الخيارات:</h4>
                                                <ul className="space-y-1">
                                                    {q.options.map((opt, i) => (
                                                        <li key={i} className={`flex items-center gap-2 justify-end ${opt === q.correctAnswer ? 'text-green-400' : 'text-foreground'}`}>
                                                            <span>{opt}</span>
                                                             {opt === q.correctAnswer && <Check className="w-4 h-4" />}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="font-semibold">الإجابة الصحيحة:</h4>
                                            <p className="flex items-center gap-2 justify-end text-green-400">{q.correctAnswer} <Check className="w-4 h-4" /></p>
                                        </div>
                                         <div>
                                            <h4 className="font-semibold">الشرح:</h4>
                                            <p className="text-muted-foreground">{q.explanation}</p>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                    <div className="flex w-full justify-end items-center pt-4 border-t border-border mt-4 gap-2">
                       <Button variant="outline">
                           <Download className="ml-2"/>
                           تنزيل
                       </Button>
                       <Button variant="destructive" onClick={() => setGeneratedQuestions([])}>
                           <Trash2 className="ml-2"/>
                           حذف الكل
                       </Button>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}
