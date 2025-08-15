import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetBatchesQuery, useGetBatchQuery, useGetRecordsQuery, useRetryBatchMutation, useResolveRecordMutation } from '@/store/redux/reconciliationApi';
import { debounce } from 'lodash';

interface BatchRecord {
    id: string;
    transactionId: string;
    description: string;
    amount: number;
    date: string;
    status: 'MATCHED' | 'UNMATCHED' | 'PARTIAL' | 'DUPLICATE' | 'MISSING';
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
    resolutionComment: string[];
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
    status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
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
    onResolveRecord: (recordId: string, resolutionComment: string) => void;
    onAddComment: (recordId: string, resolutionComment: string) => void;
    isResolving: boolean;
}

const mapReconBatchToReconciliationBatch = (batch: any): ReconciliationBatch => {
    const totalRecords = batch.processedRecords || 0;
    return {
        id: `RB-${batch.id}`,
        date: batch.createdAt || new Date().toISOString(),
        status: batch.status?.toUpperCase() === 'COMPLETED' ? 'DONE' : batch.status?.toUpperCase() === 'PROCESSING' ? 'RUNNING' : batch.status?.toUpperCase() === 'FAILED' ? 'FAILED' : 'PENDING',
        totalRecords,
        matchedRecords: 0,
        unmatchedRecords: 0,
        partialRecords: 0,
        anomalyCount: 0,
        matchRate: 0,
        bankFileName: batch.backofficeFile?.split('/').pop() || 'Unknown File',
        vendorFileName: batch.vendorFile?.split('/').pop() || 'Unknown File',
        processingTime: batch.status?.toUpperCase() === 'COMPLETED' && batch.createdAt && batch.updatedAt ? calculateProcessingTime(batch.createdAt, batch.updatedAt) : undefined,
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
    const getStatus = (matchStatus: string): 'MATCHED' | 'UNMATCHED' | 'PARTIAL' | 'DUPLICATE' | 'MISSING' => {
        const status = matchStatus?.toUpperCase();
        if (status === 'MATCH' || status === 'FULL_MATCH') return 'MATCHED';
        if (status === 'PARTIAL_MATCH') return 'PARTIAL';
        if (status === 'MISMATCH') return 'UNMATCHED';
        if (status === 'DUPLICATE') return 'DUPLICATE';
        if (status === 'MISSING') return 'MISSING';
        return 'UNMATCHED';
    };
    const resolutionComment = record.resolutionComment
        ? Array.isArray(record.resolutionComment)
            ? record.resolutionComment
            : [record.resolutionComment]
        : [];
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
        resolutionComment,
        batchInfo: record.batch ? {
            id: `RB-${record.batch.id}`,
            backofficeFile: record.batch.backofficeFile?.split('/').pop() || 'Unknown File',
            vendorFile: record.batch.vendorFile?.split('/').pop() || 'Unknown File',
            status: record.batch.status?.toUpperCase() === 'COMPLETED' ? 'DONE' : record.batch.status?.toUpperCase() === 'PROCESSING' ? 'RUNNING' : record.batch.status?.toUpperCase() === 'FAILED' ? 'FAILED' : 'PENDING',
            createdAt: record.batch.createdAt || new Date().toISOString(),
            updatedAt: record.batch.updatedAt || new Date().toISOString(),
        } : undefined,
        displayData,
    };
};

const calculateBatchStats = (batch: ReconciliationBatch, records: BatchRecord[]): ReconciliationBatch => {
    const matchedRecords = records.filter(r => r.status === 'MATCHED').length;
    const unmatchedRecords = records.filter(r => r.status === 'UNMATCHED').length;
    const partialRecords = records.filter(r => r.status === 'PARTIAL').length;
    const duplicateRecords = records.filter(r => r.status === 'DUPLICATE').length;
    const missingRecords = records.filter(r => r.status === 'MISSING').length;
    const totalRecords = records.length || batch.totalRecords;
    const matchRate = totalRecords > 0 ? Math.round((matchedRecords / totalRecords) * 100) : 0;
    const anomalyCount = unmatchedRecords + partialRecords + duplicateRecords + missingRecords;
    return {
        ...batch,
        totalRecords,
        matchedRecords,
        unmatchedRecords,
        partialRecords,
        anomalyCount,
        matchRate,
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
    const problematicRecords = records.filter(r => ['UNMATCHED', 'PARTIAL', 'DUPLICATE', 'MISSING'].includes(r.status));
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
        'Resolution Comments',
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
        escapeCsvValue(record.resolutionComment.join('; ')),
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

const useReconciliationLogic = () => {
    const navigate = useNavigate();
    const { batchId } = useParams<{ batchId?: string }>();
    const [selectedView, setSelectedView] = useState<'list' | 'details'>('list');
    const [selectedBatch, setSelectedBatch] = useState<ReconciliationBatch | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [recordStatusFilter, setRecordStatusFilter] = useState('ALL');
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
            status: recordStatusFilter !== 'ALL' ? recordStatusFilter : undefined,
            resolved: undefined,
        },
        { skip: !numericBatchId },
    );
    const [retryBatch, { isLoading: isRetrying }] = useRetryBatchMutation();
    const [resolveRecord, { isLoading: isResolving, error: resolveError }] = useResolveRecordMutation();

    const selectedBatchWithRecords = useMemo(() => {
        if (!batchData) return undefined;
        const mappedBatch = mapReconBatchToReconciliationBatch(batchData);
        if (!recordsData) return mappedBatch;
        return calculateBatchStats(mappedBatch, recordsData.map(mapReconRecordToBatchRecord));
    }, [batchData, recordsData]);

    const filteredRecords = useMemo(() => {
        return selectedBatchWithRecords?.records.filter(
            (record) => recordStatusFilter === 'ALL' || record.status === recordStatusFilter
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
                (statusFilter === 'ALL' || batch.status === statusFilter)
        );

        filtered.sort((a, b) => {
            if (!sortField) {
                const aDate = new Date(a.date).getTime();
                const bDate = new Date(b.date).getTime();
                return bDate - aDate;
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

    useEffect(() => {
        if (resolveError) {
            alert(`Failed to process action: ${resolveError.message || 'Unknown error'}`);
        }
    }, [resolveError]);

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

    const handleResolveRecord = useCallback(async (recordId: string, resolutionComment: string) => {
        if (!resolutionComment.trim()) {
            alert('Please provide a resolution comment.');
            return;
        }
        try {
            await resolveRecord({ id: parseInt(recordId), comment: resolutionComment, resolve: true }).unwrap();
            setSelectedRecord(prev => prev ? {
                ...prev,
                resolved: true,
                resolutionComment: [...prev.resolutionComment, resolutionComment]
            } : null);
            refetchRecords();
            console.log(`Record ${recordId} resolved successfully with comment: ${resolutionComment}`);
        } catch (err) {
            console.error('Failed to resolve record:', err);
            alert('Failed to resolve record. Please try again.');
        }
    }, [resolveRecord, refetchRecords]);

    const handleAddComment = useCallback(async (recordId: string, resolutionComment: string) => {
        if (!resolutionComment.trim()) {
            alert('Please provide a comment.');
            return;
        }
        try {
            await resolveRecord({ id: parseInt(recordId), comment: resolutionComment, resolve: false }).unwrap();
            setSelectedRecord(prev => prev ? {
                ...prev,
                resolutionComment: [...prev.resolutionComment, resolutionComment]
            } : null);
            refetchRecords();
            console.log(`Comment added to record ${recordId}: ${resolutionComment}`);
        } catch (err) {
            console.error('Failed to add comment:', err);
            alert('Failed to add comment. Please try again.');
        }
    }, [resolveRecord, refetchRecords]);

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

    const handleSort = useCallback((field: keyof ReconciliationBatch) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    }, [sortField, sortDirection]);

    return {
        selectedView,
        setSelectedView,
        selectedBatch,
        setSelectedBatch,
        searchTerm,
        setSearchTerm,
        statusFilter,
        setStatusFilter,
        recordStatusFilter,
        setRecordStatusFilter,
        selectedRecord,
        setSelectedRecord,
        isModalOpen,
        setIsModalOpen,
        lastSelectedBatchId,
        setLastSelectedBatchId,
        sortField,
        sortDirection,
        batches,
        isBatchesLoading,
        batchesError,
        batchError,
        recordsError,
        isBatchLoading,
        isRecordsLoading,
        isRetrying,
        isResolving,
        filteredBatches,
        filteredRecords,
        selectedBatchWithRecords,
        handleRetryBatch,
        handleResolveRecord,
        handleAddComment,
        handleRefreshBatches,
        debouncedHandleRowClick,
        handleCloseModal,
        handleExportIssues,
        handleSort,
        formatCurrency,
        formatDate,
        getFieldErrorStatus,
    };
};

export type { BatchRecord, ReconciliationBatch, RecordModalProps };
export { useReconciliationLogic, mapReconBatchToReconciliationBatch, calculateBatchStats, mapReconRecordToBatchRecord, escapeCsvValue, exportProblematicRecords, formatCurrency, formatDate, getFieldErrorStatus };