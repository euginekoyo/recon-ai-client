
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Download, Eye, GitMerge, CheckCircle, AlertTriangle, Clock, XCircle, FileText, TrendingUp, Users, Building2, MessageSquare, ThumbsUp, Loader2, Repeat, Code, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { useGetBatchesQuery, useGetBatchQuery, useGetRecordsQuery, useRetryBatchMutation, useResolveRecordMutation } from '@/store/redux/reconciliationApi';
import { useNavigate, useParams } from 'react-router-dom';
import { debounce } from 'lodash';
import ReportDownloader from '@/pages/Reconciled/ReportDownloader';

interface BatchRecord {
    id: string;
    transactionId: string;
    description: string;
    amount: number;
    date: string;
    status: 'matched' | 'unmatched' | 'partial';
    confidence: number;
    direction: string;
    bankRecord?: {
        id: string;
        reference: string;
        amount: number;
        date: string;
        description: string;
        status: string;
        direction: string;
    };
    systemRecord?: {
        id: string;
        reference: string;
        amount: number;
        date: string;
        description: string;
        status: string;
        direction: string;
    };
    aiReasoning?: string;
    flags: string[];
    resolved: boolean;
    comments: string[];
    batchInfo?: {
        id: string;
        backofficeFile: string;
        vendorFile: string;
        status: string;
        createdAt: string;
        updatedAt: string;
    };
    displayData?: {
        vendor: { core: Record<string, any>; raw: Record<string, any> };
        backoffice: { core: Record<string, any>; raw: Record<string, any> };
    };
}

interface ReconciliationBatch {
    id: string;
    date: string;
    status: 'pending' | 'running' | 'done' | 'failed';
    totalRecords: number;
    matchedRecords: number;
    unmatchedRecords: number;
    partialRecords: number;
    anomalyCount: number;
    matchRate: number;
    bankFileName: string;
    vendorFileName: string;
    processingTime?: string;
    records: BatchRecord[];
    failureReason?: string;
}

interface RecordModalProps {
    record: BatchRecord | null;
    isOpen: boolean;
    onClose: () => void;
    onResolveRecord: (recordId: string, comment: string) => void;
    onAddComment: (recordId: string, comment: string) => void;
    isResolving: boolean;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    state = { hasError: false };
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="text-rose-700 p-3 rounded-lg bg-rose-50">
                    Error rendering component. Check console for details.
                </div>
            );
        }
        return this.props.children;
    }
}

const mapReconBatchToReconciliationBatch = (batch: any): ReconciliationBatch => {
    const totalRecords = batch.processedRecords || 0;
    return {
        id: `RB-${batch.id}`,
        date: batch.createdAt || new Date().toISOString(),
        status: batch.status?.toLowerCase() === 'completed' ? 'done' : batch.status?.toLowerCase() === 'processing' ? 'running' : batch.status?.toLowerCase() === 'failed' ? 'failed' : 'pending',
        totalRecords,
        matchedRecords: 0,
        unmatchedRecords: 0,
        partialRecords: 0,
        anomalyCount: 0,
        matchRate: 0,
        bankFileName: batch.backofficeFile?.split('/').pop() || 'Unknown File',
        vendorFileName: batch.vendorFile?.split('/').pop() || 'Unknown File',
        processingTime: batch.status?.toLowerCase() === 'completed' && batch.createdAt && batch.updatedAt ? calculateProcessingTime(batch.createdAt, batch.updatedAt) : undefined,
        records: [],
        failureReason: batch.failureReason,
    };
};

const calculateProcessingTime = (createdAt: string, updatedAt: string): string => {
    const start = new Date(createdAt);
    const end = new Date(updatedAt);
    const diffMs = end.getTime() - start.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const mins = Math.floor(diffSecs / 60);
    const secs = diffSecs % 60;
    return `${mins}m ${secs}s`;
};

const mapReconRecordToBatchRecord = (record: any): BatchRecord => {
    let displayData: any = {};
    let vendorData: any = {};
    let backofficeData: any = {};
    try {
        displayData = JSON.parse(record.displayData || '{}');
    } catch (error) {
        console.warn(`Failed to parse displayData for record ${record.id}`);
    }
    try {
        vendorData = JSON.parse(record.vendorData || '{}');
    } catch (error) {
        console.warn(`Failed to parse vendorData for record ${record.id}`);
    }
    if (record.backofficeData) {
        try {
            backofficeData = JSON.parse(record.backofficeData);
        } catch (error) {
            console.warn(`Failed to parse backofficeData for record ${record.id}`);
        }
    }
    const vendorCore = displayData?.vendor?.core || vendorData?.core || {};
    const vendorRaw = displayData?.vendor?.raw || vendorData?.raw || {};
    const backofficeCore = displayData?.backoffice?.core || backofficeData?.core || {};
    const backofficeRaw = displayData?.backoffice?.raw || backofficeData?.raw || {};
    let flags: string[] = [];
    if (record.fieldFlags) {
        try {
            const parsedFlags = JSON.parse(record.fieldFlags);
            if (typeof parsedFlags === 'object' && parsedFlags !== null) {
                flags = Object.entries(parsedFlags).map(([key, value]) => `${key}: ${value}`);
            }
        } catch (error) {
            console.warn(`Failed to parse fieldFlags for record ${record.id}`);
        }
    }
    let aiReasoning: string | undefined;
    if (record.discrepancies) {
        try {
            const parsedDiscrepancies = JSON.parse(record.discrepancies);
            if (Array.isArray(parsedDiscrepancies)) {
                aiReasoning = parsedDiscrepancies.join('; ');
            } else if (typeof parsedDiscrepancies === 'string') {
                aiReasoning = parsedDiscrepancies;
            }
        } catch (error) {
            console.warn(`Failed to parse discrepancies for record ${record.id}: ${error}`);
            aiReasoning = record.discrepancies;
        }
    }
    const getStatus = (matchStatus: string): 'matched' | 'unmatched' | 'partial' => {
        const status = matchStatus?.toLowerCase();
        if (status?.includes('full') || status === 'matched') return 'matched';
        if (status?.includes('partial')) return 'partial';
        return 'unmatched';
    };
    return {
        id: record.id.toString(),
        transactionId: vendorCore.transaction_id || vendorRaw['Ref No'] || `TXN-${record.id}`,
        description: vendorCore.description || vendorRaw.Details || 'Unknown Transaction',
        amount: Number(vendorCore.amount || vendorRaw.Value) || 0,
        date: vendorCore.date || vendorRaw['Transaction Date'] || new Date(record.createdAt).toISOString().split('T')[0],
        status: getStatus(record.matchStatus),
        confidence: record.confidence || 0,
        direction: vendorCore.direction || vendorRaw['DR/CR'] || 'Unknown',
        bankRecord: Object.keys(backofficeCore).length > 0 || Object.keys(backofficeRaw).length > 0 ? {
            id: backofficeCore.transaction_id || backofficeRaw['Transaction ID'] || `BNK${record.id}`,
            reference: backofficeCore.transaction_id || backofficeRaw['Transaction ID'] || '',
            amount: Number(backofficeCore.amount || backofficeRaw.Amount) || 0,
            date: backofficeCore.date || backofficeRaw.Date || '',
            description: backofficeCore.description || backofficeRaw.Description || '',
            status: backofficeCore.status || backofficeRaw.Status || '',
            direction: backofficeCore.direction || backofficeRaw.Direction || 'Unknown',
        } : undefined,
        systemRecord: {
            id: vendorCore.transaction_id || vendorRaw['Ref No'] || `SYS${record.id}`,
            reference: vendorCore.transaction_id || vendorRaw['Ref No'] || '',
            amount: Number(vendorCore.amount || vendorRaw.Value) || 0,
            date: vendorCore.date || vendorRaw['Transaction Date'] || '',
            description: vendorCore.description || vendorRaw.Details || '',
            status: vendorCore.status || vendorRaw.Status || '',
            direction: vendorCore.direction || vendorRaw['DR/CR'] || 'Unknown',
        },
        aiReasoning,
        flags,
        resolved: record.resolved || false,
        comments: record.comments || [],
        batchInfo: record.batch ? {
            id: `RB-${record.batch.id}`,
            backofficeFile: record.batch.backofficeFile?.split('/').pop() || 'Unknown File',
            vendorFile: record.batch.vendorFile?.split('/').pop() || 'Unknown File',
            status: record.batch.status?.toLowerCase() === 'completed' ? 'done' : record.batch.status?.toLowerCase() === 'processing' ? 'running' : record.batch.status?.toLowerCase() === 'failed' ? 'failed' : 'pending',
            createdAt: record.batch.createdAt || new Date().toISOString(),
            updatedAt: record.batch.updatedAt || new Date().toISOString(),
        } : undefined,
        displayData,
    };
};

const calculateBatchStats = (batch: ReconciliationBatch, records: BatchRecord[]): ReconciliationBatch => {
    const matchedRecords = records.filter(r => r.status === 'matched').length;
    const unmatchedRecords = records.filter(r => r.status === 'unmatched').length;
    const partialRecords = records.filter(r => r.status === 'partial').length;
    const totalRecords = records.length || batch.totalRecords;
    const matchRate = totalRecords > 0 ? Math.round((matchedRecords / totalRecords) * 100) : 0;
    const anomalyCount = unmatchedRecords + partialRecords;
    console.log(`Calculating stats for batch ${batch.id}:`, { totalRecords, matchedRecords, unmatchedRecords, partialRecords, matchRate, anomalyCount });
    return {
        ...batch,
        totalRecords,
        matchedRecords,
        unmatchedRecords,
        partialRecords,
        matchRate,
        anomalyCount,
        records,
    };
};

const escapeCsvValue = (value: string | number | undefined): string => {
    if (value === undefined || value === null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const exportProblematicRecords = (records: BatchRecord[], batchId: string) => {
    const problematicRecords = records.filter(r => r.status === 'unmatched' || r.status === 'partial');
    if (problematicRecords.length === 0) {
        alert('No problematic records found to export.');
        return;
    }
    const headers = [
        'Transaction ID',
        'Description',
        'Amount',
        'Date',
        'Status',
        'Confidence',
        'Direction',
        'AI Reasoning',
        'Flags',
        'Bank Record ID',
        'Bank Record Reference',
        'Bank Record Amount',
        'Bank Record Date',
        'Bank Record Description',
        'System Record ID',
        'System Record Reference',
        'System Record Amount',
        'System Record Date',
        'System Record Description',
    ];
    const rows = problematicRecords.map(record => [
        escapeCsvValue(record.transactionId),
        escapeCsvValue(record.description),
        escapeCsvValue(record.amount),
        escapeCsvValue(record.date),
        escapeCsvValue(record.status),
        escapeCsvValue(record.confidence ? Math.round(record.confidence * 100) + '%' : 'N/A'),
        escapeCsvValue(record.direction),
        escapeCsvValue(record.aiReasoning),
        escapeCsvValue(record.flags.join('; ')),
        escapeCsvValue(record.bankRecord?.id),
        escapeCsvValue(record.bankRecord?.reference),
        escapeCsvValue(record.bankRecord?.amount),
        escapeCsvValue(record.bankRecord?.date),
        escapeCsvValue(record.bankRecord?.description),
        escapeCsvValue(record.systemRecord?.id),
        escapeCsvValue(record.systemRecord?.reference),
        escapeCsvValue(record.systemRecord?.amount),
        escapeCsvValue(record.systemRecord?.date),
        escapeCsvValue(record.systemRecord?.description),
    ].join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `problematic_records_${batchId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// Utility functions moved outside component
const getStatusBadge = (status: string) => {
    const configs = {
        done: { color: 'bg-teal-500 text-white', icon: CheckCircle },
        running: { color: 'bg-indigo-500 text-white', icon: Clock },
        pending: { color: 'bg-amber-500 text-white', icon: Clock },
        failed: { color: 'bg-rose-500 text-white', icon: XCircle },
        matched: { color: 'bg-teal-500 text-white', icon: CheckCircle },
        unmatched: { color: 'bg-rose-500 text-white', icon: XCircle },
        partial: { color: 'bg-amber-500 text-white', icon: AlertTriangle },
    };
    const config = configs[status.toLowerCase()] || { color: 'bg-gray-500 text-white', icon: Clock };
    const Icon = config.icon;
    return (
        <Badge className={`${config.color} font-medium px-2 py-0.5 rounded-full flex items-center gap-1 text-xs`}>
            <Icon className="w-3 h-3" />
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
    );
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getFieldErrorStatus = (field: string, record: BatchRecord): boolean => {
    return record.flags.some(flag => flag.toLowerCase().includes(field.toLowerCase()));
};

const TransactionModal: React.FC<RecordModalProps> = React.memo(({
                                                                     record,
                                                                     isOpen,
                                                                     onClose,
                                                                     onResolveRecord,
                                                                     onAddComment,
                                                                     isResolving,
                                                                 }) => {
    const [newComment, setNewComment] = useState('');
    const [showRawData, setShowRawData] = useState(false);

    useEffect(() => {
        if (record) {
            setNewComment('');
            setShowRawData(false);
        }
    }, [record?.id]);

    const handleResolveRecord = useCallback((recordId: string, comment: string) => {
        if (!comment.trim()) {
            alert('Please provide a resolution comment.');
            return;
        }
        onResolveRecord(recordId, comment);
    }, [onResolveRecord]);

    const handleAddComment = useCallback((recordId: string, comment: string) => {
        if (comment.trim()) {
            onAddComment(recordId, comment);
        }
    }, [onAddComment]);

    const renderDataTable = (data: Record<string, any>, title: string, type: 'vendor' | 'backoffice') => {
        if (!data) return null;
        return (
            <div className="space-y-1">
                <h4 className="font-semibold text-gray-800 text-sm">{title}</h4>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse bg-white rounded-md shadow-sm border border-gray-200">
                        <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-3 py-1 text-left text-xs font-semibold text-gray-700">Field</th>
                            <th className="px-3 py-1 text-left text-xs font-semibold text-gray-700">Value</th>
                        </tr>
                        </thead>
                        <tbody>
                        {Object.entries(data).map(([key, value]) => (
                            <tr key={key} className="border-b border-gray-100 last:border-b-0">
                                <td className="px-3 py-1 text-xs">
                                    <span className={getFieldErrorStatus(key, record!) ? 'text-rose-600 font-medium' : 'text-gray-600'}>
                                        {key}
                                    </span>
                                </td>
                                <td className="px-3 py-1 text-xs text-gray-800">
                                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    if (!record || !isOpen) return null;

    return createPortal(
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl bg-white border-none shadow-lg rounded-md transition-all duration-300">
                <DialogHeader className="bg-gray-50 p-3 rounded-t-md">
                    <DialogTitle className="text-base font-semibold text-gray-800">
                        Transaction Detail: {record.transactionId}
                    </DialogTitle>
                </DialogHeader>
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                    {record.batchInfo && (
                        <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800 flex items-center text-sm">
                                <GitMerge className="w-3 h-3 mr-1 text-indigo-600" /> Batch Information
                            </h4>
                            <div className="bg-gray-50 p-3 rounded-md space-y-1 border border-gray-200">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Batch ID:</span>
                                    <span className="font-mono text-gray-800">{record.batchInfo.id || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Bank File:</span>
                                    <span className="text-gray-800">{record.batchInfo.backofficeFile || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Vendor File:</span>
                                    <span className="text-gray-800">{record.batchInfo.vendorFile || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Status:</span>
                                    {getStatusBadge(record.batchInfo.status || 'pending')}
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Created At:</span>
                                    <span className="text-gray-800">{formatDate(record.batchInfo.createdAt || new Date().toISOString())}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Updated At:</span>
                                    <span className="text-gray-800">{formatDate(record.batchInfo.updatedAt || new Date().toISOString())}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800 flex items-center text-sm">
                                <Building2 className="w-3 h-3 mr-1 text-teal-600" /> Bank Record
                            </h4>
                            {record.bankRecord ? (
                                <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600">ID:</span>
                                        <span className="font-mono text-gray-800">{record.bankRecord.id || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600">Reference:</span>
                                        <span className="font-mono text-gray-800">{record.bankRecord.reference || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600">Amount:</span>
                                        <span className="font-semibold text-gray-800">{formatCurrency(record.bankRecord.amount || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600">Date:</span>
                                        <span className="text-gray-800">{record.bankRecord.date || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className={getFieldErrorStatus('description', record) ? 'text-rose-600 font-medium' : 'text-gray-600'}>
                                            Description
                                        </span>
                                        <span className="text-gray-800">{record.bankRecord.description || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className={getFieldErrorStatus('status', record) ? 'text-rose-600 font-medium' : 'text-gray-600'}>
                                            Status
                                        </span>
                                        <span className="text-gray-800">{record.bankRecord.status || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600">Direction:</span>
                                        <span className="text-gray-800">{record.bankRecord.direction || 'N/A'}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-3 rounded-md text-center text-gray-600 border border-gray-200 text-xs">
                                    No bank record found
                                </div>
                            )}
                        </div>
                        <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800 flex items-center text-sm">
                                <Users className="w-3 h-3 mr-1 text-blue-600" /> System Record
                            </h4>
                            {record.systemRecord ? (
                                <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600">ID:</span>
                                        <span className="font-mono text-gray-800">{record.systemRecord.id || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600">Reference:</span>
                                        <span className="font-mono text-gray-800">{record.systemRecord.reference || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600">Amount:</span>
                                        <span className="font-semibold text-gray-800">{formatCurrency(record.systemRecord.amount || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600">Date:</span>
                                        <span className="text-gray-800">{record.systemRecord.date || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className={getFieldErrorStatus('description', record) ? 'text-rose-600 font-medium' : 'text-gray-600'}>
                                            Description
                                        </span>
                                        <span className="text-gray-800">{record.systemRecord.description || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className={getFieldErrorStatus('status', record) ? 'text-rose-600 font-medium' : 'text-gray-600'}>
                                            Status
                                        </span>
                                        <span className="text-gray-800">{record.systemRecord.status || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-600">Direction:</span>
                                        <span className="text-gray-800">{record.systemRecord.direction || 'N/A'}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 p-3 rounded-md text-center text-gray-600 border border-gray-200 text-xs">
                                    No system record found
                                </div>
                            )}
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-gray-300 hover:bg-gray-100 text-gray-700 rounded-md text-sm"
                        onClick={() => setShowRawData(!showRawData)}
                    >
                        <Code className="w-3 h-3 mr-1" />
                        {showRawData ? 'Hide Raw Data' : 'Show Raw Data'}
                    </Button>
                    {showRawData && record.displayData && (
                        <div className="space-y-4">
                            {renderDataTable(record.displayData.backoffice?.raw, 'Bank Raw Data', 'backoffice')}
                            {renderDataTable(record.displayData.vendor?.raw, 'Vendor Raw Data', 'vendor')}
                        </div>
                    )}
                    {record.aiReasoning && (
                        <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800 flex items-center text-sm">
                                <AlertTriangle className="w-3 h-3 mr-1 text-purple-600" /> AI Match Reasoning
                            </h4>
                            <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                                {record.aiReasoning.split('; ').length > 1 ? (
                                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                                        {record.aiReasoning.split('; ').map((reason, index) => (
                                            <li key={index} className="pl-1 flex items-center gap-1">
                                                <Badge
                                                    className={`${reason.includes('mismatch') ? 'bg-rose-500 text-white' : 'bg-purple-500 text-white'} rounded-full text-xs`}
                                                >
                                                    {reason.includes('mismatch') ? 'Error' : 'Info'}
                                                </Badge>
                                                {reason}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-gray-700">{record.aiReasoning}</p>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-gray-800 flex items-center text-sm">
                            <MessageSquare className="w-3 h-3 mr-1 text-indigo-600" /> Comments ({record.comments.length})
                        </h4>
                        <div className="space-y-2">
                            {record.comments.length > 0 ? (
                                record.comments.map((comment, i) => (
                                    <div key={i} className="bg-gray-50 p-2 rounded-md text-xs text-gray-700 border border-gray-200">
                                        {comment}
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-gray-600">No comments</p>
                            )}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter comment (required for resolution)"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className="h-8 text-xs"
                                />
                                <Button
                                    size="sm"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs"
                                    onClick={() => handleAddComment(record.id, newComment)}
                                    // disabled={!newComment.trim()}
                                >
                                    <MessageSquare className="w-3 h-3 mr-1" />
                                    Add Comment
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-1">
                            {getStatusBadge(record.status)}
                            <Badge className="bg-indigo-500 text-white rounded-full text-xs">
                                {Math.round(record.confidence * 100)}% confidence
                            </Badge>
                            {record.resolved && (
                                <Badge className="bg-gray-500 text-white rounded-full px-2 py-1 text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" /> Resolved
                                </Badge>
                            )}
                        </div>
                        <div className="flex gap-1">
                            {!record.resolved && (
                                <Button
                                    size="xs"
                                    className="bg-teal-600 hover:bg-teal-700 text-white p-2   rounded-md text-xs"
                                    onClick={() => handleResolveRecord(record.id, newComment)}
                                    disabled={isResolving }
                                >
                                    {isResolving ? (
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                    )}
                                    Mark as Resolved
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>,
        document.body
    );
});

const ReconciledTransactions: React.FC = () => {
    const navigate = useNavigate();
    const { batchId } = useParams<{ batchId?: string }>();
    const [selectedView, setSelectedView] = useState<'list' | 'details'>('list');
    const [selectedBatch, setSelectedBatch] = useState<ReconciliationBatch | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [recordStatusFilter, setRecordStatusFilter] = useState('all');
    const [selectedRecord, setSelectedRecord] = useState<BatchRecord | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [lastSelectedBatchId, setLastSelectedBatchId] = useState<string | null>(null);
    const [sortField, setSortField] = useState<keyof ReconciliationBatch | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const { data: batchesData, isLoading: isBatchesLoading, error: batchesError, refetch: refetchBatches } = useGetBatchesQuery();
    const batches = useMemo(() => batchesData ? batchesData.map(mapReconBatchToReconciliationBatch) : [], [batchesData]);
    const numericBatchId = useMemo(() => batchId ? parseInt(batchId.replace('RB-', '')) : undefined, [batchId]);
    const { data: batchData, isLoading: isBatchLoading, error: batchError, refetch: refetchBatch } = useGetBatchQuery(numericBatchId!, { skip: !numericBatchId });
    const { data: recordsData, isLoading: isRecordsLoading, error: recordsError, refetch: refetchRecords } = useGetRecordsQuery(
        {
            id: numericBatchId!,
            status: recordStatusFilter !== 'all' ? recordStatusFilter.toUpperCase().replace('PARTIAL', 'PARTIAL_MATCH') : undefined,
            resolved: undefined,
        },
        { skip: !numericBatchId },
    );
    const [retryBatch, { isLoading: isRetrying }] = useRetryBatchMutation();
    const [resolveRecord, { isLoading: isResolving }] = useResolveRecordMutation();

    const selectedBatchWithRecords = useMemo(() => {
        if (!batchData) return undefined;
        const mappedBatch = mapReconBatchToReconciliationBatch(batchData);
        if (!recordsData) return mappedBatch;
        return calculateBatchStats(mappedBatch, recordsData.map(mapReconRecordToBatchRecord));
    }, [batchData, recordsData]);

    const filteredRecords = useMemo(() => {
        return selectedBatchWithRecords?.records.filter(
            (record) => recordStatusFilter === 'all' || record.status === recordStatusFilter
        ) || [];
    }, [selectedBatchWithRecords, recordStatusFilter]);

    const filteredBatches = useMemo(() => {
        const filtered = batches.map(batch => {
            const matchingBatch = selectedBatchWithRecords && selectedBatchWithRecords.id === batch.id ? selectedBatchWithRecords : batch;
            return {
                ...matchingBatch,
                totalRecords: matchingBatch.totalRecords,
                matchedRecords: matchingBatch.matchedRecords,
                unmatchedRecords: matchingBatch.unmatchedRecords,
                partialRecords: matchingBatch.partialRecords,
                matchRate: matchingBatch.matchRate,
                anomalyCount: matchingBatch.anomalyCount,
            };
        }).filter(
            (batch) =>
                (batch.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    batch.bankFileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    batch.vendorFileName.toLowerCase().includes(searchTerm.toLowerCase())) &&
                (statusFilter === 'all' || batch.status === statusFilter)
        );

        // Sort by date in descending order (latest first) by default, or by selected sortField and sortDirection
        filtered.sort((a, b) => {
            if (!sortField) {
                // Default sort by date in descending order
                const aDate = new Date(a.date).getTime();
                const bDate = new Date(b.date).getTime();
                return bDate - aDate; // Latest date first
            }
            const aValue = a[sortField];
            const bValue = b[sortField];
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            } else if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            } else if (sortField === 'date') {
                const aDate = new Date(aValue).getTime();
                const bDate = new Date(bValue).getTime();
                return sortDirection === 'asc' ? aDate - bDate : bDate - aDate;
            }
            return 0;
        });

        return filtered;
    }, [batches, searchTerm, statusFilter, selectedBatchWithRecords, sortField, sortDirection]);

    useEffect(() => {
        if (batchId && batches.length) {
            const batch = batches.find((b) => b.id === batchId);
            if (batch && (selectedBatch?.id !== batch.id || selectedView !== 'details')) {
                setSelectedBatch(batch);
                setSelectedView('details');
                setLastSelectedBatchId(batch.id);
            } else if (!batch) {
                setSelectedView('list');
                setSelectedBatch(null);
                navigate('/reconciled', { replace: true });
            }
        } else if (selectedView !== 'list' || selectedBatch !== null) {
            setSelectedView('list');
            setSelectedBatch(null);
        }
    }, [batchId, batches, selectedBatch, selectedView, navigate]);

    useEffect(() => {
        if (selectedView === 'list' && lastSelectedBatchId) {
            const element = document.getElementById(`batch-row-${lastSelectedBatchId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [selectedView, lastSelectedBatchId]);

    const handleRetryBatch = useCallback(async () => {
        if (!numericBatchId) return;
        try {
            await retryBatch(numericBatchId).unwrap();
            refetchBatch();
            refetchRecords();
        } catch (err) {
            console.error('Failed to retry batch:', err);
        }
    }, [numericBatchId, retryBatch, refetchBatch, refetchRecords]);

    const handleResolveRecord = useCallback(async (recordId: string, comment: string) => {
        if (!comment.trim()) {
            alert('Please provide a resolution comment.');
            return;
        }
        try {
            await resolveRecord({ id: parseInt(recordId), comment }).unwrap();
            setSelectedRecord(prev => prev ? { ...prev, resolved: true, comments: [...prev.comments, comment] } : null);
            refetchRecords();
        } catch (err) {
            console.error('Failed to resolve record:', err);
            alert('Failed to resolve record. Please try again.');
        }
    }, [resolveRecord, refetchRecords]);

    const handleAddComment = useCallback((recordId: string, comment: string) => {
        if (comment.trim()) {
            setSelectedRecord(prev => prev ? { ...prev, comments: [...prev.comments, comment] } : null);
        }
    }, []);

    const handleRefreshBatches = useCallback(async () => {
        try {
            await refetchBatches();
        } catch (err) {
            console.error('Failed to refresh batches:', err);
        }
    }, [refetchBatches]);

    const debouncedHandleRowClick = useCallback(
        debounce((record: BatchRecord) => {
            console.log('Row clicked for record:', record);
            setSelectedRecord(record);
            setIsModalOpen(true);
        }, 300),
        []
    );

    const handleCloseModal = useCallback(() => {
        setSelectedRecord(null);
        setIsModalOpen(false);
    }, []);

    const handleExportIssues = useCallback(() => {
        if (selectedBatchWithRecords && selectedBatchWithRecords.records.length > 0) {
            exportProblematicRecords(selectedBatchWithRecords.records, selectedBatchWithRecords.id);
        } else {
            alert('No records available to export.');
        }
    }, [selectedBatchWithRecords]);

    const BatchesList = () => {
        const handleSort = (field: keyof ReconciliationBatch) => {
            if (sortField === field) {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
            } else {
                setSortField(field);
                setSortDirection('asc');
            }
        };

        return (
            <div className="space-y-4 animate-fade-in">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center p-2 rounded-full bg-indigo-100">
                        <GitMerge className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800">Reconciliation Batches</h1>
                    <p className="text-base text-gray-600 max-w-xl mx-auto">
                        Review and manage all reconciliation batches with detailed insights and status tracking.
                    </p>
                </div>
                {isBatchesLoading && (
                    <Card className="border-none bg-white shadow-md rounded-lg">
                        <CardContent className="p-4 flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                            <span className="text-gray-700 font-medium text-sm">Loading batches...</span>
                        </CardContent>
                    </Card>
                )}
                {batchesError && (
                    <Card className="border-none bg-rose-50 shadow-md rounded-lg">
                        <CardContent className="p-4 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-rose-600" />
                            <span className="text-rose-700 font-medium text-sm">Failed to load batches. Please try again.</span>
                        </CardContent>
                    </Card>
                )}
                {!isBatchesLoading && !batchesError && (
                    <Card className="border-none bg-white shadow-md rounded-lg">
                        <CardHeader>
                            <CardTitle className="text-xl font-semibold text-gray-800">Batch History</CardTitle>
                            <CardDescription className="text-gray-600 text-sm">
                                View all reconciliation batches with summary statistics and status.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="flex flex-col lg:flex-row gap-3 mb-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <Input
                                        placeholder="Search batch ID, file names..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 h-9 rounded-md bg-gray-50 border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="h-9 px-3 bg-gray-50 border border-gray-200 rounded-md text-gray-700 focus:bg-white focus:border-indigo-500 transition-all text-sm"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="running">Running</option>
                                        <option value="done">Done</option>
                                        <option value="failed">Failed</option>
                                    </select>
                                    <Button
                                        className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm"
                                        onClick={handleRefreshBatches}
                                        disabled={isBatchesLoading}
                                    >
                                        {isBatchesLoading ? (
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        ) : (
                                            <RefreshCw className="h-3 w-3 mr-1" />
                                        )}
                                        Refresh
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-4 py-2 text-left font-semibold text-gray-700 text-sm cursor-pointer" onClick={() => handleSort('id')}>
                                            <div className="flex items-center gap-1">
                                                Batch ID
                                                {sortField === 'id' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </div>
                                        </th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-700 text-sm cursor-pointer" onClick={() => handleSort('date')}>
                                            <div className="flex items-center gap-1">
                                                Date
                                                {sortField === 'date' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </div>
                                        </th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-700 text-sm cursor-pointer" onClick={() => handleSort('status')}>
                                            <div className="flex items-center gap-1">
                                                Status
                                                {sortField === 'status' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </div>
                                        </th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-700 text-sm cursor-pointer" onClick={() => handleSort('totalRecords')}>
                                            <div className="flex items-center gap-1">
                                                Records
                                                {sortField === 'totalRecords' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </div>
                                        </th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-700 text-sm">Files</th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-700 text-sm">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filteredBatches.map((batch) => (
                                        <tr
                                            key={batch.id}
                                            id={`batch-row-${batch.id}`}
                                            className={`hover:bg-indigo-50/30 transition-all duration-200 border-b border-gray-100 last:border-b-0 ${lastSelectedBatchId === batch.id ? 'bg-indigo-50/50' : ''}`}
                                        >
                                            <td className="px-4 py-2 font-mono font-medium text-indigo-700 text-sm">{batch.id}</td>
                                            <td className="px-4 py-2 text-gray-600 text-sm">{formatDate(batch.date)}</td>
                                            <td className="px-4 py-2">{getStatusBadge(batch.status)}</td>
                                            <td className="px-4 py-2">
                                                <div className="space-y-0.5">
                                                    <div className="text-xs font-medium text-gray-800">{batch.totalRecords.toLocaleString()} total</div>
                                                    <div className="text-xs text-gray-600">
                                                        {batch.matchedRecords} matched, {batch.unmatchedRecords} unmatched, {batch.partialRecords} partial
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="space-y-0.5 text-xs text-gray-600">
                                                    <div className="flex items-center gap-1">
                                                        <Building2 className="w-3 h-3 text-teal-600" />
                                                        {batch.bankFileName}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Users className="w-3 h-3 text-blue-600" />
                                                        {batch.vendorFileName}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="outline"
                                                        size="xs"
                                                        onClick={() => {
                                                            setSelectedBatch(batch);
                                                            setSelectedView('details');
                                                            setLastSelectedBatchId(batch.id);
                                                            navigate(`/reconciliation/results/${batch.id}`);
                                                        }}
                                                        className="border-gray-300 hover:bg-indigo-50 hover:border-indigo-400 bg-blue-600 p-1 text-white text-xs"
                                                    >
                                                        <Eye className="w-3 h-3 mr-1" />
                                                        View Details
                                                    </Button>
                                                    {batch.status === 'failed' && (
                                                        <Button
                                                            variant="outline"
                                                            size="xs"
                                                            onClick={handleRetryBatch}
                                                            disabled={isRetrying}
                                                            className="border-gray-300 hover:bg-amber-50 hover:border-amber-400 text-white bg-blue-500 p-1 text-xs"
                                                        >
                                                            {isRetrying ? (
                                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                            ) : (
                                                                <Repeat className="w-3 h-3 mr-1" />
                                                            )}
                                                            Retry
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                                {filteredBatches.length === 0 && (
                                    <div className="text-center py-6 text-gray-600 text-sm">No batches found matching your criteria.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    };

    const BatchDetails = () => {
        if (!selectedBatch || !selectedBatchWithRecords) return null;
        return (
            <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSelectedView('list');
                                setSelectedBatch(null);
                                setSelectedRecord(null);
                                setIsModalOpen(false);
                                navigate('/reconciled');
                            }}
                            className="border-gray-300 hover:bg-gray-100 text-gray-700 rounded-md text-sm"
                        >
                            ← Back to Batches
                        </Button>
                        <div>
                            <h1 className="text-xl font-semibold text-gray-800">{selectedBatch.id}</h1>
                            <p className="text-xs text-gray-600">Processed on {formatDate(selectedBatch.date)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {getStatusBadge(selectedBatch.status)}
                        {selectedBatchWithRecords.status === 'failed' && selectedBatchWithRecords.failureReason && (
                            <Badge className="bg-rose-500 text-white rounded-full text-xs">{selectedBatchWithRecords.failureReason}</Badge>
                        )}
                        <Button
                            className="h-8 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-sm"
                            onClick={handleExportIssues}
                        >
                            <Download className="h-3 w-3 mr-1" />
                            Export Issues
                        </Button>
                        <ReportDownloader batchId={numericBatchId!.toString()} />
                    </div>
                </div>
                {(isBatchLoading || isRecordsLoading) && (
                    <Card className="border-none bg-white shadow-md rounded-lg">
                        <CardContent className="p-4 flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                            <span className="text-gray-700 font-medium text-sm">Loading batch details...</span>
                        </CardContent>
                    </Card>
                )}
                {(batchError || recordsError) && (
                    <Card className="border-none bg-rose-50 shadow-md rounded-lg">
                        <CardContent className="p-4 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-rose-600" />
                            <span className="text-rose-700 font-medium text-sm">
                                {batchError ? 'Failed to load batch details.' : 'Failed to load records.'} Please try again.
                            </span>
                        </CardContent>
                    </Card>
                )}
                {!isBatchLoading && !isRecordsLoading && !batchError && !recordsError && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <Card className="border-none bg-white shadow-md rounded-md">
                            <CardContent className="p-3 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-600 font-medium">Total Records</p>
                                    <p className="text-xl font-bold text-gray-800">{selectedBatchWithRecords.totalRecords.toLocaleString()}</p>
                                </div>
                                <FileText className="w-5 h-5 text-indigo-600" />
                            </CardContent>
                        </Card>
                        <Card className="border-none bg-white shadow-md rounded-md">
                            <CardContent className="p-3 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-600 font-medium">Match Rate</p>
                                    <p className="text-xl font-bold text-gray-800">{selectedBatchWithRecords.matchRate}%</p>
                                </div>
                                <TrendingUp className="w-5 h-5 text-teal-600" />
                            </CardContent>
                        </Card>
                        <Card className="border-none bg-white shadow-md rounded-md">
                            <CardContent className="p-3 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-600 font-medium">Anomalies</p>
                                    <p className="text-xl font-bold text-gray-800">{selectedBatchWithRecords.anomalyCount}</p>
                                </div>
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                            </CardContent>
                        </Card>
                        <Card className="border-none bg-white shadow-md rounded-md">
                            <CardContent className="p-3 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-600 font-medium">Processing Time</p>
                                    <p className="text-xl font-bold text-gray-800">{selectedBatchWithRecords.processingTime || 'N/A'}</p>
                                </div>
                                <Clock className="w-5 h-5 text-purple-600" />
                            </CardContent>
                        </Card>
                    </div>
                )}
                {!isBatchLoading && !isRecordsLoading && !batchError && !recordsError && (
                    <Card className="border-none bg-white shadow-md rounded-md">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-semibold text-gray-800">Transaction Records</h3>
                                    <select
                                        value={recordStatusFilter}
                                        onChange={(e) => setRecordStatusFilter(e.target.value)}
                                        className="h-8 px-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700 focus:bg-white focus:border-indigo-500 transition-all text-sm"
                                    >
                                        <option value="all">All Records</option>
                                        <option value="matched">Matched</option>
                                        <option value="unmatched">Unmatched</option>
                                        <option value="partial">Partial Match</option>
                                    </select>
                                </div>
                                <Badge className="bg-indigo-500 text-white rounded-full text-xs">{filteredRecords.length} records</Badge>
                            </div>
                        </CardContent>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-4 py-2 text-left font-semibold text-gray-700 text-sm">Transaction ID</th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-700 text-sm">Description</th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-700 text-sm">Amount</th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-700 text-sm">Status</th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-700 text-sm">Confidence</th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-700 text-sm">Flags</th>
                                        <th className="px-4 py-2 text-left font-semibold text-gray-700 text-sm">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filteredRecords.map((record) => (
                                        <tr
                                            key={record.id}
                                            className="hover:bg-indigo-50/30 transition-all duration-200 border-b border-gray-100 last:border-b-0 cursor-pointer"
                                            onClick={() => debouncedHandleRowClick(record)}
                                        >
                                            <td className="px-4 py-2 font-mono text-indigo-700 text-sm">{record.transactionId}</td>
                                            <td className="px-4 py-2 text-gray-800 text-sm">{record.description}</td>
                                            <td className="px-4 py-2 font-semibold text-gray-800 text-sm">{formatCurrency(record.amount)}</td>
                                            <td className="px-4 py-2">{getStatusBadge(record.status)}</td>
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-1">
                                                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 w-12">
                                                        <div
                                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                                                record.confidence > 0.8 ? 'bg-teal-500' : record.confidence > 0.5 ? 'bg-amber-500' : 'bg-rose-500'
                                                            }`}
                                                            style={{ width: `${record.confidence * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-xs text-gray-600">{Math.round(record.confidence * 100)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.isArray(record.flags) && record.flags.length > 0 ? (
                                                        record.flags.map((flag, i) => (
                                                            <Badge key={i} className="text-xs bg-rose-500 text-white rounded-full">
                                                                {flag.replace(/_/g, ' ')}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <Badge className="text-xs bg-gray-500 text-white rounded-full">No Flags</Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-1">
                                                    {record.resolved ? (
                                                        <Badge className="bg-gray-500 text-white rounded-full text-xs px-2 py-1">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Resolved
                                                        </Badge>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="xs"
                                                            className="border-gray-300 hover:bg-teal-50 hover:border-teal-400 rounded-full bg-teal-500 px-2 py-1 text-white text-xs"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                debouncedHandleRowClick(record);
                                                            }}
                                                            disabled={isResolving}
                                                        >
                                                            {isResolving ? (
                                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                            ) : (
                                                                <ThumbsUp className="w-3 h-3 mr-1" />
                                                            )}
                                                            Resolve
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                                {filteredRecords.length === 0 && (
                                    <div className="text-center py-6 text-gray-600 text-sm">No records found matching your criteria.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {selectedView === 'list' ? <BatchesList /> : <BatchDetails />}
            </div>
            <ErrorBoundary>
                <TransactionModal
                    record={selectedRecord}
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onResolveRecord={handleResolveRecord}
                    onAddComment={handleAddComment}
                    isResolving={isResolving}
                />
            </ErrorBoundary>
            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out;
                }
            `}</style>
        </div>
    );
};

export default ReconciledTransactions;
