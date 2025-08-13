
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from '@/components/ui/dialog';
import {
    Search,
    Download,
    Eye,
    GitMerge,
    CheckCircle,
    AlertTriangle,
    Clock,
    XCircle,
    FileText,
    TrendingUp,
    Users,
    Building2,
    MessageSquare,
    ThumbsUp,
    X,
    Loader2,
    Repeat,
    Code,
} from 'lucide-react';
import {
    useGetBatchesQuery,
    useGetBatchQuery,
    useGetRecordsQuery,
    useRetryBatchMutation,
    useResolveRecordMutation,
} from '@/store/redux/reconciliationApi';
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
        vendor: {
            core: Record<string, any>;
            raw: Record<string, any>;
        };
        backoffice: {
            core: Record<string, any>;
            raw: Record<string, any>;
        };
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

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    state = { hasError: false };

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="text-rose-700 p-4 rounded-lg bg-rose-50">
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
        status: batch.status?.toLowerCase() === 'completed' ? 'done' :
            batch.status?.toLowerCase() === 'processing' ? 'running' :
                batch.status?.toLowerCase() === 'failed' ? 'failed' : 'pending',
        totalRecords,
        matchedRecords: 0,
        unmatchedRecords: 0,
        partialRecords: 0,
        anomalyCount: 0,
        matchRate: 0,
        bankFileName: batch.backofficeFile?.split('/').pop() || 'Unknown File',
        vendorFileName: batch.vendorFile?.split('/').pop() || 'Unknown File',
        processingTime: batch.status?.toLowerCase() === 'completed' && batch.createdAt && batch.updatedAt ?
            calculateProcessingTime(batch.createdAt, batch.updatedAt) : undefined,
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
        comments: [],
        batchInfo: record.batch ? {
            id: `RB-${record.batch.id}`,
            backofficeFile: record.batch.backofficeFile?.split('/').pop() || 'Unknown File',
            vendorFile: record.batch.vendorFile?.split('/').pop() || 'Unknown File',
            status: record.batch.status?.toLowerCase() === 'completed' ? 'done' :
                record.batch.status?.toLowerCase() === 'processing' ? 'running' :
                    record.batch.status?.toLowerCase() === 'failed' ? 'failed' : 'pending',
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

    console.log(`Calculating stats for batch ${batch.id}:`, {
        totalRecords,
        matchedRecords,
        unmatchedRecords,
        partialRecords,
        matchRate,
        anomalyCount,
    });

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

const ReconciledTransactions: React.FC = () => {
    const navigate = useNavigate();
    const { batchId } = useParams<{ batchId?: string }>();
    const [selectedView, setSelectedView] = useState<'list' | 'details'>('list');
    const [selectedBatch, setSelectedBatch] = useState<ReconciliationBatch | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [recordStatusFilter, setRecordStatusFilter] = useState('all');
    const [selectedRecord, setSelectedRecord] = useState<BatchRecord | null>(null);
    const [lastSelectedBatchId, setLastSelectedBatchId] = useState<string | null>(null);
    const [showRawData, setShowRawData] = useState(false);

    const { data: batchesData, isLoading: isBatchesLoading, error: batchesError } = useGetBatchesQuery();
    const batches = useMemo(() => batchesData ? batchesData.map(mapReconBatchToReconciliationBatch) : [], [batchesData]);

    const numericBatchId = useMemo(() => batchId ? parseInt(batchId.replace('RB-', '')) : undefined, [batchId]);
    const {
        data: batchData,
        isLoading: isBatchLoading,
        error: batchError,
        refetch: refetchBatch
    } = useGetBatchQuery(numericBatchId!, {
        skip: !numericBatchId,
    });

    const {
        data: recordsData,
        isLoading: isRecordsLoading,
        error: recordsError,
        refetch: refetchRecords
    } = useGetRecordsQuery(
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

    useEffect(() => {
        console.log('selectedRecord updated:', selectedRecord);
    }, [selectedRecord]);

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

    const getStatusBadge = useCallback((status: string) => {
        const configs = {
            done: { color: 'bg-teal-500 text-white', icon: CheckCircle },
            running: { color: 'bg-indigo-500 text-white', icon: Clock },
            pending: { color: 'bg-amber-500 text-white', icon: Clock },
            failed: { color: 'bg-rose-500 text-white', icon: XCircle },
            matched: { color: 'bg-teal-500 text-white', icon: CheckCircle },
            unmatched: { color: 'bg-rose-500 text-white', icon: XCircle },
            partial: { color: 'bg-amber-500 text-white', icon: AlertTriangle },
        };

        const config = configs[status.toLowerCase()] || {
            color: 'bg-gray-500 text-white',
            icon: Clock,
        };
        const Icon = config.icon;

        return (
            <Badge className={`${config.color} font-medium px-3 py-1 rounded-full flex items-center gap-1`}>
                <Icon className="w-3 h-3" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    }, []);

    const formatCurrency = useCallback((amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    }, []);

    const formatDate = useCallback((dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }, []);

    const filteredBatches = useMemo(() => {
        return batches.map(batch => {
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
    }, [batches, searchTerm, statusFilter, selectedBatchWithRecords]);

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

    const handleResolveRecord = useCallback(async (recordId: string) => {
        try {
            await resolveRecord(parseInt(recordId)).unwrap();
            setSelectedRecord(null);
            refetchRecords();
        } catch (err) {
            console.error('Failed to resolve record:', err);
        }
    }, [resolveRecord, refetchRecords]);

    const debouncedHandleRowClick = useCallback(
        debounce((record: BatchRecord) => {
            console.log('Row clicked for record:', record);
            setSelectedRecord(record);
        }, 300),
        []
    );

    const handleExportIssues = useCallback(() => {
        if (selectedBatchWithRecords && selectedBatchWithRecords.records.length > 0) {
            exportProblematicRecords(selectedBatchWithRecords.records, selectedBatchWithRecords.id);
        } else {
            alert('No records available to export.');
        }
    }, [selectedBatchWithRecords]);

    const getFieldErrorStatus = useCallback((field: string, record: BatchRecord): boolean => {
        return record.flags.some(flag => flag.toLowerCase().includes(field.toLowerCase()));
    }, []);

    const renderDataTable = (data: Record<string, any>, title: string, type: 'vendor' | 'backoffice') => {
        if (!data) return null;

        return (
            <div className="space-y-2">
                <h4 className="font-semibold text-gray-800">{title}</h4>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse bg-white rounded-lg shadow-sm border border-gray-200">
                        <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Field</th>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Value</th>
                        </tr>
                        </thead>
                        <tbody>
                        {Object.entries(data).map(([key, value]) => (
                            <tr key={key} className="border-b border-gray-100 last:border-b-0">
                                <td className="px-4 py-2 text-sm">
                                    <span className={getFieldErrorStatus(key, selectedRecord!) ? 'text-rose-600 font-medium' : 'text-gray-600'}>
                                        {key}
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-800">
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

    const BatchesList = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-indigo-100">
                    <GitMerge className="w-8 h-8 text-indigo-600" />
                </div>
                <h1 className="text-4xl font-bold text-gray-800">Reconciliation Batches</h1>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    Review and manage all reconciliation batches with detailed insights and status tracking.
                </p>
            </div>

            {isBatchesLoading && (
                <Card className="border-none bg-white shadow-lg rounded-xl">
                    <CardContent className="p-6 flex items-center justify-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                        <span className="text-gray-700 font-medium">Loading batches...</span>
                    </CardContent>
                </Card>
            )}

            {batchesError && (
                <Card className="border-none bg-rose-50 shadow-lg rounded-xl">
                    <CardContent className="p-6 flex items-center gap-3">
                        <AlertTriangle className="h-6 w-6 text-rose-600" />
                        <span className="text-rose-700 font-medium">Failed to load batches. Please try again.</span>
                    </CardContent>
                </Card>
            )}

            {!isBatchesLoading && !batchesError && (
                <Card className="border-none bg-white shadow-lg rounded-xl">
                    <CardHeader>
                        <CardTitle className="text-2xl font-semibold text-gray-800">Batch History</CardTitle>
                        <CardDescription className="text-gray-600">
                            View all reconciliation batches with summary statistics and status.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row gap-4 mb-6">
                            <div className="relative flex-1">
                                <Search
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <Input
                                    placeholder="Search batch ID, file names..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-12 h-11 rounded-lg bg-gray-50 border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-indigo-500 transition-all"
                                />
                            </div>
                            <div className="flex gap-3">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="h-11 px-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:bg-white focus:border-indigo-500 transition-all"
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="running">Running</option>
                                    <option value="done">Done</option>
                                    <option value="failed">Failed</option>
                                </select>
                                <Button className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export All
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Batch ID</th>
                                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Date</th>
                                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Status</th>
                                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Records</th>
                                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Files</th>
                                    <th className="px-6 py-4 text-left font-semibold text-gray-700">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredBatches.map((batch) => (
                                    <tr
                                        key={batch.id}
                                        id={`batch-row-${batch.id}`}
                                        className={`hover:bg-indigo-50/30 transition-all duration-200 border-b border-gray-100 last:border-b-0 ${
                                            lastSelectedBatchId === batch.id ? 'bg-indigo-50/50' : ''
                                        }`}
                                    >
                                        <td className="px-6 py-4 font-mono font-medium text-indigo-700">{batch.id}</td>
                                        <td className="px-6 py-4 text-gray-600">{formatDate(batch.date)}</td>
                                        <td className="px-6 py-4">{getStatusBadge(batch.status)}</td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="text-sm font-medium text-gray-800">
                                                    {batch.totalRecords.toLocaleString()} total
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    {batch.matchedRecords} matched, {batch.unmatchedRecords} unmatched, {batch.partialRecords} partial
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1 text-xs text-gray-600">
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
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedBatch(batch);
                                                        setSelectedView('details');
                                                        setLastSelectedBatchId(batch.id);
                                                        navigate(`/reconciliation/results/${batch.id}`);
                                                    }}
                                                    className="border-gray-300 hover:bg-indigo-50 hover:border-indigo-400 text-gray-700"
                                                >
                                                    <Eye className="w-3 h-3 mr-1" />
                                                    View Details
                                                </Button>
                                                {batch.status === 'failed' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={handleRetryBatch}
                                                        disabled={isRetrying}
                                                        className="border-gray-300 hover:bg-amber-50 hover:border-amber-400 text-gray-700"
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
                                <div className="text-center py-8 text-gray-600">No batches found matching your criteria.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );

    const BatchDetails = () => {
        if (!selectedBatch || !selectedBatchWithRecords) return null;

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSelectedView('list');
                                setSelectedBatch(null);
                                setSelectedRecord(null);
                                navigate('/reconciled');
                            }}
                            className="border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg"
                        >
                            ← Back to Batches
                        </Button>
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-800">{selectedBatch.id}</h1>
                            <p className="text-sm text-gray-600">Processed on {formatDate(selectedBatch.date)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {getStatusBadge(selectedBatch.status)}
                        {selectedBatchWithRecords.status === 'failed' && selectedBatchWithRecords.failureReason && (
                            <Badge className="bg-rose-500 text-white rounded-full">
                                {selectedBatchWithRecords.failureReason}
                            </Badge>
                        )}
                        <Button
                            className="h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-lg"
                            onClick={handleExportIssues}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export Issues
                        </Button>
                        <ReportDownloader batchId={numericBatchId!.toString()} />
                    </div>
                </div>

                {(isBatchLoading || isRecordsLoading) && (
                    <Card className="border-none bg-white shadow-lg rounded-xl">
                        <CardContent className="p-6 flex items-center justify-center gap-3">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                            <span className="text-gray-700 font-medium">Loading batch details...</span>
                        </CardContent>
                    </Card>
                )}

                {(batchError || recordsError) && (
                    <Card className="border-none bg-rose-50 shadow-lg rounded-xl">
                        <CardContent className="p-6 flex items-center gap-3">
                            <AlertTriangle className="h-6 w-6 text-rose-600" />
                            <span className="text-rose-700 font-medium">
                                {batchError ? 'Failed to load batch details.' : 'Failed to load records.'} Please try again.
                            </span>
                        </CardContent>
                    </Card>
                )}

                {!isBatchLoading && !isRecordsLoading && !batchError && !recordsError && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="border-none bg-white shadow-lg rounded-xl">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Total Records</p>
                                    <p className="text-2xl font-bold text-gray-800">
                                        {selectedBatchWithRecords.totalRecords.toLocaleString()}
                                    </p>
                                </div>
                                <FileText className="w-8 h-8 text-indigo-600" />
                            </CardContent>
                        </Card>

                        <Card className="border-none bg-white shadow-lg rounded-xl">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Match Rate</p>
                                    <p className="text-2xl font-bold text-gray-800">{selectedBatchWithRecords.matchRate}%</p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-teal-600" />
                            </CardContent>
                        </Card>

                        <Card className="border-none bg-white shadow-lg rounded-xl">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Anomalies</p>
                                    <p className="text-2xl font-bold text-gray-800">{selectedBatchWithRecords.anomalyCount}</p>
                                </div>
                                <AlertTriangle className="w-8 h-8 text-amber-600" />
                            </CardContent>
                        </Card>

                        <Card className="border-none bg-white shadow-lg rounded-xl">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Processing Time</p>
                                    <p className="text-2xl font-bold text-gray-800">
                                        {selectedBatchWithRecords.processingTime || 'N/A'}
                                    </p>
                                </div>
                                <Clock className="w-8 h-8 text-purple-600" />
                            </CardContent>
                        </Card>
                    </div>
                )}

                {!isBatchLoading && !isRecordsLoading && !batchError && !recordsError && (
                    <Card className="border-none bg-white shadow-lg rounded-xl">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-xl font-semibold text-gray-800">Transaction Records</h3>
                                    <select
                                        value={recordStatusFilter}
                                        onChange={(e) => setRecordStatusFilter(e.target.value)}
                                        className="h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:bg-white focus:border-indigo-500 transition-all"
                                    >
                                        <option value="all">All Records</option>
                                        <option value="matched">Matched</option>
                                        <option value="unmatched">Unmatched</option>
                                        <option value="partial">Partial Match</option>
                                    </select>
                                </div>
                                <Badge className="bg-indigo-500 text-white rounded-full">
                                    {filteredRecords.length} records
                                </Badge>
                            </div>
                        </CardContent>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Transaction ID</th>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Description</th>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Amount</th>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Status</th>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Confidence</th>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Flags</th>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filteredRecords.map((record) => (
                                        <tr
                                            key={record.id}
                                            className="hover:bg-indigo-50/30 transition-all duration-200 border-b border-gray-100 last:border-b-0 cursor-pointer"
                                            onClick={() => debouncedHandleRowClick(record)}
                                        >
                                            <td className="px-6 py-4 font-mono text-indigo-700">{record.transactionId}</td>
                                            <td className="px-6 py-4 text-gray-800">{record.description}</td>
                                            <td className="px-6 py-4 font-semibold text-gray-800">
                                                {formatCurrency(record.amount)}
                                            </td>
                                            <td className="px-6 py-4">{getStatusBadge(record.status)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 bg-gray-200 rounded-full h-2 w-16">
                                                        <div
                                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                                record.confidence > 0.8
                                                                    ? 'bg-teal-500'
                                                                    : record.confidence > 0.5
                                                                        ? 'bg-amber-500'
                                                                        : 'bg-rose-500'
                                                            }`}
                                                            style={{ width: `${record.confidence * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm text-gray-600">{Math.round(record.confidence * 100)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.isArray(record.flags) && record.flags.length > 0 ? (
                                                        record.flags.map((flag, i) => (
                                                            <Badge
                                                                key={i}
                                                                className="text-xs bg-rose-500 text-white rounded-full"
                                                            >
                                                                {flag.replace(/_/g, ' ')}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <Badge className="text-xs bg-gray-500 text-white rounded-full">
                                                            No Flags
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {record.resolved ? (
                                                        <Badge className="bg-teal-500 text-white rounded-full">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Resolved
                                                        </Badge>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-gray-300 hover:bg-teal-50 hover:border-teal-400 text-gray-700"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleResolveRecord(record.id);
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
                                    <div className="text-center py-8 text-gray-600">No records found matching your criteria.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {selectedRecord && (
                    <ErrorBoundary>
                        <Dialog open={!!selectedRecord} onOpenChange={(open) => {
                            if (!open) {
                                setSelectedRecord(null);
                                setShowRawData(false);
                            }
                        }}>
                            <DialogContent className="sm:max-w-3xl bg-white border-none shadow-xl rounded-xl">
                                <DialogHeader className="bg-gray-50 p-4 rounded-t-xl">
                                    <DialogTitle className="text-lg font-semibold text-gray-800">
                                        Transaction Detail: {selectedRecord.transactionId}
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                                    {selectedRecord.batchInfo && (
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-gray-800 flex items-center">
                                                <GitMerge className="w-4 h-4 mr-2 text-indigo-600" />
                                                Batch Information
                                            </h4>
                                            <div className="bg-gray-50 p-4 rounded-lg space-y-2 border border-gray-200">
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Batch ID:</span>
                                                    <span className="font-mono text-sm text-gray-800">{selectedRecord.batchInfo.id || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Bank File:</span>
                                                    <span className="text-sm text-gray-800">{selectedRecord.batchInfo.backofficeFile || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Vendor File:</span>
                                                    <span className="text-sm text-gray-800">{selectedRecord.batchInfo.vendorFile || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Status:</span>
                                                    {getStatusBadge(selectedRecord.batchInfo.status || 'pending')}
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Created At:</span>
                                                    <span className="text-sm text-gray-800">{formatDate(selectedRecord.batchInfo.createdAt || new Date().toISOString())}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-600">Updated At:</span>
                                                    <span className="text-sm text-gray-800">{formatDate(selectedRecord.batchInfo.updatedAt || new Date().toISOString())}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-gray-800 flex items-center">
                                                <Building2 className="w-4 h-4 mr-2 text-teal-600" />
                                                Bank Record
                                            </h4>
                                            {selectedRecord.bankRecord ? (
                                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">ID:</span>
                                                        <span className="font-mono text-sm text-gray-800">{selectedRecord.bankRecord.id || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Reference:</span>
                                                        <span className="font-mono text-sm text-gray-800">{selectedRecord.bankRecord.reference || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Amount:</span>
                                                        <span className="font-semibold text-gray-800">{formatCurrency(selectedRecord.bankRecord.amount || 0)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Date:</span>
                                                        <span className="text-sm text-gray-800">{selectedRecord.bankRecord.date || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className={getFieldErrorStatus('description', selectedRecord!) ? 'text-rose-600 font-medium text-sm' : 'text-gray-600 text-sm'}>
                                                            Description
                                                        </span>
                                                        <span className="text-sm text-gray-800">{selectedRecord.bankRecord.description || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className={getFieldErrorStatus('status', selectedRecord!) ? 'text-rose-600 font-medium text-sm' : 'text-gray-600 text-sm'}>
                                                            Status
                                                        </span>
                                                        <span className="text-sm text-gray-800">{selectedRecord.bankRecord.status || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Direction:</span>
                                                        <span className="text-sm text-gray-800">{selectedRecord.bankRecord.direction || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-600 border border-gray-200">
                                                    No bank record found
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-gray-800 flex items-center">
                                                <Users className="w-4 h-4 mr-2 text-blue-600" />
                                                System Record
                                            </h4>
                                            {selectedRecord.systemRecord ? (
                                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">ID:</span>
                                                        <span className="font-mono text-sm text-gray-800">{selectedRecord.systemRecord.id || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Reference:</span>
                                                        <span className="font-mono text-sm text-gray-800">{selectedRecord.systemRecord.reference || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Amount:</span>
                                                        <span className="font-semibold text-gray-800">{formatCurrency(selectedRecord.systemRecord.amount || 0)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Date:</span>
                                                        <span className="text-sm text-gray-800">{selectedRecord.systemRecord.date || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className={getFieldErrorStatus('description', selectedRecord!) ? 'text-rose-600 font-medium text-sm' : 'text-gray-600 text-sm'}>
                                                            Description
                                                        </span>
                                                        <span className="text-sm text-gray-800">{selectedRecord.systemRecord.description || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className={getFieldErrorStatus('status', selectedRecord!) ? 'text-rose-600 font-medium text-sm' : 'text-gray-600 text-sm'}>
                                                            Status
                                                        </span>
                                                        <span className="text-sm text-gray-800">{selectedRecord.systemRecord.status || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Direction:</span>
                                                        <span className="text-sm text-gray-800">{selectedRecord.systemRecord.direction || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-gray-50 p-4 rounded-lg text-center text-gray-600 border border-gray-200">
                                                    No system record found
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg"
                                        onClick={() => setShowRawData(!showRawData)}
                                    >
                                        <Code className="w-4 h-4 mr-2" />
                                        {showRawData ? 'Hide Raw Data' : 'Show Raw Data'}
                                    </Button>

                                    {showRawData && selectedRecord.displayData && (
                                        <div className="space-y-6">
                                            {renderDataTable(selectedRecord.displayData.backoffice?.raw, 'Bank Raw Data', 'backoffice')}
                                            {renderDataTable(selectedRecord.displayData.vendor?.raw, 'Vendor Raw Data', 'vendor')}
                                        </div>
                                    )}

                                    {selectedRecord.aiReasoning && (
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-gray-800 flex items-center">
                                                <AlertTriangle className="w-4 h-4 mr-2 text-purple-600" />
                                                AI Match Reasoning
                                            </h4>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                {selectedRecord.aiReasoning.split('; ').length > 1 ? (
                                                    <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                                                        {selectedRecord.aiReasoning.split('; ').map((reason, index) => (
                                                            <li key={index} className="pl-2 flex items-center gap-2">
                                                                <Badge
                                                                    className={`${
                                                                        reason.includes('mismatch') ? 'bg-rose-500 text-white' : 'bg-purple-500 text-white'
                                                                    } rounded-full`}
                                                                >
                                                                    {reason.includes('mismatch') ? 'Error' : 'Info'}
                                                                </Badge>
                                                                {reason}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="text-sm text-gray-700">{selectedRecord.aiReasoning}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-gray-800 flex items-center">
                                            <MessageSquare className="w-4 h-4 mr-2 text-indigo-600" />
                                            Comments ({selectedRecord.comments.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {selectedRecord.comments.length > 0 ? (
                                                selectedRecord.comments.map((comment, i) => (
                                                    <div key={i} className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 border border-gray-200">
                                                        {comment}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-gray-600">No comments</p>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg"
                                                disabled
                                            >
                                                Add Comment
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(selectedRecord.status)}
                                            <Badge className="bg-indigo-500 text-white rounded-full">
                                                {Math.round(selectedRecord.confidence * 100)}% confidence
                                            </Badge>
                                            {selectedRecord.resolved && (
                                                <Badge className="bg-teal-500 text-white rounded-full">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    Resolved
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {!selectedRecord.resolved && (
                                                <Button
                                                    size="sm"
                                                    className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
                                                    onClick={() => handleResolveRecord(selectedRecord.id)}
                                                    disabled={isResolving}
                                                >
                                                    {isResolving ? (
                                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                    )}
                                                    Mark as Resolved
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg"
                                                disabled
                                            >
                                                <MessageSquare className="w-3 h-3 mr-1" />
                                                Add Comment
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </ErrorBoundary>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {selectedView === 'list' ? <BatchesList /> : <BatchDetails />}
            </div>
            <style jsx>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .animate-fade-in {
                    animation: fade-in 0.5s ease-out;
                }
            `}</style>
        </div>
    );
};

export default ReconciledTransactions;
