import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, FileText, Plus, Trash2, Save, ArrowLeft, Eye, Edit, Filter, Search } from 'lucide-react';
import Papa from 'papaparse';
import { useDropzone } from 'react-dropzone';
import {
    useGetTemplatesQuery,
    useGetTemplatesByTypeQuery,
    useCreateTemplateMutation,
    useUpdateTemplateMutation,
    useDeleteTemplateMutation,
} from '../../store/redux/templateApi';

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
    createdAt?: string;
    updatedAt?: string;
    status?: 'active' | 'draft';
}

interface BackendTemplate {
    id: string;
    name: string;
    type: 'BACKOFFICE' | 'VENDOR';
    fields: BackendTemplateField[];
}

const TemplateManager: React.FC = () => {
    const [activeView, setActiveView] = useState<'list' | 'create' | 'edit' | 'view'>('list');
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [filterType, setFilterType] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [templateName, setTemplateName] = useState('');
    const [templateType, setTemplateType] = useState<'BACKOFFICE' | 'VENDOR'>('VENDOR');
    const [fields, setFields] = useState<TemplateField[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    // API hooks
    const { data: templates = [], isLoading: isLoadingTemplates, error: listError } = filterType === 'all'
        ? useGetTemplatesQuery()
        : useGetTemplatesByTypeQuery(filterType.toUpperCase());
    const [createTemplate, { isLoading: isCreating }] = useCreateTemplateMutation();
    const [updateTemplate, { isLoading: isUpdating }] = useUpdateTemplateMutation();
    const [deleteTemplate, { isLoading: isDeleting }] = useDeleteTemplateMutation();

    const standardFields = [
        'transaction_id', 'amount', 'credit_amount', 'debit_amount', 'date',
        'description', 'debit_direction', 'credit_direction', 'debit_credit_direction', 'status',
        'reference_number', 'account_number', 'balance', 'currency', 'fee_amount'
    ];

    // Filter and search templates
    const filteredTemplates = templates.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Reset form
    const resetForm = () => {
        setTemplateName('');
        setTemplateType('VENDOR');
        setFields([]);
        setError(null);
    };

    // Navigation handlers
    const handleCreateNew = () => {
        resetForm();
        setSelectedTemplate(null);
        setActiveView('create');
    };

    const handleViewTemplate = (template: Template) => {
        setSelectedTemplate(template);
        setActiveView('view');
    };

    const handleEditTemplate = (template: Template) => {
        setSelectedTemplate(template);
        setTemplateName(template.name);
        setTemplateType(template.type);
        setFields(template.fields);
        setActiveView('edit');
        setError(null);
    };

    const handleBackToList = () => {
        setActiveView('list');
        setSelectedTemplate(null);
        resetForm();
    };

    // Field management
    const addField = () => {
        setFields([...fields, { fileHeader: '', coreField: '', type: 'string' }]);
    };

    const updateField = (index: number, field: Partial<TemplateField>) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], ...field };
        setFields(newFields);
    };

    const removeField = (index: number) => {
        setFields(fields.filter((_, i) => i !== index));
    };

    // CSV upload handler
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
                        type: ['amount', 'credit_amount', 'debit_amount', 'fee_amount'].includes(header.toLowerCase()) ? 'number' :
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
    }, [standardFields]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: { 'text/csv': ['.csv'] },
        maxFiles: 1,
        onDrop: onDropCsv,
    });

    // JSON upload handler
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
                            type: f.type || (['amount', 'credit_amount', 'debit_amount', 'fee_amount'].includes(f.coreField?.toLowerCase()) ? 'number' :
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

    // Save or update template
    const handleSave = async () => {
        if (!templateName.trim() || fields.length === 0) {
            setError('Please provide a template name and at least one field mapping.');
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
            if (activeView === 'edit' && selectedTemplate) {
                await updateTemplate({ id: selectedTemplate.id, ...template }).unwrap();
            } else {
                await createTemplate(template).unwrap();
            }
            handleBackToList();
        } catch (err: any) {
            setError(err.data?.message || 'Failed to save template.');
        }
    };

    // Delete template
    const handleDelete = async (template: Template) => {
        if (window.confirm(`Are you sure you want to delete ${template.name}?`)) {
            try {
                await deleteTemplate(template.id).unwrap();
                if (selectedTemplate?.id === template.id) {
                    handleBackToList();
                }
            } catch (err: any) {
                setError(err.data?.message || 'Failed to delete template.');
            }
        }
    };

    // Templates list view
    const renderTemplatesList = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Template Manager</h1>
                    <p className="text-gray-600 mt-1">Create and manage data mapping templates</p>
                </div>
                <Button
                    onClick={handleCreateNew}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                </Button>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-40">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="VENDOR">Vendor Data</SelectItem>
                            <SelectItem value="BACKOFFICE">Bank Data</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Templates Table */}
            <Card>
                <CardContent className="pt-6">
                    {isLoadingTemplates ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <span className="mt-2 text-gray-600">Loading templates...</span>
                        </div>
                    ) : listError ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileSpreadsheet className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading templates</h3>
                            <p className="text-gray-600 text-center mb-6 max-w-md">
                                Unable to fetch templates. Please try again later.
                            </p>
                        </div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileSpreadsheet className="h-8 w-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates found</h3>
                            <p className="text-gray-600 text-center mb-6 max-w-md">
                                Get started by creating your first template. Upload a CSV file or JSON template to automatically map fields.
                            </p>
                            <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700 text-white">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Your First Template
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Fields</TableHead>

                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTemplates.map(template => (
                                    <TableRow key={template.id}>
                                        <TableCell className="font-medium">{template.name}</TableCell>
                                        <TableCell>{template.type}</TableCell>
                                        <TableCell>{template.fields.length}</TableCell>

                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleViewTemplate(template)}
                                                    title="View"
                                                >
                                                    <Eye className="h-4 w-4 text-gray-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditTemplate(template)}
                                                    title="Edit"
                                                >
                                                    <Edit className="h-4 w-4 text-gray-600" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(template)}
                                                    disabled={isDeleting}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );

    // Template form view
    const renderTemplateForm = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={handleBackToList}
                        className="p-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {activeView === 'create' ? 'Create Template' : 'Edit Template'}
                        </h1>
                        <p className="text-gray-600">Configure field mappings for data import</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Template Configuration */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Template Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                                Template Name
                            </label>
                            <Input
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="e.g., Bank Statement Template"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                                Data Type
                            </label>
                            <Select value={templateType} onValueChange={(value: 'BACKOFFICE' | 'VENDOR') => setTemplateType(value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="VENDOR">Vendor Data</SelectItem>
                                    <SelectItem value="BACKOFFICE">Bank/Backoffice Data</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="pt-4 border-t">
                            <label className="text-sm font-medium text-gray-700 mb-3 block">
                                Import Methods
                            </label>
                            <div className="space-y-3">
                                <Card className={`p-4 border-2 border-dashed ${isDragActive ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                                    <div {...getRootProps()} className="text-center">
                                        <input {...getInputProps()} />
                                        <FileSpreadsheet className="h-5 w-5 mx-auto text-blue-600" />
                                        <p className="text-sm font-medium text-gray-900 mt-1">Upload CSV</p>
                                        <p className="text-xs text-gray-600">Auto-detect headers</p>
                                    </div>
                                </Card>

                                <Card className="p-4 border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors">
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleJsonUpload}
                                        className="hidden"
                                        id="json-upload"
                                    />
                                    <label htmlFor="json-upload" className="cursor-pointer text-center block">
                                        <FileText className="h-5 w-5 mx-auto text-blue-600" />
                                        <p className="text-sm font-medium text-gray-900 mt-1">Upload JSON</p>
                                        <p className="text-xs text-gray-600">Import template</p>
                                    </label>
                                </Card>

                                <Card
                                    className="p-4 border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
                                    onClick={addField}
                                >
                                    <div className="text-center">
                                        <Plus className="h-5 w-5 mx-auto text-blue-600" />
                                        <p className="text-sm font-medium text-gray-900 mt-1">Manual Entry</p>
                                        <p className="text-xs text-gray-600">Add fields manually</p>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Field Mappings */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Field Mappings</CardTitle>
                            {fields.length > 0 && (
                                <span className="text-sm text-gray-600">{fields.length} fields</span>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isProcessing ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-3 text-gray-600">Processing file...</span>
                            </div>
                        ) : fields.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Upload className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No field mappings</h3>
                                <p className="text-gray-600 mb-4">Upload a file or add fields manually to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 mb-1 block">
                                                Source Field
                                            </label>
                                            <Input
                                                value={field.fileHeader}
                                                onChange={(e) => updateField(index, { fileHeader: e.target.value })}
                                                placeholder="e.g., Transaction_ID"
                                                className="h-9"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 mb-1 block">
                                                Target Field
                                            </label>
                                            <Select
                                                value={field.coreField}
                                                onValueChange={(value) => updateField(index, { coreField: value })}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Select target" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {standardFields.map(f => (
                                                        <SelectItem key={f} value={f}>
                                                            {f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-600 mb-1 block">
                                                Data Type
                                            </label>
                                            <Select
                                                value={field.type}
                                                onValueChange={(value: 'string' | 'number' | 'date') => updateField(index, { type: value })}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="string">Text</SelectItem>
                                                    <SelectItem value="number">Number</SelectItem>
                                                    <SelectItem value="date">Date</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-end">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeField(index)}
                                                className="h-9 w-9 p-0 text-red-500 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                <Button
                                    variant="outline"
                                    onClick={addField}
                                    className="w-full border-dashed"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Another Field
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="outline" onClick={handleBackToList}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={isProcessing || isCreating || isUpdating || !templateName.trim() || fields.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {isProcessing || isCreating || isUpdating ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            {activeView === 'create' ? 'Create Template' : 'Update Template'}
                        </>
                    )}
                </Button>
            </div>
        </div>
    );

    // Template view mode
    const renderTemplateView = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={handleBackToList} className="p-2">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{selectedTemplate?.name}</h1>
                        <p className="text-gray-600">Template details and field mappings</p>
                    </div>
                </div>
                <Button
                    onClick={() => selectedTemplate && handleEditTemplate(selectedTemplate)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Template
                </Button>
            </div>

            {selectedTemplate && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Template Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-600">Name</label>
                                <p className="text-gray-900">{selectedTemplate.name}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-600">Type</label>
                                <p className="text-gray-900">{selectedTemplate.type}</p>
                            </div>

                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Field Mappings ({selectedTemplate.fields.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {selectedTemplate.fields.map((field, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-gray-900">{field.fileHeader}</span>
                                                <span className="text-gray-400">→</span>
                                                <span className="text-blue-600 font-medium">{field.coreField.replace(/_/g, ' ')}</span>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                                            field.type === 'string' ? 'bg-gray-100 text-gray-800' :
                                                field.type === 'number' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-green-100 text-green-800'
                                        }`}>
                      {field.type}
                    </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto p-6">
                {activeView === 'list' && renderTemplatesList()}
                {(activeView === 'create' || activeView === 'edit') && renderTemplateForm()}
                {activeView === 'view' && renderTemplateView()}
            </div>
        </div>
    );
};

export default TemplateManager;
