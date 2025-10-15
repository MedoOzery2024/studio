"use client";

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, User, Paperclip, Send, Loader2, File as FileIcon, X, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { askAssistant } from '@/ai/flows/assistant-flow';

interface Message {
    role: 'user' | 'model';
    content: { text: string }[];
}

interface AttachedFile {
    name: string;
    url: string; // data URI
    type: string;
}

export function AiAssistant() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth',
            });
        }
    }, [messages]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const currentInput = input.trim();
        const currentFile = attachedFile;

        if (!currentInput && !currentFile) return;

        let promptText = currentInput;
        if (currentFile && !currentInput) {
            promptText = `اشرح هذا الملف: ${currentFile.name}`;
        }
        
        const userMessage: Message = {
            role: 'user',
            content: [{ text: promptText }],
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setAttachedFile(null);
        setIsLoading(true);

        try {
             const result = await askAssistant({
                prompt: promptText,
                file: currentFile ? { url: currentFile.url } : undefined,
            });

            if (result && result.response) {
                const aiMessage: Message = {
                    role: 'model',
                    content: [{ text: result.response }],
                };
                setMessages(prev => [...prev, aiMessage]);
            } else {
                throw new Error("No response from AI.");
            }

        } catch (error) {
            console.error("AI Assistant Error:", error);
            const errorMessage: Message = {
                role: 'model',
                content: [{ text: "حدث خطأ: فشل الاتصال بالمساعد الذكي. الرجاء المحاولة مرة أخرى." }],
            };
            setMessages(prev => [...prev, errorMessage]);
            toast({
                variant: 'destructive',
                title: 'حدث خطأ',
                description: 'فشل الاتصال بالمساعد الذكي. الرجاء المحاولة مرة أخرى.',
            });
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
                toast({
                    variant: 'destructive',
                    title: 'نوع ملف غير مدعوم',
                    description: 'حاليًا، يمكنك رفع الصور وملفات PDF فقط.',
                });
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const url = e.target?.result as string;
                setAttachedFile({
                    name: file.name,
                    url: url,
                    type: file.type,
                });
                toast({
                    title: 'تم إرفاق الملف',
                    description: `"${file.name}". اكتب رسالة أو اضغط إرسال لتحليله.`,
                });
            };
            reader.onerror = (error) => {
                console.error("File reading error:", error);
                toast({
                    variant: 'destructive',
                    title: 'خطأ في قراءة الملف',
                });
            }
            reader.readAsDataURL(file);
        }
    };

    return (
        <Card className="w-full h-full flex flex-col shadow-lg bg-card border-none">
            <CardContent className="pt-6 flex flex-col flex-grow">
                <div className="flex flex-col h-full">
                    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                        <div className="space-y-6">
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-16">
                                    <Sparkles className="w-16 h-16 mb-4 text-primary" />
                                    <h2 className="text-2xl font-semibold text-foreground">المساعد الذكي</h2>
                                    <p>اطرح سؤالاً، أو ارفع صورة/ملف PDF لبدء المحادثة.</p>
                                </div>
                            )}
                            {messages.map((message, index) => (
                                <div
                                    key={`msg-${index}`}
                                    className={cn(
                                        "flex items-start gap-3",
                                        message.role === 'user' ? 'justify-end' : 'justify-start'
                                    )}
                                >
                                    {message.role === 'model' && (
                                        <Avatar className="w-8 h-8 border-2 border-primary">
                                            <AvatarFallback className='bg-primary/20 text-primary'><Bot className="w-5 h-5"/></AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div
                                        className={cn(
                                            "max-w-xl rounded-lg px-4 py-3 shadow-md",
                                            message.role === 'user'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-secondary'
                                        )}
                                    >
                                        <p className="text-sm whitespace-pre-wrap">{message.content[0].text}</p>
                                    </div>
                                    {message.role === 'user' && (
                                        <Avatar className="w-8 h-8 border">
                                            <AvatarFallback><User className="w-5 h-5"/></AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            ))}
                             {isLoading && (
                                <div className="flex items-start gap-3 justify-start">
                                     <Avatar className="w-8 h-8 border-2 border-primary">
                                        <AvatarFallback className='bg-primary/20 text-primary'><Bot className="w-5 h-5"/></AvatarFallback>
                                    </Avatar>
                                    <div className="max-w-md rounded-lg px-4 py-3 bg-secondary flex items-center shadow-md">
                                        <Loader2 className="w-5 h-5 animate-spin text-primary"/>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="border-t border-border mt-auto p-4 bg-card">
                         {attachedFile && (
                            <div className="relative mb-2 p-2 border border-dashed border-primary rounded-md flex items-center gap-2 text-sm bg-secondary">
                                <FileIcon className="w-5 h-5 text-primary" />
                                <span className="truncate">{attachedFile.name}</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 ml-auto"
                                    onClick={() => setAttachedFile(null)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                            <Input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isLoading || !!attachedFile}
                                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                            >
                                <Paperclip className="h-5 w-5" />
                                <span className="sr-only">رفع ملف</span>
                            </Button>
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="اكتب رسالتك هنا أو ارفع ملفًا..."
                                className="flex-1 text-right bg-secondary focus-visible:ring-primary"
                                dir="rtl"
                                disabled={isLoading}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        handleSendMessage(e);
                                    }
                                }}
                            />
                            <Button type="submit" size="icon" disabled={isLoading || (!input.trim() && !attachedFile)}>
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                <span className="sr-only">إرسال</span>
                            </Button>
                        </form>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
