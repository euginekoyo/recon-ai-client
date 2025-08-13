
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { downloadReport } from '@/service/reportService';

interface ReportDownloaderProps {
    batchId: string;
}

const ReportDownloader: React.FC<ReportDownloaderProps> = ({ batchId }) => {
    const [loading, setLoading] = useState(false);

    const handleDownload = async (type: 'summary' | 'details') => {
        try {
            setLoading(true);
            const blob = await downloadReport(batchId, type);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const prefix = type === 'summary' ? 'Reconciliation-Summary' : 'Transaction-Details';
            link.setAttribute(
                'download',
                `${prefix}-${batchId}-${new Date().toISOString().split('T')[0]}.xlsx`
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download report');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex gap-2">
            <Button
                className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                onClick={() => handleDownload('summary')}
                disabled={loading}
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                    <Download className="h-4 w-4 mr-2" />
                )}
                Download Summary Report
            </Button>
            {/*<Button*/}
            {/*    className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"*/}
            {/*    onClick={() => handleDownload('details')}*/}
            {/*    disabled={loading}*/}
            {/*>*/}
            {/*    {loading ? (*/}
            {/*        <Loader2 className="h-4 w-4 mr-2 animate-spin" />*/}
            {/*    ) : (*/}
            {/*        <Download className="h-4 w-4 mr-2" />*/}
            {/*    )}*/}
            {/*    Download Detailed Report*/}
            {/*</Button>*/}
        </div>
    );
};

export default ReportDownloader;
