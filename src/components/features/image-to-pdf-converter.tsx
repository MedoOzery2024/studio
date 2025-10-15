"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileDown, Trash2, X, Loader2, FileText, ImageIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

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
          const reader = new FileReader();
          reader.onload = e => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      Promise.all(imagePromises)
        .then(base64Images => {
            setSelectedImages(prev => [...prev, ...base64Images]);
        })
        .catch(error => {
          console.error("Error reading files:", error);
          toast({
            variant: "destructive",
            title: "خطأ في قراءة الصورة",
            description: "حدث خطأ أثناء محاولة تحميل إحدى الصور.",
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
      // Dynamically import jspdf
      const { default: jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      
      for (let i = 0; i < selectedImages.length; i++) {
        if (i > 0) {
          doc.addPage();
        }
        const img = new Image();
        img.src = selectedImages[i];
        await new Promise(resolve => {
            img.onload = resolve;
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const imgWidth = img.width;
        const imgHeight = img.height;
        
        const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
        const newWidth = imgWidth * ratio;
        const newHeight = imgHeight * ratio;

        const x = (pageWidth - newWidth) / 2;
        const y = (pageHeight - newHeight) / 2;

        doc.addImage(selectedImages[i], 'JPEG', x, y, newWidth, newHeight);
      }
      
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      setGeneratedPdfs(prev => [...prev, { name: `${pdfName.trim()}.pdf`, url: pdfUrl }]);
      setPdfName('');
      setSelectedImages([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

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
    <Card className="w-full max-w-4xl shadow-2xl bg-card/80 backdrop-blur-sm border-primary/10 border-t-0 rounded-t-none">
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-2">
            <Label htmlFor="pdfName" className="text-right w-full block">اسم ملف PDF</Label>
            <Input
                id="pdfName"
                value={pdfName}
                onChange={(e) => setPdfName(e.target.value)}
                placeholder="أدخل اسم الملف هنا..."
                className="text-right"
                dir="rtl"
            />
        </div>

        <div className="space-y-4">
            <Label htmlFor="image-upload" className="text-right w-full block">اختر الصور</Label>
            <div 
                className="flex justify-center items-center w-full px-6 py-10 border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2 text-sm text-foreground">
                        <span className="font-semibold text-primary">انقر للاختيار</span> أو اسحب وأفلت الصور هنا
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
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
            <div className="space-y-2">
                <h3 className="text-lg font-medium text-right">الصور المحددة:</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {selectedImages.map((imgSrc, index) => (
                    <div key={index} className="relative group">
                    <img src={imgSrc} alt={`Selected ${index + 1}`} className="rounded-md w-full h-24 object-cover" />
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

        <Button onClick={generatePdf} disabled={isGenerating || selectedImages.length === 0} className="w-full">
            {isGenerating ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري الإنشاء...
                </>
            ) : (
                <>
                    <FileText className="mr-2 h-4 w-4" />
                    إنشاء ملف PDF
                </>
            )}
        </Button>
      </CardContent>
      {generatedPdfs.length > 0 && (
        <CardFooter className="flex flex-col items-start gap-4">
            <h3 className="text-lg font-medium text-right w-full border-t pt-4">الملفات المنشأة</h3>
            <ul className="w-full space-y-2">
                {generatedPdfs.map((pdf, index) => (
                <li key={index} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <span className="font-mono text-sm">{pdf.name}</span>
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
