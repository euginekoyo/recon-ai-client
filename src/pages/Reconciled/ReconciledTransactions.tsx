import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Activity,
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    BarChart3,
    Building2,
    Calendar,
    CheckCircle,
    Clock,
    Download,
    Eye,
    FileText,
    Filter,
    GitMerge,
    Loader2,
    MessageSquare,
    MoreVertical,
    RefreshCw,
    Repeat,
    Search,
    Sparkles,
    Target,
    TrendingUp,
    Users,
    XCircle
} from 'lucide-react';
import ReportDownloader from '@/pages/Reconciled/ReportDownloader';
import {
    formatCurrency,
    formatDate,
    getFieldErrorStatus,
    RecordModalProps,
    useReconciliationLogic
} from './ReconciledTransactionsLogic';

// ErrorBoundary component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    state = { hasError: false };
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-lg p-4 text-center">
                    <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                    <p className="text-red-700 font-medium">Something went wrong</p>
                    <p className="text-red-600 text-xs mt-1">Please refresh the page or contact support</p>
                </div>
            );
        }
        return this.props.children;
    }
}

// Status badge utility function
const getStatusBadge = (status: string) => {
    const configs = {
        DONE: {
            bg: 'bg-gradient-to-r from-emerald-100 to-green-100',
            text: 'text-emerald-800',
            border: 'border-emerald-200',
            icon: CheckCircle,
            dot: 'bg-emerald-500'
        },
        RUNNING: {
            bg: 'bg-gradient-to-r from-blue-100 to-indigo-100',
            text: 'text-blue-800',
            border: 'border-blue-200',
            icon: Clock,
            dot: 'bg-blue-500'
        },
        PENDING: {
            bg: 'bg-gradient-to-r from-amber-100 to-yellow-100',
            text: 'text-amber-800',
            border: 'border-amber-200',
            icon: Clock,
            dot: 'bg-amber-500'
        },
        FAILED: {
            bg: 'bg-gradient-to-r from-red-100 to-rose-100',
            text: 'text-red-800',
            border: 'border-red-200',
            icon: XCircle,
            dot: 'bg-red-500'
        },
        MATCHED: {
            bg: 'bg-gradient-to-r from-emerald-100 to-green-100',
            text: 'text-emerald-800',
            border: 'border-emerald-200',
            icon: CheckCircle,
            dot: 'bg-emerald-500'
        },
        UNMATCHED: {
            bg: 'bg-gradient-to-r from-red-100 to-rose-100',
            text: 'text-red-800',
            border: 'border-red-200',
            icon: XCircle,
            dot: 'bg-red-500'
        },
        PARTIAL: {
            bg: 'bg-gradient-to-r from-amber-100 to-yellow-100',
            text: 'text-amber-800',
            border: 'border-amber-200',
            icon: AlertTriangle,
            dot: 'bg-amber-500'
        },
        DUPLICATE: {
            bg: 'bg-gradient-to-r from-purple-100 to-violet-100',
            text: 'text-purple-800',
            border: 'border-purple-200',
            icon: AlertTriangle,
            dot: 'bg-purple-500'
        },
        MISSING: {
            bg: 'bg-gradient-to-r from-gray-100 to-slate-100',
            text: 'text-gray-800',
            border: 'border-gray-200',
            icon: AlertTriangle,
            dot: 'bg-gray-500'
        },
    };
    const config = configs[status] || configs.PENDING;
    const Icon = config.icon;
    return (
        <Badge
            className={`${config.bg} ${config.text} ${config.border} border font-medium px-2 py-1 rounded-full flex items-center gap-1 text-xs shadow-sm`}
        >
            <div className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
            {status}
        </Badge>
    );
};

// Transaction Modal component
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

    const handleResolveRecord = useCallback((recordId: string, resolutionComment: string) => {
        if (!resolutionComment.trim()) {
            alert('Please provide a resolution comment.');
            return;
        }
        onResolveRecord(recordId, resolutionComment);
        setNewComment('');
    }, [onResolveRecord]);

    const handleAddComment = useCallback((recordId: string, resolutionComment: string) => {
        if (!resolutionComment.trim()) {
            alert('Please provide a comment.');
            return;
        }
        onAddComment(recordId, resolutionComment);
        setNewComment('');
    }, [onAddComment]);

    const renderDataTable = (data: Record<string, any>, title: string, type: 'vendor' | 'backoffice') => {
        if (!data) return null;
        return (
            <div className="space-y-2">
                <h4 className="font-semibold text-gray-800 text-xs flex items-center gap-1">
                    <div className="p-1.5 bg-indigo-500 rounded-md">
                        <FileText className="w-3 h-3 text-white" />
                    </div>
                    {title}
                </h4>
                <div className="overflow-x-auto bg-gradient-to-br from-gray-50 to-white rounded-lg border border-gray-200">
                    <table className="w-full">
                        <thead>
                        <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b border-gray-200">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Field</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Value</th>
                        </tr>
                        </thead>
                        <tbody>
                        {Object.entries(data).map(([key, value]) => (
                            <tr key={key} className="border-b border-gray-100 last:border-b-0 hover:bg-blue-50/30 transition-colors">
                                <td className="px-3 py-2 text-xs">
                                    <span
                                        className={getFieldErrorStatus(key, record!) ? 'text-red-600 font-medium flex items-center gap-1' : 'text-gray-600'}
                                    >
                                      {getFieldErrorStatus(key, record!) && <AlertTriangle className="w-2.5 h-2.5" />}
                                        {key}
                                    </span>
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-800 font-mono">
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

    const resolutionComments = Array.isArray(record.resolutionComment) ? record.resolutionComment : [record.resolutionComment];

    return createPortal(
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="sm:max-w-4xl bg-white border-none shadow-xl rounded-lg transition-all duration-300 max-h-[80vh] overflow-hidden"
            >
                <DialogHeader className="bg-blue-500 p-4 rounded-t-lg text-white">
                    <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                        <div className="p-1.5 bg-white/20 rounded-md">
                            <FileText className="w-4 h-4" />
                        </div>
                        Transaction Details: {record.transactionId}
                    </DialogTitle>
                </DialogHeader>
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {record.batchInfo && (
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-200">
                            <h4 className="font-semibold text-gray-800 flex items-center gap-1 mb-3">
                                <div className="p-1.5 bg-indigo-500 rounded-md">
                                    <GitMerge className="w-3 h-3 text-white" />
                                </div>
                                Batch Information
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-600 font-medium">Batch ID:</span>
                                        <span className="font-mono text-gray-800 bg-white px-1.5 py-1 rounded-md text-xs">{record.batchInfo.id || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-600 font-medium">Status:</span>
                                        {getStatusBadge(record.batchInfo.status || 'PENDING')}
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-600 font-medium">Created:</span>
                                        <span className="text-gray-800">{formatDate(record.batchInfo.createdAt || new Date().toISOString())}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-600 font-medium">Bank File:</span>
                                        <span className="text-gray-800 bg-white px-1.5 py-1 rounded-md text-xs">{record.batchInfo.backofficeFile || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-600 font-medium">Vendor File:</span>
                                        <span className="text-gray-800 bg-white px-1.5 py-1 rounded-md text-xs">{record.batchInfo.vendorFile || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-600 font-medium">Updated:</span>
                                        <span className="text-gray-800">{formatDate(record.batchInfo.updatedAt || new Date().toISOString())}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-teal-200">
                            <h4 className="font-semibold text-gray-800 flex items-center gap-1 mb-3">
                                <div className="p-1.5 bg-teal-500 rounded-md">
                                    <Building2 className="w-3 h-3 text-white" />
                                </div>
                                Backoffice Record
                            </h4>
                            {record.bankRecord ? (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                                        <span className="text-gray-600 font-medium">ID:</span>
                                        <span className="font-mono text-gray-800 px-1.5 py-1 rounded-md text-xs">{record.bankRecord.id || 'N/A'}</span>
                                        <span className="text-gray-600 font-medium">Amount:</span>
                                        <span className="font-semibold text-teal-700">{formatCurrency(record.bankRecord.amount || 0)}</span>
                                        <span className="text-gray-600 font-medium">Date:</span>
                                        <span className="text-gray-800">{record.bankRecord.date || 'N/A'}</span>
                                        <span className="text-gray-600 font-medium">Direction:</span>
                                        <span className="text-gray-800">{record.bankRecord.direction || 'N/A'}</span>
                                    </div>
                                    <div className="flex-row flex grid grid-cols-2">
                                        <span
                                            className={`${
                                                getFieldErrorStatus('description', record) ? 'text-red-600 font-medium flex items-center' : 'text-gray-600 font-medium'
                                            } text-xs block mb-1`}
                                        >
                                          {getFieldErrorStatus('description', record) && <AlertTriangle className="w-2.5 h-2.5" />}
                                            Description:
                                        </span>
                                        <div className="p-2 rounded-lg text-xs text-gray-800">{record.bankRecord.description || 'N/A'}</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-gray-500">
                                    <Building2 className="w-10 h-10 mx-auto mb-1 opacity-50" />
                                    <p>No backoffice record found</p>
                                </div>
                            )}
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                            <h4 className="font-semibold text-gray-800 flex items-center gap-1 mb-3">
                                <div className="p-1.5 bg-blue-500 rounded-md">
                                    <Users className="w-3 h-3 text-white" />
                                </div>
                                Vendor Record
                            </h4>
                            {record.systemRecord ? (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                                        <span className="text-gray-600 font-medium">ID:</span>
                                        <span className="font-mono text-gray-800 px-1.5 py-1 rounded-md text-xs">{record.systemRecord.id || 'N/A'}</span>
                                        <span className="text-gray-600 font-medium">Amount:</span>
                                        <span className="font-semibold text-blue-700">{formatCurrency(record.systemRecord.amount || 0)}</span>
                                        <span className="text-gray-600 font-medium">Date:</span>
                                        <span className="text-gray-800">{record.systemRecord.date || 'N/A'}</span>
                                        <span className="text-gray-600 font-medium">Direction:</span>
                                        <span className="text-gray-800">{record.systemRecord.direction || 'N/A'}</span>
                                        <span
                                            className={`${
                                                getFieldErrorStatus('description', record) ? 'text-red-600 font-medium flex items-center gap-1' : 'text-gray-600 font-medium'
                                            }`}
                                        >
                                          {getFieldErrorStatus('description', record) && <AlertTriangle className="w-2.5 h-2.5 mr-1" />}
                                            Description:
                                        </span>
                                        <span className="p-2 rounded-lg text-gray-800 col-span-1">{record.systemRecord.description || 'N/A'}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-gray-500">
                                    <Users className="w-10 h-10 mx-auto mb-1 opacity-50" />
                                    <p>No vendor record found</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-center">
                        <Button
                            variant="outline"
                            onClick={() => setShowRawData(!showRawData)}
                            className="border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 text-gray-700 rounded-lg px-4 py-2 transition-all"
                        >
                            <FileText className="w-3 h-3 mr-1" />
                            {showRawData ? 'Hide Raw Data' : 'Show Raw Data'}
                        </Button>
                    </div>
                    {showRawData && record.displayData && (
                        <div className="space-y-4 bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-200">
                            {renderDataTable(record.displayData.backoffice?.raw, 'Backoffice Raw Data', 'backoffice')}
                            {renderDataTable(record.displayData.vendor?.raw, 'Vendor Raw Data', 'vendor')}
                        </div>
                    )}
                    {record.aiReasoning && (
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                            <h4 className="font-semibold text-gray-800 flex items-center gap-1 mb-3">
                                <div className="p-1.5 bg-purple-500 rounded-md">
                                    <Sparkles className="w-3 h-3 text-white" />
                                </div>
                                AI Match Reasoning
                            </h4>
                            <div className="bg-white rounded-lg p-3 border border-purple-200">
                                {record.aiReasoning.split('; ').length > 1 ? (
                                    <ul className="space-y-1">
                                        {record.aiReasoning.split('; ').map((reason, index) => (
                                            <li key={index} className="flex items-start gap-2 text-xs">
                                                <Badge
                                                    className={`${reason.includes('mismatch') ? 'bg-red-100 text-red-800 border-red-200' : 'bg-purple-100 text-purple-800 border-purple-200'} border text-xs shrink-0`}
                                                >
                                                    {reason.includes('mismatch') ? 'Error' : 'Info'}
                                                </Badge>
                                                <span className="text-gray-700">{reason}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-gray-700">{record.aiReasoning}</p>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-200">
                        <h4 className="font-semibold text-gray-800 flex items-center gap-1 mb-3">
                            <div className="p-1.5 bg-indigo-500 rounded-md">
                                <MessageSquare className="w-3 h-3 text-white" />
                            </div>
                            Resolution Comments ({resolutionComments.length})
                        </h4>
                        <div className="space-y-2">
                            {resolutionComments.length > 0 && resolutionComments[0] !== null ? (
                                resolutionComments.map((comment, i) => (
                                    <div key={i} className="bg-white p-3 rounded-lg text-xs text-gray-700 border border-gray-200 shadow-sm">
                                        <div className="flex items-start gap-1">
                                            <MessageSquare className="w-3 h-3 text-indigo-500 mt-0.5 shrink-0" />
                                            {comment}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-4 text-gray-500">
                                    <MessageSquare className="w-6 h-6 mx-auto mb-1 opacity-50" />
                                    <p className="text-xs">No resolution comments yet</p>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter resolution comment (required for resolution)"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className="flex-1 bg-white border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-indigo-500 focus:ring-0 transition-colors"
                                />
                                <Button
                                    onClick={() => handleAddComment(record.id, newComment)}
                                    disabled={isResolving || !newComment.trim()}
                                    className="bg-blue-500 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg px-4 py-2 transition-all shadow-md disabled:opacity-50"
                                >
                                    {isResolving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <MessageSquare className="w-3 h-3 mr-1" />}
                                    Add Comment
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t-2 border-dashed border-gray-200">
                        <div className="flex items-center gap-2">
                            {getStatusBadge(record.status)}
                            <Badge className="bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 border border-indigo-200 rounded-full px-2 py-1">
                                <Target className="w-2.5 h-2.5 mr-1" />
                                {Math.round(record.confidence * 100)}% confidence
                            </Badge>
                            {record.resolved && (
                                <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200 rounded-full px-2 py-1">
                                    <CheckCircle className="w-2.5 h-2.5 mr-1" />
                                    Resolved
                                </Badge>
                            )}
                        </div>
                        {!record.resolved && (
                            <Button
                                onClick={() => handleResolveRecord(record.id, newComment)}
                                disabled={isResolving || !newComment.trim()}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg px-4 py-2 transition-all shadow-md disabled:opacity-50"
                            >
                                {isResolving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                                Mark as Resolved
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>,
        document.body
    );
});

// MetricCard component
const MetricCard: React.FC<{
    title: string;
    value: string;
    subtitle?: string;
    icon: React.ComponentType<{ className?: string }>;
    gradient: string;
}> = ({ title, value, subtitle, icon: Icon, gradient }) => (
    <div className={`${gradient} rounded-lg p-4 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105`}>
        <div className="flex items-center justify-between">
            <div>
                <p className="text-white/80 text-xs font-medium mb-1">{title}</p>
                <p className="text-xl font-bold">{value}</p>
                {subtitle && <p className="text-white/70 text-xs mt-1">{subtitle}</p>}
            </div>
            <div className="p-2 bg-white/20 rounded-md backdrop-blur-sm">
                <Icon className="w-4 h-4" />
            </div>
        </div>
    </div>
);

// Main ReconciledTransactions component
const ReconciledTransactions: React.FC = () => {
    const navigate = useNavigate();
    const { batchId } = useParams<{ batchId: string }>();
    const {
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
    } = useReconciliationLogic();

    // Sync selectedBatch with URL param on mount
    useEffect(() => {
        if (batchId && batches.length > 0) {
            const batch = batches.find(b => b.id === batchId);
            if (batch) {
                setSelectedBatch(batch);
                setSelectedView('details');
                setLastSelectedBatchId(batch.id);
            } else {
                // If batchId is invalid, redirect to list view
                navigate('/reconciled');
            }
        } else if (!batchId) {
            setSelectedView('list');
            setSelectedBatch(null);
        }
    }, [batchId, batches, setSelectedBatch, setSelectedView, setLastSelectedBatchId, navigate]);

    const BatchesList: React.FC = () => {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center p-3 rounded-lg bg-blue-500 shadow-md">
                        <GitMerge className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent">
                        Reconciliation Dashboard
                    </h1>

                </div>
                {isBatchesLoading && (
                    <Card className="border-none bg-white shadow-md rounded-lg overflow-hidden">
                        <CardContent className="p-6 flex flex-col items-center justify-center gap-3">
                            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                                <Loader2 className="h-6 w-6 animate-spin text-white" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-base font-semibold text-gray-900 mb-1">Loading Batches</h3>
                                <p className="text-gray-600 text-xs">Fetching your reconciliation data...</p>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {batchesError && (
                    <Card className="border-none bg-gradient-to-r from-red-50 to-rose-50 shadow-md rounded-lg overflow-hidden">
                        <CardContent className="p-6 flex flex-col items-center justify-center gap-3">
                            <div className="p-3 bg-red-500 rounded-lg">
                                <AlertTriangle className="h-6 w-6 text-white" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-base font-semibold text-red-900 mb-1">Error Loading Batches</h3>
                                <p className="text-red-700 text-xs">Failed to load reconciliation data. Please try again.</p>
                                <Button
                                    onClick={handleRefreshBatches}
                                    className="mt-3 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2"
                                >
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Retry
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {!isBatchesLoading && !batchesError && (
                    <Card className="border-none bg-white shadow-md rounded-lg overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-white p-6">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <div className="p-1.5 bg-indigo-500 rounded-md">
                                            <BarChart3 className="w-4 h-4 text-white" />
                                        </div>
                                        Batch Management
                                    </CardTitle>
                                    <CardDescription className="text-gray-600 text-xs mt-1">
                                        Comprehensive overview of all reconciliation processes and their current status
                                    </CardDescription>
                                </div>
                                <Button
                                    onClick={handleRefreshBatches}
                                    className="bg-blue-500 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg px-4 py-2 shadow-md transition-all"
                                    disabled={isBatchesLoading}
                                >
                                    {isBatchesLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                                    Refresh Data
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="flex flex-col lg:flex-row gap-3 mb-6">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                                    <Input
                                        placeholder="Search batch ID, file names, or descriptions..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 h-10 rounded-lg bg-gray-50 border-2 border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-0 transition-all"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="h-10 px-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-700 focus:bg-white focus:border-indigo-500 transition-all min-w-[120px]"
                                    >
                                        <option value="ALL">All Status</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="RUNNING">Running</option>
                                        <option value="DONE">Completed</option>
                                        <option value="FAILED">Failed</option>
                                    </select>

                                </div>
                            </div>
                            <div className="overflow-auto rounded-lg border-2 border-gray-200">
                                <table className="w-full">
                                    <thead>
                                    <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
                                        <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">
                                            <button className="flex items-center gap-1 hover:text-indigo-600 transition-colors" onClick={() => handleSort('id')}>
                                                Batch ID
                                                {sortField === 'id' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </button>
                                        </th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">
                                            <button className="flex items-center gap-1 hover:text-indigo-600 transition-colors" onClick={() => handleSort('date')}>
                                                <Calendar className="w-3 h-3" />
                                                Date & Time
                                                {sortField === 'date' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </button>
                                        </th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Status</th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">
                                            <button className="flex items-center gap-1 hover:text-indigo-600 transition-colors" onClick={() => handleSort('totalRecords')}>
                                                <BarChart3 className="w-3 h-3" />
                                                Records & Match Rate
                                                {sortField === 'totalRecords' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                                            </button>
                                        </th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Data Sources</th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filteredBatches.map((batch, index) => (
                                        <tr
                                            key={batch.id}
                                            id={`batch-row-${batch.id}`}
                                            className={`hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 border-b border-gray-100 group ${
                                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                                            } ${lastSelectedBatchId === batch.id ? 'bg-indigo-50/50' : ''}`}
                                        >
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-blue-500 rounded-md">
                                                        <FileText className="w-3 h-3 text-white" />
                                                    </div>
                                                    <span className="font-mono font-bold text-indigo-700 text-base">{batch.id}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div>
                                                    <div className="font-semibold text-gray-900 text-xs">{formatDate(batch.date)}</div>
                                                    {batch.processingTime && (
                                                        <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                                                            <Clock className="w-2.5 h-2.5" />
                                                            Processed in {batch.processingTime}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">{getStatusBadge(batch.status)}</td>
                                            <td className="px-4 py-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-semibold text-gray-900 text-xs">{batch.totalRecords.toLocaleString()} total records</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1 p-1.5 bg-teal-50 rounded-md border border-teal-200">
                                                        <Building2 className="w-3 h-3 text-teal-600" />
                                                        <span className="text-xs font-medium text-teal-800 truncate">{batch.bankFileName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 p-1.5 bg-blue-50 rounded-md border border-blue-200">
                                                        <Users className="w-3 h-3 text-blue-600" />
                                                        <span className="text-xs font-medium text-blue-800 truncate">{batch.vendorFileName}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                    <Button
                                                        onClick={() => {
                                                            setSelectedBatch(batch);
                                                            setSelectedView('details');
                                                            setLastSelectedBatchId(batch.id);
                                                            navigate(`/reconciled/results/${batch.id}`);
                                                        }}
                                                        className="bg-blue-500 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg px-3 py-2 shadow-md transition-all"
                                                    >
                                                        <Eye className="w-3 h-3 mr-1" />
                                                        View Details
                                                    </Button>
                                                    {batch.status === 'FAILED' && (
                                                        <Button
                                                            onClick={() => handleRetryBatch(batch.id)}
                                                            disabled={isRetrying}
                                                            className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg px-3 py-2 shadow-md transition-all disabled:opacity-50"
                                                        >
                                                            {isRetrying ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Repeat className="w-3 h-3 mr-1" />}
                                                            Retry
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        className="border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg px-2 py-2 transition-all"
                                                    >
                                                        <MoreVertical className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                                {filteredBatches.length === 0 && (
                                    <div className="text-center py-8">
                                        <div className="p-3 bg-gray-100 rounded-lg w-fit mx-auto mb-3">
                                            <Search className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <h3 className="text-base font-semibold text-gray-900 mb-1">No Batches Found</h3>
                                        <p className="text-gray-600 text-xs">Try adjusting your search criteria or filters</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    };

    const BatchDetails: React.FC = () => {
        const [currentPage, setCurrentPage] = useState(1);
        const recordsPerPage = 10;

        if (!selectedBatch || !selectedBatchWithRecords) return null;

        const records = selectedBatchWithRecords.records;

        // Reset currentPage to 1 when filteredRecords change
        useEffect(() => {
            setCurrentPage(1);
        }, [filteredRecords]);

        // Calculate pagination
        const totalRecords = filteredRecords.length;
        const totalPages = Math.ceil(totalRecords / recordsPerPage);
        const indexOfLastRecord = currentPage * recordsPerPage;
        const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
        const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);

        // Handle page change
        const handlePageChange = (page: number) => {
            if (page >= 1 && page <= totalPages) {
                setCurrentPage(page);
                // Scroll to top of table
                const table = document.querySelector('.overflow-hidden.rounded-lg.border-2.border-gray-200');
                if (table) {
                    table.scrollIntoView({ behavior: 'smooth' });
                }
            }
        };

        const debitCreditSummary = useMemo(() => {
            const debits = records.filter(r => r.direction.toLowerCase() === 'debit');
            const credits = records.filter(r => r.direction.toLowerCase() === 'credit');
            const totalAmount = records.reduce((sum, r) => sum + (r.bankRecord?.amount || 0), 0);
            const debitTotal = debits.reduce((sum, r) => sum + (r.bankRecord?.amount || 0), 0);
            const creditTotal = credits.reduce((sum, r) => sum + (r.bankRecord?.amount || 0), 0);
            return {
                types: [
                    {
                        type: 'Debit',
                        count: debits.length,
                        totalAmount: formatCurrency(debitTotal),
                        percent: totalAmount > 0 ? (debitTotal / totalAmount * 100).toFixed(2) + '%' : '0%',
                        avgAmount: formatCurrency(debits.length > 0 ? debitTotal / debits.length : 0)
                    },
                    {
                        type: 'Credit',
                        count: credits.length,
                        totalAmount: formatCurrency(creditTotal),
                        percent: totalAmount > 0 ? (creditTotal / totalAmount * 100).toFixed(2) + '%' : '0%',
                        avgAmount: formatCurrency(credits.length > 0 ? creditTotal / credits.length : 0)
                    },
                ],
                netCreditPosition: formatCurrency(creditTotal - debitTotal),
            };
        }, [records]);

        const reconciliationStats = useMemo(() => {
            const statuses = ['MATCHED', 'PARTIAL', 'UNMATCHED', 'DUPLICATE', 'MISSING'];
            const stats = statuses.map(status => {
                const filtered = records.filter(r => r.status === status);
                const count = filtered.length;
                const percent = records.length > 0 ? (count / records.length * 100).toFixed(2) + '%' : '0%';
                const totalAmount = formatCurrency(filtered.reduce((sum, r) => sum + (r.bankRecord?.amount || 0), 0));
                const avgConfidence = count > 0 ? (filtered.reduce((sum, r) => sum + r.confidence, 0) / count).toFixed(4) : '0.0000';
                const avgAmount = formatCurrency(count > 0 ? filtered.reduce((sum, r) => sum + (r.bankRecord?.amount || 0), 0) / count : 0);
                return { status, count, percent, totalAmount, avgConfidence, avgAmount };
            });
            const totalStat = {
                status: 'TOTAL',
                count: records.length,
                percent: '100%',
                totalAmount: formatCurrency(records.reduce((sum, r) => sum + (r.bankRecord?.amount || 0), 0)),
                avgConfidence: '',
                avgAmount: formatCurrency(records.length > 0 ? records.reduce((sum, r) => sum + (r.bankRecord?.amount || 0), 0) / records.length : 0),
            };
            return [...stats.filter(s => s.count > 0 || statuses.includes(s.status)), totalStat];
        }, [records]);

        const discrepancyAnalysis = useMemo(() => {
            const issueMap = new Map<string, { count: number, affectedAmount: number, examples: string[] }>();
            records.forEach(record => {
                if (record.aiReasoning) {
                    const issues = record.aiReasoning.split('; ').map(i => i.trim().split(':')[0].trim());
                    issues.forEach(issue => {
                        const current = issueMap.get(issue) || { count: 0, affectedAmount: 0, examples: [] };
                        current.count += 1;
                        current.affectedAmount += record.bankRecord?.amount || 0;
                        if (current.examples.length < 1) {
                            current.examples.push(`${record.transactionId} / ${record.bankRecord?.id || 'N/A'}, ${record.aiReasoning}`);
                        }
                        issueMap.set(issue, current);
                    });
                }
            });
            return Array.from(issueMap.entries()).map(([issueType, data]) => ({
                issueType,
                count: data.count,
                affectedAmount: formatCurrency(data.affectedAmount),
                example: data.examples[0],
                severity: issueType.toLowerCase().includes('description') ? 'Low' : 'Medium',
            }));
        }, [records]);

        return (
            <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSelectedView('list');
                                setSelectedBatch(null);
                                setSelectedRecord(null);
                                setIsModalOpen(false);
                                navigate('/reconciled');
                            }}
                            className="border-2 border-gray-200 hover:bg-gray-100 hover:border-gray-300 text-gray-700 rounded-lg px-3 py-2"
                        >
                            ← Back to Batches
                        </Button>
                        <div>
                            <p className="text-xs text-gray-600">Processed on {formatDate(selectedBatch.date)} | Status: {getStatusBadge(selectedBatch.status)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            className="bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-lg px-3 py-2"
                            onClick={handleExportIssues}
                        >
                            <Download className="h-3 w-3 mr-1" />
                            Export Issues
                        </Button>
                        <ReportDownloader batchId={selectedBatch.id} />
                    </div>
                </div>
                {(isBatchLoading || isRecordsLoading) && (
                    <Card className="border-none bg-white shadow-md rounded-lg overflow-hidden">
                        <CardContent className="p-6 flex flex-col items-center justify-center gap-3">
                            <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                                <Loader2 className="h-6 w-6 animate-spin text-white" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-base font-semibold text-gray-900 mb-1">Loading Batch Details</h3>
                                <p className="text-gray-600 text-xs">Fetching your reconciliation data...</p>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {batchError && (
                    <Card className="border-none bg-gradient-to-r from-red-50 to-rose-50 shadow-md rounded-lg overflow-hidden">
                        <CardContent className="p-6 flex flex-col items-center justify-center gap-3">
                            <div className="p-3 bg-red-500 rounded-lg">
                                <AlertTriangle className="h-6 w-6 text-white" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-base font-semibold text-red-900 mb-1">Error Loading Batch</h3>
                                <p className="text-red-700 text-xs">Failed to load batch details. Please try again.</p>
                                <Button
                                    onClick={handleRefreshBatches}
                                    className="mt-3 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2"
                                >
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Retry
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
                {!isBatchLoading && !isRecordsLoading && !batchError && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                {
                                    title: 'Total Records',
                                    value: records.length.toLocaleString(),
                                    subtitle: 'All transactions in batch',
                                    icon: FileText,
                                    gradient: 'bg-gradient-to-br from-indigo-500 to-purple-600'
                                },
                                {
                                    title: 'Match Rate',
                                    value: `${selectedBatch.matchRate}%`,
                                    subtitle: 'Percentage of matched records',
                                    icon: Target,
                                    gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600'
                                },
                                {
                                    title: 'Total Amount',
                                    value: formatCurrency(records.reduce((sum, r) => sum + (r.bankRecord?.amount || 0), 0)),
                                    subtitle: 'Sum of all transactions',
                                    icon: TrendingUp,
                                    gradient: 'bg-gradient-to-br from-amber-500 to-orange-600'
                                },
                                {
                                    title: 'Processing Time',
                                    value: selectedBatch.processingTime || 'N/A',
                                    subtitle: 'Time taken for reconciliation',
                                    icon: Clock,
                                    gradient: 'bg-gradient-to-br from-blue-500 to-cyan-600'
                                }
                            ].map((metric, index) => (
                                <MetricCard
                                    key={index}
                                    title={metric.title}
                                    value={metric.value}
                                    subtitle={metric.subtitle}
                                    icon={metric.icon}
                                    gradient={metric.gradient}
                                />
                            ))}
                        </div>
                        <Card className="border-none bg-white shadow-md rounded-lg overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-gray-50 to-white p-6">
                                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-500 rounded-md">
                                        <BarChart3 className="w-4 h-4 text-white" />
                                    </div>
                                    Transaction Records
                                </CardTitle>
                                <CardDescription className="text-gray-600 text-xs mt-1">
                                    Detailed view of all transactions in this batch
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="flex flex-col lg:flex-row gap-3 mb-6">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                                        <Input
                                            placeholder="Search transaction ID, description..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-10 h-10 rounded-lg bg-gray-50 border-2 border-gray-200 focus:bg-white focus:border-indigo-500 focus:ring-0 transition-all"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <select
                                            value={recordStatusFilter}
                                            onChange={(e) => setRecordStatusFilter(e.target.value)}
                                            className="h-10 px-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-gray-700 focus:bg-white focus:border-indigo-500 transition-all min-w-[120px]"
                                        >
                                            <option value="ALL">All Status</option>
                                            <option value="MATCHED">Matched</option>
                                            <option value="PARTIAL">Partial</option>
                                            <option value="UNMATCHED">Unmatched</option>
                                            <option value="DUPLICATE">Duplicate</option>
                                            <option value="MISSING">Missing</option>
                                        </select>

                                    </div>
                                </div>
                                <div className="overflow-hidden rounded-lg border-2 border-gray-200">
                                    <table className="w-full">
                                        <thead>
                                        <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Transaction ID</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Description</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Amount</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Date</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Status</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Actions</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {currentRecords.map((record, index) => (
                                            <tr
                                                key={record.id}
                                                className={`hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 border-b border-gray-100 ${
                                                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                                                }`}
                                                onClick={() => debouncedHandleRowClick(record)}
                                            >
                                                <td className="px-4 py-4 font-mono text-indigo-700 text-xs">{record.transactionId}</td>
                                                <td className="px-4 py-4 text-gray-800 text-xs">{record.description}</td>
                                                <td className="px-4 py-4 font-semibold text-teal-700 text-xs">{formatCurrency(record.amount)}</td>
                                                <td className="px-4 py-4 text-gray-800 text-xs">{formatDate(record.date)}</td>
                                                <td className="px-4 py-4">{getStatusBadge(record.status)}</td>
                                                <td className="px-4 py-4">
                                                    <Button
                                                        variant="outline"
                                                        className="border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-lg px-3 py-2"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            debouncedHandleRowClick(record);
                                                        }}
                                                        aria-label={`View details for transaction ${record.transactionId}`}
                                                    >
                                                        <Eye className="w-3 h-3 mr-1" />
                                                        View
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                    {currentRecords.length === 0 && (
                                        <div className="text-center py-8">
                                            <div className="p-3 bg-gray-100 rounded-lg w-fit mx-auto mb-3">
                                                <Search className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <h3 className="text-base font-semibold text-gray-900 mb-1">No Records Found</h3>
                                            <p className="text-gray-600 text-xs">Try adjusting your search criteria or filters</p>
                                        </div>
                                    )}
                                </div>
                                {totalRecords > recordsPerPage && (
                                    <div className="flex justify-between items-center mt-4">
                                        <div className="text-xs text-gray-600">
                                            Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, totalRecords)} of {totalRecords} records
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => handlePageChange(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className="border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-lg px-3 py-2 disabled:opacity-50"
                                                aria-label="Go to previous page"
                                            >
                                                Previous
                                            </Button>
                                            <div className="flex gap-1">
                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                    <Button
                                                        key={page}
                                                        variant={currentPage === page ? 'default' : 'outline'}
                                                        onClick={() => handlePageChange(page)}
                                                        className={`border-2 ${currentPage === page ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'border-gray-200 hover:border-indigo-400 hover:bg-indigo-50'} rounded-lg px-3 py-2`}
                                                        aria-label={`Go to page ${page}`}
                                                        aria-current={currentPage === page ? 'page' : undefined}
                                                    >
                                                        {page}
                                                    </Button>
                                                ))}
                                            </div>
                                            <Button
                                                variant="outline"
                                                onClick={() => handlePageChange(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className="border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-lg px-3 py-2 disabled:opacity-50"
                                                aria-label="Go to next page"
                                            >
                                                Next
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="border-none bg-white shadow-md rounded-lg overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-gray-50 to-white p-6">
                                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-500 rounded-md">
                                        <BarChart3 className="w-4 h-4 text-white" />
                                    </div>
                                    Reconciliation Statistics
                                </CardTitle>
                                <CardDescription className="text-gray-600 text-xs mt-1">
                                    Summary of transaction statuses and amounts
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="overflow-hidden rounded-lg border-2 border-gray-200">
                                    <table className="w-full">
                                        <thead>
                                        <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Status</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Count</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Percentage</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Total Amount</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Avg Confidence</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Avg Amount</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {reconciliationStats.map((stat, index) => (
                                            <tr
                                                key={stat.status}
                                                className={`border-b border-gray-100 last:border-b-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                                            >
                                                <td className="px-4 py-4 text-gray-800 text-xs">{stat.status}</td>
                                                <td className="px-4 py-4 text-gray-800 text-xs">{stat.count}</td>
                                                <td className="px-4 py-4 text-gray-800 text-xs">{stat.percent}</td>
                                                <td className="px-4 py-4 text-gray-800 text-xs">{stat.totalAmount}</td>
                                                <td className="px-4 py-4 text-gray-800 text-xs">{stat.avgConfidence}</td>
                                                <td className="px-4 py-4 text-gray-800 text-xs">{stat.avgAmount}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-none bg-white shadow-md rounded-lg overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-gray-50 to-white p-6">
                                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-500 rounded-md">
                                        <AlertTriangle className="w-4 h-4 text-white" />
                                    </div>
                                    Discrepancy Analysis
                                </CardTitle>
                                <CardDescription className="text-gray-600 text-xs mt-1">
                                    Breakdown of issues identified during reconciliation
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="overflow-hidden rounded-lg border-2 border-gray-200">
                                    <table className="w-full">
                                        <thead>
                                        <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Issue Type</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Count</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Affected Amount</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Severity</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Example</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {discrepancyAnalysis.map((issue, index) => (
                                            <tr
                                                key={issue.issueType}
                                                className={`border-b border-gray-100 last:border-b-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                                            >
                                                <td className="px-4 py-4 text-gray-800 text-xs">{issue.issueType}</td>
                                                <td className="px-4 py-4 text-gray-800 text-xs">{issue.count}</td>
                                                <td className="px-4 py-4 text-gray-800 text-xs">{issue.affectedAmount}</td>
                                                <td className="px-4 py-4 text-gray-800 text-xs">
                                                    <Badge
                                                        className={`${issue.severity === 'Low' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'} border rounded-full px-2 py-1`}
                                                    >
                                                        {issue.severity}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-4 text-gray-800 text-xs truncate max-w-xs">{issue.example}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                    {discrepancyAnalysis.length === 0 && (
                                        <div className="text-center py-8">
                                            <div className="p-3 bg-gray-100 rounded-lg w-fit mx-auto mb-3">
                                                <AlertTriangle className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <h3 className="text-base font-semibold text-gray-900 mb-1">No Discrepancies Found</h3>
                                            <p className="text-gray-600 text-xs">All transactions reconciled successfully</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-none bg-white shadow-md rounded-lg overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-gray-50 to-white p-6">
                                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-500 rounded-md">
                                        <TrendingUp className="w-4 h-4 text-white" />
                                    </div>
                                    Debit/Credit Summary
                                </CardTitle>
                                <CardDescription className="text-gray-600 text-xs mt-1">
                                    Overview of debit and credit transactions
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="overflow-hidden rounded-lg border-2 border-gray-200">
                                    <table className="w-full">
                                        <thead>
                                        <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-b-2 border-gray-200">
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Type</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Count</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Total Amount</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Percentage</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-900 text-xs">Avg Amount</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {debitCreditSummary.types.map((type, index) => (
                                            <tr
                                                key={type.type}
                                                className={`border-b border-gray-100 last:border-b-0 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                                            >
                                                <td className="px-4 py-4 text-gray-800 text-xs">{type.type}</td>
                                                <td className="px-4 py-4 text-gray-800 text-xs">{type.count}</td>
                                                <td className="px-4 py-4 text-gray-800 text-xs">{type.totalAmount}</td>
                                                <td className="px-4 py-4 text-gray-800 text-xs">{type.percent}</td>
                                                <td className="px-4 py-4 text-gray-800 text-xs">{type.avgAmount}</td>
                                            </tr>
                                        ))}
                                        </tbody>
                                        <tfoot>
                                        <tr className="bg-gray-50 border-t-2 border-gray-200">
                                            <td className="px-4 py-4 font-bold text-gray-900 text-xs">Net Credit Position</td>
                                            <td className="px-4 py-4"></td>
                                            <td className="px-4 py-4 font-bold text-gray-900 text-xs">{debitCreditSummary.netCreditPosition}</td>
                                            <td className="px-4 py-4"></td>
                                            <td className="px-4 py-4"></td>
                                        </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
            <div className="max-w-6xl mx-auto p-4">
                <ErrorBoundary>
                    {selectedView === 'list' ? <BatchesList /> : <BatchDetails />}
                </ErrorBoundary>
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
                    animation: fade-in 0.6s ease-out;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(to bottom, #6366f1, #8b5cf6);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(to bottom, #4f46e5, #7c3aed);
                }
            `}</style>
        </div>
    );
};

export default ReconciledTransactions;