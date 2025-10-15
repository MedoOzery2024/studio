"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BrainCircuit, Loader2, FileUp, FileText, Download, Trash2 } from 'lucide-react';

// This is a placeholder for now. It will be replaced with real data from the AI.
const placeholderQuestions = [
    {
        question: "ما هي عاصمة فرنسا؟",
        options: ["برلين", "مدريد", "باريس", "روما"],
        correctAnswer: "باريس",
        explanation: "باريس هي عاصمة فرنسا وأكبر مدنها."
    },
    {
        question: "كم عدد قارات العالم؟",
        options: ["5", "6", "7", "8"],
        correctAnswer: "7",
        explanation: "تعتبر سبع قارات هي النموذج الجغرافي الأكثر شيوعًا."
    }
];

export function QuestionGenerator() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);

    const handleGenerateQuestions = () => {
        setIsGenerating(true);
        // Simulate AI generation
        setTimeout(() => {
            setGeneratedQuestions(placeholderQuestions);
            setIsGenerating(false);
        }, 2000);
    };
    
    return (
        <Card className="w-full max-w-4xl shadow-2xl bg-card/80 backdrop-blur-sm border-primary/10">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl justify-center">
                    <BrainCircuit className="w-8 h-8 text-primary" />
                    <span>توليد الأسئلة بالذكاء الاصطناعي</span>
                </CardTitle>
                <CardDescription className="text-center">
                    ارفع ملف PDF أو صور لاستخراج النص وتوليد أسئلة تفاعلية وغير تفاعلية.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div 
                    className="flex justify-center items-center w-full px-6 py-10 border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors"
                    onClick={() => { /* File input click logic will be added here */ }}
                >
                    <div className="text-center">
                        <FileUp className="mx-auto h-12 w-12 text-gray-400"/>
                        <p className="mt-2 text-sm text-foreground">
                            <span className="font-semibold text-primary">انقر للاختيار</span> أو اسحب وأفلت الملفات هنا
                        </p>
                        <p className="text-xs text-gray-500">ملفات PDF أو صور</p>
                    </div>
                </div>

                <Button onClick={handleGenerateQuestions} disabled={isGenerating} className="w-full">
                    {isGenerating ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            جاري توليد الأسئلة...
                        </>
                    ) : (
                        <>
                            <FileText className="mr-2 h-4 w-4" />
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
                                    <div className="space-y-2 text-right pr-4">
                                        <p><strong>الإجابة الصحيحة:</strong> {q.correctAnswer}</p>
                                        <p><strong>الشرح:</strong> {q.explanation}</p>
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
                           <Button variant="destructive">
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
