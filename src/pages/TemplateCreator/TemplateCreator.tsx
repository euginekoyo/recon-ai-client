
import React, { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, FileText, Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import Papa from 'papaparse';
import { useDropzone } from 'react-dropzone';
import { useCreateTemplateMutation, useGetTemplateQuery, useUpdateTemplateMutation } from '../../store/redux/templateApi.ts';

interface TemplateField {
    fileHeader: string;
    coreField: string;
    type: 'string' | 'number' | 'date';
}

interface BackendTemplateField {
    fileHeader: string;
    coreField: string;
}

interface Template {
    id: string;
    name: string;
    type: 'BACKOFFICE' | 'VENDOR';
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
    const { data: existingTemplate, isLoading: isLoadingTemplate } = useGetTemplateQuery(id || '', { skip: !id });

    const [templateName, setTemplateName] = useState('');
    const [templateType, setTemplateType] = useState<'BACKOFFICE' | 'VENDOR'>('VENDOR');
    const [fields, setFields] = useState<TemplateField[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    React.useEffect(() => {
        if (existingTemplate) {
            setTemplateName(existingTemplate.name);
            setTemplateType(existingTemplate.type);
            setFields(existingTemplate.fields.map(field => ({
                fileHeader: field.fileHeader,
                coreField: field.coreField,
                type: field.type || 'string',
            })));
        }
    }, [existingTemplate]);

    const standardFields = [
        'transaction_id', 'amount', 'credit_amount', 'debit_amount', 'date',
        'description', 'debit_direction', 'credit_direction', 'debit_credit_direction', 'status',
    ];

    const onDropCsv = useCallback((acceptedFiles: File[]) => {
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
                    setFields(headers.map(header => ({
                        fileHeader: header,
                        coreField: standardFields.includes(header.toLowerCase()) ? header.toLowerCase() : '',
                        type: ['amount', 'credit_amount', 'debit_amount'].includes(header.toLowerCase()) ? 'number' :
                            header.toLowerCase() === 'date' ? 'date' : 'string',
                    })));
                    setIsProcessing(false);
                },
                error: () => {
                    setError('Failed to parse CSV file.');
                    setIsProcessing(false);
                },
            });
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: { 'text/csv': ['.csv'] },
        maxFiles: 1,
        onDrop: onDropCsv,
    });

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
                        setFields((json.fields || json.mappings || []).map((f: any) => ({
                            fileHeader: f.fileHeader || f.sourceField || '',
                            coreField: f.coreField || f.targetField || '',
                            type: f.type || (['amount', 'credit_amount', 'debit_amount'].includes(f.coreField?.toLowerCase()) ? 'number' :
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

    const addManualField = () => setFields([...fields, { fileHeader: '', coreField: '', type: 'string' }]);
    const updateField = (index: number, field: Partial<TemplateField>) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...field };
        setFields(newFields);
    };
    const removeField = (index: number) => setFields(fields.filter((_, i) => i !== index));

    const saveTemplate = async () => {
        if (!templateName || !templateType || fields.length === 0) {
            setError('Name, type, and at least one field mapping are required.');
            return;
        }
        if (fields.some(f => !f.fileHeader || !f.coreField)) {
            setError('All fields must have a source and target field.');
            return;
        }

        const template: Omit<BackendTemplate, 'id'> = {
            name: templateName,
            type: templateType,
            fields: fields.map(({ fileHeader, coreField }) => ({ fileHeader, coreField })),
        };

        try {
            id ? await updateTemplate({ id, ...template }).unwrap() : await createTemplate(template).unwrap();
            navigate('/reconciliation');
        } catch (err: any) {
            setError(err.data?.message || 'Failed to save template.');
        }
    };

    if (isLoadingTemplate) return <div className="text-center p-4">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto space-y-4">
                <div className="flex justify-between items-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/reconciliation')}
                        className="text-gray-600 hover:text-indigo-600"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                    <h1 className="text-lg font-semibold text-gray-800">{id ? 'Edit Template' : 'Create Template'}</h1>
                </div>

                <Card className="border-none shadow-md bg-white">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Template Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-600">Name</label>
                                <Input
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder="e.g., Bank Statement Template"
                                    className="h-9 mt-1"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600">Type</label>
                                <Select value={templateType} onValueChange={(value: 'BACKOFFICE' | 'VENDOR') => setTemplateType(value)}>
                                    <SelectTrigger className="h-9 mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="VENDOR">Vendor Data</SelectItem>
                                        <SelectItem value="BACKOFFICE">Bank/Backoffice Data</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-gray-800">Import Fields</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Card className={`p-3 border ${isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'}`}>
                                    <div {...getRootProps()} className="text-center">
                                        <input {...getInputProps()} />
                                        <FileSpreadsheet className="h-5 w-5 mx-auto text-indigo-600" />
                                        <p className="text-xs font-medium text-gray-700 mt-1">Upload CSV</p>
                                    </div>
                                </Card>
                                <Card className="p-3 border border-gray-200">
                                    <input type="file" accept=".json" onChange={handleJsonUpload} className="hidden" id="json-upload" />
                                    <label htmlFor="json-upload" className="cursor-pointer text-center block">
                                        <FileText className="h-5 w-5 mx-auto text-indigo-600" />
                                        <p className="text-xs font-medium text-gray-700 mt-1">Upload JSON</p>
                                    </label>
                                </Card>
                                <Card className="p-3 border border-gray-200" onClick={addManualField}>
                                    <div className="text-center">
                                        <Plus className="h-5 w-5 mx-auto text-indigo-600" />
                                        <p className="text-xs font-medium text-gray-700 mt-1">Manual Entry</p>
                                    </div>
                                </Card>
                            </div>
                        </div>

                        {fields.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-gray-800">Field Mappings ({fields.length})</h3>
                                {fields.map((field, index) => (
                                    <div key={index} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-md">
                                        <div>
                                            <label className="text-xs text-gray-600">Source</label>
                                            <Input
                                                value={field.fileHeader}
                                                onChange={(e) => updateField(index, { fileHeader: e.target.value })}
                                                placeholder="e.g., TransactionID"
                                                className="h-8 mt-1"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-600">Target</label>
                                            <Select value={field.coreField} onValueChange={(value) => updateField(index, { coreField: value })}>
                                                <SelectTrigger className="h-8 mt-1">
                                                    <SelectValue placeholder="Select target" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {standardFields.map(f => (
                                                        <SelectItem key={f} value={f}>
                                                            {f.replace('_', ' ')}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-600">Type</label>
                                            <Select value={field.type} onValueChange={(value: 'string' | 'number' | 'date') => updateField(index, { type: value })}>
                                                <SelectTrigger className="h-8 mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="string">Text</SelectItem>
                                                    <SelectItem value="number">Number</SelectItem>
                                                    <SelectItem value="date">Date</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeField(index)}
                                            className="mt-6 text-red-500 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    variant="outline"
                                    onClick={addManualField}
                                    className="w-full h-8 border-dashed border-gray-300"
                                >
                                    <Plus className="h-4 w-4 mr-1" /> Add Field
                                </Button>
                            </div>
                        )}

                        {error && (
                            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{error}</div>
                        )}

                        <div className="flex gap-2 pt-4 border-t border-gray-200">
                            <Button
                                variant="outline"
                                onClick={() => navigate('/reconciliation')}
                                className="w-full h-8"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={saveTemplate}
                                disabled={isProcessing || isCreating || isUpdating}
                                className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                <Save className="h-4 w-4 mr-1" />
                                {id ? 'Update' : 'Save'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default TemplateCreator;
