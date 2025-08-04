import React, { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, FileText, Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import Papa from 'papaparse';
import { useDropzone } from 'react-dropzone';
import { useCreateTemplateMutation, useGetTemplateQuery, useUpdateTemplateMutation } from './templateApi';

interface TemplateField {
    fileHeader: string; // Matches TemplateField.java
    coreField: string;
    type: 'string' | 'number' | 'date'; // Retained for frontend validation
}

interface BackendTemplateField {
    fileHeader: string; // Matches TemplateField.java
    coreField: string;
}

interface Template {
    id: string;
    name: string;
    type: 'BACKOFFICE' | 'VENDOR'; // Matches TemplateType.java
    fields: TemplateField[];
}

interface BackendTemplate {
    id: string;
    name: string;
    type: 'BACKOFFICE' | 'VENDOR';
    fields: BackendTemplateField[];
}

const TemplateCreator: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [createTemplate, { isLoading: isCreating }] = useCreateTemplateMutation();
    const [updateTemplate, { isLoading: isUpdating }] = useUpdateTemplateMutation();
    const { data: existingTemplate, isLoading: isLoadingTemplate } = useGetTemplateQuery(id || '', {
        skip: !id,
    });

    const [templateName, setTemplateName] = useState('');
    const [templateType, setTemplateType] = useState<'BACKOFFICE' | 'VENDOR'>('VENDOR');
    const [fields, setFields] = useState<TemplateField[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Load existing template if editing
    React.useEffect(() => {
        if (existingTemplate) {
            setTemplateName(existingTemplate.name);
            setTemplateType(existingTemplate.type);
            // Add default type for frontend compatibility
            setFields(existingTemplate.fields.map(field => ({
                fileHeader: field.fileHeader,
                coreField: field.coreField,
                type: field.type || 'string', // Default to string if type is not provided
            })));
        }
    }, [existingTemplate]);

    // Standard fields for reconciliation (aligned with TemplateField.java)
    const standardFields = [
        'transaction_id',
        'amount',
        'credit_amount',
        'debit_amount',
        'date',
        'description',
        'debit_direction',
        'credit_direction',
        'debit_credit_direction',
        'status',
    ];

    // Handle CSV upload for field extraction
    const onDropCsv = useCallback(
        (acceptedFiles: File[]) => {
            const file = acceptedFiles[0];
            if (file) {
                setIsProcessing(true);
                Papa.parse(file, {
                    worker: true,
                    header: true,
                    preview: 1,
                    skipEmptyLines: true,
                    complete: (result) => {
                        const headers = result.meta.fields || [];
                        const newFields = headers.map((header) => ({
                            fileHeader: header,
                            coreField: standardFields.includes(header.toLowerCase()) ? header.toLowerCase() : '',
                            type: standardFields.includes(header.toLowerCase()) && ['amount', 'credit_amount', 'debit_amount'].includes(header.toLowerCase()) ? 'number' :
                                standardFields.includes(header.toLowerCase()) && header.toLowerCase() === 'date' ? 'date' : 'string',
                        }));
                        setFields(newFields);
                        setIsProcessing(false);
                    },
                    error: () => {
                        setError('Failed to parse CSV file.');
                        setIsProcessing(false);
                    },
                });
            }
        },
        [],
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: { 'text/csv': ['.csv'] },
        maxFiles: 1,
        onDrop: onDropCsv,
    });

    // Handle JSON upload for template
    const handleJsonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsProcessing(true);
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target?.result as string);
                    if (json.name && json.type) {
                        setTemplateName(json.name);
                        setTemplateType(json.type.toUpperCase());
                        const jsonFields = json.fields || json.mappings || [];
                        setFields(jsonFields.map((f: any) => ({
                            fileHeader: f.fileHeader || f.sourceField || '',
                            coreField: f.coreField || f.targetField || '',
                            type: f.type || (standardFields.includes(f.coreField?.toLowerCase()) && ['amount', 'credit_amount', 'debit_amount'].includes(f.coreField?.toLowerCase()) ? 'number' :
                                f.coreField?.toLowerCase() === 'date' ? 'date' : 'string'),
                        })));
                    } else {
                        setError('Invalid JSON template format.');
                    }
                } catch {
                    setError('Failed to parse JSON file.');
                }
                setIsProcessing(false);
            };
            reader.readAsText(file);
        }
    };

    // Add a new manual field
    const addManualField = () => {
        const newField = { fileHeader: '', coreField: '', type: 'string' as const };
        setFields([...fields, newField]);
    };

    // Update a field
    const updateField = (index: number, field: Partial<TemplateField>) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...field };
        setFields(newFields);
    };

    // Remove a field
    const removeField = (index: number) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    // Save template
    const saveTemplate = async () => {
        if (!templateName || !templateType || fields.length === 0) {
            setError('Please provide a name, type, and at least one field mapping.');
            return;
        }
        if (fields.some((f) => !f.fileHeader || !f.coreField)) {
            setError('All fields must have a source and target field.');
            return;
        }

        // Strip `type` field for backend compatibility
        const template: Omit<BackendTemplate, 'id'> = {
            name: templateName,
            type: templateType,
            fields: fields.map(({ fileHeader, coreField }) => ({ fileHeader, coreField })),
        };

        try {
            if (id) {
                await updateTemplate({ id, ...template }).unwrap();
            } else {
                await createTemplate(template).unwrap();
            }
            navigate('/reconciliation');
        } catch (err: any) {
            setError(err.data?.message || 'Failed to save template. Please try again.');
        }
    };

    if (isLoadingTemplate) {
        return <div>Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 p-4 transition-all duration-500">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/reconciliation')}
                                className="hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Back
                            </Button>
                        </div>
                    </div>
                </div>

                <Card className="border-0 shadow-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl">
                    <CardHeader className="pb-6">
                        <div className="flex items-center justify-center gap-3">
                            <div>
                                <CardTitle className="text-xl">Template Configuration</CardTitle>
                                <CardDescription>Set up your template details and field mappings</CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-8">
                        {/* Template Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Template Name
                                </label>
                                <Input
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder="e.g., Bank Statement Template"
                                    className="h-11 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Template Type
                                </label>
                                <Select value={templateType} onValueChange={(value: 'BACKOFFICE' | 'VENDOR') => setTemplateType(value)}>
                                    <SelectTrigger className="h-11 border-slate-200 dark:border-slate-700 focus:border-indigo-500">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="VENDOR">Vendor Data</SelectItem>
                                        <SelectItem value="BACKOFFICE">Bank/Backoffice Data</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* File Upload Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Import Fields</h3>
                                <div className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-300 to-transparent dark:from-slate-700 dark:via-slate-600"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* CSV Upload */}
                                <Card className={`transition-all duration-300 cursor-pointer hover:shadow-lg ${isDragActive ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 scale-105' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}>
                                    <CardContent className="p-4">
                                        <div {...getRootProps()} className="text-center space-y-3">
                                            <input {...getInputProps()} />
                                            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-lg w-fit mx-auto">
                                                <FileSpreadsheet className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">Upload CSV</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Auto-detect fields</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* JSON Upload */}
                                <Card className="transition-all duration-300 cursor-pointer hover:shadow-lg border-slate-200 dark:border-slate-700 hover:border-indigo-300">
                                    <CardContent className="p-4">
                                        <input
                                            type="file"
                                            accept=".json"
                                            onChange={handleJsonUpload}
                                            className="hidden"
                                            id="json-upload"
                                        />
                                        <label htmlFor="json-upload" className="cursor-pointer text-center space-y-3 block">
                                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-lg w-fit mx-auto">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">Upload JSON</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Import template</p>
                                            </div>
                                        </label>
                                    </CardContent>
                                </Card>

                                {/* Manual Entry */}
                                <Card className="transition-all duration-300 cursor-pointer hover:shadow-lg border-slate-200 dark:border-slate-700 hover:border-indigo-300">
                                    <CardContent className="p-4">
                                        <div onClick={addManualField} className="text-center space-y-3">
                                            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-lg w-fit mx-auto">
                                                <Plus className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">Manual Entry</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Add fields manually</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Field Mappings */}
                        {fields.length > 0 && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Field Mappings</h3>
                                    <div className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-300 to-transparent dark:from-slate-700 dark:via-slate-600"></div>
                                    <span className="text-sm text-slate-500 dark:text-slate-400">{fields.length} fields</span>
                                </div>

                                <div className="space-y-3">
                                    {fields.map((field, index) => (
                                        <div
                                            key={index}
                                            className={`p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all duration-300 hover:shadow-md ${
                                                draggedIndex === index ? 'scale-105 shadow-lg' : ''
                                            }`}
                                            style={{
                                                animation: `fadeInUp 0.3s ease-out ${index * 0.1}s both`
                                            }}
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Source Field</label>
                                                    <Input
                                                        placeholder="e.g., TransactionID"
                                                        value={field.fileHeader}
                                                        onChange={(e) => updateField(index, { fileHeader: e.target.value })}
                                                        className="h-10 border-slate-200 dark:border-slate-600"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Target Field</label>
                                                    <Select
                                                        value={field.coreField}
                                                        onValueChange={(value) => updateField(index, { coreField: value })}
                                                    >
                                                        <SelectTrigger className="h-10 border-slate-200 dark:border-slate-600">
                                                            <SelectValue placeholder="Select target" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {standardFields.map((f) => (
                                                                <SelectItem key={f} value={f}>
                                                                    <span className="capitalize">{f.replace('_', ' ')}</span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Data Type</label>
                                                    <Select
                                                        value={field.type}
                                                        onValueChange={(value: 'string' | 'number' | 'date') => updateField(index, { type: value })}
                                                    >
                                                        <SelectTrigger className="h-10 border-slate-200 dark:border-slate-600">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="string">Text</SelectItem>
                                                            <SelectItem value="number">Number</SelectItem>
                                                            <SelectItem value="date">Date</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeField(index)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-center">
                                    <Button
                                        variant="outline"
                                        onClick={addManualField}
                                        className="border-dashed border-2 border-slate-300 dark:border-slate-600 hover:border-indigo-400 transition-colors"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Another Field
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Error Display */}
                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <p className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-200 dark:border-slate-700">
                            <Button
                                variant="outline"
                                onClick={() => navigate('/reconciliation')}
                                className="sm:w-auto w-full"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={saveTemplate}
                                disabled={isProcessing || isCreating || isUpdating}
                                className="sm:w-auto w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {id ? 'Update Template' : 'Save Template'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <style jsx>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
};

export default TemplateCreator;