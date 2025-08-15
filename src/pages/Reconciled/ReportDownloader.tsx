import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { downloadReport, downloadFile } from '@/service/reportService';

interface ReportDownloaderProps {
    batchId: string;
}

const ReportDownloader: React.FC<ReportDownloaderProps> = ({ batchId }) => {
    const [loading, setLoading] = useState(false);
    const [fileType, setFileType] = useState<'vendor' | 'backoffice'>('backoffice');

    // Extract numeric batchId by removing the "RB-" prefix
    const numericBatchId = batchId.replace('RB-', '');

    const handleDownload = async (type: 'summary' | 'details' | 'file') => {
        try {
            setLoading(true);
            let blob;
            let prefix;
            if (type === 'file') {
                blob = await downloadFile(numericBatchId, fileType);
                prefix = fileType === 'vendor' ? 'Vendor' : 'Backoffice';
            } else {
                blob = await downloadReport(numericBatchId, type);
                prefix = type === 'summary' ? 'Reconciliation-Summary' : 'Transaction-Details';
            }
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
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
            alert('Failed to download file');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex gap-2 items-center">
            <Button
                className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                onClick={() => handleDownload('summary')}
                disabled={loading}
                aria-label="Download summary report"
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                    <Download className="h-4 w-4 mr-2" />
                )}
                Summary Report
            </Button>
            <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value as 'vendor' | 'backoffice')}
                className="h-10 px-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-700 focus:bg-white focus:border-indigo-500 transition-all min-w-[120px]"
                disabled={loading}
                aria-label="Select file type for download"
            >
                <option value="backoffice">Backoffice</option>
                <option value="vendor">Vendor</option>
            </select>
            <Button
                className="h-10 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
                onClick={() => handleDownload('file')}
                disabled={loading}
                aria-label={`Download ${fileType} file`}
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                    <Download className="h-4 w-4 mr-2" />
                )}
                {fileType === 'vendor' ? 'Vendor File' : 'Backoffice File'}
            </Button>
            {/* Uncomment if detailed report is needed */}
            {/*
            <Button
                className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                onClick={() => handleDownload('details')}
                disabled={loading}
                aria-label="Download detailed report"
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                    <Download className="h-4 w-4 mr-2" />
                )}
                Detailed Report
            </Button>
            */}
        </div>
    );
};

export default ReportDownloader;