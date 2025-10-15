"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileDown, Trash2, X, Loader2, FileText } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';

interface PDFFile {
  name: string;
  url: string;
}

export function ImageToPdfConverter() {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [pdfName, setPdfName] = useState('');
  const [generatedPdfs, setGeneratedPdfs] = useState<PDFFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      const imagePromises = files.map(file => {
        return new Promise<string>((resolve, reject) => {
          if (!file.type.startsWith('image/')) {
            reject(new Error('File is not an image.'));
            return;
          }
          const reader = new FileReader();
          reader.onload = e => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      Promise.all(imagePromises)
        .then(base64Images => {
            setSelectedImages(prev => [...prev, ...base64Images]);
            toast({
              title: "تم إضافة الصور",
              description: `تم إضافة ${base64Images.length} صورة بنجاح.`
            });
        })
        .catch(error => {
          console.error("Error reading files:", error);
          toast({
            variant: "destructive",
            title: "ملف غير صالح",
            description: "أحد الملفات لم يكن صورة. الرجاء تحديد ملفات صور فقط.",
          });
        });
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const generatePdf = async () => {
    if (selectedImages.length === 0) {
      toast({
        variant: "destructive",
        title: "لا توجد صور محددة",
        description: "الرجاء تحديد صورة واحدة على الأقل لإنشاء ملف PDF.",
      });
      return;
    }
    if (!pdfName.trim()) {
      toast({
        variant: "destructive",
        title: "اسم الملف مطلوب",
        description: "الرجاء إدخال اسم لملف PDF.",
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      for (let i = 0; i < selectedImages.length; i++) {
        if (i > 0) doc.addPage();
        const img = document.createElement('img');
        img.src = selectedImages[i];
        await new Promise(resolve => { img.onload = resolve; });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
        const newWidth = img.width * ratio;
        const newHeight = img.height * ratio;
        const x = (pageWidth - newWidth) / 2;
        const y = (pageHeight - newHeight) / 2;

        doc.addImage(selectedImages[i], 'JPEG', x, y, newWidth, newHeight);
      }
      
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      setGeneratedPdfs(prev => [...prev, { name: `${pdfName.trim()}.pdf`, url: pdfUrl }]);
      setPdfName('');
      setSelectedImages([]);
      if (fileInputRef.current) fileInputRef.current.value = "";

      toast({
        title: "تم إنشاء ملف PDF بنجاح!",
        description: `تم حفظ "${pdfName.trim()}.pdf".`,
      });

    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast({
        variant: "destructive",
        title: "فشل إنشاء ملف PDF",
        description: "حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const deletePdf = (index: number) => {
    const pdfToDelete = generatedPdfs[index];
    URL.revokeObjectURL(pdfToDelete.url);
    setGeneratedPdfs(prev => prev.filter((_, i) => i !== index));
    toast({
      title: "تم حذف ملف PDF",
      description: `تم حذف "${pdfToDelete.name}" بنجاح.`,
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg bg-card border-none">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold text-primary">تحويل الصور إلى PDF</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <Label htmlFor="pdfName" className="text-right w-full block font-semibold text-foreground/80">اسم ملف PDF</Label>
            <Input
                id="pdfName"
                value={pdfName}
                onChange={(e) => setPdfName(e.target.value)}
                placeholder="أدخل اسم الملف هنا..."
                className="text-right bg-secondary focus-visible:ring-primary"
                dir="rtl"
            />
        </div>

        <div className="space-y-4">
            <Label htmlFor="image-upload" className="text-right w-full block font-semibold text-foreground/80">اختر الصور</Label>
            <div 
                className="flex justify-center items-center w-full px-6 py-10 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-secondary transition-colors"
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground"/>
                    <p className="mt-2 text-sm text-foreground">
                        <span className="font-semibold text-primary">انقر للاختيار</span> أو اسحب وأفلت الصور هنا
                    </p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF</p>
                </div>
            </div>
            <Input
              id="image-upload"
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
        </div>

        {selectedImages.length > 0 && (
            <div className="space-y-3">
                <h3 className="text-lg font-medium text-right text-foreground">الصور المحددة ({selectedImages.length}):</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 p-4 rounded-lg bg-secondary">
                {selectedImages.map((imgSrc, index) => (
                    <div key={index} className="relative group aspect-square">
                      <Image src={imgSrc} alt={`Selected ${index + 1}`} fill className="rounded-md object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                ))}
                </div>
            </div>
        )}

        <Button onClick={generatePdf} disabled={isGenerating || selectedImages.length === 0} className="w-full text-lg py-6">
            {isGenerating ? (
                <>
                    <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                    جاري الإنشاء...
                </>
            ) : (
                <>
                    <FileText className="ml-2 h-5 w-5" />
                    إنشاء ملف PDF
                </>
            )}
        </Button>
      </CardContent>
      {generatedPdfs.length > 0 && (
        <CardFooter className="flex flex-col items-start gap-4">
            <h3 className="text-lg font-medium text-right w-full border-t border-border pt-4 text-primary">الملفات المنشأة</h3>
            <ul className="w-full space-y-2">
                {generatedPdfs.map((pdf, index) => (
                <li key={index} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                    <span className="font-mono text-sm text-foreground">{pdf.name}</span>
                    <div className="flex gap-2">
                        <a href={pdf.url} download={pdf.name}>
                            <Button variant="outline" size="icon">
                                <FileDown className="h-4 w-4"/>
                                <span className="sr-only">تنزيل</span>
                            </Button>
                        </a>
                        <Button variant="destructive" size="icon" onClick={() => deletePdf(index)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">حذف</span>
                        </Button>
                    </div>
                </li>
                ))}
            </ul>
        </CardFooter>
      )}
    </Card>
  );
}
