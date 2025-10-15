"use client";

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, User, Paperclip, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { askAssistant } from '@/ai/flows/assistant-flow';

interface Message {
    role: 'user' | 'model';
    content: { text: string }[];
}

export function AiAssistant() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
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
        if (!input.trim()) return;

        const userMessage: Message = {
            role: 'user',
            content: [{ text: input }],
        };

        const newMessages: Message[] = [...messages, userMessage];
        setMessages(newMessages);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
             const result = await askAssistant({
                prompt: currentInput,
                history: messages, 
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
            toast({
                variant: 'destructive',
                title: 'حدث خطأ',
                description: 'فشل الاتصال بالمساعد الذكي. الرجاء المحاولة مرة أخرى.',
            });
            // Optional: Revert the message list if the API call fails
            setMessages(messages);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            toast({
                title: 'تم رفع الملف',
                description: `"${file.name}". يمكنك الآن طرح أسئلة حوله.`,
            });
            // In future steps, we will process this file.
        }
    };

    return (
        <Card className="w-full max-w-4xl shadow-2xl bg-card/80 backdrop-blur-sm border-primary/10 border-t-0 rounded-t-none">
            <CardContent className="pt-6">
                <div className="flex flex-col h-[60vh]">
                    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                        <div className="space-y-4">
                            {messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                    <Bot className="w-16 h-16 mb-4" />
                                    <h2 className="text-2xl font-semibold">المساعد الذكي</h2>
                                    <p>اطرح سؤالاً، أو ارفع صورة أو ملف PDF لبدء المحادثة.</p>
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
                                        <Avatar className="w-8 h-8 border">
                                            <AvatarFallback><Bot className="w-5 h-5"/></AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div
                                        className={cn(
                                            "max-w-md rounded-lg px-4 py-2",
                                            message.role === 'user'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted'
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
                                     <Avatar className="w-8 h-8 border">
                                        <AvatarFallback><Bot className="w-5 h-5"/></AvatarFallback>
                                    </Avatar>
                                    <div className="max-w-md rounded-lg px-4 py-2 bg-muted flex items-center">
                                        <Loader2 className="w-5 h-5 animate-spin"/>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="border-t p-4">
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
                            >
                                <Paperclip className="h-5 w-5" />
                                <span className="sr-only">رفع ملف</span>
                            </Button>
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="اكتب رسالتك هنا أو ارفع ملفًا..."
                                className="flex-1 text-right"
                                dir="rtl"
                                disabled={isLoading}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        handleSendMessage(e);
                                    }
                                }}
                            />
                            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
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
