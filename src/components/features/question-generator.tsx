"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BrainCircuit, Loader2, FileUp, FileText, Download, Trash2, Settings, Plus, Minus, Wand2, MessageSquare, Check, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { generateQuestions, Question } from '@/ai/flows/question-generation-flow';

const MAX_QUESTIONS = 100;

export function QuestionGenerator() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
    const [sourceText, setSourceText] = useState('');
    const [numQuestions, setNumQuestions] = useState(5);
    const [isInteractive, setIsInteractive] = useState(true);
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // Placeholder for text extraction logic
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        toast({
            title: `تم رفع ملف: ${file.name}`,
            description: "لاستخراج النص وتوليد الأسئلة، اضغط على زر 'توليد الأسئلة'.",
        });

        // In a real app, you'd extract text from PDF/image here.
        // For now, we'll just use a placeholder text.
        setSourceText("باريس هي عاصمة فرنسا وأكبر مدنها من حيث عدد السكان. تقع على ضفاف نهر السين في الجزء الشمالي من البلاد.");
    };

    const handleGenerateQuestions = async () => {
        if (!sourceText) {
            toast({
                variant: 'destructive',
                title: 'لا يوجد محتوى',
                description: 'الرجاء رفع ملف أولاً لاستخراج النص.',
            });
            return;
        }

        setIsGenerating(true);
        setGeneratedQuestions([]);

        try {
            const result = await generateQuestions({
                text: sourceText,
                language: 'ar', // This would be detected from the text in a real scenario
                numQuestions: numQuestions,
                interactive: isInteractive,
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
        <Card className="w-full max-w-4xl shadow-2xl bg-card/80 backdrop-blur-sm border-primary/10 border-t-0 rounded-t-none">
            <CardContent className="space-y-6 pt-6">
                <div 
                    className="flex justify-center items-center w-full px-6 py-10 border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="text-center">
                        <FileUp className="mx-auto h-12 w-12 text-gray-400"/>
                        <p className="mt-2 text-sm text-foreground">
                            {fileName ? (
                                <span className="font-semibold text-primary">{fileName}</span>
                            ) : (
                                <>
                                    <span className="font-semibold text-primary">انقر للاختيار</span> أو اسحب وأفلت الملفات هنا
                                </>
                            )}
                        </p>
                        <p className="text-xs text-gray-500">ملفات PDF أو صور</p>
                    </div>
                </div>
                 <Input
                    id="file-upload-qg"
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />

                <Accordion type="single" collapsible>
                    <AccordionItem value="settings">
                        <AccordionTrigger>
                            <div className="flex items-center gap-2">
                                <Settings className="w-5 h-5" />
                                <span>إعدادات التوليد</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="num-questions">عدد الأسئلة</Label>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setNumQuestions(n => Math.max(1, n - 1))}><Minus className="h-4 w-4" /></Button>
                                    <Input id="num-questions" type="number" value={numQuestions} onChange={e => setNumQuestions(Math.max(1, Math.min(MAX_QUESTIONS, parseInt(e.target.value) || 1)))} className="w-16 text-center" />
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setNumQuestions(n => Math.min(MAX_QUESTIONS, n + 1))}><Plus className="h-4 w-4" /></Button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="interactive-switch">أسئلة تفاعلية (اختيار من متعدد)</Label>
                                <Switch id="interactive-switch" checked={isInteractive} onCheckedChange={setIsInteractive} />
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>


                <Button onClick={handleGenerateQuestions} disabled={isGenerating || !sourceText} className="w-full">
                    {isGenerating ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            جاري توليد الأسئلة...
                        </>
                    ) : (
                        <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            توليد الأسئلة
                        </>
                    )}
                </Button>
            </CardContent>
            {generatedQuestions.length > 0 && (
                <CardFooter className="flex flex-col items-start gap-4">
                    <h3 className="text-lg font-medium text-right w-full border-t pt-4">الأسئلة التي تم إنشاؤها</h3>
                    <Accordion type="single" collapsible className="w-full">
                        {generatedQuestions.map((q, index) => (
                            <AccordionItem value={`item-${index}`} key={index}>
                                <AccordionTrigger>{q.question}</AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-4 text-right pr-4">
                                        {q.isInteractive && q.options && (
                                            <div className="space-y-2">
                                                <h4 className="font-semibold">الخيارات:</h4>
                                                <ul className="list-inside list-disc">
                                                    {q.options.map((opt, i) => (
                                                        <li key={i} className={`flex items-center gap-2 justify-end ${opt === q.correctAnswer ? 'text-green-600' : 'text-foreground'}`}>
                                                            <span>{opt}</span>
                                                             {opt === q.correctAnswer && <Check className="w-4 h-4" />}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="font-semibold">الإجابة الصحيحة:</h4>
                                            <p className="flex items-center gap-2 justify-end">{q.correctAnswer} <Check className="w-4 h-4 text-green-600" /></p>
                                        </div>
                                         <div>
                                            <h4 className="font-semibold">الشرح:</h4>
                                            <p>{q.explanation}</p>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                    <div className="flex w-full justify-between items-center pt-4 border-t mt-4">
                        <div className="flex gap-2">
                           <Button variant="outline">
                               <Download className="ml-2"/>
                               تنزيل
                           </Button>
                           <Button variant="destructive" onClick={() => setGeneratedQuestions([])}>
                               <Trash2 className="ml-2"/>
                               حذف
                           </Button>
                        </div>
                        <h4 className="text-md font-bold">حفظ وتنزيل الأسئلة</h4>
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}
