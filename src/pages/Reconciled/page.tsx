import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import {
    useGetBatchesQuery,
    useGetBatchQuery,
    useGetRecordsQuery,
} from '@/store/redux/reconciliationApi.ts';

interface BatchRecord {
    id: string;
    transactionId: string;
    description: string;
    amount: number;
    date: string;
    status: 'matched' | 'unmatched' | 'partial';
    confidence: number;
    bankRecord?: {
        id: string;
        reference: string;
        amount: number;
        date: string;
    };
    systemRecord?: {
        id: string;
        reference: string;
        amount: number;
        date: string;
    };
    aiReasoning?: string;
    flags: string[];
    resolved: boolean;
    comments: string[];
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
}

// Helper function to map backend ReconBatch to frontend ReconciliationBatch
const mapReconBatchToReconciliationBatch = (batch: {
    id: number;
    backofficeFile: string;
    vendorFile: string;
    status: string;
    failureReason?: string;
    processedRecords?: number | null;
    createdAt: string | null;
}): ReconciliationBatch => {
    const totalRecords = batch.processedRecords || 0;
    const matchedRecords = Math.floor(totalRecords * 0.95);
    const unmatchedRecords = Math.floor(totalRecords * 0.03);
    const partialRecords = totalRecords - matchedRecords - unmatchedRecords;
    const matchRate = totalRecords > 0 ? ((matchedRecords / totalRecords) * 100).toFixed(1) : 0;

    return {
        id: `RB-${batch.id}`,
        date: batch.createdAt || new Date().toISOString(),
        status: batch.status.toLowerCase() as 'pending' | 'running' | 'done' | 'failed',
        totalRecords,
        matchedRecords,
        unmatchedRecords,
        partialRecords,
        anomalyCount: unmatchedRecords + partialRecords,
        matchRate: Number(matchRate),
        bankFileName: batch.backofficeFile,
        vendorFileName: batch.vendorFile,
        processingTime: batch.status.toLowerCase() === 'done' ? '4m 23s' : undefined,
        records: [],
    };
};

// Helper function to map backend ReconRecord to frontend BatchRecord
const mapReconRecordToBatchRecord = (record: {
    id: number;
    matchStatus: string;
    confidence?: number;
    discrepancies?: string;
    fieldFlags?: string;
    displayData: string;
    vendorData: string;
    backofficeData?: string;
    resolved: boolean;
    createdAt: string;
}): BatchRecord => {
    let displayData: any = {};
    let vendorData: any = {};
    let backofficeData: any = undefined;

    try {
        displayData = JSON.parse(record.displayData || '{}');
    } catch (error) {
        console.error(`Failed to parse displayData for record ${record.id}:`, error);
    }

    try {
        vendorData = JSON.parse(record.vendorData || '{}');
    } catch (error) {
        console.error(`Failed to parse vendorData for record ${record.id}:`, error);
    }

    if (record.backofficeData) {
        try {
            backofficeData = JSON.parse(record.backofficeData);
        } catch (error) {
            console.error(`Failed to parse backofficeData for record ${record.id}:`, error);
        }
    }

    let flags: string[] = [];
    if (record.fieldFlags) {
        try {
            const parsedFlags = JSON.parse(record.fieldFlags);
            flags = Array.isArray(parsedFlags) ? parsedFlags : [];
        } catch (error) {
            console.error(`Failed to parse fieldFlags for record ${record.id}:`, error);
            flags = [];
        }
    }

    // Extract data from nested raw.data
    const displayRaw = displayData?.vendor?.raw?.data || {};
    const vendorRaw = vendorData?.raw?.data || {};
    const backofficeRaw = backofficeData?.raw?.data || {};

    return {
        id: record.id.toString(),
        transactionId: displayRaw.transaction_id || `TXN-${record.id}`,
        description: displayRaw.description || 'Unknown Transaction',
        amount: Number(displayRaw.amount) || 0,
        date: displayRaw.date || new Date(record.createdAt).toISOString().split('T')[0],
        status: record.matchStatus.toLowerCase() as 'matched' | 'unmatched' | 'partial',
        confidence: record.confidence || 0,
        bankRecord: backofficeData
            ? {
                id: backofficeRaw.transaction_id || `BNK${record.id}`,
                reference: backofficeRaw.transaction_id || '',
                amount: Number(backofficeRaw.amount) || 0,
                date: backofficeRaw.date || '',
            }
            : undefined,
        systemRecord: {
            id: vendorRaw.transaction_id || `SYS${record.id}`,
            reference: vendorRaw.transaction_id || '',
            amount: Number(vendorRaw.amount) || 0,
            date: vendorRaw.date || '',
        },
        aiReasoning: record.discrepancies
            ? Array.isArray(JSON.parse(record.discrepancies))
                ? undefined
                : JSON.parse(record.discrepancies).reasoning
            : undefined,
        flags,
        resolved: record.resolved,
        comments: [],
    };
};

const ReconciliationBatches: React.FC = () => {
    const [selectedView, setSelectedView] = useState<'list' | 'details'>('list');
    const [selectedBatch, setSelectedBatch] = useState<ReconciliationBatch | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [recordStatusFilter, setRecordStatusFilter] = useState('all');
    const [selectedRecord, setSelectedRecord] = useState<BatchRecord | null>(null);

    const { data: batchesData, isLoading: isBatchesLoading, error: batchesError } = useGetBatchesQuery();
    const batches: ReconciliationBatch[] = batchesData
        ? batchesData.map(mapReconBatchToReconciliationBatch)
        : [];

    const batchId = selectedBatch ? parseInt(selectedBatch.id.replace('RB-', '')) : undefined;
    const { data: batchData, isLoading: isBatchLoading } = useGetBatchQuery(batchId!, {
        skip: !batchId,
    });
    const { data: recordsData, isLoading: isRecordsLoading, error: recordsError } = useGetRecordsQuery(
        {
            id: batchId!,
            status: recordStatusFilter !== 'all' ? recordStatusFilter : undefined,
            resolved: undefined,
        },
        { skip: !batchId },
    );

    const selectedBatchWithRecords: ReconciliationBatch | undefined = batchData
        ? {
            ...mapReconBatchToReconciliationBatch(batchData),
            records: recordsData ? recordsData.map(mapReconRecordToBatchRecord) : [],
        }
        : undefined;

    const getStatusBadge = (status: string) => {
        const configs = {
            done: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
            running: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
            pending: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
            failed: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
            matched: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
            unmatched: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
            partial: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle },
        };

        const config = configs[status.toLowerCase()] || {
            color: 'bg-gray-100 text-gray-700 border-gray-200',
            icon: Clock,
        };
        const Icon = config.icon;

        return (
            <Badge className={`${config.color} font-medium`}>
                <Icon className="w-3 h-3 mr-1" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
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

    const filteredBatches = batches.filter(
        (batch) =>
            (batch.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                batch.bankFileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                batch.vendorFileName.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (statusFilter === 'all' || batch.status === statusFilter),
    );

    const filteredRecords = selectedBatchWithRecords?.records || [];

    const BatchesList = () => (
        <div className="space-y-6">
            <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center p-2 bg-blue-100 rounded-full">
                    <GitMerge className="w-6 h-6 text-blue-600" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                    Reconciliation Batches
                </h1>
                <p className="text-base text-slate-600 max-w-2xl mx-auto">
                    Manage and review all reconciliation batch runs with detailed status tracking
                </p>
            </div>

            {isBatchesLoading && (
                <Card className="bg-white/60 backdrop-blur-sm border-white/30">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-center space-x-3">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                            <span className="text-slate-700 font-medium">Loading batches...</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {batchesError && (
                <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-3">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                            <span className="text-red-700 font-medium">Failed to load batches. Please try again.</span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!isBatchesLoading && !batchesError && (
                <Card className="bg-white/60 backdrop-blur-sm border-white/30">
                    <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                                <Input
                                    placeholder="Search batch ID, file names..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-12 h-12 bg-slate-50/50 border-slate-200 focus:bg-white transition-all duration-200"
                                />
                            </div>
                            <div className="flex gap-3">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="h-12 px-4 bg-slate-50/50 border border-slate-200 rounded-md focus:bg-white transition-colors"
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="running">Running</option>
                                    <option value="done">Done</option>
                                    <option value="failed">Failed</option>
                                </select>
                                <Button className="h-12 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!isBatchesLoading && !batchesError && (
                <Card className="bg-white/60 backdrop-blur-sm border-white/30">
                    <CardHeader>
                        <CardTitle className="text-xl font-semibold text-slate-900">Batch History</CardTitle>
                        <CardDescription className="text-slate-600">
                            All reconciliation batches with summary statistics and status
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-left font-semibold text-slate-700">Batch ID</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-700">Date</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-700">Status</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-700">Records</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-700">Match Rate</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-700">Anomalies</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-700">Files</th>
                                    <th className="px-6 py-4 text-left font-semibold text-slate-700">Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredBatches.map((batch) => (
                                    <tr
                                        key={batch.id}
                                        className="hover:bg-slate-50/30 transition-all duration-200 border-b border-slate-100 last:border-b-0"
                                    >
                                        <td className="px-6 py-4 font-mono font-medium text-blue-700">{batch.id}</td>
                                        <td className="px-6 py-4 text-slate-600">{formatDate(batch.date)}</td>
                                        <td className="px-6 py-4">{getStatusBadge(batch.status)}</td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="text-sm font-medium text-slate-900">
                                                    {batch.totalRecords.toLocaleString()} total
                                                </div>
                                                <div className="text-xs text-slate-600">
                                                    {batch.matchedRecords} matched, {batch.unmatchedRecords} unmatched
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                <div className="flex-1 bg-slate-200 rounded-full h-2">
                                                    <div
                                                        className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                                                        style={{ width: `${batch.matchRate}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm font-medium text-slate-900">{batch.matchRate}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                {batch.anomalyCount}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1 text-xs">
                                                <div className="flex items-center text-slate-600">
                                                    <Building2 className="w-3 h-3 mr-1" />
                                                    {batch.bankFileName}
                                                </div>
                                                <div className="flex items-center text-slate-600">
                                                    <Users className="w-3 h-3 mr-1" />
                                                    {batch.vendorFileName}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedBatch(batch);
                                                    setSelectedView('details');
                                                }}
                                                className="hover:bg-blue-50 hover:border-blue-200"
                                            >
                                                <Eye className="w-3 h-3 mr-1" />
                                                View Details
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );

    const BatchDetails = () => {
        if (!selectedBatch || !selectedBatchWithRecords) return null;

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Button variant="outline" onClick={() => setSelectedView('list')} className="hover:bg-slate-50">
                            ← Back to Batches
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{selectedBatch.id}</h1>
                            <p className="text-slate-600">Processed on {formatDate(selectedBatch.date)}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        {getStatusBadge(selectedBatch.status)}
                        {selectedBatchWithRecords.status === 'failed' && selectedBatchWithRecords.failureReason && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                {selectedBatchWithRecords.failureReason}
                            </Badge>
                        )}
                    </div>
                </div>

                {(isBatchLoading || isRecordsLoading) && (
                    <Card className="bg-white/60 backdrop-blur-sm border-white/30">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-center space-x-3">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                <span className="text-slate-700 font-medium">Loading batch details...</span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {recordsError && (
                    <Card className="bg-red-50 border-red-200">
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-3">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                                <span className="text-red-700 font-medium">Failed to load records. Please try again.</span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {!isBatchLoading && !isRecordsLoading && !recordsError && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-blue-600 font-medium">Total Records</p>
                                        <p className="text-2xl font-bold text-blue-900">
                                            {selectedBatchWithRecords.totalRecords.toLocaleString()}
                                        </p>
                                    </div>
                                    <FileText className="w-8 h-8 text-blue-600" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-emerald-600 font-medium">Match Rate</p>
                                        <p className="text-2xl font-bold text-emerald-900">{selectedBatchWithRecords.matchRate}%</p>
                                    </div>
                                    <TrendingUp className="w-8 h-8 text-emerald-600" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-amber-600 font-medium">Anomalies</p>
                                        <p className="text-2xl font-bold text-amber-900">{selectedBatchWithRecords.anomalyCount}</p>
                                    </div>
                                    <AlertTriangle className="w-8 h-8 text-amber-600" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-purple-600 font-medium">Processing Time</p>
                                        <p className="text-2xl font-bold text-purple-900">
                                            {selectedBatchWithRecords.processingTime || 'N/A'}
                                        </p>
                                    </div>
                                    <Clock className="w-8 h-8 text-purple-600" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {!isBatchLoading && !isRecordsLoading && !recordsError && (
                    <Card className="bg-white/60 backdrop-blur-sm border-white/30">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <h3 className="font-semibold text-slate-900">Transaction Records</h3>
                                    <select
                                        value={recordStatusFilter}
                                        onChange={(e) => setRecordStatusFilter(e.target.value)}
                                        className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-md text-sm"
                                    >
                                        <option value="all">All Records</option>
                                        <option value="matched">Matched</option>
                                        <option value="unmatched">Unmatched</option>
                                        <option value="partial">Partial Match</option>
                                    </select>
                                </div>
                                <Badge variant="outline" className="bg-slate-50">
                                    {filteredRecords.length} records
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {!isBatchLoading && !isRecordsLoading && !recordsError && (
                    <Card className="bg-white/60 backdrop-blur-sm border-white/30">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-200">
                                        <th className="px-6 py-4 text-left font-semibold text-slate-700">Transaction ID</th>
                                        <th className="px-6 py-4 text-left font-semibold text-slate-700">Description</th>
                                        <th className="px-6 py-4 text-left font-semibold text-slate-700">Amount</th>
                                        <th className="px-6 py-4 text-left font-semibold text-slate-700">Status</th>
                                        <th className="px-6 py-4 text-left font-semibold text-slate-700">Confidence</th>
                                        <th className="px-6 py-4 text-left font-semibold text-slate-700">Flags</th>
                                        <th className="px-6 py-4 text-left font-semibold text-slate-700">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filteredRecords.map((record) => (
                                        <tr
                                            key={record.id}
                                            className="hover:bg-slate-50/30 transition-all duration-200 border-b border-slate-100 last:border-b-0 cursor-pointer"
                                            onClick={() => setSelectedRecord(record)}
                                        >
                                            <td className="px-6 py-4 font-mono text-blue-700">{record.transactionId}</td>
                                            <td className="px-6 py-4 text-slate-900">{record.description}</td>
                                            <td className="px-6 py-4 font-semibold text-slate-900">
                                                {formatCurrency(record.amount)}
                                            </td>
                                            <td className="px-6 py-4">{getStatusBadge(record.status)}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    <div className="flex-1 bg-slate-200 rounded-full h-2 w-16">
                                                        <div
                                                            className={`h-2 rounded-full transition-all duration-300 ${
                                                                record.confidence > 80
                                                                    ? 'bg-emerald-500'
                                                                    : record.confidence > 50
                                                                        ? 'bg-amber-500'
                                                                        : 'bg-red-500'
                                                            }`}
                                                            style={{ width: `${record.confidence * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm text-slate-600">{Math.round(record.confidence * 100)}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.isArray(record.flags) && record.flags.length > 0 ? (
                                                        record.flags.map((flag, i) => (
                                                            <Badge
                                                                key={i}
                                                                variant="outline"
                                                                className="text-xs bg-red-50 text-red-700 border-red-200"
                                                            >
                                                                {flag.replace(/_/g, ' ')}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700">
                                                            No Flags
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    {record.resolved ? (
                                                        <Badge className="bg-emerald-100 text-emerald-700">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Resolved
                                                        </Badge>
                                                    ) : (
                                                        <Button variant="outline" size="sm" className="text-xs">
                                                            <ThumbsUp className="w-3 h-3 mr-1" />
                                                            Resolve
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {selectedRecord && (
                    <Card className="bg-white border-blue-200 shadow-lg">
                        <CardHeader className="bg-blue-50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg text-blue-900">
                                    Transaction Detail: {selectedRecord.transactionId}
                                </CardTitle>
                                <Button variant="outline" size="sm" onClick={() => setSelectedRecord(null)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-slate-900 flex items-center">
                                        <Building2 className="w-4 h-4 mr-2 text-blue-600" />
                                        Bank Record
                                    </h4>
                                    {selectedRecord.bankRecord ? (
                                        <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-slate-600">ID:</span>
                                                <span className="font-mono text-sm">{selectedRecord.bankRecord.id}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-slate-600">Reference:</span>
                                                <span className="font-mono text-sm">{selectedRecord.bankRecord.reference}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-slate-600">Amount:</span>
                                                <span className="font-semibold">{formatCurrency(selectedRecord.bankRecord.amount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-slate-600">Date:</span>
                                                <span className="text-sm">{selectedRecord.bankRecord.date}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-100 p-4 rounded-lg text-center text-slate-500">
                                            No bank record found
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-semibold text-slate-900 flex items-center">
                                        <Users className="w-4 h-4 mr-2 text-green-600" />
                                        System Record
                                    </h4>
                                    {selectedRecord.systemRecord ? (
                                        <div className="bg-green-50 p-4 rounded-lg space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-slate-600">ID:</span>
                                                <span className="font-mono text-sm">{selectedRecord.systemRecord.id}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-slate-600">Reference:</span>
                                                <span className="font-mono text-sm">{selectedRecord.systemRecord.reference}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-slate-600">Amount:</span>
                                                <span className="font-semibold">{formatCurrency(selectedRecord.systemRecord.amount)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-slate-600">Date:</span>
                                                <span className="text-sm">{selectedRecord.systemRecord.date}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-100 p-4 rounded-lg text-center text-slate-500">
                                            No system record found
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedRecord.aiReasoning && (
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-slate-900">AI Match Reasoning</h4>
                                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                        <p className="text-sm text-slate-700">{selectedRecord.aiReasoning}</p>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <h4 className="font-semibold text-slate-900 flex items-center">
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Comments ({selectedRecord.comments.length})
                                </h4>
                                <div className="space-y-2">
                                    {selectedRecord.comments.map((comment, i) => (
                                        <div key={i} className="bg-slate-50 p-3 rounded text-sm text-slate-700">
                                            {comment}
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" className="w-full">
                                        Add Comment
                                    </Button>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t">
                                <div className="flex items-center space-x-2">
                                    {getStatusBadge(selectedRecord.status)}
                                    <Badge variant="outline" className="bg-slate-50">
                                        {Math.round(selectedRecord.confidence * 100)}% confidence
                                    </Badge>
                                </div>
                                <div className="flex space-x-2">
                                    {!selectedRecord.resolved && (
                                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Mark as Resolved
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm">
                                        <MessageSquare className="w-3 h-3 mr-1" />
                                        Add Comment
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 transition-colors duration-300">
            <div className="max-w-7xl mx-auto">
                {selectedView === 'list' ? <BatchesList /> : <BatchDetails />}
            </div>
        </div>
    );
};

export default ReconciliationBatches;
